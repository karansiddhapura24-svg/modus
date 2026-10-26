/* Messages: conversation list + thread + composer (persisted to the local store). */
const MSG = ui('messages', { active: null, q: '', view: 'list' });

const msgTime = (iso) => {
  const d = new Date(iso), now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};
const clock = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const dayLabel = (iso) => {
  const d = new Date(iso), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
};
const lastMsg = (c) => c.msgs[c.msgs.length - 1];
const sortedConvos = () => [...S().conversations].sort((a, b) => (lastMsg(b)?.at || '').localeCompare(lastMsg(a)?.at || ''));
const activeConvo = () => S().conversations.find((c) => c.id === MSG.active);

function convoListHtml() {
  const q = MSG.q.toLowerCase();
  const list = sortedConvos().filter((c) => !q || (c.name + ' ' + c.msgs.map((m) => m.t).join(' ')).toLowerCase().includes(q));
  return list.map((c) => {
    const m = lastMsg(c);
    return `<button class="convo ${c.id === MSG.active ? 'active' : ''}" data-action="open-convo" data-id="${c.id}">
      <img src="${src(c.avatar)}" alt="" />
      <span class="convo-main"><span class="convo-top"><b>${esc(c.name)}</b><small>${m ? msgTime(m.at) : ''}</small></span>
        <span class="convo-last">${m ? (m.me ? 'You: ' : '') + esc(m.t) : 'No messages yet'}</span></span>
      ${c.unread ? `<span class="convo-badge">${c.unread}</span>` : ''}
    </button>`;
  }).join('') || '<div class="empty-row">No conversations found.</div>';
}

function threadBodyHtml(c) {
  let lastDay = '';
  return c.msgs.map((m) => {
    const day = dayLabel(m.at);
    const sep = day !== lastDay ? `<div class="day-sep"><span>${day}</span></div>` : '';
    lastDay = day;
    const body = m.file ? `<span class="file-chip">${icon('paperclip', 14)}${esc(m.file)}</span>` : esc(m.t);
    return `${sep}<div class="bubble-row ${m.me ? 'me' : ''}"><div class="bubble">${body}<time>${clock(m.at)}</time></div></div>`;
  }).join('') || '<div class="thread-empty">Say hello 👋</div>';
}

Pages.messages = () => {
  const convos = sortedConvos();
  if (!convos.length) {
    const hasPeople = S().clients.length || S().team.length;
    return { html: shell('messages', `
      <div class="page-head"><h1 class="page-title">Messages</h1></div>
      ${emptyState('messages', 'No messages yet', hasPeople ? 'Start a conversation with a client or team member. All your project chats stay in one inbox.'
        : 'Once you add clients or team members, you can message them here. All your project chats stay in one inbox.', hasPeople ? ['New Message', 'new-convo'] : ['Add a client', 'new-client'])}`) };
  }
  if (!MSG.active || !activeConvo()) MSG.active = convos[0] && convos[0].id;
  const c = activeConvo();
  if (c && c.unread) { c.unread = 0; Store.save(); }
  const html = `
    <div class="page-head"><h1 class="page-title">Messages</h1>
      <button class="btn btn-primary" data-action="new-convo">${icon('plus', 22, '', 1.6)}New Message</button></div>
    <div class="chat view-${MSG.view}">
      <aside class="chat-list">
        <label class="search chat-search">${icon('search', 14)}<input type="search" placeholder="Search messages..." value="${esc(MSG.q)}" data-input="msg-q" /></label>
        <div class="convos" id="convos">${convoListHtml()}</div>
      </aside>
      <section class="thread">
        ${c ? `
        <header class="thread-head">
          <button class="thread-back" data-action="msg-back" aria-label="Back to conversations">${icon('chevronLeft', 22, '', 1.8)}</button>
          <img src="${src(c.avatar)}" alt="" />
          <div><b>${esc(c.name)}</b><small>${esc(c.sub)}</small></div>
          <a class="btn btn-soft btn-sm" href="${c.link}">View profile</a>
        </header>
        <div class="thread-body" id="thread-body">${threadBodyHtml(c)}</div>
        <form class="composer" id="composer">
          <button type="button" class="comp-btn" data-action="msg-attach" aria-label="Attach file">${icon('paperclip', 20)}</button>
          <input id="msg-input" autocomplete="off" placeholder="Write a message..." aria-label="Message" value="${esc(MSG.draft || '')}" />
          <button type="submit" class="btn btn-primary comp-send" aria-label="Send">${icon('send', 18)}</button>
          <input type="file" id="msg-file" hidden multiple />
        </form>` : '<div class="thread-empty">Select a conversation</div>'}
      </section>
    </div>`;
  return { html: shell('messages', html), mount: mountMessages };
};

