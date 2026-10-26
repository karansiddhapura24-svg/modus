/* Clients list + client detail tabs (Projects, Retainers, Payments, Team, Meeting, Portal). */
const CL = ui('clients', { range: 'all', tab: 'all', q: '', sort: null });

Pages.clients = () => {
  const s = S(); const st = liveClientStats();
  let list = s.clients.filter((c) => (CL.tab === 'archived' ? c.archived : !c.archived && (CL.tab === 'all' || c.type === 'Retainer')));
  if (CL.q) { const q = CL.q.toLowerCase(); list = list.filter((c) => (c.name + c.project).toLowerCase().includes(q)); }
  if (CL.sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  if (CL.sort === 'projects') list = [...list].sort((a, b) => b.total - a.total);

  const cards = list.map((c) => `
    <a class="ccard" href="#/clients/${c.id}/projects">
      <div class="ccard-head"><img src="${src(c.logo)}" alt="" /><span class="name">${esc(c.name)}</span><span class="badge">${c.type}</span>${icon('arrowRight', 22, '', 1.3)}</div>
      <div class="panel">
        <div class="panel-row"><span>Active Project</span><span>${c.total} Total</span></div>
        <b>${esc(c.project)}</b>
        <span class="tag">${esc(c.review)}</span>
      </div>
    </a>`).join('') || (s.clients.length ? '<div class="empty-row">No clients match this view.</div>' : '');

  const active = s.clients.filter((c) => !c.archived);
  const tabs = [['all', `All (${active.length})`], ['retainer', `Retainers (${active.filter((c) => c.type === 'Retainer').length})`], ['archived', `Archived (${s.clients.length - active.length})`]];
  const html = `
    <div class="page-head"><h1 class="page-title">Clients</h1>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="new-client">${icon('plus', 22, '', 1.6)}New Client</button>
        <button class="btn btn-white" data-action="download-clients">${icon('download', 22)}Download</button>
      </div></div>
    ${dateChips('clients', CL.range)}
    <div class="stats">
      ${statCard('TOTAL CLIENTS', 'wallet', plainVal(st.total, 'c-green'))}
      ${statCard('MONTHLY RETAINERS', 'cardCheck', plainVal(st.retainers, 'c-orange'))}
      ${statCard('PENDING WORK', 'banknote', plainVal(st.pending, 'c-red2'))}
      ${statCard('COMPLETED WORK', 'calendar', plainVal(st.completed))}
    </div>
    <div class="toolbar inline clients-bar">
      <label class="search">${icon('search', 14)}<input type="search" placeholder="Search clients, invoice, etc..." value="${esc(CL.q)}" data-input="clients-q" /></label>
      ${tabs.map(([k, l]) => `<button class="tab ${CL.tab === k ? 'active' : ''}" data-action="clients-tab" data-tab="${k}">${l}</button>`).join('')}
      <button class="filter-btn" data-action="clients-sort" aria-label="Sort">${icon('filterLines', 22)}</button>
    </div>
    ${s.clients.length ? `<div class="client-grid">${cards}</div>`
      : emptyState('clients', 'No clients yet', 'Add your first client to start tracking their projects, retainers, invoices and payments in one place.', ['New Client', 'new-client'])}`;
  return { html: shell('clients', html) };
};

Inputs['clients-q'] = (el) => { CL.q = el.value; App.render({ keepFocus: el }); };
Actions['clients-tab'] = (el) => { CL.tab = el.dataset.tab; App.render(); };
Actions['clients-sort'] = (el) => openListMenu(el, [
  { label: 'Default order', on: !CL.sort, run: () => { CL.sort = null; App.render(); } },
  { label: 'Name (A–Z)', on: CL.sort === 'name', run: () => { CL.sort = 'name'; App.render(); } },
  { label: 'Most projects', on: CL.sort === 'projects', run: () => { CL.sort = 'projects'; App.render(); } },
], 'Sort by');
Actions['new-client'] = () => openForm({
  title: 'New Client', submit: 'Add Client',
  fields: [
    { name: 'name', label: 'Client Name', required: true, full: true, placeholder: 'e.g. JD Cafe' },
    { name: 'type', label: 'Client Type', type: 'select', options: ['Retainer', 'One - Time'], value: 'Retainer' },
    { name: 'email', label: 'Email Address', type: 'email', placeholder: 'client@company.com' },
    { name: 'project', label: 'Active Project', full: true, placeholder: 'e.g. Instagram Reel' },
  ],
  onSubmit(v) {
    const id = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 5);
    S().clients.unshift({ id, name: v.name.trim(), title: v.name.trim(), type: v.type, logo: initialsAvatar(v.name.trim()), project: v.project || 'No active project', total: v.project ? 1 : 0, review: 'Nothing in review', archived: false, email: v.email });
    Store.save(); App.render(); toast(`${v.name.trim()} added`);
  },
});
Actions['download-clients'] = () => downloadFile('modus-clients.csv', toCSV([['Client', 'Type', 'Active Project', 'Total Projects', 'Status'],
  ...S().clients.map((c) => [c.name, c.type, c.project, c.total, c.archived ? 'Archived' : 'Active'])]));

