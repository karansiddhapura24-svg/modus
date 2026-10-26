/* Settings: profile, workspace defaults, notifications, data. */
const PROFESSIONS = [['video-editor', 'Video Editor'], ['videographer', 'Videographer'], ['graphics', 'Graphics Designer'], ['motion', 'Motion Designer']];
const WORK_STYLES = [['freelancer', 'Freelancer'], ['small-team', 'Small Team'], ['agency', 'Agency'], ['studio', 'Studio']];

const toggleRow = (name, label, hint, on) => `
  <label class="toggle-row"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span>
    <input type="checkbox" class="switch" name="${name}" ${on ? 'checked' : ''} /></label>`;

Pages.settings = () => {
  const s = S(), sess = s.session || {}, st = s.settings;
  const opt = (list, v) => list.map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('');
  const html = `
  <form id="settings-form" novalidate>
    <div class="page-head"><h1 class="page-title">Settings</h1>
      <button type="submit" class="btn btn-primary">${icon('check', 20)}Save Changes</button></div>
    <div class="settings-grid">
      <section class="card set-card">
        <h2 class="card-title">Profile</h2>
        <div class="fgrid">
          <div class="field"><label for="st-name">Full Name</label><input id="st-name" class="input filled" name="name" value="${esc(sess.name || s.user.first)}" /></div>
          <div class="field"><label for="st-email">Email Address</label><input id="st-email" class="input filled" type="email" name="email" value="${esc(sess.email || '')}" placeholder="you@example.com" /></div>
          <div class="field"><label for="st-prof">Profession</label><select id="st-prof" class="select filled" name="profession">${opt(PROFESSIONS, sess.profession || 'video-editor')}</select></div>
          <div class="field"><label for="st-work">How you work</label><select id="st-work" class="select filled" name="workStyle">${opt(WORK_STYLES, sess.workStyle || 'freelancer')}</select></div>
        </div>
      </section>
      <section class="card set-card">
        <h2 class="card-title">Workspace</h2>
        <div class="fgrid">
          <div class="field full"><label for="st-studio">Studio Name</label><input id="st-studio" class="input filled" name="studio" value="${esc(s.studio)}" /></div>
          <div class="field"><label for="st-due">Invoice due after (days)</label><input id="st-due" class="input filled" type="number" min="0" max="120" name="dueDays" value="${st.dueDays}" /></div>
          <div class="field"><label for="st-charge">Extra revision charge (₹)</label><input id="st-charge" class="input filled" type="number" min="0" name="overCharge" value="${st.overCharge}" /></div>
        </div>
      </section>
      <section class="card set-card">
        <h2 class="card-title">Notifications</h2>
        <div class="toggles">
          ${toggleRow('n_payments', 'Payment reminders', 'Pending and overdue invoices in the bell menu', st.notify.payments)}
          ${toggleRow('n_feedback', 'Client feedback', 'Comments and approvals waiting on you', st.notify.feedback)}
          ${toggleRow('n_deadlines', 'Deadlines', 'Projects due soon or overdue in the bell menu', st.notify.deadlines)}
          ${toggleRow('n_messages', 'Messages', 'Unread badge and new-message alerts', st.notify.messages)}
        </div>
      </section>
      <section class="card set-card">
        <h2 class="card-title">Data &amp; Account</h2>
        <p class="set-note">Your MODUS data is stored in this browser only.</p>
        <div class="set-actions">
          <button type="button" class="btn btn-white bordered" data-action="export-data">${icon('download', 20)}Export data (JSON)</button>
          <button type="button" class="btn btn-white bordered" data-action="reset-data">${icon('refresh', 20)}Reset demo data</button>
          <button type="button" class="btn btn-danger-soft wide" data-action="logout">Log out</button>
        </div>
      </section>
    </div>
  </form>`;
  return {
    html: shell('settings', html),
    mount() {
      $('#settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target, v = Object.fromEntries(new FormData(f).entries());
        if (!v.name.trim()) { toast('Name can’t be empty'); f.elements.name.focus(); return; }
        if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) { toast('Enter a valid email address'); f.elements.email.focus(); return; }
        const s2 = S();
        const oldEmail = (s2.session && s2.session.email) || '';
        const newEmail = v.email.trim().toLowerCase();
        const acc = oldEmail && findAccount(oldEmail);
        if (acc && newEmail !== oldEmail && findAccount(newEmail)) { toast('Another account already uses that email'); f.elements.email.focus(); return; }
        if (acc) acc.email = newEmail;
        s2.session = { ...(s2.session || {}), name: v.name.trim(), email: newEmail, profession: v.profession, workStyle: v.workStyle };
        syncAccount();
        s2.user.first = v.name.trim().split(/\s+/)[0];
        s2.studio = v.studio.trim() || s2.studio;
        s2.settings.dueDays = Math.max(0, +v.dueDays || 0);
        s2.settings.overCharge = Math.max(0, +v.overCharge || 0);
        s2.settings.notify = { payments: !!v.n_payments, feedback: !!v.n_feedback, deadlines: !!v.n_deadlines, messages: !!v.n_messages };
        Store.save(); App.render(); toast('Settings saved');
      });
    },
  };
};

Actions['export-data'] = () => downloadFile('modus-data.json', JSON.stringify(S(), null, 2), 'application/json');
Actions['reset-data'] = () => {
  if (!confirm('Reset all MODUS data to the original demo data? Your changes will be lost.')) return;
  const sess = S().session;
  Store.reset(); S().session = sess; Store.save();
  App.render(); toast('Demo data restored');
};
Actions['logout'] = () => logout();
