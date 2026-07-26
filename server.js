require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets with long cache, but HTML with no-cache so Cloudflare always fetches fresh
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp/i.test(req.headers['user-agent'] || '')
});
app.use('/api/', limiter);

const quoteRoutes = require('./routes/quote');
const bookingRoutes = require('./routes/booking');
const trackingRoutes = require('./routes/tracking');
const webhookRoutes = require('./routes/webhook');
const chatRoutes = require('./routes/chat');
const blogRoutes = require('./routes/blog');
const cronRoutes = require('./routes/cron');
const productsRoutes = require('./routes/products');
const alibabaRoutes  = require('./routes/alibaba');
const adminRoutes    = require('./routes/admin');
const contactRoutes  = require('./routes/contact');
const toolsRoutes    = require('./routes/tools');
const registerRoutes = require('./routes/register');

app.use('/api/quote', quoteRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/alibaba', alibabaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/register', registerRoutes);

// ===== Auto Post Cron (Incoterms content → Facebook) =====
const { startAutoPost } = require('./services/autopost');
startAutoPost();

// ===== Daily Blog — PAUSED =====
// const { startDailyBlog } = require('./services/dailyblog');
// startDailyBlog();

// ===== News Feed — PAUSED =====
// const { startNewsFeed } = require('./services/newsfeed');
// startNewsFeed();

