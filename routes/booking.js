const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../data/db');
const emailService = require('../services/email');
const notionService = require('../services/notion');
const slackService = require('../services/slack');
const lineService = require('../services/lineoa');
const gsService = require('../services/googlesheet');

function generateTracking() {
  const prefix = 'PIT';
  const num = Date.now().toString().slice(-9);
  return `${prefix}${num}`;
}

router.post('/create', async (req, res) => {
  try {
    const {
      senderName, senderEmail, senderPhone, senderAddress,
      recipientName, recipientEmail, recipientPhone, recipientAddress,
      origin, destination, cargoType, weight, dimensions,
      shippingMethod, declaredValue, notes, estimatedCost,
    } = req.body;

    if (!senderName || !senderEmail || !origin || !destination || !weight || !shippingMethod) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
    }

    const booking = {
      id: uuidv4(),
      trackingNumber: generateTracking(),
      senderName, senderEmail, senderPhone: senderPhone || '', senderAddress: senderAddress || '',
      recipientName: recipientName || '', recipientEmail: recipientEmail || '',
      recipientPhone: recipientPhone || '', recipientAddress: recipientAddress || '',
      origin, destination, cargoType: cargoType || 'สินค้าทั่วไป',
      weight: parseFloat(weight), dimensions: dimensions || '',
      shippingMethod, declaredValue: parseFloat(declaredValue) || 0,
      estimatedCost: parseFloat(estimatedCost) || 0,
      notes: notes || '', status: 'processing',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      timeline: [{ status: 'processing', message: 'รับการจองแล้ว', timestamp: new Date().toISOString() }],
    };

    db.addBooking(booking);

    await Promise.allSettled([
      emailService.sendBookingConfirmation(booking),
      notionService.addBookingToNotion(booking),
      slackService.newBookingAlert(booking),
      lineService.notifyBooking(booking),
      gsService.logBooking(booking),
    ]);

    res.json({ success: true, trackingNumber: booking.trackingNumber, booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/list', (req, res) => {
  const bookings = db.getBookings().slice(0, 50);
  res.json({ success: true, bookings });
});

router.patch('/status', async (req, res) => {
  try {
    const { trackingNumber, status, message } = req.body;
    if (!trackingNumber || !status) return res.status(400).json({ error: 'Missing fields' });

    const booking = db.updateStatus(trackingNumber, status, message);
    if (!booking) return res.status(404).json({ error: 'ไม่พบหมายเลขติดตามนี้' });

    await Promise.allSettled([
      emailService.sendStatusUpdate({ ...booking, email: booking.senderEmail, message }),
      notionService.updateBookingStatus(trackingNumber, status),
      slackService.statusUpdateAlert({ trackingNumber, status, message, customerName: booking.senderName }),
    ]);

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
