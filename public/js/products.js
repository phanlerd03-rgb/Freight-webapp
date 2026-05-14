/**
 * ===== EXPORT PRODUCTS MARKETPLACE =====
 * สินค้าไทยเพื่อการส่งออก
 */

let productsPage = { cursor: null, hasMore: false, loading: false, currentCategory: 'all', search: '' };

const CATEGORY_EMOJI = {
  '🌾 เกษตร/อาหาร': '🌾', '💄 เครื่องสำอาง/สุขภาพ': '💄',
  '👗 สิ่งทอ/แฟชั่น': '👗', '🔌 อิเล็กทรอนิกส์': '🔌',
  '🌿 สมุนไพร/ธรรมชาติ': '🌿', '🏭 อุตสาหกรรม': '🏭', '📦 อื่นๆ': '📦',
};

function categoryEmoji(cat) { return CATEGORY_EMOJI[cat] || '📦'; }

// ===== SHARE PRODUCT =====
const _productCache = {};

function shareProductById(e, id) {
  e.stopPropagation();
  const p = _productCache[id];
  if (!p) return;

  // ปิด menu เดิมก่อน (ถ้ามี)
  const existing = document.getElementById('share-menu-' + id);
  if (existing) { existing.remove(); return; }
  document.querySelectorAll('.share-menu').forEach(m => m.remove());

  const url = 'https://pitfreight.com/#products';
  const desc = (p.descriptionTH || p.descriptionEN || '').substring(0, 80);
  const lineText = encodeURIComponent(`🇹🇭 ${p.nameTH}${p.nameEN ? ' (' + p.nameEN + ')' : ''}\n${desc ? desc + '...' : ''}\n\nสินค้าไทยคุณภาพพร้อมส่งออกทั่วโลก ผ่าน PIT Freight\n${url}`);
  const lineUrl = `https://line.me/R/msg/text/?${lineText}`;
  const copyText = `🇹🇭 ${p.nameTH}${p.nameEN ? ' / ' + p.nameEN : ''} — Thai Export | PIT Freight\n${url}`;

  const menu = document.createElement('div');
  menu.className = 'share-menu';
  menu.id = 'share-menu-' + id;
  menu.innerHTML = `
    <a class="share-menu-item share-line" href="${lineUrl}" target="_blank" rel="noopener" onclick="document.getElementById('share-menu-${id}')?.remove()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#06C755"><path d="M12 2C6.48 2 2 6.03 2 11c0 3.16 1.67 5.97 4.25 7.72L5.5 22l3.43-1.8C9.57 20.39 10.76 20.5 12 20.5c5.52 0 10-4.03 10-9S17.52 2 12 2z"/><path fill="#fff" d="M17.5 12.5h-2v-1h2v1zm-3 0h-2v-1h2v1zm-3 0H9.5v-1h2v1zm5-2.5c0-.28-.22-.5-.5-.5h-7c-.28 0-.5.22-.5.5v4c0 .28.22.5.5.5h7c.28 0 .5-.22.5-.5v-4z"/></svg>
      แชร์ LINE
    </a>
    <button class="share-menu-item share-copy" onclick="(function(){navigator.clipboard?navigator.clipboard.writeText('${copyText.replace(/'/g,"\\'")}').then(()=>showProductToast('📋 คัดลอกแล้ว!')):showProductToast('🔗 pitfreight.com');document.getElementById('share-menu-${id}')?.remove()})()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      คัดลอกลิงก์
    </button>`;

  // วาง menu ใกล้ปุ่มที่กด
  const btn = e.currentTarget || e.target.closest('.btn-share-overlay, .btn-product-share--modal');
  if (btn) {
    btn.parentElement.style.position = 'relative';
    btn.parentElement.appendChild(menu);
  } else {
    document.body.appendChild(menu);
  }

  // ปิด menu เมื่อคลิกที่อื่น
  setTimeout(() => {
    document.addEventListener('click', function handler() {
      menu.remove();
      document.removeEventListener('click', handler);
    });
  }, 100);
}

