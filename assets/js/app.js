/* Hash router + delegated events. */
const ROUTES = [
  [/^signup$/, 'signup', true],
  [/^login$/, 'login', true],
  [/^onboarding\/account-type$/, 'accountType', true],
  [/^onboarding\/work-style$/, 'workStyle', true],
  [/^onboarding\/profession$/, 'profession', true],
  [/^join$/, 'join', true],
  [/^dashboard$/, 'dashboard'],
  [/^clients$/, 'clients'],
  [/^clients\/([\w-]+)(?:\/(\w+))?$/, 'client', false, ['id', 'tab']],
  [/^projects$/, 'projects'],
  [/^projects\/([\w-]+)(?:\/(\w+))?$/, 'project', false, ['id', 'tab']],
  [/^billing$/, 'billing'],
  [/^meetings$/, 'meetings'],
  [/^messages$/, 'messages'],
  [/^team$/, 'team'],
  [/^settings$/, 'settings'],
  [/^portal(?:\/(\w+))?(?:\/([\w-]+))?$/, 'portal', false, ['section', 'id']],
];

const PAGE_TITLES = {
  signup: 'Create account', login: 'Log in', accountType: 'Account type', workStyle: 'How you work', profession: 'Your profession',
  join: 'Join a team', dashboard: 'Dashboard', clients: 'Clients', client: 'Client', projects: 'Projects', project: 'Project',
  billing: 'Billing', meetings: 'Meetings', messages: 'Messages', team: 'Team', settings: 'Settings', portal: 'Client portal',
};

/* Shared by the studio menu and Settings. */
function logout() {
  S().session = null; Store.save();
  UI.portalPreview = null;
  AI.open = false; AI.log = []; renderAI();
  location.hash = '#/login';
  toast('You’ve been logged out');
}

const App = {
  lastPath: null,
  render(opts = {}) {
    const path = location.hash.replace(/^#\/?/, '');
    const sess = S().session;
    // Returning users land on Log in; first-time visitors on Sign up.
    const authHome = (S().accounts || []).length ? '#/login' : '#/signup';
    const isClient = !!(sess && sess.accountType === 'client' && sess.clientId);
    const home = isClient ? '#/portal' : '#/dashboard';
    if (!path) { location.replace(sess ? (sess.onboarded ? home : '#/onboarding/account-type') : authHome); return; }
    const match = ROUTES.map(([re, name, pub, keys]) => [path.match(re), name, pub, keys]).find(([m]) => m);
    if (!match) { location.replace('#/dashboard'); return; }
    const [m, name, isPublic, keys = []] = match;
    if (!isPublic && !sess) { UI.afterLogin = '#/' + path; location.replace(authHome); return; }
    if (!isPublic && !sess.onboarded) { location.replace('#/onboarding/account-type'); return; }
    if (name === 'login' && sess && sess.onboarded) { location.replace(home); return; }
    // Client accounts live in the portal; creators only see it as a preview.
    if (!isPublic && isClient && name !== 'portal') { location.replace('#/portal'); return; }
    if (name === 'portal' && !isClient && !UI.portalPreview) { location.replace('#/dashboard'); return; }
    if (name !== 'portal' && !isClient && UI.portalPreview) UI.portalPreview = null;

    const params = {};
    keys.forEach((k, i) => { if (m[i + 1]) params[k] = m[i + 1]; });

    // remember focused field + caret so live-search re-renders don't steal focus
    let focusKey = null, caret = null;
    if (opts.keepFocus) { focusKey = opts.keepFocus.dataset.input; caret = opts.keepFocus.selectionStart; }

    closeMenu();
    const view = Pages[name](params);
    $('#app').innerHTML = view.html;
    document.title = `${PAGE_TITLES[name] || 'MODUS'} · MODUS`;
    if (view.mount) view.mount();

    if (focusKey) {
      const el = $(`[data-input="${focusKey}"]`);
      if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) {} }
    }
    if (this.lastPath !== path) {
      const sameBase = this.lastPath && this.lastPath.split('/').slice(0, 2).join('/') === path.split('/').slice(0, 2).join('/');
      if (!sameBase) window.scrollTo(0, 0);
      document.body.classList.remove('sb-open');
      this.lastPath = path;
    }
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = Actions[el.dataset.action];
  if (!fn) return;
  if (el.tagName === 'A' || el.tagName === 'BUTTON' && el.type === 'submit') e.preventDefault();
  fn(el, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#overlay-root').children.length) closeDrawer();
  // keyboard activation for non-button actionable elements (e.g. date pickers)
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-action][role=button]:not(button)')) {
    e.preventDefault(); Actions[e.target.dataset.action](e.target, e);
  }
});
document.addEventListener('input', (e) => {
  const fn = Inputs[e.target.dataset && e.target.dataset.input];
  if (fn) fn(e.target, e);
});
document.addEventListener('change', (e) => {
  const fn = Changes[e.target.dataset && e.target.dataset.change];
  if (fn) fn(e.target, e);
});

try { if (localStorage.getItem('modus.sb')) document.body.classList.add('sb-collapsed'); } catch (e) {}
window.addEventListener('hashchange', () => { closeDrawer(); App.render(); });
App.render();
