/**
 * ===== CRON JOBS — PIT FREIGHT =====
 * ระบบงานอัตโนมัติ
 */

const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const { runCustomsScraper } = require('../services/customsScraper');

// ===== CRON SCHEDULE =====
// ดึงข่าวกรมศุลกากรทุกวัน เวลา 08:00 น. (Asia/Bangkok)
cron.schedule('0 8 * * *', async () => {
  console.log('\n⏰ [CRON] เริ่มงานดึงข่าวกรมศุลกากรอัตโนมัติ');
  await runCustomsScraper();
}, {
  timezone: 'Asia/Bangkok',
});

// ดึงข่าวครั้งแรกเมื่อ server start (หลัง 30 วินาที)
setTimeout(async () => {
  console.log('\n🚀 [INIT] ดึงข่าวกรมศุลกากรครั้งแรก...');
  await runCustomsScraper();
}, 30 * 1000);

console.log('✅ Cron jobs registered — ดึงข่าวกรมศุลกากรทุกวัน 08:00 น.');

// ===== MANUAL TRIGGER API =====
// POST /api/cron/customs — รันทันทีด้วยมือ (ใช้ใน admin panel)
router.post('/customs', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('\n🔧 [MANUAL] เริ่มดึงข่าวกรมศุลกากรด้วยมือ...');

  try {
    const result = await runCustomsScraper();
    res.json({
      success: true,
      message: `นำเข้าสำเร็จ ${result.imported} รายการ, ข้าม ${result.skipped} รายการ`,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cron/status — ตรวจสอบ cron status
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    jobs: [
      {
        name: 'customs-news',
        schedule: 'ทุกวัน 08:00 น. (Asia/Bangkok)',
        description: 'ดึงข่าวจากกรมศุลกากร → สรุปด้วย AI → โพสต์ลง Notion Blog',
      },
    ],
  });
});

module.exports = router;
