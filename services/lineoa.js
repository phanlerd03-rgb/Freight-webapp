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
  if (!TOKEN) return null;
  try {
    await axios.post(`${LINE_API}/broadcast`, { messages }, { headers: headers() });
  } catch (err) {
    console.error('Line broadcast error:', err.response?.data || err.message);
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

module.exports = { sendBookingConfirmation, sendStatusUpdate, handleWebhook, pushMessage, broadcastMessage };
