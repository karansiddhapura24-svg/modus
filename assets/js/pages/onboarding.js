/* Sign up, log in, onboarding and team-code flow.
   Accounts live in this browser only (no backend), so passwords are stored
   as a SHA-256 hash rather than plain text — fine for a local prototype,
   not a substitute for real server-side authentication. */
const OB = ui('onboard', { accountType: 'creative', workStyle: 'freelancer', profession: 'video-editor' });
const DEMO_SESSION = { name: 'Karan Patel', email: 'demo@modus.app', onboarded: true, demo: true, accountType: 'creative', workStyle: 'studio', profession: 'video-editor' };

const newSalt = () => Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
async function hashPassword(salt, pw) {
  const text = `${salt}:${pw}`;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261; // FNV-1a fallback for browsers without SubtleCrypto
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'f' + (h >>> 0).toString(16);
}
const accounts = () => S().accounts || (S().accounts = []);
const findAccount = (email) => accounts().find((a) => a.email === email.trim().toLowerCase());

/* Start a session and keep the account record in sync with onboarding answers. */
function startSession(sess) {
  S().session = sess;
  S().user.first = (sess.name || 'there').split(/\s+/)[0];
  Store.save();
}
function syncAccount() {
  const sess = S().session; if (!sess) return;
  const acc = sess.email && findAccount(sess.email);
  if (acc) Object.assign(acc, { name: sess.name, accountType: sess.accountType, workStyle: sess.workStyle, profession: sess.profession, onboarded: sess.onboarded, teamCode: sess.teamCode, clientId: sess.clientId, portalNotify: sess.portalNotify });
  Store.save();
}
function afterAuth() {
  const sess = S().session;
  const isClient = sess.accountType === 'client' && sess.clientId;
  const next = !sess.onboarded ? '#/onboarding/account-type' : isClient ? '#/portal' : (UI.afterLogin || '#/dashboard');
  UI.afterLogin = null;
  location.hash = next;
}

/* ---------- Shared form helpers ---------- */
function setFieldError(form, name, msg) {
  const input = form.elements[name];
  const box = input.closest('.sfield');
  let el = $('.field-err', box);
  if (!el) { el = document.createElement('div'); el.className = 'field-err'; box.appendChild(el); }
  el.textContent = msg || '';
  input.classList.toggle('err', !!msg);
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
}
function clearErrors(form) {
  $$('.field-err', form).forEach((e) => (e.textContent = ''));
  $$('.sinput', form).forEach((i) => { i.classList.remove('err'); i.removeAttribute('aria-invalid'); });
  const g = $('.form-err', form); if (g) g.innerHTML = '';
}
function wireLiveClear(form) {
  form.addEventListener('input', (e) => {
    if (!e.target.classList.contains('err')) return;
    e.target.classList.remove('err'); e.target.removeAttribute('aria-invalid');
    const box = e.target.closest('.sfield'); const fe = box && $('.field-err', box); if (fe) fe.textContent = '';
  });
}
function passwordStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return pw.length < 8 ? 0 : Math.min(3, Math.max(1, s - 1));
}
const pwField = (id, name, label, auto, extra = '') => `
  <div class="sfield"><label for="${id}">${label}</label>
    <div class="pw-wrap"><input class="sinput" id="${id}" name="${name}" type="password" autocomplete="${auto}" ${extra} />
      <button type="button" data-action="toggle-pw" aria-label="Show password">${icon('eyeOff', 22)}</button></div></div>`;
const authArt = `<div class="signup-art"><img src="${IMG}signup-illustration.png" alt="Plan, create, deliver: creative workflows simplified" /></div>`;
const googleBtn = (mode) => `<button type="button" class="gbtn" data-action="google-auth" data-mode="${mode}">${GOOGLE_G}<span>Continue with Google</span></button><div class="or">OR</div>`;

