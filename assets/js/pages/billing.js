/* Billing */
const BL = ui('billing', { range: 'all', tab: 'all', q: '', page: 1, sort: null });
const BTABS = [['all', 'All'], ['invoice', 'Invoices'], ['received', 'Received'], ['overdue', 'Overdue'], ['team', 'Team Payments']];
const BFILTER = { all: () => true, invoice: (r) => r.kind === 'invoice', received: (r) => r.status === 'received', overdue: (r) => r.status === 'overdue', team: (r) => r.kind === 'team' };

/* Invoices inside the selected date range (before tab/search filters). */
const rangeRows = () => { const b = rangeBounds(BL.range, BL.custom); return S().invoices.filter((r) => inRange(r.due, b)); };

function billingRows() {
  const q = (BL.q || '').toLowerCase().replace(/\s+/g, '');
  let rows = rangeRows().filter((r) => BFILTER[BL.tab](r)
    && (!q || (r.client + r.project + r.no + r.status).toLowerCase().replace(/\s+/g, '').includes(q)));
  if (BL.sort === 'amount') rows = [...rows].sort((a, b) => b.amount - a.amount);
  if (BL.sort === 'due') rows = [...rows].sort((a, b) => a.due.localeCompare(b.due));
  return rows;
}

Pages.billing = () => {
  const inRangeRows = rangeRows();
  const sum = (fn) => inRangeRows.filter(fn).reduce((n, r) => n + r.amount, 0);
  const st = {
    revenue: sum((r) => r.kind === 'invoice'),
    pending: sum((r) => r.kind === 'invoice' && r.status === 'pending'),
    overdue: sum((r) => r.kind === 'invoice' && r.status === 'overdue'),
    payouts: sum((r) => r.kind === 'team'),
  };
  const pg = paginate(billingRows(), BL.page || 1, 3);
  BL.page = pg.page;
  const rows = pg.rows.map((r) => `
    <div class="trow">
      <div class="client-cell"><img src="${src(r.logo)}" alt="" /><span><b>${esc(r.client)}</b><small>${esc(r.project)}</small></span></div>
      <span class="inv-no">${r.no}</span>
      <span class="amt">${RS} ${money(r.amount)}/-</span>
      <span class="due">${r.dueLabel}</span>
      <span class="status"><span class="dot ${statusDot(r.status)}"></span>${cap(r.status)}</span>
      <span class="actions">
        <span class="slot">${r.status === 'received' ? '' : `<button class="act bell" data-action="bill-remind" data-id="${r.id}" aria-label="Send reminder">${icon('bell', 22)}</button>`}</span>
        <span class="slot"><button class="act" data-action="bill-mail" data-id="${r.id}" aria-label="Email invoice">${icon('mail', 22)}</button></span>
        <span class="slot"><button class="act" data-action="bill-download" data-id="${r.id}" aria-label="Download invoice">${icon('download', 22)}</button></span>
      </span>
    </div>`).join('') || '<div class="empty-row">No invoices match these filters.</div>';

  const html = `
    <div class="page-head"><h1 class="page-title">Billing</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="create-invoice">${icon('plus', 22, '', 1.6)}Create Invoice</button>
        <button class="btn btn-white" data-action="download-billing">${icon('download', 22)}Download</button>
      </div></div>
    ${dateChips('billing', BL.range)}
    <div class="stats">
      ${statCard('TOTAL REVENUE', 'wallet', rupee(money(st.revenue), 'c-green'))}
      ${statCard('PENDING PAYMENTS', 'cardCheck', rupee(money(st.pending), 'c-orange'))}
      ${statCard('OVERDUE', 'banknote', rupee(money(st.overdue), 'c-red'))}
      ${statCard('TEAM PAYOUTS', 'calendar', rupee(money(st.payouts)))}
    </div>
    <div class="toolbar">
      <label class="search">${icon('search', 14)}<input type="search" placeholder="Search clients, invoice, etc..." value="${esc(BL.q)}" data-input="bill-q" /></label>
      ${BTABS.map(([k, l]) => `<button class="tab ${BL.tab === k ? 'active' : ''}" data-action="bill-tab" data-tab="${k}">${l} (${inRangeRows.filter(BFILTER[k]).length})</button>`).join('')}
      <button class="filter-btn" data-action="bill-sort" aria-label="Sort">${icon('filterLines', 22)}</button>
    </div>
    ${S().invoices.length ? `<div class="tbl-scroll"><div class="btable">
      <div class="thead"><span>CLIENT &amp; PROJECT</span><span>INVOICE #</span><span>AMOUNT</span><span>DUE DATE</span><span>STATUS</span><span>ACTION</span></div>
      <div class="tbody">${rows}${pager('billing', pg.page, pg.pages)}</div>
    </div></div>` : emptyState('billing', 'No invoices yet', 'Create your first invoice to bill a client. Payments, reminders and team payouts will all show up here.', ['Create Invoice', 'create-invoice'])}`;
  return { html: shell('billing', html) };
};

