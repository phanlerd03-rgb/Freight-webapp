/**
 * PIT Freight — LINE Rich Menu Setup
 * รัน: node scripts/setup-richmenu.js
 * ต้องมี LINE_CHANNEL_ACCESS_TOKEN ใน .env
 */

require('dotenv').config();
const axios = require('axios');
const fs    = require('fs');
const path  = require('path');
const { createCanvas } = require('canvas');

const TOKEN  = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const SITE   = process.env.SITE_URL || 'https://pitfreight.com';
const HEADERS = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type':  'application/json',
};

// ─── Rich Menu JSON ──────────────────────────────────────
const richMenuBody = {
  size:     { width: 2500, height: 1686 },
  selected: true,
  name:     'PIT Freight Main Menu',
  chatBarText: 'เมนูบริการ',
  areas: [
    // Row 1 — left: Tracking
    {
      bounds: { x: 0,    y: 0, width: 833, height: 843 },
      action: {
        type:    'message',
        label:   'เช็กสถานะตู้',
        text:    '🔍 เช็กสถานะตู้ / ตรวจสอบสินค้า\n\nกรุณาพิมพ์หมายเลขติดตาม:\n• Container No. (ABCD1234567)\n• B/L No.\n• AWB No.\n\nหรือ ดูสถานะออนไลน์ได้ที่: ' + SITE + '/#tracking',
      },
    },
    // Row 1 — center: Quote
    {
      bounds: { x: 833,  y: 0, width: 834, height: 843 },
      action: {
        type:  'uri',
        label: 'ขอใบเสนอราคา',
        uri:   SITE + '/quote-form',
      },
    },
    // Row 1 — right: Services
    {
      bounds: { x: 1667, y: 0, width: 833, height: 843 },
      action: {
        type:  'message',
        label: 'บริการของเรา',
        text:  '🚢 บริการขนส่งครบวงจร PIT Freight\n\n✈️ Air Freight — ขนส่งทางอากาศ\n🚢 Sea FCL/LCL — ขนส่งทางเรือ\n🚛 Cross-border — ขนส่งข้ามแดน ASEAN\n🛃 Customs Clearance — พิธีการศุลกากร\n⚓ Bulk / RoRo — สินค้าพิเศษ\n\nสอบถามเพิ่มเติม: ' + SITE + '/#services',
      },
    },
    // Row 2 — left: Schedule
    {
      bounds: { x: 0,    y: 843, width: 833, height: 843 },
      action: {
        type:  'uri',
        label: 'ตารางเรือ',
        uri:   SITE + '/#contact',
      },
    },
    // Row 2 — center: Knowledge
    {
      bounds: { x: 833,  y: 843, width: 834, height: 843 },
      action: {
        type:  'message',
        label: 'คลังความรู้',
        text:  '📚 คลังความรู้ PIT Freight\n\n🔎 ค้นหา HS Code:\nhttps://ittaxcalc.customs.go.th\n\n📋 คำนวณภาษีนำเข้า:\n' + SITE + '/#tools\n\n📖 ความรู้ Incoterms & ศุลกากร:\n' + SITE + '/blog',
      },
    },
    // Row 2 — right: Contact
    {
      bounds: { x: 1667, y: 843, width: 833, height: 843 },
      action: {
        type:  'message',
        label: 'ติดต่อเจ้าหน้าที่',
        text:  '📞 ติดต่อ PIT Freight\n\n👤 คุณธัญญาลักษณ์ พันธ์เลิศ (บรีส)\n📱 063-446-7735\n✉️ phanlerd.03@gmail.com\n💬 LINE: https://lin.ee/nEpu4wM\n\n🕐 เวลาทำการ: จ-ศ 8:30–17:30\n📍 แผนที่: ' + SITE + '/#contact',
      },
    },
  ],
};

