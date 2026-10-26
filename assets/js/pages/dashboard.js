/* Dashboard */
const prefs = () => S().dashPrefs;

const STAT_DEFS = {
  revenue: ['TOTAL REVENUE', 'wallet', 'revenue', 'c-green2'],
  received: ['RECEIVED', 'cardCheck', 'received', 'c-primary'],
  expenses: ['EXPENSES', 'banknote', 'expenses', 'c-red2'],
  balance: ['MONEY IN ACCOUNT', 'calendar', 'balance', 'c-yellow'],
};
const SECTION_LABELS = { stats: 'Summary cards', attention: 'Needs Your Attention', revenue: 'Revenue Trend', deadlines: 'Upcoming Deadlines', overview: 'Revenue Overview' };
const SERIES = [['earned', 'Revenue Earned', '#A29CCC'], ['received', 'Payments Received', '#55B89B'], ['payouts', 'Team Payouts', '#E39A87']];
const RANGE_OPTS = [[3, 'Last 3 Months'], [6, 'Last 6 Months'], [12, 'Last 12 Months']];

/* First-time setup checklist (shown in a fresh workspace). */
const SETUP_STEPS = [
  ['Add your first client', 'Keep contacts, retainers and projects together.', () => S().clients.length > 0, 'new-client', 'clients'],
  ['Create a project', 'Set budget, deadline and included revisions.', () => S().projects.length > 0, 'create-project', 'folderOpen'],
  ['Add a team member', 'Assign editors and track their payouts.', () => S().team.length > 0, 'assign-member', 'idCard'],
  ['Send your first invoice', 'Bill clients and follow up on payments.', () => S().invoices.some((r) => r.kind === 'invoice'), 'create-invoice', 'billing'],
  ['Schedule a meeting', 'Plan reviews and kick-offs with clients.', () => S().meetings.upcoming.length > 0, 'schedule-meeting', 'video'],
];
function gettingStartedHtml() {
  if (!isFresh() || S().setupHidden) return '';
  const done = SETUP_STEPS.filter((s) => s[2]()).length;
  const all = done === SETUP_STEPS.length;
  return `<section class="card setup">
    <div class="setup-head">
      <div><h2 class="card-title">${all ? 'You’re all set up! 🎉' : `Welcome to MODUS, ${esc(S().user.first)}!`}</h2>
        <p>${all ? 'Your workspace is ready. You can hide this guide now.' : 'Your workspace is empty. Here’s how to get it running in a few minutes.'}</p></div>
      <div class="setup-progress"><span>${done} of ${SETUP_STEPS.length} done</span><div class="bar"><i style="width:${(done / SETUP_STEPS.length) * 100}%"></i></div></div>
      <button class="ai-x" data-action="hide-setup" aria-label="Hide getting started guide" title="Hide guide">${icon('close', 18)}</button>
    </div>
    <ol class="setup-list">${SETUP_STEPS.map(([t, d, isDone, act, ic], i) => `
      <li class="${isDone() ? 'done' : ''}">
        <span class="setup-num">${isDone() ? icon('check', 16, '', 2) : i + 1}</span>
        <span class="setup-text"><b>${t}</b><small>${d}</small></span>
        ${isDone() ? '<span class="setup-ok">Done</span>' : `<button class="btn btn-soft text-primary btn-sm" data-action="${act}">${icon(ic, 16)}${t.split(' ')[0]}</button>`}
      </li>`).join('')}</ol>
  </section>`;
}
Actions['hide-setup'] = () => { S().setupHidden = true; Store.save(); App.render(); toast('Guide hidden. Bring it back from Customize.'); };