/* ---------------------------------------------------------
   Client detail
   --------------------------------------------------------- */
const CTABS = [
  ['projects', 'Projects', 'fileTab'], ['retainers', 'Retainers', 'monitorList'], ['payments', 'Payments', 'idCard'],
  ['team', 'Team', 'usersGroup'], ['meeting', 'Meeting', 'video'], ['portal', 'Portal', 'globe'],
];
const CD = ui('clientDetail', { sub: 'all', page: 1, logQ: '' });

Pages.client = ({ id, tab = 'projects' }) => {
  const c = S().clients.find((x) => x.id === id);
  if (!c) return { html: shell('clients', '<div class="empty-row">Client not found. <a href="#/clients" class="c-primary">Back to clients</a></div>') };
  if (CD.id !== id || CD.tab !== tab) { CD.id = id; CD.tab = tab; CD.sub = 'all'; CD.page = 1; }

  const primary = {
    projects: ['New Project', 'new-project'], retainers: ['New Project', 'new-project'], portal: ['New Project', 'new-project'],
    payments: ['Add New Payment', 'add-payment'], team: ['Assign Team Member', 'assign-member'], meeting: ['Schedule Meeting', 'schedule-meeting'],
  }[tab];
  const isMeeting = tab === 'meeting';
  const body = { projects: clientProjectsTab, retainers: retainersTab, payments: paymentsTab, team: teamTab, meeting: meetingTab, portal: portalTab }[tab](c);

  const html = `
    <div class="page-head">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/projects">Projects</a>${icon('arrowRight', 16)}<a href="#/clients">Clients</a>${icon('arrowRight', 16)}<span>${esc(c.title)}</span></nav>
      ${isMeeting ? '' : `<button class="btn btn-white" data-action="client-download" data-id="${c.id}" data-tab="${tab}">${icon('download', 22)}Download</button>`}
    </div>
    <div class="hcard">
      <div class="hcard-id"><img src="${src(c.logo)}" alt="" /><span class="name">${esc(c.title)}</span><span class="badge">${c.type}</span></div>
      <div class="hcard-actions">
        <button class="btn btn-primary" data-action="${primary[1]}" data-client="${c.id}">${icon('plus', 22, '', 1.6)}${primary[0]}</button>
        ${isMeeting ? '' : `<button class="btn btn-soft" data-action="client-portal" data-id="${c.id}">${icon('externalLink', 20)}Client Portal</button>
        <button class="btn btn-danger-soft" data-action="delete-client" data-id="${c.id}" aria-label="Delete client">${icon('trash', 18)}</button>`}
      </div>
    </div>
    <nav class="ptabs">${CTABS.map(([k, l, ic]) => `<a class="ptab ${k === tab ? 'active' : ''}" href="#/clients/${c.id}/${k}">${icon(ic, 18)}${l}</a>`).join('')}</nav>
    ${body}`;
  return { html: shell('clients', html) };
};

