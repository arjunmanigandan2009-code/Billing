/* ============================================
   BILLING SYSTEM — JavaScript (app.js)
   ============================================ */

'use strict';

// =============================================
// STATE
// =============================================
let state = {
  billItems: [],
  bills: [],
  products: [],
  customers: [],
  expenses: [],
  settings: {
    companyName: '',
    companyTagline: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyGstin: '',
    companyWebsite: '',
    companyLogo: '',
    billPrefix: 'INV',
    billStart: 1001,
    currencySymbol: '₹',
    defaultPayment: 'Cash',
    billFooter: 'Thank you for your purchase!',
    accentColor: '#4f46e5',
  },
  nextBillNo: 1001,
};

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initNav();
  initEnterActions();
  initTheme();
  initBillDate();
  generateBillNo();
  renderAllDataLists();
  applySettings();
  renderBillsList();
  renderProductsTable();
  renderExpensesTable();
  renderCustomersTable();
  updatePreview();
});

// =============================================
// THEME TOGGLE
// =============================================
function initTheme() {
  const saved = localStorage.getItem('billease_theme') || 'light';
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('billease_theme', theme);
  // Sync toggle button state
  const btn = document.getElementById('theme-toggle-btn');
  const lightLabel = document.getElementById('theme-label-light');
  const darkLabel = document.getElementById('theme-label-dark');
  if (btn) {
    btn.classList.toggle('dark-mode', theme === 'dark');
    // Swap icon inside thumb
    const thumb = btn.querySelector('.theme-toggle-thumb');
    if (thumb) {
      thumb.innerHTML = theme === 'dark'
        ? '<i class="fa-solid fa-moon" style="font-size:12px;color:#4f46e5;"></i>'
        : '<i class="fa-solid fa-sun" style="font-size:12px;color:#f59e0b;"></i>';
    }
  }
  if (lightLabel) lightLabel.classList.toggle('active', theme === 'light');
  if (darkLabel)  darkLabel.classList.toggle('active', theme === 'dark');
}



// =============================================
// NAVIGATION
// =============================================
function initNav() {
  // Sidebar nav items
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const view = link.dataset.view;
      switchView(view);
      document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      // Sync bottom nav
      document.querySelectorAll('.mob-nav-item').forEach(l => {
        l.classList.toggle('active', l.dataset.view === view);
      });
      closeSidebar();
    });
  });

  // Mobile bottom nav items
  document.querySelectorAll('.mob-nav-item').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const view = link.dataset.view;
      switchView(view);
      document.querySelectorAll('.mob-nav-item').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      // Sync sidebar nav
      document.querySelectorAll('.nav-item').forEach(l => {
        l.classList.toggle('active', l.dataset.view === view);
      });
    });
  });
}

function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + name);
  if (el) el.classList.add('active');
  // Scroll to top on view change (mobile)
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================
// SIDEBAR TOGGLE (mobile)
// =============================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
  document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Close sidebar on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeSidebar();
    // Close any open modal too
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

function initEnterActions() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.repeat || e.isComposing) return;

    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === 'item-code') {
      const product = findProductByCode(target.value);
      if (product) {
        e.preventDefault();
        fillItemFromProduct(product);
        document.getElementById('item-qty').focus();
      }
      return;
    }
    if (target.closest('button, a, select, textarea, [contenteditable="true"]')) return;

    if (target instanceof HTMLInputElement &&
        ['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(target.type)) {
      return;
    }

    const openModals = document.querySelectorAll('.modal-overlay.open');
    const activeModal = openModals[openModals.length - 1];
    const actionButton = activeModal
      ? activeModal.querySelector('[data-enter-default="modal"]')
      : target.closest('#add-item-form')?.querySelector('[data-enter-default="scope"]') ||
        document.querySelector('.view.active [data-enter-default="page"]');

    if (!actionButton) return;

    if (target instanceof HTMLInputElement && target.list) {
      setTimeout(() => actionButton.click(), 0);
    } else {
      e.preventDefault();
      actionButton.click();
    }
  });
}



// =============================================
// BILL DATE & NUMBER
// =============================================
function initBillDate() {
  const d = document.getElementById('bill-date');
  d.value = todayISO();
  document.getElementById('prev-date').textContent = formatDate(d.value);
  d.addEventListener('change', () => {
    document.getElementById('prev-date').textContent = formatDate(d.value);
  });
}

function generateBillNo() {
  const prefix = state.settings.billPrefix || 'INV';
  const no = String(state.nextBillNo).padStart(4, '0');
  const bn = `${prefix}-${no}`;
  document.getElementById('bill-no').value = bn;
  document.getElementById('prev-bill-no').textContent = bn;
  document.getElementById('prev-payment').textContent = document.getElementById('payment-mode').value;
}

// =============================================
// ADD ITEM TO BILL
// =============================================
function addItem() {
  const name = val('item-name').trim();
  if (!name) { showToast('Please enter item name', 'error'); return; }

  const mrp = parseFloat(val('item-mrp')) || 0;
  let special = parseFloat(val('item-special'));
  if (isNaN(special) || special <= 0) special = mrp;

  const qty = parseFloat(val('item-qty'));
  if (!Number.isFinite(qty) || qty <= 0) {
    showToast('Please enter a quantity greater than 0', 'error');
    return;
  }
  const discount = parseFloat(val('item-discount')) || 0;
  const hsn = val('item-hsn');
  const unit = val('item-unit');
  const desc = val('item-desc');

  const effectivePrice = special * (1 - discount / 100);
  const total = effectivePrice * qty;

  const item = {
    id: Date.now(),
    name, hsn, mrp, special, qty, unit, discount, desc,
    effectivePrice, total
  };

  state.billItems.push(item);
  renderBillTable();
  calcTotals();
  updatePreview();
  clearItemForm();
  showToast('Item added!', 'success');
}

