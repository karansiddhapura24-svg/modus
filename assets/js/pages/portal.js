/* Client portal: the side of MODUS used by brands and businesses working with a creator.
   It reads and writes the same workspace data, so everything a client does here
   (comments, approvals, payments, files, messages) shows up on the creator side. */
const PT = ui('portal', { revTab: 'review', invTab: 'all' });

/* ---------- Data scoped to the signed-in client ---------- */
const portalClientId = () => UI.portalPreview || (S().session && S().session.clientId);
const portalClient = () => S().clients.find((c) => c.id === portalClientId());
const owned = (rec) => rec.clientId === portalClientId();
const pProjects = () => S().projects.filter((p) => p.clientId === portalClientId());
const pDeliverables = () => S().deliverables.filter(owned);
const pMeetings = () => ({ upcoming: S().meetings.upcoming.filter(owned), past: S().meetings.past.filter(owned) });
const pFiles = () => (S().portalFiles || []).filter(owned);
const pConvo = () => S().conversations.find((x) => x.id === portalClientId());
const studioName = () => S().studio;
const viewerName = () => (UI.portalPreview ? portalClient().title : (S().session.name || portalClient().title));

/* Invoices for this client: its payment schedule plus any billing invoices addressed to it. */
function pInvoices() {
  const c = portalClient();
  const rows = S().payments.filter(owned).map((p) => ({ id: p.id, src: 'pay', no: p.no, desc: p.desc, amount: p.amount, dueLabel: p.dueLabel, status: p.status, method: p.method }));
  const seen = new Set(rows.map((r) => r.no));
  S().invoices.filter((r) => r.kind === 'invoice' && (r.clientId === c.id || r.client === c.name || r.client === c.title) && !seen.has(r.no))
    .forEach((r) => rows.push({ id: r.id, src: 'inv', no: r.no, desc: r.project, amount: r.amount, dueLabel: r.dueLabel, status: r.status === 'received' ? 'paid' : r.status, method: r.method }));
  return rows;
}
const unpaid = () => pInvoices().filter((r) => r.status !== 'paid');
const awaitingReview = () => pDeliverables().filter((d) => d.status === 'review');
const clientUnread = () => (pConvo() && pConvo().clientUnread) || 0;
const pNotify = () => (S().session && S().session.portalNotify) || { deliverables: true, invoices: true, meetings: true, messages: true };

