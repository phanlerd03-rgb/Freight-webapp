/**
 * ===== CRON JOBS — PIT FREIGHT =====
 * ระบบดึงข่าวอัตโนมัติจากหน่วยงานราชการ
 */

const express = require('express');
const router = express.Router();
const cron = require('node-cron');
const { runCustomsScraper } = require('../services/customsScraper');
const { runDftScraper } = require('../services/dftScraper');

// ===== CRON SCHEDULES =====

// กรมศุลกากร — ทุกวัน 08:00 น.
cron.schedule('0 8 * * *', async () => {
  console.log('\n⏰ [CRON] ดึงข่าวกรมศุลกากร...');
  await runCustomsScraper();
}, { timezone: 'Asia/Bangkok' });

// กรมการค้าต่างประเทศ — ทุกวัน 08:30 น.
cron.schedule('30 8 * * *', async () => {
  console.log('\n⏰ [CRON] ดึงข่าวกรมการค้าต่างประเทศ...');
  await runDftScraper();
}, { timezone: 'Asia/Bangkok' });

// ดึงข่าวทั้งสองแหล่งเมื่อ server เริ่มต้น (ทยอยรัน)
setTimeout(async () => {
  console.log('\n🚀 [INIT] ดึงข่าวกรมศุลกากรครั้งแรก...');
  await runCustomsScraper();
}, 30 * 1000);

setTimeout(async () => {
  console.log('\n🚀 [INIT] ดึงข่าวกรมการค้าต่างประเทศครั้งแรก...');
  await runDftScraper();
}, 90 * 1000); // รัน 90 วินาทีหลัง customs เสร็จ

console.log('✅ Cron jobs registered:');
console.log('   📋 กรมศุลกากร      → ทุกวัน 08:00 น.');
console.log('   📋 กรมการค้าต่างประเทศ → ทุกวัน 08:30 น.');

// ===== MANUAL TRIGGER APIs =====

// POST /api/cron/customs
router.post('/customs', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    console.log('\n🔧 [MANUAL] ดึงข่าวกรมศุลกากร...');
    const result = await runCustomsScraper();
    res.json({ success: true, source: 'customs', ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/cron/dft
router.post('/dft', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    console.log('\n🔧 [MANUAL] ดึงข่าวกรมการค้าต่างประเทศ...');
    const result = await runDftScraper();
    res.json({ success: true, source: 'dft', ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/cron/all — รันทุกแหล่งพร้อมกัน
router.post('/all', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    console.log('\n🔧 [MANUAL] ดึงข่าวทุกแหล่ง...');
    const [customs, dft] = await Promise.all([runCustomsScraper(), runDftScraper()]);
    res.json({
      success: true,
      customs,
      dft,
      total: { imported: customs.imported + dft.imported, skipped: customs.skipped + dft.skipped },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/cron/status
router.get('/status', (req, res) => {
  res.json({
    status: 'running',
    jobs: [
      { name: 'customs', schedule: 'ทุกวัน 08:00 น.', source: 'customs.go.th', description: 'ข่าวกรมศุลกากร' },
      { name: 'dft', schedule: 'ทุกวัน 08:30 น.', source: 'dft.go.th', description: 'ข่าวกรมการค้าต่างประเทศ' },
    ],
  });
});

module.exports = router;
