/**
 * ===== PIT Freight — Auto Post Service =====
 * รันอัตโนมัติ 08:00 และ 15:00 ทุกวัน
 * gpt-image-1 (product photo) + PIL (structured 3-col infographic) → FB + Notion Blog
 */

const cron      = require('node-cron');
const Anthropic = require('@anthropic-ai/sdk');
const { execSync, execFileSync } = require('child_process');
const fs        = require('fs');
const path      = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PAGE2_ID    = process.env.FB_PAGE2_ID    || '1129725983562125';
const PAGE2_TOKEN = process.env.FB_PAGE2_ACCESS_TOKEN;

const ALL_TERMS = ['FOB','CIF','EXW','DDP','DAP','FCA','CPT','CFR','CIP','DPU'];
let usedTerms   = [];

function pickTerm() {
  if (usedTerms.length >= ALL_TERMS.length) usedTerms = [];
  const remaining = ALL_TERMS.filter(t => !usedTerms.includes(t));
  const term = remaining[Math.floor(Math.random() * remaining.length)];
  usedTerms.push(term);
  return term;
}

function ensureFonts() {
  const reg  = '/tmp/Sarabun.ttf';
  const bold = '/tmp/SarabunB.ttf';
  if (!fs.existsSync(reg))
    execSync('curl -sL https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf -o /tmp/Sarabun.ttf');
  if (!fs.existsSync(bold))
    execSync('curl -sL https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Bold.ttf -o /tmp/SarabunB.ttf');
}

// ── TERM full names map ──────────────────────────────────
const TERM_FULL = {
  FOB: 'Free On Board',       CIF: 'Cost Insurance Freight',
  EXW: 'Ex Works',            DDP: 'Delivered Duty Paid',
  DAP: 'Delivered at Place',  FCA: 'Free Carrier',
  CPT: 'Carriage Paid To',    CFR: 'Cost and Freight',
  CIP: 'Carriage Insurance Paid', DPU: 'Delivered at Place Unloaded',
};

// ── TERM accent colors [bg, accent, text] ───────────────
const TERM_COLORS = {
  FOB: ['#0D2137','#F5A623','#E8F4FD'],  CIF: ['#0A1628','#00C2CB','#E8F8F5'],
  EXW: ['#1A0D2B','#9B59B6','#F5EEF8'],  DDP: ['#0D2B1A','#27AE60','#E8F8F0'],
  DAP: ['#2B1A0D','#E67E22','#FEF9E7'],  FCA: ['#0D1A2B','#2980B9','#EBF5FB'],
  CPT: ['#1A2B0D','#1ABC9C','#E8F8F5'],  CFR: ['#2B0D1A','#E74C3C','#FDEDEC'],
  CIP: ['#0D2B2B','#16A085','#E8F8F5'],  DPU: ['#1A1A0D','#F39C12','#FEF9E7'],
};

