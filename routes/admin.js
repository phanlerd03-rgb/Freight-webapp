/**
 * ===== PIT FREIGHT — Admin Panel API =====
 * POST /api/admin/login        — เข้าสู่ระบบ
 * GET  /api/admin/products     — ดูสินค้า Pending
 * POST /api/admin/products/:id/approve  — อนุมัติ
 * POST /api/admin/products/:id/reject   — ปฏิเสธ
 * GET  /api/admin/stats        — สรุปตัวเลข
 */

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { Client } = require('@notionhq/client');

// ─── helpers ──────────────────────────────────────────────
function notion()     { return new Client({ auth: process.env.NOTION_TOKEN }); }
function productsDb() { return process.env.NOTION_PRODUCTS_DB; }

function makeToken(password) {
  const secret = process.env.ADMIN_PASSWORD || 'pitfreight-secret';
  return crypto.createHmac('sha256', secret).update(password + ':pitadmin').digest('hex');
}

function authMiddleware(req, res, next) {
  const auth  = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  const expected = makeToken(process.env.ADMIN_PASSWORD || 'pitfreight2024');
  if (!token || token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── POST /api/admin/login ────────────────────────────────
router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || 'pitfreight2024';

  if (!password || password !== adminPass) {
    return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
  }

  const token = makeToken(adminPass);
  res.json({ success: true, token });
});

// ─── GET /api/admin/stats ─────────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [pendingRes, publishedRes, rejectedRes] = await Promise.all([
      notion().databases.query({ database_id: productsDb(), filter: { property: 'Status', select: { equals: 'Pending' } } }),
      notion().databases.query({ database_id: productsDb(), filter: { property: 'Status', select: { equals: 'Published' } } }),
      notion().databases.query({ database_id: productsDb(), filter: { property: 'Status', select: { equals: 'Rejected' } } }),
    ]);
    res.json({
      pending:   pendingRes.results.length,
      published: publishedRes.results.length,
      rejected:  rejectedRes.results.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/products ──────────────────────────────
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const { status = 'Pending' } = req.query;
    const r = await notion().databases.query({
      database_id: productsDb(),
      filter: { property: 'Status', select: { equals: status } },
      sorts: [{ property: 'Submitted Date', direction: 'descending' }],
      page_size: 50,
    });

    const products = r.results.map(p => ({
      id:          p.id,
      nameTH:      p.properties['Product Name TH']?.title?.[0]?.plain_text || '',
      nameEN:      p.properties['Product Name EN']?.rich_text?.[0]?.plain_text || '',
      category:    p.properties['Category']?.select?.name || '',
      descriptionTH: p.properties['Description TH']?.rich_text?.[0]?.plain_text || '',
      cover:       p.properties['Cover Image']?.url || '',
      priceRange:  p.properties['Price Range']?.rich_text?.[0]?.plain_text || '',
      moq:         p.properties['MOQ']?.rich_text?.[0]?.plain_text || '',
      province:    p.properties['Province']?.rich_text?.[0]?.plain_text || '',
      sellerName:  p.properties['Seller Name']?.rich_text?.[0]?.plain_text || '',
      sellerEmail: p.properties['Seller Email']?.email || '',
      sellerPhone: p.properties['Seller Phone']?.phone_number || '',
      status:      p.properties['Status']?.select?.name || '',
      date:        p.properties['Submitted Date']?.date?.start || '',
    }));

    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/products/:id/approve ─────────────────
router.post('/products/:id/approve', authMiddleware, async (req, res) => {
  try {
    await notion().pages.update({
      page_id: req.params.id,
      properties: { 'Status': { select: { name: 'Published' } } },
    });
    res.json({ success: true, message: 'อนุมัติสินค้าเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/products/:id/reject ──────────────────
router.post('/products/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { reason = '' } = req.body;
    await notion().pages.update({
      page_id: req.params.id,
      properties: {
        'Status': { select: { name: 'Rejected' } },
        ...(reason ? { 'Reject Reason': { rich_text: [{ text: { content: reason } }] } } : {}),
      },
    });
    res.json({ success: true, message: 'ปฏิเสธสินค้าเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
