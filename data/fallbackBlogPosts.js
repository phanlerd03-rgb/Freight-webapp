const fallbackBlogPosts = [
  {
    id: 'fallback-import-checklist',
    title: 'เช็กลิสต์นำเข้าสินค้า: เอกสารที่ต้องเตรียมก่อนจองขนส่ง',
    slug: 'import-document-checklist',
    summary: 'สรุปเอกสารสำคัญสำหรับผู้นำเข้า เช่น Invoice, Packing List, B/L หรือ AWB เพื่อช่วยให้การเคลียร์ศุลกากรราบรื่นขึ้น',
    cover: null,
    category: 'คู่มือ',
    tags: ['Import', 'Customs', 'Documents'],
    author: 'PIT Freight Team',
    date: '2026-05-16',
    language: 'th',
    content: `
      <p>ก่อนเริ่มนำเข้าสินค้า ควรตรวจสอบเอกสารหลักให้ครบถ้วนเพื่อลดความเสี่ยงเรื่องค่าใช้จ่ายปลายทางและความล่าช้าในการปล่อยสินค้า</p>
      <h2>เอกสารหลักที่ควรมี</h2>
      <ul>
        <li><strong>Commercial Invoice</strong> ระบุผู้ซื้อ ผู้ขาย รายละเอียดสินค้า ราคา และ Incoterms</li>
        <li><strong>Packing List</strong> ระบุจำนวนกล่อง น้ำหนัก และขนาดบรรจุภัณฑ์</li>
        <li><strong>Bill of Lading / Air Waybill</strong> ใช้ยืนยันรายละเอียดการขนส่ง</li>
        <li><strong>ใบอนุญาตหรือเอกสารเฉพาะสินค้า</strong> สำหรับสินค้าที่มีหน่วยงานควบคุม</li>
      </ul>
      <p>หากไม่แน่ใจว่าสินค้าของคุณต้องใช้เอกสารใดเพิ่มเติม สามารถส่งรายละเอียดสินค้าให้ทีม PIT Freight ช่วยตรวจสอบเบื้องต้นได้</p>
    `,
  },
  {
    id: 'fallback-sea-air-guide',
    title: 'เลือกขนส่งทางเรือหรือทางอากาศอย่างไรให้เหมาะกับต้นทุนและเวลา',
    slug: 'sea-vs-air-freight-guide',
    summary: 'เปรียบเทียบข้อดีของ Sea Freight และ Air Freight สำหรับธุรกิจที่ต้องบาลานซ์ระหว่างต้นทุน ความเร็ว และความต่อเนื่องของสต็อก',
    cover: null,
    category: 'เคล็ดลับ',
    tags: ['Sea Freight', 'Air Freight', 'Cost Saving'],
    author: 'PIT Freight Team',
    date: '2026-05-15',
    language: 'th',
    content: `
      <p>การเลือกโหมดขนส่งควรพิจารณาจากมูลค่าสินค้า น้ำหนัก ปริมาตร และเวลาที่ต้องการให้สินค้าถึงปลายทาง</p>
      <h2>ทางเรือเหมาะกับอะไร</h2>
      <p>เหมาะกับสินค้าปริมาณมาก น้ำหนักเยอะ หรือสินค้าที่ไม่เร่งด่วน เพราะต้นทุนต่อหน่วยมักประหยัดกว่า</p>
      <h2>ทางอากาศเหมาะกับอะไร</h2>
      <p>เหมาะกับสินค้ามูลค่าสูง สินค้าตัวอย่าง อะไหล่เร่งด่วน หรือสินค้าที่ต้องเติมสต็อกเร็ว</p>
      <p>ในหลายกรณี การวางแผนผสมทั้งสองรูปแบบจะช่วยลดต้นทุนรวมและยังรักษาระดับสต็อกได้ดี</p>
    `,
  },
  {
    id: 'fallback-quote-prep',
    title: 'ขอใบเสนอราคาขนส่งให้แม่นยำ ต้องเตรียมข้อมูลอะไรบ้าง',
    slug: 'freight-quotation-preparation',
    summary: 'ข้อมูลที่ควรเตรียมก่อนขอราคา เช่น เมืองต้นทาง ปลายทาง น้ำหนัก ขนาดกล่อง Incoterms และประเภทสินค้า',
    cover: null,
    category: 'ราคา & โปรโมชัน',
    tags: ['Quotation', 'Freight Rate', 'Incoterms'],
    author: 'PIT Freight Team',
    date: '2026-05-14',
    language: 'th',
    content: `
      <p>ใบเสนอราคาที่แม่นยำเริ่มจากข้อมูล shipment ที่ครบถ้วน ยิ่งรายละเอียดชัดเจน ทีมขนส่งยิ่งประเมินค่าใช้จ่ายได้ใกล้เคียงจริง</p>
      <h2>ข้อมูลที่ควรเตรียม</h2>
      <ul>
        <li>ต้นทางและปลายทาง รวมถึงรหัสไปรษณีย์หากมีบริการรับ-ส่งถึงที่</li>
        <li>น้ำหนักรวม จำนวนกล่อง และขนาดกล่องแต่ละใบ</li>
        <li>ประเภทสินค้า มูลค่าสินค้า และ HS Code ถ้ามี</li>
        <li>เงื่อนไขการซื้อขาย เช่น EXW, FOB, CIF หรือ DDP</li>
      </ul>
      <p>หากยังไม่มีข้อมูลครบ สามารถส่งข้อมูลเท่าที่มีมาให้ทีมงานช่วยประเมินเบื้องต้นก่อนได้</p>
    `,
  },
  {
    id: 'fallback-customs-news',
    title: 'อัปเดตงานนำเข้า: ทำไมต้องตรวจ HS Code ก่อนนำเข้าสินค้า',
    slug: 'why-check-hs-code-before-import',
    summary: 'HS Code มีผลต่ออัตราภาษี เอกสารควบคุม และขั้นตอนศุลกากร การตรวจสอบก่อนสั่งซื้อช่วยลดความเสี่ยงได้มาก',
    cover: null,
    category: 'ข่าวสาร',
    tags: ['HS Code', 'Import Tax', 'Regulation'],
    author: 'PIT Freight Team',
    date: '2026-05-13',
    language: 'th',
    content: `
      <p>HS Code เป็นรหัสจำแนกพิกัดศุลกากรที่ใช้กำหนดอัตราภาษีและเงื่อนไขการนำเข้าสินค้าแต่ละประเภท</p>
      <p>การตรวจ HS Code ก่อนนำเข้าช่วยให้ประเมินภาษีได้ใกล้เคียงจริง ตรวจสอบใบอนุญาตที่จำเป็น และลดความเสี่ยงที่สินค้าจะติดขั้นตอนตรวจปล่อย</p>
      <p>สำหรับสินค้าที่มีส่วนประกอบหลายชนิด ควรเตรียมรูปสินค้า รายละเอียดวัสดุ และการใช้งาน เพื่อให้การพิจารณาพิกัดแม่นยำขึ้น</p>
    `,
  },
];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function getFallbackBlogPosts(query = {}) {
  const { category, tag, lang, search, limit = 10, page = 1 } = query;
  const pageSize = Math.min(parseInt(limit, 10) || 10, 50);
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const searchText = normalize(search);

  let posts = fallbackBlogPosts.filter(post => {
    if (category && post.category !== category) return false;
    if (tag && !post.tags.includes(tag)) return false;
    if (lang && post.language !== lang) return false;
    if (searchText) {
      const haystack = normalize([
        post.title,
        post.summary,
        post.category,
        post.tags.join(' '),
      ].join(' '));
      if (!haystack.includes(searchText)) return false;
    }
    return true;
  });

  posts = posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const start = (currentPage - 1) * pageSize;
  const pagedPosts = posts.slice(start, start + pageSize).map(({ content, ...post }) => post);

  return {
    posts: pagedPosts,
    hasMore: start + pageSize < posts.length,
    fallback: true,
  };
}

function getFallbackBlogPost(slug) {
  return fallbackBlogPosts.find(post => post.slug === slug || post.id === slug) || null;
}

module.exports = {
  fallbackBlogPosts,
  getFallbackBlogPosts,
  getFallbackBlogPost,
};
