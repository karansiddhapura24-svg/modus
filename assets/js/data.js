/* MODUS data layer: seed data + a tiny persisted store (localStorage). */
const IMG = 'assets/img/';

const SEED = {
  session: null, // { name, email, accountType, workStyle, profession, onboarded }
  accounts: [], // local accounts: { name, email, hash, onboarded, ... }
  workspace: 'sample', // 'sample' (demo data) | 'fresh' (empty first-time workspace)
  studio: "Karan's Studio",
  user: { first: 'Karan' },

  clients: [
    { id: 'jd-cafe', name: "JD Cafe's", title: "JD'S Cafe", type: 'Retainer', logo: 'logo-jdcafe.png', project: 'September Multi - Channel Campaign', total: 3, review: 'Reel 04 in Review', archived: false, email: 'hello@jdcafe.in' },
    { id: 'taskroning', name: 'Taskroning', title: 'Taskroning', type: 'One - Time', logo: 'logo-jdcafe.png', project: 'Instagram Reel', total: 5, review: 'Reel 06 in Review', archived: false, email: 'team@taskroning.com' },
    { id: 'pixora', name: 'Pixora', title: 'Pixora', type: 'One - Time', logo: 'logo-jdcafe.png', project: 'Videography', total: 10, review: 'Reel 06 in Review', archived: false, email: 'studio@pixora.io' },
    { id: 'apna-pg', name: 'Apna PG', title: 'Apna PG', type: 'Retainer', logo: 'logo-jdcafe.png', project: 'PG Shoot', total: 24, review: 'Reel 12 in Review', archived: false, email: 'contact@apnapg.in' },
    { id: 'planzy', name: 'Planzy', title: 'Planzy', type: 'Retainer', logo: 'logo-jdcafe.png', project: 'Map Video Edit', total: 12, review: 'Reel 04 in Review', archived: false, email: 'ops@planzy.app' },
    { id: 'attendx', name: 'AttendX', title: 'AttendX', type: 'One - Time', logo: 'logo-jdcafe.png', project: 'School Shoot', total: 3, review: 'Reel 07 in Review', archived: false, email: 'hello@attendx.com' },
    { id: 'parth-media', name: 'Parth Media', title: 'Parth Media', type: 'One - Time', logo: 'logo-parth.png', project: 'Brand Film', total: 2, review: 'Reel 02 in Review', archived: true, email: 'accounts@parthmedia.in' },
  ],
  clientStats: { total: 13, retainers: 5, pending: 15, completed: 12 },

  /* Kanban projects */
  projects: [
    { id: 'p1', clientId: 'jd-cafe', client: "JD Cafe's", logo: 'logo-jdcafe.png', title: 'Pizza Trending Reel', status: 'new', team: 1, spent: 500, budget: 2000, paid: 1000, due: '2026-10-15', revUsed: 0, revTotal: 3, category: 'Social Media Campaign', brief: 'Short 60 second cinematic teaser type', start: '2026-10-01', member: 'Karan Patel (Videographer)' },
    { id: 'p2', clientId: null, client: 'Rudra Tech', logo: 'logo-rudra.png', title: 'AI Generated Reel', status: 'progress', team: 1, spent: 0, budget: 1500, paid: 0, due: '2026-10-24', revUsed: 0, revTotal: 1, category: 'AI Video', brief: '', start: '2026-10-05', member: 'Jay Patel (Video editor)' },
    { id: 'p3', clientId: 'jd-cafe', client: "JD Cafe's", logo: 'logo-jdcafe.png', title: 'Product Intro', status: 'progress', team: 2, spent: 1000, budget: 1000, paid: 1000, due: '2026-10-15', revUsed: 2, revTotal: 3, category: 'Product Video', brief: '', start: '2026-10-02', member: 'Rahul Mehta (Videographer)' },
    { id: 'p4', clientId: null, client: 'Pizza Hub', logo: 'logo-pizzahub.png', title: 'Instagram Post', status: 'review', team: 1, spent: 0, budget: 500, paid: 0, due: '2026-10-12', revUsed: 0, revTotal: 2, category: 'Social Media Campaign', brief: '', start: '2026-10-03', member: 'Yash Solanki (Videographer)' },
    { id: 'p5', clientId: 'jd-cafe', client: "JD Cafe's", logo: 'logo-jdcafe.png', title: 'Model Reel', status: 'review', team: 1, spent: 500, budget: 2000, paid: 500, due: '2026-10-15', revUsed: 0, revTotal: 3, category: 'Model Shoot', brief: '', start: '2026-10-01', member: 'Karan Patel (Videographer)' },
  ],
  drafts: [],

  deliverables: [
    { id: 'd1', title: 'Instagram Reel 01', delivered: '18 Sept 2026', status: 'review', revUsed: 1, revTotal: 3, notes: '2 new notes(01:04 PM, 2:30 PM)', thumb: 'thumb-reel.png' },
    { id: 'd2', title: 'Product Reel', delivered: '16 Sept 2026', status: 'approved', revUsed: 2, revTotal: 3, thumb: 'thumb-product.png' },
    { id: 'd3', title: 'Model Shoot', delivered: '15 Sept 2026', status: 'revision', revUsed: 3, revTotal: 3, thumb: 'thumb-model.png' },
  ],

  /* Billing (global) */
  invoices: [
    { id: 'b1', kind: 'invoice', client: "JP Pizza's", project: 'Social Media Campaign', logo: 'logo-jppizza.png', no: 'INV - 024', amount: 1000, due: '2026-09-30', dueLabel: '30 SEPT 2026', status: 'pending', email: 'billing@jppizza.in' },
    { id: 'b2', kind: 'invoice', client: 'Eagle CNC', project: 'Model Reel', logo: 'logo-eagle.png', no: 'INV - 026', amount: 1500, due: '2026-11-01', dueLabel: '1st NOV 2026', status: 'received', email: 'accounts@eaglecnc.com' },
    { id: 'b3', kind: 'invoice', client: 'Taskroning', project: 'Instagram Reel', logo: 'logo-taskroning.png', no: 'INV - 030', amount: 3000, due: '2026-11-14', dueLabel: '14 NOV 2026', status: 'overdue', email: 'team@taskroning.com' },
    { id: 'b4', kind: 'team', client: 'Rahul Mehta', project: 'September Multi - Channel Campaign', logo: 'avatar-rahul.png', no: 'PAY - 011', amount: 4000, due: '2026-10-20', dueLabel: '20 OCT 2026', status: 'pending', email: 'rahul@modus.team' },
    { id: 'b5', kind: 'invoice', client: "JD Cafe's", project: 'September Retainer', logo: 'logo-jdcafe.png', no: 'INV - 031', amount: 30000, due: '2026-10-30', dueLabel: '30 OCT 2026', status: 'pending', email: 'hello@jdcafe.in' },
    { id: 'b6', kind: 'team', client: 'Jay Patel', project: 'September Multi - Channel Campaign', logo: 'avatar-jay.png', no: 'PAY - 012', amount: 1000, due: '2026-10-18', dueLabel: '18 OCT 2026', status: 'received', email: 'jay@modus.team' },
    { id: 'b7', kind: 'invoice', client: 'Parth Media', project: 'Brand Film', logo: 'logo-parth.png', no: 'INV - 019', amount: 2000, due: '2026-10-05', dueLabel: '5 OCT 2026', status: 'overdue', email: 'accounts@parthmedia.in' },
    { id: 'b8', kind: 'team', client: 'Yash Solanki', project: 'September Multi - Channel Campaign', logo: 'avatar-yash.png', no: 'PAY - 013', amount: 7000, due: '2026-10-28', dueLabel: '28 OCT 2026', status: 'pending', email: 'yash@modus.team' },
    { id: 'b9', kind: 'invoice', client: 'Eagle CNC', project: 'Product Showcase', logo: 'logo-eagle.png', no: 'INV - 032', amount: 2500, due: '2026-10-22', dueLabel: '22 OCT 2026', status: 'received', email: 'accounts@eaglecnc.com' },
  ],

  /* Client > payments */
  payments: [
    { id: 'c1', no: 'INV - 024', desc: 'September Retainer', amount: 30000, dueLabel: '30 SEPT 2026', status: 'pending' },
    { id: 'c2', no: 'INV - 025', desc: 'Food Shoot', amount: 5000, dueLabel: '31 SEPT 2026', status: 'paid' },
    { id: 'c3', no: 'INV - 026', desc: 'Viral Concept', amount: 1000, dueLabel: '1 OCT 2026', status: 'pending' },
    { id: 'c4', no: 'INV - 027', desc: 'Overview', amount: 2000, dueLabel: '3 OCT 2026', status: 'pending' },
    { id: 'c5', no: 'INV - 028', desc: 'Product Showcasing', amount: 550, dueLabel: '10 OCT 2026', status: 'paid' },
    { id: 'c6', no: 'INV - 029', desc: 'Festive Teaser', amount: 3500, dueLabel: '12 OCT 2026', status: 'paid' },
    { id: 'c7', no: 'INV - 030', desc: 'Menu Photoshoot', amount: 4000, dueLabel: '14 OCT 2026', status: 'pending' },
    { id: 'c8', no: 'INV - 031', desc: 'October Retainer', amount: 30000, dueLabel: '30 OCT 2026', status: 'pending' },
    { id: 'c9', no: 'INV - 032', desc: 'Story Pack', amount: 1200, dueLabel: '2 NOV 2026', status: 'paid' },
    { id: 'c10', no: 'INV - 033', desc: 'Behind The Scenes', amount: 800, dueLabel: '5 NOV 2026', status: 'pending' },
    { id: 'c11', no: 'INV - 034', desc: 'Chef Interview', amount: 2500, dueLabel: '8 NOV 2026', status: 'pending' },
  ],

  retainer: {
    monthly: 30000, delivered: 15, deliverables: 30, revUsed: 2, revTotal: 3,
    period: '01 Sept - 30 Sep', nextBilling: '01 Oct 2026', scope: '12 Deliverables',
    log: [
      { name: 'Reel 01 - Collection Teaser', format: 'Video', status: 'Approved', rev: '1/3' },
      { name: 'Reel 02 - Intro Video', format: 'Photo', status: 'Pending', rev: '0/2' },
      { name: 'Reel 03 - Mug Video', format: 'Video', status: 'Approved', rev: '1/3' },
      { name: 'Reel 04 - Unboxing Video', format: 'Photo', status: 'Pending', rev: '2/3' },
      { name: 'Reel 05 - Customer Review', format: 'Photo', status: 'Pending', rev: '1/3' },
    ],
  },

  team: [
    { id: 't1', name: 'Rahul Mehta', role: 'Videographer', avatar: 'avatar-rahul.png', project: 'September Multi - Channel Campaign', total: 3, amount: 4000, paid: false },
    { id: 't2', name: 'Jay Patel', role: 'Video editor', avatar: 'avatar-jay.png', project: 'September Multi - Channel Campaign', total: 1, amount: 1000, paid: true },
    { id: 't3', name: 'Yash Solanki', role: 'Videographer', avatar: 'avatar-yash.png', project: 'September Multi - Channel Campaign', total: 2, amount: 7000, paid: false },
  ],
  members: ['Karan Patel (Videographer)', 'Rahul Mehta (Videographer)', 'Jay Patel (Video editor)', 'Yash Solanki (Videographer)'],

  meetings: {
    upcoming: [
      { id: 'm1', platform: 'Google Meet', title: 'Instagram Campaign Mid-Review', when: 'Tomorrow, Oct 02 - 4:00 PM', startsIn: 'Starts In 22 HR', attendees: 'Yash Solanki, Umang Donga', link: 'https://meet.google.com/' },
    ],
    past: [
      { id: 'm2', date: 'Sept 04', title: 'September Campaign Mid-Review', notes: '• Client approved the overall reel direction.\n• Reduce intro length to under 3 seconds.\n• Swap background track for the lo-fi option.\n• Final delivery moved to Sept 18.' },
      { id: 'm3', date: 'Aug 04', title: 'August Campaign', notes: '• Kick-off for the August social campaign.\n• 5 reels + 10 stories agreed as scope.\n• Shoot day confirmed at the café on Aug 09.' },
    ],
  },

  attention: [
    { id: 'a1', dot: 'green', logo: 'logo-jppizza.png', title: 'Reel 03 - Sept Campaign', sub: ['Social Media Campaign', 'Client feedback pending'], meta: { icon: 'comment', text: '2 Comments' }, action: 'Review Feedback', route: '#/projects/p1/deliverable' },
    { id: 'a2', dot: 'green', logo: 'logo-vcheck.png', title: 'Product Video - Final', sub: ['Campaign', 'Approval Pending'], meta: { icon: 'clock', text: 'Due tomorrow' }, action: 'View Project', route: '#/projects/p3/deliverable' },
    { id: 'a3', dot: 'red', logo: 'logo-parth.png', title: 'Payment Overdue', sub: ['Parth Media', '₹ 2,000/-'], meta: { icon: 'rupee', text: '2,000/-' }, action: 'Send Reminder', remind: 'Parth Media' },
  ],
  dashStats: { revenue: 145000, received: 120000, expenses: 25000, balance: 95000 },

  settings: {
    dueDays: 7, overCharge: 500,
    notify: { payments: true, feedback: true, deadlines: true, messages: true },
  },

  dashPrefs: {
    order: ['stats', 'attention', 'revenue', 'deadlines', 'overview'],
    show: { stats: true, attention: true, revenue: true, deadlines: false, overview: false },
    cards: { revenue: true, received: true, expenses: true, balance: true },
    series: { earned: true, received: true, payouts: true },
    months: 6,
    greeting: true,
  },

  conversations: [
    { id: 'jd-cafe', name: "JD'S Cafe", avatar: 'logo-jdcafe.png', sub: 'Client · Retainer', link: '#/clients/jd-cafe/projects', unread: 2, msgs: [
      { me: false, t: 'Hi Karan! We went through the September reels this morning.', at: '2026-10-24T09:41' },
      { me: true, t: 'Great, thanks! Anything you want changed?', at: '2026-10-24T09:55' },
      { me: false, t: 'Reel 03 looks lovely. Could the intro be under 3 seconds?', at: '2026-10-24T10:02' },
      { me: false, t: 'Also left 2 comments at 00:14 and 01:02 🙌', at: '2026-10-24T10:03' },
    ] },
    { id: 'yash', name: 'Yash Solanki', avatar: 'avatar-yash.png', sub: 'Team · Videographer', link: '#/team', unread: 1, msgs: [
      { me: true, t: 'Can you share the raw footage from the café shoot?', at: '2026-10-23T16:20' },
      { me: false, t: 'Uploading to the project now, should be done in an hour.', at: '2026-10-23T16:31' },
    ] },
    { id: 'rahul', name: 'Rahul Mehta', avatar: 'avatar-rahul.png', sub: 'Team · Videographer', link: '#/team', unread: 0, msgs: [
      { me: false, t: 'Shoot for the Model Reel is confirmed for Friday.', at: '2026-10-22T11:05' },
      { me: true, t: 'Perfect, I’ll block the studio.', at: '2026-10-22T11:12' },
    ] },
    { id: 'jay', name: 'Jay Patel', avatar: 'avatar-jay.png', sub: 'Team · Video editor', link: '#/team', unread: 0, msgs: [
      { me: true, t: 'Payment for September is settled. Thanks for the quick turnaround!', at: '2026-10-20T18:40' },
      { me: false, t: 'Received, thank you 🙏', at: '2026-10-20T18:52' },
    ] },
    { id: 'parth-media', name: 'Parth Media', avatar: 'logo-parth.png', sub: 'Client · One - Time', link: '#/billing', unread: 0, msgs: [
      { me: true, t: 'Hi! Gentle reminder that INV - 019 (₹2,000) is now overdue.', at: '2026-10-18T10:00' },
    ] },
  ],

  revenue: {
    months: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    year: 2024,
    earned:   [72000, 80000, 76000, 90000, 98000, 94000, 99000, 105000, 135000, 148000, 150000, 245000],
    received: [60000, 64000, 70000, 72000, 80000, 82000, 86000, 88000, 110000, 120000, 125000, 210000],
    payouts:  [26000, 28000, 27000, 30000, 31000, 30000, 32000, 30000, 35000, 38000, 40000, 48000],
  },
};

