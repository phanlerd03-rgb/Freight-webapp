const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const lineService = require('../services/lineoa');

// Line OA Webhook
// Line ต้องการ response 200 เสมอ ห้าม return error status
router.post('/line', async (req, res) => {
  // ตอบ 200 ทันทีก่อนเลย — Line platform จะ timeout ถ้ารอนาน
  res.status(200).json({ success: true });

  try {
    const secret = process.env.LINE_CHANNEL_SECRET;
    if (secret) {
      const sig = req.headers['x-line-signature'];
      // body ถูก parse โดย express.json() แล้ว — ต้อง stringify ก่อน verify
      const rawBody = JSON.stringify(req.body);
      const hmac = crypto.createHmac('SHA256', secret).update(rawBody).digest('base64');
      if (sig && sig !== hmac) {
        console.warn('Line webhook: invalid signature');
        return;
      }
    }

    const events = req.body?.events || [];
    if (events.length > 0) {
      await lineService.handleWebhook(events);
    }
  } catch (err) {
    console.error('Line webhook error:', err.message);
    // ไม่ส่ง error response เพราะ res ถูก send ไปแล้ว
  }
});

module.exports = router;
