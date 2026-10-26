/* Shared UI building blocks + interaction plumbing. */
const S = () => Store.state;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* Delegated handlers: data-action (click), data-input (input), data-change (change). */
const Actions = {};
const Inputs = {};
const Changes = {};

/* Route renderers: Pages[name](params) -> { html, mount?, theme? } */
const Pages = {};

/* Per-page, non-persisted UI state. */
const UI = {};
const ui = (key, defaults) => (UI[key] = UI[key] || { ...defaults });

/* ---------- App shell ---------- */
const NAV = [
  ['dashboard', 'Dashboard', 'dashboard'],
  ['clients', 'Clients', 'clients'],
  ['projects', 'Projects', 'folderOpen'],
  ['billing', 'Billing', 'billing'],
  ['meetings', 'Meetings', 'video'],
  ['messages', 'Messages', 'messages'],
  ['team', 'Team', 'idCard'],
  ['settings', 'Settings', 'settings'],
];

const unreadCount = () => (S().settings.notify.messages ? S().conversations.reduce((n, c) => n + (c.unread || 0), 0) : 0);

function shell(active, inner, opts = {}) {
  const unread = unreadCount();
  const nav = NAV.map(([key, label, ic]) => `
    <li><a class="sb-link ${key === active ? 'active' : ''}" href="#/${key}" title="${label}">${icon(ic, 22)}<span class="sb-label">${label}</span>${key === 'messages' && unread ? `<span class="sb-badge" aria-label="${unread} unread">${unread}</span>` : ''}</a></li>`).join('');
  return `
  <div class="layout ${opts.theme || ''}">
    <aside class="sidebar" aria-label="Main navigation">
      <div class="sb-top">
        <a class="sb-logo" href="#/dashboard"><img src="${IMG}logo.png" alt="MODUS" /></a>
        <button class="sb-toggle" data-action="toggle-sidebar" aria-label="Collapse sidebar">${icon('panelLeft', 22, '', 1.3)}</button>
      </div>
      <button class="sb-studio" data-action="studio-menu" aria-haspopup="menu">
        ${icon('studio', 22)}<span class="sb-studio-name">${esc(S().studio)}</span>
        <span class="chev">${icon('chevronsDownUp', 16)}</span>
      </button>
      <ul class="sb-nav">${nav}</ul>
      <button class="ask-card" data-action="open-ai" aria-label="Ask MODUS assistant">
        <span class="ask-ic">${icon('sparkle', 22, '', 1.6)}</span>
        <span class="ask-text"><span class="ask-help">Need help?</span><span class="ask-title">Ask MODUS</span></span>
        <span class="ask-chev">${icon('chevronRight', 22, '', 1.8)}</span>
      </button>
    </aside>
    <div class="sb-backdrop" data-action="close-sidebar"></div>
    <div class="main">
      <header class="topbar">
        <button class="menu-btn" data-action="open-sidebar" aria-label="Open menu">${icon('menu', 24)}</button>
        ${opts.topSearch ? `<label class="top-search">${icon('search', 14)}<input type="search" placeholder="Ask MODUS or search anything..." data-action="noop" id="global-search" /></label>` : ''}
        <span class="spacer"></span>
        ${isFresh() && active !== 'dashboard' ? `<span class="preview-chip">${icon('sparkle', 14, '', 1.6)}New user preview<button data-action="ws-sample">Back to sample data</button></span>` : ''}
        <button class="icon-btn" data-action="notifications" aria-label="Notifications">${icon('bell', 22)}${hasAlerts() ? '<span class="bell-dot"></span>' : ''}</button>
      </header>
      <main class="content">${inner}</main>
    </div>
  </div>`;
}

/* ---------- Small components ---------- */
function statCard(title, ic, valueHtml) {
  return `<div class="stat"><div class="stat-title"><span>${title}</span>${icon(ic, 18)}</div>${valueHtml}</div>`;
}
const rupee = (amount, cls = '') => `<div class="stat-value ${cls}"><span class="rs">${RS}</span> ${amount}/-</div>`;
const plainVal = (v, cls = '') => `<div class="stat-value ${cls}">${v}</div>`;
const ratioVal = (a, b) => `<div class="stat-value">${a} <span class="slash">/</span> <span class="of">${b}</span></div>`;

