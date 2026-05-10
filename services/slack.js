const axios = require('axios');

const WEBHOOK = process.env.SLACK_WEBHOOK_URL;

async function notify(payload) {
  if (!WEBHOOK) return null;
  try {
    await axios.post(WEBHOOK, payload);
  } catch (err) {
    console.error('Slack notify error:', err.message);
  }
}

async function newBookingAlert(booking) {
  return notify({
    text: `🚢 *การจองใหม่!*`,
    attachments: [{
      color: '#2980b9',
      fields: [
        { title: 'Tracking', value: `\`${booking.trackingNumber}\``, short: true },
        { title: 'ลูกค้า', value: booking.senderName, short: true },
        { title: 'เส้นทาง', value: `${booking.origin} → ${booking.destination}`, short: true },
        { title: 'สินค้า / น้ำหนัก', value: `${booking.cargoType} / ${booking.weight} kg`, short: true },
        { title: 'วิธีขนส่ง', value: booking.shippingMethod, short: true },
        { title: 'ค่าขนส่ง (ประมาณ)', value: `฿${booking.estimatedCost?.toLocaleString()}`, short: true },
      ],
      footer: 'Freight Webapp',
      ts: Math.floor(Date.now() / 1000),
    }],
  });
}

async function newQuoteAlert(quote) {
  return notify({
    text: `📦 *ขอใบเสนอราคาใหม่!*`,
    attachments: [{
      color: '#27ae60',
      fields: [
        { title: 'ชื่อ', value: quote.name, short: true },
        { title: 'Email', value: quote.email, short: true },
        { title: 'เส้นทาง', value: `${quote.origin} → ${quote.destination}`, short: true },
        { title: 'น้ำหนัก', value: `${quote.weight} kg`, short: true },
        { title: 'ราคาประเมิน', value: `฿${quote.totalCost?.toLocaleString()}`, short: true },
      ],
      footer: 'Freight Webapp',
      ts: Math.floor(Date.now() / 1000),
    }],
  });
}

async function statusUpdateAlert(data) {
  const emoji = { processing:'⚙️', picked_up:'📦', in_transit:'🚢', customs:'🛃', delivered:'✅' };
  return notify({
    text: `${emoji[data.status] || '🔄'} *อัพเดทสถานะ* — \`${data.trackingNumber}\``,
    attachments: [{
      color: data.status === 'delivered' ? '#27ae60' : '#f39c12',
      fields: [
        { title: 'สถานะใหม่', value: data.status, short: true },
        { title: 'ลูกค้า', value: data.customerName || '-', short: true },
        { title: 'หมายเหตุ', value: data.message || '-', short: false },
      ],
      ts: Math.floor(Date.now() / 1000),
    }],
  });
}

module.exports = { newBookingAlert, newQuoteAlert, statusUpdateAlert };
