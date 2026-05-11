/* ===== FREIGHT WEBAPP — MAIN JS ===== */

const API = '';

// ===== NAVBAR =====
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

hamburger?.addEventListener('click', () => {
  navLinks?.classList.toggle('open');
});

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ===== SERVICE CARD — select method =====
function selectMethod(method) {
  scrollToSection('quote');
  setTimeout(() => {
    document.getElementById('calc-method').value = method;
    document.querySelector('[data-tab="quick"]').click();
  }, 400);
}

// Bulk / RoRo — scroll to contact with pre-filled message
function openContactForService(serviceName) {
  scrollToSection('contact');
  setTimeout(() => {
    const msgEl = document.getElementById('contactMessage') || document.querySelector('textarea[name="message"]');
    if (msgEl) {
      msgEl.value = `สนใจบริการ ${serviceName} — ขอใบเสนอราคาและรายละเอียดเพิ่มเติม`;
      msgEl.focus();
    }
  }, 500);
}

// ===== TABS =====
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabGroup = btn.closest('.tabs').parentElement;
    tabGroup.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tabGroup.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const target = tabGroup.querySelector(`#tab-${btn.dataset.tab}`);
    if (target) target.classList.add('active');
  });
});

// ===== QUICK CALCULATOR =====
const calcForm = document.getElementById('calcForm');
const calcResult = document.getElementById('calcResult');

calcForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const origin = document.getElementById('calc-origin').value.trim();
  const destination = document.getElementById('calc-dest').value.trim();
  const weight = document.getElementById('calc-weight').value;
  const shippingMethod = document.getElementById('calc-method').value;

  if (!destination || !weight) {
    showToast('กรุณากรอกปลายทางและน้ำหนัก', 'error'); return;
  }

  const btn = calcForm.querySelector('button[type="submit"]');
  setLoading(btn, true);

  try {
    const res = await fetch(`${API}/api/quote/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, weight: parseFloat(weight), shippingMethod }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    renderCalcResult(data.quote);
  } catch (err) {
    // Demo mode — calculate locally
    const cost = demoCalculate(parseFloat(weight), shippingMethod, destination);
    renderCalcResult({ totalCost: cost.price, transitTime: cost.transit, breakdown: cost.breakdown });
  } finally {
    setLoading(btn, false);
  }
});

function demoCalculate(weight, method, dest) {
  const rates = { sea: { base: 28, min: 500, transit: '15-30 วัน' }, air: { base: 234, min: 1500, transit: '3-7 วัน' }, express: { base: 432, min: 2500, transit: '1-3 วัน' }, road: { base: 43, min: 800, transit: '5-14 วัน' } };
  const zone = { japan: 1.2, china: 1.1, usa: 2.0, uk: 1.8, europe: 1.8, australia: 1.9, singapore: 1.0, korea: 1.2, india: 1.3, vietnam: 1.0 };
  const r = rates[method] || rates.sea;
  let mult = 1.5;
  const d = dest.toLowerCase();
  for (const [k, v] of Object.entries(zone)) { if (d.includes(k)) { mult = v; break; } }
  const raw = Math.max(weight * r.base * mult, r.min);
  const price = Math.round(raw / 100) * 100;
  return { price, transit: r.transit, breakdown: { base: Math.round(price * .7), fuel: Math.round(price * .15), handling: Math.round(price * .10), insurance: Math.round(price * .05) } };
}

function renderCalcResult(quote) {
  calcResult.innerHTML = `
    <div class="price">฿${quote.totalCost.toLocaleString()}</div>
    <div class="transit">⏱ ระยะเวลาขนส่งโดยประมาณ: ${quote.transitTime}</div>
    <div class="breakdown">
      <div class="breakdown-item"><span>ค่าขนส่งพื้นฐาน</span><span>฿${parseInt(quote.breakdown?.base || quote.totalCost * 0.7).toLocaleString()}</span></div>
      <div class="breakdown-item"><span>ค่าเชื้อเพลิง</span><span>฿${parseInt(quote.breakdown?.fuel || quote.totalCost * 0.15).toLocaleString()}</span></div>
      <div class="breakdown-item"><span>ค่าจัดการสินค้า</span><span>฿${parseInt(quote.breakdown?.handling || quote.totalCost * 0.10).toLocaleString()}</span></div>
      <div class="breakdown-item"><span>ประกันภัยพื้นฐาน</span><span>฿${parseInt(quote.breakdown?.insurance || quote.totalCost * 0.05).toLocaleString()}</span></div>
    </div>
    <p style="text-align:center;margin-top:16px;font-size:12px;color:#666">*ราคาโดยประมาณ ขึ้นอยู่กับน้ำหนักจริงและขนาดกล่อง</p>
    <button class="btn-primary w-full" style="margin-top:16px" onclick="scrollToSection('booking')">จองบริการนี้ →</button>
  `;
  calcResult.classList.remove('hidden');
  calcResult.classList.add('fade-in');
}

// ===== QUOTE REQUEST FORM =====
const quoteForm = document.getElementById('quoteForm');

quoteForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(quoteForm);
  const data = Object.fromEntries(fd);
  if (!data.name || !data.email || !data.destination || !data.weight) {
    showToast('กรุณากรอกข้อมูลที่จำเป็น', 'error'); return;
  }
  const btn = quoteForm.querySelector('button[type="submit"]');
  setLoading(btn, true, 'กำลังส่ง...');
  try {
    const res = await fetch(`${API}/api/quote/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    showToast('✅ ส่งใบเสนอราคาทางอีเมลแล้ว!', 'success');
    quoteForm.reset();
  } catch (err) {
    // Demo
    const cost = demoCalculate(parseFloat(data.weight), data.shippingMethod || 'sea', data.destination);
    showModal({
      icon: '📦', title: 'ใบเสนอราคาของคุณ',
      text: `ราคาประมาณสำหรับ ${data.origin} → ${data.destination}`,
      details: [
        ['ชื่อลูกค้า', data.name],
        ['เส้นทาง', `${data.origin} → ${data.destination}`],
        ['น้ำหนัก', `${data.weight} kg`],
        ['วิธีขนส่ง', data.shippingMethod],
        ['ระยะเวลา', cost.transit],
        ['ราคาโดยประมาณ', `฿${cost.price.toLocaleString()}`],
      ],
      note: '* ในระบบจริง ใบเสนอราคาจะถูกส่งไปยังอีเมลของคุณและบันทึกใน Notion พร้อมแจ้ง Slack',
    });
    quoteForm.reset();
  } finally {
    setLoading(btn, false, '📨 ขอใบเสนอราคา (ส่งทางอีเมล)');
  }
});

