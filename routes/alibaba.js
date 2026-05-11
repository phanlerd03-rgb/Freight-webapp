/**
 * ===== PIT FREIGHT — Alibaba Sourcing Hub =====
 * A: Sourcing Request Form
 * B: AI Search Helper + Alibaba Link
 * C: Import Cost Calculator
 */

require('dotenv').config({ override: true });
const express = require('express');
const router = express.Router();
const { Client } = require('@notionhq/client');
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');

function getNotion() { return new Client({ auth: process.env.NOTION_TOKEN }); }
function getClaude() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }
function getAlibabaDb() { return process.env.NOTION_ALIBABA_DB; }
function getMailer() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST, port: parseInt(process.env.EMAIL_PORT),
    secure: false, auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

// ===== A: POST /api/alibaba/sourcing — Submit sourcing request =====
router.post('/sourcing', async (req, res) => {
  try {
    const { productName, description, category, budget, quantity, unit,
            shippingMethod, destination, name, email, phone, company } = req.body;

    if (!productName || !email || !name) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็น' });
    }

    await getNotion().pages.create({
      parent: { database_id: getAlibabaDb() },
      properties: {
        'Product Name': { title: [{ text: { content: productName } }] },
        'Description': { rich_text: [{ text: { content: (description || '').substring(0, 2000) } }] },
        'Category': category ? { select: { name: category } } : undefined,
        'Budget (USD)': { rich_text: [{ text: { content: budget || '' } }] },
        'Quantity': { rich_text: [{ text: { content: quantity || '' } }] },
        'Unit': { rich_text: [{ text: { content: unit || '' } }] },
        'Shipping Method': shippingMethod ? { select: { name: shippingMethod } } : undefined,
        'Destination': { rich_text: [{ text: { content: destination || 'Bangkok, Thailand' } }] },
        'Name': { rich_text: [{ text: { content: name } }] },
        'Email': { email },
        'Phone': phone ? { phone_number: phone } : undefined,
        'Company': { rich_text: [{ text: { content: company || '' } }] },
        'Status': { select: { name: 'New' } },
        'Submitted Date': { date: { start: new Date().toISOString().split('T')[0] } },
      },
    });

    // Email to PIT Freight
    try {
      await getMailer().sendMail({
        from: `"PIT Freight System" <${process.env.EMAIL_FROM}>`,
        to: process.env.EMAIL_USER,
        subject: `🛒 [Alibaba Sourcing] ${productName} — ${name}`,
        html: `
          <h2 style="color:#e05c19">🛍️ คำขอ Sourcing จาก Alibaba</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;border:1px solid #ddd;background:#fff8f3"><b>สินค้า</b></td><td style="padding:8px;border:1px solid #ddd">${productName}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;background:#fff8f3"><b>หมวดหมู่</b></td><td style="padding:8px;border:1px solid #ddd">${category || '-'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;background:#fff8f3"><b>รายละเอียด</b></td><td style="padding:8px;border:1px solid #ddd">${description || '-'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;background:#fff8f3"><b>งบประมาณ</b></td><td style="padding:8px;border:1px solid #ddd">${budget ? 'USD ' + budget : '-'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;background:#fff8f3"><b>จำนวน</b></td><td style="padding:8px;border:1px solid #ddd">${quantity || '-'} ${unit || ''}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;background:#fff8f3"><b>ขนส่ง</b></td><td style="padding:8px;border:1px solid #ddd">${shippingMethod || '-'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;background:#fff8f3"><b>ชื่อ</b></td><td style="padding:8px;border:1px solid #ddd">${name} ${company ? '('+company+')' : ''}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;background:#fff8f3"><b>อีเมล</b></td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;background:#fff8f3"><b>โทร</b></td><td style="padding:8px;border:1px solid #ddd">${phone || '-'}</td></tr>
          </table>`,
      });
    } catch (e) { console.log('email warn:', e.message); }

    // Confirmation to customer
    try {
      await getMailer().sendMail({
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `รับทราบคำขอ Sourcing: ${productName} — PIT Freight`,
        html: `<h2>สวัสดี ${name} ครับ/ค่ะ</h2>
          <p>เราได้รับคำขอ Sourcing สินค้า <strong>${productName}</strong> เรียบร้อยแล้ว</p>
          <p>ทีมงาน PIT Freight จะทำการค้นหาสินค้าใน Alibaba.com และส่งใบเสนอราคาภายใน <strong>1-2 วันทำการ</strong></p>
          <hr><p style="color:#666;font-size:13px">PIT Freight — pitfreight.com</p>`,
      });
    } catch (e) {}

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== B: POST /api/alibaba/search — AI search helper =====
router.post('/search', async (req, res) => {
  try {
    const { query, language = 'th' } = req.body;
    if (!query) return res.status(400).json({ error: 'กรุณาระบุสินค้าที่ต้องการ' });

    const msg = await getClaude().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `ช่วยวิเคราะห์สินค้านี้สำหรับการค้นหาใน Alibaba.com: "${query}"

ตอบเป็น JSON ดังนี้:
{
  "keywords_en": ["keyword1", "keyword2", "keyword3"],
  "alibaba_url": "https://www.alibaba.com/trade/search?SearchText=KEYWORD_ENCODED",
  "category_tip": "แนะนำหมวดหมู่ใน Alibaba ที่ควรค้นหา",
  "supplier_tips": ["เคล็ดลับเลือก Supplier ข้อ1", "ข้อ2", "ข้อ3"],
  "red_flags": ["สิ่งที่ต้องระวัง ข้อ1", "ข้อ2"],
  "estimated_moq": "ประมาณ MOQ ที่คาดหวัง",
  "hs_code_hint": "HS Code ที่น่าจะใช้"
}

ตอบ JSON เท่านั้น ไม่มีข้อความอื่น`
      }],
    });

    let result;
    try {
      result = JSON.parse(msg.content[0].text);
      // Build proper Alibaba URL
      const kw = encodeURIComponent(result.keywords_en[0] || query);
      result.alibaba_url = `https://www.alibaba.com/trade/search?SearchText=${kw}&IndexArea=product_en`;
    } catch {
      result = {
        keywords_en: [query],
        alibaba_url: `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(query)}`,
        category_tip: 'ค้นหาใน Alibaba.com',
        supplier_tips: ['เลือก Supplier ที่มี Gold Supplier badge', 'ดู Trade Assurance', 'ขอ Sample ก่อนสั่ง'],
        red_flags: ['ระวัง Supplier ที่ราคาต่ำผิดปกติ', 'ตรวจสอบ Reviews ก่อน'],
        estimated_moq: '-',
        hs_code_hint: '-',
      };
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== C: POST /api/alibaba/calculate — Import cost calculator =====
router.post('/calculate', async (req, res) => {
  try {
    const { fobPrice, quantity, unit, productType, shippingMethod, weight, cbm } = req.body;

    const fob = parseFloat(fobPrice) || 0;
    const qty = parseFloat(quantity) || 1;
    const totalFob = fob * qty;
    const exchangeRate = 35; // USD to THB

    // Duty rates by product type
    const dutyRates = {
      'electronics': 0.00, 'clothing': 0.30, 'food': 0.30,
      'machinery': 0.10, 'cosmetics': 0.20, 'furniture': 0.20,
      'toys': 0.20, 'general': 0.20,
    };
    const dutyRate = dutyRates[productType] || 0.20;

    // Freight estimate (USD)
    let freightUSD = 0;
    const wt = parseFloat(weight) || 0;
    const volume = parseFloat(cbm) || 0;

    if (shippingMethod === 'air') {
      freightUSD = Math.max(wt * 5, 50); // ~$5/kg min $50
    } else if (shippingMethod === 'sea_lcl') {
      freightUSD = Math.max(volume * 120, 150); // ~$120/CBM min $150
    } else { // sea_fcl
      freightUSD = 800; // ~$800 per 20ft
    }

    // CIF = FOB + Freight + Insurance
    const insuranceUSD = totalFob * 0.005;
    const cifUSD = totalFob + freightUSD + insuranceUSD;

    // Import duty (THB)
    const cifTHB = cifUSD * exchangeRate;
    const dutyTHB = cifTHB * dutyRate;

    // VAT = 7% of (CIF + Duty)
    const vatTHB = (cifTHB + dutyTHB) * 0.07;

    // Handling/CFS fee
    const handlingTHB = shippingMethod === 'air' ? 1500 : 3500;

    // Total landed cost
    const totalTHB = cifTHB + dutyTHB + vatTHB + handlingTHB;
    const totalUSD = totalTHB / exchangeRate;
    const costPerUnit = qty > 0 ? totalTHB / qty : totalTHB;

    res.json({
      success: true,
      breakdown: {
        fobUSD: totalFob.toFixed(2),
        freightUSD: freightUSD.toFixed(2),
        insuranceUSD: insuranceUSD.toFixed(2),
        cifUSD: cifUSD.toFixed(2),
        cifTHB: cifTHB.toFixed(0),
        dutyRate: (dutyRate * 100).toFixed(0) + '%',
        dutyTHB: dutyTHB.toFixed(0),
        vatTHB: vatTHB.toFixed(0),
        handlingTHB: handlingTHB.toFixed(0),
        totalTHB: totalTHB.toFixed(0),
        totalUSD: totalUSD.toFixed(2),
        costPerUnit: costPerUnit.toFixed(0),
        unit: unit || 'ชิ้น',
        exchangeRate,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
