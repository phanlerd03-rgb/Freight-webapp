/**
 * ===== PIT Freight — Auto Post Service =====
 * รันอัตโนมัติ 08:00 และ 15:00 ทุกวัน
 * สร้าง Incoterms content + infographic → โพสต์ Facebook Page 2 + Notion Blog
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

// สร้าง content + PIL script + blog data ผ่าน Claude API
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
4) ใบอนุญาตและเอกสารควบคุมการส่งออก-นำเข้าที่เกี่ยวข้องกับสินค้าตัวอย่าง เช่น:
   - ใบอนุญาตส่งออก/นำเข้าจากหน่วยงานที่กำกับดูแล
   - มาตรฐานหรือการรับรองที่จำเป็น (เช่น อย., มอก., GAP, GMP ฯลฯ)
   - ข้อกำหนดพิเศษของประเทศปลายทาง
5) หน่วยงานที่เกี่ยวข้องพร้อมลิงก์ติดต่อจริง เช่น:
   - กรมการค้าต่างประเทศ: https://www.dft.go.th
   - กรมศุลกากร: https://www.customs.go.th
   - กรมวิชาการเกษตร: https://www.doa.go.th (ถ้าเกี่ยวข้อง)
   - สำนักงาน อย.: https://www.fda.moph.go.th (ถ้าเกี่ยวข้อง)
   - หน่วยงานอื่นๆ ที่เกี่ยวข้องกับสินค้านั้นๆ โดยเฉพาะ
6) Pro Tips จากผู้ชำนาญการ (2-3 ข้อ) ที่คนส่วนใหญ่มักพลาด
7) hashtag ท้าย (ภาษาไทย+อังกฤษ 8-12 อัน)
8) ลงท้ายด้วย: 📞 +66 63-446-7735 | 💬 LINE: lin.ee/6aC3Z5O | 🌐 pitfreight.com

กฎการเขียน:
- ห้ามใช้ดอกจัน (*) หรือ markdown formatting ใดๆ ทั้งสิ้น
- ใช้ emoji และ plain text เท่านั้น
- ความยาวรวม ~600-700 คำ
- เขียนในโทนผู้เชี่ยวชาญที่เป็นมิตร เข้าใจง่าย และนำไปใช้ได้จริง

=== ส่วนที่ 2: PYTHON_SCRIPT ===
เขียน Python script สร้าง infographic 1080x1080px ด้วย PIL
กฎสำคัญ:
- ใช้ font /tmp/Sarabun.ttf (regular) และ /tmp/SarabunB.ttf (bold) เท่านั้น
- background dark theme สีทันสมัย เหมาะกับ ${term}
- แสดงข้อมูลครบ: ชื่อ Incoterm + ชื่อสินค้าไทย + HS Code + 5-6 ขั้นตอนหลัก (2 คอลัมน์) + ตาราง responsibility split (Seller/Buyer) + หน่วยงานที่ต้องติดต่อ 2-3 แห่ง + footer "Booking Freight Shipper & Consignee"
- บันทึกที่ /tmp/auto_post.jpg quality=95
- ห้ามใช้ emoji ในภาพ (PIL render ไม่ได้) ใช้ text แทน
- script ต้องรันได้ทันทีโดยไม่มี error
- จัดวางให้สวยงาม ไม่แน่นเกินไป มีช่องว่างพอเหมาะ

=== ส่วนที่ 3: BLOG_DATA ===
สร้าง JSON สำหรับบทความ Blog (ภาษาไทย) ต้องเป็น valid JSON เท่านั้น ห้ามมี comment หรือ trailing comma:
{
  "title": "ชื่อบทความภาษาไทย เช่น คู่มือส่งออก [สินค้า] ด้วย ${term}",
  "slug": "incoterm-${term.toLowerCase()}-[product-name-english-kebab-case]-export-guide",
  "summary": "สรุปบทความ 2-3 ประโยค ภาษาไทย",
  "product": "ชื่อสินค้าไทย",
  "hsCode": "XXXXXX",
  "hsDescription": "คำอธิบาย HS Code ภาษาไทย",
  "destination": "ประเทศปลายทาง",
  "steps": ["ขั้นตอนที่ 1", "ขั้นตอนที่ 2", "ขั้นตอนที่ 3", "ขั้นตอนที่ 4", "ขั้นตอนที่ 5"],
  "agencies": ["หน่วยงาน 1 — URL", "หน่วยงาน 2 — URL", "หน่วยงาน 3 — URL"],
  "proTips": ["Pro Tip 1", "Pro Tip 2"],
  "tags": ["${term}", "Incoterms", "ส่งออก", "freight", "logistics"]
}

format ตอบกลับ:
CAPTION_START
[caption ทั้งหมด]
CAPTION_END
SCRIPT_START
[python script ทั้งหมด]
SCRIPT_END
BLOG_DATA_START
[JSON object]
BLOG_DATA_END`;

  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].text;

  const captionMatch  = text.match(/CAPTION_START\n([\s\S]*?)\nCAPTION_END/);
  const scriptMatch   = text.match(/SCRIPT_START\n([\s\S]*?)\nSCRIPT_END/);
  const blogDataMatch = text.match(/BLOG_DATA_START\n([\s\S]*?)\nBLOG_DATA_END/);

  // Strip asterisks used for markdown bold/italic — Facebook แสดงเป็น literal *
  const rawCaption = captionMatch ? captionMatch[1].trim() : '';
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
    caption:  cleanCaption,
    script:   scriptMatch ? scriptMatch[1].trim() : '',
    blogData,
  };
}

// โพสต์ภาพ+caption ลง Facebook (ใช้ curl เพื่อความเสถียร)
async function postToFacebook(imagePath, caption) {
  if (!PAGE2_TOKEN) throw new Error('FB_PAGE2_ACCESS_TOKEN not set');

  // เขียน caption ลง temp file เพื่อหลีกเลี่ยงปัญหา shell escaping
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

// สร้างบทความใน Notion Blog DB
async function postToNotionBlog(blogData, term, caption, fbUrl) {
  const notionToken = process.env.NOTION_TOKEN;
  const blogDb      = process.env.NOTION_BLOG_DB;
  if (!notionToken || !blogDb) throw new Error('NOTION_TOKEN หรือ NOTION_BLOG_DB ไม่ได้ตั้งค่า');

  // สร้าง rich text blocks จาก caption สำหรับ body ของบทความ
  const bodyBlocks = [];

  // Summary paragraph
  if (blogData.summary) {
    bodyBlocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: blogData.summary } }],
      },
    });
  }

  // HS Code section
  if (blogData.hsCode) {
    bodyBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '📦 สินค้าและ HS Code' } }] },
    });
    bodyBlocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: `สินค้า: ${blogData.product || '-'}\nHS Code: ${blogData.hsCode} — ${blogData.hsDescription || ''}\nประเทศปลายทาง: ${blogData.destination || '-'}` } }],
      },
    });
  }

  // Steps section
  if (blogData.steps && blogData.steps.length > 0) {
    bodyBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '🔢 ขั้นตอนการส่งออก' } }] },
    });
    for (const step of blogData.steps) {
      bodyBlocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: [{ type: 'text', text: { content: step } }] },
      });
    }
  }

  // Pro Tips section
  if (blogData.proTips && blogData.proTips.length > 0) {
    bodyBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '💡 Pro Tips จากผู้เชี่ยวชาญ' } }] },
    });
    for (const tip of blogData.proTips) {
      bodyBlocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: tip } }] },
      });
    }
  }

  // Agencies section
  if (blogData.agencies && blogData.agencies.length > 0) {
    bodyBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '🏢 หน่วยงานที่เกี่ยวข้อง' } }] },
    });
    for (const agency of blogData.agencies) {
      bodyBlocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: agency } }] },
      });
    }
  }

  // Facebook link
  if (fbUrl) {
    bodyBlocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '📱 ดูโพสต์ Facebook' } }] },
    });
    bodyBlocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: fbUrl, link: { url: fbUrl } } }],
      },
    });
  }

  // Full caption as callout
  bodyBlocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: [{ type: 'text', text: { content: '📄 เนื้อหา Facebook Post' } }] },
  });
  // Split caption into chunks of 2000 chars (Notion limit per rich_text block)
  const chunkSize = 1900;
  for (let i = 0; i < caption.length; i += chunkSize) {
    bodyBlocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: caption.slice(i, i + chunkSize) } }],
      },
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  const payload = {
    parent: { database_id: blogDb },
    properties: {
      'Title': {
        title: [{ text: { content: blogData.title || `คู่มือ ${term} — ${today}` } }],
      },
      'Slug': {
        rich_text: [{ text: { content: blogData.slug || `${term.toLowerCase()}-${Date.now()}` } }],
      },
      'Summary': {
        rich_text: [{ text: { content: (blogData.summary || '').slice(0, 2000) } }],
      },
      'Tags': {
        multi_select: (blogData.tags || [term, 'Incoterms', 'freight']).map(t => ({ name: t })),
      },
      'Published': {
        checkbox: true,
      },
      'Category': {
        select: { name: 'Incoterms' },
      },
      'Language': {
        select: { name: 'TH' },
      },
      'Author': {
        rich_text: [{ text: { content: 'PIT Freight Expert' } }],
      },
      'Published Date': {
        date: { start: today },
      },
    },
    children: bodyBlocks,
  };

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || JSON.stringify(data));
  return data;
}

// === Main job function ===
async function runAutoPost() {
  const now  = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  console.log(`\n[AutoPost] เริ่มต้น ${now}`);

  try {
    // 1. เตรียม fonts
    ensureFonts();

    // 2. เลือก Incoterm
    const term = pickTerm();
    console.log(`[AutoPost] Term: ${term}`);

    // 3. สร้าง content ผ่าน Claude
    console.log('[AutoPost] กำลังสร้าง content ด้วย Claude...');
    const { caption, script, blogData } = await generateContent(term);

    if (!script) throw new Error('Claude ไม่ได้ส่ง Python script กลับมา');

    // 4. รัน Python script สร้างภาพ
    console.log('[AutoPost] รัน Python PIL...');
    const scriptPath = '/tmp/auto_gen.py';
    // Strip markdown code fences if Claude wrapped the script
    const cleanScript = script
      .replace(/^```python\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    fs.writeFileSync(scriptPath, cleanScript);
    execFileSync('python3', [scriptPath], { timeout: 60000 });

    if (!fs.existsSync('/tmp/auto_post.jpg')) throw new Error('ไม่พบไฟล์ภาพ /tmp/auto_post.jpg');
    console.log('[AutoPost] สร้างภาพสำเร็จ');

    // 5. โพสต์ Facebook
    console.log('[AutoPost] โพสต์ Facebook...');
    const result = await postToFacebook('/tmp/auto_post.jpg', caption);
    const fbUrl = `https://www.facebook.com/${result.post_id}`;
    console.log(`[AutoPost] Facebook สำเร็จ! Post ID: ${result.post_id}`);
    console.log(`[AutoPost] Facebook URL: ${fbUrl}`);

    // 6. สร้าง Notion Blog post
    let blogUrl = '';
    try {
      console.log('[AutoPost] สร้าง Notion Blog...');
      if (blogData) {
        const notionResult = await postToNotionBlog(blogData, term, caption, fbUrl);
        blogUrl = `https://www.notion.so/${notionResult.id.replace(/-/g, '')}`;
        console.log(`[AutoPost] Notion Blog สำเร็จ! ID: ${notionResult.id}`);
      } else {
        console.log('[AutoPost] ไม่มี blogData — ข้ามการสร้าง Blog');
      }
    } catch (blogErr) {
      console.error(`[AutoPost] Blog ERROR (ไม่หยุด): ${blogErr.message}`);
    }

    // 7. ส่ง Slack notification (ถ้ามี)
    if (process.env.SLACK_WEBHOOK_URL) {
      const slackMsg = [
        `✅ *AutoPost สำเร็จ* — ${term}`,
        `📘 Facebook: ${fbUrl}`,
        blogUrl ? `📝 Blog: ${blogUrl}` : '📝 Blog: ข้ามการสร้าง (ไม่มี blogData)',
      ].join('\n');
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: slackMsg }),
      }).catch(() => {});
    }

  } catch (err) {
    console.error(`[AutoPost] ERROR: ${err.message}`);
    // แจ้ง Slack ถ้า error
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `❌ *AutoPost ล้มเหลว*: ${err.message}` }),
      }).catch(() => {});
    }
  }
}

// === ลงทะเบียน Cron Jobs ===
function startAutoPost() {
  // 08:00 ทุกวัน (Asia/Bangkok)
  cron.schedule('0 8 * * *', runAutoPost, { timezone: 'Asia/Bangkok' });
  // 15:00 ทุกวัน (Asia/Bangkok)
  cron.schedule('0 15 * * *', runAutoPost, { timezone: 'Asia/Bangkok' });

  console.log('[AutoPost] Cron jobs registered: 08:00 & 15:00 Asia/Bangkok');
}

module.exports = { startAutoPost, runAutoPost };