/* ---------- Sign up ---------- */
Pages.signup = () => ({
  html: `
  <div class="signup">
    ${authArt}
    <div class="signup-form">
      <form class="inner" id="signup-form" novalidate>
        <h1>Create Your Account</h1>
        <p class="lead">Clients, projects and payments, all in one place.</p>
        ${googleBtn('signup')}
        <div class="sfield"><label for="su-name">Full Name</label><input class="sinput" id="su-name" name="name" autocomplete="name" placeholder="e.g. Karan Patel" /></div>
        <div class="sfield"><label for="su-email">Email Address</label><input class="sinput" id="su-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@studio.com" /></div>
        <div class="pw-row">
          ${pwField('su-pw', 'password', 'Password', 'new-password', 'placeholder="8+ characters" aria-describedby="pw-meter"')}
          ${pwField('su-pw2', 'confirm', 'Confirm Password', 'new-password', 'placeholder="Repeat password"')}
        </div>
        <div class="pw-meter" id="pw-meter" aria-live="polite"><span class="bars"><i></i><i></i><i></i></span><span class="pw-label">Use 8 or more characters with a mix of letters and numbers.</span></div>
        <label class="terms"><input type="checkbox" name="terms" /> <span>I agree to the <a href="#/signup" data-action="noop">Terms &amp; Conditions</a> and <a href="#/signup" data-action="noop">Privacy Policy</a>.</span></label>
        <div class="form-err" id="su-err" role="alert"></div>
        <button type="submit" class="signup-cta">Continue to setup <span aria-hidden="true">&rarr;</span></button>
        <p class="login-line">Already have an account? <a href="#/login">Log in</a></p>
      </form>
    </div>
  </div>`,
  mount() {
    const f = $('#signup-form');
    wireLiveClear(f);
    $('#su-name').focus();
    const meter = $('#pw-meter');
    f.elements.password.addEventListener('input', (e) => {
      const pw = e.target.value, s = passwordStrength(pw);
      meter.dataset.level = pw ? s : '';
      $('.pw-label', meter).textContent = !pw ? 'Use 8 or more characters with a mix of letters and numbers.'
        : pw.length < 8 ? `${8 - pw.length} more character${8 - pw.length > 1 ? 's' : ''} needed`
        : ['', 'Okay password. Add numbers or symbols to make it stronger.', 'Good password', 'Strong password'][s];
    });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors(f);
      const v = Object.fromEntries(new FormData(f).entries());
      const errs = {};
      if (!v.name.trim()) errs.name = 'Enter your full name.';
      if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) errs.email = 'Enter a valid email, like you@studio.com.';
      else if (findAccount(v.email)) errs.email = 'An account with this email already exists.';
      if (v.password.length < 8) errs.password = 'Use at least 8 characters.';
      if (!v.confirm) errs.confirm = 'Re-enter your password.';
      else if (v.password !== v.confirm) errs.confirm = 'Passwords don’t match.';
      Object.entries(errs).forEach(([k, m]) => setFieldError(f, k, m));
      if (errs.email && findAccount(v.email)) $('#su-err').innerHTML = 'Already registered? <a href="#/login">Log in instead</a>.';
      if (!f.elements.terms.checked) { $('#su-err').innerHTML ||= 'Please accept the Terms &amp; Conditions to continue.'; f.elements.terms.parentElement.classList.add('err'); }
      else f.elements.terms.parentElement.classList.remove('err');
      const first = Object.keys(errs)[0];
      if (first) { f.elements[first].focus(); return; }
      if (!f.elements.terms.checked) return;
      const email = v.email.trim().toLowerCase();
      const salt = newSalt();
      accounts().push({ name: v.name.trim(), email, salt, hash: await hashPassword(salt, v.password), createdAt: new Date().toISOString(), onboarded: false });
      startSession({ name: v.name.trim(), email, onboarded: false });
      afterAuth();
    });
  },
});