// ─── Vector Icon Drawers ─────────────────────────────────
function drawIconTracking(ctx, cx, cy, r, color) {
  // Container box
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.13; ctx.lineJoin = 'round';
  const bw = r * 1.1, bh = r * 0.85;
  ctx.strokeRect(cx - bw / 2, cy - bh / 2 - r * 0.1, bw, bh);
  ctx.beginPath(); ctx.moveTo(cx - bw / 2, cy - r * 0.1 + bh * 0.3);
  ctx.lineTo(cx + bw / 2, cy - r * 0.1 + bh * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - bh / 2 - r * 0.1); ctx.lineTo(cx, cy - r * 0.1 + bh * 0.3); ctx.stroke();
  // Magnifying glass
  const mx = cx + r * 0.52, my = cy + r * 0.52, mr = r * 0.4;
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mx + mr * 0.7, my + mr * 0.7);
  ctx.lineTo(mx + mr * 1.4, my + mr * 1.4); ctx.stroke();
}
function drawIconQuote(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.12; ctx.lineJoin = 'round';
  const dw = r * 1.1, dh = r * 1.4;
  const dx = cx - dw / 2, dy = cy - dh / 2;
  // Document
  ctx.beginPath(); ctx.moveTo(dx + dw * 0.7, dy); ctx.lineTo(dx, dy);
  ctx.lineTo(dx, dy + dh); ctx.lineTo(dx + dw, dy + dh);
  ctx.lineTo(dx + dw, dy + dh * 0.3); ctx.lineTo(dx + dw * 0.7, dy + dh * 0.3);
  ctx.lineTo(dx + dw * 0.7, dy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(dx + dw * 0.7, dy); ctx.lineTo(dx + dw, dy + dh * 0.3); ctx.stroke();
  // Lines
  [[0.45, 0.55], [0.45, 0.66], [0.45, 0.77]].forEach(([yp, xp]) => {
    ctx.beginPath(); ctx.moveTo(dx + dw * 0.18, dy + dh * yp);
    ctx.lineTo(dx + dw * xp, dy + dh * yp); ctx.stroke();
  });
  // Pen
  ctx.save(); ctx.translate(cx + r * 0.55, cy + r * 0.6); ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-r * 0.06, -r * 0.35, r * 0.12, r * 0.35);
  ctx.beginPath(); ctx.moveTo(-r * 0.06, r * 0); ctx.lineTo(0, r * 0.18); ctx.lineTo(r * 0.06, r * 0); ctx.fill();
  ctx.restore();
}
function drawIconServices(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.12; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // Ship hull
  ctx.beginPath(); ctx.moveTo(cx - r * 1.0, cy + r * 0.2);
  ctx.quadraticCurveTo(cx, cy + r * 0.85, cx + r * 1.0, cy + r * 0.2); ctx.stroke();
  // Body
  ctx.strokeRect(cx - r * 0.65, cy - r * 0.35, r * 1.3, r * 0.55);
  // Chimney
  ctx.strokeRect(cx - r * 0.18, cy - r * 0.85, r * 0.36, r * 0.52);
  // Waves
  ctx.beginPath(); ctx.moveTo(cx - r * 1.2, cy + r * 0.55);
  ctx.quadraticCurveTo(cx - r * 0.6, cy + r * 0.35, cx, cy + r * 0.55);
  ctx.quadraticCurveTo(cx + r * 0.6, cy + r * 0.75, cx + r * 1.2, cy + r * 0.55); ctx.stroke();
}
function drawIconSchedule(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.11; ctx.lineJoin = 'round';
  const cw2 = r * 1.3, ch = r * 1.2, ox = cx - cw2 / 2, oy = cy - ch / 2;
  ctx.strokeRect(ox, oy, cw2, ch);
  ctx.beginPath(); ctx.moveTo(ox, oy + ch * 0.28); ctx.lineTo(ox + cw2, oy + ch * 0.28); ctx.stroke();
  // Calendar hooks
  [0.3, 0.7].forEach(xp => {
    ctx.beginPath(); ctx.moveTo(ox + cw2 * xp, oy - r * 0.12); ctx.lineTo(ox + cw2 * xp, oy + r * 0.12); ctx.stroke();
  });
  // Grid dots
  const gx = [0.2, 0.5, 0.8], gy = [0.5, 0.72, 0.88];
  ctx.fillStyle = color;
  gx.forEach(xp => gy.forEach(yp => {
    ctx.beginPath(); ctx.arc(ox + cw2 * xp, oy + ch * yp, r * 0.07, 0, Math.PI * 2); ctx.fill();
  }));
}
function drawIconKnowledge(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.12; ctx.lineJoin = 'round';
  // Book
  const bw = r * 1.2, bh = r * 1.3;
  ctx.beginPath(); ctx.moveTo(cx, cy - bh / 2);
  ctx.lineTo(cx - bw / 2, cy - bh / 2 + r * 0.15);
  ctx.lineTo(cx - bw / 2, cy + bh / 2);
  ctx.lineTo(cx + bw / 2, cy + bh / 2);
  ctx.lineTo(cx + bw / 2, cy - bh / 2 + r * 0.15);
  ctx.lineTo(cx, cy - bh / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - bh / 2); ctx.lineTo(cx, cy + bh / 2); ctx.stroke();
  // Pages lines
  [[0.3, 0.65], [0.45, 0.78]].forEach(([yp]) => {
    ctx.beginPath(); ctx.moveTo(cx - bw * 0.38, cy - bh / 2 + bh * yp);
    ctx.lineTo(cx - bw * 0.1, cy - bh / 2 + bh * yp); ctx.stroke();
  });
  // Lightbulb top
  ctx.beginPath(); ctx.arc(cx + r * 0.62, cy - r * 0.65, r * 0.32, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = color + '44'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + r * 0.5, cy - r * 0.35);
  ctx.lineTo(cx + r * 0.74, cy - r * 0.35); ctx.stroke();
}
function drawIconContact(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.12; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // Headset arc
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 0.75, Math.PI, 0); ctx.stroke();
  // Left ear
  ctx.beginPath(); ctx.arc(cx - r * 0.75, cy - r * 0.1, r * 0.28, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r * 0.75, cy + r * 0.18); ctx.lineTo(cx - r * 0.75, cy + r * 0.5); ctx.stroke();
  // Right ear
  ctx.beginPath(); ctx.arc(cx + r * 0.75, cy - r * 0.1, r * 0.28, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + r * 0.75, cy + r * 0.18); ctx.lineTo(cx + r * 0.75, cy + r * 0.5); ctx.stroke();
  // Mic boom
  ctx.beginPath(); ctx.moveTo(cx - r * 0.75, cy + r * 0.5);
  ctx.quadraticCurveTo(cx - r * 0.75, cy + r * 0.85, cx - r * 0.35, cy + r * 0.85); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx - r * 0.35, cy + r * 0.85, r * 0.16, 0, Math.PI * 2); ctx.stroke();
}

