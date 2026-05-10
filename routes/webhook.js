const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const lineService = require('../services/lineoa');

// Line OA Webhook
router.post('/line', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.LINE_CHANNEL_SECRET;
    if (secret) {
      const sig = req.headers['x-line-signature'];
      const body = req.body;
      const hmac = crypto.createHmac('SHA256', secret).update(body).digest('base64');
      if (sig !== hmac) return res.status(403).json({ error: 'Invalid signature' });
    }

    const body = JSON.parse(req.body.toString());
    await lineService.handleWebhook(body.events || []);
    res.json({ success: true });
  } catch (err) {
    console.error('Line webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
