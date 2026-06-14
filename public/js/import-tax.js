(function () {
  const exchangeRates = {
    USD: 36.5,
    CNY: 5.05,
    EUR: 39.8,
    JPY: 0.235,
    THB: 1,
  };

  const currencyNames = {
    USD: 'US Dollar',
    CNY: 'Chinese Yuan',
    EUR: 'Euro',
    JPY: 'Japanese Yen',
    THB: 'Thai Baht',
  };

  const money = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 2,
  });

  let latestSnapshot = null;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function numberValue(form, name) {
    const value = Number(form.elements[name]?.value || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function percent(value) {
    return Math.max(value, 0) / 100;
  }

  function rateLabel(value) {
    return `${value.toFixed(2)}%`;
  }

  function renderRow(label, base, rate, amount) {
    return `
      <tr>
        <td>${escapeHtml(label)}</td>
        <td>${money.format(base)}</td>
        <td>${escapeHtml(rate)}</td>
        <td>${money.format(amount)}</td>
      </tr>`;
  }

  function getFtaReduction(form) {
    const selected = form.elements.ftaScheme.selectedOptions[0];
    const preset = selected?.dataset.reduction;
    if (form.elements.ftaScheme.value !== 'manual' && preset !== undefined) {
      form.elements.dutyReduction.value = preset;
    }
    return Math.min(Math.max(numberValue(form, 'dutyReduction'), 0), 100);
  }

  function calculateImportTax(form) {
    const invoiceValue = numberValue(form, 'invoiceValue');
    const freight = numberValue(form, 'freight');
    const insurance = numberValue(form, 'insurance');
    const exchangeRate = numberValue(form, 'exchangeRate');
    const dutyRate = percent(numberValue(form, 'dutyRate'));
    const exciseRate = percent(numberValue(form, 'exciseRate'));
    const vatRate = percent(numberValue(form, 'vatRate'));
    const otherFees = numberValue(form, 'otherFees');
    const dutyReduction = getFtaReduction(form) / 100;

    const cifForeign = invoiceValue + freight + insurance;
    const cifTHB = cifForeign * exchangeRate;
    const effectiveDutyRate = dutyRate * (1 - dutyReduction);
    const dutySaved = cifTHB * (dutyRate - effectiveDutyRate);
    const duty = cifTHB * effectiveDutyRate;
    const exciseBase = cifTHB + duty;
    const excise = exciseBase * exciseRate;
    const vatBase = cifTHB + duty + excise + otherFees;
    const vat = vatBase * vatRate;
    const taxesAndFees = duty + excise + vat + otherFees;
    const landedCost = cifTHB + taxesAndFees;

    return {
      cifForeign,
      cifTHB,
      dutyRate,
      effectiveDutyRate,
      dutyReduction,
      dutySaved,
      duty,
      exciseBase,
      excise,
      vatBase,
      vat,
      otherFees,
      taxesAndFees,
      landedCost,
    };
  }

  function snapshotForm(form, totals) {
    const ftaOption = form.elements.ftaScheme.selectedOptions[0];
    return {
      product: form.elements.product.value.trim() || 'Imported goods',
      hsCode: form.elements.hsCode.value.trim() || '-',
      originCountry: form.elements.originCountry.value.trim() || '-',
      currency: form.elements.currency.value,
      exchangeRate: numberValue(form, 'exchangeRate'),
      dutyRate: numberValue(form, 'dutyRate'),
      exciseRate: numberValue(form, 'exciseRate'),
      vatRate: numberValue(form, 'vatRate'),
      ftaLabel: ftaOption?.textContent || 'No FTA / MFN duty',
      totals,
      generatedAt: new Date().toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    };
  }

  function renderImportTaxResult(form, data) {
    const { totals } = data;

    document.getElementById('importTaxResult').innerHTML = `
      <div class="import-tax-summary">
        <div class="import-tax-metric">
          <strong>CIF Value</strong>
          <span>${money.format(totals.cifTHB)}</span>
        </div>
        <div class="import-tax-metric">
          <strong>Duty Saved by FTA</strong>
          <span>${money.format(totals.dutySaved)}</span>
        </div>
        <div class="import-tax-metric total">
          <strong>Estimated Landed Cost</strong>
          <span>${money.format(totals.landedCost)}</span>
        </div>
        <div class="import-tax-metric">
          <strong>Total Tax & Fees</strong>
          <span>${money.format(totals.taxesAndFees)}</span>
        </div>
        <div class="import-tax-metric">
          <strong>Effective Duty</strong>
          <span>${rateLabel(totals.effectiveDutyRate * 100)}</span>
        </div>
      </div>

      <div class="import-tax-breakdown-wrap">
        <table class="import-tax-breakdown">
          <thead>
            <tr>
              <th>Charge</th>
              <th>Tax Base</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CIF (${escapeHtml(data.currency)})</td>
              <td>${totals.cifForeign.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ${escapeHtml(data.currency)}</td>
              <td>${data.exchangeRate.toLocaleString('th-TH', { maximumFractionDigits: 4 })}</td>
              <td>${money.format(totals.cifTHB)}</td>
            </tr>
            ${renderRow(`Import duty (${data.ftaLabel})`, totals.cifTHB, rateLabel(totals.effectiveDutyRate * 100), totals.duty)}
            ${renderRow('Excise / other tax', totals.exciseBase, rateLabel(data.exciseRate), totals.excise)}
            ${renderRow('VAT', totals.vatBase, rateLabel(data.vatRate), totals.vat)}
            ${renderRow('Customs / port fees', totals.otherFees, '-', totals.otherFees)}
            <tr>
              <td>Estimated landed cost</td>
              <td colspan="2">CIF + duty + excise/other tax + VAT + fees</td>
              <td>${money.format(totals.landedCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="import-tax-footnote">
        Product: ${escapeHtml(data.product)} | HS Code: ${escapeHtml(data.hsCode)} | Origin: ${escapeHtml(data.originCountry)}<br>
        Estimate generated ${escapeHtml(data.generatedAt)}. Final duty depends on Thai Customs classification, import controls, declared value, supporting FTA certificate and shipment documents.
      </div>`;
  }

  function updateCurrencyStrip(form) {
    const currency = form.elements.currency.value;
    const rate = numberValue(form, 'exchangeRate');
    const cifForeign = numberValue(form, 'invoiceValue') + numberValue(form, 'freight') + numberValue(form, 'insurance');
    const converted = cifForeign * rate;
    const strip = document.getElementById('currencyStrip');
    if (!strip) return;
    strip.innerHTML = `
      <span>Indicative converter:</span>
      <strong>1 ${escapeHtml(currency)} = ${rate.toLocaleString('th-TH', { maximumFractionDigits: 4 })} THB</strong>
      <small>CIF ${cifForeign.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ${escapeHtml(currency)} = ${money.format(converted)}</small>`;
  }

  function calculateAndRender(form) {
    const totals = calculateImportTax(form);
    latestSnapshot = snapshotForm(form, totals);
    renderImportTaxResult(form, latestSnapshot);
    updateCurrencyStrip(form);
    // Show share bar after calculation
    const shareBar = document.getElementById('importTaxShare');
    if (shareBar) shareBar.style.display = 'flex';
    return latestSnapshot;
  }

  function exportPdf() {
    if (!latestSnapshot) {
      const form = document.getElementById('importTaxForm');
      if (form) calculateAndRender(form);
    }
    if (!latestSnapshot) return;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=760');
    if (!printWindow) { window.print(); return; }

    printWindow.document.write(buildPrintHtml(latestSnapshot, true));
    printWindow.document.close();
  }

  function buildPrintHtml(data, autoPrint) {
    const rows = [
      ['CIF Value', money.format(data.totals.cifTHB)],
      ['Import Duty', money.format(data.totals.duty)],
      ['FTA Duty Saving', money.format(data.totals.dutySaved)],
      ['VAT', money.format(data.totals.vat)],
      ['Customs / Port Fees', money.format(data.totals.otherFees)],
      ['Total Tax & Fees', money.format(data.totals.taxesAndFees)],
      ['Estimated Landed Cost', money.format(data.totals.landedCost)],
    ].map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join('');

    return `<!doctype html>
<html>
<head>
  <title>Thailand Import Tax Estimate</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 36px; font-family: Arial, sans-serif; color: #081a2f; background: #fff; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 4px solid #c9a84c; padding-bottom: 18px; margin-bottom: 24px; }
    .header-left .kicker { color: #8a6a2f; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 6px; }
    .header-left h1 { font-size: 26px; font-weight: 900; color: #081624; margin-bottom: 4px; }
    .header-left p { color: #64748b; font-size: 13px; }
    .header-right { text-align: right; font-size: 12px; color: #64748b; line-height: 1.7; }
    .meta-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px 20px; margin-bottom: 24px; background: #f8f9fc; border-radius: 10px; padding: 16px; }
    .meta-item label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; display: block; margin-bottom: 2px; }
    .meta-item span { font-size: 13px; font-weight: 600; color: #081624; }
    .card-landed { background: linear-gradient(135deg, #081624, #1a4f8a); color: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
    .card-landed .label { font-size: 13px; opacity: .75; margin-bottom: 4px; }
    .card-landed .amount { font-size: 32px; font-weight: 900; color: #f2d188; }
    .card-landed .sub { font-size: 11px; opacity: .6; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: #f1f5f9; }
    th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #475569; }
    td { padding: 11px 14px; border-bottom: 1px solid #e8eef6; }
    td:last-child { text-align: right; font-weight: 700; color: #081624; }
    tr:last-child td { border-bottom: none; background: #fffbf0; font-weight: 800; color: #7a4f00; }
    tr:last-child td:last-child { color: #c9a84c; font-size: 15px; }
    .note { margin-top: 20px; padding: 14px 16px; background: #f8f9fc; border-left: 3px solid #c9a84c; border-radius: 0 8px 8px 0; font-size: 11px; color: #64748b; line-height: 1.7; }
    .footer-line { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="kicker">Project International Trade · PIT Freight</div>
      <h1>ใบประมาณการค่าภาษีนำเข้า</h1>
      <p>Thailand Import Tax Estimate — Professional landed-cost estimate for customs planning.</p>
    </div>
    <div class="header-right">
      วันที่: ${escapeHtml(data.generatedAt)}<br>
      pitfreight.com
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><label>สินค้า / Product</label><span>${escapeHtml(data.product)}</span></div>
    <div class="meta-item"><label>HS Code</label><span>${escapeHtml(data.hsCode)}</span></div>
    <div class="meta-item"><label>ประเทศต้นทาง / Origin</label><span>${escapeHtml(data.originCountry)}</span></div>
    <div class="meta-item"><label>สิทธิ์ FTA</label><span>${escapeHtml(data.ftaLabel)}</span></div>
    <div class="meta-item"><label>สกุลเงิน / Currency</label><span>${escapeHtml(data.currency)} (${escapeHtml(currencyNames[data.currency] || data.currency)})</span></div>
    <div class="meta-item"><label>อัตราแลกเปลี่ยน</label><span>1 ${escapeHtml(data.currency)} = ${data.exchangeRate.toLocaleString('th-TH',{maximumFractionDigits:4})} THB</span></div>
  </div>

  <div class="card-landed">
    <div>
      <div class="label">ราคาต้นทุนนำเข้าประมาณการ (Estimated Landed Cost)</div>
      <div class="amount">${money.format(data.totals.landedCost)}</div>
      <div class="sub">รวมภาษีนำเข้า, VAT และค่าธรรมเนียมทั้งหมด</div>
    </div>
    <div style="text-align:right;">
      <div class="label">ภาษีและค่าธรรมเนียมรวม</div>
      <div style="font-size:20px;font-weight:800;color:#f2d188;">${money.format(data.totals.taxesAndFees)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>รายการ (Component)</th>
        <th style="text-align:right;">จำนวนเงิน (THB)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="note">
    ⚠️ เอกสารนี้เป็นเพียงการประมาณการเบื้องต้นเพื่อวางแผนต้นทุน ค่าภาษีจริงขึ้นอยู่กับการพิจารณาของกรมศุลกากรไทย ราคาสินค้าที่แจ้ง ใบรับรองสิทธิ์ FTA และเอกสารประกอบการนำเข้า<br>
    This estimate is for planning purposes only. Final tax depends on Thai Customs classification, declared customs value, licenses, FTA certificates and shipment inspection.
  </div>

  <div class="footer-line">
    Project International Trade Co., Ltd. · pitfreight.com · สอบถามข้อมูลเพิ่มเติม: info@pitfreight.com
  </div>
  ${autoPrint ? `<script>window.onload = () => { window.focus(); window.print(); }<\/script>` : ''}
</body>
</html>`;
  }

  function previewPdf() {
    if (!latestSnapshot) {
      const form = document.getElementById('importTaxForm');
      if (form) calculateAndRender(form);
    }
    if (!latestSnapshot) {
      alert('กรุณากรอกข้อมูลและกดคำนวณก่อน');
      return;
    }

    const modal = document.getElementById('printPreviewModal');
    const frame = document.getElementById('printPreviewFrame');
    if (!modal || !frame) return;

    const html = buildPrintHtml(latestSnapshot, false);
    frame.srcdoc = html;
    modal.style.display = 'flex';
  }

  function sendToEmail() {
    if (!latestSnapshot) {
      alert('กรุณากรอกข้อมูลและกดคำนวณก่อน');
      return;
    }
    const d = latestSnapshot;
    const subject = encodeURIComponent(`[PIT Freight] ประมาณการค่าภาษีนำเข้า — ${d.product} (HS ${d.hsCode})`);
    const body = encodeURIComponent(
`สวัสดีครับ/ค่ะ ทีมงาน PIT Freight

ขอส่งผลประมาณการค่าภาษีนำเข้าดังนี้:

=== ข้อมูลสินค้า ===
สินค้า: ${d.product}
HS Code: ${d.hsCode}
ประเทศต้นทาง: ${d.originCountry}
สิทธิ์ FTA: ${d.ftaLabel}
สกุลเงิน: ${d.currency}
อัตราแลกเปลี่ยน: 1 ${d.currency} = ${d.exchangeRate} THB

=== ผลคำนวณ (หน่วย: บาท) ===
CIF Value:              ${money.format(d.totals.cifTHB)}
Import Duty:            ${money.format(d.totals.duty)}
FTA Duty Saving:        ${money.format(d.totals.dutySaved)}
VAT:                    ${money.format(d.totals.vat)}
Customs / Port Fees:    ${money.format(d.totals.otherFees)}
รวมภาษีและค่าธรรมเนียม: ${money.format(d.totals.taxesAndFees)}
ราคาต้นทุนนำเข้ารวม:    ${money.format(d.totals.landedCost)}

สร้างเมื่อ: ${d.generatedAt}
คำนวณจาก: pitfreight.com

กรุณาตรวจสอบและให้คำแนะนำเพิ่มเติมด้วยครับ/ค่ะ
ขอบคุณครับ/ค่ะ`
    );
    window.location.href = `mailto:phanlerd.03@gmail.com?subject=${subject}&body=${body}`;
  }

  async function submitLead(event) {
    event.preventDefault();
    const form = event.target;
    const status = document.getElementById('importLeadStatus');
    const taxForm = document.getElementById('importTaxForm');
    const data = latestSnapshot || (taxForm ? calculateAndRender(taxForm) : null);
    const formData = new FormData(form);

    const message = [
      formData.get('message') || '',
      '',
      'Import Tax Calculator Lead',
      data ? `Product: ${data.product}` : '',
      data ? `HS Code: ${data.hsCode}` : '',
      data ? `Origin: ${data.originCountry}` : '',
      data ? `FTA: ${data.ftaLabel}` : '',
      data ? `Estimated Landed Cost: ${money.format(data.totals.landedCost)}` : '',
    ].filter(Boolean).join('\n');

    status.className = 'lead-status';
    status.textContent = 'Sending request...';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          company: formData.get('company'),
          service: 'Import Tax / Customs Clearance',
          message,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || 'Unable to send request');
      status.className = 'lead-status success';
      status.textContent = result.message || 'Request sent. Our team will contact you shortly.';
      form.reset();
    } catch (error) {
      status.className = 'lead-status error';
      status.textContent = error.message || 'Unable to send request. Please try again.';
    }
  }

  function bindImportTaxCalculator() {
    const form = document.getElementById('importTaxForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      calculateAndRender(form);
    });

    form.elements.currency.addEventListener('change', () => {
      const currency = form.elements.currency.value;
      form.elements.exchangeRate.value = exchangeRates[currency] || 1;
      updateCurrencyStrip(form);
    });

    form.elements.ftaScheme.addEventListener('change', () => {
      getFtaReduction(form);
    });

    ['invoiceValue', 'freight', 'insurance', 'exchangeRate'].forEach((name) => {
      form.elements[name].addEventListener('input', () => updateCurrencyStrip(form));
    });

    document.getElementById('importTaxPdf')?.addEventListener('click', exportPdf);

    // Preview button — show iframe modal before printing
    document.getElementById('importTaxPreview')?.addEventListener('click', previewPdf);
    window._importTaxPreview = previewPdf;

    // Send to Email
    document.getElementById('importTaxSendEmail')?.addEventListener('click', sendToEmail);

    document.getElementById('importTaxReset')?.addEventListener('click', () => {
      form.reset();
      latestSnapshot = null;
      updateCurrencyStrip(form);
      const shareBar = document.getElementById('importTaxShare');
      if (shareBar) shareBar.style.display = 'none';
      document.getElementById('importTaxResult').innerHTML = `
        <div class="import-tax-empty">
          <strong>Ready to estimate landed cost</strong>
          <span>Enter shipment value, duty rate and any FTA preference to calculate CIF, import duty, VAT and landed cost.</span>
        </div>`;
    });

    document.getElementById('importLeadForm')?.addEventListener('submit', submitLead);
    updateCurrencyStrip(form);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindImportTaxCalculator);
  } else {
    bindImportTaxCalculator();
  }
})();