/* ---------- Shared: deliverables list ---------- */
const DSTATUS = { review: ['green', 'In Review'], approved: ['primary', 'Approved'], revision: ['amber', 'Revision'] };
function deliverableSubtabs(action, current) {
  const ds = S().deliverables;
  const n = (k) => ds.filter((d) => d.status === k).length;
  return `<div class="subtabs" role="tablist">${[['all', `All (${ds.length})`], ['review', `In Review (${n('review')})`], ['revision', `Revision (${n('revision')})`], ['approved', `Approved (${n('approved')})`]]
    .map(([k, l]) => `<button class="tab ${current === k ? 'active' : ''}" data-action="${action}" data-sub="${k}">${l}</button>`).join('')}</div>`;
}
function deliverableCards(sub, navyApproved) {
  const list = S().deliverables.filter((d) => sub === 'all' || d.status === sub);
  if (!list.length) return '<div class="dlist"><div class="empty-row" style="background:#fff;border-radius:6px">No deliverables here yet.</div></div>';
  return `<div class="dlist">${list.map((d) => {
    const [dotc, label] = DSTATUS[d.status];
    const dots = Array.from({ length: d.revTotal }, (_, i) => `<i class="${i < d.revUsed ? 'on' : ''}"></i>`).join('');
    const left = d.revTotal - d.revUsed;
    const revText = d.status === 'approved' ? `<span class="red-txt">${left} remaining</span>`
      : d.revUsed >= d.revTotal ? `<span class="red-txt">${d.revUsed}/${d.revTotal} Used</span>` : `<span>${d.revUsed} / ${d.revTotal} Used</span>`;
    return `<article class="dcard">
      <button class="dthumb" data-action="open-deliverable" data-id="${d.id}" aria-label="Play ${esc(d.title)}">${d.thumb ? `<img src="${IMG}${d.thumb}" alt="" /><span class="dplay" aria-hidden="true">${icon('play', 12)}</span>` : `<span class="ph">${icon('play', 34)}</span>`}</button>
      <div class="dbody">
        <div class="dtop"><h3 class="dtitle">${esc(d.title)}</h3><span class="dstatus"><span class="dot ${navyApproved && d.status === 'approved' ? 'navy' : dotc}"></span>${label}</span></div>
        <div class="ddate">Delivered ${esc(d.delivered)}</div>
        <div class="drev"><span class="left"><span class="lbl">Revisions:</span><span class="rdots">${dots}</span>${revText}</span>${d.notes ? `<span>${esc(d.notes)}</span>` : ''}</div>
      </div>
    </article>`;
  }).join('')}</div>`;
}
Actions['open-deliverable'] = (el) => {
  const d = S().deliverables.find((x) => x.id === el.dataset.id);
  openDrawer(`<div class="drawer-body">
      <h2>${esc(d.title)}</h2>
      <div class="ddate">Delivered ${esc(d.delivered)} · ${DSTATUS[d.status][1]} · Revisions ${d.revUsed}/${d.revTotal}</div>
      ${d.thumb ? `<img src="${IMG}${d.thumb}" alt="" style="width:100%;border-radius:6px;margin-top:20px;display:block" />` : ''}
      <h3>Client feedback</h3>
      <div class="p-comment-list">${(d.comments || []).map((cm) => `
        <div class="p-comment ${cm.by}"><div class="p-c-head"><b>${esc(cm.by === 'client' ? cm.name : 'You')}</b>${cm.ts ? `<span class="ts">${esc(cm.ts)}</span>` : ''}${cm.kind === 'revision' ? '<span class="pill amber sm">Change request</span>' : ''}</div>
          <p>${esc(cm.text)}</p><time>${msgTime(cm.at)}</time></div>`).join('') || '<p class="set-note">No feedback yet. Your client can comment from their portal.</p>'}</div>
      <form class="p-comment-form" id="creator-reply"><div class="p-cf-row"><textarea class="textarea" name="text" rows="2" placeholder="Reply to your client..." aria-label="Reply"></textarea></div>
        <button class="btn btn-primary btn-sm" type="submit">${icon('send', 14)}Reply</button></form>
    </div>
    <div class="drawer-foot">
      <button class="btn cancel" data-action="close-drawer">Close</button>
      <button class="btn draft" data-action="deliverable-status" data-id="${d.id}" data-status="revision" style="width:auto;padding:0 16px">Request Revision</button>
      <button class="btn btn-primary" data-action="deliverable-status" data-id="${d.id}" data-status="approved">Approve ${icon('check', 18)}</button>
    </div>`, (drawer) => {
    $('#creator-reply', drawer).addEventListener('submit', (e) => {
      e.preventDefault();
      const text = e.target.elements.text.value.trim();
      if (!text) return;
      (d.comments = d.comments || []).push({ id: uid('cm'), by: 'creator', name: S().studio, text, at: new Date().toISOString() });
      Store.save(); closeDrawer(); Actions['open-deliverable']({ dataset: { id: d.id } }); toast('Reply sent to client');
    });
  });
};
Actions['deliverable-status'] = (el) => {
  const d = S().deliverables.find((x) => x.id === el.dataset.id);
  const to = el.dataset.status;
  if (to === 'revision') {
    if (d.revUsed >= d.revTotal) { toast('No revisions remaining on this deliverable'); return; }
    d.revUsed += 1;
  }
  d.status = to; Store.save(); closeDrawer(); App.render();
  toast(to === 'approved' ? `${d.title} approved` : `Revision requested for ${d.title}`);
};