const P_STATUS = { new: ['Getting started', 'blue'], progress: ['In production', 'amber'], review: ['Ready for your review', 'green'] };
const D_STATUS = { review: ['Awaiting your review', 'green'], revision: ['Revision in progress', 'amber'], approved: ['Approved', 'blue'] };
const pill = (text, tone) => `<span class="pill ${tone}">${text}</span>`;
const fileSize = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${Math.round(b / 1e3)} KB` : `${b} B`);

/* ---------- Shell ---------- */
const PNAV = [
  ['home', 'Home', 'dashboard'], ['projects', 'Projects', 'folderOpen'], ['review', 'Review', 'eye'], ['files', 'Files', 'folderPlus'],
  ['invoices', 'Invoices', 'billing'], ['meetings', 'Meetings', 'video'], ['messages', 'Messages', 'messages'], ['settings', 'Settings', 'settings'],
];
function portalShell(active, inner) {
  const c = portalClient();
  const badges = { review: awaitingReview().length, invoices: unpaid().length, messages: clientUnread() };
  const nav = PNAV.map(([k, label, ic]) => `
    <li><a class="sb-link ${k === active ? 'active' : ''}" href="#/portal${k === 'home' ? '' : '/' + k}" title="${label}">${icon(ic, 22)}<span class="sb-label">${label}</span>${badges[k] ? `<span class="sb-badge">${badges[k]}</span>` : ''}</a></li>`).join('');
  const notifCount = portalNotifications().length;
  return `
  <div class="layout portal">
    <aside class="sidebar" aria-label="Portal navigation">
      <div class="sb-top">
        <a class="sb-logo" href="#/portal"><img src="${IMG}logo.png" alt="MODUS" /></a>
        <button class="sb-toggle" data-action="toggle-sidebar" aria-label="Collapse sidebar">${icon('panelLeft', 22, '', 1.3)}</button>
      </div>
      <div class="sb-studio p-company"><img src="${src(c.logo)}" alt="" /><span class="sb-studio-name"><b>${esc(c.title)}</b><small>Client portal</small></span></div>
      <ul class="sb-nav">${nav}</ul>
      <a class="ask-card" href="#/portal/messages" aria-label="Message ${esc(studioName())}">
        <span class="ask-ic">${icon('messages', 22, '', 1.6)}</span>
        <span class="ask-text"><span class="ask-help">Need help?</span><span class="ask-title">Message ${esc(studioName().replace(/’s Studio|'s Studio/, ''))}</span></span>
        <span class="ask-chev">${icon('chevronRight', 22, '', 1.8)}</span>
      </a>
    </aside>
    <div class="sb-backdrop" data-action="close-sidebar"></div>
    <div class="main">
      <header class="topbar">
        <button class="menu-btn" data-action="open-sidebar" aria-label="Open menu">${icon('menu', 24)}</button>
        ${UI.portalPreview ? `<span class="preview-chip">${icon('eye', 14)}Previewing ${esc(c.title)}’s portal<button data-action="exit-portal-preview">Exit preview</button></span>` : ''}
        <span class="spacer"></span>
        <span class="p-by">Projects by <b>${esc(studioName())}</b></span>
        <button class="icon-btn" data-action="portal-notifs" aria-label="Notifications">${icon('bell', 22)}${notifCount ? '<span class="bell-dot"></span>' : ''}</button>
      </header>
      <main class="content">${inner}</main>
    </div>
  </div>`;
}
function portalNotifications() {
  const n = pNotify(), items = [];
  if (n.deliverables) awaitingReview().forEach((d) => items.push({ label: `Review “${d.title}”`, route: `#/portal/review/${d.id}` }));
  if (n.invoices) unpaid().forEach((r) => items.push({ label: `${r.no} · ₹${money(r.amount)} ${r.status === 'overdue' ? 'is overdue' : 'is due'}`, route: '#/portal/invoices' }));
  if (n.meetings) pMeetings().upcoming.slice(0, 1).forEach((m) => items.push({ label: `Meeting: ${m.title}`, route: '#/portal/meetings' }));
  if (n.messages && clientUnread()) items.push({ label: `${clientUnread()} new message${clientUnread() > 1 ? 's' : ''} from ${studioName()}`, route: '#/portal/messages' });
  return items;
}
Actions['portal-notifs'] = (el) => {
  const items = portalNotifications().map((i) => ({ label: i.label, run: () => (location.hash = i.route) }));
  openListMenu(el, items.length ? items : [{ label: 'You’re all caught up', run: () => {} }], 'Notifications');
};
Actions['exit-portal-preview'] = () => { const id = UI.portalPreview; UI.portalPreview = null; location.hash = `#/clients/${id}/portal`; };

/* ---------- Router entry ---------- */
Pages.portal = ({ section = 'home', id } = {}) => {
  const c = portalClient();
  if (!c) {
    return { html: `<div class="ob-page"><div class="ob-center" style="padding-top:120px">${emptyState('globe', 'We can’t find your project portal',
      'The workspace that invited you is no longer available on this device. Ask your creator for a new team code.', null)}
      <div style="text-align:center;margin-top:16px"><button class="btn btn-primary" data-action="logout">Log out</button></div></div></div>` };
  }
  const view = (PORTAL_VIEWS[section] || PORTAL_VIEWS.home)(id);
  return { html: portalShell(section === 'review' && id ? 'review' : section, view.html), mount: view.mount };
};

/* ---------- Home ---------- */
function stepTracker(status) {
  const idx = { new: 0, progress: 1, review: 2 }[status] ?? 0;
  return `<ol class="p-steps">${['Kick-off', 'In production', 'Your review', 'Delivered'].map((s, i) =>
    `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}"><i>${i < idx ? icon('check', 12, '', 2.4) : ''}</i><span>${s}</span></li>`).join('')}</ol>`;
}
function projectCard(p) {
  const [label, tone] = P_STATUS[p.status];
  const n = daysFromToday(p.due);
  return `<a class="card p-proj" href="#/portal/projects/${p.id}">
    <div class="p-proj-top"><h3>${esc(p.title)}</h3>${pill(label, tone)}</div>
    <div class="p-meta"><span>${icon('calendar', 14)}Due ${fmtLong(p.due)} <em class="${n < 0 ? 'late' : ''}">(${relDay(n)})</em></span>
      <span>${icon('history', 14)}${p.revUsed}/${p.revTotal} revisions used</span></div>
    ${stepTracker(p.status)}
  </a>`;
}
const PORTAL_VIEWS = {};
PORTAL_VIEWS.home = () => {
  const c = portalClient(), projects = pProjects(), review = awaitingReview(), due = unpaid(), next = pMeetings().upcoming[0];
  const outstanding = due.reduce((n, r) => n + r.amount, 0);
  const hr = new Date().getHours(), greet = hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening';
  const waiting = [
    ...review.map((d) => ({ dot: 'green', img: d.thumb ? IMG + d.thumb : initialsAvatar(d.title), title: `${d.title} is ready for review`, sub: `Delivered ${d.delivered} · ${d.revUsed}/${d.revTotal} revisions used`, btn: 'Review now', href: `#/portal/review/${d.id}` })),
    ...(due.length > 2
      ? [{ dot: 'red', img: initialsAvatar('₹'), title: `${due.length} unpaid invoices · ₹${money(outstanding)}`, sub: `Oldest: ${due[0].no}, due ${due[0].dueLabel}`, btn: 'Pay invoices', href: '#/portal/invoices' }]
      : due.map((r) => ({ dot: 'red', img: initialsAvatar('₹'), title: `${r.no} · ₹${money(r.amount)}`, sub: `${r.desc} · ${r.status === 'overdue' ? 'Overdue' : 'Due'} ${r.dueLabel}`, btn: 'Pay invoice', action: 'p-pay', id: r.id }))),
  ];
  return { html: `
    <div class="dash-head"><div><h1>${greet}, ${esc(viewerName().split(/\s+/)[0])}</h1>
      <p>${esc(studioName())} is working on ${projects.length} project${projects.length === 1 ? '' : 's'} for ${esc(c.title)}.</p></div></div>
    <div class="stats">
      ${statCard('ACTIVE PROJECTS', 'folderOpen', plainVal(projects.length))}
      ${statCard('AWAITING YOUR REVIEW', 'eye', plainVal(review.length, review.length ? 'c-green2' : ''))}
      ${statCard('OUTSTANDING', 'wallet', rupee(money(outstanding), outstanding ? 'c-red2' : ''))}
      ${statCard('NEXT MEETING', 'calendar', plainVal(next ? `<span class="p-next">${esc(next.when)}</span>` : '—'))}
    </div>
    <section class="card attention"><h2 class="card-title">Waiting on you</h2>
      <div class="att-list">${waiting.map((w) => `
        <div class="att-item"><span class="dot ${w.dot}"></span><img src="${w.img}" alt="" />
          <div class="att-text"><b>${esc(w.title)}</b><small>${esc(w.sub)}</small></div>
          ${w.href ? `<a class="att-btn p-att-btn" href="${w.href}">${w.btn}</a>` : `<button class="att-btn" data-action="${w.action}" data-id="${w.id}">${w.btn}</button>`}
        </div>`).join('') || '<div class="empty-row">Nothing needs your attention. We’ll let you know when there’s something to review or pay.</div>'}</div>
    </section>
    <div class="p-home-grid">
      <section><div class="p-sec-head"><h2 class="card-title">Your projects</h2><a class="link-sm" href="#/portal/projects">View all ${icon('arrowRight', 14)}</a></div>
        <div class="p-proj-list">${projects.slice(0, 3).map(projectCard).join('') || '<div class="card p-empty-card">No projects yet.</div>'}</div></section>
      <section><div class="p-sec-head"><h2 class="card-title">Next meeting</h2><a class="link-sm" href="#/portal/meetings">All meetings ${icon('arrowRight', 14)}</a></div>
        ${next ? `<div class="card p-meet"><span class="mbadge">${esc(next.platform)}</span><h3>${esc(next.title)}</h3>
          <div class="mdate">${icon('calendar', 16)}${esc(next.when)}</div>
          <button class="btn btn-primary btn-sm" data-action="join-meeting" data-id="${next.id}">${icon('video', 16)}Join ${esc(next.platform)}</button></div>`
          : `<div class="card p-meet"><h3>No meetings scheduled</h3><p class="set-note">Need to talk something through?</p><button class="btn btn-soft text-primary btn-sm" data-action="p-request-meeting">${icon('plus', 16, '', 1.6)}Request a meeting</button></div>`}
      </section>
    </div>` };
};

/* ---------- Projects ---------- */
PORTAL_VIEWS.projects = (id) => {
  if (id) return portalProjectDetail(id);
  const list = pProjects();
  return { html: `<div class="page-head"><h1 class="page-title">Projects</h1></div>
    <p class="p-lead">Everything ${esc(studioName())} is producing for you, and where it stands.</p>
    ${list.length ? `<div class="p-proj-grid">${list.map(projectCard).join('')}</div>`
      : emptyState('folderOpen', 'No projects yet', `When ${esc(studioName())} starts a project for you, it will appear here with its deadline and progress.`, null)}` };
};
function portalProjectDetail(id) {
  const p = pProjects().find((x) => x.id === id);
  if (!p) return { html: emptyState('folderOpen', 'Project not found', 'It may have been removed.', null) };
  const ds = pDeliverables().filter((d) => d.projectId === p.id);
  const [label, tone] = P_STATUS[p.status];
  return { html: `
    <div class="page-head"><nav class="crumbs"><a href="#/portal/projects">Projects</a>${icon('arrowRight', 16)}<span>${esc(p.title)}</span></nav>${pill(label, tone)}</div>
    <section class="card p-detail">${stepTracker(p.status)}
      <div class="p-facts">
        <div><small>Deadline</small><b>${fmtLong(p.due)}</b></div>
        <div><small>Started</small><b>${p.start ? fmtLong(p.start) : '—'}</b></div>
        <div><small>Revisions</small><b>${p.revUsed} of ${p.revTotal} used</b></div>
        <div><small>Extra revisions</small><b>₹${money(p.charge || S().settings.overCharge)} each</b></div>
      </div>
      ${p.brief ? `<div class="p-brief"><small>Brief</small><p>${esc(p.brief)}</p></div>` : ''}
    </section>
    <div class="p-sec-head"><h2 class="card-title">Deliverables</h2></div>
    ${ds.length ? `<div class="p-dl-list">${ds.map(deliverableRow).join('')}</div>` : '<div class="card p-empty-card">Nothing delivered yet. You’ll be notified when the first cut is ready.</div>'}` };
}

/* ---------- Review ---------- */
function deliverableRow(d) {
  const [label, tone] = D_STATUS[d.status];
  return `<a class="card p-dl" href="#/portal/review/${d.id}">
    <span class="dthumb">${d.thumb ? `<img src="${IMG}${d.thumb}" alt="" /><span class="dplay" aria-hidden="true">${icon('play', 12)}</span>` : `<span class="ph">${icon('play', 30)}</span>`}</span>
    <span class="p-dl-body"><span class="p-proj-top"><h3>${esc(d.title)}</h3>${pill(label, tone)}</span>
      <small>Delivered ${esc(d.delivered)} · ${d.revUsed}/${d.revTotal} revisions used · ${(d.comments || []).length} comment${(d.comments || []).length === 1 ? '' : 's'}</small>
      <span class="p-dl-cta">${d.status === 'review' ? 'Review & give feedback' : 'View'} ${icon('arrowRight', 14)}</span></span>
  </a>`;
}
PORTAL_VIEWS.review = (id) => {
  if (id) return reviewDetail(id);
  const all = pDeliverables();
  const tabs = [['review', 'Awaiting review'], ['revision', 'In revision'], ['approved', 'Approved'], ['all', 'All']];
  const list = all.filter((d) => PT.revTab === 'all' || d.status === PT.revTab);
  return { html: `<div class="page-head"><h1 class="page-title">Review</h1></div>
    <p class="p-lead">Watch each cut, leave timestamped feedback, then approve it or ask for changes.</p>
    <div class="subtabs p-tabs">${tabs.map(([k, l]) => `<button class="tab ${PT.revTab === k ? 'active' : ''}" data-action="p-rev-tab" data-k="${k}">${l} (${k === 'all' ? all.length : all.filter((d) => d.status === k).length})</button>`).join('')}</div>
    ${list.length ? `<div class="p-dl-list">${list.map(deliverableRow).join('')}</div>`
      : `<div class="card p-empty-card">${PT.revTab === 'review' ? 'Nothing is waiting for your review right now. 🎉' : 'Nothing here yet.'}</div>`}` };
};
Actions['p-rev-tab'] = (el) => { PT.revTab = el.dataset.k; App.render(); };

function reviewDetail(id) {
  const d = pDeliverables().find((x) => x.id === id);
  if (!d) return { html: emptyState('eye', 'Deliverable not found', 'It may have been removed.', null) };
  const [label, tone] = D_STATUS[d.status];
  const out = d.revUsed >= d.revTotal;
  const comments = (d.comments || []).slice().sort((a, b) => (a.ts || '99:99').localeCompare(b.ts || '99:99'));
  return { html: `
    <div class="page-head"><nav class="crumbs"><a href="#/portal/review">Review</a>${icon('arrowRight', 16)}<span>${esc(d.title)}</span></nav>${pill(label, tone)}</div>
    <div class="p-review">
      <section class="card p-player">
        <div class="p-screen">${d.thumb ? `<img src="${IMG}${d.thumb}" alt="${esc(d.title)} preview" />` : `<span class="ph">${icon('play', 48)}</span>`}
          <span class="p-play">${icon('play', 30)}</span></div>
        <div class="p-player-meta"><div><h2>${esc(d.title)}</h2><small>Delivered ${esc(d.delivered)}</small></div>
          <div class="p-revs"><span class="rdots">${Array.from({ length: d.revTotal }, (_, i) => `<i class="${i < d.revUsed ? 'on' : ''}"></i>`).join('')}</span>
            <span class="${out ? 'red-txt' : ''}">${d.revUsed}/${d.revTotal} revisions used</span></div></div>
        ${d.status === 'approved' ? `<div class="p-banner ok">${icon('check', 18, '', 2)}You approved this deliverable. Thank you!</div>` : d.status === 'revision'
          ? `<div class="p-banner warn">${icon('history', 18)}${esc(studioName())} is working on your requested changes.</div>`
          : `<div class="p-actions">
              <button class="btn btn-white bordered" data-action="p-revision" data-id="${d.id}">${icon('history', 18)}Request changes</button>
              <button class="btn btn-primary" data-action="p-approve" data-id="${d.id}">${icon('check', 18, '', 2)}Approve</button></div>
             ${out ? `<p class="p-note">${icon('info', 14)}All included revisions are used. Extra rounds cost ₹${money(S().settings.overCharge)} each.</p>` : ''}`}
      </section>
      <aside class="card p-comments">
        <h3>Feedback <span>${comments.length}</span></h3>
        <div class="p-comment-list">${comments.map((cm) => `
          <div class="p-comment ${cm.by}"><div class="p-c-head"><b>${esc(cm.by === 'client' ? cm.name : studioName())}</b>${cm.ts ? `<span class="ts">${esc(cm.ts)}</span>` : ''}${cm.kind === 'revision' ? '<span class="pill amber sm">Change request</span>' : ''}</div>
            <p>${esc(cm.text)}</p><time>${msgTime(cm.at)}</time></div>`).join('') || '<p class="set-note">No feedback yet. Add a note with a timestamp so the editor knows exactly where.</p>'}</div>
        ${d.status === 'approved' ? '' : `<form class="p-comment-form" id="p-comment-form">
          <div class="p-cf-row"><input class="input ts-in" name="ts" placeholder="00:00" maxlength="5" aria-label="Timestamp (optional)" inputmode="numeric" />
          <textarea class="textarea" name="text" rows="2" placeholder="Add feedback for this moment..." aria-label="Feedback"></textarea></div>
          <button class="btn btn-primary btn-sm" type="submit">${icon('send', 14)}Post feedback</button></form>`}
      </aside>
    </div>`,
  mount() {
    const f = $('#p-comment-form'); if (!f) return;
    f.elements.ts.addEventListener('input', (e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); e.target.value = v.length > 2 ? `${v.slice(0, 2)}:${v.slice(2)}` : v; });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = f.elements.text.value.trim(), ts = f.elements.ts.value.trim();
      if (!text) { toast('Write your feedback first'); f.elements.text.focus(); return; }
      if (ts && !/^\d{2}:\d{2}$/.test(ts)) { toast('Use mm:ss for the timestamp, e.g. 00:14'); f.elements.ts.focus(); return; }
      addComment(d, { ts, text }); Store.save(); App.render(); toast('Feedback posted');
    });
  } };
}
function addComment(d, { ts, text, kind }) {
  d.comments = d.comments || [];
  d.comments.push({ id: uid('cm'), by: 'client', name: portalClient().title, ts, text, kind, at: new Date().toISOString() });
  const n = d.comments.filter((x) => x.by === 'client').length;
  d.notes = `${n} client note${n === 1 ? '' : 's'}`;
}
Actions['p-approve'] = (el) => {
  const d = pDeliverables().find((x) => x.id === el.dataset.id);
  if (!confirm(`Approve “${d.title}”? ${studioName()} will be notified that it’s final.`)) return;
  d.status = 'approved'; Store.save(); App.render(); toast(`${d.title} approved`);
};
Actions['p-revision'] = (el) => {
  const d = pDeliverables().find((x) => x.id === el.dataset.id);
  const extra = d.revUsed >= d.revTotal;
  openForm({
    title: 'Request changes', submit: extra ? `Request paid revision (₹${money(S().settings.overCharge)})` : 'Send request',
    fields: [{ name: 'text', label: extra ? `What should change? This is an extra revision and costs ₹${money(S().settings.overCharge)}.` : `What should change? (${d.revTotal - d.revUsed} of ${d.revTotal} revisions left)`, type: 'textarea', full: true, required: true, placeholder: 'e.g. Shorten the intro and use the lo-fi track' }],
    onSubmit(v) {
      addComment(d, { text: v.text.trim(), kind: 'revision' });
      d.revUsed += 1; d.status = 'revision';
      if (extra) d.extraRevisions = (d.extraRevisions || 0) + 1;
      Store.save(); App.render(); toast(extra ? 'Paid revision requested' : 'Change request sent');
    },
  });
};

