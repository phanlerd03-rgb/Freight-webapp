const express = require('express');
const router = express.Router();
const db = require('../data/db');

router.get('/:trackingNumber', (req, res) => {
  const { trackingNumber } = req.params;
  const booking = db.findByTracking(trackingNumber.toUpperCase());
  if (!booking) return res.status(404).json({ error: 'ไม่พบหมายเลขติดตามนี้ กรุณาตรวจสอบอีกครั้ง' });
  res.json({ success: true, tracking: booking });
});

module.exports = router;