/* ---------- Log in ---------- */
Pages.login = () => ({
  html: `
  <div class="signup">
    ${authArt}
    <div class="signup-form">
      <form class="inner" id="login-form" novalidate>
        <h1>Welcome back</h1>
        <p class="lead">Log in to pick up where you left off.</p>
        ${googleBtn('login')}
        <div class="sfield"><label for="li-email">Email Address</label><input class="sinput" id="li-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@studio.com" value="${esc(UI.loginEmail || '')}" /></div>
        ${pwField('li-pw', 'password', 'Password', 'current-password', 'placeholder="Your password"')}
        <div class="login-meta"><button type="button" class="link-btn" data-action="forgot-pw">Forgot password?</button></div>
        <div class="form-err" id="li-err" role="alert"></div>
        <button type="submit" class="signup-cta">Log in <span aria-hidden="true">&rarr;</span></button>
        <p class="login-line">New to MODUS? <a href="#/signup">Create an account</a></p>
        <p class="demo-line"><button type="button" class="link-btn" data-action="demo-login">Explore the demo workspace</button>
          <span class="demo-sep">·</span><button type="button" class="link-btn" data-action="client-demo-login">Try the client portal</button></p>
      </form>
    </div>
  </div>`,
  mount() {
    const f = $('#login-form');
    wireLiveClear(f);
    (f.elements.email.value ? f.elements.password : f.elements.email).focus();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors(f);
      const email = f.elements.email.value.trim().toLowerCase(), pw = f.elements.password.value;
      UI.loginEmail = email;
      if (!/^\S+@\S+\.\S+$/.test(email)) { setFieldError(f, 'email', 'Enter a valid email, like you@studio.com.'); f.elements.email.focus(); return; }
      if (!pw) { setFieldError(f, 'password', 'Enter your password.'); f.elements.password.focus(); return; }
      const acc = findAccount(email);
      if (!acc) { setFieldError(f, 'email', 'No account found for this email.'); $('#li-err').innerHTML = 'New here? <a href="#/signup">Create an account</a>.'; return; }
      if (!acc.hash) { setFieldError(f, 'password', 'This account uses Google sign-in.'); $('#li-err').textContent = 'Use “Continue with Google” above.'; return; }
      if (acc.hash !== await hashPassword(acc.salt, pw)) { setFieldError(f, 'password', 'Incorrect password. Try again.'); f.elements.password.select(); return; }
      startSession({ name: acc.name, email: acc.email, onboarded: !!acc.onboarded, accountType: acc.accountType, workStyle: acc.workStyle, profession: acc.profession, teamCode: acc.teamCode, clientId: acc.clientId, portalNotify: acc.portalNotify });
      toast(`Welcome back, ${S().user.first}!`);
      afterAuth();
    });
  },
});

Actions['toggle-pw'] = (el) => {
  const input = $('input', el.parentElement);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  el.innerHTML = icon(show ? 'eye' : 'eyeOff', 22);
  el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
};
Actions['google-auth'] = () => {
  // No OAuth without a server: this signs in with a sample Google profile.
  const email = 'karan.patel@gmail.com';
  const acc = findAccount(email);
  startSession(acc ? { name: acc.name, email, onboarded: !!acc.onboarded, accountType: acc.accountType, workStyle: acc.workStyle, profession: acc.profession }
    : { name: 'Karan Patel', email, onboarded: false });
  if (!acc) accounts().push({ name: 'Karan Patel', email, hash: null, google: true, createdAt: new Date().toISOString(), onboarded: false });
  Store.save();
  toast('Signed in with a sample Google account (offline demo)');
  afterAuth();
};
Actions['demo-login'] = () => { startSession({ ...DEMO_SESSION }); toast('You’re exploring the demo workspace'); afterAuth(); };
Actions['forgot-pw'] = () => {
  $('#li-err').innerHTML = 'Password reset needs an email service, which this offline version doesn’t have. <a href="#/signup">Create a new account</a> or explore the demo workspace instead.';
};
Actions['go-back'] = () => (history.length > 1 ? history.back() : (location.hash = '#/signup'));

/* ---------- Onboarding ---------- */
const stepLabel = (n, of) => `<p class="ob-step">Step ${n} of ${of}</p>`;