function syncSpecialPrice() {
  const mrp = val('item-mrp');
  const spField = document.getElementById('item-special');
  if (!spField.value) spField.placeholder = mrp || '0.00';
}

function clearItemForm() {
  ['item-code','item-name','item-hsn','item-mrp','item-special','item-discount','item-desc'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('item-qty').value = '';
  document.getElementById('item-special').placeholder = '0.00';
}

// =============================================
// RENDER BILL TABLE
// =============================================
function renderBillTable() {
  const tbody = document.getElementById('bill-body');
  const count = state.billItems.length;
  document.getElementById('item-count').textContent = count + (count === 1 ? ' item' : ' items');

  if (!count) {
    tbody.innerHTML = `<tr id="empty-row"><td colspan="10" class="empty-msg"><i class="fa-solid fa-inbox"></i> No items added yet</td></tr>`;
    return;
  }

  const cur = state.settings.currencySymbol || '₹';
  tbody.innerHTML = state.billItems.map((item, i) => {
    const hasSaving = item.mrp > item.special;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${esc(item.name)}</strong>
          ${item.desc ? `<br><small style="color:var(--muted)">${esc(item.desc)}</small>` : ''}
        </td>
        <td>${esc(item.hsn) || '-'}</td>
        <td>
          ${hasSaving
            ? `<span class="mrp-strike">${cur}${item.mrp.toFixed(2)}</span>`
            : `${cur}${item.mrp.toFixed(2)}`}
        </td>
        <td>${cur}${item.special.toFixed(2)}</td>
        <td>
          <input type="number" class="qty-edit" value="${item.qty}" min="1"
            onchange="updateQty(${item.id}, this.value)" />
        </td>
        <td>${esc(item.unit)}</td>
        <td>${item.discount > 0 ? item.discount.toFixed(1) + '%' : '-'}</td>
        <td><strong>${cur}${item.total.toFixed(2)}</strong></td>
        <td>
          <button class="del-btn" onclick="removeItem(${item.id})" title="Remove">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function removeItem(id) {
  state.billItems = state.billItems.filter(i => i.id !== id);
  renderBillTable();
  calcTotals();
  updatePreview();
}

function updateQty(id, newQty) {
  const item = state.billItems.find(i => i.id === id);
  if (!item) return;
  item.qty = parseFloat(newQty) || 1;
  item.effectivePrice = item.special * (1 - item.discount / 100);
  item.total = item.effectivePrice * item.qty;
  renderBillTable();
  calcTotals();
  updatePreview();
}

// =============================================
// TOTALS
// =============================================
function calcTotals() {
  const cur = state.settings.currencySymbol || '₹';
  let totalMrp = 0, totalSpecial = 0, totalDiscount = 0, grandTotal = 0;

  state.billItems.forEach(item => {
    totalMrp += item.mrp * item.qty;
    totalSpecial += item.special * item.qty;
    totalDiscount += (item.special * item.discount / 100) * item.qty;
    grandTotal += item.total;
  });

  const saving = totalMrp - totalSpecial;

  setText('t-mrp', `${cur}${totalMrp.toFixed(2)}`);
  setText('t-saving', `${cur}${saving.toFixed(2)}`);
  setText('t-discount', `${cur}${totalDiscount.toFixed(2)}`);
  setText('t-grand', `${cur}${grandTotal.toFixed(2)}`);
  setText('prev-grand', `${cur}${grandTotal.toFixed(2)}`);

  calcBalance();
  return { totalMrp, totalSpecial, totalDiscount, grandTotal, saving };
}

function calcBalance() {
  const cur = state.settings.currencySymbol || '₹';
  const grand = parseFloat(document.getElementById('t-grand').textContent.replace(/[^\d.]/g, '')) || 0;
  const received = parseFloat(val('amount-received')) || 0;
  const balance = received - grand;
  const el = document.getElementById('t-balance');
  el.textContent = `${cur}${Math.abs(balance).toFixed(2)} ${balance >= 0 ? '(Change)' : '(Due)'}`;
  el.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
}

// =============================================
// QUICK PREVIEW
// =============================================
function updatePreview() {
  const s = state.settings;
  const logoEl = document.getElementById('prev-logo');
  if (s.companyLogo) {
    logoEl.src = s.companyLogo;
    logoEl.style.display = 'block';
  } else {
    logoEl.style.display = 'none';
  }
  document.getElementById('prev-company-name').textContent = s.companyName || 'Your Company';
  document.getElementById('prev-company-addr').textContent = s.companyAddress || '';
  document.getElementById('prev-cust').textContent = val('cust-name') || '-';
  document.getElementById('prev-payment').textContent = val('payment-mode') || '-';

  const cur = s.currencySymbol || '₹';
  const wrap = document.getElementById('prev-items-wrap');
  if (!state.billItems.length) {
    wrap.innerHTML = '<div style="color:var(--muted);font-size:11px;text-align:center;padding:8px 0;">No items</div>';
    return;
  }
  wrap.innerHTML = state.billItems.map(item =>
    `<div class="prev-item-row">
      <span>${esc(item.name)} × ${item.qty}</span>
      <span>${cur}${item.total.toFixed(2)}</span>
    </div>`
  ).join('');
}

document.getElementById('cust-name').addEventListener('input', updatePreview);
document.getElementById('payment-mode').addEventListener('change', () => {
  document.getElementById('prev-payment').textContent = val('payment-mode');
});

// =============================================
// SAVE BILL
// =============================================
function saveBill() {
  if (!state.billItems.length) { showToast('Add at least one item', 'error'); return; }
  const custName = val('cust-name').trim();
  if (!custName) { showToast('Enter customer name', 'error'); return; }

  const totals = calcTotals();
  const bill = {
    id: Date.now(),
    billNo: val('bill-no'),
    date: val('bill-date'),
    custName,
    custPhone: val('cust-phone'),
    custEmail: val('cust-email'),
    custAddress: val('cust-address'),
    paymentMode: val('payment-mode'),
    items: JSON.parse(JSON.stringify(state.billItems)),
    notes: val('bill-notes'),
    amountReceived: parseFloat(val('amount-received')) || 0,
    ...totals,
  };

  state.bills.unshift(bill);
  state.nextBillNo++;

  // Save customer if new
  const existingCust = state.customers.find(c => c.name.toLowerCase() === custName.toLowerCase());
  if (!existingCust && custName) {
    state.customers.push({
      id: Date.now() + 1,
      name: custName,
      phone: val('cust-phone'),
      email: val('cust-email'),
      address: val('cust-address'),
    });
    renderCustomersTable();
  }

  saveToStorage();
  renderBillsList();
  renderAllDataLists();
  showToast('Bill saved successfully!', 'success');
  clearBill();
}

// =============================================
// CLEAR BILL
// =============================================
function clearBill() {
  state.billItems = [];
  renderBillTable();
  calcTotals();
  updatePreview();
  ['cust-name','cust-phone','cust-email','cust-address','bill-notes','amount-received'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('bill-date').value = todayISO();
  document.getElementById('payment-mode').value = state.settings.defaultPayment || 'Cash';
  generateBillNo();
  updatePreview();
}

// =============================================
// PRINT PREVIEW
// =============================================
function printPreview() {
  if (!state.billItems.length) { showToast('Add at least one item to preview', 'error'); return; }
  const html = buildBillHTML({
    billNo: val('bill-no'),
    date: val('bill-date'),
    custName: val('cust-name') || 'Walk-in Customer',
    custPhone: val('cust-phone'),
    custEmail: val('cust-email'),
    custAddress: val('cust-address'),
    paymentMode: val('payment-mode'),
    items: state.billItems,
    notes: val('bill-notes'),
    amountReceived: parseFloat(val('amount-received')) || 0,
    ...calcTotals(),
  });
  document.getElementById('print-area').innerHTML = html;
  openModal('print-modal');
}

function printBillById(id) {
  const bill = state.bills.find(b => b.id === id);
  if (!bill) return;
  document.getElementById('print-area').innerHTML = buildBillHTML(bill);
  openModal('print-modal');
}

// =============================================
// BUILD BILL HTML (for print)
// =============================================
function buildBillHTML(bill) {
  const s = state.settings;
  const cur = s.currencySymbol || '₹';

  const logoHTML = s.companyLogo
    ? `<img src="${s.companyLogo}" class="bill-company-logo" alt="logo" />`
    : '';

  const itemRows = bill.items.map((item, i) => {
    const hasSaving = item.mrp > item.special;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <strong>${esc(item.name)}</strong>
          ${item.desc ? `<br><small style="color:#888">${esc(item.desc)}</small>` : ''}
        </td>
        <td>${esc(item.hsn) || '-'}</td>
        <td>
          ${hasSaving
            ? `<span style="text-decoration:line-through;color:#999;font-size:11px;">${cur}${item.mrp.toFixed(2)}</span>`
            : `${cur}${item.mrp.toFixed(2)}`}
        </td>
        <td>${cur}${item.special.toFixed(2)}</td>
        <td>${item.qty} ${esc(item.unit)}</td>
        ${item.discount > 0 ? `<td>${item.discount.toFixed(1)}%</td>` : `<td>-</td>`}
        <td><strong>${cur}${item.total.toFixed(2)}</strong></td>
      </tr>`;
  }).join('');

  const saving = (bill.totalMrp || 0) - (bill.totalSpecial || 0);
  const balance = bill.amountReceived - bill.grandTotal;

  return `
    <div class="bill-doc">
      <!-- HEADER -->
      <div class="bill-header">
        <div class="bill-company-info">
          ${logoHTML}
          <h2>${esc(s.companyName || 'Your Company')}</h2>
          ${s.companyTagline ? `<p><em>${esc(s.companyTagline)}</em></p>` : ''}
          ${s.companyAddress ? `<p>${esc(s.companyAddress)}</p>` : ''}
          ${s.companyPhone ? `<p>📞 ${esc(s.companyPhone)}</p>` : ''}
          ${s.companyEmail ? `<p>✉️ ${esc(s.companyEmail)}</p>` : ''}
          ${s.companyGstin ? `<p><strong>GSTIN:</strong> ${esc(s.companyGstin)}</p>` : ''}
        </div>
        <div class="bill-title-block">
          <h1>INVOICE</h1>
          <p><strong>Bill No:</strong> ${esc(bill.billNo)}</p>
          <p><strong>Date:</strong> ${formatDate(bill.date)}</p>
          <p><strong>Payment:</strong> ${esc(bill.paymentMode)}</p>
        </div>
      </div>

      <!-- PARTIES -->
      <div class="bill-parties">
        <div class="party-box">
          <h4>Bill From</h4>
          <strong>${esc(s.companyName || 'Your Company')}</strong>
          <p>${esc(s.companyAddress || '')}</p>
          ${s.companyPhone ? `<p>${esc(s.companyPhone)}</p>` : ''}
        </div>
        <div class="party-box">
          <h4>Bill To</h4>
          <strong>${esc(bill.custName)}</strong>
          ${bill.custPhone ? `<p>📞 ${esc(bill.custPhone)}</p>` : ''}
          ${bill.custEmail ? `<p>✉️ ${esc(bill.custEmail)}</p>` : ''}
          ${bill.custAddress ? `<p>${esc(bill.custAddress)}</p>` : ''}
        </div>
      </div>

      <!-- ITEMS TABLE -->
      <table class="bill-items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item Description</th>
            <th>HSN</th>
            <th>MRP</th>
            <th>Sp. Price</th>
            <th>Qty</th>
            <th>Disc</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- TOTALS -->
      <div class="bill-totals-wrap">
        <div class="bill-totals">
          <div class="row"><span>Subtotal (MRP)</span><span>${cur}${(bill.totalMrp || 0).toFixed(2)}</span></div>
          ${saving > 0 ? `<div class="row saving"><span>🎉 You Save</span><span>${cur}${saving.toFixed(2)}</span></div>` : ''}
          ${(bill.totalDiscount || 0) > 0 ? `<div class="row"><span>Discount</span><span>-${cur}${(bill.totalDiscount || 0).toFixed(2)}</span></div>` : ''}
          <div class="row grand-total"><span>Grand Total</span><span>${cur}${(bill.grandTotal || 0).toFixed(2)}</span></div>
          ${bill.amountReceived > 0 ? `<div class="row"><span>Amount Received</span><span>${cur}${bill.amountReceived.toFixed(2)}</span></div>` : ''}
          ${bill.amountReceived > 0 ? `<div class="row" style="font-weight:600;color:${balance >= 0 ? 'var(--success)' : 'var(--danger)'}">
            <span>${balance >= 0 ? 'Change' : 'Balance Due'}</span>
            <span>${cur}${Math.abs(balance).toFixed(2)}</span>
          </div>` : ''}
        </div>
      </div>

      <!-- FOOTER -->
      <div class="bill-footer-area">
        <div class="footer-notes">
          ${bill.notes ? `<p><strong>Notes:</strong> ${esc(bill.notes)}</p>` : ''}
          <p style="margin-top:8px;color:#888;">${esc(s.billFooter || 'Thank you for your purchase!')}</p>
          ${s.companyWebsite ? `<p style="color:#888;">🌐 ${esc(s.companyWebsite)}</p>` : ''}
        </div>
        <div class="sig-line">Authorised Signatory</div>
      </div>
    </div>`;
}

// =============================================
// BILLS LIST
// =============================================
function renderBillsList() {
  const tbody = document.getElementById('bills-list-body');
  const search = (document.getElementById('bill-search')?.value || '').toLowerCase();
  const cur = state.settings.currencySymbol || '₹';

  const filtered = state.bills.filter(b =>
    b.billNo.toLowerCase().includes(search) ||
    b.custName.toLowerCase().includes(search) ||
    (b.custPhone || '').includes(search)
  );

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg"><i class="fa-solid fa-inbox"></i> No bills found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => `
    <tr>
      <td><strong>${esc(b.billNo)}</strong></td>
      <td>${formatDate(b.date)}</td>
      <td>${esc(b.custName)}<br><small style="color:var(--muted)">${esc(b.custPhone || '')}</small></td>
      <td>${b.items.length}</td>
      <td><strong>${cur}${(b.grandTotal || 0).toFixed(2)}</strong></td>
      <td><span class="badge">${esc(b.paymentMode)}</span></td>
      <td>
        <button class="btn btn-outline" style="padding:5px 10px;font-size:12px;" onclick="printBillById(${b.id})">
          <i class="fa-solid fa-print"></i> Print
        </button>
        <button class="btn btn-danger" style="padding:5px 10px;font-size:12px;margin-left:4px;" onclick="confirmDelete('bill', ${b.id})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>`).join('');
}

// =============================================
// PRODUCTS
// =============================================
function openProductModal(id) {
  document.getElementById('edit-product-id').value = id || '';
  document.getElementById('product-modal-title').textContent = id ? 'Edit Product' : 'Add Product';
  if (id) {
    const p = state.products.find(p => p.id === id);
    if (p) {
      document.getElementById('p-code').value = p.code || getNextProductCode();
      document.getElementById('p-name').value = p.name;
      document.getElementById('p-hsn').value = p.hsn || '';
      document.getElementById('p-mrp').value = p.mrp;
      document.getElementById('p-special').value = p.special || '';
      document.getElementById('p-unit').value = p.unit;
    }
  } else {
    ['p-name','p-hsn','p-mrp','p-special'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('p-code').value = getNextProductCode();
    document.getElementById('p-unit').value = 'Pcs';
  }
  openModal('product-modal');
}

function saveProduct() {
  const enteredCode = document.getElementById('p-code').value.trim();
  if (!/^\d+$/.test(enteredCode)) {
    showToast('Enter a numeric product code', 'error');
    return;
  }
  const code = String(parseInt(enteredCode, 10)).padStart(3, '0');
  const name = document.getElementById('p-name').value.trim();
  if (!name) { showToast('Product name required', 'error'); return; }
  const mrp = parseFloat(document.getElementById('p-mrp').value) || 0;
  const special = parseFloat(document.getElementById('p-special').value) || mrp;
  const editId = document.getElementById('edit-product-id').value;
  const duplicateCode = state.products.some(p => p.code === code && p.id !== Number(editId));
  if (duplicateCode) {
    showToast('Product code already exists', 'error');
    return;
  }

  if (editId) {
    const p = state.products.find(p => p.id === Number(editId));
    if (p) {
      p.code = code;
      p.name = name;
      p.hsn = document.getElementById('p-hsn').value;
      p.mrp = mrp;
      p.special = special;
      p.unit = document.getElementById('p-unit').value;
    }
  } else {
    state.products.push({
      id: Date.now(),
      code,
      name,
      hsn: document.getElementById('p-hsn').value,
      mrp,
      special,
      unit: document.getElementById('p-unit').value,
    });
  }

  saveToStorage();
  renderProductsTable();
  renderAllDataLists();
  closeModal('product-modal');
  showToast('Product saved!', 'success');
}

function renderProductsTable() {
  const tbody = document.getElementById('products-body');
  const cur = state.settings.currencySymbol || '₹';
  if (!state.products.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-msg"><i class="fa-solid fa-inbox"></i> No products added</td></tr>`;
    return;
  }
  tbody.innerHTML = state.products.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${esc(p.code)}</strong></td>
      <td><strong>${esc(p.name)}</strong></td>
      <td>${esc(p.hsn) || '-'}</td>
      <td>${cur}${p.mrp.toFixed(2)}</td>
      <td>${p.special && p.special !== p.mrp ? `<span style="color:var(--success)">${cur}${p.special.toFixed(2)}</span>` : '-'}</td>
      <td>${esc(p.unit)}</td>
      <td>
        <button class="btn btn-outline" style="padding:5px 10px;font-size:12px;" onclick="openProductModal(${p.id})">
          <i class="fa-solid fa-pencil"></i>
        </button>
        <button class="btn btn-danger" style="padding:5px 10px;font-size:12px;margin-left:4px;" onclick="confirmDelete('product', ${p.id})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>`).join('');
}

function getNextProductCode() {
  const usedCodes = new Set(state.products.map(p => p.code).filter(Boolean));
  let codeNumber = 1;
  while (usedCodes.has(String(codeNumber).padStart(3, '0'))) codeNumber++;
  return String(codeNumber).padStart(3, '0');
}

function exportProductsCsv() {
  const columns = [
    'Product Code', 'Name', 'HSN / SKU', 'MRP', 'Special Price', 'Unit',
    'Expense Date', 'Expense Category', 'Expense Description', 'Expense Amount', 'Expense Payment Mode',
    'Record Type',
  ];
  const productRows = state.products.map(product => [
    product.code || '',
    product.name || '',
    product.hsn || '',
    product.mrp ?? '',
    product.special ?? '',
    product.unit || '',
    '', '', '', '', '',
    'Item',
  ]);
  const expenseRows = state.expenses.map(expense => [
    '', '', '', '', '', '',
    expense.date || '',
    expense.category || '',
    expense.description || '',
    expense.amount ?? '',
    expense.paymentMode || '',
    'Expense',
  ]);
  const csv = [columns, ...productRows, ...expenseRows]
    .map(row => row.map(csvEscape).join(','))
    .join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `items-and-expenses-${todayISO()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast('Items and expenses exported to CSV!', 'success');
}

// =============================================
// EXPENSES
// =============================================
function openExpenseModal(id) {
  const expense = id ? state.expenses.find(item => item.id === id) : null;
  document.getElementById('edit-expense-id').value = expense ? expense.id : '';
  document.getElementById('expense-modal-title').textContent = expense ? 'Edit Expense' : 'Add Expense';
  document.getElementById('expense-date').value = expense ? expense.date : todayISO();
  document.getElementById('expense-category').value = expense ? expense.category : 'Office';
  document.getElementById('expense-description').value = expense ? expense.description : '';
  document.getElementById('expense-amount').value = expense ? expense.amount : '';
  document.getElementById('expense-payment').value = expense ? expense.paymentMode : 'Cash';
  openModal('expense-modal');
}

function saveExpense() {
  const date = document.getElementById('expense-date').value;
  const category = document.getElementById('expense-category').value;
  const description = document.getElementById('expense-description').value.trim();
  const amountText = document.getElementById('expense-amount').value;
  const amount = Number(amountText);
  if (!date || !category || !description || !amountText || !Number.isFinite(amount) || amount <= 0) {
    showToast('Enter a date, category, description, and valid amount', 'error');
    return;
  }

  const expense = {
    date,
    category,
    description,
    amount,
    paymentMode: document.getElementById('expense-payment').value,
  };
  const editId = document.getElementById('edit-expense-id').value;
  if (editId) {
    const existing = state.expenses.find(item => item.id === Number(editId));
    if (existing) Object.assign(existing, expense);
  } else {
    state.expenses.unshift({ id: Date.now(), ...expense });
  }

  saveToStorage();
  renderExpensesTable();
  closeModal('expense-modal');
  showToast('Expense saved!', 'success');
}

function renderExpensesTable() {
  const tbody = document.getElementById('expenses-body');
  const total = state.expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const currency = state.settings.currencySymbol || '₹';
  document.getElementById('expenses-total').textContent = `${currency}${total.toFixed(2)}`;
  if (!state.expenses.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-msg"><i class="fa-solid fa-inbox"></i> No expenses recorded</td></tr>';
    return;
  }

  tbody.innerHTML = state.expenses.map((expense, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${esc(formatDate(expense.date))}</td>
      <td><span class="badge">${esc(expense.category)}</span></td>
      <td>${esc(expense.description)}</td>
      <td>${esc(expense.paymentMode) || '-'}</td>
      <td><strong>${esc(currency)}${(Number(expense.amount) || 0).toFixed(2)}</strong></td>
      <td>
        <button class="btn btn-outline" style="padding:5px 10px;font-size:12px;" onclick="openExpenseModal(${expense.id})">
          <i class="fa-solid fa-pencil"></i>
        </button>
        <button class="btn btn-danger" style="padding:5px 10px;font-size:12px;margin-left:4px;" onclick="confirmDelete('expense', ${expense.id})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>`).join('');
}

function csvEscape(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let quoteClosed = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
        quoteClosed = true;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && !field && !quoteClosed) {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
      quoteClosed = false;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      quoteClosed = false;
    } else if (!quoteClosed) {
      field += char;
    } else if (char.trim()) {
      throw new Error('Unexpected character after a quoted field');
    }
  }

  if (inQuotes) throw new Error('Unclosed quoted field');
  if (field || row.length || quoteClosed) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function importProductsCsv(event) {
  const input = event.target;
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(String(reader.result || '').replace(/^\uFEFF/, ''));
      const headers = rows.shift();
      if (!headers) throw new Error('CSV file is empty');

      const headerIndexes = new Map(headers.map((header, index) => [
        header.trim().toLowerCase().replace(/[\s/_-]+/g, ''),
        index,
      ]));
      const findColumn = (...names) => names
        .map(name => headerIndexes.get(name))
        .find(index => index !== undefined);
      const codeIndex = findColumn('productcode', 'code');
      const nameIndex = findColumn('name', 'productname');
      const mrpIndex = findColumn('mrp');
      const hsnIndex = findColumn('hsnsku', 'hsn', 'sku');
      const specialIndex = findColumn('specialprice', 'special', 'sellingprice');
      const unitIndex = findColumn('unit');
      const recordTypeIndex = findColumn('recordtype');

      if (codeIndex === undefined || nameIndex === undefined || mrpIndex === undefined) {
        throw new Error('CSV must include Product Code, Name, and MRP columns');
      }

      const productsByCode = new Map(state.products.map(product => [product.code, product]));
      const imported = new Map();
      rows.forEach((values, index) => {
        if (values.every(value => !value.trim())) return;
        if (recordTypeIndex !== undefined && (values[recordTypeIndex] || '').trim().toLowerCase() === 'expense') return;
        const rowNumber = index + 2;
        const rawCode = (values[codeIndex] || '').trim();
        if (!/^\d+$/.test(rawCode)) {
          throw new Error(`Row ${rowNumber}: product code must be numeric`);
        }
        const code = String(parseInt(rawCode, 10)).padStart(3, '0');
        const name = (values[nameIndex] || '').trim();
        if (!name) throw new Error(`Row ${rowNumber}: product name is required`);

        const mrpText = (values[mrpIndex] || '').trim();
        const mrp = Number(mrpText);
        if (!mrpText || !Number.isFinite(mrp) || mrp < 0) {
          throw new Error(`Row ${rowNumber}: MRP must be a valid non-negative number`);
        }
        const product = { code, name, mrp };
        if (specialIndex !== undefined) {
          const specialText = (values[specialIndex] || '').trim();
          const special = specialText ? Number(specialText) : mrp;
          if (!Number.isFinite(special) || special < 0) {
            throw new Error(`Row ${rowNumber}: special price must be a valid non-negative number`);
          }
          product.special = special;
        }
        if (imported.has(code)) {
          throw new Error(`Row ${rowNumber}: duplicate product code ${code}`);
        }

        if (hsnIndex !== undefined) product.hsn = (values[hsnIndex] || '').trim();
        if (unitIndex !== undefined) product.unit = (values[unitIndex] || '').trim() || 'Pcs';
        imported.set(code, product);
      });

      if (!imported.size) throw new Error('CSV contains no product rows');

      let added = 0;
      let updated = 0;
      imported.forEach((product, code) => {
        const existing = productsByCode.get(code);
        if (existing) {
          Object.assign(existing, product);
          updated++;
        } else {
          state.products.push({
            id: Date.now() + added,
            hsn: '',
            special: product.mrp,
            unit: 'Pcs',
            ...product,
          });
          added++;
        }
      });

      saveToStorage();
      renderProductsTable();
      renderExpensesTable();
      renderAllDataLists();
      showToast(`CSV imported: ${added} added, ${updated} updated`, 'success');
    } catch (error) {
      showToast(error.message || 'Unable to import CSV file', 'error');
    } finally {
      input.value = '';
    }
  };
  reader.onerror = () => {
    input.value = '';
    showToast('Unable to read CSV file', 'error');
  };
  reader.readAsText(file);
}

function findProductByCode(code) {
  const normalized = code.trim();
  if (!/^\d+$/.test(normalized)) return undefined;
  const formattedCode = String(parseInt(normalized, 10)).padStart(3, '0');
  return state.products.find(p => p.code === formattedCode);
}

function fillItemFromProduct(product) {
  document.getElementById('item-code').value = product.code || '';
  document.getElementById('item-name').value = product.name;
  document.getElementById('item-hsn').value = product.hsn || '';
  document.getElementById('item-mrp').value = product.mrp || '';
  document.getElementById('item-special').value = product.special || '';
  document.getElementById('item-unit').value = product.unit || 'Pcs';
}

function autofillProductCode(code) {
  const product = findProductByCode(code);
  if (product) fillItemFromProduct(product);
}

function autofillProduct(name) {
  const normalizedName = name.trim().toLowerCase();
  const p = state.products.find(p => p.name.toLowerCase() === normalizedName);
  if (p) {
    fillItemFromProduct(p);
  }
}

// =============================================
// CUSTOMERS
// =============================================
function openCustomerModal(id) {
  document.getElementById('edit-customer-id').value = id || '';
  document.getElementById('customer-modal-title').textContent = id ? 'Edit Customer' : 'Add Customer';
  if (id) {
    const c = state.customers.find(c => c.id === id);
    if (c) {
      document.getElementById('c-name').value = c.name;
      document.getElementById('c-phone').value = c.phone || '';
      document.getElementById('c-email').value = c.email || '';
      document.getElementById('c-address').value = c.address || '';
    }
  } else {
    ['c-name','c-phone','c-email','c-address'].forEach(id => document.getElementById(id).value = '');
  }
  openModal('customer-modal');
}

function saveCustomer() {
  const name = document.getElementById('c-name').value.trim();
  if (!name) { showToast('Customer name required', 'error'); return; }
  const editId = document.getElementById('edit-customer-id').value;

  if (editId) {
    const c = state.customers.find(c => c.id === Number(editId));
    if (c) {
      c.name = name;
      c.phone = document.getElementById('c-phone').value;
      c.email = document.getElementById('c-email').value;
      c.address = document.getElementById('c-address').value;
    }
  } else {
    state.customers.push({
      id: Date.now(),
      name,
      phone: document.getElementById('c-phone').value,
      email: document.getElementById('c-email').value,
      address: document.getElementById('c-address').value,
    });
  }

  saveToStorage();
  renderCustomersTable();
  renderAllDataLists();
  closeModal('customer-modal');
  showToast('Customer saved!', 'success');
}

function renderCustomersTable() {
  const tbody = document.getElementById('customers-body');
  if (!state.customers.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-msg"><i class="fa-solid fa-inbox"></i> No customers added</td></tr>`;
    return;
  }
  tbody.innerHTML = state.customers.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.phone) || '-'}</td>
      <td>${esc(c.email) || '-'}</td>
      <td>${esc(c.address) || '-'}</td>
      <td>
        <button class="btn btn-outline" style="padding:5px 10px;font-size:12px;" onclick="openCustomerModal(${c.id})">
          <i class="fa-solid fa-pencil"></i>
        </button>
        <button class="btn btn-danger" style="padding:5px 10px;font-size:12px;margin-left:4px;" onclick="confirmDelete('customer', ${c.id})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>`).join('');
}

function autofillCustomer(name) {
  const c = state.customers.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (c) {
    document.getElementById('cust-phone').value = c.phone || '';
    document.getElementById('cust-email').value = c.email || '';
    document.getElementById('cust-address').value = c.address || '';
    updatePreview();
  }
}

// =============================================
// DATALISTS
// =============================================
function renderAllDataLists() {
  // Products
  const pdl = document.getElementById('product-list');
  pdl.innerHTML = state.products.map(p => `<option value="${esc(p.name)}">`).join('');
  const productCodeList = document.getElementById('product-code-list');
  productCodeList.innerHTML = state.products.map(p => `<option value="${esc(p.code)}">`).join('');

  // Customers
  const cdl = document.getElementById('customer-list');
  cdl.innerHTML = state.customers.map(c => `<option value="${esc(c.name)}">`).join('');
}

// =============================================
// SETTINGS
// =============================================
function applySettings() {
  const s = state.settings;
  setVal('company-name', s.companyName);
  setVal('company-tagline', s.companyTagline);
  setVal('company-address', s.companyAddress);
  setVal('company-phone', s.companyPhone);
  setVal('company-email', s.companyEmail);
  setVal('company-gstin', s.companyGstin);
  setVal('company-website', s.companyWebsite);
  setVal('bill-prefix', s.billPrefix || 'INV');
  setVal('bill-start', s.billStart || 1001);
  setVal('currency-symbol', s.currencySymbol || '₹');
  setVal('default-payment', s.defaultPayment || 'Cash');
  setVal('bill-footer', s.billFooter || 'Thank you for your purchase!');
  document.getElementById('accent-color').value = s.accentColor || '#4f46e5';
  applyAccent(s.accentColor || '#4f46e5');

  if (s.companyLogo) {
    document.getElementById('logo-preview').src = s.companyLogo;
    document.getElementById('logo-preview').style.display = 'block';
    document.getElementById('logo-placeholder').style.display = 'none';
  }

  document.getElementById('payment-mode').value = s.defaultPayment || 'Cash';
  generateBillNo();
  updatePreview();
}

function saveSettings() {
  const s = state.settings;
  s.companyName = val('company-name');
  s.companyTagline = val('company-tagline');
  s.companyAddress = val('company-address');
  s.companyPhone = val('company-phone');
  s.companyEmail = val('company-email');
  s.companyGstin = val('company-gstin');
  s.companyWebsite = val('company-website');
  s.billPrefix = val('bill-prefix') || 'INV';
  s.billStart = parseInt(val('bill-start')) || 1001;
  s.currencySymbol = val('currency-symbol') || '₹';
  s.defaultPayment = val('default-payment');
  s.billFooter = val('bill-footer');
  s.accentColor = document.getElementById('accent-color').value;

  saveToStorage();
  generateBillNo();
  updatePreview();
  renderExpensesTable();
  showToast('Settings saved!', 'success');
}

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    state.settings.companyLogo = e.target.result;
    document.getElementById('logo-preview').src = e.target.result;
    document.getElementById('logo-preview').style.display = 'block';
    document.getElementById('logo-placeholder').style.display = 'none';
    updatePreview();
  };
  reader.readAsDataURL(file);
}

function applyAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  // Darken for hover
  document.documentElement.style.setProperty('--accent-dark', shadeColor(color, -20));
  document.documentElement.style.setProperty('--accent-light', shadeColor(color, 80) + '33');
}

function shadeColor(color, percent) {
  let R = parseInt(color.slice(1, 3), 16);
  let G = parseInt(color.slice(3, 5), 16);
  let B = parseInt(color.slice(5, 7), 16);
  R = Math.min(255, Math.max(0, R + Math.round(255 * percent / 100)));
  G = Math.min(255, Math.max(0, G + Math.round(255 * percent / 100)));
  B = Math.min(255, Math.max(0, B + Math.round(255 * percent / 100)));
  return '#' + [R, G, B].map(v => v.toString(16).padStart(2, '0')).join('');
}

// =============================================
// MODALS
// =============================================
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// =============================================
// DELETE CONFIRM
// =============================================
function confirmDelete(type, id) {
  const msg = { bill: 'this bill', product: 'this product', customer: 'this customer', expense: 'this expense' };
  document.getElementById('confirm-msg').textContent = `Are you sure you want to delete ${msg[type] || 'this item'}? This cannot be undone.`;
  openModal('confirm-modal');

  document.getElementById('confirm-ok-btn').onclick = () => {
    if (type === 'bill') {
      state.bills = state.bills.filter(b => b.id !== id);
      renderBillsList();
    } else if (type === 'product') {
      state.products = state.products.filter(p => p.id !== id);
      renderProductsTable();
      renderAllDataLists();
    } else if (type === 'customer') {
      state.customers = state.customers.filter(c => c.id !== id);
      renderCustomersTable();
      renderAllDataLists();
    } else if (type === 'expense') {
      state.expenses = state.expenses.filter(expense => expense.id !== id);
      renderExpensesTable();
    }
    saveToStorage();
    closeModal('confirm-modal');
    showToast('Deleted successfully', 'success');
  };
}

