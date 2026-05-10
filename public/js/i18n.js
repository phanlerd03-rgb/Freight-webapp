/* ===== TRANSLATIONS ===== */
const translations = {
  th: {
    'nav.services': 'บริการ',
    'nav.quote': 'ขอใบเสนอราคา',
    'nav.booking': 'จองขนส่ง',
    'nav.tracking': 'ติดตามสินค้า',
    'nav.contact': 'ติดต่อเรา',
    'nav.cta': 'ขอราคาฟรี',

    'hero.badge': '🌏 บริการขนส่งครบวงจร 50+ ประเทศ',
    'hero.title': 'ขนส่งสินค้าระหว่างประเทศ<br><span class="gradient-text">ปลอดภัย รวดเร็ว คุ้มค่า</span>',
    'hero.desc': 'บริการขนส่งสินค้าทางเรือ ทางอากาศ และทางบก ครบครัน ด้วยประสบการณ์กว่า 15 ปี พร้อมให้คำปรึกษาด้านพิธีการศุลกากรและเอกสารนำเข้า-ส่งออก',
    'hero.btn1': '📦 ขอใบเสนอราคา',
    'hero.btn2': '🔍 ติดตามสินค้า',
    'hero.stat1': 'ประเทศทั่วโลก',
    'hero.stat2': 'ลูกค้าพึงพอใจ',
    'hero.stat3': 'ส่งตรงเวลา',
    'hero.stat4': 'บริการลูกค้า',

    'services.badge': 'บริการของเรา',
    'services.title': 'บริการขนส่งครบทุกรูปแบบ',
    'services.desc': 'เลือกวิธีขนส่งที่เหมาะสมกับสินค้าและงบประมาณของคุณ',

    'quote.badge': 'ใบเสนอราคา',
    'quote.title': 'คำนวณราคาขนส่ง',
    'quote.desc': 'กรอกข้อมูลเพื่อรับใบเสนอราคาทันที หรือส่งอีเมลให้คุณ',
    'quote.tab1': 'คำนวณเร็ว',
    'quote.tab2': 'ขอใบเสนอราคา',

    'booking.badge': 'จองขนส่ง',
    'booking.title': 'จองบริการขนส่ง',
    'booking.desc': 'กรอกข้อมูลเพื่อจองบริการขนส่ง รับหมายเลขติดตามทันที',

    'tracking.badge': 'ติดตามสินค้า',
    'tracking.title': 'ติดตามสถานะการขนส่ง',
    'tracking.desc': 'กรอกหมายเลขติดตามเพื่อดูสถานะสินค้าของคุณ',
    'tracking.hint': 'หมายเลขติดตามจะถูกส่งทางอีเมล หลังจากยืนยันการจอง',

    'integrations.badge': 'การเชื่อมต่อ',
    'integrations.title': 'เชื่อมต่อทุก Platform',
    'integrations.desc': 'รับการแจ้งเตือนและจัดการการขนส่งผ่าน tools ที่คุณใช้อยู่แล้ว',

    'why.badge': 'ทำไมต้องเลือกเรา',
    'why.title': 'จุดเด่นของ Project International Trade',

    'contact.badge': 'ติดต่อเรา',
    'contact.title': 'ให้เราช่วยคุณ',
    'contact.desc': 'ทีมผู้เชี่ยวชาญพร้อมให้คำแนะนำทุกวัน 24/7',
  },

  en: {
    'nav.services': 'Services',
    'nav.quote': 'Get a Quote',
    'nav.booking': 'Book Shipment',
    'nav.tracking': 'Track Shipment',
    'nav.contact': 'Contact Us',
    'nav.cta': 'Free Quote',

    'hero.badge': '🌏 Full Freight Services — 50+ Countries',
    'hero.title': 'International Freight Services<br><span class="gradient-text">Safe. Fast. Cost-Effective.</span>',
    'hero.desc': 'Comprehensive sea, air, and land freight services with over 15 years of experience. Expert customs clearance and import-export documentation support.',
    'hero.btn1': '📦 Get a Quote',
    'hero.btn2': '🔍 Track Shipment',
    'hero.stat1': 'Countries Worldwide',
    'hero.stat2': 'Satisfied Customers',
    'hero.stat3': 'On-Time Delivery',
    'hero.stat4': 'Customer Support',

    'services.badge': 'Our Services',
    'services.title': 'Complete Freight Solutions',
    'services.desc': 'Choose the right shipping method for your cargo and budget.',

    'quote.badge': 'Quotation',
    'quote.title': 'Calculate Shipping Cost',
    'quote.desc': 'Fill in the details to get an instant quote or receive it by email.',
    'quote.tab1': 'Quick Calculate',
    'quote.tab2': 'Request Quote',

    'booking.badge': 'Book Shipment',
    'booking.title': 'Book Freight Service',
    'booking.desc': 'Fill in your shipment details and receive a tracking number instantly.',

    'tracking.badge': 'Track Shipment',
    'tracking.title': 'Track Your Shipment',
    'tracking.desc': 'Enter your tracking number to check the status of your cargo.',
    'tracking.hint': 'Your tracking number will be sent by email after booking confirmation.',

    'integrations.badge': 'Integrations',
    'integrations.title': 'Connected to Every Platform',
    'integrations.desc': 'Receive notifications and manage shipments through your existing tools.',

    'why.badge': 'Why Choose Us',
    'why.title': 'Why Project International Trade',

    'contact.badge': 'Contact Us',
    'contact.title': 'How Can We Help?',
    'contact.desc': 'Our expert team is available 24/7 to assist you.',
  }
};