const RANGES = [['all', 'All time'], ['week', 'This week'], ['lastweek', 'Last week'], ['month', 'This month'], ['lastmonth', 'Last month'], ['year', 'This year'], ['custom', 'Custom range']];
function dateChips(key, active) {
  return `<div class="chips" role="tablist">${icon('filterLines', 18)}${RANGES.map(([v, l]) =>
    `<button class="chip ${v === active ? 'active' : ''}" data-action="set-range" data-key="${key}" data-range="${v}">${l}</button>`).join('')}</div>`;
}

/* Returns [from, to] Date bounds for a range id (relative to today). */
function rangeBounds(range, custom) {
  const now = new Date(); const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = (d0.getDay() + 6) % 7; // Monday = 0
  const add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  switch (range) {
    case 'week': return [add(d0, -day), add(d0, 6 - day)];
    case 'lastweek': return [add(d0, -day - 7), add(d0, -day - 1)];
    case 'month': return [new Date(d0.getFullYear(), d0.getMonth(), 1), new Date(d0.getFullYear(), d0.getMonth() + 1, 0)];
    case 'lastmonth': return [new Date(d0.getFullYear(), d0.getMonth() - 1, 1), new Date(d0.getFullYear(), d0.getMonth(), 0)];
    case 'year': return [new Date(d0.getFullYear(), 0, 1), new Date(d0.getFullYear(), 11, 31)];
    case 'custom': return custom && custom.from ? [parseISO(custom.from), parseISO(custom.to || custom.from)] : null;
    default: return null;
  }
}
const inRange = (iso, bounds) => !bounds || (parseISO(iso) >= bounds[0] && parseISO(iso) <= bounds[1]);

function pager(key, page, pages) {
  pages = Math.max(1, pages);
  const nums = Array.from({ length: pages }, (_, i) =>
    `<button class="pg ${i + 1 === page ? 'active' : ''}" data-action="page" data-key="${key}" data-page="${i + 1}">${i + 1}</button>`).join('');
  return `<div class="pager">
    <button class="pg wide" data-action="page" data-key="${key}" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button>
    ${nums}
    <button class="pg next" data-action="page" data-key="${key}" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Next</button>
  </div>`;
}
const paginate = (rows, page, size) => {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { rows: rows.slice((p - 1) * size, p * size), page: p, pages };
};

const statusDot = (s) => ({ pending: 'red', overdue: 'red', received: 'green', paid: 'green' }[s] || 'red');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Toast ---------- */
function toast(msg) {
  let stack = $('#toast-root .toast-stack');
  if (!stack) { $('#toast-root').innerHTML = '<div class="toast-stack" role="status" aria-live="polite"></div>'; stack = $('#toast-root .toast-stack'); }
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* ---------- Drawer ---------- */
function openDrawer(html, onMount) {
  const root = $('#overlay-root');
  root.innerHTML = `<div class="overlay" data-action="close-drawer"></div>
    <aside class="drawer" role="dialog" aria-modal="true">${html}</aside>`;
  document.body.style.overflow = 'hidden';
  const drawer = $('.drawer', root);
  if (onMount) onMount(drawer);
  const first = $('input, select, textarea', drawer);
  if (first) setTimeout(() => first.focus(), 50);
}
function closeDrawer() {
  $('#overlay-root').innerHTML = '';
  document.body.style.overflow = '';
}
Actions['close-drawer'] = closeDrawer;

/* Generic form drawer (same visual language as "Create New Project"). */
function fieldHtml(f) {
  const v = f.value ?? '';
  const filled = v !== '' ? 'filled' : '';
  let ctl;
  if (f.type === 'select') {
    ctl = `<select class="select ${filled}" name="${f.name}" ${f.required ? 'required' : ''}>${f.options.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    ctl = `<textarea class="textarea" name="${f.name}" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
  } else if (f.type === 'date') {
    ctl = dateButton(f.name, v);
  } else {
    ctl = `<input class="input" type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" ${f.required ? 'required' : ''} ${f.type === 'number' ? 'min="0"' : ''} />`;
  }
  return `<div class="field ${f.full ? 'full' : ''}"><label>${f.label}</label>${ctl}</div>`;
}
function dateButton(name, iso) {
  return `<div class="datebtn" tabindex="0" role="button" data-action="pick-date">${icon('calendar', 18)}<span>${iso ? fmtLong(iso) : 'Select date'}</span><input type="date" name="${name}" value="${iso || ''}" /></div>`;
}
Actions['pick-date'] = (el) => {
  const input = $('input', el);
  try { input.showPicker(); } catch (e) { input.style.pointerEvents = 'auto'; input.focus(); input.click(); }
};
document.addEventListener('change', (e) => {
  const inp = e.target.closest('.datebtn input');
  if (inp) $('span', inp.parentElement).textContent = inp.value ? fmtLong(inp.value) : 'Select date';
  if (e.target.matches('.input, .select')) e.target.classList.toggle('filled', !!e.target.value);
});

function openForm({ title, fields, submit = 'Save', onSubmit }) {
  openDrawer(`
    <form class="drawer-form" novalidate style="display:contents">
      <div class="drawer-body">
        <h2>${title}</h2>
        <div class="fgrid">${fields.map(fieldHtml).join('')}</div>
        <div class="ferr" hidden></div>
      </div>
      <div class="drawer-foot">
        <button type="button" class="btn cancel" data-action="close-drawer">Cancel</button>
        <button type="submit" class="btn btn-primary">${submit} ${icon('arrowRight', 20)}</button>
      </div>
    </form>`, (drawer) => {
    const form = $('form', drawer);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      const missing = fields.filter((f) => f.required && !String(values[f.name] || '').trim());
      const err = $('.ferr', form);
      if (missing.length) { err.hidden = false; err.textContent = `Please fill in: ${missing.map((f) => f.label).join(', ')}`; return; }
      if (onSubmit(values) !== false) closeDrawer();
    });
  });
}

