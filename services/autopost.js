/**
 * ===== PIT Freight — Auto Post Service =====
 * รันอัตโนมัติ 08:00 และ 15:00 ทุกวัน
 * DALL-E 3 (พื้นหลัง) + PIL (วางข้อความ) → Facebook Page 2 + Notion Blog
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

// ===== ขั้นตอนที่ 1: Claude สร้าง content + DALL-E prompt =====
async function generateContent(term) {
  const prompt = `คุณคือผู้ชำนาญการด้านการค้าระหว่างประเทศและพิธีการศุลกากร มีประสบการณ์จริงในการส่งออก-นำเข้าสินค้าไทย

สร้าง 3 อย่างสำหรับ Incoterm: ${term}

=== ส่วนที่ 1: FACEBOOK_CAPTION ===
เขียน caption ภาษาไทย+อังกฤษ สำหรับ Facebook Page "Booking Freight Shipper & Consignee" ในฐานะผู้ชำนาญการ
โครงสร้าง caption (เรียงตามลำดับนี้):
1) หัวข้อดึงดูด + ชื่อ Incoterm ${term} และความหมายแบบเข้าใจง่าย
2) ตัวอย่างสินค้าไทย 1 ชนิดที่เหมาะกับ ${term} พร้อมระบุ:
   - HS Code ที่ถูกต้อง (6 หลัก) พร้อมคำอธิบาย
   - ประเทศปลายทางที่เหมาะสม
3) ขั้นตอนการส่งออกตั้งแต่ต้นจนจบ (5-7 ขั้นตอน) อย่างละเอียด
4) ใบอนุญาตและเอกสารควบคุมการส่งออก-นำเข้าที่เกี่ยวข้อง
5) หน่วยงานที่เกี่ยวข้องพร้อมลิงก์ติดต่อจริง เช่น:
   - กรมการค้าต่างประเทศ: https://www.dft.go.th
   - กรมศุลกากร: https://www.customs.go.th
   - กรมวิชาการเกษตร: https://www.doa.go.th (ถ้าเกี่ยวข้อง)
   - สำนักงาน อย.: https://www.fda.moph.go.th (ถ้าเกี่ยวข้อง)
6) Pro Tips จากผู้ชำนาญการ (2-3 ข้อ) ที่คนส่วนใหญ่มักพลาด
7) hashtag ท้าย (ภาษาไทย+อังกฤษ 8-12 อัน)
8) ลงท้ายด้วย: 📞 +66 63-446-7735 | 💬 LINE: lin.ee/6aC3Z5O | 🌐 pitfreight.com

กฎการเขียน:
- ห้ามใช้ดอกจัน (*) หรือ markdown formatting ใดๆ ทั้งสิ้น
- ใช้ emoji และ plain text เท่านั้น
- ความยาวรวม ~600-700 คำ

=== ส่วนที่ 2: DALLE_PROMPT ===
เขียน prompt ภาษาอังกฤษสำหรับ DALL-E 3 เพื่อสร้างภาพพื้นหลัง infographic 1:1
กฎ:
- ห้ามมีข้อความหรือตัวอักษรใดๆ ในภาพ (NO TEXT, NO WORDS, NO LETTERS)
- เป็น abstract/conceptual background เท่านั้น
- สีและธีมสอดคล้องกับ ${term} และสินค้าที่เลือก
- dark theme สีทันสมัย มี gradient สวยงาม
- เน้นความรู้สึก: logistics, international trade, shipping, Thailand export
- ตัวอย่าง element: container ships, cargo, world map, trade routes, Thai elements
- ต้องดูเป็น professional infographic background

=== ส่วนที่ 3: BLOG_DATA ===
สร้าง JSON สำหรับบทความ Blog ต้องเป็น valid JSON เท่านั้น ห้ามมี comment:
{
  "title": "ชื่อบทความภาษาไทย",
  "slug": "incoterm-${term.toLowerCase()}-[product-english-kebab-case]-export-guide",
  "summary": "สรุปบทความ 2-3 ประโยค ภาษาไทย",
  "product": "ชื่อสินค้าไทย",
  "hsCode": "XXXXXX",
  "hsDescription": "คำอธิบาย HS Code",
  "destination": "ประเทศปลายทาง",
  "steps": ["ขั้นตอนที่ 1", "ขั้นตอนที่ 2", "ขั้นตอนที่ 3", "ขั้นตอนที่ 4", "ขั้นตอนที่ 5"],
  "agencies": ["หน่วยงาน 1 — URL", "หน่วยงาน 2 — URL"],
  "proTips": ["Pro Tip 1", "Pro Tip 2"],
  "tags": ["${term}", "Incoterms", "ส่งออก", "freight", "logistics"]
}

format ตอบกลับ:
CAPTION_START
[caption ทั้งหมด]
CAPTION_END
DALLE_PROMPT_START
[DALL-E prompt]
DALLE_PROMPT_END
BLOG_DATA_START
[JSON object]
BLOG_DATA_END`;

  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].text;

  const captionMatch     = text.match(/CAPTION_START\n([\s\S]*?)\nCAPTION_END/);
  const dallePromptMatch = text.match(/DALLE_PROMPT_START\n([\s\S]*?)\nDALLE_PROMPT_END/);
  const blogDataMatch    = text.match(/BLOG_DATA_START\n([\s\S]*?)\nBLOG_DATA_END/);

  const rawCaption   = captionMatch ? captionMatch[1].trim() : '';
  const cleanCaption = rawCaption.replace(/\*+/g, '');

  let blogData = null;
  if (blogDataMatch) {
    try {
      blogData = JSON.parse(blogDataMatch[1].trim());
    } catch (e) {
      console.error('[AutoPost] ไม่สามารถ parse BLOG_DATA JSON:', e.message);
    }
  }

  return {
    caption:     cleanCaption,
    dallePrompt: dallePromptMatch ? dallePromptMatch[1].trim() : '',
    blogData,
  };
}

// ===== ขั้นตอนที่ 2: DALL-E 3 สร้างพื้นหลัง =====
async function generateDalleBackground(dallePrompt) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:           'gpt-image-1',
      prompt:          dallePrompt + ' No text, no words, no letters, no numbers anywhere in the image.',
      size:            '1024x1024',
      quality:         'medium',
      output_format:   'jpeg',
      n:               1,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'OpenAI Image API error');

  const bgPath = '/tmp/dalle_bg.jpg';

  // gpt-image-1 ส่งกลับเป็น base64
  if (data.data[0].b64_json) {
    const b64 = data.data[0].b64_json;
    fs.writeFileSync(bgPath, Buffer.from(b64, 'base64'));
  } else if (data.data[0].url) {
    execSync(`curl -sL "${data.data[0].url}" -o ${bgPath}`);
  } else {
    throw new Error('ไม่พบ image data จาก OpenAI');
  }

  if (!fs.existsSync(bgPath)) throw new Error('ไม่สามารถ save ภาพ OpenAI ได้');

  return bgPath;
}

// ===== ขั้นตอนที่ 3: PIL วางข้อความบนพื้นหลัง DALL-E =====
async function createHybridImage(bgPath, blogData, term) {
  const d = blogData || {};
  const product     = (d.product     || term).replace(/'/g, "\\'");
  const hsCode      = (d.hsCode      || '------').replace(/'/g, "\\'");
  const hsDesc      = (d.hsDescription || '').slice(0, 40).replace(/'/g, "\\'");
  const destination = (d.destination || '').replace(/'/g, "\\'");
  const steps       = (d.steps       || []).slice(0, 6);
  const agencies    = (d.agencies    || []).slice(0, 3);

  // สร้าง Python list strings
  const stepsStr    = JSON.stringify(steps).replace(/"/g, "'");
  const agenciesStr = JSON.stringify(agencies.map(a => a.split('—')[0].trim())).replace(/"/g, "'");

  const pilScript = `
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import textwrap, os

# Load background from DALL-E
bg = Image.open('${bgPath}').convert('RGBA').resize((1080, 1080))

# Dark overlay for readability
overlay = Image.new('RGBA', (1080, 1080), (0, 0, 0, 0))
draw_ov = ImageDraw.Draw(overlay)

# Gradient dark overlay (top lighter, bottom darker)
for y in range(1080):
    alpha = int(155 + (y / 1080) * 60)
    draw_ov.rectangle([(0, y), (1080, y+1)], fill=(10, 15, 35, alpha))

# Colored accent bar at top
draw_ov.rectangle([(0, 0), (1080, 8)], fill=(0, 200, 255, 220))
draw_ov.rectangle([(0, 8), (1080, 14)], fill=(255, 165, 0, 180))

bg = Image.alpha_composite(bg, overlay)
img = bg.convert('RGB')
draw = ImageDraw.Draw(img)

# Fonts
try:
    font_bold_xl  = ImageFont.truetype('/tmp/SarabunB.ttf', 72)
    font_bold_lg  = ImageFont.truetype('/tmp/SarabunB.ttf', 46)
    font_bold_md  = ImageFont.truetype('/tmp/SarabunB.ttf', 34)
    font_bold_sm  = ImageFont.truetype('/tmp/SarabunB.ttf', 28)
    font_reg_md   = ImageFont.truetype('/tmp/Sarabun.ttf',  30)
    font_reg_sm   = ImageFont.truetype('/tmp/Sarabun.ttf',  24)
    font_reg_xs   = ImageFont.truetype('/tmp/Sarabun.ttf',  20)
except:
    font_bold_xl = font_bold_lg = font_bold_md = font_bold_sm = ImageFont.load_default()
    font_reg_md = font_reg_sm = font_reg_xs = ImageFont.load_default()

W = 1080

def center_text(draw, text, y, font, color):
    bbox = draw.textbbox((0,0), text, font=font)
    w = bbox[2] - bbox[0]
    draw.text(((W - w) / 2, y), text, font=font, fill=color)

def draw_card(draw, x, y, w, h, color=(255,255,255,18)):
    card = Image.new('RGBA', (w, h), color)
    img.paste(Image.alpha_composite(Image.new('RGBA', (w,h), (0,0,0,0)), card), (x, y))

# ── HEADER ──────────────────────────────────────────────
# Logo / brand
center_text(draw, 'Booking Freight', 28, font_reg_sm, (0, 200, 255))
center_text(draw, 'Shipper & Consignee', 56, font_reg_xs, (180, 220, 255))

# Incoterm big title
term_text = '${term}'
bbox = draw.textbbox((0,0), term_text, font=font_bold_xl)
tw = bbox[2]-bbox[0]
# Shadow
draw.text(((W-tw)/2+3, 103), term_text, font=font_bold_xl, fill=(0,0,0,150))
draw.text(((W-tw)/2, 100), term_text, font=font_bold_xl, fill=(255, 200, 50))

# Product name
product_text = '${product}'
center_text(draw, product_text, 180, font_bold_md, (255, 255, 255))

# HS Code badge
hs_text = 'HS Code: ${hsCode}  |  ${destination}'
bbox2 = draw.textbbox((0,0), hs_text, font=font_reg_sm)
bw = bbox2[2]-bbox2[0]+40
bx = (W-bw)//2
draw.rounded_rectangle([bx, 222, bx+bw, 258], radius=14, fill=(0,180,230,200))
center_text(draw, hs_text, 228, font_reg_sm, (255, 255, 255))

# ── STEPS SECTION ───────────────────────────────────────
steps = ${stepsStr}
draw.text((54, 278), 'ขั้นตอนการส่งออก', font=font_bold_sm, fill=(0, 220, 255))
draw.line([(54, 310), (520, 310)], fill=(0,200,255,180), width=2)

colors_step = [(255,180,50), (100,220,100), (100,180,255), (255,130,130), (200,150,255), (255,200,100)]
col_w = 490
for i, step in enumerate(steps[:6]):
    col = i % 2
    row = i // 2
    sx = 54 + col * 530
    sy = 320 + row * 110
    sc = colors_step[i % len(colors_step)]
    # Number circle
    draw.ellipse([sx, sy+2, sx+42, sy+44], fill=sc)
    draw.text((sx+12, sy+6), str(i+1), font=font_bold_md, fill=(20,20,40))
    # Step text (wrap)
    wrapped = textwrap.fill(step, width=28)
    lines = wrapped.split('\\n')
    for li, line in enumerate(lines[:2]):
        draw.text((sx+52, sy+4+li*26), line, font=font_reg_xs, fill=(230,240,255))

# ── RESPONSIBILITY TABLE ─────────────────────────────────
ty = 660
draw.text((54, ty), 'ความรับผิดชอบ', font=font_bold_sm, fill=(0,220,255))
draw.line([(54, ty+32), (520, ty+32)], fill=(0,200,255,180), width=2)

headers = [('ความรับผิดชอบ', 54), ('Seller', 380), ('Buyer', 520)]
for h, hx in headers:
    draw.text((hx, ty+40), h, font=font_bold_sm, fill=(255,200,50))

rows_data = [
    ('ดำเนินพิธีการส่งออก', 'YES', 'NO'),
    ('ค่าขนส่งหลัก', 'VARIES', 'VARIES'),
    ('ประกันภัย', 'NO', 'YES'),
    ('ความเสี่ยงหลังส่งมอบ', 'NO', 'YES'),
]
for ri, (label, seller, buyer) in enumerate(rows_data):
    ry = ty + 76 + ri * 38
    bg_c = (255,255,255,8) if ri%2==0 else (255,255,255,3)
    draw.rectangle([54, ry-4, 640, ry+30], fill=bg_c)
    draw.text((54,  ry), label,  font=font_reg_xs, fill=(200,220,255))
    sc2 = (100,220,100) if seller=='YES' else (255,120,100) if seller=='NO' else (255,200,80)
    bc2 = (100,220,100) if buyer=='YES'  else (255,120,100) if buyer=='NO'  else (255,200,80)
    draw.text((380, ry), seller, font=font_bold_sm, fill=sc2)
    draw.text((520, ry), buyer,  font=font_bold_sm, fill=bc2)

# ── AGENCIES ────────────────────────────────────────────
agencies = ${agenciesStr}
ax = 660
draw.text((ax, 278), 'หน่วยงานที่ติดต่อ', font=font_bold_sm, fill=(0,220,255))
draw.line([(ax, 310), (1026, 310)], fill=(0,200,255,180), width=2)
for ai, ag in enumerate(agencies[:3]):
    ay = 320 + ai * 80
    draw.ellipse([ax, ay+4, ax+28, ay+32], fill=(255,165,0,200))
    draw.text((ax+7, ay+4), str(ai+1), font=font_reg_xs, fill=(20,20,40))
    short = ag[:30] + ('...' if len(ag)>30 else '')
    draw.text((ax+38, ay+4), short, font=font_reg_sm, fill=(230,240,255))

# ── FOOTER ──────────────────────────────────────────────
draw.rectangle([(0, 1010), (1080, 1080)], fill=(0,0,0,200))
draw.line([(0,1010),(1080,1010)], fill=(0,200,255,150), width=2)
contact = '+66 63-446-7735  |  LINE: lin.ee/6aC3Z5O  |  pitfreight.com'
center_text(draw, contact, 1022, font_reg_sm, (180, 220, 255))
center_text(draw, 'PIT Freight — Booking Freight Shipper & Consignee', 1050, font_reg_xs, (120,160,200))

# Save
img.save('/tmp/auto_post.jpg', 'JPEG', quality=95)
print('Image saved: /tmp/auto_post.jpg')
`;

  const scriptPath = '/tmp/hybrid_gen.py';
  fs.writeFileSync(scriptPath, pilScript);
  execFileSync('python3', [scriptPath], { timeout: 60000 });
}

// ===== โพสต์ภาพ+caption ลง Facebook (curl) =====
async function postToFacebook(imagePath, caption) {
  if (!PAGE2_TOKEN) throw new Error('FB_PAGE2_ACCESS_TOKEN not set');

  const captionFile = '/tmp/fb_caption_post.txt';
  fs.writeFileSync(captionFile, caption);

  const result = execFileSync('bash', ['-c',
    `curl -s -X POST \
      "https://graph.facebook.com/v19.0/${PAGE2_ID}/photos" \
      -F "source=@${imagePath}" \
      -F "caption=<${captionFile}" \
      -F "access_token=${PAGE2_TOKEN}"`
  ], { timeout: 60000 });

  const data = JSON.parse(result.toString());
  if (data.error) throw new Error(data.error.message);
  return data;
}

// ===== สร้างบทความใน Notion Blog =====
async function postToNotionBlog(blogData, term, caption, fbUrl) {
  const notionToken = process.env.NOTION_TOKEN;
  const blogDb      = process.env.NOTION_BLOG_DB;
  if (!notionToken || !blogDb) throw new Error('NOTION_TOKEN หรือ NOTION_BLOG_DB ไม่ได้ตั้งค่า');

  const bodyBlocks = [];

  if (blogData.summary) {
    bodyBlocks.push({ object: 'block', type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: blogData.summary } }] } });
  }
  if (blogData.hsCode) {
    bodyBlocks.push({ object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '📦 สินค้าและ HS Code' } }] } });
    bodyBlocks.push({ object: 'block', type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content:
        `สินค้า: ${blogData.product || '-'}\nHS Code: ${blogData.hsCode} — ${blogData.hsDescription || ''}\nประเทศปลายทาง: ${blogData.destination || '-'}` } }] } });
  }
  if (blogData.steps?.length) {
    bodyBlocks.push({ object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '🔢 ขั้นตอนการส่งออก' } }] } });
    for (const step of blogData.steps) {
      bodyBlocks.push({ object: 'block', type: 'numbered_list_item',
        numbered_list_item: { rich_text: [{ type: 'text', text: { content: step } }] } });
    }
  }
  if (blogData.proTips?.length) {
    bodyBlocks.push({ object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '💡 Pro Tips จากผู้เชี่ยวชาญ' } }] } });
    for (const tip of blogData.proTips) {
      bodyBlocks.push({ object: 'block', type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: tip } }] } });
    }
  }
  if (blogData.agencies?.length) {
    bodyBlocks.push({ object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '🏢 หน่วยงานที่เกี่ยวข้อง' } }] } });
    for (const ag of blogData.agencies) {
      bodyBlocks.push({ object: 'block', type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: ag } }] } });
    }
  }
  if (fbUrl) {
    bodyBlocks.push({ object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '📱 ดูโพสต์ Facebook' } }] } });
    bodyBlocks.push({ object: 'block', type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: fbUrl, link: { url: fbUrl } } }] } });
  }
  bodyBlocks.push({ object: 'block', type: 'heading_2',
    heading_2: { rich_text: [{ type: 'text', text: { content: '📄 เนื้อหา Facebook Post' } }] } });
  for (let i = 0; i < caption.length; i += 1900) {
    bodyBlocks.push({ object: 'block', type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: caption.slice(i, i+1900) } }] } });
  }

  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    parent: { database_id: blogDb },
    properties: {
      'Title':          { title: [{ text: { content: blogData.title || `คู่มือ ${term} — ${today}` } }] },
      'Slug':           { rich_text: [{ text: { content: blogData.slug || `${term.toLowerCase()}-${Date.now()}` } }] },
      'Summary':        { rich_text: [{ text: { content: (blogData.summary || '').slice(0, 2000) } }] },
      'Tags':           { multi_select: (blogData.tags || [term, 'Incoterms', 'freight']).map(t => ({ name: t })) },
      'Published':      { checkbox: true },
      'Category':       { select: { name: 'Incoterms' } },
      'Language':       { select: { name: 'TH' } },
      'Author':         { rich_text: [{ text: { content: 'PIT Freight Expert' } }] },
      'Published Date': { date: { start: today } },
    },
    children: bodyBlocks,
  };

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionToken}`,
      'Content-Type':  'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || JSON.stringify(data));
  return data;
}

// ===== Main job =====
async function runAutoPost() {
  const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  console.log(`\n[AutoPost] เริ่มต้น ${now}`);

  try {
    // 1. Fonts
    ensureFonts();

    // 2. เลือก Incoterm
    const term = pickTerm();
    console.log(`[AutoPost] Term: ${term}`);

    // 3. Claude สร้าง content + DALL-E prompt
    console.log('[AutoPost] Claude กำลังสร้าง content...');
    const { caption, dallePrompt, blogData } = await generateContent(term);
    if (!dallePrompt) throw new Error('Claude ไม่ได้ส่ง DALL-E prompt กลับมา');

    // 4. DALL-E 3 สร้างพื้นหลัง
    console.log('[AutoPost] DALL-E 3 กำลังสร้างภาพพื้นหลัง...');
    const bgPath = await generateDalleBackground(dallePrompt);
    console.log('[AutoPost] DALL-E สร้างพื้นหลังสำเร็จ');

    // 5. PIL วางข้อความบนพื้นหลัง
    console.log('[AutoPost] PIL กำลังวางข้อความบน DALL-E background...');
    await createHybridImage(bgPath, blogData, term);
    if (!fs.existsSync('/tmp/auto_post.jpg')) throw new Error('ไม่พบไฟล์ภาพ');
    console.log('[AutoPost] สร้างภาพ Hybrid สำเร็จ');

    // 6. โพสต์ Facebook
    console.log('[AutoPost] โพสต์ Facebook...');
    const result = await postToFacebook('/tmp/auto_post.jpg', caption);
    const fbUrl  = `https://www.facebook.com/${result.post_id}`;
    console.log(`[AutoPost] Facebook สำเร็จ! URL: ${fbUrl}`);

    // 7. Notion Blog
    let blogUrl = '';
    try {
      console.log('[AutoPost] สร้าง Notion Blog...');
      if (blogData) {
        const nr = await postToNotionBlog(blogData, term, caption, fbUrl);
        blogUrl = `https://www.notion.so/${nr.id.replace(/-/g,'')}`;
        console.log(`[AutoPost] Notion Blog สำเร็จ! ID: ${nr.id}`);
      }
    } catch (blogErr) {
      console.error(`[AutoPost] Blog ERROR (ไม่หยุด): ${blogErr.message}`);
    }

    // 8. Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      const msg = [
        `✅ *AutoPost สำเร็จ* — ${term} (DALL-E 3 + PIL)`,
        `📘 Facebook: ${fbUrl}`,
        blogUrl ? `📝 Blog: ${blogUrl}` : '📝 Blog: ข้ามการสร้าง',
      ].join('\n');
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg }),
      }).catch(() => {});
    }

  } catch (err) {
    console.error(`[AutoPost] ERROR: ${err.message}`);
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `❌ *AutoPost ล้มเหลว*: ${err.message}` }),
      }).catch(() => {});
    }
  }
}

// ===== Cron Jobs =====
function startAutoPost() {
  cron.schedule('0 8 * * *',  runAutoPost, { timezone: 'Asia/Bangkok' });
  cron.schedule('0 15 * * *', runAutoPost, { timezone: 'Asia/Bangkok' });
  console.log('[AutoPost] Cron jobs registered: 08:00 & 15:00 Asia/Bangkok (DALL-E 3 Mode)');
}

module.exports = { startAutoPost, runAutoPost };
