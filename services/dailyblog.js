/**
 * Daily Blog Auto-Post Service
 * โพสต์บทความโอกาสนำเข้า-ส่งออกสินค้าไทย ทุกวัน 08:00 น. Bangkok
 * Cover image: Python PIL  |  Content: OpenAI gpt-4o-mini
 */
const cron     = require('node-cron');
const path     = require('path');
const fs       = require('fs');
const { execSync } = require('child_process');
const fetch    = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const FormData = require('form-data');
const { Client } = require('@notionhq/client');

// ── 12 หัวข้อหมุนเวียน ────────────────────────────────────────────────────
const TOPICS = [
  { key:'fta',       title_th:'FTA ความตกลงการค้าเสรีไทย — เปิดตลาดโลกให้ SME ไทย',                    keywords:'FTA,AFTA,RCEP,Form A,ยกเว้นภาษี',         category:'คู่มือ',    accent:'#00C896', bg1:'#062820', bg2:'#0f3d30' },
  { key:'hscode',    title_th:'HS Code คืออะไร? วิธีค้นหาพิกัดสินค้านำเข้า-ส่งออก',                   keywords:'HS Code,พิกัดศุลกากร,Tariff,กรมศุลกากร',  category:'คู่มือ',    accent:'#3B82F6', bg1:'#061828', bg2:'#0d2b45' },
  { key:'lc',        title_th:'Letter of Credit (L/C) — ค้ำประกันการชำระเงินระหว่างประเทศ',           keywords:'LC,SWIFT,เลตเตอร์ออฟเครดิต,ธนาคาร',       category:'คู่มือ',    accent:'#F59E0B', bg1:'#1a1205', bg2:'#2d1f08' },
  { key:'packaging', title_th:'Packaging มาตรฐานส่งออก — ข้อกำหนดที่ผู้ส่งออกต้องรู้',               keywords:'บรรจุภัณฑ์,ISPM15,GS1,ฉลากส่งออก',        category:'คู่มือ',    accent:'#EC4899', bg1:'#1a0515', bg2:'#2d0a22' },
  { key:'customs',   title_th:'พิธีการศุลกากรนำเข้า-ส่งออก ครบทุกขั้นตอน',                           keywords:'ศุลกากร,ใบขนสินค้า,E-Customs,NSW',          category:'คู่มือ',    accent:'#8B5CF6', bg1:'#0f0820', bg2:'#1a1035' },
  { key:'asean',     title_th:'เจาะตลาด ASEAN — โอกาสส่งออกสินค้าไทยสู่ AEC',                        keywords:'ASEAN,AEC,AFTA,เวียดนาม,อินโดนีเซีย',      category:'ข่าวสาร',  accent:'#10B981', bg1:'#052018', bg2:'#0d3525' },
  { key:'china',     title_th:'นำเข้าสินค้าจากจีน — ขั้นตอน เอกสาร และต้นทุนที่ต้องรู้',             keywords:'นำเข้าจีน,Alibaba,GACC,CIQ,FOB Shanghai',  category:'คู่มือ',    accent:'#EF4444', bg1:'#1a0505', bg2:'#2d0a0a' },
  { key:'japan',     title_th:'ส่งออกสินค้าไทยไปญี่ปุ่น — มาตรฐาน JAS และข้อกำหนดนำเข้า',           keywords:'ส่งออกญี่ปุ่น,JAS,JETRO,Quarantine Japan', category:'คู่มือ',    accent:'#F97316', bg1:'#1a0a05', bg2:'#2d1508' },
  { key:'halal',     title_th:'Halal Certification — เปิดตลาดมุสลิม 2 พันล้านคนทั่วโลก',              keywords:'Halal,CICOT,Middle East,OIC,ฮาลาล',        category:'คู่มือ',    accent:'#34D399', bg1:'#051a10', bg2:'#0d2d1a' },
  { key:'seafreight',title_th:'ขนส่งทางเรือ FCL vs LCL — เลือกแบบไหนประหยัดกว่า?',                  keywords:'FCL,LCL,Bill of Lading,ค่าระวางเรือ,CFS',  category:'คู่มือ',    accent:'#0EA5E9', bg1:'#050f1a', bg2:'#0a1e35' },
  { key:'food',      title_th:'มาตรฐานอาหารส่งออก FDA/EU — สินค้าไทยต้องทำอะไรบ้าง',                keywords:'FDA,GMP,HACCP,EU Food Safety,อย.',          category:'คู่มือ',    accent:'#A78BFA', bg1:'#100520', bg2:'#1a0d35' },
  { key:'incoterms', title_th:'Incoterms 2020 ฉบับเข้าใจง่าย — เลือก Term ไหนดีที่สุด',             keywords:'Incoterms 2020,EXW,FOB,CIF,DDP,DAP',       category:'Incoterms', accent:'#F5A623', bg1:'#1a1205', bg2:'#2d1f08' },
];

