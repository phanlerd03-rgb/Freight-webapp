const express = require('express');
const router = express.Router();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BLOG_DB = process.env.NOTION_BLOG_DB;

// Helper: parse Notion rich text to plain string
function richText(arr) {
  return arr?.map(t => t.plain_text).join('') || '';
}

// Helper: convert Notion blocks to HTML
function blocksToHtml(blocks) {
  let html = '';
  for (const b of blocks) {
    const t = b.type;
    const text = richText(b[t]?.rich_text || []);
    const styled = b[t]?.rich_text?.map(span => {
      let s = span.plain_text;
      if (span.annotations?.bold) s = `<strong>${s}</strong>`;
      if (span.annotations?.italic) s = `<em>${s}</em>`;
      if (span.annotations?.code) s = `<code>${s}</code>`;
      if (span.href) s = `<a href="${span.href}" target="_blank">${s}</a>`;
      return s;
    }).join('') || text;

    switch (t) {
      case 'heading_1': html += `<h1>${styled}</h1>`; break;
      case 'heading_2': html += `<h2>${styled}</h2>`; break;
      case 'heading_3': html += `<h3>${styled}</h3>`; break;
      case 'paragraph': html += styled ? `<p>${styled}</p>` : '<br>'; break;
      case 'bulleted_list_item': html += `<li>${styled}</li>`; break;
      case 'numbered_list_item': html += `<li>${styled}</li>`; break;
      case 'code': html += `<pre><code>${text}</code></pre>`; break;
      case 'quote': html += `<blockquote>${styled}</blockquote>`; break;
      case 'divider': html += `<hr>`; break;
      case 'table_row': {
        const cells = b.table_row?.cells?.map(c =>
          `<td>${c.map(x => x.plain_text).join('')}</td>`
        ).join('');
        html += `<tr>${cells}</tr>`;
        break;
      }
      case 'table': html += `<table class="blog-table">`; break;
      default: break;
    }
  }
  return html;
}

// GET /api/blog — list published posts
router.get('/', async (req, res) => {
  try {
    const { category, tag, lang, search, limit = 10, page = 1 } = req.query;

    const filters = [{ property: 'Published', checkbox: { equals: true } }];
    if (category) filters.push({ property: 'Category', select: { equals: category } });
    if (tag) filters.push({ property: 'Tags', multi_select: { contains: tag } });
    if (lang) filters.push({ property: 'Language', select: { equals: lang } });
    if (search) filters.push({ property: 'Title', title: { contains: search } });

    const response = await notion.databases.query({
      database_id: BLOG_DB,
      filter: { and: filters },
      sorts: [{ property: 'Published Date', direction: 'descending' }],
      page_size: Math.min(parseInt(limit), 50),
    });

    const posts = response.results.map(page => {
      const p = page.properties;
      return {
        id: page.id,
        title: richText(p.Title?.title),
        slug: richText(p.Slug?.rich_text) || page.id,
        summary: richText(p.Summary?.rich_text),
        cover: p['Cover Image']?.url || null,
        category: p.Category?.select?.name || null,
        tags: p.Tags?.multi_select?.map(t => t.name) || [],
        author: richText(p.Author?.rich_text),
        date: p['Published Date']?.date?.start || null,
        language: p.Language?.select?.name || 'th',
      };
    });

    res.json({ posts, hasMore: response.has_more });
  } catch (err) {
    console.error('Blog list error:', err.message);
    res.status(500).json({ error: 'Failed to load blog posts' });
  }
});

