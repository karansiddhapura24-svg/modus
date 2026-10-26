/* Ask MODUS — an offline assistant that answers from workspace data.
   It runs entirely in the browser (no AI service / network), matching
   questions to intents and replying with live numbers + quick actions. */
const AI = { open: false, log: [], actions: {}, busy: false };

const AI_SUGGESTIONS = ['What payments are overdue?', 'Upcoming deadlines', 'How is revenue this month?', 'Which team payouts are pending?', 'Create a new project'];

const daysFromToday = (iso) => {
  const t = new Date(); const d0 = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((parseISO(iso) - d0) / 864e5);
};
const relDay = (n) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 1 ? `in ${n} days` : n === -1 ? 'yesterday' : `${-n} days ago`);

/* Each intent: test(q) -> bool, run(q) -> { html, actions: [{label, route?|run?}] } */
const INTENTS = [
  {
    test: (q) => /\b(hi|hello|hey|namaste)\b/.test(q) && q.length < 25,
    run: () => ({ html: `Hi ${esc(S().user.first)}! I can look up payments, deadlines, revenue, team payouts, deliverables and meetings, or start things for you. What do you need?` }),
  },
  {
    test: (q) => /(create|new|add|start).*(project)|(project).*(create|new)/.test(q),
    run: () => ({ html: 'Sure, opening the <b>Create New Project</b> form.', actions: [{ label: 'Open form', run: () => Actions['create-project']({ dataset: {} }) }], auto: 0 }),
  },
  {
    test: (q) => /(create|new|add|raise|make).*(invoice|bill)/.test(q),
    run: () => ({ html: 'Opening the <b>Create Invoice</b> form.', actions: [{ label: 'Open form', run: () => Actions['create-invoice']() }], auto: 0 }),
  },
  {
    test: (q) => /(create|new|add).*(client)/.test(q),
    run: () => ({ html: 'Opening the <b>New Client</b> form.', actions: [{ label: 'Open form', run: () => Actions['new-client']() }], auto: 0 }),
  },
  {
    test: (q) => /(schedule|book|set up|create|new).*(meeting|call)/.test(q),
    run: () => ({ html: 'Opening <b>Schedule Meeting</b>.', actions: [{ label: 'Open form', run: () => Actions['schedule-meeting']() }], auto: 0 }),
  },
  {
    test: (q) => /(overdue|unpaid|outstanding|owe|pending pay|payment.*(pending|due|overdue)|who.*pay|remind)/.test(q),
    run: () => {
      const rows = S().invoices.filter((r) => r.kind === 'invoice' && (r.status === 'overdue' || r.status === 'pending'))
        .sort((a, b) => (a.status === b.status ? a.due.localeCompare(b.due) : a.status === 'overdue' ? -1 : 1));
      if (!rows.length) return { html: 'Good news: no client invoices are pending or overdue. 🎉' };
      const total = rows.reduce((n, r) => n + r.amount, 0);
      const od = rows.filter((r) => r.status === 'overdue');
      return {
        html: `You have <b>${rows.length}</b> unpaid invoice${rows.length > 1 ? 's' : ''} worth <b>₹${money(total)}</b>${od.length ? `, <b class="c-red">${od.length} overdue</b>` : ''}:
          <ul>${rows.slice(0, 5).map((r) => `<li><b>${esc(r.client)}</b> · ${r.no} · ₹${money(r.amount)} · <span class="${r.status === 'overdue' ? 'c-red' : ''}">${cap(r.status)}</span>, due ${r.dueLabel}</li>`).join('')}</ul>`,
        actions: [
          { label: 'Open Billing', route: '#/billing' },
          { label: `Send ${rows.length} reminder${rows.length > 1 ? 's' : ''}`, run: () => toast(`Reminders sent to ${[...new Set(rows.map((r) => r.client))].join(', ')}`) },
        ],
      };
    },
  },
  {
    test: (q) => /(team|payout|freelancer|editor|videographer).*(pay|due|pending|owe)|(pay|payout).*(team|rahul|jay|yash)|payouts?/.test(q),
    run: () => {
      if (!S().team.length) return { html: 'You haven’t added any team members yet.', actions: [{ label: 'Add team member', run: () => Actions['assign-member']() }] };
      const due = S().team.filter((t) => !t.paid);
      if (!due.length) return { html: 'All team payouts are settled.' };
      const total = due.reduce((n, t) => n + t.amount, 0);
      return {
        html: `<b>${due.length}</b> team payout${due.length > 1 ? 's are' : ' is'} pending, totalling <b>₹${money(total)}</b>:
          <ul>${due.map((t) => `<li><b>${esc(t.name)}</b> (${esc(t.role)}) · ₹${money(t.amount)}</li>`).join('')}</ul>`,
        actions: [{ label: 'Open Team payments', route: '#/clients/jd-cafe/team' }],
      };
    },
  },
  {
    test: (q) => /(deadline|due|upcoming|this week|late|behind)/.test(q),
    run: () => {
      const list = [...S().projects].sort((a, b) => a.due.localeCompare(b.due));
      const late = list.filter((p) => daysFromToday(p.due) < 0);
      const next = list.filter((p) => daysFromToday(p.due) >= 0).slice(0, 5);
      return {
        html: `${late.length ? `<b class="c-red">${late.length} project${late.length > 1 ? 's are' : ' is'} past the deadline:</b><ul>${late.map((p) => `<li><b>${esc(p.title)}</b> · ${esc(p.client)} · due ${fmtDay(p.due)} (${relDay(daysFromToday(p.due))})</li>`).join('')}</ul>` : ''}
          ${next.length ? `Coming up next:<ul>${next.map((p) => `<li><b>${esc(p.title)}</b> · ${esc(p.client)} · ${fmtDay(p.due)} (${relDay(daysFromToday(p.due))})</li>`).join('')}</ul>` : 'No upcoming deadlines scheduled.'}`,
        actions: [{ label: 'Open Projects', route: '#/projects' }],
      };
    },
  },
  {
    test: (q) => /(revenue|earn|income|profit|money|balance|cash|expense|financ|how much)/.test(q),
    run: () => {
      const st = liveDashStats(), R = liveRevenue(), i = R.earned.length - 1;
      if (!st.revenue && !R.earned.some((v) => v > 0)) return { html: 'No revenue yet. Once you create invoices, I’ll summarise earnings, collections and payouts here.', actions: [{ label: 'Create invoice', run: () => Actions['create-invoice']() }] };
      const monthLine = R.earned[i]
        ? `In ${MONTH_FULL[R.months[i]]} you earned <b>₹${money(R.earned[i])}</b>${R.earned[i - 1] ? ` (${R.earned[i] >= R.earned[i - 1] ? '+' : ''}${Math.round(((R.earned[i] - R.earned[i - 1]) / R.earned[i - 1]) * 100)}% vs ${R.months[i - 1]})` : ''} and collected <b>${Math.round((R.received[i] / R.earned[i]) * 100)}%</b> of it.`
        : `Nothing has been invoiced for ${MONTH_FULL[R.months[i]]} yet.`;
      return {
        html: `Total revenue is <b>₹${money(st.revenue)}</b>, with <b>₹${money(st.received)}</b> received and <b>₹${money(st.expenses)}</b> in expenses, leaving <b>₹${money(st.balance)}</b> in the account.<br><br>${monthLine}`,
        actions: [{ label: 'Open Dashboard', route: '#/dashboard' }],
      };
    },
  },
  {
    test: (q) => /(feedback|review|approv|revision|deliverable|reel)/.test(q),
    run: () => {
      const ds = S().deliverables, n = (k) => ds.filter((d) => d.status === k).length;
      const out = ds.filter((d) => d.revUsed >= d.revTotal);
      return {
        html: `Deliverables: <b>${n('review')}</b> in review, <b>${n('revision')}</b> in revision, <b>${n('approved')}</b> approved.
          ${out.length ? `<br>⚠️ ${out.map((d) => `<b>${esc(d.title)}</b>`).join(', ')} ${out.length > 1 ? 'have' : 'has'} used every included revision. Extra rounds are billable (₹${money(S().settings.overCharge)} each).` : ''}`,
        actions: [{ label: 'Review deliverables', route: '#/clients/jd-cafe/projects' }],
      };
    },
  },
  {
    test: (q) => /(meeting|call|meet)/.test(q),
    run: () => {
      const u = S().meetings.upcoming[0];
      return u ? { html: `Your next meeting is <b>${esc(u.title)}</b> on ${esc(u.platform)}, ${esc(u.when)}, with ${esc(u.attendees)}.`, actions: [{ label: `Join ${u.platform}`, run: () => window.open(u.link, '_blank', 'noopener') }, { label: 'All meetings', route: '#/meetings' }] }
        : { html: 'You have no upcoming meetings.', actions: [{ label: 'Schedule one', run: () => Actions['schedule-meeting']() }] };
    },
  },
  {
    test: (q) => /(message|chat|inbox|unread)/.test(q),
    run: () => {
      const un = S().conversations.filter((c) => c.unread);
      return { html: un.length ? `You have unread messages from ${un.map((c) => `<b>${esc(c.name)}</b> (${c.unread})`).join(', ')}.` : 'Your inbox is all caught up.', actions: [{ label: 'Open Messages', route: '#/messages' }] };
    },
  },
  {
    test: (q) => /(client)/.test(q),
    run: () => {
      const cs = S().clients.filter((c) => !c.archived);
      const ret = cs.filter((c) => c.type === 'Retainer');
      if (!cs.length) return { html: 'You don’t have any clients yet. Add one to start tracking projects and payments.', actions: [{ label: 'Add client', run: () => Actions['new-client']() }] };
      if (!ret.length) return { html: `You have <b>${cs.length}</b> active client${cs.length > 1 ? 's' : ''}, all one-time.`, actions: [{ label: 'Open Clients', route: '#/clients' }] };
      return { html: `You have <b>${cs.length}</b> active clients: <b>${ret.length}</b> on retainer (${ret.map((c) => esc(c.name)).join(', ')}) and ${cs.length - ret.length} one-time.`, actions: [{ label: 'Open Clients', route: '#/clients' }] };
    },
  },
  {
    test: (q) => /(project|status|progress|board)/.test(q),
    run: () => {
      const ps = S().projects, n = (k) => ps.filter((p) => p.status === k).length;
      if (!ps.length) return { html: 'No projects yet. Want to create your first one?', actions: [{ label: 'Create project', run: () => Actions['create-project']({ dataset: {} }) }] };
      return { html: `There are <b>${ps.length}</b> projects: <b>${n('new')}</b> new, <b>${n('progress')}</b> in progress and <b>${n('review')}</b> in review.`, actions: [{ label: 'Open board', route: '#/projects' }] };
    },
  },
  {
    test: (q) => /(help|what can you|how do i|how to)/.test(q),
    run: () => ({ html: 'I can answer questions about your workspace, like <i>“what’s overdue?”</i>, <i>“upcoming deadlines”</i>, <i>“pending team payouts”</i> or <i>“how is revenue?”</i>. I can also start tasks: <i>“create a project”</i>, <i>“new invoice”</i>, <i>“schedule a meeting”</i>.' }),
  },
];

