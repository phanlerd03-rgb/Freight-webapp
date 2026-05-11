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
    const { category, tag, limit = 10, page = 1 } = req.query;

    const filters = [{ property: 'Published', checkbox: { equals: true } }];
    if (category) filters.push({ property: 'Category', select: { equals: category } });
    if (tag) filters.push({ property: 'Tags', multi_select: { contains: tag } });

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

module.exports = router;
