/**
 * ===== PIT FREIGHT — Thai Customs News Auto-Importer =====
 *
 * ดึงข่าวจาก กรมศุลกากร (customs.go.th) อัตโนมัติทุกวัน
 * → Claude AI สรุปและเพิ่มคำอธิบายที่เป็นประโยชน์
 * → สร้าง Notion Blog Post โดยอัตโนมัติ
 */

require('dotenv').config({ override: true });
const axios = require('axios');
const cheerio = require('cheerio');
const { Client } = require('@notionhq/client');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');

// Initialize clients lazily so env vars are read at call-time
function getNotion() { return new Client({ auth: process.env.NOTION_TOKEN }); }
function getClaude() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }
function getBlogDb() { return process.env.NOTION_BLOG_DB; }

const BASE_URL = 'https://www.customs.go.th';
const NEWS_LIST_URL = `${BASE_URL}/list_strc_simple_with_date.php?ini_content=customs_news&ini_menu=menu_public_relations_160421_04&order_by=date&sort_type=0`;

// Track imported article IDs to avoid duplicates
const IMPORTED_IDS_FILE = path.join(__dirname, '../data/customs_imported.json');

function loadImportedIds() {
  try {
    if (!fs.existsSync(IMPORTED_IDS_FILE)) {
      fs.mkdirSync(path.dirname(IMPORTED_IDS_FILE), { recursive: true });
      fs.writeFileSync(IMPORTED_IDS_FILE, JSON.stringify([]));
      return new Set();
    }
    const data = JSON.parse(fs.readFileSync(IMPORTED_IDS_FILE, 'utf8'));
    return new Set(data);
  } catch {
    return new Set();
  }
}

function saveImportedId(id) {
  const ids = loadImportedIds();
  ids.add(id);
  fs.writeFileSync(IMPORTED_IDS_FILE, JSON.stringify([...ids]));
}

