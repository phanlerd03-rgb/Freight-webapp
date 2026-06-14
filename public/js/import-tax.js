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
    return latestSnapshot;
  }

  function exportPdf() {
    if (!latestSnapshot) {
      const form = document.getElementById('importTaxForm');
      if (form) calculateAndRender(form);
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=760');
    if (!printWindow || !latestSnapshot) {
      window.print();
      return;
    }

    const data = latestSnapshot;
    const rows = [
      ['CIF Value', money.format(data.totals.cifTHB)],
      ['Import Duty', money.format(data.totals.duty)],
      ['FTA Duty Saving', money.format(data.totals.dutySaved)],
      ['VAT', money.format(data.totals.vat)],
      ['Customs / Port Fees', money.format(data.totals.otherFees)],
      ['Total Tax & Fees', money.format(data.totals.taxesAndFees)],
      ['Estimated Landed Cost', money.format(data.totals.landedCost)],
    ].map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join('');

    printWindow.document.write(`<!doctype html>
      <html>
      <head>
        <title>Thailand Import Tax Estimate</title>
        <style>
          body { margin: 0; padding: 36px; font-family: Arial, sans-serif; color: #081a2f; }
          .header { border-bottom: 4px solid #d6a84f; padding-bottom: 18px; margin-bottom: 24px; }
          .kicker { color: #8a6a2f; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
          h1 { margin: 8px 0 4px; font-size: 30px; }
          p { color: #475569; line-height: 1.6; }
          .meta { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px 22px; margin-bottom: 24px; font-size: 13px; }
          .card { background: #081a2f; color: #fff; padding: 20px; border-radius: 12px; margin-bottom: 18px; }
          .card strong { color: #f2d188; font-size: 28px; display: block; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #dce4ee; padding: 12px; text-align: left; }
          th { background: #f8f3e8; color: #5f4a22; }
          td:last-child { text-align: right; font-weight: 700; }
          .note { margin-top: 22px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="kicker">Project International Trade</div>
          <h1>Thailand Import Tax Estimate</h1>
          <p>Professional landed-cost estimate for customs planning.</p>
        </div>
        <div class="meta">
          <div><strong>Product:</strong> ${escapeHtml(data.product)}</div>
          <div><strong>HS Code:</strong> ${escapeHtml(data.hsCode)}</div>
          <div><strong>Origin:</strong> ${escapeHtml(data.originCountry)}</div>
          <div><strong>FTA:</strong> ${escapeHtml(data.ftaLabel)}</div>
          <div><strong>Currency:</strong> ${escapeHtml(data.currency)} (${escapeHtml(currencyNames[data.currency] || data.currency)})</div>
          <div><strong>Generated:</strong> ${escapeHtml(data.generatedAt)}</div>
        </div>
        <div class="card">Estimated Landed Cost<strong>${money.format(data.totals.landedCost)}</strong></div>
        <table>
          <thead><tr><th>Component</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="note">This estimate is for planning only. Final tax depends on Thai Customs classification, declared customs value, licenses, FTA documents and shipment inspection.</p>
        <script>window.onload = () => window.print();<\/script>
      </body>
      </html>`);
    printWindow.document.close();
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

    document.getElementById('importTaxReset')?.addEventListener('click', () => {
      form.reset();
      latestSnapshot = null;
      updateCurrencyStrip(form);
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
