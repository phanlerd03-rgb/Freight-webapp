/**
 * ===== PIT FREIGHT — DFT News Auto-Importer =====
 *
 * ดึงข่าวจาก กรมการค้าต่างประเทศ (dft.go.th) อัตโนมัติ
 * เน้นข่าวที่มีประโยชน์ต่อผู้ประกอบการนำเข้า-ส่งออก
 * → Claude AI สรุปและวิเคราะห์ผลกระทบต่อธุรกิจ
 * → สร้าง Notion Blog Post โดยอัตโนมัติ
 */

require('dotenv').config({ override: true });
const axios = require('axios');
const cheerio = require('cheerio');
const { pickImage } = require('./newsImagePicker');
const { Client } = require('@notionhq/client');
const Anthropic = require('@anthropic-ai/sdk');

function getNotion() { return new Client({ auth: process.env.NOTION_TOKEN }); }
function getClaude() { return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }
function getBlogDb() { return process.env.NOTION_BLOG_DB; }

const BASE_URL = 'https://www.dft.go.th';
const NEWS_LIST_URL = `${BASE_URL}/th-th/NewsList/News-DFT`;
const HOT_NEWS_URL = `${BASE_URL}/th-th/HotNews`;

// Keywords ที่เกี่ยวข้องกับนำเข้า-ส่งออก
const RELEVANT_KEYWORDS = [
  'ส่งออก', 'นำเข้า', 'ศุลกากร', 'ภาษี', 'มาตรการ', 'ใบอนุญาต', 'Form',
  'Certificate', 'C/O', 'กฎระเบียบ', 'ประกาศ', 'พิกัด', 'อัตรา', 'สิทธิ',
  'FTA', 'AFTA', 'RCEP', 'WTO', 'ทุ่มตลาด', 'โควตา', 'มาตรฐาน', 'ด่าน',
  'ขนส่ง', 'โลจิสติกส์', 'ตลาด', 'บาท', 'สินค้า', 'ธุรกิจ', 'ผู้ประกอบการ',
];

// ===== Notion-based deduplication (Railway-safe — no local file) =====
// ตรวจสอบว่า DFT articleId นี้มีอยู่ใน Notion แล้วหรือยัง
async function isAlreadyImported(articleId) {
  try {
    const res = await getNotion().databases.query({
      database_id: getBlogDb(),
      filter: {
        property: 'Slug',
        rich_text: { starts_with: `dft-${articleId}-` },
      },
      page_size: 1,
    });
    return res.results.length > 0;
  } catch (e) {
    console.log(`  ⚠️  ตรวจสอบ Notion dedup ไม่ได้: ${e.message}`);
    return false; // allow import if check fails
  }
}

// Check if news is relevant to importers/exporters
function isRelevant(title) {
  const titleLower = title.toLowerCase();
  return RELEVANT_KEYWORDS.some(kw => title.includes(kw) || titleLower.includes(kw.toLowerCase()));
}

// Fetch DFT news list
async function fetchNewsList(url, limit = 15) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PIT-Freight-Bot/1.0)' },
    timeout: 15000,
    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
  });

  const $ = cheerio.load(res.data);
  const items = [];

  // DFT structure: <a href="...Description-News-DFT/ArticleId/{id}/{id}">Title</a>
  $('a[href*="ArticleId"]').each((i, el) => {
    if (items.length >= limit) return false;

    const href = $(el).attr('href') || '';
    const title = $(el).text().trim();

    if (!title || title.length < 10) return;

    // Extract ArticleId
    const match = href.match(/ArticleId\/(\d+)/);
    if (!match) return;

    const articleId = match[1];
    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    // Avoid duplicates within this fetch
    if (items.some(x => x.articleId === articleId)) return;

    items.push({ title, articleId, url: fullUrl });
  });

  return items;
}