/* ---------- Client-portal links for the sample data ----------
   The sample client screens (payments, deliverables, meetings) belong to JD'S Cafe. */
const SAMPLE_OWNER = 'jd-cafe';
const DELIVERABLE_PROJECT = { d1: 'p1', d2: 'p3', d3: 'p5' };
const SAMPLE_COMMENTS = [
  { id: 'cm1', by: 'client', name: "JD'S Cafe", ts: '00:14', text: 'Love the opening! Could the intro be under 3 seconds?', at: '2026-10-24T13:04' },
  { id: 'cm2', by: 'client', name: "JD'S Cafe", ts: '01:02', text: 'Can we hold this plating shot a beat longer?', at: '2026-10-24T14:30' },
];
function linkSampleOwnership(st) {
  (st.deliverables || []).forEach((d) => {
    if (!('clientId' in d)) d.clientId = SAMPLE_OWNER;
    if (!('projectId' in d)) d.projectId = DELIVERABLE_PROJECT[d.id] || null;
    if (!d.comments) d.comments = d.id === 'd1' ? clone(SAMPLE_COMMENTS) : [];
  });
  (st.payments || []).forEach((p) => { if (!('clientId' in p)) p.clientId = SAMPLE_OWNER; });
  const m = st.meetings || {};
  [...(m.upcoming || []), ...(m.past || [])].forEach((x) => { if (!('clientId' in x)) x.clientId = SAMPLE_OWNER; });
  if (!st.portalFiles) {
    st.portalFiles = [
      { id: 'f1', clientId: SAMPLE_OWNER, name: 'JD-Cafe-Brand-Guidelines.pdf', size: 2400000, by: 'client', at: '2026-10-08T11:20' },
      { id: 'f2', clientId: SAMPLE_OWNER, name: 'October-Menu-Photos.zip', size: 18400000, by: 'client', at: '2026-10-12T16:05' },
      { id: 'f3', clientId: SAMPLE_OWNER, name: 'Shot-List-Reel-03.pdf', size: 320000, by: 'creator', at: '2026-10-14T10:40' },
    ];
  }
  return st;
}

