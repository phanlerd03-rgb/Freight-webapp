/**
 * ===== NEWS IMAGE PICKER =====
 * เลือกภาพปกข่าวตาม keyword ในชื่อข่าว
 * ภาพทั้งหมดจาก Unsplash (ฟรี ไม่ต้อง API key)
 */

const IMAGE_POOL = {
  // ทางเรือ / ท่าเรือ
  sea: [
    'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&q=80', // container ship
    'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=800&q=80', // port containers
    'https://images.unsplash.com/photo-1520637836862-4d197d17c95a?w=800&q=80', // cargo ship
    'https://images.unsplash.com/photo-1516216628859-9bccecab13ca?w=800&q=80', // harbor
    'https://images.unsplash.com/photo-1570610379853-c2be38cc5a6e?w=800&q=80', // shipping port
  ],
  // ทางอากาศ / สนามบิน
  air: [
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80', // airplane
    'https://images.unsplash.com/photo-1542296332-2e4473faf563?w=800&q=80', // cargo plane
    'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80', // airport cargo
    'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&q=80', // freight plane
  ],
  // ญี่ปุ่น
  japan: [
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&q=80', // tokyo
    'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=80', // japan city
    'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80', // japan port
  ],
  // จีน
  china: [
    'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80', // shanghai
    'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80', // china trade
    'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&q=80', // china city
  ],
  // ยุโรป
  europe: [
    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80', // europe port
    'https://images.unsplash.com/photo-1491557345352-5929e343eb89?w=800&q=80', // europe trade
    'https://images.unsplash.com/photo-1485081669329-e4f13cf1d466?w=800&q=80', // hamburg port
  ],
  // อเมริกา
  usa: [
    'https://images.unsplash.com/photo-1485944929-0c6f2d7e84b9?w=800&q=80', // LA port
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80', // USA city
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80', // trade
  ],
  // อาเซียน / ไทย
  asean: [
    'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800&q=80', // bangkok
    'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80', // thailand trade
    'https://images.unsplash.com/photo-1583418007992-a8e33a92e7ed?w=800&q=80', // asean
  ],
  // เอกสาร / ศุลกากร / กฎระเบียบ
  customs: [
    'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&q=80', // documents
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80', // paperwork
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80', // business docs
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80', // customs officer
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80', // tax forms
  ],
  // ภาษี / การเงิน / โควตา
  finance: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80', // finance
    'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=800&q=80', // money trade
    'https://images.unsplash.com/photo-1543286386-2e659306cd6c?w=800&q=80', // charts
    'https://images.unsplash.com/photo-1559526324-593bc073d938?w=800&q=80', // business finance
  ],
  // สินค้าเกษตร / อาหาร
  agriculture: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80', // farm
    'https://images.unsplash.com/photo-1536304993881-ff86e0c9d7f9?w=800&q=80', // rice
    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80', // food export
    'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80', // tropical fruits
  ],
  // โกดัง / คลังสินค้า
  warehouse: [
    'https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80', // warehouse
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80', // logistics
    'https://images.unsplash.com/photo-1565891741441-64926e441838?w=800&q=80', // forklift
  ],
  // สัมมนา / อบรม / ประชุม
  seminar: [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80', // conference
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80', // seminar
    'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80', // meeting
  ],
  // ทั่วไป (fallback)
  general: [
    'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800&q=80', // global trade
    'https://images.unsplash.com/photo-1589758438368-0ad531db3366?w=800&q=80', // world map trade
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80', // shipping general
    'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&q=80', // logistics general
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', // business
  ],
};

// Keyword → category mapping
const KEYWORD_MAP = [
  { keywords: ['เรือ', 'ท่าเรือ', 'ตู้คอน', 'FCL', 'LCL', 'Sea', 'maritime', 'เดินเรือ'], category: 'sea' },
  { keywords: ['อากาศ', 'สนามบิน', 'บิน', 'Air', 'สุวรรณภูมิ', 'ดอนเมือง', 'Cargo'], category: 'air' },
  { keywords: ['ญี่ปุ่น', 'Japan', 'โตเกียว', 'โอซาก้า', 'นาริตะ'], category: 'japan' },
  { keywords: ['จีน', 'China', 'ฮ่องกง', 'ไต้หวัน', 'เซี่ยงไฮ้', 'ปักกิ่ง'], category: 'china' },
  { keywords: ['ยุโรป', 'EU', 'Europe', 'เยอรมนี', 'ฝรั่งเศส', 'อังกฤษ', 'CBAM', 'Carbon'], category: 'europe' },
  { keywords: ['อเมริกา', 'USA', 'US', 'สหรัฐ', 'นิวยอร์ก'], category: 'usa' },
  { keywords: ['อาเซียน', 'ASEAN', 'ไทย', 'ไทย-', 'กัมพูชา', 'เวียดนาม', 'มาเลเซีย', 'สิงคโปร์'], category: 'asean' },
  { keywords: ['ภาษี', 'อากร', 'ค่าธรรมเนียม', 'โควตา', 'งบประมาณ', 'อัตรา', 'ทุ่มตลาด'], category: 'finance' },
  { keywords: ['เอกสาร', 'ใบอนุญาต', 'Form', 'Certificate', 'C/O', 'ศุลกากร', 'พิธีการ', 'ประกาศ', 'กฎระเบียบ', 'มาตรการ'], category: 'customs' },
  { keywords: ['เกษตร', 'ข้าว', 'ยาง', 'มัน', 'ผลไม้', 'อาหาร', 'สมุนไพร', 'ปศุสัตว์', 'ประมง'], category: 'agriculture' },
  { keywords: ['โกดัง', 'คลังสินค้า', 'โลจิสติกส์', 'Logistics', 'จัดเก็บ'], category: 'warehouse' },
  { keywords: ['สัมมนา', 'อบรม', 'ประชุม', 'เชิญ', 'ลงทะเบียน', 'Workshop'], category: 'seminar' },
];

/**
 * เลือกภาพจาก pool ตาม keyword ในชื่อข่าว
 * @param {string} title - ชื่อข่าว
 * @param {string} articleId - ID ของบทความ (ใช้สำหรับ random แต่ deterministic)
 * @returns {string} URL ภาพ
 */
function pickImage(title, articleId) {
  // หา category ที่ match
  let category = 'general';
  for (const { keywords, category: cat } of KEYWORD_MAP) {
    if (keywords.some(kw => title.includes(kw))) {
      category = cat;
      break;
    }
  }

  const pool = IMAGE_POOL[category] || IMAGE_POOL.general;

  // Deterministic selection based on articleId hash (same article = same image)
  const hash = articleId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return pool[hash % pool.length];
}

module.exports = { pickImage };