// =============================================
// IMPORT / EXPORT
// =============================================
function exportData() {
  const data = JSON.stringify({ state }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `billing-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported!', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.state) {
        state = { ...state, ...data.state };
        if (!Array.isArray(state.expenses)) state.expenses = [];
        assignMissingProductCodes();
        saveToStorage();
        applySettings();
        renderBillsList();
        renderProductsTable();
        renderExpensesTable();
        renderCustomersTable();
        renderAllDataLists();
        showToast('Data imported!', 'success');
      }
    } catch { showToast('Invalid file', 'error'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// =============================================
// LOCAL STORAGE
// =============================================
const STORAGE_KEY = 'billease_data';

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      bills: state.bills,
      products: state.products,
      customers: state.customers,
      expenses: state.expenses,
      settings: state.settings,
      nextBillNo: state.nextBillNo,
    }));
  } catch (e) { console.warn('Storage error', e); }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.bills) state.bills = data.bills;
    if (data.products) state.products = data.products;
    if (Array.isArray(data.expenses)) state.expenses = data.expenses;
    const productsUpdated = assignMissingProductCodes();
    if (data.customers) state.customers = data.customers;
    if (data.settings) state.settings = { ...state.settings, ...data.settings };
    if (data.nextBillNo) state.nextBillNo = data.nextBillNo;
    if (productsUpdated) saveToStorage();
  } catch (e) { console.warn('Load error', e); }
}

function assignMissingProductCodes() {
  let updated = false;
  state.products.forEach(product => {
    if (!product.code) {
      product.code = getNextProductCode();
      updated = true;
    }
  });
  return updated;
}

// =============================================
// UTILS
// =============================================
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el && v !== undefined && v !== null) el.value = v;
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function formatDate(iso) {
  if (!iso) return '-';

  let date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    date = new Date(Number(y), Number(m) - 1, Number(d));
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) {
    const [d, m, y] = iso.split('/');
    date = new Date(Number(y), Number(m) - 1, Number(d));
  } else {
    date = new Date(iso);
  }

  if (Number.isNaN(date.getTime())) return iso;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2800);
}