/* ---------- Popover menus ---------- */
let menuCleanup = null;
function closeMenu() { if (menuCleanup) { menuCleanup(); menuCleanup = null; } }
function openMenu(anchor, html, onMount, align = 'right') {
  closeMenu();
  const el = document.createElement('div');
  el.className = 'menu'; el.setAttribute('role', 'menu'); el.innerHTML = html;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  let left = align === 'right' ? r.right - w : r.left;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  el.style.left = left + 'px'; el.style.top = top + 'px';
  const outside = (e) => { if (!el.contains(e.target) && !anchor.contains(e.target)) closeMenu(); };
  const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
  setTimeout(() => document.addEventListener('mousedown', outside), 0);
  document.addEventListener('keydown', onKey);
  menuCleanup = () => { el.remove(); document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', onKey); };
  if (onMount) onMount(el);
  return el;
}
/* items: [{label, run, on}] */
function openListMenu(anchor, items, title, align) {
  const el = openMenu(anchor, `${title ? `<div class="menu-title">${title}</div>` : ''}${items.map((it, i) =>
    `<button data-i="${i}" class="${it.on ? 'on' : ''}">${it.on ? icon('check', 14) : ''}${esc(it.label)}</button>`).join('')}`, null, align);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    const it = items[+b.dataset.i];
    closeMenu(); it.run();
  });
}

/* ---------- Files ---------- */
function downloadFile(name, text, mime = 'text/csv') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const toCSV = (rows) => rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
function invoiceText({ no, client, desc, amount, due, status }) {
  return [`MODUS — ${S().studio}`, '', `Invoice: ${no}`, `Billed to: ${client}`, `Description: ${desc}`,
    `Amount: Rs. ${money(amount)}/-`, `Due date: ${due}`, `Status: ${cap(status)}`, '', 'Thank you for your business!'].join('\n');
}

/* Copy text to the clipboard. Falls back to execCommand when the async
   Clipboard API is missing or blocked (common on file:// pages). */
function copyText(text, okMsg) {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    toast(ok ? okMsg : `Couldn't copy automatically. Link: ${text}`);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(okMsg), fallback);
  else fallback();
}