// Fetch list of latest news from customs.go.th
async function fetchNewsList(limit = 10) {
  const res = await axios.get(NEWS_LIST_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PIT-Freight-Bot/1.0)' },
    timeout: 15000,
  });

  const $ = cheerio.load(res.data);
  const items = [];

  // Each news link is inside td[2] of a 5-column table row
  // Structure: td[0]=no, td[1]=icon, td[2]=title+link, td[3]=date, td[4]=views
  $('a[href*="cont_strc_simple_with_date"]').each((i, el) => {
    if (items.length >= limit) return false;

    const href = $(el).attr('href') || '';
    const title = $(el).closest('td').text().trim() || $(el).text().trim();
    const row = $(el).closest('tr');
    const cells = row.find('td');
    const dateText = cells.length >= 4 ? $(cells[3]).text().trim() : '';

    if (!title || title.length < 5) return;

    // Extract current_id
    const match = href.match(/current_id=([a-f0-9]+)/i);
    if (!match) return;

    const articleId = match[1];
    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}/${href}`;

    items.push({ title, articleId, url: fullUrl, dateText });
  });

  return items;
}

// Fetch full article content
async function fetchArticleContent(url) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PIT-Freight-Bot/1.0)' },
    timeout: 15000,
  });

  const $ = cheerio.load(res.data);

  // Remove nav/menu/footer noise
  $('nav, header, footer, .menu, script, style, noscript').remove();

  // Try to get main content
  let content = '';
  const contentSelectors = [
    '.content-body', '.article-content', '#content', '.main-content',
    'article', '.news-content', 'td.td_text', '.text_content'
  ];

  for (const sel of contentSelectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 100) {
      content = el.text().trim();
      break;
    }
  }

  // Fallback: get all paragraph text
  if (!content || content.length < 100) {
    const paragraphs = [];
    $('p, .content p').each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 20) paragraphs.push(t);
    });
    content = paragraphs.join('\n\n');
  }

  return content.substring(0, 3000); // limit for Claude
}

// Use Claude AI to summarize and add business context
async function summarizeWithClaude(title, rawContent) {
  const prompt = `คุณเป็นผู้เชี่ยวชาญด้านพิธีการศุลกากรและการขนส่งสินค้าระหว่างประเทศของบริษัท PIT Freight

ข่าวจากกรมศุลกากร:
ชื่อเรื่อง: ${title}
เนื้อหา: ${rawContent || '(ไม่มีเนื้อหาเพิ่มเติม)'}

กรุณาเขียน:
1. **สรุปสั้น (1-2 ประโยค)**: อธิบายว่าข่าวนี้เกี่ยวกับอะไร ใช้ภาษาที่เข้าใจง่าย
2. **สาระสำคัญ**: อธิบายรายละเอียด 2-4 ข้อ
3. **กระทบต่อผู้ส่งออก/นำเข้าอย่างไร**: บอกผลกระทบต่อธุรกิจ 1-2 ข้อ
4. **คำแนะนำจาก PIT Freight**: แนะนำสิ่งที่ลูกค้าควรทำ

ตอบเป็นภาษาไทย กระชับ ชัดเจน เป็นประโยชน์`;

  const msg = await getClaude().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  return msg.content[0].text;
}

// Parse Thai date string to ISO format
function parseThaiDate(dateText) {
  if (!dateText) return new Date().toISOString().split('T')[0];
  const thaiMonths = {
    'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03', 'เมษายน': '04',
    'พฤษภาคม': '05', 'มิถุนายน': '06', 'กรกฎาคม': '07', 'สิงหาคม': '08',
    'กันยายน': '09', 'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12',
  };
  const match = dateText.match(/(\d+)\s+([฀-๿]+)\s+(\d+)/);
  if (!match) return new Date().toISOString().split('T')[0];
  const day = match[1].padStart(2, '0');
  const month = thaiMonths[match[2]] || '01';
  const year = String(parseInt(match[3]) - 543); // Convert Buddhist Era to CE
  return `${year}-${month}-${day}`;
}

// Create Notion blog post
async function createNotionPost(title, summary, content, articleId, date) {
  const slug = `customs-${articleId.slice(-8)}-${Date.now().toString(36)}`;

  await getNotion().pages.create({
    parent: { database_id: getBlogDb() },
    properties: {
      Title: { title: [{ text: { content: title } }] },
      Slug: { rich_text: [{ text: { content: slug } }] },
      Summary: { rich_text: [{ text: { content: summary.substring(0, 200) } }] },
      Category: { select: { name: 'ข่าวสาร' } },
      Tags: { multi_select: [{ name: 'กฎระเบียบ' }, { name: 'ศุลกากร' }] },
      Author: { rich_text: [{ text: { content: 'กรมศุลกากร (Auto)' } }] },
      'Cover Image': { url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80' },
      'Published Date': { date: { start: date } },
      Published: { checkbox: true },
      Language: { select: { name: 'th' } },
    },
    children: [
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ text: { content: '📢 ข่าวนี้นำเข้าอัตโนมัติจากเว็บไซต์กรมศุลกากร (customs.go.th)' } }],
          icon: { emoji: '🏛️' },
          color: 'blue_background',
        },
      },
      ...content.split('\n\n').filter(p => p.trim()).map(para => ({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: para.trim().substring(0, 1900) } }],
        },
      })),
      {
        object: 'block',
        type: 'divider',
        divider: {},
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            text: { content: '🔗 ดูข่าวต้นฉบับที่เว็บไซต์กรมศุลกากร' },
            href: BASE_URL,
          }],
        },
      },
    ],
  });

  return slug;
}

// ===== MAIN FUNCTION =====
async function runCustomsScraper() {
  console.log(`\n🏛️  [${new Date().toLocaleString('th-TH')}] เริ่มดึงข่าวกรมศุลกากร...`);

  if (!getBlogDb() || !process.env.NOTION_TOKEN) {
    console.log('⚠️  ยังไม่ได้ตั้งค่า NOTION_BLOG_DB หรือ NOTION_TOKEN');
    return { imported: 0, skipped: 0 };
  }

  const importedIds = loadImportedIds();
  let imported = 0;
  let skipped = 0;

  try {
    const newsList = await fetchNewsList(10);
    console.log(`📋 พบข่าวทั้งหมด ${newsList.length} รายการ`);

    for (const item of newsList) {
      // Skip if already imported
      if (importedIds.has(item.articleId)) {
        skipped++;
        continue;
      }

      console.log(`📰 กำลังนำเข้า: ${item.title.substring(0, 60)}...`);

      try {
        // Fetch article content (gracefully handle 403/errors)
        let rawContent = '';
        try {
          rawContent = await fetchArticleContent(item.url);
        } catch (fetchErr) {
          console.log(`  ⚠️  ดึงเนื้อหาไม่ได้ (${fetchErr.message}) — ใช้ AI สรุปจากชื่อข่าว`);
        }

        // Summarize with Claude
        const aiContent = await summarizeWithClaude(item.title, rawContent);

        // Extract first sentence as summary
        const summaryLine = aiContent.split('\n').find(l => l.trim().length > 20) || item.title;
        const cleanSummary = summaryLine.replace(/^\*+|\*+$/g, '').replace(/^สรุปสั้น.*?:\s*/i, '').trim();

        // Parse date
        const isoDate = parseThaiDate(item.dateText);

        // Create Notion post
        await createNotionPost(item.title, cleanSummary, aiContent, item.articleId, isoDate);

        // Mark as imported
        saveImportedId(item.articleId);
        imported++;

        console.log(`  ✅ นำเข้าสำเร็จ (${isoDate})`);

        // Rate limit: wait 2 seconds between articles
        await new Promise(r => setTimeout(r, 2000));

      } catch (err) {
        console.error(`  ❌ ข้อผิดพลาด: ${err.message}`);
      }
    }

    console.log(`\n✅ เสร็จสิ้น — นำเข้าใหม่: ${imported} | ข้ามแล้ว: ${skipped}`);
    return { imported, skipped };

  } catch (err) {
    console.error('❌ Scraper error:', err.message);
    return { imported, skipped, error: err.message };
  }
}

module.exports = { runCustomsScraper };
