/**
 * ===== PIT Freight — Auto Post Service =====
 * รันอัตโนมัติ 08:00 และ 15:00 ทุกวัน
 * สร้าง Incoterms content + infographic → โพสต์ Facebook Page 2
 */

const cron      = require('node-cron');
const Anthropic = require('@anthropic-ai/sdk');
const { execSync, execFileSync } = require('child_process');
const fs        = require('fs');
const path      = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PAGE2_ID    = process.env.FB_PAGE2_ID    || '1129725983562125';
const PAGE2_TOKEN = process.env.FB_PAGE2_ACCESS_TOKEN;

// ติดตาม Term ที่ใช้แล้ว (หมุนเวียนใน memory)
const ALL_TERMS = ['FOB','CIF','EXW','DDP','DAP','FCA','CPT','CFR','CIP','DPU'];
let usedTerms   = [];

function pickTerm() {
  if (usedTerms.length >= ALL_TERMS.length) usedTerms = [];
  const remaining = ALL_TERMS.filter(t => !usedTerms.includes(t));
  const term = remaining[Math.floor(Math.random() * remaining.length)];
  usedTerms.push(term);
  return term;
}

// ดาวน์โหลด font Sarabun (ถ้ายังไม่มี)
function ensureFonts() {
  const reg  = '/tmp/Sarabun.ttf';
  const bold = '/tmp/SarabunB.ttf';
  if (!fs.existsSync(reg)) {
    execSync('curl -sL https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf -o /tmp/Sarabun.ttf');
  }
  if (!fs.existsSync(bold)) {
    execSync('curl -sL https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Bold.ttf -o /tmp/SarabunB.ttf');
  }
}

// สร้าง content + PIL script ผ่าน Claude API
async function generateContent(term) {
  const prompt = `คุณคือผู้เชี่ยวชาญด้านการค้าระหว่างประเทศ

สร้าง 2 อย่างสำหรับ Incoterm: **${term}**

=== ส่วนที่ 1: FACEBOOK_CAPTION ===
เขียน caption ภาษาไทย+อังกฤษ สำหรับ Facebook Page "Booking Freight Shipper & Consignee"
- ยกตัวอย่างสินค้าไทย 1 ชนิดที่เหมาะกับ ${term} (เช่น ข้าว, ยางพารา, อิเล็กทรอนิกส์ ฯลฯ)
- อธิบายความหมาย ${term} แบบเข้าใจง่าย
- อธิบายขั้นตอนการส่งออกตั้งแต่ต้นจนจบ (5-7 ขั้นตอน)
- ใส่ hashtag ท้าย (ภาษาไทย+อังกฤษ 8-12 อัน)
- ลงท้ายด้วย: 📞 +66 63-446-7735 | 💬 LINE: lin.ee/6aC3Z5O | 🌐 pitfreight.com
- ความยาวรวม ~400-500 คำ

=== ส่วนที่ 2: PYTHON_SCRIPT ===
เขียน Python script สร้าง infographic 1080x1080px ด้วย PIL
กฎสำคัญ:
- ใช้ font /tmp/Sarabun.ttf (regular) และ /tmp/SarabunB.ttf (bold) เท่านั้น
- background dark theme สีทันสมัย เหมาะกับ ${term}
- แสดง: ชื่อ Incoterm, ชื่อสินค้าไทย, 5-6 ขั้นตอนหลัก (2 คอลัมน์), ตาราง responsibility split, footer "Booking Freight Shipper & Consignee"
- บันทึกที่ /tmp/auto_post.jpg quality=95
- ห้ามใช้ emoji ในภาพ (PIL render ไม่ได้) ใช้ text แทน
- script ต้องรันได้ทันทีโดยไม่มี error

format ตอบกลับ:
CAPTION_START
[caption ทั้งหมด]
CAPTION_END
SCRIPT_START
[python script ทั้งหมด]
SCRIPT_END`;

  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].text;

  const captionMatch = text.match(/CAPTION_START\n([\s\S]*?)\nCAPTION_END/);
  const scriptMatch  = text.match(/SCRIPT_START\n([\s\S]*?)\nSCRIPT_END/);

  return {
    caption: captionMatch ? captionMatch[1].trim() : '',
    script:  scriptMatch  ? scriptMatch[1].trim()  : '',
  };
}

// โพสต์ภาพ+caption ลง Facebook
async function postToFacebook(imagePath, caption) {
  if (!PAGE2_TOKEN) throw new Error('FB_PAGE2_ACCESS_TOKEN not set');

  const params = new URLSearchParams({ caption, access_token: PAGE2_TOKEN });
  const formData = new FormData();
  formData.append('caption', caption);
  formData.append('access_token', PAGE2_TOKEN);
  formData.append('source', new Blob([fs.readFileSync(imagePath)], { type: 'image/jpeg' }), 'post.jpg');

  const res  = await fetch(`https://graph.facebook.com/v19.0/${PAGE2_ID}/photos`, {
    method: 'POST', body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || res.status);
  return data;
}

// === Main job function ===
async function runAutoPost() {
  const now  = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  console.log(`\n[AutoPost] เริ่มต้น ${now}`);

  try {
    // 1. เตรียม fonts
    ensureFonts();

    // 2. เลือก Incoterm
    const term = pickTerm();
    console.log(`[AutoPost] Term: ${term}`);

    // 3. สร้าง content ผ่าน Claude
    console.log('[AutoPost] กำลังสร้าง content ด้วย Claude...');
    const { caption, script } = await generateContent(term);

    if (!script) throw new Error('Claude ไม่ได้ส่ง Python script กลับมา');

    // 4. รัน Python script สร้างภาพ
    console.log('[AutoPost] รัน Python PIL...');
    const scriptPath = '/tmp/auto_gen.py';
    // Strip markdown code fences if Claude wrapped the script
    const cleanScript = script
      .replace(/^```python\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    fs.writeFileSync(scriptPath, cleanScript);
    execFileSync('python3', [scriptPath], { timeout: 60000 });

    if (!fs.existsSync('/tmp/auto_post.jpg')) throw new Error('ไม่พบไฟล์ภาพ /tmp/auto_post.jpg');
    console.log('[AutoPost] สร้างภาพสำเร็จ');

    // 5. โพสต์ Facebook
    console.log('[AutoPost] โพสต์ Facebook...');
    const result = await postToFacebook('/tmp/auto_post.jpg', caption);
    const url = `https://www.facebook.com/${result.post_id}`;
    console.log(`[AutoPost] สำเร็จ! Post ID: ${result.post_id}`);
    console.log(`[AutoPost] URL: ${url}`);

    // 6. ส่ง Slack notification (ถ้ามี)
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `✅ *AutoPost สำเร็จ* — ${term}\nโพสต์: ${url}`,
        }),
      }).catch(() => {});
    }

  } catch (err) {
    console.error(`[AutoPost] ERROR: ${err.message}`);
    // แจ้ง Slack ถ้า error
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `❌ *AutoPost ล้มเหลว*: ${err.message}` }),
      }).catch(() => {});
    }
  }
}

// === ลงทะเบียน Cron Jobs ===
function startAutoPost() {
  // 08:00 ทุกวัน (Asia/Bangkok)
  cron.schedule('0 8 * * *', runAutoPost, { timezone: 'Asia/Bangkok' });
  // 15:00 ทุกวัน (Asia/Bangkok)
  cron.schedule('0 15 * * *', runAutoPost, { timezone: 'Asia/Bangkok' });

  console.log('[AutoPost] Cron jobs registered: 08:00 & 15:00 Asia/Bangkok');
}

module.exports = { startAutoPost, runAutoPost };