const SECTIONS = {
  stats() {
    const st = liveDashStats(), on = Object.keys(STAT_DEFS).filter((k) => prefs().cards[k]);
    if (!on.length) return '';
    return `<div class="stats dyn" style="--cols:${on.length}">${on.map((k) => {
      const [t, ic, f, c] = STAT_DEFS[k]; return statCard(t, ic, rupee(money(st[f]), c));
    }).join('')}</div>`;
  },
  attention() {
    const att = notifications().map((a) => `
      <div class="att-item">
        <span class="dot ${a.dot}"></span>
        <img src="${src(a.logo)}" alt="" />
        <div class="att-text"><b>${esc(a.title)}</b><small>${esc(a.sub[0])} <i></i> ${esc(a.sub[1])}</small></div>
        <span class="att-meta">${icon(a.meta.icon, 15)}${esc(a.meta.text)}</span>
        <button class="att-btn" data-action="att-go" data-id="${a.id}">${a.action}</button>
        <button class="kebab" data-action="att-menu" data-id="${a.id}" aria-label="More options">${icon('more', 20)}</button>
      </div>`).join('') || '<div class="empty-row">Nothing needs your attention right now.</div>';
    return `<section class="card attention"><h2 class="card-title">Needs Your Attention</h2><div class="att-list">${att}</div></section>`;
  },
  revenue() {
    const p = prefs();
    return `<section class="card revenue">
      <div class="rev-head"><h2 class="card-title">Revenue Trend</h2>
        <select class="select-sm" data-change="dash-months" aria-label="Range">
          ${RANGE_OPTS.map(([v, l]) => `<option value="${v}" ${p.months === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select></div>
      <div class="legend">${SERIES.map(([k, l, c]) => `<button class="legend-item ${p.series[k] ? '' : 'off'}" data-action="toggle-series" data-k="${k}" aria-pressed="${p.series[k]}"><i style="background:${c}"></i>${l}</button>`).join('')}</div>
      ${revenueIsEmpty() ? `<div class="chart-empty">${icon('billing', 26)}<b>No revenue yet</b><span>Your earnings, payments and payouts will chart here once you start invoicing.</span>
        <button class="btn btn-soft text-primary btn-sm" data-action="create-invoice">${icon('plus', 16, '', 1.6)}Create invoice</button></div>` : '<div class="chart-wrap" id="rev-chart"></div>'}
    </section>`;
  },
  deadlines() {
    const list = [...S().projects].sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
    const dot = { new: 'purple', progress: 'red', review: 'green' };
    return `<section class="card widget">
      <div class="rev-head"><h2 class="card-title">Upcoming Deadlines</h2><a class="link-sm" href="#/projects">View all ${icon('arrowRight', 14)}</a></div>
      <div class="dl-list">${list.map((p) => {
        const n = daysFromToday(p.due);
        return `<a class="dl-item" href="#/projects/${p.id}/deliverable">
          <span class="dot ${dot[p.status]}"></span>
          <img src="${src(p.logo)}" alt="" />
          <span class="dl-text"><b>${esc(p.title)}</b><small>${esc(p.client)} · ${STATUS_LABEL[p.status]}</small></span>
          <span class="dl-due ${n < 0 ? 'late' : n <= 3 ? 'soon' : ''}">${icon('calendar', 14)}${fmtDay(p.due)} <em>${relDay(n)}</em></span>
        </a>`;
      }).join('') || '<div class="empty-row">No deadlines.</div>'}</div>
    </section>`;
  },
  overview() {
    const R = liveRevenue(), n = RANGE_POINTS[prefs().months];
    const sum = (a) => a.slice(-n).reduce((x, y) => x + y, 0);
    const earned = sum(R.earned), received = sum(R.received), payouts = sum(R.payouts);
    const rate = earned ? Math.round((received / earned) * 100) : 0;
    const label = RANGE_OPTS.find(([v]) => v === prefs().months)[1];
    const tile = (l, v, c) => `<div class="ov-tile"><small>${l}</small><b class="${c}">₹${money(v)}</b></div>`;
    return `<section class="card widget">
      <div class="rev-head"><h2 class="card-title">Revenue Overview</h2><span class="ov-range">${label}</span></div>
      <div class="ov-grid">
        ${tile('Revenue earned', earned, 'c-primary')}${tile('Payments received', received, 'c-green2')}
        ${tile('Team payouts', payouts, 'c-red2')}${tile('Net (received − payouts)', received - payouts, '')}
      </div>
      <div class="ov-rate"><span>Collection rate</span><b>${rate}%</b></div>
      <div class="bar ov-bar"><i style="width:${rate}%"></i></div>
      <small class="ov-note">₹${money(Math.max(0, earned - received))} earned but not yet collected</small>
    </section>`;
  },
};

Pages.dashboard = () => {
  const s = S(), p = prefs();
  const now = new Date();
  const hr = now.getHours();
  const greet = hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateLabel = `${now.toLocaleDateString('en-GB', { weekday: 'short' })}, ${now.getDate()} ${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}`;
  const body = p.order.filter((k) => p.show[k] && SECTIONS[k]).map((k) => SECTIONS[k]()).join('')
    || '<div class="empty-row" style="background:#fff;border-radius:6px;margin-top:24px">All sections are hidden. Use <b>Customize</b> to add some back.</div>';
  const html = `
    <div class="dash-head">
      <div>${p.greeting ? `<h1>${greet}, ${esc(s.user.first)}</h1><p>${isFresh() ? 'Let’s set up your workspace.' : 'Here’s what needs your attention today.'}</p>` : ''}</div>
      <div class="dash-date">${p.greeting ? `<span>${dateLabel}</span>` : ''}
        ${isFresh() ? `<button class="btn btn-white bordered" data-action="ws-sample">${icon('refresh', 18)}Back to sample data</button>`
                    : `<button class="btn btn-white bordered" data-action="ws-fresh" title="See the app exactly as a first-time user does">${icon('sparkle', 18, '', 1.6)}Preview as new user</button>`}
        <button class="btn btn-soft text-primary" data-action="dash-customize">${icon('filterLines', 16)}Customize</button></div>
    </div>
    <div class="dash-body">${gettingStartedHtml()}${body}</div>`;
  return { html: shell('dashboard', html, { topSearch: true }), mount: mountDashboard };
};

function mountDashboard() {
  const host = $('#rev-chart');
  if (host) renderChart(host);
  const gs = $('#global-search');
  if (gs) gs.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const raw = gs.value.trim(), q = raw.toLowerCase();
    if (!q) return;
    // Questions go straight to the assistant.
    if (/\?$|^(what|how|which|who|when|show|list|create|new|any|is|are|do|can)\b/.test(q)) { gs.value = ''; openAssistant(raw); return; }
    const p = S().projects.find((x) => x.title.toLowerCase().includes(q) || x.client.toLowerCase().includes(q));
    const c = S().clients.find((x) => x.name.toLowerCase().includes(q));
    const inv = S().invoices.find((x) => x.no.toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, '')));
    if (p) location.hash = `#/projects/${p.id}/deliverable`;
    else if (c) location.hash = `#/clients/${c.id}/projects`;
    else if (inv) { UI.billing = { ...(UI.billing || {}), q: inv.no, page: 1 }; location.hash = '#/billing'; }
    else { gs.value = ''; openAssistant(raw); }
  });
}

