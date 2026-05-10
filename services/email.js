const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const fromName = process.env.EMAIL_FROM_NAME || 'Project International Trade';
const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;

async function sendBookingConfirmation(booking) {
  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><style>
    body { font-family: 'Segoe UI', sans-serif; background:#f5f7fa; margin:0; padding:20px; }
    .card { background:#fff; border-radius:12px; max-width:600px; margin:auto; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg,#1a3a5c,#2980b9); color:#fff; padding:32px; text-align:center; }
    .header h1 { margin:0; font-size:24px; }
    .header p { margin:8px 0 0; opacity:.85; }
    .body { padding:32px; }
    .row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee; }
    .label { color:#666; font-size:14px; }
    .value { font-weight:600; color:#1a3a5c; }
    .tracking { background:#e8f4fd; border-radius:8px; padding:16px; text-align:center; margin:24px 0; }
    .tracking span { font-size:22px; font-weight:700; letter-spacing:2px; color:#2980b9; }
    .footer { background:#f5f7fa; padding:20px; text-align:center; color:#999; font-size:13px; }
    .badge { background:#27ae60; color:#fff; border-radius:20px; padding:4px 12px; font-size:12px; }
  </style></head>
  <body>
  <div class="card">
    <div class="header">
      <h1>✅ ยืนยันการจองขนส่งสำเร็จ</h1>
      <p>Booking Confirmation — ${fromName}</p>
    </div>
    <div class="body">
      <p>สวัสดีคุณ <strong>${booking.senderName}</strong>,</p>
      <p>เราได้รับการจองขนส่งของคุณเรียบร้อยแล้ว ดังรายละเอียดด้านล่าง</p>
      <div class="tracking">
        <p style="margin:0 0 4px;color:#666;font-size:13px;">หมายเลขติดตามสินค้า</p>
        <span>${booking.trackingNumber}</span>
      </div>
      <div class="row"><span class="label">เส้นทาง</span><span class="value">${booking.origin} → ${booking.destination}</span></div>
      <div class="row"><span class="label">ประเภทสินค้า</span><span class="value">${booking.cargoType}</span></div>
      <div class="row"><span class="label">น้ำหนัก / ขนาด</span><span class="value">${booking.weight} kg / ${booking.dimensions}</span></div>
      <div class="row"><span class="label">วิธีขนส่ง</span><span class="value">${booking.shippingMethod}</span></div>
      <div class="row"><span class="label">ค่าขนส่งโดยประมาณ</span><span class="value" style="color:#27ae60">฿${booking.estimatedCost?.toLocaleString()}</span></div>
      <div class="row"><span class="label">สถานะ</span><span class="badge">รอดำเนินการ</span></div>
      <p style="margin-top:24px;color:#666;font-size:14px;">
        ทีมงานของเราจะติดต่อคุณภายใน 24 ชั่วโมง หากมีข้อสงสัยโปรดติดต่อ
        <a href="mailto:${fromEmail}" style="color:#2980b9">${fromEmail}</a>
      </p>
    </div>
    <div class="footer">© 2026 ${fromName} | บริการขนส่งสินค้าระหว่างประเทศ</div>
  </div>
  </body></html>`;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: booking.senderEmail,
    subject: `✅ ยืนยันการจอง #${booking.trackingNumber} — ${fromName}`,
    html,
  });
}

async function sendQuoteEmail(quote) {
  const html = `
  <!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:'Segoe UI',sans-serif;background:#f5f7fa;margin:0;padding:20px;}
    .card{background:#fff;border-radius:12px;max-width:600px;margin:auto;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);}
    .header{background:linear-gradient(135deg,#1a3a5c,#2980b9);color:#fff;padding:32px;text-align:center;}
    .body{padding:32px;}.table{width:100%;border-collapse:collapse;}
    .table th{background:#1a3a5c;color:#fff;padding:10px;text-align:left;font-size:14px;}
    .table td{padding:10px;border-bottom:1px solid #eee;font-size:14px;}
    .total{font-size:28px;font-weight:700;color:#1a3a5c;text-align:center;padding:16px;}
    .footer{background:#f5f7fa;padding:20px;text-align:center;color:#999;font-size:13px;}
  </style></head><body>
  <div class="card">
    <div class="header"><h1>📦 ใบเสนอราคาค่าขนส่ง</h1><p>Freight Quotation — ${fromName}</p></div>
    <div class="body">
      <p>สวัสดีคุณ <strong>${quote.name}</strong>,</p>
      <p>ต่อไปนี้คือใบเสนอราคาค่าขนส่งตามที่คุณร้องขอ</p>
      <table class="table">
        <tr><th>รายการ</th><th>รายละเอียด</th></tr>
        <tr><td>เส้นทาง</td><td>${quote.origin} → ${quote.destination}</td></tr>
        <tr><td>น้ำหนัก</td><td>${quote.weight} kg</td></tr>
        <tr><td>ขนาด</td><td>${quote.dimensions || 'ไม่ระบุ'}</td></tr>
        <tr><td>ประเภทสินค้า</td><td>${quote.cargoType}</td></tr>
        <tr><td>วิธีขนส่ง</td><td>${quote.shippingMethod}</td></tr>
      </table>
      <div class="total">฿${quote.totalCost?.toLocaleString()}</div>
      <p style="text-align:center;color:#666;font-size:13px;">*ราคานี้มีอายุ 7 วัน นับจากวันที่ ${new Date().toLocaleDateString('th-TH')}</p>
    </div>
    <div class="footer">© 2026 ${fromName}</div>
  </div></body></html>`;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: quote.email,
    subject: `📦 ใบเสนอราคา — ${quote.origin} → ${quote.destination} | ${fromName}`,
    html,
  });
}

async function sendStatusUpdate(data) {
  const statusMap = {
    processing: 'กำลังดำเนินการ',
    picked_up: 'รับสินค้าแล้ว',
    in_transit: 'อยู่ระหว่างการขนส่ง',
    customs: 'ผ่านพิธีการศุลกากร',
    delivered: 'จัดส่งแล้ว',
  };

  const html = `
  <!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:'Segoe UI',sans-serif;background:#f5f7fa;margin:0;padding:20px;}
    .card{background:#fff;border-radius:12px;max-width:600px;margin:auto;box-shadow:0 4px 20px rgba(0,0,0,.08);}
    .header{background:linear-gradient(135deg,#1a3a5c,#2980b9);color:#fff;padding:24px;text-align:center;border-radius:12px 12px 0 0;}
    .body{padding:24px;text-align:center;}
    .status{font-size:18px;font-weight:700;color:#2980b9;margin:16px 0;}
    .tracking{font-size:20px;letter-spacing:2px;color:#1a3a5c;font-weight:700;}
    .footer{padding:16px;text-align:center;color:#999;font-size:12px;}
  </style></head><body>
  <div class="card">
    <div class="header"><h1>🚢 อัพเดทสถานะการขนส่ง</h1></div>
    <div class="body">
      <p>หมายเลขติดตาม:</p>
      <div class="tracking">${data.trackingNumber}</div>
      <div class="status">สถานะ: ${statusMap[data.status] || data.status}</div>
      <p style="color:#666">${data.message || ''}</p>
      <p style="color:#999;font-size:13px">อัพเดทเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
    </div>
    <div class="footer">© 2026 ${fromName}</div>
  </div></body></html>`;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: data.email,
    subject: `🚢 อัพเดทสถานะ #${data.trackingNumber}`,
    html,
  });
}

module.exports = { sendBookingConfirmation, sendQuoteEmail, sendStatusUpdate };