/* ---------- Files ---------- */
PORTAL_VIEWS.files = () => {
  const files = pFiles().slice().sort((a, b) => b.at.localeCompare(a.at));
  const row = (f) => `<div class="p-file"><span class="p-file-ic">${icon(/\.(mp4|mov)$/i.test(f.name) ? 'video' : /\.(png|jpe?g|gif|webp)$/i.test(f.name) ? 'imageFrame' : 'fileTab', 20)}</span>
    <span class="p-file-main"><b>${esc(f.name)}</b><small>${fileSize(f.size)} · ${f.by === 'client' ? 'Shared by you' : `Shared by ${esc(studioName())}`} · ${msgTime(f.at)}</small></span>
    <button class="act" data-action="p-file-dl" data-id="${f.id}" aria-label="Download ${esc(f.name)}">${icon('download', 20)}</button>
    ${f.by === 'client' ? `<button class="act" data-action="p-file-rm" data-id="${f.id}" aria-label="Remove ${esc(f.name)}">${icon('trash', 18)}</button>` : '<span class="act-gap"></span>'}</div>`;
  return { html: `<div class="page-head"><h1 class="page-title">Files</h1></div>
    <p class="p-lead">Share briefs, logos, footage and references with ${esc(studioName())}.</p>
    <div class="dropzone p-drop" id="p-drop" tabindex="0" role="button">${icon('upload', 20)}<span><b>Drag and drop files</b> or browse</span><small class="set-note">Files up to 1 MB are kept for download in this offline version; larger ones are listed by name.</small></div>
    <section class="card p-files">${files.map(row).join('') || '<p class="set-note" style="padding:8px 4px">No files shared yet.</p>'}</section>`,
  mount() {
    wireDropzone($('#p-drop'), (list) => {
      let pending = list.length;
      list.forEach((file) => {
        const rec = { id: uid('f'), clientId: portalClientId(), name: file.name, size: file.size, by: 'client', at: new Date().toISOString() };
        const done = () => { (S().portalFiles = S().portalFiles || []).push(rec); if (--pending === 0) { Store.save(); App.render(); toast(`${list.length} file${list.length > 1 ? 's' : ''} shared with ${studioName()}`); } };
        if (file.size <= 1e6) { const r = new FileReader(); r.onload = () => { rec.data = r.result; done(); }; r.onerror = done; r.readAsDataURL(file); } else done();
      });
    });
  } };
};
Actions['p-file-dl'] = (el) => {
  const f = pFiles().find((x) => x.id === el.dataset.id);
  if (!f.data) { toast('This is a sample file name only; there is no content to download in the demo.'); return; }
  const a = document.createElement('a'); a.href = f.data; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
};
Actions['p-file-rm'] = (el) => {
  const f = pFiles().find((x) => x.id === el.dataset.id);
  if (!confirm(`Remove ${f.name}?`)) return;
  S().portalFiles = S().portalFiles.filter((x) => x.id !== f.id); Store.save(); App.render(); toast('File removed');
};

