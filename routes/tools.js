/**
 * ===== PIT FREIGHT — AI Tools Hub =====
 * 1. POST /api/tools/freight-calc    — Freight mode comparison (Sea / Air / Rail)
 * 2. POST /api/tools/trade-profile   — Trade profile & closing-chance analysis
 * 3. POST /api/tools/route-intel     — Route intelligence & carrier comparison
 * 4. POST /api/tools/forecast        — 12-month freight demand forecast
 * 5. POST /api/tools/proposal        — Bilingual proposal generator
 */

require('dotenv').config({ override: true });
const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

function getClaude() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }

// ===== 1. POST /api/tools/freight-calc — Freight mode comparison =====
router.post('/freight-calc', async (req, res) => {
  try {
    const { product, weight, cbm, origin, destination, incoterms } = req.body;

    const msg = await getClaude().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `คุณเป็นผู้เชี่ยวชาญด้าน Freight Logistics ของ PIT Freight
วิเคราะห์ตัวเลือกการขนส่งสำหรับ:
- สินค้า: ${product || '-'}
- น้ำหนัก: ${weight || '-'} kg
- CBM: ${cbm || '-'} CBM
- ต้นทาง: ${origin || '-'}
- ปลายทาง: ${destination || '-'}
- Incoterms: ${incoterms || 'FOB'}

ตอบเป็น JSON เท่านั้น ตามโครงสร้างนี้:
{
  "recommendation": "Sea",
  "reason": "เหตุผลสั้นๆ ว่าทำไมถึงแนะนำโหมดนี้",
  "options": [
    {
      "mode": "Sea (FCL/LCL)",
      "transitDays": "18-25 วัน",
      "costUSD": "$320-480",
      "costTHB": "11,500-17,300 บาท",
      "pros": ["ราคาถูก", "รับน้ำหนักได้มาก"],
      "cons": ["ช้า", "ไม่เหมาะสินค้าเร่งด่วน"],
      "bestFor": "สินค้าน้ำหนักมาก ไม่เร่งด่วน"
    },
    {
      "mode": "Air",
      "transitDays": "3-5 วัน",
      "costUSD": "$...",
      "costTHB": "... บาท",
      "pros": ["เร็ว", "ปลอดภัย"],
      "cons": ["แพง"],
      "bestFor": "สินค้าเร่งด่วน มูลค่าสูง"
    },
    {
      "mode": "Express",
      "transitDays": "1-3 วัน",
      "costUSD": "$...",
      "costTHB": "... บาท",
      "pros": ["เร็วที่สุด", "ติดตามได้ real-time"],
      "cons": ["แพงที่สุด", "จำกัดน้ำหนัก"],
      "bestFor": "เอกสาร พัสดุขนาดเล็ก เร่งด่วนมาก"
    }
  ],
  "tips": ["เคล็ดลับ 1 สำหรับเส้นทางนี้", "เคล็ดลับ 2"]
}

ตอบ JSON เท่านั้น ไม่มีข้อความอื่น`,
      }],
    });

    let result;
    try {
      result = JSON.parse(msg.content[0].text);
    } catch {
      result = {
        recommendation: 'Sea',
        reason: 'ขึ้นอยู่กับน้ำหนัก ระยะเวลา และงบประมาณของสินค้า',
        options: [
          {
            mode: 'Sea (FCL/LCL)',
            transitDays: '18-30 วัน',
            costUSD: 'ติดต่อสอบถาม',
            costTHB: 'ติดต่อสอบถาม',
            pros: ['ราคาถูก', 'รับน้ำหนักมาก'],
            cons: ['ใช้เวลานาน'],
            bestFor: 'สินค้าน้ำหนักมาก ไม่เร่งด่วน',
          },
          {
            mode: 'Air',
            transitDays: '3-7 วัน',
            costUSD: 'ติดต่อสอบถาม',
            costTHB: 'ติดต่อสอบถาม',
            pros: ['รวดเร็ว', 'ปลอดภัยสูง'],
            cons: ['ราคาสูง'],
            bestFor: 'สินค้าเร่งด่วน มูลค่าสูง',
          },
          {
            mode: 'Express',
            transitDays: '1-3 วัน',
            costUSD: 'ติดต่อสอบถาม',
            costTHB: 'ติดต่อสอบถาม',
            pros: ['เร็วที่สุด'],
            cons: ['ราคาแพงที่สุด'],
            bestFor: 'เอกสาร พัสดุเล็ก เร่งด่วนมาก',
          },
        ],
        tips: ['ควรจองล่วงหน้าอย่างน้อย 2 สัปดาห์', 'ตรวจสอบเอกสารนำเข้าให้ครบ'],
      };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 2. POST /api/tools/trade-profile — Trade profile & closing-chance analysis =====
router.post('/trade-profile', async (req, res) => {
  try {
    const { companyName, country, products, teuPerYear, mainRoutes, painPoints } = req.body;

    const msg = await getClaude().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `คุณเป็น Sales Analyst ของ PIT Freight วิเคราะห์โปรไฟล์ลูกค้าต่อไปนี้:
- บริษัท: ${companyName || '-'}
- ประเทศ: ${country || '-'}
- สินค้า/Product: ${products || '-'}
- ปริมาณ: ${teuPerYear || '-'} TEU/ปี
- เส้นทางหลัก: ${mainRoutes || '-'}
- Pain Points: ${painPoints || '-'}

ตอบเป็น JSON เท่านั้น ตามโครงสร้างนี้:
{
  "summary": "สรุปโปรไฟล์ลูกค้าใน 2-3 ประโยค",
  "segment": "SME Exporter / Large Shipper / Importer / Trader",
  "closingChance": 75,
  "strengths": ["จุดแข็งของลูกค้าที่ทำให้ปิดดีลได้ง่าย 1", "จุดแข็ง 2"],
  "painPoints": ["Pain point ที่วิเคราะห์ได้จากข้อมูล 1", "Pain point 2"],
  "opportunities": ["โอกาสปิดดีล 1", "โอกาสปิดดีล 2"],
  "recommendedServices": ["Sea FCL", "Customs Clearance", "Door-to-Door"],
  "proposedValue": "ข้อเสนอคุณค่าที่โดดเด่นสำหรับลูกค้ารายนี้โดยเฉพาะ",
  "nextAction": "แนะนำ action ถัดไปที่ Sales ควรทำ เช่น นัด meeting / ส่ง rate / โทรติดตาม"
}

ตอบ JSON เท่านั้น ไม่มีข้อความอื่น`,
      }],
    });

    let result;
    try {
      result = JSON.parse(msg.content[0].text);
    } catch {
      result = {
        summary: 'ไม่สามารถวิเคราะห์โปรไฟล์ได้ กรุณาตรวจสอบข้อมูลและลองใหม่',
        segment: 'SME Exporter',
        closingChance: 50,
        strengths: ['มีปริมาณสินค้าสม่ำเสมอ'],
        painPoints: ['ต้องการราคาที่แข่งขันได้'],
        opportunities: ['นำเสนอ rate พิเศษ'],
        recommendedServices: ['Sea FCL', 'Customs Clearance'],
        proposedValue: 'PIT Freight ให้บริการครบวงจรพร้อมทีมงานที่มีประสบการณ์',
        nextAction: 'ติดต่อนัดประชุมเพื่อนำเสนอ rate',
      };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 3. POST /api/tools/route-intel — Route intelligence & carrier comparison =====
router.post('/route-intel', async (req, res) => {
  try {
    const { origin, destination, commodity, volume } = req.body;

    const msg = await getClaude().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `คุณเป็นผู้เชี่ยวชาญ Freight Route Intelligence ของ PIT Freight
วิเคราะห์เส้นทาง:
- ต้นทาง: ${origin || '-'}
- ปลายทาง: ${destination || '-'}
- สินค้า: ${commodity || '-'}
- ปริมาณ: ${volume || '-'}

ตอบเป็น JSON เท่านั้น ตามโครงสร้างนี้ (ระบุ 4 สายเรือ/สายการบิน):
{
  "routeSummary": "สรุปภาพรวมเส้นทาง transit time ปกติ และจุดพักสินค้าหลัก",
  "carriers": [
    {
      "rank": 1,
      "name": "Evergreen",
      "type": "Sea",
      "transitDays": "22 วัน",
      "portOfLoading": "Laem Chabang",
      "portOfDischarge": "Yokohama",
      "frequency": "สัปดาห์ละ 3 เที่ยว",
      "reliability": "95%",
      "notes": "หมายเหตุเพิ่มเติม เช่น ข้อดีเด่น หรือข้อควรระวัง"
    },
    {
      "rank": 2,
      "name": "...",
      "type": "Sea",
      "transitDays": "...",
      "portOfLoading": "...",
      "portOfDischarge": "...",
      "frequency": "...",
      "reliability": "...",
      "notes": "..."
    },
    {
      "rank": 3,
      "name": "...",
      "type": "Air",
      "transitDays": "...",
      "portOfLoading": "...",
      "portOfDischarge": "...",
      "frequency": "...",
      "reliability": "...",
      "notes": "..."
    },
    {
      "rank": 4,
      "name": "...",
      "type": "Sea",
      "transitDays": "...",
      "portOfLoading": "...",
      "portOfDischarge": "...",
      "frequency": "...",
      "reliability": "...",
      "notes": "..."
    }
  ],
  "seasonalWarnings": ["คำเตือนช่วงฤดูกาลที่ต้องระวัง เช่น Peak Season / Typhoon"],
  "tips": ["เคล็ดลับสำหรับเส้นทางนี้ 1", "เคล็ดลับ 2"]
}

ตอบ JSON เท่านั้น ไม่มีข้อความอื่น`,
      }],
    });

    let result;
    try {
      result = JSON.parse(msg.content[0].text);
    } catch {
      result = {
        routeSummary: `เส้นทาง ${origin || '-'} → ${destination || '-'} ข้อมูลอาจไม่ครบถ้วน กรุณาลองใหม่`,
        carriers: [
          {
            rank: 1,
            name: 'Evergreen',
            type: 'Sea',
            transitDays: 'ขึ้นอยู่กับเส้นทาง',
            portOfLoading: origin || '-',
            portOfDischarge: destination || '-',
            frequency: 'สัปดาห์ละ 2-3 เที่ยว',
            reliability: '90%+',
            notes: 'ติดต่อ PIT Freight เพื่อข้อมูลที่แม่นยำ',
          },
          {
            rank: 2,
            name: 'COSCO',
            type: 'Sea',
            transitDays: 'ขึ้นอยู่กับเส้นทาง',
            portOfLoading: origin || '-',
            portOfDischarge: destination || '-',
            frequency: 'สัปดาห์ละ 2 เที่ยว',
            reliability: '88%+',
            notes: 'ราคาแข่งขันได้สำหรับสินค้าจีน',
          },
          {
            rank: 3,
            name: 'Thai Airways Cargo',
            type: 'Air',
            transitDays: '1-3 วัน',
            portOfLoading: 'Suvarnabhumi (BKK)',
            portOfDischarge: destination || '-',
            frequency: 'ทุกวัน',
            reliability: '95%+',
            notes: 'เหมาะสินค้าเร่งด่วน มูลค่าสูง',
          },
          {
            rank: 4,
            name: 'MSC',
            type: 'Sea',
            transitDays: 'ขึ้นอยู่กับเส้นทาง',
            portOfLoading: origin || '-',
            portOfDischarge: destination || '-',
            frequency: 'สัปดาห์ละ 2 เที่ยว',
            reliability: '87%+',
            notes: 'ครอบคลุมท่าเรือหลักทั่วโลก',
          },
        ],
        seasonalWarnings: ['ระวัง Peak Season ช่วงปลายปี (ต.ค. - ธ.ค.)', 'ฤดูมรสุมอาจกระทบตารางเดินเรือ'],
        tips: ['จองล่วงหน้าอย่างน้อย 2-3 สัปดาห์', 'เปรียบเทียบ transit time กับ cost ก่อนตัดสินใจ'],
      };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 4. POST /api/tools/forecast — 12-month freight demand forecast =====
router.post('/forecast', async (req, res) => {
  try {
    const { commodity, tradeRoute, yearsData } = req.body;

    const msg = await getClaude().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `คุณเป็น Freight Market Analyst ของ PIT Freight
พยากรณ์ความต้องการขนส่ง 12 เดือนข้างหน้าสำหรับ:
- สินค้า: ${commodity || 'สินค้าทั่วไป'}
- เส้นทาง: ${tradeRoute || 'ไทย-จีน'}
- ข้อมูลประกอบ: ${yearsData || 'ไม่ระบุ'}

ตอบเป็น JSON เท่านั้น ตามโครงสร้างนี้ (ต้องมีครบ 12 เดือน ม.ค. ถึง ธ.ค.):
{
  "summary": "สรุปแนวโน้มภาพรวมตลอดทั้งปี",
  "months": [
    { "month": "ม.ค.", "teu": 45, "level": "low", "advice": "Book ล่วงหน้า 2 สัปดาห์ ราคาปกติ" },
    { "month": "ก.พ.", "teu": 50, "level": "normal", "advice": "Book ปกติ" },
    { "month": "มี.ค.", "teu": 60, "level": "normal", "advice": "เริ่มเข้าสู่ช่วง Normal" },
    { "month": "เม.ย.", "teu": 75, "level": "high", "advice": "Book ล่วงหน้า 3-4 สัปดาห์" },
    { "month": "พ.ค.", "teu": 80, "level": "high", "advice": "Peak เริ่มต้น ราคาขึ้น" },
    { "month": "มิ.ย.", "teu": 70, "level": "normal", "advice": "ลดลงจาก Peak" },
    { "month": "ก.ค.", "teu": 55, "level": "normal", "advice": "ช่วงปกติ" },
    { "month": "ส.ค.", "teu": 50, "level": "normal", "advice": "ช่วงปกติ" },
    { "month": "ก.ย.", "teu": 40, "level": "low", "advice": "Low Season ราคาดี" },
    { "month": "ต.ค.", "teu": 85, "level": "peak", "advice": "Peak Season จองด่วน" },
    { "month": "พ.ย.", "teu": 95, "level": "peak", "advice": "Peak สูงสุด Book ล่วงหน้า 4-6 สัปดาห์" },
    { "month": "ธ.ค.", "teu": 65, "level": "high", "advice": "หลัง Peak ยังสูง" }
  ],
  "peakMonths": ["ต.ค.", "พ.ย."],
  "lowMonths": ["ก.ย.", "ม.ค."],
  "bookingAdvice": "คำแนะนำการจองล่วงหน้าโดยรวมตลอดทั้งปีสำหรับเส้นทางและสินค้านี้",
  "yearlyTotal": 725
}

ระดับ level ให้ใช้: "low" / "normal" / "high" / "peak"
ตอบ JSON เท่านั้น ไม่มีข้อความอื่น`,
      }],
    });

    let result;
    try {
      result = JSON.parse(msg.content[0].text);
    } catch {
      result = {
        summary: `การพยากรณ์เส้นทาง ${tradeRoute || 'ที่เลือก'} สินค้า ${commodity || 'ทั่วไป'} ข้อมูลไม่เพียงพอ กรุณาลองใหม่`,
        months: [
          { month: 'ม.ค.', teu: 45, level: 'low', advice: 'Low season ราคาดี' },
          { month: 'ก.พ.', teu: 50, level: 'normal', advice: 'ช่วงปกติ' },
          { month: 'มี.ค.', teu: 55, level: 'normal', advice: 'ช่วงปกติ' },
          { month: 'เม.ย.', teu: 60, level: 'normal', advice: 'ช่วงปกติ' },
          { month: 'พ.ค.', teu: 65, level: 'high', advice: 'ความต้องการสูงขึ้น' },
          { month: 'มิ.ย.', teu: 60, level: 'normal', advice: 'ช่วงปกติ' },
          { month: 'ก.ค.', teu: 55, level: 'normal', advice: 'ช่วงปกติ' },
          { month: 'ส.ค.', teu: 50, level: 'normal', advice: 'ช่วงปกติ' },
          { month: 'ก.ย.', teu: 40, level: 'low', advice: 'Low season ราคาดี' },
          { month: 'ต.ค.', teu: 80, level: 'peak', advice: 'Peak Season จองด่วน' },
          { month: 'พ.ย.', teu: 90, level: 'peak', advice: 'Peak สูงสุด' },
          { month: 'ธ.ค.', teu: 65, level: 'high', advice: 'ยังอยู่ในช่วงสูง' },
        ],
        peakMonths: ['ต.ค.', 'พ.ย.'],
        lowMonths: ['ก.ย.', 'ม.ค.'],
        bookingAdvice: 'ควรจองล่วงหน้าอย่างน้อย 2-4 สัปดาห์โดยเฉพาะช่วง Peak Season',
        yearlyTotal: 715,
      };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 5. POST /api/tools/proposal — Bilingual proposal generator =====
router.post('/proposal', async (req, res) => {
  try {
    const { companyName, contactName, country, requirements, services, timeline } = req.body;

    const msg = await getClaude().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `คุณเป็น Business Development Manager ของ PIT Freight (พีไอที เฟรท)
เขียน Proposal ให้ลูกค้าต่อไปนี้ (ภาษาไทย + ภาษาอังกฤษ สลับกันอย่างเป็นธรรมชาติ):

ข้อมูลลูกค้า:
- บริษัท: ${companyName || '-'}
- ผู้ติดต่อ: ${contactName || '-'}
- ประเทศ: ${country || '-'}
- ความต้องการ: ${requirements || '-'}
- บริการที่สนใจ: ${services || '-'}
- ระยะเวลา: ${timeline || '-'}

ตอบเป็น JSON เท่านั้น ตามโครงสร้างนี้:
{
  "subject": "หัวข้ออีเมล Proposal ที่ดึงดูดใจ",
  "proposal": "เนื้อหา Proposal แบบ Markdown ภาษาไทย-อังกฤษ สลับกันตามความเหมาะสม ประกอบด้วย:\\n\\n## 1. Executive Summary\\n[สรุปสั้นๆ ว่า PIT Freight จะช่วยลูกค้าได้อย่างไร ทั้งภาษาไทยและอังกฤษ]\\n\\n## 2. About PIT Freight\\n[แนะนำบริษัทสั้นๆ จุดเด่น ประสบการณ์ เส้นทางหลัก]\\n\\n## 3. Understanding Your Requirements\\n[สรุปความต้องการของลูกค้าตามข้อมูลที่ให้มา แสดงว่าเข้าใจลูกค้า]\\n\\n## 4. Our Proposed Solution\\n[นำเสนอโซลูชั่นที่ตรงกับความต้องการ ระบุบริการที่เหมาะสม]\\n\\n## 5. Service Details & Pricing Structure\\n[รายละเอียดบริการ โครงสร้างราคา แพ็กเกจ หรือ volume discount]\\n\\n## 6. Why Choose PIT Freight\\n[จุดขายหลัก 3-5 ข้อที่ทำให้ PIT Freight แตกต่าง]\\n\\n## 7. Next Steps & Call to Action\\n[ขั้นตอนถัดไป เชิญประชุม ทดลองใช้บริการ หรือขอ trial shipment]",
  "keyPoints": ["จุดขายสำคัญ 1 ที่โดดเด่นสำหรับลูกค้ารายนี้", "จุดขาย 2", "จุดขาย 3"]
}

ตอบ JSON เท่านั้น ไม่มีข้อความอื่น`,
      }],
    });

    let result;
    try {
      result = JSON.parse(msg.content[0].text);
    } catch {
      result = {
        subject: `Freight Service Proposal for ${companyName || 'Your Company'} — PIT Freight`,
        proposal: `## 1. Executive Summary\n\nPIT Freight ยินดีนำเสนอบริการโลจิสติกส์ครบวงจรสำหรับ ${companyName || 'บริษัทของท่าน'}\n\nWe are pleased to present our comprehensive freight logistics solutions tailored to meet your specific requirements.\n\n## 2. About PIT Freight\n\nPIT Freight เป็นผู้ให้บริการขนส่งสินค้าระหว่างประเทศครบวงจร มีประสบการณ์มากกว่า 10 ปี ให้บริการทั้ง Sea Freight, Air Freight และ Customs Clearance\n\n## 3. Understanding Your Requirements\n\nจากข้อมูลที่ได้รับ เราเข้าใจว่าท่านต้องการ: ${requirements || 'บริการขนส่งสินค้าระหว่างประเทศ'}\n\n## 4. Our Proposed Solution\n\nเราขอนำเสนอ: ${services || 'Sea Freight, Air Freight, Customs Clearance'}\n\n## 5. Service Details & Pricing Structure\n\nโครงสร้างราคาแข่งขัน พร้อม volume discount สำหรับลูกค้าที่มีปริมาณสินค้าสม่ำเสมอ\n\n## 6. Why Choose PIT Freight\n\n- ทีมงานผู้เชี่ยวชาญประสบการณ์สูง\n- ราคาแข่งขัน โปร่งใส ไม่มีค่าใช้จ่ายซ่อนเร้น\n- บริการ Door-to-Door ครบวงจร\n- ติดตาม Shipment ได้ Real-time\n\n## 7. Next Steps & Call to Action\n\nกรุณาติดต่อกลับเพื่อนัดประชุมและรับ Rate Sheet พิเศษ\nPlease contact us to schedule a meeting and receive our competitive rate sheet.`,
        keyPoints: [
          'บริการครบวงจร ทั้ง Sea, Air และ Customs Clearance',
          'ทีมงานมืออาชีพ พร้อมดูแลตลอด 24/7',
          'ราคาแข่งขัน พร้อม Volume Discount',
        ],
      };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
