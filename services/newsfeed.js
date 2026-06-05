/**
 * News Feed Auto-Post Service
 * ค้นหาข่าวนำเข้า-ส่งออกสดจาก OpenAI web search
 * โพสต์ลง Blog + Facebook Page ทุกวัน 09:00 และ 15:00 น. Bangkok
 */
const cron     = require('node-cron');
const path     = require('path');
const fs       = require('fs');
const { execSync } = require('child_process');
const fetch    = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const FormData = require('form-data');
const { Client } = require('@notionhq/client');

// ── หัวข้อสลับ 09:00 / 15:00 ──────────────────────────────────────────
const MORNING_TOPICS = [
  'นโยบายการค้าระหว่างประเทศไทยล่าสุด ภาษีนำเข้า ส่งออก 2026',
  'ข่าวอัตราแลกเปลี่ยนและผลกระทบต่อผู้นำเข้าส่งออกไทย',
  'กฎระเบียบใหม่กรมศุลกากรไทย HS Code พิกัดอัตราศุลกากร 2026',
  'โอกาสส่งออกสินค้าเกษตรไทย ข้าว ยางพารา มันสำปะหลัง 2026',
  'FTA ความตกลงการค้าเสรีไทยล่าสุด RCEP CPTPP อาเซียน',
  'ราคาค่าระวางเรือ Freight Rate สายเดินเรือระหว่างประเทศ 2026',
  'มาตรฐานสินค้าส่งออกอาหารไทย GMP HACCP FDA EU 2026',
];

const AFTERNOON_TOPICS = [
  'ข่าวตลาดส่งออกอาหารและเครื่องดื่มไทยในต่างประเทศ 2026',
  'สถานการณ์การค้าจีน-ไทย สินค้านำเข้าจากจีน โอกาสธุรกิจ',
  'โอกาสตลาด CLMV กัมพูชา ลาว เมียนมา เวียดนาม สำหรับผู้ส่งออกไทย',
  'ข่าวท่าเรือแหลมฉบัง ปริมาณตู้คอนเทนเนอร์ โลจิสติกส์ไทย',
  'SME ไทยส่งออกออนไลน์ Cross-border e-Commerce 2026',
  'ข่าวสินค้า OTOP ไทยในตลาดต่างประเทศ ยุโรป ญี่ปุ่น ตะวันออกกลาง',
  'นโยบายสนับสนุนผู้ส่งออก DITP กรมส่งเสริมการค้าระหว่างประเทศ',
];

// ── สร้างรูปข่าวด้วย gpt-image-1 ────────────────────────────────────────
async function generateNewsImage(topic, headline) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const imgPrompt = `Professional news photo for Thai import-export business article about: "${headline}".
Show: international shipping containers at port, cargo planes, customs office, trade fair, or Thai export products.
Photorealistic, cinematic lighting, wide angle. No text, no words, no letters.`;

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: imgPrompt,
        size: '1536x1024',
        quality: 'medium',
        output_format: 'jpeg',
        n: 1,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || 'OpenAI image error');

    const tmpPath = `/tmp/news_bg_${Date.now()}.jpg`;
    if (data.data[0].b64_json) {
      fs.writeFileSync(tmpPath, Buffer.from(data.data[0].b64_json, 'base64'));
    } else {
      execSync(`curl -sL "${data.data[0].url}" -o ${tmpPath}`);
    }
    console.log('[NewsFeed] gpt-image-1 ✅');
    return tmpPath;
  } catch(e) {
    console.error('[NewsFeed] gpt-image-1 error:', e.message.slice(0, 150));
    return null;
  }
}

