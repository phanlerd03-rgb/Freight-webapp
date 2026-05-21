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

// ===== ขั้นตอนที่ 3: PIL วางข้อความบนพื้นหลัง DALL-E (Modern Design) =====
async function createHybridImage(bgPath, blogData, term) {
  const d = blogData || {};
  const product     = (d.product     || term).replace(/'/g, "\\'");
  const hsCode      = (d.hsCode      || '------').replace(/'/g, "\\'");
  const destination = (d.destination || '').replace(/'/g, "\\'");
  const steps       = (d.steps       || []).slice(0, 6);
  const agencies    = (d.agencies    || []).slice(0, 3);

  const stepsStr    = JSON.stringify(steps);
  const agenciesStr = JSON.stringify(agencies.map(a => a.split('—')[0].trim()));

  const pilScript = `
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import textwrap, json

W, H = 1080, 1080

# ── โหลด DALL-E background ──────────────────────────────
bg_orig = Image.open("""${bgPath}""").convert("RGB").resize((W, H))

# Blur background เล็กน้อยให้ข้อความอ่านง่ายขึ้น
bg_blur = bg_orig.filter(ImageFilter.GaussianBlur(radius=3))

# Composite: top 30% ใช้ original, ล่างลงมา blend กับ blur
bg = Image.blend(bg_orig, bg_blur, alpha=0.55)

# ── Overlay gradient เบาๆ ให้ contrast พอดี ──────────────
ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ov_d = ImageDraw.Draw(ov)
# top strip เข้มนิดหน่อย
for y in range(200):
    a = int(80 * (1 - y / 200))
    ov_d.line([(0, y), (W, y)], fill=(0, 0, 0, a))
# bottom 40% เข้มขึ้นเพื่อ footer
for y in range(int(H * 0.62), H):
    a = int(140 * ((y - H * 0.62) / (H * 0.38)))
    ov_d.line([(0, y), (W, y)], fill=(0, 0, 20, min(a, 170)))

base = bg.convert("RGBA")
base = Image.alpha_composite(base, ov)
img  = base.convert("RGB")
draw = ImageDraw.Draw(img)

# ── Fonts ────────────────────────────────────────────────
def font(bold, size):
    path = "/tmp/SarabunB.ttf" if bold else "/tmp/Sarabun.ttf"
    try:    return ImageFont.truetype(path, size)
    except: return ImageFont.load_default()

fTerm    = font(True,  110)
fBrand   = font(False,  26)
fProd    = font(True,   42)
fHs      = font(False,  26)
fSecHead = font(True,   30)
fStep    = font(False,  24)
fStepNum = font(True,   22)
fTable   = font(False,  22)
fTableB  = font(True,   22)
fFoot    = font(False,  24)
fFootSm  = font(False,  20)

# ── Helper: centered text ────────────────────────────────
def cx(text, y, f, color, shadow=False):
    bb = draw.textbbox((0, 0), text, font=f)
    tw = bb[2] - bb[0]
    x  = (W - tw) // 2
    if shadow:
        draw.text((x+2, y+2), text, font=f, fill=(0, 0, 0, 120))
    draw.text((x, y), text, font=f, fill=color)

# ── Helper: frosted glass card ────────────────────────────
def glass_card(x, y, w, h, accent_color=None, radius=22):
    card = Image.new("RGBA", (w, h), (10, 10, 30, 175))
    card_d = ImageDraw.Draw(card)
    card_d.rounded_rectangle([0, 0, w-1, h-1], radius=radius,
                               outline=(255, 255, 255, 40), width=1)
    if accent_color:
        card_d.rounded_rectangle([0, 0, w-1, 4], radius=radius,
                                  fill=accent_color + (230,))
    img_rgba = img.convert("RGBA")
    img_rgba.paste(Image.alpha_composite(img_rgba.crop((x, y, x+w, y+h)), card), (x, y))
    img.paste(img_rgba.convert("RGB").crop((x, y, x+w, y+h)), (x, y))

# ════════════════════════════════════════════════════════
# ZONE 1 — HEADER (0..240)  — ไม่มี card, เห็น bg เต็ม
# ════════════════════════════════════════════════════════

# accent top line
draw.rectangle([(0, 0), (W, 6)], fill=(0, 210, 255))
draw.rectangle([(0, 6), (W, 10)], fill=(255, 180, 0))

# brand name
cx("Booking Freight Shipper & Consignee", 18, fBrand, (200, 230, 255))

# BIG Incoterm — drop shadow + bright yellow
term_text = "${term}"
bb = draw.textbbox((0, 0), term_text, font=fTerm)
tw = bb[2] - bb[0]
tx = (W - tw) // 2
draw.text((tx + 4, 54), term_text, font=fTerm, fill=(0, 0, 0, 160))
draw.text((tx,     50), term_text, font=fTerm, fill=(255, 215, 0))

# product pill
prod_text  = "${product}"
bb2 = draw.textbbox((0, 0), prod_text, font=fProd)
pw  = bb2[2] - bb2[0]
px  = (W - pw) // 2
draw.text((px + 2, 172), prod_text, font=fProd, fill=(0, 0, 0, 130))
draw.text((px,     170), prod_text, font=fProd, fill=(255, 255, 255))

# HS badge + destination
hs_text = "HS Code : ${hsCode}   |   ${destination}"
bb3  = draw.textbbox((0, 0), hs_text, font=fHs)
hw   = bb3[2] - bb3[0] + 48
hx   = (W - hw) // 2
draw.rounded_rectangle([hx, 220, hx+hw, 254], radius=16, fill=(0, 150, 210, 210))
cx(hs_text, 226, fHs, (255, 255, 255))

# ════════════════════════════════════════════════════════
# ZONE 2 — STEPS CARD (272..640)
# ════════════════════════════════════════════════════════
glass_card(28, 272, W - 56, 368, accent_color=(0, 200, 255))

steps = json.loads("""${stepsStr}""")
draw.text((56, 284), "ขั้นตอนการส่งออก", font=fSecHead, fill=(0, 220, 255))

COLS      = 2
PAD_L     = 56
COL_W     = (W - 56 - PAD_L) // COLS
ROW_H     = 108
START_Y   = 322
DOT_COLORS = [(255, 100, 100), (255, 165, 0), (80, 210, 120),
              (80, 180, 255), (200, 130, 255), (255, 220, 80)]

for i, step in enumerate(steps[:6]):
    col   = i % COLS
    row   = i // COLS
    sx    = PAD_L + col * COL_W
    sy    = START_Y + row * ROW_H
    dc    = DOT_COLORS[i % len(DOT_COLORS)]

    # circle
    draw.ellipse([sx, sy + 2, sx + 36, sy + 38], fill=dc)
    nb = draw.textbbox((0, 0), str(i + 1), font=fStepNum)
    nw = nb[2] - nb[0]
    draw.text((sx + (36 - nw) // 2, sy + 6), str(i + 1), font=fStepNum, fill=(15, 15, 30))

    # step text
    wrapped = textwrap.fill(step, width=30)
    for li, line in enumerate(wrapped.split("\\n")[:2]):
        draw.text((sx + 46, sy + 4 + li * 26), line, font=fStep, fill=(230, 240, 255))

# ════════════════════════════════════════════════════════
# ZONE 3 — BOTTOM ROW: Responsibility | Agencies (656..910)
# ════════════════════════════════════════════════════════
HALF = (W - 56 - 16) // 2   # 500

# ── Responsibility card (left) ──
glass_card(28, 656, HALF, 254, accent_color=(255, 160, 0))
draw.text((56, 668), "ความรับผิดชอบ", font=fSecHead, fill=(255, 180, 0))

col_x = [56, 320, 430]
draw.text((col_x[0], 702), "หัวข้อ",   font=fTableB, fill=(180, 200, 255))
draw.text((col_x[1], 702), "Seller",   font=fTableB, fill=(180, 200, 255))
draw.text((col_x[2], 702), "Buyer",    font=fTableB, fill=(180, 200, 255))
draw.line([(56, 726), (56 + HALF - 28, 726)], fill=(255, 255, 255, 50), width=1)

rows_data = [
    ("พิธีการส่งออก", "YES", "NO"),
    ("ค่าขนส่งหลัก",  "VARIES", "VARIES"),
    ("ประกันภัย",     "NO",  "YES"),
    ("ความเสี่ยง",    "NO",  "YES"),
]
YES_C = (100, 230, 120); NO_C = (255, 100, 100); VAR_C = (255, 200, 70)
for ri, (lbl, sel, buy) in enumerate(rows_data):
    ry = 732 + ri * 44
    if ri % 2 == 0:
        draw.rectangle([56, ry - 2, 56 + HALF - 28, ry + 38], fill=(255, 255, 255, 12))
    draw.text((col_x[0], ry + 6), lbl, font=fTable,  fill=(210, 225, 255))
    sc = YES_C if sel=="YES" else NO_C if sel=="NO" else VAR_C
    bc = YES_C if buy=="YES" else NO_C if buy=="NO" else VAR_C
    draw.text((col_x[1], ry + 6), sel, font=fTableB, fill=sc)
    draw.text((col_x[2], ry + 6), buy, font=fTableB, fill=bc)

# ── Agencies card (right) ──
ax = 28 + HALF + 16
glass_card(ax, 656, HALF, 254, accent_color=(100, 230, 120))
draw.text((ax + 20, 668), "หน่วยงานที่เกี่ยวข้อง", font=fSecHead, fill=(100, 230, 120))

agencies = json.loads("""${agenciesStr}""")
ag_colors = [(255, 165, 0), (80, 200, 255), (200, 130, 255)]
for ai, ag in enumerate(agencies[:3]):
    ay   = 710 + ai * 64
    aclr = ag_colors[ai % len(ag_colors)]
    draw.ellipse([ax + 20, ay + 4, ax + 42, ay + 26], fill=aclr)
    draw.text((ax + 24, ay + 4), str(ai + 1), font=fStepNum, fill=(15, 15, 30))
    short = ag[:32] + ("..." if len(ag) > 32 else "")
    draw.text((ax + 52, ay + 6), short, font=fStep, fill=(225, 240, 255))

# ════════════════════════════════════════════════════════
# ZONE 4 — FOOTER (920..1080)
# ════════════════════════════════════════════════════════
foot_ov = Image.new("RGBA", (W, 160), (5, 8, 25, 220))
img_rgba2 = img.convert("RGBA")
img_rgba2.paste(Image.alpha_composite(img_rgba2.crop((0, 920, W, H)), foot_ov), (0, 920))
img.paste(img_rgba2.convert("RGB").crop((0, 920, W, H)), (0, 920))

draw.line([(0, 920), (W, 920)], fill=(0, 210, 255, 200), width=3)
draw.rectangle([(0, 920), (W, 923)], fill=(255, 180, 0))

cx("+66 63-446-7735  |  LINE: lin.ee/6aC3Z5O  |  pitfreight.com",
   936, fFoot, (200, 230, 255))
cx("PIT Freight  —  Booking Freight Shipper & Consignee",
   972, fFootSm, (130, 160, 200))

# watermark line ด้านขวา
wm = "pitfreight.com"
bb_wm = draw.textbbox((0, 0), wm, font=fFootSm)
draw.text((W - (bb_wm[2] - bb_wm[0]) - 24, 1044),
          wm, font=fFootSm, fill=(80, 110, 160))

img.save("/tmp/auto_post.jpg", "JPEG", quality=95, optimize=True)
print("Saved /tmp/auto_post.jpg")
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