/* Shared onboarding layout: logo + progress bar, centred column, options, action footer. */
function obLayout({ step, total, title, sub, key, options, wide, cta, nextStep, hint }) {
  const segs = Array.from({ length: total }, (_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('');
  return `<div class="ob2">
    <header class="ob2-top">
      <img class="ob2-logo" src="${IMG}logo.png" alt="MODUS" />
      <div class="ob2-progress" aria-label="Step ${step} of ${total}"><span>Step ${step} of ${total}</span><span class="ob2-segs">${segs}</span></div>
    </header>
    <main class="ob2-main">
      <div class="ob2-inner">
        <button class="ob2-back" data-action="go-back">${icon('chevronLeft', 18, '', 2)}Back</button>
        <h1 class="ob2-title" id="ob2-title">${title}</h1>
        ${sub ? `<p class="ob2-sub">${sub}</p>` : ''}
        <div class="ob2-grid ${wide ? 'wide' : ''}" role="radiogroup" aria-labelledby="ob2-title" data-key="${key}">${options}</div>
        <div class="ob2-foot">
          <span class="ob2-hint">${hint || 'You can change this later in Settings.'}</span>
          <button class="btn btn-primary ob2-next" data-action="ob-next" data-step="${nextStep}">${cta} ${icon('arrowRight', 18)}</button>
        </div>
      </div>
    </main>
  </div>`;
}
const radioDot = (sel) => `<span class="ob2-radio" aria-hidden="true">${sel ? icon('check', 14, '', 2.4) : ''}</span>`;

function optCard(key, val, ic, title, sub) {
  const sel = OB[key] === val;
  return `<button class="ob2-opt ${sel ? 'selected' : ''}" role="radio" aria-checked="${sel}" tabindex="${sel ? 0 : -1}" data-action="ob-pick" data-k="${key}" data-v="${val}">
    <span class="ob2-ic">${icon(ic, 28, '', 1.5)}</span>
    <span class="ob2-text"><b>${title}</b><small>${sub}</small></span>
    ${radioDot(sel)}
  </button>`;
}

Pages.accountType = () => {
  const card = (val, img, title, text) => {
    const sel = OB.accountType === val;
    return `<button class="ob2-opt ob2-acct ${sel ? 'selected' : ''}" role="radio" aria-checked="${sel}" tabindex="${sel ? 0 : -1}" data-action="ob-pick" data-k="accountType" data-v="${val}">
      <img src="${IMG}${img}" alt="" />
      <span class="ob2-text"><b>${title}</b><small>${text}</small></span>
      ${radioDot(sel)}
    </button>`;
  };
  const client = OB.accountType === 'client';
  return {
    html: obLayout({
      step: 1, total: client ? 2 : 3, key: 'accountType', wide: true, nextStep: 'account', cta: 'Continue',
      title: 'What type of account are you creating?',
      sub: 'This decides what your MODUS workspace looks like.',
      hint: client ? 'Next, you’ll enter the team code you were sent.' : 'Next, tell us a little about how you work.',
      options: card('creative', 'account-creative.png', 'I manage creative work', 'For freelancers, editors, designers and creative teams managing clients and deliverables.')
        + card('client', 'account-client.png', 'I work with creatives', 'For brands and businesses that review, give feedback on and approve creative work.'),
    }),
  };
};

Pages.workStyle = () => ({
  html: obLayout({
    step: 2, total: 3, key: 'workStyle', nextStep: 'work', cta: 'Continue',
    title: 'How do you work?', sub: 'We’ll set up your workspace around how you work.',
    options: optCard('workStyle', 'freelancer', 'user', 'Freelancer', 'I work independently')
      + optCard('workStyle', 'small-team', 'users', 'Small Team', 'I work with a small creative team')
      + optCard('workStyle', 'agency', 'building', 'Agency', 'I manage projects for multiple clients')
      + optCard('workStyle', 'studio', 'filmCamera', 'Studio', 'I run a creative studio'),
  }),
});

Pages.profession = () => ({
  html: obLayout({
    step: 3, total: 3, key: 'profession', nextStep: 'profession', cta: 'Go to my dashboard',
    title: 'What do you do?', sub: 'Pick your main craft so we can personalize your MODUS workspace.',
    options: optCard('profession', 'video-editor', 'studio', 'Video Editor', 'Cuts &amp; stories')
      + optCard('profession', 'videographer', 'videoCam', 'Videographer', 'Cinematography')
      + optCard('profession', 'graphics', 'imageFrame', 'Graphics Designer', 'Branding &amp; vector art')
      + optCard('profession', 'motion', 'motion', 'Motion Designer', 'Keyframes &amp; 3D'),
  }),
});

/* Select an option, re-render, and keep keyboard focus on the chosen card. */
function obSelect(key, val) {
  OB[key] = val; App.render();
  const el = $(`.ob2-opt[data-k="${key}"][data-v="${val}"]`); if (el) el.focus();
}
Actions['ob-pick'] = (el) => obSelect(el.dataset.k, el.dataset.v);
document.addEventListener('keydown', (e) => {
  const opt = e.target.closest && e.target.closest('.ob2-opt');
  if (!opt || !['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) return;
  e.preventDefault();
  const all = $$('.ob2-opt', opt.parentElement);
  const i = all.indexOf(opt) + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1);
  const next = all[(i + all.length) % all.length];
  obSelect(next.dataset.k, next.dataset.v);
});
Actions['ob-next'] = (el) => {
  const sess = S().session || (S().session = { name: '', email: '' });
  const step = el.dataset.step;
  if (step === 'account') {
    sess.accountType = OB.accountType;
    // A new creator gets a studio named after them; clients join someone else's studio.
    if (OB.accountType === 'creative' && sess.email && !sess.demo && sess.name) S().studio = `${sess.name.split(/\s+/)[0]}’s Studio`;
    syncAccount();
    location.hash = OB.accountType === 'client' ? '#/join' : '#/onboarding/work-style';
  } else if (step === 'work') {
    sess.workStyle = OB.workStyle; syncAccount();
    location.hash = '#/onboarding/profession';
  } else {
    sess.profession = OB.profession; sess.onboarded = true; syncAccount();
    toast(`You’re all set, ${S().user.first}! Welcome to MODUS.`);
    location.hash = '#/dashboard';
  }
};

/* ---------- Join with team code ---------- */
Actions['use-demo-code'] = () => {
  const c = S().clients.find((x) => x.id === SAMPLE_OWNER);
  if (c) { $('#team-code').value = codeFor(c); $('#team-code').focus(); }
};
const normalizeCode = (raw) => {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = c.startsWith('MODUS') ? c.slice(5) : c;
  return body ? `MODUS-${body.slice(0, 6)}` : '';
};
Pages.join = () => ({
  html: `<div class="join">
    <div class="join-left">
      <button class="ob-back" data-action="go-back" aria-label="Back">${icon('chevronLeft', 30, '', 2)}</button>
      <h1>Your creative work,<br>all in one place.</h1>
      <p>Join your creative partner’s workspace to view projects, share files, give feedback and approve work, all in one simple space.</p>
      <img src="${IMG}teamcode-illustration.png" alt="" />
    </div>
    <div class="join-right">
      <form class="inner" id="join-form" novalidate>
        ${stepLabel(2, 2)}
        <h1>Enter your team code</h1>
        <p>Your editor, designer or studio shared a team code with you. Paste it below to open your project portal.</p>
        <label class="sr-only" for="team-code">Team code</label>
        <input class="code-input" id="team-code" name="code" placeholder="e.g. MODUS-74KI5" autocomplete="off" autocapitalize="characters" spellcheck="false" />
        <div class="form-err" id="join-err" role="alert"></div>
        <button type="submit" class="signup-cta join-cta">Join team <span aria-hidden="true">&rarr;</span></button>
        <hr />
        <h4>Don’t have a code yet?</h4>
        <small>Ask the person you’re working with to send you their MODUS team code.</small>
        ${S().clients.some((c) => c.id === SAMPLE_OWNER) ? `<button type="button" class="link-btn demo-code" data-action="use-demo-code">Just exploring? Use the demo code</button>` : ''}
      </form>
    </div>
  </div>`,
  mount() {
    const input = $('#team-code');
    input.focus();
    input.addEventListener('blur', () => { if (input.value.trim()) input.value = normalizeCode(input.value); });
    input.addEventListener('input', () => { $('#join-err').textContent = ''; input.classList.remove('err'); });
    $('#join-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const code = normalizeCode(input.value);
      if (!input.value.trim()) { $('#join-err').textContent = 'Enter the team code you received.'; input.classList.add('err'); input.focus(); return; }
      if (!/^MODUS-[A-Z0-9]{4,6}$/.test(code)) { $('#join-err').textContent = 'That code doesn’t look right. Codes look like MODUS-74KI5.'; input.classList.add('err'); input.focus(); return; }
      input.value = code;
      const client = S().clients.find((c) => codeFor(c) === code);
      if (!client) { $('#join-err').textContent = 'No team uses this code. Check it with the person who invited you.'; input.classList.add('err'); input.focus(); return; }
      const sess = S().session || (S().session = {});
      Object.assign(sess, { teamCode: code, clientId: client.id, accountType: 'client', onboarded: true }); syncAccount();
      toast(`You’ve joined ${S().studio} as ${client.title}`);
      location.hash = '#/portal';
    });
  },
});