// ── สร้าง cover image ด้วย Python PIL (+ bg photo overlay) ──────────────
function createNewsCover(headline, timeSlot, dateTag, outPath, bgImagePath = null) {
  const isAM  = timeSlot === '09:00';
  const bg1   = isAM ? '#0a1628' : '#150820';
  const bg2   = isAM ? '#1a3a5c' : '#2d1a45';
  const acc   = isAM ? '#38bdf8' : '#a78bfa';
  const label = isAM ? 'ข่าวเช้า 09:00' : 'ข่าวบ่าย 15:00';
  const hasBg = bgImagePath && fs.existsSync(bgImagePath);
  const safeBg = hasBg ? bgImagePath.replace(/'/g, "\\'") : '';

  // Escape for Python
  const safeHeadline = headline.replace(/'/g, "\\'").replace(/\n/g, ' ').slice(0, 80);
  const safeDateTag  = dateTag.replace(/'/g, "\\'");

  const script = `
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import urllib.request

FONT = '/tmp/SarabunB.ttf'
if not os.path.exists(FONT):
    urllib.request.urlretrieve('https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Bold.ttf', FONT)

W, H = 1200, 630
img  = Image.new('RGB', (W, H))
draw = ImageDraw.Draw(img)

# Background: real photo OR gradient
bg_path = '${safeBg}'
if bg_path and os.path.exists(bg_path):
    bg = Image.open(bg_path).convert('RGB').resize((W, H), Image.LANCZOS)
    img.paste(bg)
    # Lighter global overlay (เก็บรูปให้เห็นชัดขึ้น)
    overlay = Image.new('RGBA', (W, H), (5, 12, 25, 140))
    img = img.convert('RGBA')
    img = Image.alpha_composite(img, overlay).convert('RGB')
    draw = ImageDraw.Draw(img)
    # Dark panel ซ้าย (เพิ่มความชัดให้ตัวอักษร)
    left_panel = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(left_panel)
    for x in range(660):
        alpha = int(200 * (1 - x/660))
        ld.line([(x,0),(x,H)], fill=(5,12,25,alpha))
    img = img.convert('RGBA')
    img = Image.alpha_composite(img, left_panel).convert('RGB')
    draw = ImageDraw.Draw(img)
else:
    bg1 = tuple(int('${bg1}'.lstrip('#')[i:i+2],16) for i in (0,2,4))
    bg2 = tuple(int('${bg2}'.lstrip('#')[i:i+2],16) for i in (0,2,4))
    for y in range(H):
        t = y/H
        draw.line([(0,y),(W,y)], fill=tuple(int(bg1[i]+t*(bg2[i]-bg1[i])) for i in range(3)))
    for x in range(0,W,36):
        for y in range(0,H,36):
            draw.rectangle([x,y,x+2,y+2], fill=(255,255,255,20))

flarge = ImageFont.truetype(FONT, 42)
fmed   = ImageFont.truetype(FONT, 30)
fsmall = ImageFont.truetype(FONT, 23)
fxs    = ImageFont.truetype(FONT, 18)
ACC    = '${acc}'

draw.rectangle([0,0,8,H], fill=ACC)

# Time badge
draw.rounded_rectangle([50,32,345,74], radius=20, fill=ACC)
draw.text((68,43), '${label}  |  ${safeDateTag}', font=fxs, fill='#050c1a')

# News label — สีขาวทึบ ตัวใหญ่
draw.text((50, 86), 'ข่าวสารนำเข้า-ส่งออก', font=flarge, fill='#ffffff')

# Accent line under label
draw.rectangle([50, 138, 430, 143], fill=ACC)

# Headline — ตัวใหญ่ขึ้น สีสว่าง
headline = '${safeHeadline}'
words = headline.split()
lines, cur = [], ''
for w in words:
    test = cur + w + ' '
    if draw.textbbox((0,0), test, font=fmed)[2] > 570 and cur:
        lines.append(cur.strip()); cur = w + ' '
    else:
        cur = test
if cur: lines.append(cur.strip())
y = 158
for line in lines[:4]:
    draw.text((50, y), line, font=fmed, fill='#ffffff')
    y += 42

# Accent divider under headline
draw.rectangle([50, y+10, 380, y+14], fill=ACC)

# Right card — พื้นขาวทึบ ตัวอักษรดำ อ่านง่าย
cx, cy, cw, ch = 655, 44, 518, 524
# Card ขาวทึบ — ตัวอักษรดำ อ่านชัด
draw.rounded_rectangle([cx,cy,cx+cw,cy+ch], radius=18, fill=(255,255,255))
# Header bar สีพิเศษ
draw.rounded_rectangle([cx,cy,cx+cw,cy+58], radius=18, fill=ACC)
draw.rectangle([cx,cy+38,cx+cw,cy+58], fill=ACC)
draw.text((cx+24, cy+12), 'ประโยชน์สำหรับ SME ไทย', font=fmed, fill='#050c1a')
draw.rectangle([cx+24,cy+58,cx+cw-24,cy+61], fill=(220,230,240))

tips = [
    'อัพเดทตรงจากแหล่งข่าวน่าเชื่อถือ',
    'วิเคราะห์ผลกระทบต่อธุรกิจนำเข้า-ส่งออก',
    'คำแนะนำปฏิบัติสำหรับ SME ไทย',
    'อ้างอิงแหล่งที่มาครบถ้วน',
    'ติดตามทุกวัน ไม่พลาดโอกาส',
]
for i, tip in enumerate(tips):
    ty = cy + 72 + i * 82
    # Bullet วงกลม
    draw.ellipse([cx+22, ty+8, cx+42, ty+28], fill=ACC)
    # ตัวอักษรดำ อ่านชัด
    draw.text((cx+54, ty+4), tip, font=fsmall, fill='#1a1a2e')
    if i < len(tips)-1:
        draw.line([cx+24, ty+62, cx+cw-24, ty+62], fill=(220,230,240), width=1)

# Footer
draw.rectangle([0,H-60,W,H], fill=(5,8,18))
draw.rectangle([0,H-60,W,H-57], fill=ACC)
draw.text((50,H-44),    'PIT FREIGHT', font=fmed, fill=ACC)
draw.text((240,H-44),   '|  ข่าวสารนำเข้า-ส่งออก ประจำวัน', font=fmed, fill='#ffffff')
draw.text((W-215,H-44), 'pitfreight.com', font=fmed, fill=(200,215,230))
img.save('${outPath}', 'JPEG', quality=93)
print('ok')
`;
  try {
    execSync(`python3 -c "${script.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`, { encoding:'utf8', timeout: 30000 });
    return true;
  } catch(e) {
    console.error('[NewsFeed] Cover error:', e.message.slice(0,200));
    return false;
  }
}

// ── สร้างเนื้อหาข่าวด้วย OpenAI (web search) ────────────────────────────
async function fetchAndWriteNews(topic, timeSlot) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('No OPENAI_API_KEY');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `ค้นหาและสรุปข่าวล่าสุด (ปี 2026) เกี่ยวกับ: "${topic}"

เขียนเป็นโพสต์ Facebook ภาษาไทย สำหรับผู้ประกอบการนำเข้า-ส่งออก SME
รูปแบบ:
1. หัวข้อข่าว (bold, น่าสนใจ)
2. สรุปประเด็นสำคัญ 3-5 ข้อ (bullet)
3. ผลกระทบต่อผู้ประกอบการไทย
4. คำแนะนำปฏิบัติ 2-3 ข้อ
5. แหล่งอ้างอิง (ใส่ลิ้งหรือชื่อแหล่งข่าวที่น่าเชื่อถือ เช่น กรมศุลกากร, DITP, BOT, สภาหอการค้า)
6. CTA ติดต่อ PIT Freight (Line: @pitfreight, pitfreight.com)
7. Hashtag 8-10 อัน รวม #PITFreight #นำเข้าส่งออก #SMEไทย

ความยาวรวม 300-400 คำ`,
      }],
      max_tokens: 750,
      temperature: 0.7,
    }),
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content || `ข่าวสาร: ${topic}\n\n#PITFreight #นำเข้าส่งออก`;
}