// ===== BOOKING STEPS =====
let currentStep = 1;
function nextStep(step) {
  if (!validateStep(currentStep)) return;
  document.getElementById(`step${currentStep}`)?.classList.remove('active');
  document.querySelector(`[data-step="${currentStep}"]`)?.classList.add('done');
  currentStep = step;
  document.getElementById(`step${currentStep}`)?.classList.add('active');
  document.querySelector(`[data-step="${currentStep}"]`)?.classList.add('active');
  updateCostEstimate();
}
function prevStep(step) {
  document.getElementById(`step${currentStep}`)?.classList.remove('active');
  document.querySelector(`[data-step="${currentStep}"]`)?.classList.remove('active');
  currentStep = step;
  document.getElementById(`step${currentStep}`)?.classList.add('active');
}
function validateStep(step) {
  const stepEl = document.getElementById(`step${step}`);
  const required = stepEl?.querySelectorAll('[required]');
  let ok = true;
  required?.forEach(el => {
    if (!el.value.trim()) { el.style.borderColor = '#e74c3c'; ok = false; setTimeout(() => el.style.borderColor = '', 2000); }
  });
  if (!ok) showToast('กรุณากรอกข้อมูลที่จำเป็น *', 'error');
  return ok;
}

// ===== AUTO ESTIMATE IN BOOKING =====
function updateCostEstimate() {
  if (currentStep !== 3) return;
  const form = document.getElementById('bookingForm');
  const fd = new FormData(form);
  const weight = parseFloat(fd.get('weight') || 0);
  const method = fd.get('shippingMethod') || 'sea';
  const dest = fd.get('destination') || '';
  if (weight && dest) {
    const cost = demoCalculate(weight, method, dest);
    document.getElementById('estCostShow').value = `฿${cost.price.toLocaleString()}`;
    document.getElementById('estCostVal').value = cost.price;
    document.getElementById('costDisplay').style.display = 'block';
  }
}

document.getElementById('bookingMethod')?.addEventListener('change', updateCostEstimate);

