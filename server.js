require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

const quoteRoutes = require('./routes/quote');
const bookingRoutes = require('./routes/booking');
const trackingRoutes = require('./routes/tracking');
const webhookRoutes = require('./routes/webhook');
const chatRoutes = require('./routes/chat');
const blogRoutes = require('./routes/blog');
const cronRoutes = require('./routes/cron');
const productsRoutes = require('./routes/products');
const alibabaRoutes = require('./routes/alibaba');

app.use('/api/quote', quoteRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/alibaba', alibabaRoutes);

// ===== /blog/:slug — Open Graph meta tags for Facebook Share =====
app.get('/blog/:slug', async (req, res) => {
  const { slug } = req.params;
  const siteUrl = process.env.SITE_URL || 'https://pitfreight.com';

  try {
    const { Client } = require('@notionhq/client');
    const notion = new Client({ auth: process.env.NOTION_TOKEN });

    const response = await notion.databases.query({
      database_id: process.env.NOTION_BLOG_DB,
      filter: {
        and: [
          { property: 'Published', checkbox: { equals: true } },
          { property: 'Slug', rich_text: { equals: slug } },
        ],
      },
      page_size: 1,
    });

    if (!response.results.length) {
      return res.redirect('/#blog');
    }

    const page = response.results[0];
    const p = page.properties;
    const title = p.Title?.title?.map(t => t.plain_text).join('') || 'PIT Freight Blog';
    const summary = p.Summary?.rich_text?.map(t => t.plain_text).join('') || 'บทความจาก PIT Freight';
    const cover = p['Cover Image']?.url || `${siteUrl}/images/og-default.jpg`;
    const pageUrl = `${siteUrl}/blog/${slug}`;

    const esc = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    res.send(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — PIT Freight</title>

  <!-- Open Graph (Facebook) -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${esc(pageUrl)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(summary)}">
  <meta property="og:image" content="${esc(cover)}">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="420">
  <meta property="og:site_name" content="PIT Freight">
  <meta property="og:locale" content="th_TH">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(summary)}">
  <meta name="twitter:image" content="${esc(cover)}">

  <!-- SEO -->
  <meta name="description" content="${esc(summary)}">

  <!-- Redirect to main app (delay so Facebook scraper can read OG tags) -->
  <script>
    // Only redirect real browsers, not scrapers
    if (!/facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp/i.test(navigator.userAgent)) {
      window.location.replace('/#blog-${slug}');
    }
  </script>
</head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc">
  <div style="text-align:center;padding:40px">
    <img src="/images/logo.png" alt="PIT Freight" style="height:60px;margin-bottom:20px" onerror="this.style.display='none'">
    <h2 style="color:#1e3a5f;margin-bottom:8px">${esc(title)}</h2>
    <p style="color:#64748b;margin-bottom:24px">${esc(summary)}</p>
    <a href="/#blog-${slug}" style="background:#e64d2e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">อ่านบทความ →</a>
  </div>
</body>
</html>`);
  } catch (err) {
    console.error('OG route error:', err.message);
    res.redirect('/#blog');
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚢 Freight Webapp running at http://localhost:${PORT}\n`);
});