// ── สร้างรูป Cover ด้วย Python PIL ───────────────────────────────────────
function createCoverPython(topic, dateTag, outPath) {
  const script = `
import sys
sys.stdout.reconfigure(encoding='utf-8')
from PIL import Image, ImageDraw, ImageFont
import os, urllib.request

FONT = '/tmp/SarabunB.ttf'
if not os.path.exists(FONT):
    urllib.request.urlretrieve('https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Bold.ttf', FONT)

W, H = 1200, 630
img = Image.new('RGB', (W, H))
draw = ImageDraw.Draw(img)

bg1 = tuple(int('${topic.bg1}'.lstrip('#')[i:i+2],16) for i in (0,2,4))
bg2 = tuple(int('${topic.bg2}'.lstrip('#')[i:i+2],16) for i in (0,2,4))
for y in range(H):
    t = y/H
    c = tuple(int(bg1[i]+t*(bg2[i]-bg1[i])) for i in range(3))
    draw.line([(0,y),(W,y)], fill=c)

for x in range(0, W, 36):
    for y in range(0, H, 36):
        draw.rectangle([x,y,x+2,y+2], fill=(255,255,255,25))

fhuge  = ImageFont.truetype(FONT, 78)
flarge = ImageFont.truetype(FONT, 38)
fmed   = ImageFont.truetype(FONT, 26)
fsmall = ImageFont.truetype(FONT, 21)
fxs    = ImageFont.truetype(FONT, 17)
ACC = '${topic.accent}'

draw.rectangle([0,0,7,H], fill=ACC)

badge_text = 'PIT FREIGHT  •  โอกาสนำเข้า-ส่งออก'
draw.rounded_rectangle([50,34,50+340,34+38], radius=19, fill=ACC)
draw.text((66,42), badge_text, font=fxs, fill='#0a1628')

title = '${topic.title_th.replace(/'/g, "\\'")}'
words = title.split()
lines, cur = [], ''
for w in words:
    test = cur+w+' '
    bbox = draw.textbbox((0,0), test, font=fmed)
    if bbox[2] > 600 and cur:
        lines.append(cur.strip()); cur = w+' '
    else:
        cur = test
if cur: lines.append(cur.strip())

y = 88
for line in lines[:4]:
    draw.text((50, y), line, font=fmed, fill='#ffffff')
    y += 38

draw.rectangle([50, y+8, 380, y+12], fill=ACC)
y += 28

kws = '${topic.keywords}'.split(',')[:4]
x = 50
for k in kws:
    bbox = draw.textbbox((0,0), k, font=fxs)
    pw = bbox[2]+28
    if x + pw > 630: x, y = 50, y+48
    draw.rounded_rectangle([x,y,x+pw,y+36], radius=18, fill=(255,255,255,20))
    draw.text((x+14,y+9), k, font=fxs, fill='rgba(220,240,235,1)')
    x += pw+10

cx, cy, cw, ch = 660, 50, 510, 512
draw.rounded_rectangle([cx,cy,cx+cw,cy+ch], radius=16, fill=(255,255,255,15))
draw.rounded_rectangle([cx,cy,cx+cw,cy+ch], radius=16, outline=ACC, width=2)
draw.text((cx+24, cy+22), 'ทำไมต้องรู้เรื่องนี้?', font=fmed, fill=ACC)
draw.rectangle([cx+24,cy+60,cx+cw-24,cy+63], fill=ACC)

tips = [
    'ลดต้นทุนและความเสี่ยงในการค้าระหว่างประเทศ',
    'เพิ่มโอกาสเข้าถึงตลาดใหม่ทั่วโลก',
    'ปฏิบัติตามกฎระเบียบศุลกากรอย่างถูกต้อง',
    'เจรจาต่อรองกับ Supplier/Buyer อย่างมีประสิทธิภาพ',
    'วางแผนต้นทุนโลจิสติกส์ได้แม่นยำขึ้น',
    'ลดปัญหาสินค้าถูก Hold ที่ด่านศุลกากร',
]
for i, tip in enumerate(tips):
    ty = cy+75 + i*70
    draw.ellipse([cx+22,ty+8,cx+38,ty+24], fill=ACC)
    draw.text((cx+50, ty+4), tip, font=fsmall, fill=(220,242,232))
    if i < len(tips)-1:
        draw.line([cx+24,ty+54,cx+cw-24,ty+54], fill=(255,255,255,20), width=1)

draw.rounded_rectangle([cx+24,cy+ch-48,cx+300,cy+ch-18], radius=8, fill=(255,255,255,18))
draw.text((cx+38,cy+ch-40), '${dateTag}  |  pitfreight.com', font=fxs, fill=ACC)

draw.rectangle([0,H-60,W,H], fill=(4,12,8))
draw.rectangle([0,H-60,W,H-57], fill=ACC)
draw.text((50,H-44),    'PIT FREIGHT', font=fmed, fill=ACC)
draw.text((240,H-44),   '|  บริการขนส่งสินค้าระหว่างประเทศ', font=fmed, fill=(155,200,170))
draw.text((W-215,H-44), 'pitfreight.com', font=fmed, fill=(120,165,140))

img.save('${outPath}', 'JPEG', quality=93)
print('ok')
`;
  execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, { encoding: 'utf8' });
}