/* ===== PLACEHOLDER TRANSLATIONS ===== */
const placeholders = {
  th: {
    'calc-origin':   'เช่น กรุงเทพฯ, Thailand',
    'calc-dest':     'เช่น Tokyo, Japan',
    'calc-weight':   '0',
    'trackingInput': 'กรอกหมายเลขติดตาม เช่น PIT123456789',
  },
  en: {
    'calc-origin':   'e.g. Bangkok, Thailand',
    'calc-dest':     'e.g. Tokyo, Japan',
    'calc-weight':   '0',
    'trackingInput': 'Enter tracking number e.g. PIT123456789',
  }
};

/* ===== SELECT OPTIONS ===== */
const selectOptions = {
  shippingMethod: {
    th: [
      { value: 'sea',     label: '🚢 ทางเรือ' },
      { value: 'air',     label: '✈️ ทางอากาศ' },
      { value: 'express', label: '⚡ Express' },
      { value: 'road',    label: '🚛 ทางบก' },
    ],
    en: [
      { value: 'sea',     label: '🚢 Sea Freight' },
      { value: 'air',     label: '✈️ Air Freight' },
      { value: 'express', label: '⚡ Express' },
      { value: 'road',    label: '🚛 Road Freight' },
    ]
  },
  cargoType: {
    th: ['สินค้าทั่วไป','อิเล็กทรอนิกส์','อาหาร/เกษตร','เสื้อผ้า/แฟชั่น','เครื่องจักร/อุตสาหกรรม','เคมีภัณฑ์','สินค้ามีมูลค่าสูง','อื่นๆ'],
    en: ['General Cargo','Electronics','Food / Agriculture','Fashion / Apparel','Machinery / Industrial','Chemicals','High-Value Goods','Other']
  }
};

/* ===== LANG ENGINE ===== */
let currentLang = localStorage.getItem('pitLang') || 'th';

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('pitLang', lang);
  document.documentElement.lang = lang;

  // translate elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const text = translations[lang]?.[key];
    if (text) el.innerHTML = text;
  });

  // placeholders
  Object.entries(placeholders[lang] || {}).forEach(([id, ph]) => {
    const el = document.getElementById(id);
    if (el) el.placeholder = ph;
  });

  // update shipping method selects
  document.querySelectorAll('select[name="shippingMethod"], #calc-method').forEach(sel => {
    const val = sel.value;
    sel.innerHTML = selectOptions.shippingMethod[lang]
      .map(o => `<option value="${o.value}"${o.value===val?' selected':''}>${o.label}</option>`)
      .join('');
  });

  // update cargo type selects
  document.querySelectorAll('select[name="cargoType"]').forEach(sel => {
    const opts = selectOptions.cargoType[lang];
    sel.innerHTML = opts.map((o,i) => `<option>${o}</option>`).join('');
  });

  // update lang button
  const btn = document.getElementById('langToggle');
  if (btn) btn.textContent = lang === 'th' ? '🇬🇧 EN' : '🇹🇭 TH';

  // update booking steps text
  updateStepLabels(lang);

  // update tracking input placeholder
  const trackInput = document.getElementById('trackingInput');
  if (trackInput) trackInput.placeholder = placeholders[lang]['trackingInput'];
}

function updateStepLabels(lang) {
  const labels = {
    th: ['ข้อมูลผู้ส่ง', 'ข้อมูลปลายทาง', 'รายละเอียดสินค้า'],
    en: ['Sender Info', 'Recipient Info', 'Cargo Details']
  };
  document.querySelectorAll('.step').forEach((el, i) => {
    const num = el.querySelector('span');
    if (num && labels[lang][i]) {
      const numText = num.textContent;
      el.innerHTML = `<span>${numText}</span> ${labels[lang][i]}`;
    }
  });
}

function toggleLang() {
  applyLang(currentLang === 'th' ? 'en' : 'th');
}

// Apply on load
document.addEventListener('DOMContentLoaded', () => applyLang(currentLang));
