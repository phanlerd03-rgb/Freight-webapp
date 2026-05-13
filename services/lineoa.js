const axios = require('axios');

const LINE_API = 'https://api.line.me/v2/bot/message';
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
});

async function pushMessage(userId, messages) {
  if (!TOKEN || !userId) return null;
  try {
    await axios.post(`${LINE_API}/push`, { to: userId, messages }, { headers: headers() });
  } catch (err) {
    console.error('Line push error:', err.response?.data || err.message);
  }
}

async function broadcastMessage(messages) {
  if (!TOKEN) { console.log('⚠️ LINE: no token'); return null; }
  try {
    const r = await axios.post(`${LINE_API}/broadcast`, { messages }, { headers: headers() });
    console.log('✅ LINE broadcast sent', r.status);
    return r;
  } catch (err) {
    console.error('⚠️ LINE broadcast error:', JSON.stringify(err.response?.data) || err.message);
  }
}

function bookingConfirmFlex(booking) {
  return {
    type: 'flex',
    altText: `✅ ยืนยันการจอง #${booking.trackingNumber}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical',
        contents: [{ type: 'text', text: '✅ ยืนยันการจองขนส่ง', weight: 'bold', color: '#ffffff', size: 'md' }],
        backgroundColor: '#1a3a5c', paddingAll: '16px',
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'หมายเลขติดตาม', size: 'sm', color: '#666', flex: 2 },
            { type: 'text', text: booking.trackingNumber, size: 'sm', weight: 'bold', color: '#2980b9', flex: 3, align: 'end' },
          ]},
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'เส้นทาง', size: 'sm', color: '#666', flex: 2 },
            { type: 'text', text: `${booking.origin} → ${booking.destination}`, size: 'sm', weight: 'bold', flex: 3, align: 'end', wrap: true },
          ]},
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'วิธีขนส่ง', size: 'sm', color: '#666', flex: 2 },
            { type: 'text', text: booking.shippingMethod, size: 'sm', weight: 'bold', flex: 3, align: 'end' },
          ]},
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'ค่าขนส่ง (ประมาณ)', size: 'sm', color: '#666', flex: 2 },
            { type: 'text', text: `฿${booking.estimatedCost?.toLocaleString()}`, size: 'sm', weight: 'bold', color: '#27ae60', flex: 3, align: 'end' },
          ]},
          { type: 'separator' },
          { type: 'text', text: 'สถานะ: รอดำเนินการ', size: 'sm', color: '#f39c12', weight: 'bold', align: 'center' },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [{ type: 'text', text: 'ทีมงานจะติดต่อกลับภายใน 24 ชม.', size: 'xs', color: '#999', align: 'center' }],
      },
    },
  };
}

function statusUpdateFlex(data) {
  const statusEmoji = { processing:'⚙️', picked_up:'📦', in_transit:'🚢', customs:'🛃', delivered:'✅' };
  const statusThai = { processing:'กำลังดำเนินการ', picked_up:'รับสินค้าแล้ว', in_transit:'อยู่ระหว่างการขนส่ง', customs:'ผ่านพิธีศุลกากร', delivered:'จัดส่งสำเร็จ' };
  const color = data.status === 'delivered' ? '#27ae60' : '#2980b9';

  return {
    type: 'flex',
    altText: `${statusEmoji[data.status]} อัพเดทสถานะ #${data.trackingNumber}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical',
        contents: [{ type: 'text', text: `${statusEmoji[data.status]} อัพเดทสถานะการขนส่ง`, weight: 'bold', color: '#ffffff', size: 'md' }],
        backgroundColor: color, paddingAll: '16px',
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: `#${data.trackingNumber}`, size: 'xl', weight: 'bold', color: color, align: 'center' },
          { type: 'text', text: statusThai[data.status] || data.status, size: 'md', align: 'center', weight: 'bold' },
          { type: 'separator' },
          { type: 'text', text: data.message || 'สินค้าของคุณกำลังดำเนินการ', size: 'sm', color: '#666', wrap: true, align: 'center' },
          { type: 'text', text: new Date().toLocaleString('th-TH'), size: 'xs', color: '#999', align: 'center' },
        ],
      },
    },
  };
}