// ── Generate content with OpenAI ─────────────────────────────────────────
async function generateContent(topic) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return `${topic.title_th}\n\n#PITFreight #นำเข้าส่งออก`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `เขียนโพสต์ Facebook ภาษาไทย เรื่อง "${topic.title_th}" สำหรับผู้ประกอบการ SME นำเข้า-ส่งออก
ความยาว 250-350 คำ ให้ความรู้จริง มี checklist หรือขั้นตอน จบด้วย CTA ให้ติดต่อ PIT Freight (Line: @pitfreight, pitfreight.com)
Keywords: ${topic.keywords}
ใส่ hashtag ท้าย 8-10 อัน รวม #PITFreight #นำเข้าส่งออก`,
      }],
      max_tokens: 700, temperature: 0.72,
    }),
  });
  const d = await res.json();
  return d.choices?.[0]?.message?.content || `${topic.title_th}\n\n#PITFreight #นำเข้าส่งออก`;
}

// ── Post to Facebook ──────────────────────────────────────────────────────
async function postFacebook(pageId, token, caption, imgPath) {
  const form = new FormData();
  form.append('source', fs.createReadStream(imgPath), { filename: path.basename(imgPath), contentType: 'image/jpeg' });
  form.append('caption', caption);
  form.append('access_token', token);
  const r = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
    method: 'POST', body: form, headers: form.getHeaders(),
  });
  return r.json();
}

// ── Post to Notion Blog ───────────────────────────────────────────────────
async function postNotion(topic, slug, content, coverUrl) {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const ex = await notion.databases.query({
    database_id: process.env.NOTION_BLOG_DB,
    filter: { property:'Slug', rich_text:{ equals: slug } },
    page_size: 1,
  });
  if (ex.results.length) return ex.results[0].id;
  const p = await notion.pages.create({
    parent: { database_id: process.env.NOTION_BLOG_DB },
    cover: { type:'external', external:{ url: coverUrl } },
    properties: {
      Title:           { title:[{ text:{ content: topic.title_th } }] },
      Slug:            { rich_text:[{ text:{ content: slug } }] },
      Summary:         { rich_text:[{ text:{ content: content.slice(0,200) } }] },
      Category:        { select:{ name: topic.category } },
      Published:       { checkbox: true },
      'Cover Image':   { url: coverUrl },
      'Published Date':{ date:{ start: new Date().toISOString().split('T')[0] } },
    },
    children:[{ object:'block', type:'paragraph', paragraph:{ rich_text:[{text:{content}}] } }],
  });
  return p.id;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function runDailyBlog() {
  const now      = new Date();
  const dayIdx   = Math.floor(now.getTime() / 86400000) % TOPICS.length;
  const topic    = TOPICS[dayIdx];
  const dateStr  = now.toISOString().slice(0,10);
  const dateTag  = now.toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });
  const slug     = `${topic.key}-daily-${dateStr}`;
  const imgFile  = `daily-${topic.key}-${dateStr}.jpg`;
  const imgPath  = path.join(__dirname, '..', 'public', 'images', 'blog', imgFile);
  const coverUrl = `${process.env.SITE_URL || 'https://pitfreight.com'}/images/blog/${imgFile}`;

  console.log(`[DailyBlog] ${dateStr} — ${topic.title_th}`);

  try {
    // 1. Cover image
    createCoverPython(topic, dateTag, imgPath);
    console.log('[DailyBlog] Cover ✅');

    // 2. Content
    const content = await generateContent(topic);
    console.log('[DailyBlog] Content ✅');

    // 3. Notion
    await postNotion(topic, slug, content, coverUrl);
    console.log('[DailyBlog] Notion ✅');

    // 4. Facebook
    const fb1 = await postFacebook(process.env.FB_PAGE_ID,  process.env.FB_PAGE_ACCESS_TOKEN,  content, imgPath);
    const fb2 = await postFacebook(process.env.FB_PAGE2_ID, process.env.FB_PAGE2_ACCESS_TOKEN, content, imgPath);
    console.log('[DailyBlog] FB1:', fb1.id ? '✅' : `❌ ${fb1.error?.message}`);
    console.log('[DailyBlog] FB2:', fb2.id ? '✅' : `❌ ${fb2.error?.message}`);

    // 5. Slack
    const fbUrl = fb1.post_id ? `https://www.facebook.com/${fb1.post_id}` : '';
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text:`📰 *DailyBlog: ${topic.title_th}*\n📌 https://pitfreight.com/blog/${slug}\n${fbUrl}` }),
    });
    console.log('[DailyBlog] Slack ✅ — Done!');
  } catch (err) {
    console.error('[DailyBlog] Error:', err.message);
  }
}

// ── Start scheduler ───────────────────────────────────────────────────────
function startDailyBlog() {
  // ทุกวัน 08:00 น. Bangkok (UTC+7)
  cron.schedule('0 8 * * *', runDailyBlog, {
    timezone: 'Asia/Bangkok',
    scheduled: true,
  });
  console.log('[DailyBlog] ✅ Scheduled: ทุกวัน 08:00 น. Bangkok | 12 หัวข้อหมุนเวียน');
}

module.exports = { startDailyBlog, runDailyBlog };