const projectAnswer = (p) => ({ html: `<b>${esc(p.title)}</b> for ${esc(p.client)} is <b>${STATUS_LABEL[p.status]}</b>, due ${fmtDay(p.due)} (${relDay(daysFromToday(p.due))}). Budget used ₹${money(p.spent)} of ₹${money(p.budget)}; revisions ${p.revUsed}/${p.revTotal}.`, actions: [{ label: 'Open project', route: `#/projects/${p.id}/deliverable` }] });
const clientAnswer = (c) => ({ html: `<b>${esc(c.title)}</b> is a ${c.type.replace(' - ', '-').toLowerCase()} client with ${c.total} project${c.total === 1 ? '' : 's'}. Current: ${esc(c.project)}.`, actions: [{ label: 'Open client', route: `#/clients/${c.id}/projects` }] });
const normName = (s) => s.toLowerCase().replace(/[’']s\b/g, '').replace(/[’']/g, '').trim();

function aiAnswer(raw) {
  const q = raw.toLowerCase(), nq = normName(raw);
  // An exact project/client name wins over keyword intents (unless asking to create something).
  if (!/\b(create|new|add|schedule)\b/.test(q)) {
    const p = S().projects.find((x) => nq.includes(normName(x.title)));
    if (p) return projectAnswer(p);
    const c = S().clients.find((x) => nq.includes(normName(x.name)) || nq.includes(normName(x.title)));
    if (c && !INTENTS.slice(5).some((it) => it.test(q))) return clientAnswer(c);
  }
  const hit = INTENTS.find((it) => it.test(q));
  if (hit) return hit.run(q);
  // Fall back to a partial name search across projects and clients.
  const words = q.split(/\W+/).filter((w) => w.length > 2);
  const p = S().projects.find((x) => words.some((w) => x.title.toLowerCase().includes(w)));
  if (p) return projectAnswer(p);
  const c = S().clients.find((x) => words.some((w) => x.name.toLowerCase().includes(w)));
  if (c) return clientAnswer(c);
  return { html: 'I couldn’t find that in your workspace. Try one of these:', suggest: true };
}