// ===== 1. Claude: content + detailed data =====
async function generateContent(term) {
  const prompt = `คุณคือผู้ชำนาญการด้านการค้าระหว่างประเทศและพิธีการศุลกากร

สร้างข้อมูลครบถ้วนสำหรับ Incoterm: ${term}

=== FACEBOOK_CAPTION ===
เขียน caption ภาษาไทย+อังกฤษ ~600 คำ สำหรับ Facebook Page "Booking Freight Shipper & Consignee"
- หัวข้อดึงดูด + ความหมาย ${term}
- สินค้าไทยตัวอย่าง + HS Code (6 หลัก) + ประเทศปลายทาง
- ขั้นตอนส่งออก 5-7 ขั้น
- ใบอนุญาตและเอกสารที่เกี่ยวข้อง
- หน่วยงานพร้อมลิงก์จริง
- Pro Tips 2-3 ข้อ
- hashtag 8-12 อัน
- ลงท้าย: 📞 +66 63-446-7735 | 💬 LINE: lin.ee/6aC3Z5O | 🌐 pitfreight.com
- ห้ามใช้ดอกจัน (*) หรือ markdown

=== PRODUCT_IMAGE_PROMPT ===
เขียน prompt ภาษาอังกฤษสำหรับ gpt-image-1 สร้างภาพสินค้าแบบ professional product photo
- ภาพ close-up ของสินค้าไทยที่เลือก บน clean dark navy background
- Professional studio lighting, high quality, photorealistic
- ห้ามมีข้อความใดๆ ในภาพ
- เน้นตัวสินค้าชัดเจน

=== BLOG_DATA ===
valid JSON เท่านั้น:
{
  "title": "ชื่อบทความ",
  "slug": "${term.toLowerCase()}-export-guide",
  "summary": "สรุป 2-3 ประโยค",
  "termFullName": "ชื่อเต็ม ${term}",
  "termMeaning": "ความหมาย ${term} ใน 2 ประโยค",
  "termKeyPoint": "ประโยคสั้นๆ จุดเด่นสำคัญ เช่น ผู้ขายรับผิดชอบจนถึงปลายทาง",
  "product": "ชื่อสินค้า",
  "hsCode": "XXXXXX",
  "hsDescription": "คำอธิบาย HS Code",
  "destination": "ประเทศปลายทาง",
  "destinationEN": "Country name in English",
  "steps": [
    {"title":"ชื่อขั้นตอน","detail":"รายละเอียด 1 ประโยค"},
    {"title":"ชื่อขั้นตอน","detail":"รายละเอียด 1 ประโยค"},
    {"title":"ชื่อขั้นตอน","detail":"รายละเอียด 1 ประโยค"},
    {"title":"ชื่อขั้นตอน","detail":"รายละเอียด 1 ประโยค"},
    {"title":"ชื่อขั้นตอน","detail":"รายละเอียด 1 ประโยค"},
    {"title":"ชื่อขั้นตอน","detail":"รายละเอียด 1 ประโยค"}
  ],
  "documents": ["เอกสาร/ใบอนุญาต 1","เอกสาร/ใบอนุญาต 2","เอกสาร/ใบอนุญาต 3","เอกสาร/ใบอนุญาต 4"],
  "agencies": [
    {"name":"ชื่อหน่วยงาน","role":"บทบาทสั้นๆ","url":"https://..."},
    {"name":"ชื่อหน่วยงาน","role":"บทบาทสั้นๆ","url":"https://..."},
    {"name":"ชื่อหน่วยงาน","role":"บทบาทสั้นๆ","url":"https://..."}
  ],
  "proTips": [
    {"title":"หัวข้อ Tip 1","detail":"รายละเอียด 2 ประโยค"},
    {"title":"หัวข้อ Tip 2","detail":"รายละเอียด 2 ประโยค"},
    {"title":"หัวข้อ Tip 3","detail":"รายละเอียด 2 ประโยค"}
  ],
  "sellerResp": ["รายการ Seller รับผิดชอบ 1","รายการ 2","รายการ 3"],
  "buyerResp":  ["รายการ Buyer รับผิดชอบ 1","รายการ 2","รายการ 3"],
  "tags": ["${term}","Incoterms","ส่งออก","freight","logistics"]
}

format:
CAPTION_START
[caption]
CAPTION_END
PRODUCT_IMAGE_PROMPT_START
[prompt]
PRODUCT_IMAGE_PROMPT_END
BLOG_DATA_START
[JSON]
BLOG_DATA_END`;

  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content[0].text;

  const captionMatch  = text.match(/CAPTION_START\n([\s\S]*?)\nCAPTION_END/);
  const imgPromptMatch= text.match(/PRODUCT_IMAGE_PROMPT_START\n([\s\S]*?)\nPRODUCT_IMAGE_PROMPT_END/);
  const blogMatch     = text.match(/BLOG_DATA_START\n([\s\S]*?)\nBLOG_DATA_END/);

  const cleanCaption = (captionMatch?.[1] || '').trim().replace(/\*+/g, '');
  let blogData = null;
  if (blogMatch) {
    try { blogData = JSON.parse(blogMatch[1].trim()); }
    catch(e) { console.error('[AutoPost] Blog JSON parse error:', e.message); }
  }

  return {
    caption:      cleanCaption,
    imgPrompt:    (imgPromptMatch?.[1] || '').trim(),
    blogData,
  };
}

// ===== 2. gpt-image-1: product photo =====
async function generateProductImage(imgPrompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-1', prompt: imgPrompt + ' No text, no words, no letters.',
      size: '1024x1024', quality: 'medium', output_format: 'jpeg', n: 1,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'OpenAI error');

  const imgPath = '/tmp/product_img.jpg';
  if (data.data[0].b64_json) {
    fs.writeFileSync(imgPath, Buffer.from(data.data[0].b64_json, 'base64'));
  } else {
    execSync(`curl -sL "${data.data[0].url}" -o ${imgPath}`);
  }
  return imgPath;
}

