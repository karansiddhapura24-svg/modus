/* Projects kanban, Create/Edit Project drawer, project detail. */
const PJ = ui('projects', { q: '', client: '' });
const COLUMNS = [['new', 'New', 'purple'], ['progress', 'In Progress', 'red'], ['review', 'In Review', 'green']];
const STATUS_LABEL = { new: 'New', progress: 'In Progress', review: 'In Review' };

function kanbanCard(p) {
  const pct = p.budget ? Math.min(100, (p.spent / p.budget) * 100) : 0;
  return `<a class="kcard" href="#/projects/${p.id}/deliverable" draggable="true" data-id="${p.id}">
    <div class="kc-top"><img src="${src(p.logo)}" alt="" /><span>${esc(p.client)}</span><span class="tm">${icon('idCard', 14)}${p.team} Team Member${p.team === 1 ? '' : 's'}</span></div>
    <h4 class="kc-title">${esc(p.title)}</h4>
    <div class="kc-budget"><span>Budget Progress</span><b>${RS} ${money(p.spent)} / ${money(p.budget)}</b></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="kc-tags"><span class="ktag">${icon('calendar', 14)}Due ${fmtDay(p.due)}</span><span class="ktag">${icon('history', 14)}${p.revUsed}/${p.revTotal} Revs</span></div>
  </a>`;
}