async function sendBookingConfirmation(userId, booking) {
  return pushMessage(userId, [bookingConfirmFlex(booking)]);
}

async function sendStatusUpdate(userId, data) {
  return pushMessage(userId, [statusUpdateFlex(data)]);
}

async function handleWebhook(events) {
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text.trim().toUpperCase();
      if (text.startsWith('TRACK') || /^[A-Z]{2}\d{9}TH$/.test(text) || /^PIT\d+$/.test(text)) {
        const trackingNum = text.replace('TRACK', '').trim() || text;
        await pushMessage(event.source.userId, [{
          type: 'text',
          text: `🔍 กำลังค้นหาข้อมูลสินค้าหมายเลข: ${trackingNum}\nกรุณารอสักครู่...`,
        }]);
      }
    }
  }
}

// ─── Admin Flex builder ───────────────────────────────
function adminFlex({ emoji, title, color, rows, link, shareUrl }) {
  const bodyContents = rows.map(([label, value]) => ({
    type: 'box', layout: 'horizontal', spacing: 'sm',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#888888', flex: 3, wrap: true },
      { type: 'text', text: String(value || '-'), size: 'sm', weight: 'bold', color: '#1d1d1f', flex: 5, wrap: true, align: 'end' },
    ],
  }));

  if (link) {
    bodyContents.push({ type: 'separator', margin: 'md' });
    bodyContents.push({
      type: 'button', style: 'primary', color: color || '#0071e3',
      action: { type: 'uri', label: '🔗 จัดการ / Admin Panel', uri: link },
      margin: 'md', height: 'sm',
    });
  }

  // ─── Footer with share button ───────────────────────
  const footerContents = [];
  if (shareUrl) {
    const lineShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;
    footerContents.push({
      type: 'button', style: 'primary', color: color || '#0071e3', height: 'sm',
      action: { type: 'uri', label: '🔗 อ่านบทความเต็ม', uri: shareUrl },
    });
    footerContents.push({
      type: 'button', style: 'secondary', height: 'sm', margin: 'sm',
      action: { type: 'uri', label: '📤 แชร์ให้เพื่อน LINE', uri: lineShareUrl },
    });
  }

  return {
    type: 'flex',
    altText: `${emoji} ${title} — PIT Freight`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: '14px',
        backgroundColor: color || '#1a3a5c',
        contents: [
          { type: 'text', text: `${emoji}  ${title}`, weight: 'bold', color: '#ffffff', size: 'md', wrap: true },
          { type: 'text', text: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }), size: 'xs', color: 'rgba(255,255,255,.7)', margin: 'xs' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: bodyContents,
      },
      ...(footerContents.length ? {
        footer: {
          type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px',
          contents: footerContents,
        },
      } : {}),
    },
  };
}

// ─── Admin notify functions ───────────────────────────
const SITE = process.env.SITE_URL || 'https://pitfreight.com';

async function notifyQuote(q) {
  return broadcastMessage([adminFlex({
    emoji: '📋', title: 'ใบเสนอราคาใหม่', color: '#0071e3',
    rows: [
      ['ชื่อ', q.name],
      ['Email', q.email],
      ['โทร', q.phone || '-'],
      ['เส้นทาง', `${q.origin} → ${q.destination}`],
      ['วิธีขนส่ง', q.shippingMethod],
      ['น้ำหนัก', `${q.weight} kg`],
      ['ราคาประมาณ', q.totalCost ? `฿${q.totalCost.toLocaleString()}` : '-'],
    ],
  })]);
}

