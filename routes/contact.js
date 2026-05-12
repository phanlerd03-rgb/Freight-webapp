/**
 * ===== PIT FREIGHT — Contact Form API =====
 * POST /api/contact — บันทึก + แจ้งเตือนทุก channel
 */

const express = require('express');
const router = express.Router();
const { Client } = require('@notionhq/client');
const nodemailer = require('nodemailer');
const lineService = require('../services/lineoa');
const gsService = require('../services/googlesheet');

function getNotion() { return new Client({ auth: process.env.NOTION_TOKEN }); }
function getMailer() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST, port: parseInt(process.env.EMAIL_PORT),
    secure: false, auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, service, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อและอีเมล' });
    }

    const contactData = { name, email, phone: phone || '', company: company || '', service: service || '', message: message || '' };
    const dateStr = new Date().toISOString().split('T')[0];

    // 1. Notion
    if (process.env.NOTION_CONTACTS_DB) {
      try {
        await getNotion().pages.create({
          parent: { database_id: process.env.NOTION_CONTACTS_DB },
          properties: {
            'Name':    { title: [{ text: { content: name } }] },
            'Email':   { email },
            'Phone':   phone ? { phone_number: phone } : undefined,
            'Company': { rich_text: [{ text: { content: company || '' } }] },
            'Service': service ? { select: { name: service } } : undefined,
            'Message': { rich_text: [{ text: { content: (message || '').substring(0, 2000) } }] },
            'Status':  { select: { name: 'ใหม่' } },
            'Date':    { date: { start: dateStr } },
          },
        });
      } catch (e) { console.log('Notion contact warn:', e.message); }
    }

    // 2. LINE + Google Sheets + Email — ทำ parallel
    await Promise.allSettled([
      lineService.notifyContact(contactData),
      gsService.logContact(contactData),
      (async () => {
        await getMailer().sendMail({
          from: `"PIT Freight System" <${process.env.EMAIL_FROM}>`,
          to: process.env.EMAIL_USER,
          subject: `✉️ [Contact] ${name} — ${service || 'ทั่วไป'}`,
          html: `
            <h2 style="color:#1e3a5f">✉️ ข้อความติดต่อใหม่</h2>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f8fafc"><b>ชื่อ</b></td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f8fafc"><b>Email</b></td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f8fafc"><b>โทร</b></td><td style="padding:8px;border:1px solid #ddd">${phone || '-'}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f8fafc"><b>บริษัท</b></td><td style="padding:8px;border:1px solid #ddd">${company || '-'}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f8fafc"><b>บริการ</b></td><td style="padding:8px;border:1px solid #ddd">${service || '-'}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ddd;background:#f8fafc"><b>ข้อความ</b></td><td style="padding:8px;border:1px solid #ddd">${message || '-'}</td></tr>
            </table>`,
        });
      })().catch(e => console.log('email warn:', e.message)),
    ]);

    res.json({ success: true, message: 'ส่งข้อความเรียบร้อยแล้ว ทีมงานจะติดต่อกลับเร็วๆ นี้' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