function scrollThread() { const b = $('#thread-body'); if (b) b.scrollTop = b.scrollHeight; }
function refreshChat() {
  const c = activeConvo();
  if ($('#convos')) $('#convos').innerHTML = convoListHtml();
  if (c && $('#thread-body')) { $('#thread-body').innerHTML = threadBodyHtml(c); scrollThread(); }
}

function sendMessage(msg) {
  const c = activeConvo();
  if (!c) return;
  c.msgs.push({ me: true, at: new Date().toISOString(), ...msg });
  // Client conversations reach the client's portal, so no simulated reply there.
  if (S().clients.some((x) => x.id === c.id)) { c.clientUnread = (c.clientUnread || 0) + 1; Store.save(); refreshChat(); return; }
  Store.save(); refreshChat();
  // Simulated reply so the demo conversation feels alive (no backend).
  const id = c.id;
  setTimeout(() => {
    if (!location.hash.startsWith('#/messages') || MSG.active !== id) {
      const conv = S().conversations.find((x) => x.id === id);
      if (!conv) return;
      conv.msgs.push({ me: false, at: new Date().toISOString(), t: msg.file ? 'Got the file, thanks!' : 'Thanks! I’ll get back to you shortly.' });
      conv.unread = (conv.unread || 0) + 1; Store.save();
      if (S().settings.notify.messages) toast(`New message from ${conv.name}`);
      return;
    }
    const b = $('#thread-body');
    if (b) { b.insertAdjacentHTML('beforeend', '<div class="bubble-row typing"><div class="bubble"><i></i><i></i><i></i></div></div>'); scrollThread(); }
    setTimeout(() => {
      c.msgs.push({ me: false, at: new Date().toISOString(), t: msg.file ? 'Got the file, thanks!' : 'Thanks! I’ll get back to you shortly.' });
      Store.save(); refreshChat();
    }, 1100);
  }, 700);
}

function mountMessages() {
  scrollThread();
  const form = $('#composer');
  if (!form) return;
  const input = $('#msg-input');
  input.addEventListener('input', () => { MSG.draft = input.value; });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = input.value.trim();
    if (!t) return;
    input.value = ''; MSG.draft = '';
    sendMessage({ t });
    input.focus();
  });
  $('#msg-file').addEventListener('change', (e) => {
    [...e.target.files].forEach((f) => sendMessage({ t: f.name, file: f.name }));
    e.target.value = '';
  });
  if (window.innerWidth > 860) input.focus();
}

Inputs['msg-q'] = (el) => { MSG.q = el.value; $('#convos').innerHTML = convoListHtml(); };
Actions['open-convo'] = (el) => { MSG.active = el.dataset.id; MSG.view = 'thread'; MSG.draft = ''; App.render(); };
Actions['msg-back'] = () => { MSG.view = 'list'; App.render(); };
Actions['msg-attach'] = () => $('#msg-file').click();
Actions['new-convo'] = () => {
  const have = new Set(S().conversations.map((c) => c.name));
  const people = [
    ...S().clients.filter((c) => !c.archived).map((c) => ({ name: c.title, avatar: c.logo, sub: `Client · ${c.type}`, link: `#/clients/${c.id}/projects` })),
    ...S().team.map((t) => ({ name: t.name, avatar: t.avatar, sub: `Team · ${t.role}`, link: '#/team' })),
  ].filter((p) => !have.has(p.name));
  if (!people.length) { toast('You already have a conversation with everyone'); return; }
  openForm({
    title: 'New Message', submit: 'Send',
    fields: [
      { name: 'to', label: 'To', type: 'select', options: people.map((p) => p.name), value: people[0].name, full: true },
      { name: 'text', label: 'Message', type: 'textarea', full: true, placeholder: 'Write your message...' },
    ],
    onSubmit(v) {
      if (!v.text.trim()) { toast('Write a message first'); return false; }
      const p = people.find((x) => x.name === v.to);
      const id = uid('c');
      S().conversations.push({ id, ...p, unread: 0, msgs: [{ me: true, t: v.text.trim(), at: new Date().toISOString() }] });
      Store.save(); MSG.active = id; MSG.view = 'thread';
      if (location.hash === '#/messages') App.render(); else location.hash = '#/messages';
    },
  });
};