/* ---------- Invoices ---------- */
PORTAL_VIEWS.invoices = () => {
  const all = pInvoices();
  const total = all.reduce((n, r) => n + r.amount, 0), paid = all.filter((r) => r.status === 'paid').reduce((n, r) => n + r.amount, 0);
  const tabs = [['all', 'All'], ['due', 'To pay'], ['paid', 'Paid']];
  const rows = all.filter((r) => PT.invTab === 'all' || (PT.invTab === 'paid' ? r.status === 'paid' : r.status !== 'paid'));
  return { html: `<div class="page-head"><h1 class="page-title">Invoices</h1></div>
    <div class="stats cols-3">
      ${statCard('TOTAL BILLED', 'banknote', rupee(money(total)))}
      ${statCard('PAID', 'cardCheck', rupee(money(paid), 'c-green2'))}
      ${statCard('TO PAY', 'wallet', rupee(money(total - paid), total - paid ? 'c-red2' : ''))}
    </div>
    <div class="toolbar inline" style="margin-top:12px;padding:0 15px;gap:19px">${tabs.map(([k, l]) => `<button class="tab ${PT.invTab === k ? 'active' : ''}" data-action="p-inv-tab" data-k="${k}">${l} (${k === 'all' ? all.length : all.filter((r) => (k === 'paid' ? r.status === 'paid' : r.status !== 'paid')).length})</button>`).join('')}</div>
    ${all.length ? `<div class="rtable-card"><div class="tbl-scroll"><div class="rtable p-inv">
      <div class="thead"><span>INVOICE #</span><span>DESCRIPTION</span><span>AMOUNT</span><span>DUE DATE</span><span>STATUS</span><span>ACTION</span></div>
      ${rows.map((r) => `<div class="trow"><span>${r.no}</span><span>${esc(r.desc)}</span><span class="amt">${RS} ${money(r.amount)}/-</span><span>${r.dueLabel}</span>
        <span class="status"><span class="dot ${r.status === 'paid' ? 'green' : 'red'}"></span>${r.status === 'paid' ? `Paid${r.method ? ` · ${r.method}` : ''}` : cap(r.status)}</span>
        <span class="actions">${r.status === 'paid' ? '' : `<button class="btn btn-primary btn-sm" data-action="p-pay" data-id="${r.id}">Pay</button>`}
          <span class="slot"><button class="act" data-action="p-inv-dl" data-id="${r.id}" aria-label="Download ${r.no}">${icon('download', 22)}</button></span></span></div>`).join('') || '<div class="empty-row">Nothing here.</div>'}
    </div></div></div>` : emptyState('billing', 'No invoices yet', `Invoices from ${esc(studioName())} will appear here.`, null)}` };
};
Actions['p-inv-tab'] = (el) => { PT.invTab = el.dataset.k; App.render(); };
Actions['p-inv-dl'] = (el) => {
  const r = pInvoices().find((x) => x.id === el.dataset.id);
  downloadFile(`${r.no.replace(/\s/g, '')}.txt`, invoiceText({ no: r.no, client: portalClient().title, desc: r.desc, amount: r.amount, due: r.dueLabel, status: r.status }), 'text/plain');
};
Actions['p-pay'] = (el) => {
  const r = pInvoices().find((x) => x.id === el.dataset.id);
  openDrawer(`<form id="pay-form" style="display:contents"><div class="drawer-body">
      <h2>Pay ${esc(r.no)}</h2>
      <div class="p-pay-sum"><span>${esc(r.desc)}</span><b>₹${money(r.amount)}</b><small>Due ${esc(r.dueLabel)} · to ${esc(studioName())}</small></div>
      <h3>Payment method</h3>
      <div class="p-methods">${['UPI', 'Card', 'Bank transfer'].map((m, i) => `<label class="p-method"><input type="radio" name="method" value="${m}" ${i === 0 ? 'checked' : ''} /><span>${icon(m === 'UPI' ? 'send' : m === 'Card' ? 'cardCheck' : 'building', 20)}${m}</span></label>`).join('')}</div>
      <p class="p-note">${icon('info', 14)}Demo checkout: no money is moved. The invoice is marked as paid on both sides.</p>
    </div>
    <div class="drawer-foot"><button type="button" class="btn cancel" data-action="close-drawer">Cancel</button>
      <button type="submit" class="btn btn-primary">Pay ₹${money(r.amount)} ${icon('arrowRight', 18)}</button></div></form>`, (drawer) => {
    $('#pay-form', drawer).addEventListener('submit', (e) => {
      e.preventDefault();
      const method = new FormData(e.target).get('method');
      const rec = r.src === 'pay' ? S().payments.find((p) => p.id === r.id) : S().invoices.find((p) => p.id === r.id);
      rec.status = r.src === 'pay' ? 'paid' : 'received'; rec.method = method;
      const conv = ensureConvo();
      conv.msgs.push({ me: false, t: `Paid ${r.no} (₹${money(r.amount)}) via ${method}.`, at: new Date().toISOString() }); conv.unread = (conv.unread || 0) + 1;
      Store.save(); closeDrawer(); App.render(); toast(`Payment of ₹${money(r.amount)} recorded`);
    });
  });
};

