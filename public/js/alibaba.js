/**
 * ===== ALIBABA SOURCING HUB =====
 */

// ===== TAB SWITCHING =====
function switchAlibabaTab(tab, el) {
  document.querySelectorAll('.alibaba-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.alibaba-tab-pane').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('alibaba-' + tab).classList.add('active');
}

// ===== A: SOURCING FORM =====
async function submitSourcing(e) {
  e.preventDefault();
  const btn = document.getElementById('sourcingSubmitBtn');
  btn.disabled = true; btn.textContent = 'กำลังส่ง...';

  const form = e.target;
  const data = {
    productName: form.sourcingProduct.value,
    description: form.sourcingDesc.value,
    category: form.sourcingCategory.value,
    budget: form.sourcingBudget.value,
    quantity: form.sourcingQty.value,
    unit: form.sourcingUnit.value,
    shippingMethod: form.sourcingShipping.value,
    name: form.sourcingName.value,
    email: form.sourcingEmail.value,
    phone: form.sourcingPhone.value,
    company: form.sourcingCompany.value,
  };

  try {
    const r = await fetch('/api/alibaba/sourcing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const res = await r.json();
    if (res.success) {
      form.reset();
      document.getElementById('sourcingResult').innerHTML = `
        <div class="alibaba-success">
          <div style="font-size:48px">✅</div>
          <h3>ส่งคำขอเรียบร้อยแล้ว!</h3>
          <p>ทีม PIT Freight จะค้นหาสินค้าใน Alibaba.com และส่งใบเสนอราคาให้ทาง Email ภายใน 1-2 วันทำการ</p>
        </div>`;
    } else throw new Error(res.error);
  } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
  btn.disabled = false; btn.textContent = '📨 ส่งคำขอ Sourcing';
}

// ===== B: AI SEARCH =====
async function searchAlibaba() {
  const query = document.getElementById('alibabaSearchInput').value.trim();
  if (!query) return;

  const resultDiv = document.getElementById('searchResult');
  const btn = document.getElementById('searchBtn');
  btn.disabled = true; btn.textContent = '🔍 กำลังวิเคราะห์...';
  resultDiv.innerHTML = `<div class="alibaba-loading"><div class="spinner"></div><p>AI กำลังวิเคราะห์สินค้า...</p></div>`;

  try {
    const r = await fetch('/api/alibaba/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    const data = await r.json();

    if (!data.success) throw new Error(data.error);

    const keywords = data.keywords_en.map(k =>
      `<a href="https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(k)}&IndexArea=product_en" target="_blank" class="keyword-chip">${k} 🔗</a>`
    ).join('');

    const tips = data.supplier_tips.map(t => `<li>✅ ${t}</li>`).join('');
    const flags = data.red_flags.map(f => `<li>⚠️ ${f}</li>`).join('');

    resultDiv.innerHTML = `
      <div class="search-result-card">
        <div class="search-result-header">
          <h3>🔍 ผลการวิเคราะห์: "${query}"</h3>
        </div>

        <div class="search-section">
          <h4>🔑 Keywords สำหรับค้นหาใน Alibaba</h4>
          <div class="keywords-wrap">${keywords}</div>
        </div>

        <a href="${data.alibaba_url}" target="_blank" class="btn-goto-alibaba">
          🛒 ค้นหาใน Alibaba.com →
        </a>

        <div class="search-grid">
          <div class="search-info-box">
            <h4>📦 หมวดหมู่ที่แนะนำ</h4>
            <p>${data.category_tip}</p>
            ${data.estimated_moq !== '-' ? `<p><strong>MOQ ประมาณ:</strong> ${data.estimated_moq}</p>` : ''}
            ${data.hs_code_hint !== '-' ? `<p><strong>HS Code:</strong> ${data.hs_code_hint}</p>` : ''}
          </div>
          <div class="search-info-box">
            <h4>✅ เคล็ดลับเลือก Supplier</h4>
            <ul>${tips}</ul>
          </div>
        </div>

        <div class="search-info-box search-info-box--warn">
          <h4>⚠️ สิ่งที่ต้องระวัง</h4>
          <ul>${flags}</ul>
        </div>

        <div class="search-pit-cta">
          <p>🚢 ให้ <strong>PIT Freight</strong> จัดการนำเข้าให้ครบวงจร ตั้งแต่หา Supplier จนถึงส่งถึงมือ</p>
          <button onclick="switchAlibabaTab('sourcing', document.querySelector('[data-tab=sourcing]'))" class="btn-pit-source">
            📨 ให้ PIT Freight ช่วยหาสินค้านี้
          </button>
        </div>
      </div>`;
  } catch (err) {
    resultDiv.innerHTML = `<div style="color:#ef4444;padding:20px">เกิดข้อผิดพลาด: ${err.message}</div>`;
  }
  btn.disabled = false; btn.textContent = '🤖 วิเคราะห์ด้วย AI';
}

// ===== C: COST CALCULATOR =====
async function calculateCost() {
  const form = document.getElementById('calcForm');
  const btn = document.getElementById('calcBtn');
  const resultDiv = document.getElementById('calcResult');

  const data = {
    fobPrice: document.getElementById('calcFOB').value,
    quantity: document.getElementById('calcQty').value,
    unit: document.getElementById('calcUnit').value,
    productType: document.getElementById('calcProductType').value,
    shippingMethod: document.getElementById('calcShipping').value,
    weight: document.getElementById('calcWeight').value,
    cbm: document.getElementById('calcCBM').value,
  };

  if (!data.fobPrice || !data.quantity) {
    resultDiv.innerHTML = `<div style="color:#ef4444;padding:12px">⚠️ กรุณากรอกราคา FOB และจำนวน</div>`;
    return;
  }

  btn.disabled = true; btn.textContent = 'กำลังคำนวณ...';

  try {
    const r = await fetch('/api/alibaba/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const res = await r.json();
    if (!res.success) throw new Error(res.error);

    const b = res.breakdown;
    const fmt = n => Number(n).toLocaleString('th-TH');

    resultDiv.innerHTML = `
      <div class="calc-result-card">
        <h3>📊 สรุปต้นทุนนำเข้า</h3>

        <div class="calc-breakdown">
          <div class="calc-row"><span>ราคา FOB รวม</span><span>$${fmt(b.fobUSD)}</span></div>
          <div class="calc-row"><span>ค่าขนส่ง (ประมาณ)</span><span>$${fmt(b.freightUSD)}</span></div>
          <div class="calc-row"><span>ประกันภัย</span><span>$${fmt(b.insuranceUSD)}</span></div>
          <div class="calc-row calc-row--sub"><span>รวม CIF</span><span>$${fmt(b.cifUSD)} ≈ ฿${fmt(b.cifTHB)}</span></div>
          <div class="calc-row"><span>อากรนำเข้า (${b.dutyRate})</span><span>฿${fmt(b.dutyTHB)}</span></div>
          <div class="calc-row"><span>VAT 7%</span><span>฿${fmt(b.vatTHB)}</span></div>
          <div class="calc-row"><span>ค่าธรรมเนียมท่า/ด่าน</span><span>฿${fmt(b.handlingTHB)}</span></div>
          <div class="calc-row calc-row--total">
            <span>💰 ต้นทุนรวมทั้งหมด</span>
            <span>฿${fmt(b.totalTHB)}<br><small>≈ $${fmt(b.totalUSD)}</small></span>
          </div>
          <div class="calc-row calc-row--unit">
            <span>ต้นทุนต่อ${b.unit}</span>
            <span>฿${fmt(b.costPerUnit)}</span>
          </div>
        </div>

        <p class="calc-note">* อัตราแลกเปลี่ยน ฿${b.exchangeRate}/USD | ตัวเลขเป็นค่าประมาณ อาจแตกต่างตามสภาพจริง</p>

        <div class="search-pit-cta" style="margin-top:16px">
          <p>📋 ต้องการใบเสนอราคาที่แม่นยำ? <strong>PIT Freight</strong> ให้ราคาจริงได้เลย</p>
          <button onclick="switchAlibabaTab('sourcing', document.querySelector('[data-tab=sourcing]'))" class="btn-pit-source">
            📨 ขอใบเสนอราคาจริง
          </button>
        </div>
      </div>`;
  } catch (err) {
    resultDiv.innerHTML = `<div style="color:#ef4444;padding:12px">เกิดข้อผิดพลาด: ${err.message}</div>`;
  }
  btn.disabled = false; btn.textContent = '💰 คำนวณต้นทุน';
}

// Enter key for search
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('alibabaSearchInput');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') searchAlibaba(); });
});
