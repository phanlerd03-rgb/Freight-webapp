/**
 * ===== Google Sheets Logger — PIT Freight =====
 * บันทึกทุก event ลง Google Sheets อัตโนมัติ
 *
 * Setup:
 * 1. สร้าง Google Sheet → คัดลอก Sheet ID จาก URL
 * 2. สร้าง Service Account ที่ console.cloud.google.com
 *    → APIs & Services → Credentials → Create credentials → Service account
 * 3. Enable Google Sheets API
 * 4. Share Sheet กับ service account email (Editor)
 * 5. ใส่ค่าใน .env:
 *    GOOGLE_SHEET_ID=...
 *    GOOGLE_SERVICE_ACCOUNT_EMAIL=...@....iam.gserviceaccount.com
 *    GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 */

const { google } = require('googleapis');

const SHEET_ID      = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL  = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY   = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

// Sheet names (tabs)
const SHEETS = {
  quote:    'Quotes',
  booking:  'Bookings',
  contact:  'Contacts',
  alibaba:  'Alibaba',
  product:  'Products',
  all:      'All Events',
};

async function getSheets() {
  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) return null;
  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
    'https://www.googleapis.com/auth/spreadsheets',
  ]);
  return google.sheets({ version: 'v4', auth });
}

async function appendRow(sheetName, values) {
  try {
    const sheets = await getSheets();
    if (!sheets) {
      console.log('⚠️ Google Sheets: env vars not configured, skipping');
      return;
    }
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [values] },
    });
  } catch (err) {
    console.error('⚠️ Google Sheets append error:', err.message);
  }
}

function thaiDateTime() {
  return new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function thaiDate() {
  return new Date().toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

// ── Quote Request ──────────────────────────────────────
async function logQuote(q) {
  const dt = thaiDateTime();
  const row = [
    dt, q.id || '', q.name || '', q.email || '', q.phone || '',
    q.origin || '', q.destination || '', q.cargoType || '',
    q.weight || '', q.shippingMethod || '',
    q.totalCost ? `฿${q.totalCost.toLocaleString()}` : '',
    q.transitTime || '', q.notes || '', 'ใหม่',
  ];
  await Promise.all([
    appendRow(SHEETS.quote, row),
    appendRow(SHEETS.all, ['Quote', ...row]),
  ]);
}

// ── Booking ────────────────────────────────────────────
async function logBooking(b) {
  const dt = thaiDateTime();
  const row = [
    dt, b.trackingNumber || '', b.senderName || '', b.senderEmail || '',
    b.senderPhone || '', b.recipientName || '', b.origin || '',
    b.destination || '', b.cargoType || '', b.weight || '',
    b.shippingMethod || '',
    b.estimatedCost ? `฿${b.estimatedCost.toLocaleString()}` : '',
    b.declaredValue || '', b.notes || '', 'กำลังดำเนินการ',
  ];
  await Promise.all([
    appendRow(SHEETS.booking, row),
    appendRow(SHEETS.all, ['Booking', ...row]),
  ]);
}

// ── Contact Form ───────────────────────────────────────
async function logContact(c) {
  const dt = thaiDateTime();
  const row = [
    dt, c.name || '', c.email || '', c.phone || '',
    c.company || '', c.service || '', c.message || '', 'ใหม่',
  ];
  await Promise.all([
    appendRow(SHEETS.contact, row),
    appendRow(SHEETS.all, ['Contact', ...row]),
  ]);
}

// ── Alibaba Sourcing ───────────────────────────────────
async function logAlibaba(a) {
  const dt = thaiDateTime();
  const row = [
    dt, a.productName || '', a.category || '', a.description || '',
    a.budget || '', a.quantity || '', a.unit || '',
    a.shippingMethod || '', a.destination || '',
    a.name || '', a.email || '', a.phone || '', a.company || '', 'New',
  ];
  await Promise.all([
    appendRow(SHEETS.alibaba, row),
    appendRow(SHEETS.all, ['Alibaba', ...row]),
  ]);
}

// ── Product Submission ─────────────────────────────────
async function logProduct(p) {
  const dt = thaiDateTime();
  const row = [
    dt, p.nameTH || '', p.nameEN || '', p.category || '',
    p.priceRange || '', p.moq || '', p.province || '',
    p.sellerName || '', p.sellerEmail || '', p.sellerPhone || '', 'Pending',
  ];
  await Promise.all([
    appendRow(SHEETS.product, row),
    appendRow(SHEETS.all, ['Product', ...row]),
  ]);
}

// ── Ensure sheet headers (call once on startup) ────────
async function ensureHeaders() {
  const headers = {
    [SHEETS.quote]:   ['วันที่-เวลา','ID','ชื่อ','Email','โทร','ต้นทาง','ปลายทาง','ประเภทสินค้า','น้ำหนัก(kg)','วิธีขนส่ง','ราคา','เวลาขนส่ง','หมายเหตุ','สถานะ'],
    [SHEETS.booking]: ['วันที่-เวลา','Tracking No.','ผู้ส่ง','Email','โทร','ผู้รับ','ต้นทาง','ปลายทาง','ประเภทสินค้า','น้ำหนัก','วิธีขนส่ง','ค่าขนส่ง','มูลค่าสินค้า','หมายเหตุ','สถานะ'],
    [SHEETS.contact]: ['วันที่-เวลา','ชื่อ','Email','โทร','บริษัท','บริการที่สนใจ','ข้อความ','สถานะ'],
    [SHEETS.alibaba]: ['วันที่-เวลา','สินค้า','หมวด','รายละเอียด','งบประมาณ(USD)','จำนวน','หน่วย','ขนส่ง','ปลายทาง','ชื่อ','Email','โทร','บริษัท','สถานะ'],
    [SHEETS.product]: ['วันที่-เวลา','ชื่อสินค้า(TH)','ชื่อสินค้า(EN)','หมวด','ราคา','MOQ','จังหวัด','ผู้ขาย','Email','โทร','สถานะ'],
    [SHEETS.all]:     ['วันที่-เวลา','ประเภท','ข้อมูล1','ข้อมูล2','ข้อมูล3','ข้อมูล4','ข้อมูล5','ข้อมูล6','ข้อมูล7','ข้อมูล8','ข้อมูล9','ข้อมูล10'],
  };
  try {
    const sheets = await getSheets();
    if (!sheets) return;
    for (const [name, h] of Object.entries(headers)) {
      try {
        // Only append header if sheet is empty
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: `${name}!A1`,
        });
        if (!res.data.values?.length) {
          await appendRow(name, h);
        }
      } catch (e) { /* sheet tab may not exist yet */ }
    }
  } catch (err) {
    console.log('⚠️ GSheets ensureHeaders:', err.message);
  }
}

module.exports = { logQuote, logBooking, logContact, logAlibaba, logProduct, ensureHeaders, thaiDateTime, thaiDate };