/* ---------- Panel UI ---------- */
function aiBubble(m, idx) {
  if (m.me) return `<div class="ai-msg me">${esc(m.text)}</div>`;
  const acts = (m.actions || []).map((a, i) => { const id = `${idx}-${i}`; AI.actions[id] = a; return `<button class="ai-act" data-action="ai-act" data-id="${id}">${esc(a.label)}</button>`; }).join('');
  const sugg = m.suggest ? `<div class="ai-chips">${AI_SUGGESTIONS.map((s) => `<button class="ai-chip" data-action="ai-ask" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '';
  return `<div class="ai-msg bot"><span class="ai-avatar">${icon('sparkle', 16, '', 1.6)}</span><div class="ai-bubble">${m.html}${acts ? `<div class="ai-acts">${acts}</div>` : ''}${sugg}</div></div>`;
}
function renderAI() {
  const root = $('#ai-root');
  if (!AI.open) { root.innerHTML = ''; return; }
  if (!AI.log.length) AI.log.push({ html: `Hi ${esc(S().user.first)} 👋 I’m MODUS. Ask me about payments, deadlines, revenue, your team or clients, or tell me what to create.`, suggest: true });
  AI.actions = {};
  const body = AI.log.map(aiBubble).join('') + (AI.busy ? '<div class="ai-msg bot"><span class="ai-avatar">' + icon('sparkle', 16, '', 1.6) + '</span><div class="ai-bubble ai-typing"><i></i><i></i><i></i></div></div>' : '');
  const existing = $('.ai-panel', root);
  if (existing) { $('.ai-body', existing).innerHTML = body; }
  else {
    root.innerHTML = `<section class="ai-panel" role="dialog" aria-label="Ask MODUS">
      <header class="ai-head"><span class="ask-ic">${icon('sparkle', 20, '', 1.6)}</span>
        <div><b>Ask MODUS</b><small>Answers from your workspace · works offline</small></div>
        <button class="ai-x" data-action="ai-clear" title="Clear chat" aria-label="Clear chat">${icon('refresh', 18)}</button>
        <button class="ai-x" data-action="close-ai" aria-label="Close">${icon('close', 20)}</button></header>
      <div class="ai-body" aria-live="polite">${body}</div>
      <form class="ai-input" id="ai-form"><input id="ai-q" autocomplete="off" placeholder="Ask anything about your work..." aria-label="Ask MODUS" />
        <button class="ai-send" type="submit" aria-label="Send">${icon('send', 18)}</button></form>
    </section>`;
    $('#ai-form').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#ai-q').value.trim(); if (v) { $('#ai-q').value = ''; askAI(v); } });
    setTimeout(() => $('#ai-q') && $('#ai-q').focus(), 30);
  }
  const b = $('.ai-body', root); b.scrollTop = b.scrollHeight;
}
function askAI(q) {
  if (AI.busy) return;
  AI.log.push({ me: true, text: q });
  AI.busy = true; renderAI();
  setTimeout(() => {
    AI.busy = false;
    const a = aiAnswer(q);
    AI.log.push(a); renderAI();
    if (a.auto === 0 && a.actions && a.actions[0].run) a.actions[0].run();
  }, 450);
}
function openAssistant(q) {
  AI.open = true; document.body.classList.remove('sb-open'); renderAI();
  if (q) askAI(q);
}
Actions['open-ai'] = () => openAssistant();
Actions['close-ai'] = () => { AI.open = false; renderAI(); };
Actions['ai-clear'] = () => { AI.log = []; renderAI(); };
Actions['ai-ask'] = (el) => askAI(el.dataset.q);
Actions['ai-act'] = (el) => {
  const a = AI.actions[el.dataset.id];
  if (!a) return;
  if (a.route) location.hash = a.route; else a.run();
};