// GET /api/blog/debug-fb — ทดสอบ Facebook API จาก server
router.get('/debug-fb', async (req, res) => {
  const t1 = process.env.FB_PAGE_ACCESS_TOKEN || '';
  const pageId = process.env.FB_PAGE_ID;

  try {
    const params = new URLSearchParams({
      message: 'debug test from server',
      access_token: t1,
    });
    const r = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, { method: 'POST', body: params });
    const data = await r.json();
    res.json({ status: r.status, data, token_prefix: t1.substring(0, 20) });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// GET /api/blog/:slug — get single post with full content
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Find post by slug (or id)
    const response = await notion.databases.query({
      database_id: BLOG_DB,
      filter: {
        and: [
          { property: 'Published', checkbox: { equals: true } },
          { property: 'Slug', rich_text: { equals: slug } },
        ],
      },
      page_size: 1,
    });

    if (!response.results.length) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const page = response.results[0];
    const p = page.properties;

    // Fetch page blocks (content)
    const blocksRes = await notion.blocks.children.list({
      block_id: page.id,
      page_size: 100,
    });

    const contentHtml = blocksToHtml(blocksRes.results);

    res.json({
      id: page.id,
      title: richText(p.Title?.title),
      slug: richText(p.Slug?.rich_text),
      summary: richText(p.Summary?.rich_text),
      cover: p['Cover Image']?.url || null,
      category: p.Category?.select?.name || null,
      tags: p.Tags?.multi_select?.map(t => t.name) || [],
      author: richText(p.Author?.rich_text),
      date: p['Published Date']?.date?.start || null,
      language: p.Language?.select?.name || 'th',
      content: contentHtml,
    });
  } catch (err) {
    console.error('Blog post error:', err.message);
    res.status(500).json({ error: 'Failed to load post' });
  }
});

// POST /api/blog/broadcast — broadcast บทความไปยังทุกช่องทาง
// Body: { slug, adminPassword, channels? }
// channels: ["slack","facebook","line"] (default: slack + facebook ถ้ามี token)
router.post('/broadcast', async (req, res) => {
  try {
    const { slug, adminPassword, channels } = req.body;
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ดึงบทความจาก Notion
    const response = await notion.databases.query({
      database_id: BLOG_DB,
      filter: {
        and: [
          { property: 'Published', checkbox: { equals: true } },
          { property: 'Slug', rich_text: { equals: slug } },
        ],
      },
      page_size: 1,
    });

    if (!response.results.length) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const page = response.results[0];
    const p = page.properties;
    const title    = richText(p.Title?.title) || 'PIT Freight Blog';
    const summary  = richText(p.Summary?.rich_text) || '';
    const category = p.Category?.select?.name || '';
    const cover    = p['Cover Image']?.url || null;

    const emojiMap = { 'คู่มือ': '📋', 'ข่าวสาร': '📰', 'กฎระเบียบ': '⚖️', 'ราคา & โปรโมชัน': '🏷️', 'เคล็ดลับ': '💡' };
    const colorMap = { 'คู่มือ': '#1a3a5c', 'ข่าวสาร': '#0071e3', 'กฎระเบียบ': '#7c3aed', 'ราคา & โปรโมชัน': '#e05c19', 'เคล็ดลับ': '#27ae60' };

    const results = {};

    // ===== Slack =====
    try {
      const slackService = require('../services/slack');
      await slackService.postBlog({ title, summary, slug, category, cover });
      results.slack = '✅ ส่งสำเร็จ';
    } catch (e) { results.slack = '❌ ' + e.message; }

    // ===== Facebook Page (ถ้ามี token) =====
    if (process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN) {
      try {
        const fbService = require('../services/facebook');
        const fbResult = await fbService.postBlogToFacebook({ title, summary, slug, category, cover });
        const urls = fbResult.pages?.map(p => p.url).join(', ') || fbResult.url || '';
        results.facebook = `✅ โพสต์สำเร็จ ${fbResult.pages?.length || 1} Page — ${urls}`;
      } catch (e) { results.facebook = '❌ ' + e.message; }
    } else {
      results.facebook = '⚠️ ข้ามเพราะยังไม่ได้ตั้งค่า FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN';
    }

    // ===== LINE OA (optional — เปิดใช้ถ้า channels รวม "line") =====
    if (Array.isArray(channels) && channels.includes('line')) {
      try {
        const lineService = require('../services/lineoa');
        await lineService.broadcastBlog({
          title, summary, slug,
          emoji: emojiMap[category] || '📄',
          color: colorMap[category] || '#1a3a5c',
        });
        results.line = '✅ ส่งสำเร็จ';
      } catch (e) { results.line = '❌ ' + e.message; }
    }

    res.json({ success: true, title, results });
  } catch (err) {
    console.error('Blog broadcast error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