/* Team code a client uses to join their portal, e.g. JD'S Cafe -> MODUS-JDC7K5. */
const codeFor = (c) => c.code || `MODUS-${c.id.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase()}${c.id.length % 10}K5`;

/* Deep copy that also works in browsers without structuredClone. */
const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

const Store = {
  KEY: 'modus.v1',
  state: null,
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      this.state = raw ? Object.assign(clone(SEED), JSON.parse(raw)) : clone(SEED);
    } catch (e) {
      this.state = clone(SEED);
    }
    if ((this.state.workspace || 'sample') === 'sample') linkSampleOwnership(this.state);
    else if (!this.state.portalFiles) this.state.portalFiles = [];
    return this.state;
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.state)); } catch (e) { /* storage unavailable */ }
  },
  /* Restore sample data but keep who is signed in, their accounts and settings. */
  reset() {
    const keep = this.state ? { session: this.state.session, accounts: this.state.accounts, settings: this.state.settings, dashPrefs: this.state.dashPrefs, studio: this.state.studio, user: this.state.user } : {};
    this.state = linkSampleOwnership(Object.assign(clone(SEED), keep));
    this.save();
  },
};
Store.load();

/* ---------- Workspaces: sample data vs. a clean first-time workspace ---------- */
const WORKSPACE_KEYS = ['clients', 'projects', 'drafts', 'deliverables', 'invoices', 'payments', 'retainer', 'team', 'members', 'meetings', 'attention', 'dashStats', 'revenue', 'conversations', 'clientStats', 'portalFiles'];
const isFresh = () => Store.state.workspace === 'fresh';