// ===== RENDER PRODUCT CARD =====
function renderProductCard(p) {
  _productCache[p.id] = p; // เก็บ cache ไว้ใช้กับ share
  const cover = p.cover
    ? `<img class="product-card-cover" src="${p.cover}" alt="${p.nameTH}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholder = `<div class="product-card-cover-placeholder" ${p.cover ? 'style="display:none"' : ''}>${categoryEmoji(p.category)}</div>`;
  const certs = p.certifications.slice(0, 3).map(c => `<span class="product-cert">${c}</span>`).join('');

  return `
    <div class="product-card" onclick="openProductModal('${p.id}')">
      <div class="product-card-cover-wrap">
        ${cover}${placeholder}
        <button class="btn-share-overlay" onclick="shareProductById(event,'${p.id}')" title="แชร์สินค้า / Share">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      </div>
      <div class="product-card-body">
        <div class="product-card-meta">
          <span class="product-category">${p.category}</span>
          ${p.province ? `<span class="product-province">📍 ${p.province}</span>` : ''}
        </div>
        <div class="product-card-name">${p.nameTH}</div>
        ${p.nameEN ? `<div class="product-card-name-en">${p.nameEN}</div>` : ''}
        <div class="product-card-desc">${p.descriptionTH || p.descriptionEN || ''}</div>
        <div class="product-card-footer">
          <div class="product-certs">${certs}</div>
          <div class="product-card-info">
            ${p.moq ? `<span class="product-moq">MOQ: ${p.moq}</span>` : ''}
            ${p.priceRange ? `<span class="product-price">${p.priceRange}</span>` : ''}
          </div>
        </div>
      </div>
    </div>`;
}

// ===== LOAD PRODUCTS =====
async function loadProducts(reset = false) {
  if (productsPage.loading) return;
  productsPage.loading = true;

  const grid = document.getElementById('productsGrid');
  const loadMoreBtn = document.getElementById('productsLoadMore');

  if (reset) {
    productsPage.cursor = null;
    grid.innerHTML = `<div class="products-loading"><div class="spinner"></div><p>กำลังโหลดสินค้า...</p></div>`;
  }

  const params = new URLSearchParams({ limit: 9 });
  if (productsPage.currentCategory !== 'all') params.set('category', productsPage.currentCategory);
  if (productsPage.search) params.set('search', productsPage.search);
  if (productsPage.cursor) params.set('cursor', productsPage.cursor);

  try {
    const r = await fetch(`/api/products?${params}`);
    const data = await r.json();

    if (reset) grid.innerHTML = '';

    if (!data.products?.length && reset) {
      grid.innerHTML = `<div class="products-empty"><p>ยังไม่มีสินค้าในหมวดหมู่นี้</p><p style="font-size:13px;opacity:.7">No products in this category yet</p></div>`;
    } else {
      data.products.forEach(p => { grid.innerHTML += renderProductCard(p); });
    }

    productsPage.hasMore = data.hasMore;
    productsPage.cursor = data.nextCursor;
    if (loadMoreBtn) loadMoreBtn.style.display = data.hasMore ? 'flex' : 'none';
  } catch (e) {
    if (reset) grid.innerHTML = `<div class="products-empty"><p>เกิดข้อผิดพลาด กรุณาลองใหม่</p></div>`;
  }
  productsPage.loading = false;
}

// ===== OPEN PRODUCT MODAL =====
let allProducts = [];
async function openProductModal(productId) {
  const modal = document.getElementById('productModal');
  const content = document.getElementById('productModalContent');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  content.innerHTML = `<div style="padding:60px;text-align:center"><div class="spinner" style="margin:0 auto 16px;border-top-color:var(--primary)"></div></div>`;

  // ดึงข้อมูลจาก list ที่โหลดแล้ว หรือ fetch ใหม่
  try {
    const r = await fetch(`/api/products?limit=100`);
    const data = await r.json();
    const p = data.products.find(x => x.id === productId);
    if (!p) throw new Error('not found');

    const certs = p.certifications.map(c => `<span class="product-cert product-cert--lg">${c}</span>`).join('');
    content.innerHTML = `
      ${p.cover ? `<img class="product-modal-cover" src="${p.cover}" alt="${p.nameTH}">` : ''}
      <div class="product-modal-body">
        <span class="product-category">${p.category}</span>
        <h2 class="product-modal-title">${p.nameTH}</h2>
        ${p.nameEN ? `<p class="product-modal-title-en">${p.nameEN}</p>` : ''}
        ${p.province ? `<p class="product-modal-province">📍 ${p.province}</p>` : ''}
        ${certs ? `<div class="product-modal-certs">${certs}</div>` : ''}

        <div class="product-modal-specs">
          ${p.priceRange ? `<div class="product-spec"><span class="spec-label">ราคา / Price</span><span class="spec-value">${p.priceRange}</span></div>` : ''}
          ${p.moq ? `<div class="product-spec"><span class="spec-label">MOQ</span><span class="spec-value">${p.moq} ${p.unit || ''}</span></div>` : ''}
          ${p.hsCode ? `<div class="product-spec"><span class="spec-label">HS Code</span><span class="spec-value">${p.hsCode}</span></div>` : ''}
          ${p.sellerName ? `<div class="product-spec"><span class="spec-label">ผู้ส่งออก</span><span class="spec-value">${p.sellerName}</span></div>` : ''}
        </div>

        ${p.descriptionTH ? `<div class="product-modal-desc"><h4>รายละเอียดสินค้า</h4><p>${p.descriptionTH}</p></div>` : ''}
        ${p.descriptionEN ? `<div class="product-modal-desc"><h4>Product Description</h4><p>${p.descriptionEN}</p></div>` : ''}

        <div class="product-modal-actions">
          <button class="btn-inquiry" onclick="openInquiryForm('${p.id}','${p.nameTH.replace(/'/g,"\\'")}')">
            📩 ขอใบเสนอราคา / Request a Quote
          </button>
          <button class="btn-product-share btn-product-share--modal" onclick="shareProductById(event,'${p.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            แชร์สินค้านี้ / Share
          </button>
        </div>
        <p class="inquiry-note">PIT Freight จะเป็นตัวกลางติดต่อผู้ขายและดูแลการส่งออกให้ครบวงจร</p>
      </div>`;
  } catch (e) {
    content.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">⚠️ ไม่สามารถโหลดข้อมูลได้</div>`;
  }
}