Pages.projects = () => {
  const s = S();
  const clients = [...new Set(s.projects.map((p) => p.client))];
  const q = PJ.q.toLowerCase();
  const visible = s.projects.filter((p) => (!PJ.client || p.client === PJ.client) && (!q || (p.title + ' ' + p.client).toLowerCase().includes(q)));
  const cols = COLUMNS.map(([k, label, dot]) => {
    const items = visible.filter((p) => p.status === k);
    return `<section class="col" data-status="${k}">
      <div class="col-head"><span class="dot ${dot}"></span><h3>${label}</h3><span class="count">${items.length}</span>
        <button class="add" data-action="create-project" data-status="${k}" aria-label="Add to ${label}">${icon('plus', 22, '', 1.3)}</button></div>
      <div class="col-cards">${items.map(kanbanCard).join('') || (!s.projects.length && k === 'new'
        ? `<div class="col-empty first"><b>No projects yet</b><span>Create your first project to track its budget, deadline and revisions.</span><button class="btn btn-primary btn-sm" data-action="create-project" data-status="new">${icon('plus', 16, '', 1.6)}Create project</button></div>`
        : `<div class="col-empty">${s.projects.length ? 'Drop projects here' : 'Projects move here as work progresses'}</div>`)}</div>
    </section>`;
  }).join('');
  const html = `
    <div class="page-head proj-head">
      <div><h1>Projects</h1><p>Keep every project, deliverable, and deadline on track.</p></div>
      <button class="btn btn-primary" data-action="create-project">${icon('plus', 24, '', 1.6)}Create</button>
    </div>
    <div class="proj-filter">
      <label class="proj-search">${icon('search', 22)}<input type="search" placeholder="Search your projects..." value="${esc(PJ.q)}" data-input="proj-q" /></label>
      <select class="client-filter" data-change="proj-client" aria-label="Filter by client">
        <option value="">All Clients</option>${clients.map((c) => `<option ${PJ.client === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
      </select>
    </div>
    <div class="board">${cols}</div>`;
  return { html: shell('projects', html), mount: mountBoard };
};

function mountBoard() {
  let dragId = null;
  $$('.kcard').forEach((card) => {
    card.addEventListener('dragstart', (e) => { dragId = card.dataset.id; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  $$('.col').forEach((col) => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over'); });
    col.addEventListener('drop', (e) => {
      e.preventDefault(); col.classList.remove('drag-over');
      const p = S().projects.find((x) => x.id === (dragId || e.dataTransfer.getData('text/plain')));
      if (p && p.status !== col.dataset.status) {
        p.status = col.dataset.status; Store.save(); App.render();
        toast(`${p.title} moved to ${STATUS_LABEL[p.status]}`);
      }
    });
  });
}
Inputs['proj-q'] = (el) => { PJ.q = el.value; App.render({ keepFocus: el }); };
Changes['proj-client'] = (el) => { PJ.client = el.value; App.render(); };

/* ---------------------------------------------------------
   Create / Edit Project drawer
   --------------------------------------------------------- */
function clientOptions() {
  return [...new Set([...(isFresh() ? [] : ['JP Pizza']), ...S().clients.filter((c) => !c.archived).map((c) => c.name), ...S().projects.map((p) => p.client)])];
}
const CATEGORIES = ['Social Media Campaign', 'Product Video', 'Model Shoot', 'AI Video', 'Brand Film', 'Event Coverage'];
const STATUS_OPTS = [['progress', 'In Progress', 'red'], ['new', 'New', 'purple'], ['review', 'In Review', 'green']];

function openProjectDrawer(opts = {}) {
  if (!opts.project && !clientOptions().length) { toast('Add your first client before creating a project'); Actions['new-client'](); return; }
  const edit = opts.project;
  const draft = !edit && S().drafts[0];
  const v = edit || draft || {};
  const status = opts.status || v.status || 'progress';
  const today = new Date().toISOString().slice(0, 10);
  const plus4 = new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10);
  const client = opts.client || v.client || '';
  const sel = (name, options, value, ph) => `<select class="select ${value ? 'filled' : ''}" name="${name}">${ph ? `<option value="">${ph}</option>` : ''}${options.map((o) => `<option ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const members = S().members;
  const raw = v.raw || 'upload';
  const rawOpt = (k, ic, t, sub) => `<button type="button" class="raw-opt ${raw === k ? 'selected' : ''}" data-action="raw-opt" data-v="${k}">
    ${icon(ic, 22)}<span class="radio">${raw === k ? icon('check', 13, '', 2) : ''}</span><b>${t}</b><small>${sub}</small></button>`;

  openDrawer(`
    <form id="project-form" novalidate style="display:contents">
    <div class="drawer-body">
      <h2>${edit ? 'Edit Project' : 'Create New Project'}</h2>
      <h3>1. Project Details</h3>
      <div class="fgrid">
        <div class="field full"><label for="pf-name">Project Name</label><input id="pf-name" class="input ${v.title ? 'filled' : ''}" name="title" placeholder="AI Animated Video" value="${esc(v.title || '')}" /></div>
        <div class="field"><label>Client</label>${sel('client', clientOptions(), client || 'JP Pizza')}</div>
        <div class="field"><label>Team Member</label>${sel('member', members, v.member || '')}</div>
        <div class="field"><label>Client</label>${sel('client2', clientOptions(), v.client2 || client || 'JP Pizza')}</div>
        <div class="field"><label>Team Member</label>${sel('member2', members, v.member2 || members[0])}</div>
        <div class="field"><label>Project Category</label>${sel('category', CATEGORIES, v.category || CATEGORIES[0])}</div>
        <div class="field"><label>Project Status</label><div class="select-dot"><span class="dot ${STATUS_OPTS.find((s) => s[0] === status)[2]}" id="pf-dot"></span>
          <select class="select" name="status" id="pf-status">${STATUS_OPTS.map(([k, l]) => `<option value="${k}" ${k === status ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
        <div class="field gap-lg"><label>Start Date</label>${dateButton('start', v.start || today)}</div>
        <div class="field gap-lg"><label>Deadline</label>${dateButton('due', v.due || plus4)}</div>
        <div class="field full" style="margin-top:8px"><label for="pf-brief">Project Brief</label><textarea id="pf-brief" class="textarea" name="brief" placeholder="Short 60 second cinematic teaser type">${esc(v.brief || '')}</textarea></div>
        <div class="field full"><span class="lbl">Revision Policy</span>
          <div class="policy">
            <div class="policy-box"><span class="lbl">Included Revision</span>
              <div class="stepper"><button type="button" data-action="rev-step" data-d="1" aria-label="Increase">${icon('plus', 22, '', 1.6)}</button><span id="pf-rev">${v.revTotal ?? 3}</span><button type="button" data-action="rev-step" data-d="-1" aria-label="Decrease"><svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path d="M4 12h16"/></svg></button></div>
              <input type="hidden" name="revTotal" value="${v.revTotal ?? 3}" /></div>
            <div class="policy-box"><span class="lbl">Over Revision Charge</span>
              <label class="charge"><span>${RS}</span><input name="charge" inputmode="numeric" value="${esc(v.charge ?? S().settings.overCharge)}" aria-label="Charge per extra revision" style="flex:0 0 auto;width:${String(v.charge ?? S().settings.overCharge).length + 0.6}ch" oninput="this.value=this.value.replace(/\\D/g,'');this.style.width=(this.value.length+0.6)+'ch'" /><span style="flex:1;margin-left:-6px">/-</span><span>/ Revision</span></label></div>
          </div>
        </div>
      </div>
      <h3 style="margin-top:28px">2. Raw Files</h3>
      <input type="hidden" name="raw" value="${raw}" />
      <div class="raw-opts">
        ${rawOpt('upload', 'folderPlus', 'I have raw files', 'Direct upload now')}
        ${rawOpt('elsewhere', 'folderLock', 'Stored elsewhere', 'Drive, dropbox, etc')}
        ${rawOpt('skip', 'skip', 'Skip for now', 'Upload later')}
      </div>
      <div class="dropzone ${raw === 'upload' ? '' : 'hidden'}" id="pf-drop" tabindex="0" role="button">${icon('upload', 18)}<span>Drag and drop media or browse</span></div>
      <input class="input ${raw === 'elsewhere' ? '' : 'hidden'}" id="pf-link" name="rawLink" type="url" placeholder="Paste Drive / Dropbox link" value="${esc(v.rawLink || '')}" style="margin-top:15px" />
      <div class="ferr" hidden></div>
    </div>
    <div class="drawer-foot">
      <button type="button" class="btn cancel" data-action="close-drawer">Cancel</button>
      ${edit ? '' : '<button type="button" class="btn draft" data-action="save-draft">Save Draft</button>'}
      <button type="submit" class="btn btn-primary">${edit ? 'Save Changes' : 'Create Project'} ${icon('arrowRight', 22)}</button>
    </div>
    </form>`, (drawer) => {
    const form = $('#project-form', drawer);
    let files = v.files || [];
    wireDropzone($('#pf-drop', drawer), (list) => { files = list.map((f) => f.name); });
    $('#pf-status', drawer).addEventListener('change', (e) => { $('#pf-dot', drawer).className = 'dot ' + STATUS_OPTS.find((s) => s[0] === e.target.value)[2]; });
    const collect = () => ({ ...Object.fromEntries(new FormData(form).entries()), files });
    form._collect = collect;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = collect();
      const err = $('.ferr', form);
      if (!d.title.trim()) { err.hidden = false; err.textContent = 'Please enter a project name.'; $('#pf-name', form).focus(); return; }
      if (d.due < d.start) { err.hidden = false; err.textContent = 'Deadline must be on or after the start date.'; return; }
      const c = S().clients.find((x) => x.name === d.client);
      const fields = {
        title: d.title.trim(), client: d.client, clientId: c ? c.id : null, logo: c ? c.logo : (S().projects.find((p) => p.client === d.client) || {}).logo || (d.client === 'JP Pizza' ? 'logo-jppizza.png' : initialsAvatar(d.client)),
        status: d.status, category: d.category, start: d.start, due: d.due, brief: d.brief, revTotal: +d.revTotal, charge: d.charge,
        member: d.member, member2: d.member2, client2: d.client2, raw: d.raw, rawLink: d.rawLink, files,
        team: new Set([d.member, d.member2].filter(Boolean)).size || 1,
      };
      if (edit) {
        Object.assign(edit, fields, { revUsed: Math.min(edit.revUsed, fields.revTotal) });
        toast('Project updated');
      } else {
        S().projects.push({ id: uid('p'), spent: 0, budget: 0, paid: 0, revUsed: 0, ...fields });
        S().drafts = [];
        toast(`${fields.title} created`);
      }
      Store.save(); closeDrawer(); App.render();
    });
  });
}
Actions['create-project'] = (el) => openProjectDrawer({ status: el.dataset.status });
Actions['new-project'] = (el) => {
  const c = S().clients.find((x) => x.id === el.dataset.client);
  openProjectDrawer({ client: c && c.name });
};
Actions['edit-project'] = (el) => openProjectDrawer({ project: S().projects.find((p) => p.id === el.dataset.id) });
Actions['rev-step'] = (el) => {
  const form = el.closest('form');
  const inp = form.elements.revTotal;
  const n = Math.max(0, Math.min(20, +inp.value + +el.dataset.d));
  inp.value = n; $('#pf-rev', form).textContent = n;
};
Actions['raw-opt'] = (el) => {
  const form = el.closest('form');
  form.elements.raw.value = el.dataset.v;
  $$('.raw-opt', form).forEach((b) => {
    const on = b === el;
    b.classList.toggle('selected', on);
    $('.radio', b).innerHTML = on ? icon('check', 13, '', 2) : '';
  });
  $('#pf-drop', form).classList.toggle('hidden', el.dataset.v !== 'upload');
  $('#pf-link', form).classList.toggle('hidden', el.dataset.v !== 'elsewhere');
};
Actions['save-draft'] = (el) => {
  const form = el.closest('form');
  S().drafts = [form._collect()];
  Store.save(); closeDrawer(); toast('Draft saved');
};

/* ---------------------------------------------------------
   Project detail
   --------------------------------------------------------- */
const PTABS = [['deliverable', 'Deliverable', 'fileTab'], ['payments', 'Payments & Invoice', 'monitorList'], ['team', 'Team & Their Payments', 'idCard'], ['details', 'Details', 'info']];
const PD = ui('projectDetail', { sub: 'all' });

Pages.project = ({ id, tab = 'deliverable' }) => {
  const p = S().projects.find((x) => x.id === id);
  if (!p) return { html: shell('projects', '<div class="empty-row">Project not found. <a href="#/projects" class="c-primary">Back to projects</a></div>') };
  const clientTitle = (S().clients.find((c) => c.id === p.clientId) || {}).title || p.client;
  let body = '';
  if (tab === 'deliverable') {
    body = `<div class="split">
      <div>${deliverableSubtabs('proj-sub', PD.sub)}${deliverableCards(PD.sub)}</div>
      <div class="share-box"><h4>Share Deliverables</h4>
        <div class="dropzone" id="share-drop" tabindex="0" role="button">${icon('upload', 18)}<span>Drag and drop media or browse</span></div></div>
    </div>`;
  } else if (tab === 'payments') {
    UI.projPay = UI.projPay || { sub: 'all', page: 1 };
    body = paymentsTable('projPay', UI.projPay);
  } else if (tab === 'team') {
    body = teamCards(S().team);
  } else {
    const raw = { upload: 'Uploaded to MODUS', elsewhere: p.rawLink || 'Stored elsewhere', skip: 'Upload later' }[p.raw || 'upload'];
    body = `<section class="card details-card">
      <h2 class="card-title" style="font-weight:400">Project Details</h2>
      ${[['Client', p.client], ['Category', p.category || '—'], ['Status', STATUS_LABEL[p.status]], ['Team Member', p.member || '—'], ['Start Date', p.start ? fmtLong(p.start) : '—'], ['Deadline', fmtLong(p.due)],
        ['Included Revisions', `${p.revUsed} / ${p.revTotal} used`], ['Over Revision Charge', `${RS} ${p.charge || 500}/- per revision`], ['Raw Files', raw], ['Brief', p.brief || '—']]
        .map(([k, v]) => `<div class="srow"><span>${k}</span><span style="text-align:right">${esc(v)}</span></div>`).join('')}
    </section>`;
  }
  const html = `<div class="proj-detail">
    <div class="page-head proj-detail-head">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/projects">Projects</a>${icon('arrowRight', 16)}<span>${esc(clientTitle)} Projects</span></nav>
      <div class="page-actions">
        <button class="btn btn-white" data-action="edit-project" data-id="${p.id}">${icon('edit', 22)}Edit Project</button>
        <button class="btn btn-white" data-action="share-portal" data-id="${p.id}">${icon('upload', 22)}Share Portal</button>
      </div>
    </div>
    <div class="stats">
      ${statCard('TOTAL BUDGET', 'wallet', rupee(money(p.budget)))}
      ${statCard('PAID', 'cardCheck', rupee(money(p.paid)))}
      ${statCard('REMAINING BALANCE', 'banknote', rupee(money(Math.max(0, p.budget - p.paid))))}
      ${statCard('DEADLINE', 'calendar', plainVal(fmtDay(p.due)))}
    </div>
    <nav class="ptabs">${PTABS.map(([k, l, ic]) => `<a class="ptab ${k === tab ? 'active' : ''}" href="#/projects/${p.id}/${k}">${icon(ic, 18)}${l}</a>`).join('')}</nav>
    ${body}
  </div>`;
  return {
    html: shell('projects', html),
    mount() {
      const z = $('#share-drop');
      if (z) wireDropzone(z, (files) => {
        const today = new Date();
        const label = `${today.getDate()} ${today.getMonth() === 8 ? 'Sept' : MONTHS_SHORT[today.getMonth()]} ${today.getFullYear()}`;
        files.forEach((f) => S().deliverables.unshift({ id: uid('d'), title: f.name.replace(/\.[^.]+$/, ''), delivered: label, status: 'review', revUsed: 0, revTotal: p.revTotal || 3, thumb: '', clientId: p.clientId, projectId: p.id, comments: [] }));
        Store.save(); App.render(); toast(`${files.length} deliverable${files.length > 1 ? 's' : ''} shared for review`);
      });
    },
  };
};
Actions['proj-sub'] = (el) => { PD.sub = el.dataset.sub; App.render(); };
Actions['share-portal'] = (el) => {
  const link = `${location.origin === 'null' ? 'https://modus.app' : location.origin}/portal/project/${el.dataset.id}`;
  copyText(link, 'Portal link copied to clipboard');
};