/* ---------- Tab: Projects ---------- */
function clientProjectsTab(c) {
  let items;
  if (!isFresh()) {
    items = [
      { title: 'Feedback pending on Reel 03', sub: `${c.title} added 2 comments at 00:14 and 01:02.`, btn: 'Review Feedback', action: 'review-feedback' },
      { title: 'INV-024 — Payment Due', sub: '₹10,000 payment is still pending.', btn: 'Send Reminder', action: 'send-reminder' },
    ];
  } else {
    const review = S().deliverables.filter((d) => d.status === 'review');
    const unpaid = S().payments.filter((p) => p.status !== 'paid');
    items = [];
    if (review.length) items.push({ title: `Feedback pending on ${review[0].title}`, sub: `${review.length} deliverable${review.length > 1 ? 's are' : ' is'} waiting for review.`, btn: 'Review Feedback', action: 'review-feedback' });
    if (unpaid.length) items.push({ title: `${unpaid[0].no}: Payment Due`, sub: `₹${money(unpaid.reduce((n, p) => n + p.amount, 0))} is still unpaid.`, btn: 'Send Reminder', action: 'send-reminder' });
  }
  return `<div class="split">
    <div>${deliverableSubtabs('client-sub', CD.sub)}${deliverableCards(CD.sub)}</div>
    <aside class="action-card">
      <div class="head"><h2 class="card-title">Action Needed</h2>${items.length ? `<span class="count-badge">${items.length}</span>` : ''}</div>
      ${items.map((it) => `<div class="action-item"><h4>${it.title}</h4><p>${esc(it.sub)}</p><button class="btn btn-primary" data-action="${it.action}" data-name="${esc(c.title)}">${it.btn}</button></div>`).join('')
        || '<p class="set-note" style="margin-top:16px">You’re all caught up. Nothing needs action for this client.</p>'}
    </aside>
  </div>`;
}
Actions['client-sub'] = (el) => { CD.sub = el.dataset.sub; App.render(); };
Actions['review-feedback'] = () => {
  const d = S().deliverables.find((x) => x.status === 'review') || S().deliverables[0];
  if (d) Actions['open-deliverable']({ dataset: { id: d.id } });
};
Actions['send-reminder'] = (el) => toast(`Payment reminder sent to ${el.dataset.name}`);

/* ---------- Tab: Retainers ---------- */
function retainersTab() {
  const r = S().retainer;
  const q = CD.logQ.toLowerCase();
  const rows = r.log.filter((l) => !q || (l.name + l.format + l.status).toLowerCase().includes(q));
  return `
    <div class="stats cols-3">
      ${statCard('MONTHLY RETAINER', 'banknote', rupee(money(r.monthly)))}
      ${statCard('DELIVERABLES', 'calendar', ratioVal(r.delivered, r.deliverables))}
      ${statCard('REVISIONS', 'none', ratioVal(r.revUsed, r.revTotal))}
    </div>
    <div class="retainer-grid">
      <section class="card log-card">
        <div class="log-head"><h2 class="card-title" style="font-weight:400">Deliverables Log</h2>
          <label class="search">${icon('search', 14)}<input type="search" placeholder="Search deliverables" value="${esc(CD.logQ)}" data-input="log-q" /></label></div>
        <div class="tbl-scroll"><div class="ltable">
          <div class="thead"><span>DELIVERABLE</span><span>FORMAT</span><span>STATUS</span><span>REVISIONS</span></div>
          ${rows.map((l) => `<div class="trow"><span>${esc(l.name)}</span><span>${l.format}</span><span class="${l.status === 'Approved' ? 's-approved' : 's-pending'}">${l.status}</span><span>${l.rev}</span></div>`).join('') || '<div class="empty-row">No deliverables match your search.</div>'}
        </div></div>
      </section>
      <section class="card summary-card">
        <h2 class="card-title">Contract Summary</h2>
        <div class="srow"><span>Period</span><span>${r.period}</span></div>
        <div class="srow"><span>Next Billing</span><span>${r.nextBilling}</span></div>
        <div class="srow"><span>Monthly Scope</span><span>${r.scope}</span></div>
      </section>
    </div>`;
}
Inputs['log-q'] = (el) => { CD.logQ = el.value; App.render({ keepFocus: el }); };

