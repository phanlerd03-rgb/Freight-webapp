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

// ===== 3. PIL: structured 3-column infographic =====
async function createInfographic(productImgPath, blogData, term) {
  const d         = blogData || {};
  const colors    = TERM_COLORS[term] || TERM_COLORS.FOB;
  const termFull  = TERM_FULL[term] || term;
  const bgHex     = colors[0];
  const accentHex = colors[1];

  // helper: hex → (r,g,b)
  const hex2rgb = h => {
    const x = h.replace('#','');
    return [parseInt(x.slice(0,2),16), parseInt(x.slice(2,4),16), parseInt(x.slice(4,6),16)];
  };
  const [bgR,bgG,bgB]       = hex2rgb(bgHex);
  const [acR,acG,acB]       = hex2rgb(accentHex);

  const steps      = JSON.stringify(d.steps     || []);
  const documents  = JSON.stringify(d.documents || []);
  const agencies   = JSON.stringify(d.agencies  || []);
  const proTips    = JSON.stringify(d.proTips   || []);
  const sellerResp = JSON.stringify(d.sellerResp|| []);
  const buyerResp  = JSON.stringify(d.buyerResp || []);

  const pilScript = `
import json, textwrap
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1080

# ── colors ──────────────────────────────────────────────
BG      = (${bgR}, ${bgG}, ${bgB})
ACCENT  = (${acR}, ${acG}, ${acB})
WHITE   = (255, 255, 255)
LGRAY   = (200, 215, 230)
MGRAY   = (140, 160, 185)
DGRAY   = (30, 40, 60)
CARD    = (20, 30, 55)
CARD2   = (15, 22, 42)
GREEN   = (39, 174, 96)
RED     = (231, 76, 60)
ORANGE  = (230, 126, 34)
YELLOW  = (241, 196, 15)

# ── fonts ────────────────────────────────────────────────
def f(bold, size):
    try: return ImageFont.truetype('/tmp/SarabunB.ttf' if bold else '/tmp/Sarabun.ttf', size)
    except: return ImageFont.load_default()

fH1  = f(True,  88)
fH2  = f(True,  32)
fH3  = f(True,  26)
fH4  = f(True,  22)
fB   = f(False, 22)
fSm  = f(False, 19)
fXs  = f(False, 17)
fTag = f(True,  20)

# ── canvas ───────────────────────────────────────────────
img  = Image.new('RGB', (W, H), BG)
draw = ImageDraw.Draw(img)

def tw(text, font):
    bb = draw.textbbox((0,0), text, font=font)
    return bb[2]-bb[0], bb[3]-bb[1]

def cx(text, y, font, color):
    w,_ = tw(text, font)
    draw.text(((W-w)//2, y), text, font=font, fill=color)

def draw_card(x, y, w, h, color=CARD, radius=12, border=None):
    draw.rounded_rectangle([x, y, x+w, y+h], radius=radius, fill=color,
                            outline=border or color, width=1 if border else 0)

def accent_bar(x, y, w, h=4):
    draw.rounded_rectangle([x, y, x+w, y+h], radius=2, fill=ACCENT)

# ════════════════════════════════════════════════════════
# HEADER  0..130
# ════════════════════════════════════════════════════════
draw.rectangle([0, 0, W, 130], fill=CARD2)
# top accent line
draw.rectangle([0, 0, W, 6], fill=ACCENT)
draw.rectangle([0, 6, W, 10], fill=ORANGE)

# BIG term
term_txt = "${term}"
wt, _ = tw(term_txt, fH1)
sx = (W - wt) // 2
draw.text((sx+3, 18), term_txt, font=fH1, fill=(0,0,0,120))
draw.text((sx,   15), term_txt, font=fH1, fill=ACCENT)

# full name right-aligned
full_name = "${termFull}"
wf, _ = tw(full_name, fH3)
draw.text((W - wf - 24, 20), full_name, font=fH3, fill=LGRAY)

# key point sub-line
key_pt = """${(d.termKeyPoint || '').replace(/"/g, '\\"').slice(0,60)}"""
wk, _ = tw(key_pt, fH4)
draw.text(((W-wk)//2, 98), key_pt, font=fH4, fill=WHITE)

# HS badge
hs_txt = "HS Code: ${d.hsCode || '------'}   |   ${(d.destination || '').replace(/"/g, '\\"')}"
wh, _ = tw(hs_txt, fSm)
bx = (W-wh)//2 - 20
draw.rounded_rectangle([bx, 120, bx+wh+40, 148], radius=10, fill=ACCENT)
cx(hs_txt, 125, fSm, WHITE)

# ════════════════════════════════════════════════════════
# HERO STRIPE  148..195
# ════════════════════════════════════════════════════════
draw.rectangle([0, 148, W, 195], fill=ORANGE)
hero = """${(d.termMeaning || '').replace(/"/g, '\\"').slice(0,72)}"""
cx(hero, 158, fH4, WHITE)

# ════════════════════════════════════════════════════════
# MAIN CONTENT  200..730   (3 columns)
# col1: 20..330  (310px) — product photo + term info
# col2: 340..730 (390px) — steps
# col3: 740..1060(320px) — docs + agencies
# ════════════════════════════════════════════════════════
TOP = 205
BOT = 730

# ── COL 1 ──────────────────────────────────────────────
CX1, CW1 = 20, 310
draw_card(CX1, TOP, CW1, BOT-TOP, CARD, radius=14)
accent_bar(CX1, TOP, CW1)

# product image (from gpt-image-1)
try:
    prod_img = Image.open("""${productImgPath}""").convert('RGB')
    prod_img = prod_img.resize((CW1-4, 190))
    # rounded mask
    mask = Image.new('L', prod_img.size, 0)
    from PIL import ImageDraw as ID2
    md = ID2.Draw(mask)
    md.rounded_rectangle([0,0,prod_img.width-1, prod_img.height-1], radius=10, fill=255)
    prod_out = Image.new('RGB', prod_img.size, CARD)
    prod_out.paste(prod_img, mask=mask)
    img.paste(prod_out, (CX1+2, TOP+8))
except Exception as e:
    draw.rounded_rectangle([CX1+2, TOP+8, CX1+CW1-2, TOP+200], radius=10, fill=(30,45,75))
    cx("[ Product Image ]", TOP+90, fB, MGRAY)

img_bot = TOP + 202

# product name
prod_name = """${(d.product || '').replace(/"/g, '\\"')}"""
for li, line in enumerate(textwrap.wrap(prod_name, 22)):
    draw.text((CX1+12, img_bot+6+li*28), line, font=fH3, fill=WHITE)

# HS + destination
draw.text((CX1+12, img_bot+68), f"HS: ${d.hsCode||'------'}", font=fTag, fill=ACCENT)
dest_short = """${(d.destination||'').replace(/"/g,'\\"').slice(0,20)}"""
draw.text((CX1+12, img_bot+94), dest_short, font=fSm, fill=LGRAY)

# separator
draw.line([(CX1+12, img_bot+122),(CX1+CW1-12, img_bot+122)], fill=ACCENT, width=1)

# seller/buyer responsibility summary
sell = json.loads("""${sellerResp.replace(/"/g, '\\"').replace(/\\/g,'\\\\').replace(/\\\\"/g,'\\"')}""") if """${sellerResp}""" != '[]' else []
buy  = json.loads("""${buyerResp.replace(/"/g, '\\"').replace(/\\/g,'\\\\').replace(/\\\\"/g,'\\"')}""") if """${buyerResp}"""  != '[]' else []

draw.text((CX1+12, img_bot+130), "Seller รับผิดชอบ:", font=fH4, fill=GREEN)
for i,s in enumerate(sell[:3]):
    draw.text((CX1+16, img_bot+156+i*26), "• "+s[:28], font=fXs, fill=LGRAY)
by_y = img_bot+240
draw.text((CX1+12, by_y), "Buyer รับผิดชอบ:", font=fH4, fill=RED)
for i,b in enumerate(buy[:3]):
    draw.text((CX1+16, by_y+26+i*26), "• "+b[:28], font=fXs, fill=LGRAY)

# ── COL 2 — STEPS ───────────────────────────────────────
CX2, CW2 = 340, 390
draw_card(CX2, TOP, CW2, BOT-TOP, CARD, radius=14)
accent_bar(CX2, TOP, CW2)

draw.text((CX2+14, TOP+10), "ขั้นตอนการส่งออก", font=fH2, fill=ACCENT)

steps = json.loads("""${steps}""")
STEP_COLORS = [(241,196,15),(231,76,60),(46,204,113),(52,152,219),(155,89,182),(230,126,34)]
sy = TOP + 50
for i, st in enumerate(steps[:6]):
    sc = STEP_COLORS[i % len(STEP_COLORS)]
    sh = 73
    # row bg
    if i % 2 == 0:
        draw.rounded_rectangle([CX2+8, sy, CX2+CW2-8, sy+sh], radius=8, fill=(25,38,65))
    # number circle
    draw.ellipse([CX2+14, sy+6, CX2+44, sy+36], fill=sc)
    nw,_ = tw(str(i+1), fH4)
    draw.text((CX2+14+(30-nw)//2, sy+8), str(i+1), font=fH4, fill=DGRAY)
    # title + detail
    title  = st.get('title','') if isinstance(st,dict) else str(st)
    detail = st.get('detail','') if isinstance(st,dict) else ''
    draw.text((CX2+54, sy+4),  title[:34],  font=fH4, fill=WHITE)
    for di, dl in enumerate(textwrap.wrap(detail, 42)[:2]):
        draw.text((CX2+54, sy+28+di*19), dl, font=fXs, fill=LGRAY)
    sy += sh + 5

# ── COL 3 — DOCS + AGENCIES ──────────────────────────────
CX3, CW3 = 740, 320
draw_card(CX3, TOP, CW3, BOT-TOP, CARD, radius=14)
accent_bar(CX3, TOP, CW3)

draw.text((CX3+12, TOP+10), "เอกสาร/ใบอนุญาต", font=fH2, fill=ACCENT)

docs = json.loads("""${documents}""")
for di, doc in enumerate(docs[:4]):
    dy = TOP + 50 + di*44
    draw.rounded_rectangle([CX3+10, dy, CX3+CW3-10, dy+36], radius=8, fill=(25,38,65))
    draw.rounded_rectangle([CX3+10, dy, CX3+16, dy+36], radius=4, fill=GREEN)
    for li, line in enumerate(textwrap.wrap(str(doc), 26)[:2]):
        draw.text((CX3+24, dy+4+li*18), line, font=fXs, fill=WHITE)

# agencies
ag_y = TOP + 240
draw.line([(CX3+12, ag_y),(CX3+CW3-12, ag_y)], fill=ACCENT, width=1)
draw.text((CX3+12, ag_y+8), "หน่วยงานที่ติดต่อ", font=fH2, fill=ACCENT)

agencies = json.loads("""${agencies}""")
ag_dot_c = [(52,152,219),(46,204,113),(230,126,34)]
for ai, ag in enumerate(agencies[:3]):
    ay = ag_y + 48 + ai*68
    dc = ag_dot_c[ai % len(ag_dot_c)]
    draw.ellipse([CX3+12, ay+2, CX3+36, ay+26], fill=dc)
    draw.text((CX3+14, ay+3), str(ai+1), font=fH4, fill=DGRAY)
    name = ag.get('name','') if isinstance(ag,dict) else str(ag)
    role = ag.get('role','') if isinstance(ag,dict) else ''
    url  = ag.get('url','')  if isinstance(ag,dict) else ''
    for li, line in enumerate(textwrap.wrap(name[:30], 22)[:1]):
        draw.text((CX3+44, ay+2+li*22), line, font=fH4, fill=WHITE)
    if role:
        draw.text((CX3+44, ay+26), role[:30], font=fXs, fill=MGRAY)
    if url:
        short_url = url.replace('https://','').replace('www.','')[:28]
        draw.text((CX3+44, ay+44), short_url, font=fXs, fill=ACCENT)

# ════════════════════════════════════════════════════════
# PRO TIPS  738..888
# ════════════════════════════════════════════════════════
PT_TOP = 738
draw.rectangle([0, PT_TOP, W, 888], fill=(12, 20, 40))
draw.rectangle([0, PT_TOP, W, PT_TOP+4], fill=YELLOW)
draw.text((20, PT_TOP+8), "Pro Tips จากผู้ชำนาญการ", font=fH2, fill=YELLOW)

tips = json.loads("""${proTips}""")
tip_w = (W - 60) // 3
for ti, tip in enumerate(tips[:3]):
    tx = 20 + ti*(tip_w+20)
    draw_card(tx, PT_TOP+42, tip_w, 98, (20,32,62), radius=10, border=YELLOW)
    draw.rounded_rectangle([tx, PT_TOP+42, tx+tip_w, PT_TOP+46], radius=10, fill=YELLOW)
    title  = tip.get('title','') if isinstance(tip,dict) else str(tip)
    detail = tip.get('detail','') if isinstance(tip,dict) else ''
    draw.text((tx+10, PT_TOP+50), f"Tip {ti+1}: "+title[:24], font=fTag, fill=YELLOW)
    for di, dl in enumerate(textwrap.wrap(detail, 34)[:2]):
        draw.text((tx+10, PT_TOP+74+di*20), dl, font=fXs, fill=LGRAY)

# ════════════════════════════════════════════════════════
# FOOTER  896..1080
# ════════════════════════════════════════════════════════
draw.rectangle([0, 896, W, 1080], fill=(5, 10, 25))
draw.rectangle([0, 896, W, 902], fill=ACCENT)
draw.rectangle([0, 902, W, 906], fill=ORANGE)

# PIT Freight logo area
draw_card(20, 916, 200, 70, (18,28,52), radius=10)
draw.text((35, 924), "PIT", font=f(True, 38), fill=ACCENT)
draw.text((90, 930), "FREIGHT", font=f(True, 22), fill=WHITE)
draw.text((35, 964), "ONE STOP LOGISTICS", font=fXs, fill=MGRAY)

# divider
draw.line([(232, 920),(232, 986)], fill=(50,65,90), width=1)

# contact info
draw.text((250, 920), "+66 63-446-7735", font=fH3, fill=WHITE)
draw.text((250, 950), "LINE: lin.ee/6aC3Z5O", font=fB, fill=LGRAY)
draw.text((250, 978), "pitfreight.com", font=fB, fill=ACCENT)

# tag line right
tag = "Booking Freight Shipper & Consignee"
wt2,_ = tw(tag, fSm)
draw.text((W-wt2-20, 920), tag, font=fSm, fill=MGRAY)
draw.text((W-200, 948), "Incoterms 2020", font=fTag, fill=ACCENT)

# product name watermark bottom
prod_wm = """${(d.product||'').replace(/"/g,'\\"').slice(0,30)}"""
ww,_ = tw(prod_wm, fXs)
draw.text((W-ww-20, 1056), prod_wm, font=fXs, fill=(50,65,90))

img.save('/tmp/auto_post.jpg', 'JPEG', quality=95, optimize=True)
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

// ===== 5. Notion Blog =====
async function postToNotionBlog(blogData, term, caption, fbUrl) {
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
  const res = await fetch('https://api.notion.com/v1/pages', {
    method:'POST',
    headers:{ 'Authorization':`Bearer ${notionToken}`, 'Content-Type':'application/json', 'Notion-Version':'2022-06-28' },
    body: JSON.stringify({
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
    }),
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

    console.log('[AutoPost] โพสต์ Facebook...');
    const result = await postToFacebook('/tmp/auto_post.jpg', caption);
    const fbUrl  = `https://www.facebook.com/${result.post_id}`;
    console.log(`[AutoPost] Facebook สำเร็จ! URL: ${fbUrl}`);

    let blogUrl = '';
    try {
      if (blogData) {
        const nr = await postToNotionBlog(blogData, term, caption, fbUrl);
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