// ===== Admin Panel Page =====
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ===== LINE Rich Menu Pages =====
app.get('/quote-form', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Content-Type', 'text/html; charset=UTF-8');
  res.send(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ขอใบเสนอราคา — PIT Freight</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Sarabun',sans-serif;background:#f0f4f8;color:#1e293b;min-height:100vh}
    .header{background:linear-gradient(135deg,#04101e,#0a1e38);padding:18px 20px;display:flex;align-items:center;gap:12px}
    .header-logo{width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:22px}
    .header-text h1{font-size:16px;font-weight:800;color:#fff}
    .header-text p{font-size:12px;color:rgba(255,255,255,.55);margin-top:1px}
    .card{background:#fff;margin:16px;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
    .card-title{background:linear-gradient(135deg,#04101e,#0d2b4e);padding:20px;display:flex;align-items:center;gap:10px}
    .card-title h2{font-size:17px;font-weight:800;color:#fff}
    .card-title p{font-size:13px;color:rgba(255,255,255,.65);margin-top:3px}
    .gold-line{width:4px;height:42px;background:#c9a84c;border-radius:3px;flex-shrink:0}
    .form-body{padding:20px}
    .section-label{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}
    .section-label:first-child{margin-top:0}
    .form-group{margin-bottom:14px}
    .form-group label{display:block;font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px}
    .req{color:#ef4444}
    input,select,textarea{width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:15px;font-family:'Sarabun',sans-serif;color:#1e293b;background:#f8fafc;transition:border-color .2s;-webkit-appearance:none}
    input:focus,select:focus,textarea:focus{outline:none;border-color:#0d6efd;background:#fff;box-shadow:0 0 0 3px rgba(13,110,253,.1)}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .btn-submit{width:100%;padding:16px;background:linear-gradient(135deg,#c9a84c,#e6c96c);color:#04101e;font-size:16px;font-weight:800;border:none;border-radius:12px;cursor:pointer;margin-top:8px;box-shadow:0 4px 16px rgba(201,168,76,.4);transition:all .2s}
    .btn-submit:active{transform:scale(.98)}
    .btn-submit:disabled{opacity:.6;cursor:not-allowed}
    .success-box{display:none;text-align:center;padding:40px 20px}
    .success-icon{font-size:64px;margin-bottom:16px}
    .success-box h3{font-size:20px;font-weight:800;color:#1e293b;margin-bottom:8px}
    .success-box p{font-size:14px;color:#64748b;line-height:1.6}
    .error-msg{display:none;margin-top:10px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;font-size:13px;font-weight:600;padding:10px 14px;border-radius:8px}
    .footer{text-align:center;padding:16px 20px 32px;font-size:12px;color:#94a3b8}
    @media(max-width:400px){.form-row{grid-template-columns:1fr}}
  </style>
</head>
<body>
<div class="header">
  <div class="header-logo">🚢</div>
  <div class="header-text"><h1>PIT Freight</h1><p>INTERNATIONAL FREIGHT SERVICES</p></div>
</div>
<div class="card">
  <div class="card-title">
    <div class="gold-line"></div>
    <div><h2>📋 ขอใบเสนอราคา</h2><p>กรอกข้อมูลด้านล่าง ทีมงานจะติดต่อกลับเร็วๆ นี้</p></div>
  </div>
  <div class="form-body">
    <div class="success-box" id="successBox">
      <div class="success-icon">✅</div>
      <h3>ส่งข้อมูลเรียบร้อย!</h3>
      <p>ทีมงาน PIT Freight ได้รับข้อมูลของคุณแล้ว<br>จะติดต่อกลับภายใน 24 ชั่วโมง</p>
    </div>
    <form id="qf">
      <div class="section-label">ข้อมูลผู้ส่ง</div>
      <div class="form-group"><label>ชื่อ-นามสกุล <span class="req">*</span></label><input type="text" name="name" placeholder="ชื่อของคุณ" required autocomplete="name"></div>
      <div class="form-row">
        <div class="form-group"><label>เบอร์โทร <span class="req">*</span></label><input type="tel" name="phone" placeholder="08x-xxx-xxxx" required></div>
        <div class="form-group"><label>อีเมล</label><input type="email" name="email" placeholder="email@example.com"></div>
      </div>
      <div class="section-label">ข้อมูลการขนส่ง</div>
      <div class="form-row">
        <div class="form-group"><label>ต้นทาง <span class="req">*</span></label><input type="text" name="origin" placeholder="เมือง, ประเทศ" value="กรุงเทพฯ, Thailand" required></div>
        <div class="form-group"><label>ปลายทาง <span class="req">*</span></label><input type="text" name="destination" placeholder="เมือง, ประเทศ" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>น้ำหนัก (kg) <span class="req">*</span></label><input type="number" name="weight" placeholder="0" min="0.1" step="0.1" required inputmode="decimal"></div>
        <div class="form-group"><label>ขนาด (กxยxส cm)</label><input type="text" name="dimensions" placeholder="40x30x20"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ประเภทสินค้า</label><select name="cargoType"><option>สินค้าทั่วไป</option><option>อิเล็กทรอนิกส์</option><option>อาหาร/เกษตร</option><option>เสื้อผ้า/แฟชั่น</option><option>เครื่องจักร/อุตสาหกรรม</option><option>เคมีภัณฑ์</option><option>สินค้ามีมูลค่าสูง</option><option>อื่นๆ</option></select></div>
        <div class="form-group"><label>วิธีขนส่ง</label><select name="shippingMethod"><option value="sea">🚢 ทางเรือ</option><option value="air">✈️ ทางอากาศ</option><option value="express">⚡ Express</option><option value="road">🚛 ทางบก</option></select></div>
      </div>
      <div class="form-group"><label>หมายเหตุ</label><textarea name="notes" rows="3" placeholder="ระบุเงื่อนไขพิเศษ, Incoterms, หรือข้อมูลอื่นๆ..."></textarea></div>
      <div class="error-msg" id="errMsg"></div>
      <button type="submit" class="btn-submit" id="submitBtn">📨 ส่งขอใบเสนอราคา</button>
    </form>
  </div>
</div>
<div class="footer">PIT Freight — International Freight Services<br>โทร 063-446-7735 | phanlerd.03@gmail.com</div>
<script>
document.getElementById('qf').addEventListener('submit',async function(e){
  e.preventDefault();
  const btn=document.getElementById('submitBtn');
  const err=document.getElementById('errMsg');
  err.style.display='none';btn.disabled=true;btn.textContent='⏳ กำลังส่ง...';
  const fd=new FormData(this);
  const msg=[fd.get('origin')&&fd.get('destination')?'ต้นทาง: '+fd.get('origin')+' → ปลายทาง: '+fd.get('destination'):'',fd.get('weight')?'น้ำหนัก: '+fd.get('weight')+' kg':'',fd.get('dimensions')?'ขนาด: '+fd.get('dimensions')+' cm':'',fd.get('cargoType')?'สินค้า: '+fd.get('cargoType'):'',fd.get('shippingMethod')?'วิธีขนส่ง: '+fd.get('shippingMethod'):'',fd.get('notes')?'หมายเหตุ: '+fd.get('notes'):''].filter(Boolean).join('\\n');
  try{
    const res=await fetch('/api/contact/service-inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:'ขอใบเสนอราคา',name:fd.get('name'),phone:fd.get('phone'),email:fd.get('email'),message:msg})});
    if(!res.ok)throw new Error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    document.getElementById('qf').style.display='none';
    document.getElementById('successBox').style.display='block';
  }catch(ex){
    err.textContent='❌ '+ex.message;err.style.display='block';
    btn.disabled=false;btn.textContent='📨 ส่งขอใบเสนอราคา';
  }
});
</script>
</body>
</html>`);
});

// ===== Debug / Test Notifications =====
app.get('/api/debug/test', async (req, res) => {
  const results = {};
  const lineService = require('./services/lineoa');
  const gsService   = require('./services/googlesheet');
  const { Client }  = require('@notionhq/client');

  // Test LINE
  try {
    await lineService.notifyBooking({
      trackingNumber: 'TEST001', senderName: 'Debug Test', senderEmail: 'test@pitfreight.com',
      origin: 'Bangkok', destination: 'Tokyo', shippingMethod: 'sea',
      weight: 10, estimatedCost: 5000,
    });
    results.line = '✅ ส่งสำเร็จ';
  } catch (e) { results.line = '❌ ' + e.message; }

  // Test Google Sheets
  try {
    await gsService.logBooking({
      trackingNumber: 'TEST001', senderName: 'Debug Test', senderEmail: 'test@pitfreight.com',
      senderPhone: '0812345678', origin: 'Bangkok', destination: 'Tokyo',
      cargoType: 'ทั่วไป', weight: 10, shippingMethod: 'sea', estimatedCost: 5000,
    });
    results.gsheets = '✅ บันทึกสำเร็จ';
  } catch (e) { results.gsheets = '❌ ' + e.message; }

  // Test Notion
  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    await notion.databases.retrieve({ database_id: process.env.NOTION_BOOKINGS_DB });
    results.notion = '✅ เชื่อมต่อสำเร็จ';
  } catch (e) { results.notion = '❌ ' + e.message; }

  // Env check
  results.env = {
    line_token:   process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✅ มีค่า' : '❌ ไม่มีค่า',
    sheet_id:     process.env.GOOGLE_SHEET_ID ? '✅ มีค่า' : '❌ ไม่มีค่า',
    gsa_email:    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✅ มีค่า' : '❌ ไม่มีค่า',
    gsa_key:      process.env.GOOGLE_PRIVATE_KEY ? '✅ มีค่า ('+process.env.GOOGLE_PRIVATE_KEY.length+' chars)' : '❌ ไม่มีค่า',
    notion_token: process.env.NOTION_TOKEN ? '✅ มีค่า' : '❌ ไม่มีค่า',
    notion_db:    process.env.NOTION_BOOKINGS_DB ? '✅ มีค่า' : '❌ ไม่มีค่า',
  };

  res.json(results);
});

// ===== /blog/:slug — Open Graph meta tags for Facebook Share =====
app.get('/blog/:slug', async (req, res) => {
  const { slug } = req.params;
  const siteUrl = process.env.SITE_URL || 'https://pitfreight.com';

  try {
    const { Client } = require('@notionhq/client');
    const notion = new Client({ auth: process.env.NOTION_TOKEN });

    const response = await notion.databases.query({
      database_id: process.env.NOTION_BLOG_DB,
      filter: {
        and: [
          { property: 'Published', checkbox: { equals: true } },
          { property: 'Slug', rich_text: { equals: slug } },
        ],
      },
      page_size: 1,
    });

    if (!response.results.length) {
      return res.redirect('/#blog');
    }

    const page = response.results[0];
    const p = page.properties;
    const title = p.Title?.title?.map(t => t.plain_text).join('') || 'PIT Freight Blog';
    const summary = p.Summary?.rich_text?.map(t => t.plain_text).join('') || 'บทความจาก PIT Freight';
    const cover = p['Cover Image']?.url || `${siteUrl}/images/og-default.jpg`;
    const pageUrl = `${siteUrl}/blog/${slug}`;

    const esc = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    res.send(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — PIT Freight</title>

  <!-- Open Graph (Facebook) -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${esc(pageUrl)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(summary)}">
  <meta property="og:image" content="${esc(cover)}">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="420">
  <meta property="og:site_name" content="PIT Freight">
  <meta property="og:locale" content="th_TH">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(summary)}">
  <meta name="twitter:image" content="${esc(cover)}">

  <!-- SEO -->
  <meta name="description" content="${esc(summary)}">

  <!-- Redirect to main app (delay so Facebook scraper can read OG tags) -->
  <script>
    // Only redirect real browsers, not scrapers
    if (!/facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp/i.test(navigator.userAgent)) {
      window.location.replace('/#blog-${slug}');
    }
  </script>
</head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc">
  <div style="text-align:center;padding:40px">
    <img src="/images/logo.png" alt="PIT Freight" style="height:60px;margin-bottom:20px" onerror="this.style.display='none'">
    <h2 style="color:#1e3a5f;margin-bottom:8px">${esc(title)}</h2>
    <p style="color:#64748b;margin-bottom:24px">${esc(summary)}</p>
    <a href="/#blog-${slug}" style="background:#e64d2e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">อ่านบทความ →</a>
  </div>
</body>
</html>`);
  } catch (err) {
    console.error('OG route error:', err.message);
    res.redirect('/#blog');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚢 Freight Webapp running at http://localhost:${PORT}\n`);
  // Init Google Sheets headers on startup
  require('./services/googlesheet').ensureHeaders().catch(() => {});
});
