/**
 * ===== PIT FREIGHT — Smart Freight Intelligence Tools =====
 * 1. ⚓ Freight Calculator
 * 2. 📊 Trade Profile Report
 * 3. 🌊 Route Intelligence
 * 4. 📈 Shipment Forecast
 * 5. ✍️ Proposal Generator
 */

// ===== TAB SWITCHER =====
function switchToolTab(id, btn) {
  document.querySelectorAll('.tools-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tools-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tool-' + id).classList.add('active');
}

// ===== SHARED HELPERS =====
function toolLoading(elId, msg = 'AI กำลังวิเคราะห์...') {
  document.getElementById(elId).innerHTML = `
    <div class="tool-loading">
      <div class="tool-spinner"></div>
      <p>${msg}</p>
    </div>`;
}
function toolError(elId, msg = 'เกิดข้อผิดพลาด กรุณาลองใหม่') {
  document.getElementById(elId).innerHTML = `<div class="tool-error">⚠️ ${msg}</div>`;
}

// ===========================
// 1. FREIGHT CALCULATOR
// ===========================
async function runFreightCalc(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '⏳ กำลังคำนวณ...';
  toolLoading('freightCalcResult', '🤖 AI กำลังเปรียบเทียบราคาและเวลา Sea / Air / Express...');

  const data = {
    product: form.fcProduct.value,
    weight: form.fcWeight.value,
    cbm: form.fcCBM.value,
    origin: form.fcOrigin.value,
    destination: form.fcDest.value,
    incoterms: form.fcIncoterms.value,
  };

  try {
    const r = await fetch('/api/tools/freight-calc', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    const result = await r.json();
    if (result.error) throw new Error(result.error);
    renderFreightCalc(result, data);
  } catch (err) { toolError('freightCalcResult', err.message); }
  btn.disabled = false; btn.textContent = '⚓ คำนวณเปรียบเทียบ';
}

function renderFreightCalc(d, input) {
  const modeIcon = { 'Sea': '🚢', 'Air': '✈️', 'Express': '⚡', 'Rail': '🚂', 'Road': '🚛' };
  const cards = (d.options || []).map(o => {
    const icon = Object.entries(modeIcon).find(([k]) => o.mode.includes(k))?.[1] || '🚚';
    const isRec = o.mode.toLowerCase().includes(d.recommendation?.toLowerCase()) || false;
    const pros = (o.pros || []).map(p => `<li>✓ ${p}</li>`).join('');
    const cons = (o.cons || []).map(c => `<li>✗ ${c}</li>`).join('');
    return `
      <div class="freight-option ${isRec ? 'freight-option--rec' : ''}">
        ${isRec ? '<div class="freight-rec-badge">⭐ แนะนำ</div>' : ''}
        <div class="freight-option-header">
          <span class="freight-mode-icon">${icon}</span>
          <div>
            <div class="freight-mode-name">${o.mode}</div>
            <div class="freight-mode-sub">${o.bestFor || ''}</div>
          </div>
        </div>
        <div class="freight-option-stats">
          <div class="freight-stat"><span class="freight-stat-label">⏱ Transit</span><span class="freight-stat-val">${o.transitDays}</span></div>
          <div class="freight-stat"><span class="freight-stat-label">💵 USD</span><span class="freight-stat-val">${o.costUSD}</span></div>
          <div class="freight-stat"><span class="freight-stat-label">🇹🇭 THB</span><span class="freight-stat-val">${o.costTHB}</span></div>
        </div>
        <div class="freight-pros-cons">
          <ul class="freight-pros">${pros}</ul>
          <ul class="freight-cons">${cons}</ul>
        </div>
      </div>`;
  }).join('');

  const tips = (d.tips || []).map(t => `<li>💡 ${t}</li>`).join('');

  document.getElementById('freightCalcResult').innerHTML = `
    <div class="tool-result-header">
      <div class="tool-result-badge">⚓ ผลการคำนวณ: ${input.origin} → ${input.destination}</div>
      <p class="tool-result-reason">${d.reason || ''}</p>
    </div>
    <div class="freight-options-grid">${cards}</div>
    ${tips ? `<div class="tool-tips"><h4>💡 เคล็ดลับเพิ่มเติม</h4><ul>${tips}</ul></div>` : ''}
    <button class="btn-tool-action" onclick="window.scrollTo({top:document.getElementById('quote').offsetTop-80,behavior:'smooth'})">📩 ขอใบเสนอราคาจริง</button>`;
}

// ===========================
// 2. TRADE PROFILE REPORT
// ===========================
async function runTradeProfile(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '⏳ กำลังวิเคราะห์...';
  toolLoading('tradeProfileResult', '🤖 AI กำลังวิเคราะห์โปรไฟล์และโอกาสปิดดีล...');

  const data = {
    companyName: form.tpCompany.value,
    country: form.tpCountry.value,
    products: form.tpProducts.value,
    teuPerYear: form.tpTEU.value,
    mainRoutes: form.tpRoutes.value,
    painPoints: form.tpPain.value,
  };

  try {
    const r = await fetch('/api/tools/trade-profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    const result = await r.json();
    if (result.error) throw new Error(result.error);
    renderTradeProfile(result, data);
  } catch (err) { toolError('tradeProfileResult', err.message); }
  btn.disabled = false; btn.textContent = '📊 สร้าง Trade Profile Report';
}

function renderTradeProfile(d, input) {
  const chance = d.closingChance || 0;
  const color = chance >= 70 ? '#22c55e' : chance >= 40 ? '#f59e0b' : '#ef4444';
  const strengths = (d.strengths || []).map(s => `<li>✅ ${s}</li>`).join('');
  const pain = (d.painPoints || []).map(p => `<li>⚠️ ${p}</li>`).join('');
  const opps = (d.opportunities || []).map(o => `<li>🎯 ${o}</li>`).join('');
  const svcs = (d.recommendedServices || []).map(s => `<span class="tool-tag">${s}</span>`).join('');

  const html = `
    <div class="tool-result-header">
      <div class="tool-result-badge">📊 Trade Profile: ${input.companyName}</div>
    </div>
    <div class="trade-profile-grid">
      <div class="trade-profile-main">
        <div class="trade-segment">${d.segment || 'N/A'}</div>
        <p>${d.summary || ''}</p>
        <div class="trade-services">${svcs}</div>
        <div class="trade-value-prop"><strong>🏆 Value Proposition:</strong><p>${d.proposedValue || ''}</p></div>
        <div class="trade-next"><strong>👉 Next Action:</strong><p>${d.nextAction || ''}</p></div>
      </div>
      <div class="trade-profile-side">
        <div class="closing-chance-wrap">
          <div class="closing-chance-label">โอกาสปิดดีล</div>
          <div class="closing-chance-num" style="color:${color}">${chance}%</div>
          <div class="closing-chance-bar"><div class="closing-chance-fill" style="width:${chance}%;background:${color}"></div></div>
        </div>
        <div class="trade-lists">
          ${strengths ? `<div><h5>จุดแข็ง</h5><ul>${strengths}</ul></div>` : ''}
          ${pain ? `<div><h5>Pain Points</h5><ul>${pain}</ul></div>` : ''}
          ${opps ? `<div><h5>โอกาส</h5><ul>${opps}</ul></div>` : ''}
        </div>
      </div>
    </div>
    <div class="tool-print-bar">
      <button class="btn-tool-action" onclick="printTradeProfile()">🖨️ Print / PDF</button>
      <button class="btn-tool-secondary" onclick="switchToolTab('proposal', document.querySelector('[data-tool=proposal]')); fillProposalFromProfile('${(input.companyName||'').replace(/'/g,"\\'")}','${(input.country||'').replace(/'/g,"\\'")}')">✍️ สร้าง Proposal จากรายงานนี้</button>
    </div>`;

  document.getElementById('tradeProfileResult').innerHTML = html;
}

function printTradeProfile() {
  window.print();
}

// ===========================
// 3. ROUTE INTELLIGENCE
// ===========================
async function runRouteIntel(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '⏳ กำลังวิเคราะห์เส้นทาง...';
  toolLoading('routeIntelResult', '🤖 AI กำลังวิเคราะห์ Carrier และเส้นทางที่ดีที่สุด...');

  const data = {
    origin: form.riOrigin.value,
    destination: form.riDest.value,
    commodity: form.riCommodity.value,
    volume: form.riVolume.value,
  };

  try {
    const r = await fetch('/api/tools/route-intel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    const result = await r.json();
    if (result.error) throw new Error(result.error);
    renderRouteIntel(result, data);
  } catch (err) { toolError('routeIntelResult', err.message); }
  btn.disabled = false; btn.textContent = '🗺️ วิเคราะห์เส้นทาง';
}

function renderRouteIntel(d, input) {
  const carriers = (d.carriers || []).map((c, i) => `
    <div class="carrier-card">
      <div class="carrier-rank">#${c.rank || i + 1}</div>
      <div class="carrier-info">
        <div class="carrier-name">${c.name}</div>
        <div class="carrier-type">${c.type || 'Sea'}</div>
      </div>
      <div class="carrier-stats">
        <div class="carrier-stat"><span>⏱</span>${c.transitDays}</div>
        <div class="carrier-stat"><span>🚢</span>${c.portOfLoading} → ${c.portOfDischarge}</div>
        <div class="carrier-stat"><span>📅</span>${c.frequency}</div>
        <div class="carrier-stat"><span>✅</span>Reliability ${c.reliability}</div>
      </div>
      ${c.notes ? `<div class="carrier-notes">${c.notes}</div>` : ''}
    </div>`).join('');

  const warnings = (d.seasonalWarnings || []).map(w => `<li>⚠️ ${w}</li>`).join('');
  const tips = (d.tips || []).map(t => `<li>💡 ${t}</li>`).join('');

  document.getElementById('routeIntelResult').innerHTML = `
    <div class="tool-result-header">
      <div class="tool-result-badge">🌊 Route: ${input.origin} → ${input.destination}</div>
      <p class="tool-result-reason">${d.routeSummary || ''}</p>
    </div>
    <div class="carriers-grid">${carriers}</div>
    ${warnings ? `<div class="tool-warnings"><h4>🌧️ คำเตือนฤดูกาล</h4><ul>${warnings}</ul></div>` : ''}
    ${tips ? `<div class="tool-tips"><h4>💡 เคล็ดลับ</h4><ul>${tips}</ul></div>` : ''}
    <button class="btn-tool-action" onclick="window.scrollTo({top:document.getElementById('quote').offsetTop-80,behavior:'smooth'})">📩 ขอใบเสนอราคา</button>`;
}

// ===========================
// 4. SHIPMENT FORECAST
// ===========================
async function runForecast(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '⏳ กำลังพยากรณ์...';
  toolLoading('forecastResult', '🤖 AI กำลังวิเคราะห์แนวโน้ม 12 เดือน...');

  const data = {
    commodity: form.fcCommodity.value,
    tradeRoute: form.fcRoute.value,
    yearsData: form.fcHistory.value,
  };

  try {
    const r = await fetch('/api/tools/forecast', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    const result = await r.json();
    if (result.error) throw new Error(result.error);
    renderForecast(result);
  } catch (err) { toolError('forecastResult', err.message); }
  btn.disabled = false; btn.textContent = '📈 พยากรณ์ Shipment';
}

function renderForecast(d) {
  const months = d.months || [];
  const maxTEU = Math.max(...months.map(m => m.teu || 0), 1);
  const levelColor = { peak: '#ef4444', high: '#f59e0b', normal: '#3b82f6', low: '#94a3b8' };

  const bars = months.map(m => {
    const pct = Math.round((m.teu / maxTEU) * 100);
    const col = levelColor[m.level] || '#3b82f6';
    return `
      <div class="forecast-bar-wrap" title="${m.advice || ''}">
        <div class="forecast-bar-label">${m.teu}</div>
        <div class="forecast-bar-outer">
          <div class="forecast-bar-inner" style="height:${pct}%;background:${col}"></div>
        </div>
        <div class="forecast-month">${m.month}</div>
        <div class="forecast-level" style="color:${col}">${m.level === 'peak' ? '🔴' : m.level === 'high' ? '🟠' : m.level === 'normal' ? '🔵' : '⚪'}</div>
      </div>`;
  }).join('');

  const peakBadges = (d.peakMonths || []).map(m => `<span class="forecast-badge forecast-badge--peak">${m}</span>`).join('');
  const lowBadges = (d.lowMonths || []).map(m => `<span class="forecast-badge forecast-badge--low">${m}</span>`).join('');

  document.getElementById('forecastResult').innerHTML = `
    <div class="tool-result-header">
      <div class="tool-result-badge">📈 Shipment Forecast — ${d.yearlyTotal || '?'} TEU/ปี (คาดการณ์)</div>
      <p class="tool-result-reason">${d.summary || ''}</p>
    </div>
    <div class="forecast-chart">${bars}</div>
    <div class="forecast-legend">
      <span>🔴 Peak</span><span>🟠 High</span><span>🔵 Normal</span><span>⚪ Low</span>
    </div>
    <div class="forecast-seasons">
      <div><strong>🔴 Peak Months:</strong> ${peakBadges || '-'}</div>
      <div><strong>⚪ Low Months:</strong> ${lowBadges || '-'}</div>
    </div>
    <div class="tool-tips"><h4>📅 คำแนะนำการจอง</h4><p>${d.bookingAdvice || ''}</p></div>`;
}

// ===========================
// 5. PROPOSAL GENERATOR
// ===========================
async function runProposal(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '⏳ AI กำลังเขียน Proposal...';
  toolLoading('proposalResult', '✍️ AI กำลังเขียน Business Proposal มืออาชีพ...');

  const data = {
    companyName: form.pgCompany.value,
    contactName: form.pgContact.value,
    country: form.pgCountry.value,
    requirements: form.pgReq.value,
    services: form.pgServices.value,
    timeline: form.pgTimeline.value,
  };

  try {
    const r = await fetch('/api/tools/proposal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    const result = await r.json();
    if (result.error) throw new Error(result.error);
    renderProposal(result, data);
  } catch (err) { toolError('proposalResult', err.message); }
  btn.disabled = false; btn.textContent = '✍️ สร้าง Proposal';
}

function renderProposal(d, input) {
  // Convert Markdown to basic HTML
  const md = (d.proposal || '').replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hlp])/gm, '');

  const keyPoints = (d.keyPoints || []).map(k => `<span class="tool-tag tool-tag--green">${k}</span>`).join('');

  document.getElementById('proposalResult').innerHTML = `
    <div class="tool-result-header">
      <div class="tool-result-badge">✍️ Business Proposal — ${input.companyName}</div>
      <div class="proposal-subject"><strong>Subject:</strong> ${d.subject || ''}</div>
      ${keyPoints ? `<div class="proposal-keypoints">${keyPoints}</div>` : ''}
    </div>
    <div class="proposal-body" id="proposalBody"><p>${md}</p></div>
    <div class="tool-print-bar">
      <button class="btn-tool-action" onclick="copyProposal()">📋 Copy Proposal</button>
      <button class="btn-tool-secondary" onclick="emailProposal('${(d.subject||'').replace(/'/g,"\\'")}')">📧 ส่งอีเมล</button>
      <button class="btn-tool-secondary" onclick="window.print()">🖨️ Print / PDF</button>
    </div>`;
}

function copyProposal() {
  const el = document.getElementById('proposalBody');
  if (!el) return;
  const text = el.innerText || el.textContent;
  navigator.clipboard?.writeText(text).then(() => {
    showToolsToast('📋 คัดลอก Proposal แล้ว!');
  });
}

function emailProposal(subject) {
  const body = document.getElementById('proposalBody')?.innerText || '';
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function fillProposalFromProfile(company, country) {
  const pgCompany = document.querySelector('[name=pgCompany]');
  const pgCountry = document.querySelector('[name=pgCountry]');
  if (pgCompany) pgCompany.value = company;
  if (pgCountry) pgCountry.value = country;
}

// ===== TOAST =====
function showToolsToast(msg) {
  const t = document.createElement('div');
  t.className = 'product-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}