// Fetch article content from DFT
async function fetchArticleContent(url) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PIT-Freight-Bot/1.0)' },
    timeout: 15000,
    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
  });

  const $ = cheerio.load(res.data);
  $('nav, header, footer, .menu, script, style, noscript, .sidebar').remove();

  // DFT article content selectors
  let content = '';
  const selectors = [
    '.DNNArticle .article-content', '.DNNArticle .item-content',
    '.article-body', '#dnn_ContentPane', '.userContent',
    '.article-container', 'article', '.content-body',
  ];

  for (const sel of selectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 100) {
      content = el.text().trim();
      break;
    }
  }

  if (!content || content.length < 100) {
    const parts = [];
    $('p, .article-text').each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 30) parts.push(t);
    });
    content = parts.join('\n\n');
  }

  // Try to get date
  let dateText = '';
  $('[class*="date"], [class*="Date"], time, .publish-date').each((_, el) => {
    const t = $(el).text().trim();
    if (t.match(/\d{4}|\d{2}\/\d{2}/)) { dateText = t; return false; }
  });

  return { content: content.substring(0, 3000), dateText };
}

// Use Claude AI to summarize
async function summarizeWithClaude(title, rawContent) {
  const prompt = `คุณเป็นที่ปรึกษาด้านการค้าระหว่างประเทศของบริษัท PIT Freight ผู้ให้บริการขนส่งสินค้าระหว่างประเทศ

ข่าวจากกรมการค้าต่างประเทศ (คต.):
ชื่อเรื่อง: ${title}
${rawContent ? `เนื้อหา: ${rawContent}` : '(ไม่มีเนื้อหาเพิ่มเติม — วิเคราะห์จากชื่อข่าว)'}

กรุณาเขียนบทความอธิบายสำหรับผู้ประกอบการไทยที่นำเข้า-ส่งออก:

**สรุปสั้น**: (1-2 ประโยค อธิบายว่าข่าวนี้คืออะไร)

**สาระสำคัญ**:
- (2-4 ข้อ อธิบายรายละเอียด)

**ผลกระทบต่อผู้ส่งออก/นำเข้า**:
- (1-3 ข้อ บอกว่ากระทบธุรกิจอย่างไร)

**คำแนะนำจาก PIT Freight**:
(แนะนำสิ่งที่ควรทำ หรือเตรียมตัวอย่างไร)

ตอบเป็นภาษาไทย กระชับ ชัดเจน เป็นประโยชน์`;

  const msg = await getClaude().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 900,
    messages: [{ role: 'user', content: prompt }],
  });

  return msg.content[0].text;
}

// Parse date from various Thai/English formats
function parseDate(dateText) {
  if (!dateText) return new Date().toISOString().split('T')[0];

  const thaiMonths = {
    'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03', 'เมษายน': '04',
    'พฤษภาคม': '05', 'มิถุนายน': '06', 'กรกฎาคม': '07', 'สิงหาคม': '08',
    'กันยายน': '09', 'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12',
  };

  // Thai Buddhist Era: "11 พฤษภาคม 2569"
  const thaiMatch = dateText.match(/(\d+)\s+([ก-๙]+)\s+(\d{4})/);
  if (thaiMatch && thaiMonths[thaiMatch[2]]) {
    return `${parseInt(thaiMatch[3]) - 543}-${thaiMonths[thaiMatch[2]]}-${thaiMatch[1].padStart(2, '0')}`;
  }

  // DD/MM/YYYY or YYYY-MM-DD
  const numMatch = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (numMatch) return `${parseInt(numMatch[3]) > 2500 ? parseInt(numMatch[3]) - 543 : numMatch[3]}-${numMatch[2]}-${numMatch[1]}`;

  return new Date().toISOString().split('T')[0];
}