// ===== BOOKING FORM =====
const bookingForm = document.getElementById('bookingForm');
bookingForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateStep(3)) return;
  const fd = new FormData(bookingForm);
  const data = Object.fromEntries(fd);
  const btn = bookingForm.querySelector('button[type="submit"]');
  setLoading(btn, true, 'กำลังยืนยัน...');
  try {
    const res = await fetch(`${API}/api/booking/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    showBookingSuccess(result);
  } catch (err) {
    // Demo mode
    const tn = 'PIT' + Date.now().toString().slice(-9);
    const cost = demoCalculate(parseFloat(data.weight || 0), data.shippingMethod, data.destination || '');
    showBookingSuccess({ trackingNumber: tn, booking: { ...data, trackingNumber: tn, estimatedCost: cost.price, transitTime: cost.transit } });
  } finally {
    setLoading(btn, false, '✅ ยืนยันการจอง');
  }
});

function showBookingSuccess(result) {
  const b = result.booking;
  showModal({
    icon: '🎉',
    title: 'จองสำเร็จแล้ว!',
    trackingNumber: result.trackingNumber,
    text: 'ระบบส่งยืนยันทางอีเมล, บันทึกใน Notion และแจ้งทีมงานทาง Slack แล้ว',
    details: [
      ['ต้นทาง → ปลายทาง', `${b.origin} → ${b.destination}`],
      ['สินค้า / น้ำหนัก', `${b.cargoType || 'สินค้าทั่วไป'} / ${b.weight} kg`],
      ['วิธีขนส่ง', b.shippingMethod],
      ['ค่าขนส่ง (ประมาณ)', `฿${parseInt(b.estimatedCost || 0).toLocaleString()}`],
    ],
    note: null,
  });
  bookingForm.reset();
  currentStep = 1;
  document.querySelectorAll('.form-step-content').forEach(s => s.classList.remove('active'));
  document.getElementById('step1')?.classList.add('active');
  document.querySelectorAll('.step').forEach(s => { s.classList.remove('active', 'done'); });
  document.querySelector('[data-step="1"]')?.classList.add('active');
}

// ===== TRACKING =====
document.getElementById('trackingInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') trackShipment();
});

async function trackShipment() {
  const tn = document.getElementById('trackingInput').value.trim().toUpperCase();
  if (!tn) { showToast('กรุณากรอกหมายเลขติดตาม', 'error'); return; }
  const result = document.getElementById('trackingResult');
  result.innerHTML = '<div style="padding:40px;text-align:center;color:#fff"><div class="spinner" style="border-top-color:#2980b9;border-color:rgba(255,255,255,.3);margin:auto"></div><p style="margin-top:12px;color:rgba(255,255,255,.6)">กำลังค้นหา...</p></div>';
  result.classList.remove('hidden');
  try {
    const res = await fetch(`${API}/api/tracking/${tn}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    renderTrackingResult(data.tracking);
  } catch (err) {
    // Demo
    if (tn.startsWith('PIT') || tn.startsWith('DEMO')) {
      renderTrackingResult({
        trackingNumber: tn, senderName: 'ลูกค้าทดสอบ',
        origin: 'กรุงเทพฯ, Thailand', destination: 'Tokyo, Japan',
        cargoType: 'สินค้าทั่วไป', weight: 5.5, shippingMethod: 'air',
        status: 'in_transit', estimatedCost: 12800,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        timeline: [
          { status: 'processing', message: 'รับการจองแล้ว', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
          { status: 'picked_up', message: 'รับสินค้าจากผู้ส่งแล้ว', timestamp: new Date(Date.now() - 86400000).toISOString() },
          { status: 'in_transit', message: 'สินค้าอยู่ระหว่างการขนส่ง', timestamp: new Date(Date.now() - 3600000 * 6).toISOString() },
        ],
      });
    } else {
      result.innerHTML = `<div style="padding:40px;text-align:center;background:#fff;border-radius:20px"><div style="font-size:48px;margin-bottom:12px">🔍</div><p style="font-size:16px;font-weight:600;color:#1a3a5c">ไม่พบหมายเลขติดตาม</p><p style="color:#666;font-size:14px;margin-top:4px">กรุณาตรวจสอบหมายเลขอีกครั้ง</p></div>`;
    }
  }
}

const statusInfo = {
  processing: { label: 'รับการจองแล้ว', emoji: '⚙️', class: 'status-processing' },
  picked_up:  { label: 'รับสินค้าแล้ว', emoji: '📦', class: 'status-picked_up' },
  in_transit: { label: 'กำลังขนส่ง', emoji: '🚢', class: 'status-in_transit' },
  customs:    { label: 'ผ่านศุลกากร', emoji: '🛃', class: 'status-customs' },
  delivered:  { label: 'จัดส่งแล้ว', emoji: '✅', class: 'status-delivered' },
};
const methodMap = { sea: '🚢 ทางเรือ', air: '✈️ ทางอากาศ', express: '⚡ Express', road: '🚛 ทางบก' };

function renderTrackingResult(t) {
  const si = statusInfo[t.status] || { label: t.status, emoji: '📍', class: '' };
  const timeline = (t.timeline || []).map((item, i) => {
    const si2 = statusInfo[item.status] || { emoji: '📍', label: item.status };
    const isDone = i < (t.timeline.length - 1);
    const isActive = i === t.timeline.length - 1;
    return `<div class="timeline-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}">
      <div class="timeline-dot">${si2.emoji}</div>
      <p>${si2.label} — ${item.message}</p>
      <span>${new Date(item.timestamp).toLocaleString('th-TH')}</span>
    </div>`;
  }).join('');

  document.getElementById('trackingResult').innerHTML = `
    <div class="tracking-result fade-in">
      <div class="tracking-header">
        <h3>${si.emoji} สถานะการขนส่ง</h3>
        <div class="track-num">${t.trackingNumber}</div>
        <div style="margin-top:12px"><span class="status-badge ${si.class}">${si.label}</span></div>
      </div>
      <div class="tracking-body">
        <div class="track-info-grid">
          <div class="track-info-item"><label>ต้นทาง</label><p>${t.origin}</p></div>
          <div class="track-info-item"><label>ปลายทาง</label><p>${t.destination}</p></div>
          <div class="track-info-item"><label>สินค้า / น้ำหนัก</label><p>${t.cargoType} / ${t.weight} kg</p></div>
          <div class="track-info-item"><label>วิธีขนส่ง</label><p>${methodMap[t.shippingMethod] || t.shippingMethod}</p></div>
          <div class="track-info-item"><label>ค่าขนส่ง</label><p>฿${parseInt(t.estimatedCost || 0).toLocaleString()}</p></div>
          <div class="track-info-item"><label>วันที่จอง</label><p>${new Date(t.createdAt).toLocaleDateString('th-TH')}</p></div>
        </div>
        ${timeline ? `<h4 style="font-size:15px;font-weight:700;color:#1a3a5c;margin-bottom:16px">ไทม์ไลน์การขนส่ง</h4><div class="timeline">${timeline}</div>` : ''}
      </div>
    </div>`;
}

// ===== CONTACT FORM =====
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setLoading(btn, true, 'กำลังส่ง...');
  await new Promise(r => setTimeout(r, 1200));
  showToast('✅ ส่งข้อความแล้ว ทีมงานจะติดต่อกลับเร็วๆ นี้!', 'success');
  e.target.reset();
  setLoading(btn, false, '📨 ส่งข้อความ');
});