async function notifyBooking(b) {
  return broadcastMessage([adminFlex({
    emoji: '🚢', title: 'การจองใหม่', color: '#1a3a5c',
    rows: [
      ['Tracking', b.trackingNumber],
      ['ผู้ส่ง', b.senderName],
      ['Email', b.senderEmail],
      ['เส้นทาง', `${b.origin} → ${b.destination}`],
      ['วิธีขนส่ง', b.shippingMethod],
      ['น้ำหนัก', `${b.weight} kg`],
      ['ค่าขนส่ง', b.estimatedCost ? `฿${b.estimatedCost.toLocaleString()}` : '-'],
    ],
  })]);
}

async function notifyContact(c) {
  return broadcastMessage([adminFlex({
    emoji: '✉️', title: 'ข้อความติดต่อใหม่', color: '#7c3aed',
    rows: [
      ['ชื่อ', c.name],
      ['Email', c.email],
      ['โทร', c.phone || '-'],
      ['บริษัท', c.company || '-'],
      ['บริการที่สนใจ', c.service || '-'],
      ['ข้อความ', (c.message || '').substring(0, 60) + ((c.message || '').length > 60 ? '…' : '')],
    ],
  })]);
}

async function notifyAlibaba(a) {
  return broadcastMessage([adminFlex({
    emoji: '🛒', title: 'Alibaba Sourcing ใหม่', color: '#e05c19',
    rows: [
      ['สินค้า', a.productName],
      ['หมวด', a.category || '-'],
      ['งบประมาณ', a.budget ? `$${a.budget}` : '-'],
      ['จำนวน', `${a.quantity || '-'} ${a.unit || ''}`],
      ['ขนส่ง', a.shippingMethod || '-'],
      ['ชื่อ', a.name],
      ['Email', a.email],
    ],
  })]);
}

async function notifyProduct(p) {
  return broadcastMessage([adminFlex({
    emoji: '📦', title: 'สินค้าใหม่รออนุมัติ', color: '#f59e0b',
    rows: [
      ['สินค้า', p.nameTH],
      ['หมวด', p.category || '-'],
      ['ราคา', p.priceRange || '-'],
      ['MOQ', p.moq || '-'],
      ['จังหวัด', p.province || '-'],
      ['ผู้ขาย', p.sellerName],
      ['Email', p.sellerEmail],
    ],
    link: `${SITE}/admin`,
  })]);
}

// ─── Blog broadcast with share button ────────────────
async function broadcastBlog({ title, summary, slug, color, emoji, coverText }) {
  const url = `${SITE}/blog/${slug}`;
  const lineShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;

  return broadcastMessage([{
    type: 'flex',
    altText: `${emoji || '📄'} ${title} — PIT Freight`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: color || '#1a3a5c', paddingAll: '16px',
        contents: [
          { type: 'text', text: `${emoji || '📄'}  บทความใหม่จาก PIT Freight`, color: 'rgba(255,255,255,.7)', size: 'xs', weight: 'bold' },
          { type: 'text', text: title, color: '#ffffff', size: 'md', weight: 'bold', wrap: true, margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '14px',
        contents: [
          { type: 'text', text: summary, size: 'sm', color: '#555555', wrap: true },
          ...(coverText ? [
            { type: 'separator', margin: 'md' },
            { type: 'text', text: coverText, size: 'xs', color: '#888888', wrap: true, margin: 'md' },
          ] : []),
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px',
        contents: [
          {
            type: 'button', style: 'primary', color: color || '#1a3a5c', height: 'sm',
            action: { type: 'uri', label: '📖 อ่านบทความเต็ม', uri: url },
          },
          {
            type: 'button', style: 'secondary', height: 'sm',
            action: { type: 'uri', label: '📤 แชร์ให้เพื่อนใน LINE', uri: lineShareUrl },
          },
          {
            type: 'button', style: 'secondary', height: 'sm',
            action: { type: 'uri', label: '💬 ขอใบเสนอราคาฟรี', uri: `${SITE}/#quote` },
          },
        ],
      },
    },
  }]);
}

module.exports = {
  sendBookingConfirmation, sendStatusUpdate, handleWebhook,
  pushMessage, broadcastMessage, broadcastBlog,
  notifyQuote, notifyBooking, notifyContact, notifyAlibaba, notifyProduct,
};