Inputs['bill-q'] = (el) => { BL.q = el.value; BL.page = 1; App.render({ keepFocus: el }); };
Actions['bill-tab'] = (el) => { BL.tab = el.dataset.tab; BL.page = 1; App.render(); };
Actions['bill-sort'] = (el) => openListMenu(el, [
  { label: 'Default order', on: !BL.sort, run: () => { BL.sort = null; App.render(); } },
  { label: 'Amount (high to low)', on: BL.sort === 'amount', run: () => { BL.sort = 'amount'; App.render(); } },
  { label: 'Due date (soonest)', on: BL.sort === 'due', run: () => { BL.sort = 'due'; App.render(); } },
], 'Sort by');

const findInv = (id) => S().invoices.find((r) => r.id === id);
Actions['bill-remind'] = (el) => toast(`Reminder sent to ${findInv(el.dataset.id).client}`);
Actions['bill-mail'] = (el) => {
  const r = findInv(el.dataset.id);
  location.href = `mailto:${r.email || ''}?subject=${encodeURIComponent(`Invoice ${r.no} — ${r.project}`)}&body=${encodeURIComponent(`Hi ${r.client},\n\nPlease find invoice ${r.no} for ${r.project} of Rs. ${money(r.amount)}/-, due ${r.dueLabel}.\n\nThanks,\n${S().studio}`)}`;
};
Actions['bill-download'] = (el) => {
  const r = findInv(el.dataset.id);
  downloadFile(`${r.no.replace(/\s/g, '')}.txt`, invoiceText({ no: r.no, client: r.client, desc: r.project, amount: r.amount, due: r.dueLabel, status: r.status }), 'text/plain');
};
Actions['download-billing'] = () => downloadFile('modus-billing.csv', toCSV([['Client', 'Project', 'Invoice #', 'Amount', 'Due Date', 'Status', 'Type'],
  ...billingRows().map((r) => [r.client, r.project, r.no, r.amount, r.dueLabel, cap(r.status), r.kind === 'team' ? 'Team Payment' : 'Invoice'])]));

Actions['create-invoice'] = () => {
  const clients = [...new Set([...S().clients.filter((c) => !c.archived).map((c) => c.name), ...S().invoices.filter((r) => r.kind === 'invoice').map((r) => r.client)])];
  if (!clients.length) { toast('Add a client first, then you can invoice them'); Actions['new-client'](); return; }
  openForm({
    title: 'Create Invoice', submit: 'Create Invoice',
    fields: [
      { name: 'client', label: 'Client', type: 'select', options: clients, value: clients[0] },
      { name: 'project', label: 'Project', required: true, placeholder: 'e.g. Social Media Campaign' },
      { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, placeholder: '0' },
      { name: 'due', label: 'Due Date', type: 'date', value: new Date(Date.now() + S().settings.dueDays * 864e5).toISOString().slice(0, 10) },
      { name: 'kind', label: 'Type', type: 'select', options: ['Invoice', 'Team Payment'], value: 'Invoice' },
      { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'Received', 'Overdue'], value: 'Pending' },
    ],
    onSubmit(v) {
      const inv = S().invoices;
      const next = Math.max(...inv.filter((r) => r.no.startsWith('INV')).map((r) => +r.no.replace(/\D/g, '')), 0) + 1;
      const c = S().clients.find((x) => x.name === v.client);
      const prev = inv.find((r) => r.client === v.client);
      const due = v.due || new Date().toISOString().slice(0, 10);
      inv.unshift({
        id: uid('b'), kind: v.kind === 'Team Payment' ? 'team' : 'invoice', client: v.client, project: v.project.trim(),
        logo: prev ? prev.logo : c ? c.logo : initialsAvatar(v.client), no: `INV - ${String(next).padStart(3, '0')}`,
        amount: +v.amount, due, dueLabel: fmtUpper(due), status: v.status.toLowerCase(), clientId: c ? c.id : null, email: (c && c.email) || (prev && prev.email) || '',
      });
      BL.page = 1; BL.tab = 'all';
      Store.save(); App.render(); toast('Invoice created');
    },
  });
};