/* ---------- Tab: Payments ---------- */
const PAY_SUB = { all: () => true, pending: (p) => p.status === 'pending', overdue: (p) => p.status === 'overdue', paid: (p) => p.status === 'paid' };
function paymentsTable(key, state) {
  const rows = S().payments.filter(PAY_SUB[state.sub || 'all']);
  const pg = paginate(rows, state.page || 1, 5);
  state.page = pg.page;
  const body = pg.rows.map((p) => `
    <div class="trow">
      <span>${p.no}</span><span>${esc(p.desc)}</span><span class="amt">${RS} ${money(p.amount)}/-</span><span>${p.dueLabel}</span>
      <span class="status"><span class="dot ${statusDot(p.status)}"></span>${cap(p.status)}</span>
      <span class="actions">
        <span class="slot">${p.status === 'paid' ? '' : `<button class="act bell" data-action="pay-remind" data-id="${p.id}" aria-label="Send reminder">${icon('bell', 20)}</button>`}</span>
        <span class="slot"><button class="act" data-action="pay-mail" data-id="${p.id}" aria-label="Email invoice">${icon('mail', 22)}</button></span>
        <span class="slot"><button class="act" data-action="pay-download" data-id="${p.id}" aria-label="Download invoice">${icon('download', 22)}</button></span>
      </span>
    </div>`).join('') || '<div class="empty-row">No payments in this view.</div>';
  return `<div class="rtable-card"><div class="tbl-scroll"><div class="rtable">
      <div class="thead"><span>INVOICE #</span><span>DESCRIPTION</span><span>AMOUNT</span><span>DUE DATE</span><span>STATUS</span><span>ACTION</span></div>
      ${body}</div></div>${pager(key, pg.page, pg.pages)}</div>`;
}
function paymentsTab() {
  const pays = S().payments;
  const billed = pays.reduce((n, p) => n + p.amount, 0);
  const settled = pays.filter((p) => p.status === 'paid').reduce((n, p) => n + p.amount, 0);
  UI.clientPay = UI.clientPay || { sub: 'all', page: 1 };
  const P = UI.clientPay;
  return `
    <div class="stats cols-3">
      ${statCard('TOTAL BILLED', 'banknote', rupee(money(billed)))}
      ${statCard('SETTLED AMOUNT', 'calendar', rupee(money(settled)))}
      ${statCard('OUTSTANDING', 'refresh', rupee(money(billed - settled)))}
    </div>
    <div class="toolbar inline" style="margin-top:12px;padding:0 15px;gap:19px">
      ${[['all', 'All'], ['pending', 'Pending'], ['overdue', 'Overdue'], ['paid', 'Paid']].map(([k, l]) =>
        `<button class="tab ${P.sub === k ? 'active' : ''}" data-action="pay-sub" data-sub="${k}">${l} (${pays.filter(PAY_SUB[k]).length})</button>`).join('')}
    </div>
    ${paymentsTable('clientPay', P)}`;
}
Actions['pay-sub'] = (el) => { UI.clientPay.sub = el.dataset.sub; UI.clientPay.page = 1; App.render(); };
const findPay = (id) => S().payments.find((p) => p.id === id);
const currentClient = () => S().clients.find((c) => c.id === CD.id) || S().clients[0];
Actions['pay-remind'] = (el) => toast(`Reminder sent for ${findPay(el.dataset.id).no}`);
Actions['pay-mail'] = (el) => {
  const p = findPay(el.dataset.id), c = currentClient();
  location.href = `mailto:${c.email || ''}?subject=${encodeURIComponent(`Invoice ${p.no} — ${p.desc}`)}&body=${encodeURIComponent(`Hi ${c.title},\n\nPlease find invoice ${p.no} for ${p.desc} of Rs. ${money(p.amount)}/-, due ${p.dueLabel}.\n\nThanks,\n${S().studio}`)}`;
};
Actions['pay-download'] = (el) => {
  const p = findPay(el.dataset.id), c = currentClient();
  downloadFile(`${p.no.replace(/\s/g, '')}.txt`, invoiceText({ no: p.no, client: c.title, desc: p.desc, amount: p.amount, due: p.dueLabel, status: p.status }), 'text/plain');
};
Actions['add-payment'] = () => openForm({
  title: 'Add New Payment', submit: 'Add Payment',
  fields: [
    { name: 'desc', label: 'Description', required: true, full: true, placeholder: 'e.g. October Retainer' },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, placeholder: '0' },
    { name: 'due', label: 'Due Date', type: 'date', value: new Date().toISOString().slice(0, 10) },
    { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'Paid', 'Overdue'], value: 'Pending' },
  ],
  onSubmit(v) {
    const pays = S().payments;
    const next = Math.max(...pays.map((p) => +p.no.replace(/\D/g, '')), 0) + 1;
    pays.unshift({ id: uid('c'), no: `INV - ${String(next).padStart(3, '0')}`, desc: v.desc.trim(), amount: +v.amount, dueLabel: v.due ? fmtUpper(v.due) : '—', status: v.status.toLowerCase(), clientId: CD.id || null });
    UI.clientPay = { sub: 'all', page: 1 };
    Store.save(); App.render(); toast('Payment added');
  },
});