// Create Notion blog post
async function createNotionPost(title, summary, content, articleId, date, sourceUrl) {
  const slug = `dft-${articleId}-${Date.now().toString(36)}`;

  await getNotion().pages.create({
    parent: { database_id: getBlogDb() },
    properties: {
      Title: { title: [{ text: { content: title } }] },
      Slug: { rich_text: [{ text: { content: slug } }] },
      Summary: { rich_text: [{ text: { content: summary.substring(0, 200) } }] },
      Category: { select: { name: 'ข่าวสาร' } },
      Tags: { multi_select: [{ name: 'กฎระเบียบ' }] },
      Author: { rich_text: [{ text: { content: 'กรมการค้าต่างประเทศ (Auto)' } }] },
      'Cover Image': { url: pickImage(title, articleId) },
      'Published Date': { date: { start: date } },
      Published: { checkbox: true },
      Language: { select: { name: 'th' } },
    },
    children: [
      {
        object: 'block', type: 'callout',
        callout: {
          rich_text: [{ text: { content: '📢 ข่าวนี้นำเข้าอัตโนมัติจากกรมการค้าต่างประเทศ (dft.go.th)' } }],
          icon: { emoji: '🏢' }, color: 'green_background',
        },
      },
      ...content.split('\n\n').filter(p => p.trim()).map(para => ({
        object: 'block', type: 'paragraph',
        paragraph: { rich_text: [{ text: { content: para.trim().substring(0, 1900) } }] },
      })),
      { object: 'block', type: 'divider', divider: {} },
      {
        object: 'block', type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: '🔗 ดูข่าวต้นฉบับที่กรมการค้าต่างประเทศ', link: { url: sourceUrl } } }],
        },
      },
    ],
  });

  return slug;
}

// ===== MAIN FUNCTION =====
async function runDftScraper() {
  console.log(`\n🏢  [${new Date().toLocaleString('th-TH')}] เริ่มดึงข่าวกรมการค้าต่างประเทศ...`);

  if (!getBlogDb() || !process.env.NOTION_TOKEN) {
    console.log('⚠️  ยังไม่ได้ตั้งค่า NOTION_BLOG_DB หรือ NOTION_TOKEN');
    return { imported: 0, skipped: 0 };
  }

  let imported = 0;
  let skipped = 0;

  try {
    // Fetch from both news list and hot news
    const [newsItems, hotItems] = await Promise.all([
      fetchNewsList(NEWS_LIST_URL, 10),
      fetchNewsList(HOT_NEWS_URL, 5),
    ]);

    // Combine and deduplicate within fetch
    const allItems = [...newsItems];
    for (const item of hotItems) {
      if (!allItems.some(x => x.articleId === item.articleId)) allItems.push(item);
    }

    console.log(`📋 พบข่าวทั้งหมด ${allItems.length} รายการ`);

    for (const item of allItems) {
      // Skip already imported — ตรวจสอบจาก Notion โดยตรง (Railway-safe)
      const alreadyImported = await isAlreadyImported(item.articleId);
      if (alreadyImported) { skipped++; continue; }

      // Filter: only relevant news for importers/exporters
      if (!isRelevant(item.title)) {
        console.log(`  ⏭️  ข้ามข่าวไม่เกี่ยวข้อง: ${item.title.substring(0, 50)}...`);
        skipped++;
        continue;
      }

      console.log(`📰 กำลังนำเข้า: ${item.title.substring(0, 60)}...`);

      try {
        let rawContent = '';
        let dateText = '';
        try {
          const result = await fetchArticleContent(item.url);
          rawContent = result.content;
          dateText = result.dateText;
        } catch (e) {
          console.log(`  ⚠️  ดึงเนื้อหาไม่ได้ — ใช้ AI สรุปจากชื่อข่าว`);
        }

        const aiContent = await summarizeWithClaude(item.title, rawContent);
        const summaryLine = aiContent.split('\n').find(l => l.trim().length > 20 && !l.startsWith('#') && !l.startsWith('**')) || item.title;
        const cleanSummary = summaryLine.replace(/^\*+|\*+$/g, '').trim();
        const isoDate = parseDate(dateText);

        await createNotionPost(item.title, cleanSummary, aiContent, item.articleId, isoDate, item.url);
        imported++;

        console.log(`  ✅ นำเข้าสำเร็จ (${isoDate})`);
        await new Promise(r => setTimeout(r, 2000));

      } catch (err) {
        console.error(`  ❌ ข้อผิดพลาด: ${err.message}`);
      }
    }

    console.log(`\n✅ เสร็จสิ้น DFT — นำเข้าใหม่: ${imported} | ข้าม: ${skipped}`);
    return { imported, skipped };

  } catch (err) {
    console.error('❌ DFT Scraper error:', err.message);
    return { imported, skipped, error: err.message };
  }
}

module.exports = { runDftScraper };