const ICON_DRAW_FNS = [
  drawIconTracking, drawIconQuote, drawIconServices,
  drawIconSchedule, drawIconKnowledge, drawIconContact,
];

// ─── Generate Rich Menu Image ────────────────────────────
async function generateImage() {
  const W = 2500, H = 1686, cols = 3, rows = 2;
  const cw = Math.floor(W / cols), rh = Math.floor(H / rows);

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  const buttons = [
    { label: 'เช็กสถานะตู้',     sub: 'Tracking',           accent: '#378ADD' },
    { label: 'ขอใบเสนอราคา',    sub: 'Get a Quote',         accent: '#c9a84c' },
    { label: 'บริการของเรา',     sub: 'Our Services',        accent: '#1D9E75' },
    { label: 'ตารางเรือ',         sub: 'Sailing Schedule',    accent: '#534AB7' },
    { label: 'คลังความรู้',       sub: 'HS Code / Incoterms', accent: '#EF9F27' },
    { label: 'ติดต่อเจ้าหน้าที่', sub: 'Contact Support',     accent: '#E24B4A' },
  ];

  // Fill whole canvas
  ctx.fillStyle = '#071220';
  ctx.fillRect(0, 0, W, H);

  buttons.forEach((btn, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = col * cw, y = row * rh;

    // Cell background
    ctx.fillStyle = '#081624';
    ctx.fillRect(x + 1, y + 1, cw - 2, rh - 2);

    // Accent top bar
    ctx.fillStyle = btn.accent;
    ctx.fillRect(x, y, cw, 10);

    // Soft glow bg circle
    ctx.fillStyle = btn.accent + '18';
    ctx.beginPath();
    ctx.arc(x + cw / 2, y + rh * 0.40, 155, 0, Math.PI * 2);
    ctx.fill();

    // Icon outline circle
    ctx.strokeStyle = btn.accent + '55';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + cw / 2, y + rh * 0.40, 140, 0, Math.PI * 2);
    ctx.stroke();

    // Draw vector icon
    ctx.save();
    ctx.lineCap = 'round';
    ICON_DRAW_FNS[i](ctx, x + cw / 2, y + rh * 0.40, 85, btn.accent);
    ctx.restore();

    // Label
    ctx.font = 'bold 90px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, x + cw / 2, y + rh * 0.72);

    // Sub-label
    ctx.font = '62px sans-serif';
    ctx.fillStyle = btn.accent;
    ctx.fillText(btn.sub, x + cw / 2, y + rh * 0.86);
  });

  // Grid dividers
  ctx.strokeStyle = '#1a2e44';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cw, 0); ctx.lineTo(cw, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cw * 2, 0); ctx.lineTo(cw * 2, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, rh); ctx.lineTo(W, rh); ctx.stroke();

  // Watermark
  ctx.font = 'bold 52px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.textAlign = 'center';
  ctx.fillText('PIT FREIGHT', W / 2, H - 28);

  const imgPath = path.join(__dirname, 'richmenu.png');
  const buf     = canvas.toBuffer('image/png');
  fs.writeFileSync(imgPath, buf);
  console.log('✅ Image generated:', imgPath);
  return imgPath;
}