/* ---------- Meetings ---------- */
PORTAL_VIEWS.meetings = () => {
  const m = pMeetings();
  return { html: `<div class="page-head"><h1 class="page-title">Meetings</h1>
      <button class="btn btn-primary" data-action="p-request-meeting">${icon('plus', 22, '', 1.6)}Request a meeting</button></div>
    <div class="meet-head" style="margin-left:0"><h3>Upcoming</h3></div>
    ${m.upcoming.map((u) => `<div class="mcard" style="margin-left:0"><div><span class="mbadge">${esc(u.platform)}</span>${u.requested ? ' ' + pill('Awaiting confirmation', 'amber') : ''}
      <h3 class="mtitle">${esc(u.title)}</h3><div class="mdate">${icon('calendar', 16)}${esc(u.when)}</div></div>
      ${u.requested ? '' : `<button class="btn btn-primary btn-sm" data-action="join-meeting" data-id="${u.id}">${icon('video', 16)}Join ${esc(u.platform)}</button>`}</div>`).join('')
      || '<div class="mcard mcard-empty" style="margin-left:0"><div><b>No upcoming meetings</b><span class="ddate">Request one and your creator will confirm a time.</span></div></div>'}
    <div class="meet-head" style="margin:24px 0 0"><h3>Past meetings &amp; notes</h3></div>
    <div class="past-card" style="margin-left:0">${m.past.map((p) => `<div class="past-item"><div><div class="mdate">${icon('calendar', 16)}${esc(p.date)}</div><h4>${esc(p.title)}</h4></div>
      <button class="btn btn-primary btn-sm" data-action="view-notes" data-id="${p.id}">${icon('notes', 14)}View Notes</button></div>`).join('') || '<span class="ddate">No past meetings yet.</span>'}</div>` };
};
Actions['p-request-meeting'] = () => openForm({
  title: 'Request a meeting', submit: 'Send request',
  fields: [
    { name: 'title', label: 'What’s it about?', required: true, full: true, placeholder: 'e.g. Feedback on Reel 03' },
    { name: 'date', label: 'Preferred date', type: 'date', value: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10) },
    { name: 'time', label: 'Preferred time', type: 'time', value: '16:00' },
    { name: 'platform', label: 'Platform', type: 'select', options: ['Google Meet', 'Zoom', 'Phone call'], value: 'Google Meet', full: true },
  ],
  onSubmit(v) {
    const d = parseISO(v.date || new Date().toISOString().slice(0, 10));
    const [h, mi] = (v.time || '16:00').split(':').map(Number);
    const when = `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' })} - ${((h + 11) % 12) + 1}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    S().meetings.upcoming.push({ id: uid('m'), platform: v.platform, title: v.title.trim(), when, startsIn: 'Requested by client', attendees: portalClient().title, link: 'https://meet.google.com/', clientId: portalClientId(), requested: true });
    const conv = ensureConvo();
    conv.msgs.push({ me: false, t: `Meeting request: “${v.title.trim()}” on ${when} (${v.platform}).`, at: new Date().toISOString() }); conv.unread = (conv.unread || 0) + 1;
    Store.save(); App.render(); toast('Meeting request sent');
  },
});

/* ---------- Messages ---------- */
function ensureConvo() {
  let c = pConvo();
  if (!c) {
    const cl = portalClient();
    c = { id: cl.id, name: cl.title, avatar: cl.logo, sub: `Client · ${cl.type}`, link: `#/clients/${cl.id}/projects`, unread: 0, clientUnread: 0, msgs: [] };
    S().conversations.push(c);
  }
  return c;
}
PORTAL_VIEWS.messages = () => {
  const c = pConvo();
  if (c && c.clientUnread) { c.clientUnread = 0; Store.save(); }
  // In the portal, the client's own messages (me:false in the creator's inbox) sit on the right.
  const body = c ? threadBodyHtml({ msgs: c.msgs.map((m) => ({ ...m, me: !m.me })) }) : '<div class="thread-empty">Say hello 👋 Your messages go straight to the team.</div>';
  return { html: `<div class="page-head"><h1 class="page-title">Messages</h1></div>
    <div class="chat single">
      <section class="thread">
        <header class="thread-head"><span class="p-studio-av">${icon('studio', 20)}</span>
          <div><b>${esc(studioName())}</b><small>Your creative team · usually replies within a few hours</small></div></header>
        <div class="thread-body" id="thread-body">${body}</div>
        <form class="composer" id="p-composer">
          <button type="button" class="comp-btn" data-action="p-msg-attach" aria-label="Attach file">${icon('paperclip', 20)}</button>
          <input id="msg-input" autocomplete="off" placeholder="Message ${esc(studioName())}..." aria-label="Message" />
          <button type="submit" class="btn btn-primary comp-send" aria-label="Send">${icon('send', 18)}</button>
          <input type="file" id="p-msg-file" hidden multiple />
        </form>
      </section>
    </div>`,
  mount() {
    const b = $('#thread-body'); b.scrollTop = b.scrollHeight;
    const send = (msg) => {
      const conv = ensureConvo();
      conv.msgs.push({ me: false, at: new Date().toISOString(), ...msg }); conv.unread = (conv.unread || 0) + 1;
      Store.save(); App.render(); $('#msg-input') && $('#msg-input').focus();
    };
    $('#p-composer').addEventListener('submit', (e) => { e.preventDefault(); const t = $('#msg-input').value.trim(); if (t) send({ t }); });
    $('#p-msg-file').addEventListener('change', (e) => {
      [...e.target.files].forEach((f) => {
        (S().portalFiles = S().portalFiles || []).push({ id: uid('f'), clientId: portalClientId(), name: f.name, size: f.size, by: 'client', at: new Date().toISOString() });
        send({ t: f.name, file: f.name });
      });
    });
    if (window.innerWidth > 860) $('#msg-input').focus();
  } };
};
Actions['p-msg-attach'] = () => $('#p-msg-file').click();