function emptyWorkspace() {
  const me = (Store.state.session && Store.state.session.name) || 'You';
  return {
    clients: [], projects: [], drafts: [], deliverables: [], invoices: [], payments: [], team: [], conversations: [], attention: [], portalFiles: [],
    retainer: { monthly: 0, delivered: 0, deliverables: 0, revUsed: 0, revTotal: 0, period: '—', nextBilling: '—', scope: '—', log: [] },
    members: [`${me} (You)`],
    meetings: { upcoming: [], past: [] },
    dashStats: { revenue: 0, received: 0, expenses: 0, balance: 0 },
    revenue: clone(SEED.revenue),
    clientStats: { total: 0, retainers: 0, pending: 0, completed: 0 },
  };
}
/* Swap the working data set, keeping the other one so switching back loses nothing. */
function switchWorkspace(to) {
  const st = Store.state;
  if ((st.workspace || 'sample') === to) return;
  const current = Object.fromEntries(WORKSPACE_KEYS.map((k) => [k, st[k]]));
  if (to === 'fresh') { st.sampleData = current; Object.assign(st, st.freshData || emptyWorkspace()); }
  else { st.freshData = current; Object.assign(st, st.sampleData || clone(Object.fromEntries(WORKSPACE_KEYS.map((k) => [k, SEED[k]])))); linkSampleOwnership(st); }
  st.workspace = to;
  Store.save();
}

/* Image helper: bundled file names, or a data: URI (generated initials avatars). */
const src = (f) => (/^data:/.test(f || '') ? f : IMG + (f || 'logo-jdcafe.png'));
const AVATAR_COLORS = ['#4F37FF', '#7662FF', '#069D4C', '#D39C01', '#E3576B', '#2C8DD6', '#A24BD8'];
function initialsAvatar(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  const ini = ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  const color = AVATAR_COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="32" fill="${color}"/><text x="32" y="41" font-family="Poppins,Arial,sans-serif" font-size="24" font-weight="600" fill="#fff" text-anchor="middle">${ini.replace(/[<&>]/g, '')}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* ---------- Formatting helpers ---------- */
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const money = (n) => Number(n).toLocaleString('en-IN');
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDay = (iso) => { const d = parseISO(iso); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; };
const fmtLong = (iso) => { const d = parseISO(iso); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`; };
const fmtUpper = (iso) => { const d = parseISO(iso); const m = d.getMonth() === 8 ? 'SEPT' : MONTHS_SHORT[d.getMonth()].toUpperCase(); return `${d.getDate()} ${m} ${d.getFullYear()}`; };
const uid = (p) => p + Math.random().toString(36).slice(2, 8);
