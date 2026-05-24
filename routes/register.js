const express  = require('express');
const router   = express.Router();
const emailSvc = require('../services/email');

// POST /api/register
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, businessType, message } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'กรุณากรอกชื่อและอีเมล' });

    // ── ส่งอีเมลแจ้งทีม ───────────────────────────────
    const teamHtml = `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:'Segoe UI',sans-serif;background:#f5f7fa;margin:0;padding:20px}
.card{background:#fff;border-radius:12px;max-width:600px;margin:auto;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
.header{background:linear-gradient(135deg,#1a3a5c,#2980b9);color:#fff;padding:28px 32px}
.header h1{margin:0;font-size:22px}.header p{margin:6px 0 0;opacity:.8;font-size:14px}
.body{padding:28px 32px}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}
.label{color:#666;font-size:14px;min-width:140px}.value{font-weight:600;color:#1a3a5c;text-align:right}
.msg{background:#f8fafc;border-left:4px solid #2980b9;padding:14px 16px;border-radius:0 8px 8px 0;margin-top:16px;color:#334;font-size:14px;line-height:1.6}
.footer{background:#f5f7fa;padding:16px 32px;text-align:center;color:#999;font-size:12px}
.badge{background:#27ae60;color:#fff;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:600}
</style></head><body>
<div class="card">
  <div class="header">
    <h1>🎉 สมาชิกใหม่สมัครเข้ามา!</h1>
    <p>มีลูกค้าใหม่สนใจบริการ PIT Freight</p>
  </div>
  <div class="body">
    <span class="badge">สมาชิกใหม่</span>
    <div style="height:16px"></div>
    <div class="row"><span class="label">👤 ชื่อ-นามสกุล</span><span class="value">${name}</span></div>
    <div class="row"><span class="label">📧 อีเมล</span><span class="value">${email}</span></div>
    <div class="row"><span class="label">📞 เบอร์โทร</span><span class="value">${phone || '-'}</span></div>
    <div class="row"><span class="label">🏢 บริษัท / ชื่อร้าน</span><span class="value">${company || '-'}</span></div>
    <div class="row"><span class="label">📦 ประเภทธุรกิจ</span><span class="value">${businessType || '-'}</span></div>
    ${message ? `<div class="msg">💬 ${message}</div>` : ''}
    <div style="margin-top:20px;padding:12px 16px;background:#e8f4fd;border-radius:8px;font-size:13px;color:#1a3a5c">
      ⏰ ส่งมาเมื่อ: <strong>${new Date().toLocaleString('th-TH', { timeZone:'Asia/Bangkok' })}</strong>
    </div>
  </div>
  <div class="footer">Project International Trade Co.,Ltd. — pitfreight.com</div>
</div>
</body></html>`;

    await emailSvc.sendRaw({
      to:      process.env.EMAIL_USER,
      subject: `🎉 สมาชิกใหม่: ${name} ${company ? `(${company})` : ''}`,
      html:    teamHtml,
    });

    // ── ส่งอีเมลต้อนรับหาลูกค้า ───────────────────────
    const welcomeHtml = `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:'Segoe UI',sans-serif;background:#f5f7fa;margin:0;padding:20px}
.card{background:#fff;border-radius:12px;max-width:600px;margin:auto;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
.header{background:linear-gradient(135deg,#1a3a5c,#2980b9);color:#fff;padding:32px;text-align:center}
.header h1{margin:0;font-size:24px}.header p{margin:8px 0 0;opacity:.85}
.body{padding:32px}
.highlight{background:#e8f4fd;border-radius:10px;padding:20px;text-align:center;margin:24px 0}
.highlight span{font-size:18px;font-weight:700;color:#1a3a5c}
.contact-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #eee;font-size:14px}
.contact-row .icon{font-size:20px;width:28px;flex-shrink:0}
.footer{background:#f5f7fa;padding:20px;text-align:center;color:#999;font-size:12px}
a{color:#2980b9}
</style></head><body>
<div class="card">
  <div class="header">
    <h1>🚢 ยินดีต้อนรับสู่ PIT Freight!</h1>
    <p>ขอบคุณที่สนใจบริการของเรา คุณ${name}</p>
  </div>
  <div class="body">
    <p>สวัสดีคุณ <strong>${name}</strong> 👋</p>
    <p>เราได้รับข้อมูลของคุณเรียบร้อยแล้ว ทีมงานของเราจะติดต่อกลับภายใน <strong>24 ชั่วโมง</strong> เพื่อให้ข้อมูลบริการที่เหมาะกับคุณ</p>
    <div class="highlight">
      <p style="margin:0 0 6px;color:#666;font-size:13px">บริการของเรา</p>
      <span>ขนส่งสินค้าระหว่างประเทศ • พิธีการศุลกากร<br>ใบอนุญาตส่งออก • Incoterms Advisory</span>
    </div>
    <p style="font-size:14px;color:#555">ติดต่อทีมงานได้เลยที่:</p>
    <div class="contact-row"><span class="icon">📞</span><span>+66 63-446-7735</span></div>
    <div class="contact-row"><span class="icon">💬</span><a href="https://lin.ee/6aC3Z5O">LINE OA: lin.ee/6aC3Z5O</a></div>
    <div class="contact-row"><span class="icon">🌐</span><a href="https://pitfreight.com">pitfreight.com</a></div>
  </div>
  <div class="footer">Project International Trade Co.,Ltd.<br>© ${new Date().getFullYear()} pitfreight.com</div>
</div>
</body></html>`;

    await emailSvc.sendRaw({
      to:      email,
      subject: `ยินดีต้อนรับสู่ PIT Freight! 🚢 เราจะติดต่อกลับเร็วๆ นี้`,
      html:    welcomeHtml,
    });

    res.json({ success: true, message: 'ลงทะเบียนสำเร็จ ตรวจสอบอีเมลของคุณ' });
  } catch (err) {
    console.error('[Register]', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' });
  }
});

module.exports = router;