// ===== MODAL =====
function showModal({ icon, title, text, trackingNumber, details, note }) {
  const box = document.getElementById('modalBox');
  const detailRows = details?.map(([k, v]) => `<div class="modal-detail-row"><span>${k}</span><span>${v}</span></div>`).join('') || '';
  box.innerHTML = `
    <button class="modal-close" onclick="closeModal()">✕</button>
    <div class="modal-icon">${icon}</div>
    <div class="modal-title">${title}</div>
    ${trackingNumber ? `<div class="tracking-highlight"><p>หมายเลขติดตามสินค้า</p><div class="tn">${trackingNumber}</div></div>` : ''}
    <div class="modal-text">${text}</div>
    ${detailRows ? `<div class="modal-detail">${detailRows}</div>` : ''}
    ${note ? `<p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:8px">${note}</p>` : ''}
    <div style="display:flex;gap:12px;margin-top:20px">
      ${trackingNumber ? `<button class="btn-primary w-full" onclick="copyTracking('${trackingNumber}')">📋 คัดลอกหมายเลข</button>` : ''}
      <button class="${trackingNumber ? 'btn-outline dark' : 'btn-primary'} w-full" onclick="closeModal()">ตกลง</button>
    </div>
    <div style="margin-top:16px;padding:12px;background:#f0fdf4;border-radius:10px;font-size:13px;color:#15803d;text-align:center">
      📧 อีเมล &nbsp;|&nbsp; 📝 Notion &nbsp;|&nbsp; 💬 Slack &nbsp;|&nbsp; 💚 Line OA<br>
      <span style="color:#64748b;font-size:11px">แจ้งเตือนส่งไปยังทุก platform แล้ว</span>
    </div>`;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function copyTracking(tn) {
  navigator.clipboard.writeText(tn).then(() => showToast('✅ คัดลอกหมายเลขแล้ว', 'success'));
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ===== LOADING =====
function setLoading(btn, loading, label) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.original = btn.textContent;
    btn.innerHTML = `<span class="spinner"></span> ${label || 'กำลังโหลด...'}`;
  } else {
    btn.disabled = false;
    btn.textContent = label || btn.dataset.original;
  }
}

// ===== ADMIN SHORTCUT =====
const adminBtn = document.createElement('button');
adminBtn.className = 'admin-panel';
adminBtn.innerHTML = `⚙️ Admin Panel <span class="admin-badge" id="adminBadge">0</span>`;
adminBtn.onclick = openAdminPanel;
document.body.appendChild(adminBtn);

async function loadBookingCount() {
  try {
    const res = await fetch(`${API}/api/booking/list`);
    const d = await res.json();
    if (d.bookings) document.getElementById('adminBadge').textContent = d.bookings.length;
  } catch { /* server not running — demo mode */ }
}

function openAdminPanel() {
  fetch(`${API}/api/booking/list`)
    .then(r => r.json())
    .then(d => renderAdminPanel(d.bookings || []))
    .catch(() => renderAdminPanel(getDemoBookings()));
}

function getDemoBookings() {
  return [
    { trackingNumber: 'PIT000000001', senderName: 'สมชาย ใจดี', origin: 'กรุงเทพฯ', destination: 'Tokyo, Japan', shippingMethod: 'air', weight: 3.5, status: 'in_transit', estimatedCost: 8200, createdAt: new Date().toISOString() },
    { trackingNumber: 'PIT000000002', senderName: 'สุดา แสนสุข', origin: 'กรุงเทพฯ', destination: 'London, UK', shippingMethod: 'sea', weight: 25, status: 'processing', estimatedCost: 3500, createdAt: new Date().toISOString() },
    { trackingNumber: 'PIT000000003', senderName: 'มณี ศรีสุข', origin: 'เชียงใหม่', destination: 'Singapore', shippingMethod: 'express', weight: 1.2, status: 'delivered', estimatedCost: 4500, createdAt: new Date().toISOString() },
  ];
}

function renderAdminPanel(bookings) {
  const rows = bookings.slice(0, 10).map(b => {
    const si = statusInfo[b.status] || { label: b.status, class: '' };
    return `<tr style="border-bottom:1px solid #eee">
      <td style="padding:10px 8px;font-weight:700;color:#2980b9;font-size:13px">${b.trackingNumber}</td>
      <td style="padding:10px 8px;font-size:13px">${b.senderName}</td>
      <td style="padding:10px 8px;font-size:12px;color:#666">${b.origin} → ${b.destination}</td>
      <td style="padding:10px 8px"><span class="status-badge ${si.class}" style="font-size:11px">${si.label}</span></td>
      <td style="padding:10px 8px;font-size:13px;font-weight:600;color:#27ae60">฿${parseInt(b.estimatedCost||0).toLocaleString()}</td>
    </tr>`;
  }).join('');

  const box = document.getElementById('modalBox');
  box.innerHTML = `
    <button class="modal-close" onclick="closeModal()">✕</button>
    <div style="font-size:22px;font-weight:800;color:#1a3a5c;margin-bottom:20px">⚙️ Admin Panel</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:#e8f4fd;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#1a3a5c">${bookings.length}</div>
        <div style="font-size:12px;color:#666">การจองทั้งหมด</div>
      </div>
      <div style="background:#dcfce7;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#15803d">${bookings.filter(b=>b.status==='delivered').length}</div>
        <div style="font-size:12px;color:#666">จัดส่งแล้ว</div>
      </div>
      <div style="background:#fef3c7;border-radius:12px;padding:16px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:#92400e">${bookings.filter(b=>b.status==='in_transit').length}</div>
        <div style="font-size:12px;color:#666">กำลังขนส่ง</div>
      </div>
    </div>
    <div style="overflow-x:auto;border-radius:12px;border:1px solid #eee">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f8fafc">
          <th style="padding:10px 8px;text-align:left;font-size:12px;color:#666">Tracking</th>
          <th style="padding:10px 8px;text-align:left;font-size:12px;color:#666">ลูกค้า</th>
          <th style="padding:10px 8px;text-align:left;font-size:12px;color:#666">เส้นทาง</th>
          <th style="padding:10px 8px;text-align:left;font-size:12px;color:#666">สถานะ</th>
          <th style="padding:10px 8px;text-align:left;font-size:12px;color:#666">ราคา</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#999">ยังไม่มีการจอง</td></tr>'}</tbody>
      </table>
    </div>
    <div style="margin-top:16px;text-align:center">
      <button class="btn-primary" onclick="closeModal()">ปิด</button>
    </div>`;
  document.getElementById('modal').classList.remove('hidden');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadBookingCount();
  // Intersection observer for animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('fade-in'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.service-card, .why-card, .integration-card, .info-card').forEach(el => observer.observe(el));
});