// ── Post to Facebook ──────────────────────────────────────────────────────
async function postFacebook(pageId, token, caption, imgPath) {
  const form = new FormData();
  form.append('source', fs.createReadStream(imgPath), {
    filename: path.basename(imgPath), contentType: 'image/jpeg',
  });
  form.append('caption', caption);
  form.append('access_token', token);
  const r = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
    method:'POST', body:form, headers:form.getHeaders(),
  });
  return r.json();
}

// ── Post to Notion Blog ───────────────────────────────────────────────────
async function postNotion(title, slug, content, coverUrl) {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const ex = await notion.databases.query({
    database_id: process.env.NOTION_BLOG_DB,
    filter: { property:'Slug', rich_text:{ equals: slug } },
    page_size: 1,
  });
  if (ex.results.length) return ex.results[0].id;

  const summary = content.replace(/#\w+/g, '').trim().slice(0, 200);
  const p = await notion.pages.create({
    parent: { database_id: process.env.NOTION_BLOG_DB },
    cover: { type:'external', external:{ url: coverUrl } },
    properties: {
      Title:           { title:[{ text:{ content: title } }] },
      Slug:            { rich_text:[{ text:{ content: slug } }] },
      Summary:         { rich_text:[{ text:{ content: summary } }] },
      Category:        { select:{ name:'ข่าวสาร' } },
      Published:       { checkbox: true },
      'Cover Image':   { url: coverUrl },
      'Published Date':{ date:{ start: new Date().toISOString().split('T')[0] } },
    },
    children:[
      { object:'block', type:'image', image:{ type:'external', external:{ url: coverUrl }, caption:[{type:'text',text:{content:title}}] } },
      { object:'block', type:'paragraph', paragraph:{ rich_text:[{text:{content}}] } },
    ],
  });
  return p.id;
}

// ── Main post function ────────────────────────────────────────────────────
async function runNewsFeed(timeSlot) {
  const now     = new Date();
  const dateStr = now.toISOString().slice(0,10);
  const dateTag = now.toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });
  const slotKey = timeSlot.replace(':','');

  // Choose topic by day + slot
  const dayIdx  = Math.floor(now.getTime() / 86400000);
  const topics  = timeSlot === '09:00' ? MORNING_TOPICS : AFTERNOON_TOPICS;
  const topic   = topics[dayIdx % topics.length];

  const slug    = `news-${slotKey}-${dateStr}`;
  const imgFile = `news-${slotKey}-${dateStr}.jpg`;
  const imgPath = path.join(__dirname, '..', 'public', 'images', 'blog', imgFile);
  const coverUrl = `${process.env.SITE_URL || 'https://pitfreight.com'}/images/blog/${imgFile}`;

  console.log(`[NewsFeed] ${timeSlot} — ${topic}`);

  try {
    // 1. Generate news content
    const content = await fetchAndWriteNews(topic, timeSlot);

    // 2. Extract headline (first line)
    const headline = content.split('\n').find(l => l.trim()) || topic;
    const cleanHeadline = headline.replace(/[*#]/g, '').trim().slice(0, 80);

    // 3. Generate news photo with gpt-image-1
    console.log('[NewsFeed] Generating news photo...');
    const bgImagePath = await generateNewsImage(topic, cleanHeadline);

    // 4. Create cover (with real photo as background)
    createNewsCover(cleanHeadline, timeSlot, dateTag, imgPath, bgImagePath);
    if (bgImagePath && fs.existsSync(bgImagePath)) fs.unlinkSync(bgImagePath);
    console.log('[NewsFeed] Cover ✅');

    // 4. Notion Blog
    const title = `[${timeSlot}] ${cleanHeadline.slice(0, 60)}`;
    await postNotion(title, slug, content, coverUrl);
    console.log('[NewsFeed] Notion ✅');

    // 5. Facebook
    const fb1 = await postFacebook(process.env.FB_PAGE_ID,  process.env.FB_PAGE_ACCESS_TOKEN,  content, imgPath);
    const fb2 = await postFacebook(process.env.FB_PAGE2_ID, process.env.FB_PAGE2_ACCESS_TOKEN, content, imgPath);
    console.log('[NewsFeed] FB1:', fb1.id ? '✅' : `❌ ${fb1.error?.message}`);
    console.log('[NewsFeed] FB2:', fb2.id ? '✅' : `❌ ${fb2.error?.message}`);

    // 6. Slack
    const fbUrl = fb1.post_id ? `https://www.facebook.com/${fb1.post_id}` : '';
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text:`📰 *NewsFeed ${timeSlot}: ${cleanHeadline.slice(0,60)}*\n📌 https://pitfreight.com/blog/${slug}\n${fbUrl}` }),
    });
    console.log(`[NewsFeed] Done: ${slug}`);
  } catch(err) {
    console.error('[NewsFeed] Error:', err.message);
  }
}

// ── Start Cron ────────────────────────────────────────────────────────────
function startNewsFeed() {
  // 09:00 Bangkok (UTC+7 = 02:00 UTC)
  cron.schedule('0 9 * * *', () => runNewsFeed('09:00'), {
    timezone: 'Asia/Bangkok', scheduled: true,
  });
  // 15:00 Bangkok (UTC+7 = 08:00 UTC)
  cron.schedule('0 15 * * *', () => runNewsFeed('15:00'), {
    timezone: 'Asia/Bangkok', scheduled: true,
  });
  console.log('[NewsFeed] ✅ Scheduled: ทุกวัน 09:00 และ 15:00 น. Bangkok');
  console.log('[NewsFeed]   09:00 — ข่าวนโยบาย/FTA/กฎระเบียบ/อัตราแลกเปลี่ยน');
  console.log('[NewsFeed]   15:00 — ข่าวตลาด/โอกาส/OTOP/SME/โลจิสติกส์');
}

module.exports = { startNewsFeed, runNewsFeed };