// ===== 3. PIL: premium infographic =====
async function createInfographic(productImgPath, blogData, term) {
  const d        = blogData || {};
  const colors   = TERM_COLORS[term] || TERM_COLORS.FOB;
  const termFull = TERM_FULL[term] || term;

  const hex2rgb = h => {
    const x = h.replace('#','');
    return [parseInt(x.slice(0,2),16), parseInt(x.slice(2,4),16), parseInt(x.slice(4,6),16)];
  };
  const [acR,acG,acB] = hex2rgb(colors[1]);

  // Escape values safely for Python single-quoted strings
  const esc = s => (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const product     = esc((d.product||'Thai Export Product').slice(0,30));
  const destination = esc((d.destination||'ต่างประเทศ').slice(0,22));
  const hsCode      = esc(d.hsCode||'------');
  const hsDesc      = esc((d.hsDescription||'').slice(0,38));
  const tFull       = esc(termFull);
  const agJson      = JSON.stringify(d.agencies||[]).replace(/\\/g,'\\\\').replace(/'/g,"\\'");

  const pilScript = `
import json, textwrap
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

W, H = 1080, 1080

BG    = (8, 13, 26)
CARD  = (15, 22, 42)
CARD2 = (22, 32, 58)
WHITE = (255, 255, 255)
LGRAY = (185, 200, 225)
MGRAY = (100, 120, 155)
DARK  = (4, 6, 14)
ACCENT = (${acR}, ${acG}, ${acB})
TEAL   = (0, 210, 180)
ORANGE = (255, 160, 30)

def f(bold, sz):
    try: return ImageFont.truetype('/tmp/SarabunB.ttf' if bold else '/tmp/Sarabun.ttf', sz)
    except: return ImageFont.load_default()

img = Image.new('RGB', (W, H), BG)
draw = ImageDraw.Draw(img)

def tw(t, fo):
    bb = draw.textbbox((0,0), t, font=fo)
    return bb[2]-bb[0], bb[3]-bb[1]

def cx(t, y, fo, c):
    global draw
    w,_ = tw(t, fo)
    draw.text(((W-w)//2, y), t, font=fo, fill=c)

# ═══════════════════════════════════════════════
#  HERO — product photo (0-510)
# ═══════════════════════════════════════════════
HERO_H = 510
try:
    hero = Image.open('${productImgPath}').convert('RGB')
    iw, ih = hero.size
    side = min(iw, ih)
    hero = hero.crop(((iw-side)//2, (ih-side)//2, (iw+side)//2, (ih+side)//2))
    hero = hero.resize((W, HERO_H), Image.LANCZOS)
    hero = ImageEnhance.Brightness(hero).enhance(1.12)
    img.paste(hero, (0, 0))
except:
    for i in range(HERO_H):
        t = i/HERO_H
        draw.line([(0,i),(W,i)], fill=(int(8+32*t), int(13+47*t), int(26+74*t)))

# vignette: dark header strip + dark bottom fade
ov = Image.new('RGBA', (W, H), (0,0,0,0))
od = ImageDraw.Draw(ov)
# top dark band (logo area)
for i in range(120):
    a = int(190 * (1 - i/120))
    od.line([(0,i),(W,i)], fill=(BG[0],BG[1],BG[2],a))
# bottom dark fade (text area)
for i in range(260):
    a = int(235 * (i/260)**1.4)
    od.line([(0, HERO_H-260+i),(W, HERO_H-260+i)], fill=(BG[0],BG[1],BG[2],a))
img = Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB')
draw = ImageDraw.Draw(img)

# ── top accent bar ──────────────────────────────
draw.rectangle([0,0,W,5], fill=ACCENT)

# PIT FREIGHT logo top-left
draw.text((22, 14), 'PIT FREIGHT', font=f(True, 21), fill=WHITE)
draw.text((22, 38), 'Booking Freight  •  Shipper & Consignee', font=f(False, 14), fill=LGRAY)

# INCOTERMS 2020 badge top-right
badge = 'INCOTERMS 2020'
bw, bh = tw(badge, f(True, 15))
bx, by = W-bw-42, 12
draw.rounded_rectangle([bx-12, by-6, bx+bw+12, by+bh+6], radius=14, fill=ACCENT)
draw.text((bx, by), badge, font=f(True, 15), fill=DARK)

# ── TERM — massive center ───────────────────────
T_SIZE = 170
tf = f(True, T_SIZE)
tw_t, th_t = tw('${term}', tf)
tx = (W - tw_t) // 2
ty = HERO_H - 290
# thick drop shadow
for off in range(8, 0, -2):
    draw.text((tx+off, ty+off), '${term}', font=tf, fill=(0,0,0))
draw.text((tx, ty), '${term}', font=tf, fill=ACCENT)

# Full name under term
fn_fo = f(True, 28)
fnw, _ = tw('${tFull}', fn_fo)
draw.text(((W-fnw)//2, ty+th_t+2), '${tFull}', font=fn_fo, fill=WHITE)

# ── product + HS + destination pills bottom-left ─
pf = f(True, 20)
pill_y = HERO_H - 52
px = 22
def pill(x, y, txt, fo, fg, bg, rx=16, py_pad=7):
    pw, ph = tw(txt, fo)
    draw.rounded_rectangle([x,y,x+pw+rx*2,y+ph+py_pad*2], radius=16, fill=bg)
    draw.text((x+rx, y+py_pad), txt, font=fo, fill=fg)
    return pw+rx*2+10
px += pill(px, pill_y, '${product}', pf, DARK, WHITE)
px += pill(px, pill_y, 'HS ${hsCode}', pf, WHITE, ACCENT)
pill(px, pill_y, '${destination}', pf, DARK, ORANGE)

# ═══════════════════════════════════════════════
#  HS CODE BAND (512-640)
# ═══════════════════════════════════════════════
draw.rectangle([0, HERO_H+2, W, 640], fill=CARD)
draw.rectangle([0, HERO_H+2, 6, 640], fill=ACCENT)

lbl_fo = f(True, 16)
draw.text((28, HERO_H+12), 'HS CODE', font=lbl_fo, fill=MGRAY)
hs_fo = f(True, 74)
draw.text((28, HERO_H+28), '${hsCode}', font=hs_fo, fill=WHITE)
hcw, _ = tw('${hsCode}', hs_fo)
if '${hsDesc}':
    draw.text((28+hcw+18, HERO_H+56), '${hsDesc}', font=f(False,17), fill=LGRAY)

# ── Key point pill right side ───────────────────
kp_txt = 'สินค้า: ${product}'
kpw, kph = tw(kp_txt, f(False, 20))
kpx = W - kpw - 50; kpy = HERO_H + 22
draw.rounded_rectangle([kpx-14,kpy-8,kpx+kpw+14,kpy+kph+8], radius=16, fill=CARD2)
draw.text((kpx, kpy), kp_txt, font=f(False, 20), fill=LGRAY)

dest_txt = '➜  ${destination}'
dw2, dh2 = tw(dest_txt, f(True, 22))
dx2 = W - dw2 - 50; dy2 = kpy + kph + 18
draw.rounded_rectangle([dx2-14,dy2-8,dx2+dw2+14,dy2+dh2+8], radius=16, fill=ACCENT)
draw.text((dx2, dy2), dest_txt, font=f(True, 22), fill=DARK)

# ═══════════════════════════════════════════════
#  AGENCIES (642-862)
# ═══════════════════════════════════════════════
draw.rectangle([0, 642, W, 862], fill=BG)
draw.rectangle([0, 642, W, 646], fill=ACCENT)

draw.text((28, 652), 'หน่วยงานที่เกี่ยวข้อง', font=f(True, 26), fill=WHITE)
# Underline
uw, _ = tw('หน่วยงานที่เกี่ยวข้อง', f(True, 26))
draw.rectangle([28, 684, 28+uw, 687], fill=ACCENT)

try:
    agencies = json.loads('${agJson}')
except:
    agencies = []

ag_palette = [ACCENT, TEAL, ORANGE, (120,170,255)]
ROW_H = 54
for i, ag in enumerate(agencies[:3]):
    ry = 696 + i*(ROW_H + 8)
    cc = ag_palette[i % len(ag_palette)]
    # Row card
    draw.rounded_rectangle([20, ry, W-20, ry+ROW_H], radius=10, fill=CARD2)
    # Left accent bar
    draw.rounded_rectangle([20, ry, 26, ry+ROW_H], radius=10, fill=cc)
    # Circle number
    draw.ellipse([34, ry+12, 58, ry+42], fill=cc)
    nw, _ = tw(str(i+1), f(True, 21))
    draw.text((34+(24-nw)//2, ry+12), str(i+1), font=f(True, 21), fill=DARK)
    # Name + role
    ag_name = ag.get('name','')[:32] if isinstance(ag,dict) else str(ag)[:32]
    ag_role = ag.get('role','')[:48] if isinstance(ag,dict) else ''
    ag_url  = ag.get('url', '')      if isinstance(ag,dict) else ''
    draw.text((70, ry+6),  ag_name, font=f(True, 21), fill=WHITE)
    if ag_role:
        draw.text((70, ry+30), ag_role, font=f(False, 15), fill=LGRAY)
    # URL right-aligned
    if ag_url:
        u = ag_url.replace('https://','').replace('http://','').replace('www.','')[:34]
        uw2, _ = tw(u, f(False, 15))
        draw.text((W-uw2-32, ry+20), u, font=f(False, 15), fill=cc)

# ═══════════════════════════════════════════════
#  CONTACT FOOTER (864-1080)
# ═══════════════════════════════════════════════
draw.rectangle([0, 864, W, 1080], fill=(5, 8, 18))
draw.rectangle([0, 864, W, 869], fill=ACCENT)
draw.rectangle([0, 869, W, 873], fill=ORANGE)

# CTA text
cx('ติดต่อขอคำปรึกษาฟรี ไม่มีค่าใช้จ่าย', 880, f(True, 27), WHITE)

# 3 contact cards
contacts = [
    ('โทรศัพท์', '+66 63-446-7735', TEAL),
    ('LINE OA',  'lin.ee/6aC3Z5O',  (80,230,120)),
    ('เว็บไซต์', 'pitfreight.com',  ACCENT),
]
cw = (W-80)//3
for ci, (label, val, cc) in enumerate(contacts):
    cpx = 20 + ci*(cw+20); cpy = 924
    draw.rounded_rectangle([cpx, cpy, cpx+cw, cpy+76], radius=12, fill=CARD)
    # Colored top line
    draw.rounded_rectangle([cpx, cpy, cpx+cw, cpy+4], radius=12, fill=cc)
    lw,_ = tw(label, f(False,18)); draw.text((cpx+(cw-lw)//2, cpy+12), label, font=f(False,18), fill=MGRAY)
    vw,_ = tw(val, f(True,21));   draw.text((cpx+(cw-vw)//2, cpy+36), val,   font=f(True,21),  fill=WHITE)
    # Bottom colored bar
    draw.rounded_rectangle([cpx+(cw-vw-16)//2, cpy+62, cpx+(cw+vw+16)//2, cpy+70], radius=4, fill=cc)

# PIT FREIGHT branding
draw.text((28, 1018), 'PIT',     font=f(True, 46), fill=ACCENT)
draw.text((92, 1026), 'FREIGHT', font=f(True, 28), fill=WHITE)
draw.text((28, 1064), 'One Stop Logistics Solution', font=f(False, 15), fill=MGRAY)
sw, _ = tw('pitfreight.com', f(True, 21))
draw.text((W-sw-28, 1026), 'pitfreight.com', font=f(True, 21), fill=ACCENT)
sw2, _ = tw('Incoterms 2020 Specialist', f(False, 15))
draw.text((W-sw2-28, 1052), 'Incoterms 2020 Specialist', font=f(False,15), fill=MGRAY)

img.save('/tmp/auto_post.jpg', 'JPEG', quality=96, optimize=True)
print('Saved /tmp/auto_post.jpg')
`;

  const scriptPath = '/tmp/infographic_gen.py';
  fs.writeFileSync(scriptPath, pilScript);
  execFileSync('python3', [scriptPath], { timeout: 60000 });
}

// ===== 4. Facebook =====
async function postToFacebook(imagePath, caption) {
  if (!PAGE2_TOKEN) throw new Error('FB_PAGE2_ACCESS_TOKEN not set');
  const captionFile = '/tmp/fb_caption.txt';
  fs.writeFileSync(captionFile, caption);
  const result = execFileSync('bash', ['-c',
    `curl -s -X POST "https://graph.facebook.com/v19.0/${PAGE2_ID}/photos" \
     -F "source=@${imagePath}" -F "caption=<${captionFile}" -F "access_token=${PAGE2_TOKEN}"`
  ], { timeout: 60000 });
  const data = JSON.parse(result.toString());
  if (data.error) throw new Error(data.error.message);
  return data;
}

// ===== 4.5. Upload image to ImgBB → get public URL =====
async function uploadImageToImgBB(imagePath) {
  const key = process.env.IMGBB_API_KEY;
  if (!key) return null; // skip if no key configured

  try {
    const imageBase64 = fs.readFileSync(imagePath).toString('base64');
    const form = new URLSearchParams();
    form.append('key', key);
    form.append('image', imageBase64);
    form.append('expiration', '0'); // 0 = no expiry

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = await res.json();
    if (data.success) {
      console.log('[AutoPost] ImgBB upload สำเร็จ:', data.data.url);
      return data.data.url; // permanent public URL
    }
    console.warn('[AutoPost] ImgBB upload ล้มเหลว:', data?.error?.message);
    return null;
  } catch (e) {
    console.warn('[AutoPost] ImgBB error (ข้าม):', e.message);
    return null;
  }
}

// ===== 5. Notion Blog =====
async function postToNotionBlog(blogData, term, caption, fbUrl, coverImageUrl) {
  const notionToken = process.env.NOTION_TOKEN;
  const blogDb      = process.env.NOTION_BLOG_DB;
  if (!notionToken || !blogDb) throw new Error('NOTION credentials missing');

  const d = blogData || {};
  const blocks = [];

  const push = (type, obj) => blocks.push({ object:'block', type, [type]: obj });
  const rt   = (text, bold=false) => [{ type:'text', text:{content:text}, annotations:{bold} }];

  if (d.summary)  push('paragraph', { rich_text: rt(d.summary) });
  if (d.termMeaning) {
    push('heading_2', { rich_text: rt('📌 '+term+' คืออะไร?') });
    push('paragraph', { rich_text: rt(d.termMeaning) });
  }
  if (d.hsCode) {
    push('heading_2', { rich_text: rt('📦 สินค้าและ HS Code') });
    push('paragraph', { rich_text: rt(`สินค้า: ${d.product||'-'} | HS Code: ${d.hsCode} | ปลายทาง: ${d.destination||'-'}`) });
  }
  if (d.steps?.length) {
    push('heading_2', { rich_text: rt('🔢 ขั้นตอนการส่งออก') });
    for (const s of d.steps)
      push('numbered_list_item', { rich_text: rt((typeof s==='object'?`${s.title}: ${s.detail}`:s)) });
  }
  if (d.documents?.length) {
    push('heading_2', { rich_text: rt('📋 เอกสารที่ต้องใช้') });
    for (const doc of d.documents)
      push('bulleted_list_item', { rich_text: rt(doc) });
  }
  if (d.proTips?.length) {
    push('heading_2', { rich_text: rt('💡 Pro Tips') });
    for (const t of d.proTips)
      push('bulleted_list_item', { rich_text: rt(typeof t==='object'?`${t.title}: ${t.detail}`:t) });
  }
  if (d.agencies?.length) {
    push('heading_2', { rich_text: rt('🏢 หน่วยงานที่เกี่ยวข้อง') });
    for (const ag of d.agencies)
      push('bulleted_list_item', { rich_text: rt(typeof ag==='object'?`${ag.name} — ${ag.url}`:ag) });
  }
  if (fbUrl) {
    push('heading_2', { rich_text: rt('📱 Facebook Post') });
    push('paragraph', { rich_text: [{ type:'text', text:{content:fbUrl, link:{url:fbUrl}} }] });
  }
  push('heading_2', { rich_text: rt('📄 เนื้อหาเต็ม') });
  for (let i=0; i<caption.length; i+=1900)
    push('paragraph', { rich_text: rt(caption.slice(i,i+1900)) });

  const today = new Date().toISOString().slice(0,10);

  // Build the page payload
  const pagePayload = {
    parent: { database_id: blogDb },
    properties: {
      'Title':          { title:[{ text:{content: d.title||`${term} Guide`} }] },
      'Slug':           { rich_text:[{ text:{content: d.slug||`${term.toLowerCase()}-${Date.now()}`} }] },
      'Summary':        { rich_text:[{ text:{content:(d.summary||'').slice(0,2000)} }] },
      'Tags':           { multi_select:(d.tags||[term,'Incoterms']).map(t=>({name:t})) },
      'Published':      { checkbox: true },
      'Category':       { select:{name:'Incoterms'} },
      'Language':       { select:{name:'TH'} },
      'Author':         { rich_text:[{ text:{content:'PIT Freight Expert'} }] },
      'Published Date': { date:{start:today} },
    },
    children: blocks,
  };

  // Set page cover + Cover Image property if we have a public URL
  if (coverImageUrl) {
    pagePayload.cover = { type:'external', external:{ url: coverImageUrl } };
    pagePayload.properties['Cover Image'] = { url: coverImageUrl };
  }

  const res = await fetch('https://api.notion.com/v1/pages', {
    method:'POST',
    headers:{ 'Authorization':`Bearer ${notionToken}`, 'Content-Type':'application/json', 'Notion-Version':'2022-06-28' },
    body: JSON.stringify(pagePayload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || JSON.stringify(data));
  return data;
}

// ===== MAIN =====
async function runAutoPost() {
  const now = new Date().toLocaleString('th-TH', { timeZone:'Asia/Bangkok' });
  console.log(`\n[AutoPost] เริ่มต้น ${now}`);
  try {
    ensureFonts();
    const term = pickTerm();
    console.log(`[AutoPost] Term: ${term}`);

    console.log('[AutoPost] Claude กำลังสร้าง content...');
    const { caption, imgPrompt, blogData } = await generateContent(term);

    console.log('[AutoPost] gpt-image-1 สร้างภาพสินค้า...');
    const productImgPath = await generateProductImage(
      imgPrompt || `Professional product photo of ${blogData?.product||'Thai export product'} on dark navy background, studio lighting, no text`
    );
    console.log('[AutoPost] Product image สำเร็จ');

    console.log('[AutoPost] PIL สร้าง infographic...');
    await createInfographic(productImgPath, blogData, term);
    if (!fs.existsSync('/tmp/auto_post.jpg')) throw new Error('ไม่พบไฟล์ภาพ');
    console.log('[AutoPost] Infographic สำเร็จ');

    // อัพโหลดภาพ product (ไม่ใช่ infographic) สำหรับ blog cover
    console.log('[AutoPost] อัพโหลดภาพ blog cover...');
    const blogCoverUrl = await uploadImageToImgBB(productImgPath);
    if (blogCoverUrl) console.log(`[AutoPost] Blog cover URL: ${blogCoverUrl}`);
    else console.log('[AutoPost] ข้าม blog cover (IMGBB_API_KEY ไม่ได้ตั้งค่า)');

    console.log('[AutoPost] โพสต์ Facebook...');
    const result = await postToFacebook('/tmp/auto_post.jpg', caption);
    const fbUrl  = `https://www.facebook.com/${result.post_id}`;
    console.log(`[AutoPost] Facebook สำเร็จ! URL: ${fbUrl}`);

    let blogUrl = '';
    try {
      if (blogData) {
        const nr = await postToNotionBlog(blogData, term, caption, fbUrl, blogCoverUrl);
        blogUrl = `https://www.notion.so/${nr.id.replace(/-/g,'')}`;
        console.log(`[AutoPost] Notion Blog สำเร็จ! ${blogUrl}`);
      }
    } catch(e) { console.error('[AutoPost] Blog error (ไม่หยุด):', e.message); }

    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text:[
          `✅ *AutoPost สำเร็จ* — ${term} (${TERM_FULL[term]})`,
          `📘 FB: ${fbUrl}`,
          blogUrl ? `📝 Blog: ${blogUrl}` : '',
        ].filter(Boolean).join('\n') }),
      }).catch(()=>{});
    }
  } catch(err) {
    console.error(`[AutoPost] ERROR: ${err.message}`);
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ text:`❌ *AutoPost ล้มเหลว*: ${err.message}` }),
      }).catch(()=>{});
    }
  }
}

function startAutoPost() {
  cron.schedule('0 8 * * *',  runAutoPost, { timezone:'Asia/Bangkok' });
  cron.schedule('0 15 * * *', runAutoPost, { timezone:'Asia/Bangkok' });
  console.log('[AutoPost] Cron jobs: 08:00 & 15:00 Asia/Bangkok');
}

module.exports = { startAutoPost, runAutoPost };