/* ---------- Tab: Team ---------- */
function teamCards(list) {
  if (!list.length) return emptyState('idCard', 'No team members yet', 'Add editors, videographers and designers to assign work and keep track of what you owe them.', ['Assign Team Member', 'assign-member']);
  return `<div class="team-grid">${list.map((t) => `
    <article class="tcard">
      <div class="tcard-head"><img src="${src(t.avatar)}" alt="" /><span class="name">${esc(t.name)}</span><span class="badge">${esc(t.role)}</span>
        <a class="go" href="#/team" aria-label="Open ${esc(t.name)}">${icon('arrowRight', 22, '', 1.3)}</a></div>
      <div class="panel"><div class="panel-row"><span>Active Project</span><span>${t.total} Total</span></div><b>${esc(t.project)}</b></div>
      <div class="tcard-foot">
        <div><div class="amt">${RS} ${money(t.amount)}/-</div><small><span class="dot ${t.paid ? 'green' : 'red'}"></span>${t.paid ? 'Paid' : 'Pending'}</small></div>
        ${t.paid ? `<button class="btn btn-success" data-action="toggle-paid" data-id="${t.id}" title="Click to mark as pending">Settled</button>`
                 : `<button class="btn btn-violet" data-action="toggle-paid" data-id="${t.id}">Mark as paid</button>`}
      </div>
    </article>`).join('') || '<div class="empty-row">No team members assigned yet.</div>'}</div>`;
}
function teamTab() {
  const team = S().team;
  const total = team.reduce((n, t) => n + t.amount, 0);
  const settled = team.filter((t) => t.paid).reduce((n, t) => n + t.amount, 0);
  return `
    <div class="stats cols-3">
      ${statCard('TOTAL PAYOUTS', 'banknote', rupee(money(total)))}
      ${statCard('SETTLED AMOUNT', 'calendar', rupee(money(settled)))}
      ${statCard('OUTSTANDING', 'refresh', rupee(money(total - settled)))}
    </div>
    ${teamCards(S().team)}`;
}
Actions['toggle-paid'] = (el) => {
  const t = S().team.find((x) => x.id === el.dataset.id);
  t.paid = !t.paid; Store.save(); App.render();
  toast(t.paid ? `${t.name} marked as paid` : `${t.name} marked as pending`);
};
Actions['assign-member'] = () => openForm({
  title: 'Assign Team Member', submit: 'Assign',
  fields: [
    { name: 'name', label: 'Team Member', required: true, placeholder: 'Full name' },
    { name: 'role', label: 'Role', type: 'select', options: ['Videographer', 'Video editor', 'Graphics Designer', 'Motion Designer'], value: 'Videographer' },
    { name: 'project', label: 'Project', full: true, value: 'September Multi - Channel Campaign' },
    { name: 'amount', label: 'Payout (₹)', type: 'number', required: true, placeholder: '0' },
  ],
  onSubmit(v) {
    S().team.push({ id: uid('t'), name: v.name.trim(), role: v.role, avatar: initialsAvatar(v.name.trim()), project: v.project || '—', total: 1, amount: +v.amount, paid: false });
    const label = `${v.name.trim()} (${v.role})`;
    if (!S().members.includes(label)) S().members.push(label);
    Store.save(); App.render(); toast(`${v.name.trim()} assigned`);
  },
});