function closeProductModal() {
  document.getElementById('productModal').style.display = 'none';
  document.body.style.overflow = '';
}

// ===== INQUIRY FORM =====
function openInquiryForm(productId, productName) {
  document.getElementById('inquiryProductId').value = productId;
  document.getElementById('inquiryProductName').value = productName;
  document.getElementById('inquiryModalTitle').textContent = `ขอใบเสนอราคา: ${productName}`;
  document.getElementById('inquiryModal').style.display = 'flex';
}

function closeInquiryModal() {
  document.getElementById('inquiryModal').style.display = 'none';
}

async function submitInquiry(e) {
  e.preventDefault();
  const btn = document.getElementById('inquirySubmitBtn');
  btn.disabled = true; btn.textContent = 'กำลังส่ง...';

  const form = e.target;
  const data = {
    productId: form.inquiryProductId.value,
    productName: form.inquiryProductName.value,
    buyerName: form.buyerName.value,
    buyerEmail: form.buyerEmail.value,
    buyerPhone: form.buyerPhone.value,
    buyerCountry: form.buyerCountry.value,
    quantity: form.quantity.value,
    unit: form.quantityUnit.value,
    message: form.inquiryMessage.value,
  };

  try {
    const r = await fetch('/api/products/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const res = await r.json();
    if (res.success) {
      form.reset();
      closeInquiryModal();
      showProductToast('✅ ส่งคำขอเรียบร้อย! ทีม PIT Freight จะติดต่อกลับภายใน 1-2 วันทำการ');
    } else throw new Error(res.error);
  } catch (err) {
    alert('เกิดข้อผิดพลาด: ' + err.message);
  }
  btn.disabled = false; btn.textContent = 'ส่งคำขอ';
}

// ===== SUBMIT PRODUCT FORM =====
function openSubmitProductForm() {
  document.getElementById('submitProductModal').style.display = 'flex';
}
function closeSubmitProductModal() {
  document.getElementById('submitProductModal').style.display = 'none';
}

async function submitProduct(e) {
  e.preventDefault();
  const btn = document.getElementById('submitProductBtn');
  btn.disabled = true; btn.textContent = 'กำลังส่ง...';

  const form = e.target;
  const certCheckboxes = form.querySelectorAll('input[name="certifications"]:checked');
  const certifications = Array.from(certCheckboxes).map(cb => cb.value);

  const data = {
    nameTH: form.productNameTH.value,
    nameEN: form.productNameEN.value,
    category: form.productCategory.value,
    descriptionTH: form.productDescTH.value,
    descriptionEN: form.productDescEN.value,
    cover: form.productCover.value,
    priceRange: form.productPrice.value,
    moq: form.productMOQ.value,
    unit: form.productUnit.value,
    hsCode: form.productHSCode.value,
    certifications,
    province: form.productProvince.value,
    sellerName: form.sellerName.value,
    sellerEmail: form.sellerEmail.value,
    sellerPhone: form.sellerPhone.value,
  };

  try {
    const r = await fetch('/api/products/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const res = await r.json();
    if (res.success) {
      form.reset();
      closeSubmitProductModal();
      showProductToast('✅ ส่งข้อมูลสินค้าเรียบร้อย! ทีม Admin จะตรวจสอบและประกาศภายใน 1-2 วันทำการ');
    } else throw new Error(res.error);
  } catch (err) {
    alert('เกิดข้อผิดพลาด: ' + err.message);
  }
  btn.disabled = false; btn.textContent = 'ลงประกาศสินค้า';
}

function showProductToast(msg) {
  const t = document.createElement('div');
  t.className = 'product-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4000);
}

// ===== CATEGORY FILTER =====
function setProductCategory(cat, el) {
  productsPage.currentCategory = cat;
  document.querySelectorAll('.product-filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  loadProducts(true);
}

// ===== SEARCH =====
let searchTimeout;
function onProductSearch(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    productsPage.search = val.trim();
    loadProducts(true);
  }, 400);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeProductModal(); closeInquiryModal(); closeSubmitProductModal(); }
  });
});

// Lazy load when section visible
const productsObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    loadProducts(true);
    productsObserver.disconnect();
  }
}, { threshold: 0.1 });

const productsSection = document.getElementById('products');
if (productsSection) productsObserver.observe(productsSection);