/* Count of data points shown per range option (design shows May–Sep for "Last 6 Months"). */
const RANGE_POINTS = { 3: 3, 6: 5, 12: 12 };
const MONTH_FULL = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };

const revenueIsEmpty = () => { const R = liveRevenue(); return ![...R.earned, ...R.received, ...R.payouts].some((v) => v > 0); };
/* Round the axis maximum up to a tidy value (₹2,45,000 -> ₹2,50,000). */
function niceMax(v) {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= v);
}

function renderChart(host) {
  const R = liveRevenue(), show = prefs().series, n = RANGE_POINTS[prefs().months];
  const months = R.months.slice(-n), earned = R.earned.slice(-n), received = R.received.slice(-n), payouts = R.payouts.slice(-n);
  const years = R.years ? R.years.slice(-n) : months.map(() => R.year);
  const W = 1055, H = 262, X0 = 63, X1 = W, Y0 = 228, YT = 20;
  const MAX = niceMax(Math.max(...earned, ...received, ...payouts));
  const first = X0 + 15, last = X1 - 109;
  const xs = months.map((_, i) => (n === 1 ? first : first + (i * (last - first)) / (n - 1)));
  const y = (v) => Y0 - (v / MAX) * (Y0 - YT);
  const pts = (arr) => [[X0, y(arr[0])], ...arr.map((v, i) => [xs[i], y(v)]), [X1, y(arr[arr.length - 1] * 0.985)]];
  const smooth = (p) => {
    let d = `M${p[0][0]},${p[0][1]}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const area = (p) => `${smooth(p)} L${X1},${Y0} L${X0},${Y0} Z`;
  const ticks = [1, 0.8, 0.6, 0.4, 0.2, 0].map((f) => Math.round(MAX * f));
  const grid = ticks.map((t) => `<text x="8" y="${y(t) + 4}" font-size="10" fill="#9A9A9A">₹${t ? money(t) : 0}</text>
    <line x1="${X0}" x2="${X1}" y1="${y(t)}" y2="${y(t)}" stroke="#E6E6E6" stroke-dasharray="4 4"/>`).join('');
  const labels = months.map((m, i) => `<text class="xl" data-i="${i}" x="${xs[i]}" y="${H - 8}" font-size="12" fill="#8A8A8A" text-anchor="middle">${m}</text>`).join('');
  const data = { earned, received, payouts };
  const ids = { earned: 'gE', received: 'gR', payouts: 'gP' };
  const series = SERIES.filter(([k]) => show[k]);
  // Hover marker sits on Team Payouts (as designed), else on the lowest visible line.
  const markerKey = show.payouts ? 'payouts' : series.length ? series[series.length - 1][0] : null;

  host.innerHTML = `
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenue trend chart">
    <defs>
      <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A29CCC" stop-opacity=".32"/><stop offset="1" stop-color="#A29CCC" stop-opacity=".02"/></linearGradient>
      <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55B89B" stop-opacity=".28"/><stop offset="1" stop-color="#55B89B" stop-opacity=".02"/></linearGradient>
      <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E39A87" stop-opacity=".22"/><stop offset="1" stop-color="#E39A87" stop-opacity="0"/></linearGradient>
    </defs>
    ${grid}
    ${series.map(([k]) => `<path d="${area(pts(data[k]))}" fill="url(#${ids[k]})"/>`).join('')}
    ${series.map(([k, , c]) => `<path d="${smooth(pts(data[k]))}" fill="none" stroke="${c}" stroke-width="2.5"/>`).join('')}
    <line id="hover-line" x1="0" x2="0" y1="${YT}" y2="${Y0}" stroke="#8A7FD8" stroke-dasharray="3 3"/>
    ${markerKey ? '<circle id="hover-dot" r="6" fill="#C70706" stroke="#fff" stroke-width="1.5"/>' : ''}
    ${labels}
    <rect id="hit" x="${X0}" y="0" width="${X1 - X0}" height="${H}" fill="transparent"/>
  </svg>
  <div class="chart-tip" id="chart-tip"></div>`;

  const svg = $('svg', host), tip = $('#chart-tip'), line = $('#hover-line'), dot = $('#hover-dot');
  const rows = { earned: ['Revenue', ''], received: ['Received', 'mono'], payouts: ['Payouts', 'mono'] };
  const show_ = (i) => {
    line.setAttribute('x1', xs[i]); line.setAttribute('x2', xs[i]);
    if (dot) { dot.setAttribute('cx', xs[i]); dot.setAttribute('cy', y(data[markerKey][i])); }
    $$('.xl', svg).forEach((t) => { t.setAttribute('font-weight', +t.dataset.i === i ? '600' : '400'); t.setAttribute('fill', +t.dataset.i === i ? '#000' : '#8A8A8A'); });
    tip.style.display = series.length ? '' : 'none';
    tip.innerHTML = `<div class="tt-head"><span>${MONTH_FULL[months[i]]} ${years[i]}</span><i></i></div>
      ${series.map(([k, , c]) => `<div class="tt-row"><i style="background:${c}"></i>${rows[k][0]}:<b class="${rows[k][1]}" ${k === 'earned' ? '' : `style="color:${c}"`}>₹${money(data[k][i])}</b></div>`).join('')}`;
    const scale = svg.getBoundingClientRect().width / W;
    const px = xs[i] * scale, hostW = host.clientWidth;
    let left = px - 82; left = Math.max(0, Math.min(left, hostW - 172));
    tip.style.left = left + 'px';
    const topVal = series.length ? Math.max(...series.map(([k]) => data[k][i])) : 0;
    tip.style.top = Math.max(-28, y(topVal) * scale - 64) + 'px';
  };
  const nearest = (clientX) => {
    const r = svg.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * W;
    let best = 0; xs.forEach((x, i) => { if (Math.abs(x - vx) < Math.abs(xs[best] - vx)) best = i; });
    return best;
  };
  svg.addEventListener('mousemove', (e) => show_(nearest(e.clientX)));
  svg.addEventListener('touchstart', (e) => show_(nearest(e.touches[0].clientX)), { passive: true });
  show_(n - 1);
}

const savePrefs = () => { Store.save(); App.render(); };
Changes['dash-months'] = (el) => { prefs().months = +el.value; savePrefs(); };
Actions['toggle-series'] = (el) => { const s = prefs().series; s[el.dataset.k] = !s[el.dataset.k]; savePrefs(); };

/* ---------- Customize drawer ---------- */
function customizeHtml() {
  const p = prefs();
  const sec = p.order.map((k, i) => `
    <div class="cz-row">
      <span class="cz-grip">${icon('grip', 18)}</span>
      <span class="cz-label">${SECTION_LABELS[k]}${k === 'deadlines' || k === 'overview' ? '<em>New</em>' : ''}</span>
      <button type="button" class="cz-move" data-action="cz-move" data-k="${k}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move ${SECTION_LABELS[k]} up">${icon('chevronUp', 18)}</button>
      <button type="button" class="cz-move" data-action="cz-move" data-k="${k}" data-d="1" ${i === p.order.length - 1 ? 'disabled' : ''} aria-label="Move ${SECTION_LABELS[k]} down">${icon('chevronDown', 18)}</button>
      <input type="checkbox" class="switch" data-cz="show" data-k="${k}" ${p.show[k] ? 'checked' : ''} aria-label="Show ${SECTION_LABELS[k]}" />
    </div>`).join('');
  const sw = (group, k, label) => `<label class="toggle-row"><span><b>${label}</b></span><input type="checkbox" class="switch" data-cz="${group}" data-k="${k}" ${p[group][k] ? 'checked' : ''} /></label>`;
  return `<div class="drawer-body">
    <h2>Customize Dashboard</h2>
    <p class="set-note">Changes apply instantly and are saved in this browser.</p>
    <h3>Sections</h3><p class="cz-hint">Show, hide and reorder what appears on your dashboard.</p>
    <div class="cz-list">${sec}</div>
    <h3>Summary cards</h3>
    <div class="toggles">${Object.keys(STAT_DEFS).map((k) => sw('cards', k, STAT_DEFS[k][0].charAt(0) + STAT_DEFS[k][0].slice(1).toLowerCase())).join('')}</div>
    <h3>Revenue Trend lines</h3>
    <div class="toggles">${SERIES.map(([k, l]) => sw('series', k, l)).join('')}</div>
    <h3>Display</h3>
    <div class="toggles">
      <label class="toggle-row"><span><b>Greeting &amp; date</b></span><input type="checkbox" class="switch" data-cz="greeting" ${p.greeting ? 'checked' : ''} /></label>
      ${isFresh() ? `<label class="toggle-row"><span><b>Getting started guide</b><small>Setup checklist for your new workspace</small></span><input type="checkbox" class="switch" data-cz="setup" ${S().setupHidden ? '' : 'checked'} /></label>` : ''}
      <label class="toggle-row"><span><b>Default chart range</b></span>
        <select class="select-sm" data-cz="months">${RANGE_OPTS.map(([v, l]) => `<option value="${v}" ${p.months === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </div>
  </div>
  <div class="drawer-foot">
    <button type="button" class="btn cancel" data-action="cz-reset" style="width:auto;padding:0 16px">Reset to default</button>
    <button type="button" class="btn btn-primary" data-action="close-drawer">Done ${icon('check', 18)}</button>
  </div>`;
}
function refreshCustomize() {
  const d = $('.drawer'); if (!d) return;
  const top = d.scrollTop; d.innerHTML = customizeHtml(); d.scrollTop = top;
}
Actions['dash-customize'] = () => {
  openDrawer(customizeHtml(), (drawer) => {
    drawer.addEventListener('change', (e) => {
      const el = e.target, g = el.dataset.cz; if (!g) return;
      const p = prefs();
      if (g === 'greeting') p.greeting = el.checked;
      else if (g === 'setup') S().setupHidden = !el.checked;
      else if (g === 'months') p.months = +el.value;
      else p[g][el.dataset.k] = el.checked;
      savePrefs();
    });
  });
};
Actions['cz-move'] = (el) => {
  const o = prefs().order, i = o.indexOf(el.dataset.k), j = i + +el.dataset.d;
  if (j < 0 || j >= o.length) return;
  [o[i], o[j]] = [o[j], o[i]];
  savePrefs(); refreshCustomize();
};
Actions['cz-reset'] = () => { S().dashPrefs = clone(SEED.dashPrefs); savePrefs(); refreshCustomize(); toast('Dashboard reset to default'); };

Actions['att-go'] = (el) => {
  const a = attentionItems().find((x) => x.id === el.dataset.id);
  if (!a) return;
  if (a.route) location.hash = a.route;
  else toast(`Reminder sent to ${a.remind}`);
};
Actions['att-menu'] = (el) => {
  const a = attentionItems().find((x) => x.id === el.dataset.id);
  if (!a) return;
  const done = () => {
    if (isFresh()) S().dismissed = [...(S().dismissed || []), a.id];
    else S().attention = S().attention.filter((x) => x.id !== a.id);
    Store.save(); App.render(); toast('Marked as done');
  };
  openListMenu(el, [
    { label: a.route ? 'Open' : 'Open billing', run: () => (location.hash = a.route || '#/billing') },
    { label: 'Mark as done', run: done },
  ]);
};