/* Wire a dropzone element to a hidden file input + drag & drop. */
function wireDropzone(zone, onFiles) {
  const input = document.createElement('input');
  input.type = 'file'; input.multiple = true; input.hidden = true;
  input.accept = 'image/*,video/*,.zip,.pdf';
  zone.appendChild(input);
  const show = (files) => {
    const list = [...files];
    if (!list.length) return;
    let out = $('.files', zone);
    if (!out) { out = document.createElement('div'); out.className = 'files'; zone.appendChild(out); }
    out.textContent = list.length === 1 ? list[0].name : `${list.length} files selected`;
    onFiles && onFiles(list);
  };
  zone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', () => show(input.files));
  ['dragenter', 'dragover'].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.remove('over'); }));
  zone.addEventListener('drop', (e) => show(e.dataTransfer.files));
}

/* ---------- Global shell actions ---------- */
Actions['toggle-sidebar'] = () => {
  document.body.classList.toggle('sb-collapsed');
  try { localStorage.setItem('modus.sb', document.body.classList.contains('sb-collapsed') ? '1' : ''); } catch (e) {}
};
Actions['open-sidebar'] = () => document.body.classList.add('sb-open');
Actions['close-sidebar'] = () => document.body.classList.remove('sb-open');
/* ---------- Live figures ----------
   The sample workspace shows the figures from the original designs.
   A fresh (first-time) workspace calculates everything from the user's own data. */
const sumBy = (rows, fn) => rows.filter(fn).reduce((n, r) => n + r.amount, 0);
function liveDashStats() {
  if (!isFresh()) return S().dashStats;
  const inv = S().invoices;
  const revenue = sumBy(inv, (r) => r.kind === 'invoice');
  const received = sumBy(inv, (r) => r.kind === 'invoice' && r.status === 'received');
  const expenses = sumBy(inv, (r) => r.kind === 'team' && r.status === 'received') + S().team.filter((t) => t.paid).reduce((n, t) => n + t.amount, 0);
  return { revenue, received, expenses, balance: received - expenses };
}
function liveRevenue() {
  if (!isFresh()) return S().revenue;
  const now = new Date(), months = [], years = [], earned = [], received = [], payouts = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const inMonth = (r) => { const x = parseISO(r.due); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); };
    months.push(MONTHS_SHORT[d.getMonth()]); years.push(d.getFullYear());
    earned.push(sumBy(S().invoices, (r) => r.kind === 'invoice' && inMonth(r)));
    received.push(sumBy(S().invoices, (r) => r.kind === 'invoice' && r.status === 'received' && inMonth(r)));
    payouts.push(sumBy(S().invoices, (r) => r.kind === 'team' && inMonth(r)));
  }
  return { months, years, year: now.getFullYear(), earned, received, payouts };
}
function liveClientStats() {
  if (!isFresh()) return S().clientStats;
  const active = S().clients.filter((c) => !c.archived);
  return {
    total: active.length,
    retainers: active.filter((c) => c.type === 'Retainer').length,
    pending: S().projects.length,
    completed: S().deliverables.filter((d) => d.status === 'approved').length,
  };
}
/* "Needs your attention" items: curated in the sample workspace, generated from data in a fresh one. */
function attentionItems() {
  if (!isFresh()) return S().attention;
  const gone = new Set(S().dismissed || []);
  const items = [];
  S().invoices.filter((r) => r.kind === 'invoice' && (r.status === 'overdue' || (r.status === 'pending' && daysFromToday(r.due) < 0)))
    .forEach((r) => items.push({ id: 'inv-' + r.id, dot: 'red', logo: r.logo, title: 'Payment Overdue', sub: [r.client, `₹ ${money(r.amount)}/-`], meta: { icon: 'rupee', text: `${money(r.amount)}/-` }, action: 'Send Reminder', remind: r.client }));
  const firstProject = S().projects[0];
  S().deliverables.filter((d) => d.status === 'review')
    .forEach((d) => items.push({ id: 'dl-' + d.id, dot: 'green', logo: initialsAvatar(d.title), title: d.title, sub: ['Deliverable', 'Client feedback pending'], meta: { icon: 'comment', text: 'In review' }, action: 'Review Feedback', route: firstProject ? `#/projects/${firstProject.id}/deliverable` : '#/projects' }));
  S().projects.filter((p) => p.status !== 'review' && daysFromToday(p.due) >= 0 && daysFromToday(p.due) <= 1)
    .forEach((p) => items.push({ id: 'pj-' + p.id, dot: 'green', logo: p.logo, title: p.title, sub: [p.client, STATUS_LABEL[p.status]], meta: { icon: 'clock', text: `Due ${relDay(daysFromToday(p.due))}` }, action: 'View Project', route: `#/projects/${p.id}/deliverable` }));
  return items.filter((a) => !gone.has(a.id));
}