/* ---------- Tab: Meeting ---------- */
function meetingsBlock() {
  const m = S().meetings;
  const up = m.upcoming.map((u) => `
    <div class="mcard">
      <div>
        <span class="mbadge">${esc(u.platform)}</span>
        <h3 class="mtitle">${esc(u.title)}</h3>
        <div class="mdate">${icon('calendar', 16)}${esc(u.when)}</div>
        <div class="attendees"><img src="${IMG}avatar-attendees.png" alt="" /><span><b>Attendees</b><small>${esc(u.attendees)}</small></span></div>
      </div>
      <button class="btn btn-primary btn-sm" data-action="join-meeting" data-id="${u.id}">${icon('video', 16)}Join ${esc(u.platform)}</button>
    </div>`).join('') || `<div class="mcard mcard-empty"><div><b>No upcoming meetings</b><span class="ddate">Schedule a review or kick-off call and it will show up here.</span></div>
      <button class="btn btn-primary btn-sm" data-action="schedule-meeting">${icon('plus', 16, '', 1.6)}Schedule Meeting</button></div>`;
  const past = m.past.map((p) => `
    <div class="past-item"><div><div class="mdate">${icon('calendar', 16)}${esc(p.date)}</div><h4>${esc(p.title)}</h4></div>
      <button class="btn btn-primary btn-sm" data-action="view-notes" data-id="${p.id}">${icon('notes', 14)}View Notes</button></div>`).join('');
  return `
    <div class="meet-head"><h3>Upcoming Meetings</h3>${m.upcoming[0] ? `<span class="starts">${esc(m.upcoming[0].startsIn)}</span>` : ''}</div>
    ${up}
    <div class="meet-head" style="margin-top:24px"><h3>Past Meetings &amp; Notes</h3></div>
    <div class="past-card">${past || '<span class="ddate">No past meetings yet. Notes from finished meetings will appear here.</span>'}</div>`;
}
const meetingTab = () => meetingsBlock();
Actions['join-meeting'] = (el) => {
  const u = S().meetings.upcoming.find((x) => x.id === el.dataset.id);
  window.open(u.link, '_blank', 'noopener');
};
Actions['view-notes'] = (el) => {
  const p = S().meetings.past.find((x) => x.id === el.dataset.id);
  openDrawer(`<div class="drawer-body">
    <div class="mdate">${icon('calendar', 16)}${esc(p.date)}</div>
    <h2 style="margin-top:6px">${esc(p.title)}</h2>
    <p class="notes-body">${esc(p.notes)}</p></div>
    <div class="drawer-foot"><button class="btn cancel" data-action="close-drawer">Close</button>
    <button class="btn btn-primary" data-action="download-notes" data-id="${p.id}">Download ${icon('download', 18)}</button></div>`);
};
Actions['download-notes'] = (el) => {
  const p = S().meetings.past.find((x) => x.id === el.dataset.id);
  downloadFile(`${p.title.replace(/\W+/g, '-')}-notes.txt`, `${p.title}\n${p.date}\n\n${p.notes}`, 'text/plain');
};
Actions['schedule-meeting'] = () => openForm({
  title: 'Schedule Meeting', submit: 'Schedule',
  fields: [
    { name: 'title', label: 'Meeting Title', required: true, full: true, placeholder: 'e.g. Reel Review' },
    { name: 'platform', label: 'Platform', type: 'select', options: ['Google Meet', 'Zoom', 'Microsoft Teams'], value: 'Google Meet' },
    { name: 'date', label: 'Date', type: 'date', value: new Date().toISOString().slice(0, 10) },
    { name: 'time', label: 'Time', type: 'time', value: '16:00' },
    { name: 'attendees', label: 'Attendees', placeholder: 'Names, comma separated' },
    { name: 'link', label: 'Meeting Link', type: 'url', full: true, placeholder: 'https://meet.google.com/...' },
  ],
  onSubmit(v) {
    const d = v.date ? parseISO(v.date) : new Date();
    const [h, mi] = (v.time || '16:00').split(':').map(Number);
    const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi);
    const hrs = Math.max(0, Math.round((at - new Date()) / 36e5));
    const t12 = `${((h + 11) % 12) + 1}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    const links = { 'Google Meet': 'https://meet.google.com/', Zoom: 'https://zoom.us/', 'Microsoft Teams': 'https://teams.microsoft.com/' };
    S().meetings.upcoming.unshift({ id: uid('m'), platform: v.platform, title: v.title.trim(), when: `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' })} - ${t12}`, startsIn: hrs >= 24 ? `Starts In ${Math.round(hrs / 24)} DAYS` : `Starts In ${hrs} HR`, attendees: v.attendees || '—', link: v.link || links[v.platform], clientId: location.hash.startsWith('#/clients/') ? CD.id : null });
    Store.save(); App.render(); toast('Meeting scheduled');
  },
});