// ─── Main ────────────────────────────────────────────────
async function main() {
  if (!TOKEN) { console.error('❌ LINE_CHANNEL_ACCESS_TOKEN ไม่ได้ตั้งค่า'); process.exit(1); }

  try {
    // 1. Delete old rich menus
    console.log('🗑  ลบ Rich Menu เดิม...');
    const listRes = await axios.get('https://api.line.me/v2/bot/richmenu/list', { headers: HEADERS });
    for (const rm of listRes.data.richmenus || []) {
      await axios.delete(`https://api.line.me/v2/bot/richmenu/${rm.richMenuId}`, { headers: HEADERS });
      console.log('   ลบแล้ว:', rm.richMenuId);
    }

    // 2. Create new rich menu
    console.log('📋 สร้าง Rich Menu ใหม่...');
    const createRes = await axios.post('https://api.line.me/v2/bot/richmenu', richMenuBody, { headers: HEADERS });
    const richMenuId = createRes.data.richMenuId;
    console.log('✅ Rich Menu ID:', richMenuId);

    // 3. Generate & upload image
    let imgPath;
    try {
      imgPath = await generateImage();
    } catch (e) {
      console.log('⚠️  canvas ไม่ได้ติดตั้ง — ใช้รูปจาก scripts/richmenu.png แทน');
      imgPath = path.join(__dirname, 'richmenu.png');
      if (!fs.existsSync(imgPath)) {
        console.error('❌ ไม่พบ scripts/richmenu.png — กรุณาวางไฟล์รูปก่อนรัน');
        process.exit(1);
      }
    }

    console.log('📤 อัปโหลดรูป...');
    const imgBuf = fs.readFileSync(imgPath);
    await axios.post(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      imgBuf,
      { headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'image/png' } }
    );
    console.log('✅ อัปโหลดรูปสำเร็จ');

    // 4. Set as default rich menu
    await axios.post(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {},
      { headers: HEADERS }
    );
    console.log('✅ ตั้งเป็น Default Rich Menu สำเร็จ!');
    console.log('\n🎉 Rich Menu พร้อมใช้งานแล้วค่ะ');

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
}

main();
