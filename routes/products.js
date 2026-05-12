/**
 * ===== PIT FREIGHT — Export Products Marketplace =====
 * B: ผู้ขายลงประกาศสินค้า (ต้องผ่าน Admin อนุมัติ)
 * C: ผู้ซื้อส่งคำขอผ่าน PIT Freight (Middleman)
 */

require('dotenv').config({ override: true });
const express = require('express');
const router = express.Router();
const { Client } = require('@notionhq/client');
const nodemailer = require('nodemailer');

function getNotion() { return new Client({ auth: process.env.NOTION_TOKEN }); }
function getProductsDb() { return process.env.NOTION_PRODUCTS_DB; }

// Email transporter
function getMailer() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

// ===== LINE Notification =====
async function sendLineNotify(message) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  try {
    const axios = require('axios');
    await axios.post('https://api.line.me/v2/bot/message/broadcast', {
      messages: [{ type: 'text', text: message }]
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
  } catch (err) {
    console.log('⚠️ LINE notify error:', err.response?.data || err.message);
  }
}

// ===== GET /api/products — รายการสินค้าที่อนุมัติแล้ว =====
router.get('/', async (req, res) => {
  try {
    const { category, search, limit = 12, cursor } = req.query;
    const filters = [{ property: 'Status', select: { equals: 'Published' } }];
    if (category && category !== 'all') {
      filters.push({ property: 'Category', select: { equals: category } });
    }

    const queryParams = {
      database_id: getProductsDb(),
      filter: filters.length > 1 ? { and: filters } : filters[0],
      page_size: parseInt(limit),
      sorts: [{ property: 'Submitted Date', direction: 'descending' }],
    };
    if (cursor) queryParams.start_cursor = cursor;

    const r = await getNotion().databases.query(queryParams);

    let products = r.results.map(p => ({
      id: p.id,
      nameTH: p.properties['Product Name TH']?.title?.[0]?.plain_text || '',
      nameEN: p.properties['Product Name EN']?.rich_text?.[0]?.plain_text || '',
      category: p.properties['Category']?.select?.name || '',
      descriptionTH: p.properties['Description TH']?.rich_text?.[0]?.plain_text || '',
      descriptionEN: p.properties['Description EN']?.rich_text?.[0]?.plain_text || '',
      cover: p.properties['Cover Image']?.url || '',
      priceRange: p.properties['Price Range']?.rich_text?.[0]?.plain_text || '',
      moq: p.properties['MOQ']?.rich_text?.[0]?.plain_text || '',
      unit: p.properties['Unit']?.rich_text?.[0]?.plain_text || '',
      hsCode: p.properties['HS Code']?.rich_text?.[0]?.plain_text || '',
      certifications: p.properties['Certifications']?.multi_select?.map(c => c.name) || [],
      province: p.properties['Province']?.rich_text?.[0]?.plain_text || '',
      sellerName: p.properties['Seller Name']?.rich_text?.[0]?.plain_text || '',
      date: p.properties['Submitted Date']?.date?.start || '',
    }));

    // Client-side search filter
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.nameTH.toLowerCase().includes(q) ||
        p.nameEN.toLowerCase().includes(q) ||
        p.descriptionTH.toLowerCase().includes(q) ||
        p.descriptionEN.toLowerCase().includes(q)
      );
    }

    res.json({ products, hasMore: r.has_more, nextCursor: r.next_cursor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== POST /api/products/submit — ผู้ขายลงประกาศสินค้า =====
router.post('/submit', async (req, res) => {
  try {
    const {
      nameTH, nameEN, category, descriptionTH, descriptionEN,
      cover, priceRange, moq, unit, hsCode, certifications,
      province, sellerName, sellerEmail, sellerPhone,
    } = req.body;

    if (!nameTH || !sellerName || !sellerEmail) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็น' });
    }

    // Create Notion page with Pending status
    await getNotion().pages.create({
      parent: { database_id: getProductsDb() },
      properties: {
        'Product Name TH': { title: [{ text: { content: nameTH } }] },
        'Product Name EN': { rich_text: [{ text: { content: nameEN || '' } }] },
        'Category': category ? { select: { name: category } } : undefined,
        'Description TH': { rich_text: [{ text: { content: (descriptionTH || '').substring(0, 2000) } }] },
        'Description EN': { rich_text: [{ text: { content: (descriptionEN || '').substring(0, 2000) } }] },
        'Cover Image': cover ? { url: cover } : undefined,
        'Price Range': { rich_text: [{ text: { content: priceRange || '' } }] },
        'MOQ': { rich_text: [{ text: { content: moq || '' } }] },
        'Unit': { rich_text: [{ text: { content: unit || '' } }] },
        'HS Code': { rich_text: [{ text: { content: hsCode || '' } }] },
        'Certifications': certifications?.length ? { multi_select: certifications.map(c => ({ name: c })) } : undefined,
        'Province': { rich_text: [{ text: { content: province || '' } }] },
        'Seller Name': { rich_text: [{ text: { content: sellerName } }] },
        'Seller Email': { email: sellerEmail },
        'Seller Phone': sellerPhone ? { phone_number: sellerPhone } : undefined,
        'Status': { select: { name: 'Pending' } },
        'Submitted Date': { date: { start: new Date().toISOString().split('T')[0] } },
      },
    });

    // แจ้ง Admin ทาง LINE
    const siteUrl = process.env.SITE_URL || 'https://pitfreight.com';
    sendLineNotify(
      `🆕 สินค้าใหม่รอตรวจสอบ!\n\n` +
      `📦 สินค้า: ${nameTH}\n` +
      `🗂 หมวด: ${category || '-'}\n` +
      `👤 ผู้ขาย: ${sellerName}\n` +
      `📧 Email: ${sellerEmail}\n` +
      `📞 โทร: ${sellerPhone || '-'}\n\n` +
      `🔗 กดอนุมัติได้ที่:\n${siteUrl}/admin`
    );

    // แจ้ง Admin ทาง Email
    try {
      await getMailer().sendMail({
        from: `"PIT Freight System" <${process.env.EMAIL_FROM}>`,
        to: process.env.EMAIL_USER,
        subject: `🆕 [สินค้าใหม่รอตรวจสอบ] ${nameTH}`,
        html: `
          <h2>มีสินค้าใหม่รอการอนุมัติ</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;border:1px solid #ddd"><b>ชื่อสินค้า (TH)</b></td><td style="padding:8px;border:1px solid #ddd">${nameTH}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>ชื่อสินค้า (EN)</b></td><td style="padding:8px;border:1px solid #ddd">${nameEN || '-'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>หมวดหมู่</b></td><td style="padding:8px;border:1px solid #ddd">${category || '-'}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>ผู้ขาย</b></td><td style="padding:8px;border:1px solid #ddd">${sellerName}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>อีเมล</b></td><td style="padding:8px;border:1px solid #ddd">${sellerEmail}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><b>โทรศัพท์</b></td><td style="padding:8px;border:1px solid #ddd">${sellerPhone || '-'}</td></tr>
          </table>
          <p style="margin-top:16px">กรุณาเข้า <a href="https://notion.so">Notion</a> เพื่ออนุมัติหรือปฏิเสธสินค้านี้</p>
        `,
      });
    } catch (mailErr) {
      console.log('⚠️ Email warning:', mailErr.message);
    }

    res.json({ success: true, message: 'ส่งข้อมูลสินค้าเรียบร้อยแล้ว รอการตรวจสอบจาก Admin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== POST /api/products/inquiry — ผู้ซื้อสอบถามสินค้า =====
router.post('/inquiry', async (req, res) => {
  try {
    const { productId, productName, buyerName, buyerEmail, buyerPhone,
            buyerCountry, quantity, unit, message } = req.body;

    if (!buyerName || !buyerEmail || !productName) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็น' });
    }

    // ส่ง Email หา PIT Freight
    await getMailer().sendMail({
      from: `"PIT Freight System" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_USER,
      subject: `🛒 [Buyer Inquiry] ${productName} — จาก ${buyerName} (${buyerCountry || 'N/A'})`,
      html: `
        <h2 style="color:#1e3a5f">📦 คำขอสอบถามสินค้าส่งออก</h2>
        <h3>ข้อมูลสินค้า</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f8f9fa"><b>สินค้า</b></td><td style="padding:8px;border:1px solid #ddd">${productName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f8f9fa"><b>จำนวนที่ต้องการ</b></td><td style="padding:8px;border:1px solid #ddd">${quantity || '-'} ${unit || ''}</td></tr>
        </table>
        <h3>ข้อมูลผู้ซื้อ</h3>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f8f9fa"><b>ชื่อ</b></td><td style="padding:8px;border:1px solid #ddd">${buyerName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f8f9fa"><b>อีเมล</b></td><td style="padding:8px;border:1px solid #ddd">${buyerEmail}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f8f9fa"><b>โทรศัพท์</b></td><td style="padding:8px;border:1px solid #ddd">${buyerPhone || '-'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f8f9fa"><b>ประเทศ</b></td><td style="padding:8px;border:1px solid #ddd">${buyerCountry || '-'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f8f9fa"><b>ข้อความ</b></td><td style="padding:8px;border:1px solid #ddd">${message || '-'}</td></tr>
        </table>
      `,
    });

    // ส่ง Email ยืนยันหาผู้ซื้อ
    try {
      await getMailer().sendMail({
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: buyerEmail,
        subject: `Your Inquiry for "${productName}" — PIT Freight`,
        html: `
          <h2>Thank you for your inquiry, ${buyerName}!</h2>
          <p>We have received your request for <strong>${productName}</strong>.</p>
          <p>Our team at PIT Freight will contact you within <strong>1-2 business days</strong> with pricing, availability, and shipping details.</p>
          <hr>
          <p style="color:#666;font-size:13px">PIT Freight — International Trade & Logistics<br>pitfreight.com</p>
        `,
      });
    } catch (e) {}

    res.json({ success: true, message: 'ส่งคำขอเรียบร้อยแล้ว ทีม PIT Freight จะติดต่อกลับภายใน 1-2 วันทำการ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