/* ---------- Settings ---------- */
PORTAL_VIEWS.settings = () => {
  const sess = S().session || {}, n = pNotify(), c = portalClient();
  return { html: `<form id="p-settings" novalidate>
    <div class="page-head"><h1 class="page-title">Settings</h1><button type="submit" class="btn btn-primary">${icon('check', 20)}Save Changes</button></div>
    <div class="settings-grid">
      <section class="card set-card"><h2 class="card-title">Your profile</h2>
        <div class="fgrid">
          <div class="field"><label for="ps-name">Full Name</label><input id="ps-name" class="input filled" name="name" value="${esc(UI.portalPreview ? c.title : sess.name || '')}" /></div>
          <div class="field"><label for="ps-email">Email Address</label><input id="ps-email" class="input filled" type="email" name="email" value="${esc(UI.portalPreview ? c.email || '' : sess.email || '')}" /></div>
          <div class="field full"><label>Company</label><input class="input" value="${esc(c.title)}" disabled /></div>
        </div></section>
      <section class="card set-card"><h2 class="card-title">Notifications</h2>
        <div class="toggles">
          ${toggleRow('deliverables', 'New deliverables', 'When a cut is ready for your review', n.deliverables)}
          ${toggleRow('invoices', 'Invoices', 'New and overdue invoices', n.invoices)}
          ${toggleRow('meetings', 'Meetings', 'Upcoming calls with your creator', n.meetings)}
          ${toggleRow('messages', 'Messages', 'Replies from your creative team', n.messages)}
        </div></section>
      <section class="card set-card"><h2 class="card-title">Your portal</h2>
        <p class="set-note">You’re connected to <b>${esc(studioName())}</b> with team code <b>${codeFor(c)}</b>.</p>
        <div class="set-actions"><button type="button" class="btn btn-danger-soft wide" data-action="logout">Log out</button></div></section>
    </div></form>`,
  mount() {
    $('#p-settings').addEventListener('submit', (e) => {
      e.preventDefault();
      if (UI.portalPreview) { toast('Preview mode: client settings can’t be changed'); return; }
      const v = Object.fromEntries(new FormData(e.target).entries());
      if (!v.name.trim()) { toast('Name can’t be empty'); return; }
      if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) { toast('Enter a valid email address'); return; }
      const sess = S().session, acc = sess.email && findAccount(sess.email);
      const email = v.email.trim().toLowerCase();
      if (acc && email !== sess.email && findAccount(email)) { toast('Another account already uses that email'); return; }
      if (acc) acc.email = email;
      Object.assign(sess, { name: v.name.trim(), email, portalNotify: { deliverables: !!v.deliverables, invoices: !!v.invoices, meetings: !!v.meetings, messages: !!v.messages } });
      S().user.first = sess.name.split(/\s+/)[0];
      syncAccount(); App.render(); toast('Settings saved');
    });
  } };
};

/* ---------- Entry points from the creator side ---------- */
Actions['client-portal'] = (el) => { UI.portalPreview = el.dataset.id; location.hash = '#/portal'; };
Actions['client-demo-login'] = () => {
  if (!S().clients.some((c) => c.id === SAMPLE_OWNER)) switchWorkspace('sample');
  startSession({ name: 'Riya Kapoor', email: 'riya@jdcafe.in', onboarded: true, demo: true, accountType: 'client', clientId: SAMPLE_OWNER });
  toast('You’re exploring the client portal as JD’S Cafe');
  location.hash = '#/portal';
};