/* Attention items filtered by the notification preferences in Settings. */
function notifications() {
  const n = S().settings.notify;
  return attentionItems().filter((a) => (a.route ? n.feedback : n.payments));
}

/* Empty-state block used across pages. */
function emptyState(ic, title, text, btn) {
  return `<div class="empty-state">
    <span class="es-ic">${icon(ic, 28)}</span>
    <h3>${title}</h3><p>${text}</p>
    ${btn ? `<button class="btn btn-primary" data-action="${btn[1]}">${icon('plus', 20, '', 1.6)}${btn[0]}</button>` : ''}
  </div>`;
}
/* Projects due within 2 days or overdue (when the Deadlines notification is on). */
const deadlineAlerts = () => (S().settings.notify.deadlines ? S().projects.filter((p) => daysFromToday(p.due) <= 2) : []);
const hasAlerts = () => notifications().length + deadlineAlerts().length + unreadCount() > 0;
Actions['notifications'] = (el) => {
  const items = notifications().map((a) => ({ label: a.title, run: () => (a.route ? (location.hash = a.route) : (location.hash = '#/billing')) }));
  deadlineAlerts().forEach((p) => items.push({ label: `${p.title}: due ${relDay(daysFromToday(p.due))}`, run: () => (location.hash = `#/projects/${p.id}/deliverable`) }));
  const unread = unreadCount();
  if (unread) items.push({ label: `${unread} unread message${unread > 1 ? 's' : ''}`, run: () => (location.hash = '#/messages') });
  if (!items.length) items.push({ label: "You're all caught up", run: () => {} });
  openListMenu(el, items, 'Needs your attention');
};
Actions['studio-menu'] = (el) => openListMenu(el, [
  { label: S().studio, on: true, run: () => {} },
  { label: 'Settings', run: () => (location.hash = '#/settings') },
  { label: 'Log out', run: () => logout() },
], 'Workspaces', 'left');
Actions['set-range'] = (el) => {
  const st = UI[el.dataset.key] || (UI[el.dataset.key] = {});
  if (el.dataset.range === 'custom') {
    const m = openMenu(el, `<div class="menu-title">Custom range</div>
      <div class="range"><label>From<input type="date" name="from" value="${st.custom?.from || ''}"></label>
      <label>To<input type="date" name="to" value="${st.custom?.to || ''}"></label>
      <button class="btn btn-primary" data-apply>Apply</button></div>`, null, 'left');
    $('[data-apply]', m).addEventListener('click', () => {
      const from = $('[name=from]', m).value, to = $('[name=to]', m).value;
      if (!from) { toast('Pick a start date'); return; }
      st.custom = { from, to: to || from }; st.range = 'custom'; st.page = 1;
      closeMenu(); App.render();
    });
    return;
  }
  st.range = el.dataset.range; st.page = 1;
  App.render();
};
Actions['page'] = (el) => {
  if (el.disabled) return;
  (UI[el.dataset.key] || (UI[el.dataset.key] = {})).page = +el.dataset.page;
  App.render();
};
Actions['noop'] = () => {};

/* Workspace switch: empty first-time view <-> sample data. */
function goWorkspace(to, msg) {
  switchWorkspace(to);
  // Forget page state that may point at records from the other workspace.
  ['billing', 'clients', 'projects', 'messages', 'clientDetail', 'projectDetail', 'clientPay', 'projPay'].forEach((k) => { if (UI[k]) UI[k].page = 1; });
  if (UI.messages) UI.messages.active = null;
  if (UI.projects) UI.projects.client = '';
  closeDrawer();
  if (location.hash === '#/dashboard') App.render(); else location.hash = '#/dashboard';
  window.scrollTo(0, 0);
  toast(msg);
}
Actions['ws-fresh'] = () => goWorkspace('fresh', 'This is what a new user sees. Your sample data is saved.');
Actions['ws-sample'] = () => goWorkspace('sample', 'Sample data restored');