/* ---------- Tab: Portal ---------- */
function portalTab(c) {
  const code = codeFor(c);
  const invite = `Hi ${c.title}! Follow your projects with ${S().studio} on MODUS: sign up, choose “I work with creatives”, and enter team code ${code}.`;
  const files = (S().portalFiles || []).filter((f) => f.clientId === c.id).sort((a, b) => b.at.localeCompare(a.at));
  const feedback = S().deliverables.filter((d) => d.clientId === c.id).reduce((n, d) => n + (d.comments || []).filter((x) => x.by === 'client').length, 0);
  const joined = (S().accounts || []).some((a) => a.clientId === c.id);
  return `<div class="portal-tab">
    <section class="card details-card" style="margin-top:26px">
      <h2 class="card-title" style="font-weight:400">Client Portal</h2>
      <p class="set-note">${esc(c.title)} can review deliverables, leave feedback, pay invoices, share files and message you.</p>
      <div class="srow"><span>Team code</span><b class="code-chip">${code}</b></div>
      <div class="srow"><span>Status</span><span>${joined ? pill('Client has joined', 'green') : pill('Not joined yet', 'gray')}</span></div>
      <div class="srow"><span>Client feedback</span><span>${feedback} comment${feedback === 1 ? '' : 's'}</span></div>
      <div class="p-actions" style="justify-content:flex-start;margin-top:22px">
        <button class="btn btn-primary" data-action="copy-invite" data-text="${esc(invite)}">${icon('send', 16)}Copy invite</button>
        <button class="btn btn-white bordered" data-action="client-portal" data-id="${c.id}">${icon('eye', 18)}Preview portal</button>
      </div>
    </section>
    <section class="card details-card">
      <h2 class="card-title" style="font-weight:400">Files shared by ${esc(c.title)}</h2>
      ${files.length ? files.map((f) => `<div class="srow"><span>${esc(f.name)}</span><span class="set-note" style="margin:0">${f.by === 'client' ? 'From client' : 'From you'} · ${msgTime(f.at)}</span></div>`).join('')
        : '<p class="set-note">No files yet. Anything your client uploads in their portal shows up here.</p>'}
    </section>
  </div>`;
}
Actions['copy-invite'] = (el) => copyText(el.dataset.text, 'Invite copied. Send it to your client.');
Actions['delete-client'] = (el) => {
  const c = S().clients.find((x) => x.id === el.dataset.id);
  if (!confirm(`Delete ${c.title}? This removes the client from your workspace.`)) return;
  S().clients = S().clients.filter((x) => x.id !== c.id);
  Store.save(); toast(`${c.title} deleted`); location.hash = '#/clients';
};
Actions['client-download'] = (el) => {
  const tab = el.dataset.tab;
  const c = S().clients.find((x) => x.id === el.dataset.id);
  const s = S();
  const sheets = {
    projects: [['Deliverable', 'Delivered', 'Status', 'Revisions'], ...s.deliverables.map((d) => [d.title, d.delivered, DSTATUS[d.status][1], `${d.revUsed}/${d.revTotal}`])],
    retainers: [['Deliverable', 'Format', 'Status', 'Revisions'], ...s.retainer.log.map((l) => [l.name, l.format, l.status, l.rev])],
    payments: [['Invoice #', 'Description', 'Amount', 'Due Date', 'Status'], ...s.payments.map((p) => [p.no, p.desc, p.amount, p.dueLabel, cap(p.status)])],
    team: [['Member', 'Role', 'Project', 'Amount', 'Status'], ...s.team.map((t) => [t.name, t.role, t.project, t.amount, t.paid ? 'Paid' : 'Pending'])],
    portal: [['Client', 'Type', 'Email'], [c.title, c.type, c.email || '']],
  };
  downloadFile(`${c.id}-${tab}.csv`, toCSV(sheets[tab] || sheets.projects));
};

/* ---------- Top-level Meetings / Team / Messages ---------- */
Pages.meetings = () => ({ html: shell('meetings', `
  <div class="page-head"><h1 class="page-title">Meetings</h1>
    <button class="btn btn-primary" data-action="schedule-meeting">${icon('plus', 22, '', 1.6)}Schedule Meeting</button></div>
  <div style="margin-left:-16px">${meetingsBlock()}</div>`) });

Pages.team = () => ({ html: shell('team', `
  <div class="page-head"><h1 class="page-title">Team</h1>
    <button class="btn btn-primary" data-action="assign-member">${icon('plus', 22, '', 1.6)}Assign Team Member</button></div>
  ${teamCards(S().team)}`) });