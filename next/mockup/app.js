/* ══════════════════════════════════════════════════════
   NEXT · Projekthantering · Langate
   app.js — navigation, modals, filters, toast, actions
   Data objects live in data.js (loaded first)
   ══════════════════════════════════════════════════════ */

// ── All view IDs ──────────────────────────────────────
const ALL_VIEWS = [
  'hub','dashboard','arbetsorder','tidrapport','dagbok','ata','avvikelser','budget','gantt',
  'resurser','leverantorer','checklistmallar','bi-rapporter','systeminst',
  'ritning','kundfakturor','levfakturor','rapporter','installningar'
];

// Hub-level views (show nav-hub sidebar)
const HUB_VIEWS = new Set([
  'hub','resurser','leverantorer','checklistmallar','bi-rapporter','systeminst','rapporter','installningar'
]);

// Item 7: Views that only have full content in the fullDemo project (Centrumhuset)
const FULL_DEMO_VIEWS = new Set([
  'dashboard','arbetsorder','tidrapport','dagbok','ata','avvikelser',
  'budget','gantt','ritning','kundfakturor','levfakturor'
]);

// Top-nav data-nav → views that activate it
const TOP_NAV_MAP = {
  hub:       ['hub','leverantorer','checklistmallar','bi-rapporter'],
  resources: ['resurser'],
  reports:   ['rapporter'],
  settings:  ['systeminst','installningar']
};

// ── Navigate ──────────────────────────────────────────
function navigate(view) {
  // Item 7: Guard — redirect non-fullDemo projects to project-limited
  if (FULL_DEMO_VIEWS.has(view)) {
    const activeP = typeof PROJECT_DATA !== 'undefined' && PROJECT_DATA[currentProjectId];
    if (activeP && !activeP.fullDemo) {
      toast(`${activeP.name} — detaljvyer visas bara för demonstrationsprojektet`, 'warn');
      view = 'project-limited';
    }
  }

  ALL_VIEWS.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.classList.remove('active');
  });

  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');

  const isHub = HUB_VIEWS.has(view);
  document.getElementById('nav-hub').style.display    = isHub ? 'block' : 'none';
  document.getElementById('nav-project').style.display = isHub ? 'none' : 'block';

  // Top nav active state
  document.querySelectorAll('.sh-nav-item').forEach(el => el.classList.remove('active'));
  for (const [navKey, views] of Object.entries(TOP_NAV_MAP)) {
    if (views.includes(view)) {
      const el = document.querySelector(`.sh-nav-item[data-nav="${navKey}"]`);
      if (el) el.classList.add('active');
      break;
    }
  }

  // Left nav active
  document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  if (view === 'dashboard') refreshDashboardKPIs();
  if (view === 'resurser') renderResourcesView();
  if (view === 'rapporter') renderReportsView();

  window.scrollTo(0, 0);
}

// ── Dashboard KPI recompute from live data ──
function refreshDashboardKPIs() {
  _updateBudgetKPI();
  _updateDeviationKPI();
  _updateAOKPI();
  _updateDaysKPI();
}

function _updateBudgetKPI() {
  if (typeof BUDGET_CATEGORY_DATA === 'undefined') return;
  let budget = 0, actual = 0;
  Object.keys(BUDGET_CATEGORY_DATA).forEach(k => {
    const c = BUDGET_CATEGORY_DATA[k];
    budget += Number(c.budget) || 0;
    actual += Number(c.actual) || 0;
  });
  const pct = budget > 0 ? Math.round((actual / budget) * 100) : 0;
  const pctEl = document.getElementById('kpi-budget-pct');
  const subEl = document.getElementById('kpi-budget-sub');
  if (pctEl) pctEl.textContent = String(pct);
  if (subEl) subEl.textContent = `${actual.toLocaleString('sv-SE')} kr av ${budget.toLocaleString('sv-SE')} kr`;
}

function _updateDeviationKPI() {
  if (typeof AVV_DATA === 'undefined') return;
  let open = 0, hog = 0, med = 0, lag = 0;
  Object.keys(AVV_DATA).forEach(k => {
    const d = AVV_DATA[k];
    if (d.status === 'Åtgärdad' || d.status === 'Stängd') return;
    open++;
    if (d.severity === 3) hog++;
    else if (d.severity === 2) med++;
    else lag++;
  });
  const cnt = document.getElementById('kpi-dev-count');
  const sub = document.getElementById('kpi-dev-sub');
  if (cnt) cnt.textContent = String(open);
  if (sub) sub.textContent = `${hog} hög · ${med} medel · ${lag} låg`;
}

function _updateAOKPI() {
  if (typeof AO_DATA === 'undefined') return;
  let done = 0, inprog = 0, notstarted = 0;
  const ids = Object.keys(AO_DATA);
  ids.forEach(id => {
    const ao = AO_DATA[id];
    if (ao.status === 'Klar') done++;
    else if (ao.status === 'Pågår') inprog++;
    else notstarted++;
  });
  const doneEl = document.getElementById('kpi-ao-done');
  const totEl = document.getElementById('kpi-ao-total');
  const subEl = document.getElementById('kpi-ao-sub');
  if (doneEl) doneEl.textContent = String(done);
  if (totEl) totEl.textContent = String(ids.length);
  if (subEl) subEl.textContent = `${inprog} pågår · ${notstarted} ej startade`;
}

// ── Resources (rich) view ──
function renderResourcesView() {
  const host = document.getElementById('res-rich-grid');
  if (!host || typeof RESOURCE_DATA === 'undefined') return;
  host.innerHTML = RESOURCE_DATA.map(r => _buildResourceCard(r)).join('');
}

function _buildResourceCard(r) {
  const pct = Math.round((r.booked / r.capacity) * 100);
  let fillClass = '';
  if (pct >= 95) fillClass = 'over';
  else if (pct >= 80) fillClass = 'med';
  const rowsHtml = r.assignments.map(a =>
    `<div class="res-ass-row"><span>${a.label}</span><span class="res-ass-hours">${a.hours}h</span></div>`
  ).join('');
  const skillsHtml = r.skills.map(s => `<span class="res-skill">${s}</span>`).join('');
  return `
    <div class="res-rich" onclick="openResCard('${r.name}','${r.role}','${r.projects} aktiva projekt','${r.email}')">
      <div class="res-rich-head">
        <div class="av" style="width:44px;height:44px;font-size:15px;background:${r.bg}">${r.initials}</div>
        <div style="flex:1">
          <div class="res-rich-name">${r.name}</div>
          <div class="res-rich-role">${r.role} · ${r.email}</div>
        </div>
        <span class="badge badge-active">${r.status}</span>
      </div>
      <div class="res-util-wrap">
        <div class="res-util-row"><span>Utnyttjande vecka 16</span><span>${r.booked}/${r.capacity}h · ${pct}%</span></div>
        <div class="res-util-track"><div class="res-util-fill ${fillClass}" style="width:${Math.min(100, pct)}%"></div></div>
      </div>
      <div class="res-assignments">
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:4px">Uppdrag</div>
        ${rowsHtml}
      </div>
      <div class="res-skills">${skillsHtml}</div>
    </div>
  `;
}

// ── Reports dashboard (4 live cards) ──
function renderReportsView() {
  const host = document.getElementById('reports-dashboard');
  if (!host) return;
  host.innerHTML = [
    _buildProjectOverviewCard(),
    _buildFinanceCard(),
    _buildQualityCard(),
    _buildStaffingCard()
  ].join('');
}

function _buildProjectOverviewCard() {
  if (typeof PROJECT_DATA === 'undefined') return '';
  let totalBudget = 0, totalSpent = 0, active = 0, projectCount = 0;
  let devCount = 0;
  Object.values(PROJECT_DATA).forEach(p => {
    projectCount++;
    totalBudget += Number(p.budget) || 0;
    totalSpent += Number(p.spent) || 0;
    if (p.status === 'Aktiv') active++;
    devCount += Number(p.avvCount) || 0;
  });
  const avgProgress = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  return `
    <div class="rcard">
      <div class="rcard-head">
        <div class="rcard-icon" style="background:#ebf2f5;color:var(--primary)">📊</div>
        <div><div class="rcard-title">Projektöverblick</div><div class="rcard-sub">Alla ${projectCount} projekt i portföljen</div></div>
        <button class="btn btn-secondary btn-xs" style="margin-left:auto" onclick="toast('Projektöversikt exporterad som PDF','success')">⬇ PDF</button>
      </div>
      <div class="rcard-body">
        <div class="rmetric-row"><span>Total budget</span><span class="rmetric-val">${totalBudget.toLocaleString('sv-SE')} kr</span></div>
        <div class="rmetric-row"><span>Förbrukat</span><span class="rmetric-val">${totalSpent.toLocaleString('sv-SE')} kr</span></div>
        <div class="rmetric-row"><span>Aktiva projekt</span><span class="rmetric-val">${active} av ${projectCount}</span></div>
        <div class="rmetric-row"><span>Viktad framdrift</span><span class="rmetric-val">${avgProgress}%</span></div>
        <div class="rmetric-row"><span>Totala öppna avvikelser</span><span class="rmetric-val">${devCount}</span></div>
      </div>
    </div>
  `;
}

function _buildFinanceCard() {
  if (typeof BUDGET_CATEGORY_DATA === 'undefined') return '';
  const cats = Object.values(BUDGET_CATEGORY_DATA)
    .map(c => ({ name:c.name, variance:(Number(c.actual) - Number(c.budget)), pct:Number(c.pct) || 0 }))
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    .slice(0, 5);
  const maxAbs = Math.max(1, ...cats.map(c => Math.abs(c.variance)));
  const bars = cats.map(c => {
    const heightPct = Math.round((Math.abs(c.variance) / maxAbs) * 100);
    let cls = '';
    if (c.pct >= 100) cls = 'hi';
    else if (c.pct >= 85) cls = 'med';
    return `
      <div class="rbar-col">
        <div class="rbar-rect ${cls}" style="height:${heightPct}%" title="${c.name}: ${c.variance.toLocaleString('sv-SE')} kr"></div>
        <div class="rbar-lbl">${c.name.split(' ')[0].slice(0,8)}</div>
      </div>
    `;
  }).join('');
  return `
    <div class="rcard">
      <div class="rcard-head">
        <div class="rcard-icon" style="background:#fef6e7;color:#c88913">💰</div>
        <div><div class="rcard-title">Ekonomi — budgetavvikelse</div><div class="rcard-sub">Top 5 kategorier · största absoluta avvikelse</div></div>
        <button class="btn btn-secondary btn-xs" style="margin-left:auto" onclick="toast('Ekonomirapport exporterad till Excel','success')">⬇ Excel</button>
      </div>
      <div class="rbar">${bars}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:6px">🟢 under 85% · 🟡 85–99% · 🔴 ≥ 100% av budget</div>
    </div>
  `;
}

function _buildQualityCard() {
  if (typeof AVV_DATA === 'undefined') return '';
  const cats = ['Säkerhet','Kvalitet','Miljö','Process'];
  const sevs = ['Hög','Medel','Låg'];
  const matrix = {};
  sevs.forEach(s => { matrix[s] = {}; cats.forEach(c => { matrix[s][c] = 0; }); });
  Object.values(AVV_DATA).forEach(d => {
    const cat = d.category || 'Kvalitet';
    const sev = d.severityLabel || 'Låg';
    if (matrix[sev] && matrix[sev][cat] !== undefined) matrix[sev][cat]++;
    else if (matrix[sev]) matrix[sev]['Kvalitet']++;
  });
  const heat = sevs.map(s => {
    const cells = cats.map(c => {
      const v = matrix[s][c];
      const cls = `rheat-${Math.min(4, v + 1)}`;
      return `<div class="rheat-cell ${v === 0 ? 'rheat-0' : cls}">${v || ''}</div>`;
    }).join('');
    return `<div class="rheat-row"><div class="rheat-lbl">${s}</div>${cells}</div>`;
  }).join('');
  const header = `<div class="rheat-row"><div class="rheat-lbl"></div>${cats.map(c => `<div class="rheat-lbl" style="text-align:center">${c}</div>`).join('')}</div>`;
  return `
    <div class="rcard">
      <div class="rcard-head">
        <div class="rcard-icon" style="background:#fdeeec;color:#c0392b">⚠</div>
        <div><div class="rcard-title">Kvalitet — avvikelser</div><div class="rcard-sub">Heatmap · allvarlighet × kategori</div></div>
        <button class="btn btn-secondary btn-xs" style="margin-left:auto" onclick="toast('Kvalitetsrapport exporterad som PDF','success')">⬇ PDF</button>
      </div>
      <div class="rheat">${header}${heat}</div>
    </div>
  `;
}

function _buildStaffingCard() {
  if (typeof RESOURCE_DATA === 'undefined') return '';
  const buckets = [0,0,0,0,0]; // 0-20, 20-40, 40-60, 60-80, 80-100
  RESOURCE_DATA.forEach(r => {
    const pct = (r.booked / r.capacity) * 100;
    const idx = Math.min(4, Math.floor(pct / 20));
    buckets[idx]++;
  });
  const max = Math.max(1, ...buckets);
  const labels = ['0-20%','20-40%','40-60%','60-80%','80-100%'];
  const bars = buckets.map((b, i) => {
    const h = Math.round((b / max) * 100);
    let cls = '';
    if (i === 4) cls = 'hi';
    else if (i === 3) cls = '';
    else if (i <= 1) cls = 'med';
    return `
      <div class="rbar-col">
        <div class="rbar-rect ${cls}" style="height:${h}%" title="${b} personer"></div>
        <div class="rbar-lbl">${labels[i]}</div>
      </div>
    `;
  }).join('');
  return `
    <div class="rcard">
      <div class="rcard-head">
        <div class="rcard-icon" style="background:#e6f4f3;color:#02B896">👥</div>
        <div><div class="rcard-title">Bemanning — utnyttjande</div><div class="rcard-sub">Histogram · fördelning av veckoutnyttjande</div></div>
        <button class="btn btn-secondary btn-xs" style="margin-left:auto" onclick="toast('Bemanningsrapport exporterad till Excel','success')">⬇ Excel</button>
      </div>
      <div class="rbar">${bars}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:6px">Optimalt utnyttjande: 60–80%</div>
    </div>
  `;
}

function _updateDaysKPI() {
  const endDate = new Date('2026-08-31');
  const today = new Date('2026-04-15');
  const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const el = document.getElementById('kpi-days');
  if (el) el.textContent = String(diff);
}

// ── Toast ─────────────────────────────────────────────
// ── validateForm — reusable field validator ──
// rules = [{ value:'text', label:'Projektnamn', required:true, min:0, type:'text'|'number', el:HTMLElement (optional, for red-outline) }]
// returns { ok:bool, errors:[{label,reason}] } — also shows a toast + red outline on first error
function validateForm(rules) {
  const errors = [];
  rules.forEach(r => {
    const v = r.value;
    let failed = null;
    if (r.required) {
      if (v === undefined || v === null) failed = 'krävs';
      else if (typeof v === 'string' && !v.trim()) failed = 'krävs';
      else if (typeof v === 'number' && !v) failed = 'krävs';
    }
    if (!failed && r.min !== undefined && typeof v === 'number' && v < r.min) {
      failed = `minst ${r.min}`;
    }
    if (!failed && r.type === 'number' && v !== '' && v !== null && v !== undefined && isNaN(Number(v))) {
      failed = 'måste vara ett tal';
    }
    if (failed) errors.push({ label: r.label, reason: failed, el: r.el });
  });
  // Clear all previous error styling on these elements first
  rules.forEach(r => { if (r.el) r.el.classList.remove('fi-error'); });
  errors.forEach(e => { if (e.el) e.el.classList.add('fi-error'); });
  if (errors.length > 0) {
    const first = errors[0];
    toast(`${first.label} ${first.reason}`, 'error');
    if (first.el && typeof first.el.focus === 'function') first.el.focus();
    return { ok: false, errors };
  }
  return { ok: true, errors: [] };
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast t-${type === 'success' ? 'ok' : type === 'error' ? 'err' : type === 'warn' ? 'warn' : 'info'}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warn' ? '⚠' : 'ℹ';
  el.innerHTML = `<span>${icon}</span>${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Modal (right panel) ───────────────────────────────
function openModal(title, bodyHTML, footerHTML = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  const footer = document.getElementById('modal-footer');
  if (footerHTML) {
    footer.innerHTML = footerHTML;
    footer.style.display = 'flex';
  } else {
    footer.style.display = 'none';
  }
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// Close modal when clicking overlay backdrop
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
});

// ── Confirm dialog ───────────────────────────────────
let _confirmCallback = null;
function showConfirm(icon, title, text, confirmLabel, confirmClass, callback) {
  document.querySelector('.confirm-ico').textContent = icon;
  document.querySelector('.confirm-ttl').textContent = title;
  document.querySelector('.confirm-txt').textContent = text;
  const btn = document.getElementById('confirm-ok-btn');
  btn.textContent = confirmLabel;
  btn.className = `btn ${confirmClass}`;
  _confirmCallback = callback;
  document.getElementById('confirm-overlay').classList.add('open');
}
function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open');
}
function confirmOk() {
  closeConfirm();
  if (_confirmCallback) _confirmCallback();
}

// AO_DATA, AVV_DATA, DIARY_DATA, CHECKLIST_DATA, SUPPLIER_DATA,
// BUDGET_CATEGORY_DATA, PROJECT_DATA, WEEK_DATA, KF_DATA,
// SEARCH_ITEMS, NOTIFICATION_DATA and shared state vars are in data.js

function openAO(num) {
  const d = AO_DATA[num];
  if (!d) return;
  const statusClass = d.status === 'Pågår' ? 'badge-active' : d.status === 'Klar' ? 'badge-done' : 'badge-neutral';
  const progClass   = d.progress >= 90 ? 'prog-green' : d.progress >= 60 ? 'prog-gold' : 'prog-blue';

  let matRows = d.materials.length
    ? d.materials.map(m => `<div class="dr"><span class="dk">${m.item}</span><span class="dv">${m.qty} · ${m.cost}</span></div>`).join('')
    : '<p style="font-size:13px;color:var(--text-light);padding:8px 0">Inget material registrerat</p>';

  let noteRows = d.notes.length
    ? d.notes.map(n => `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="font-size:11px;font-weight:700;color:var(--text-light)">${n.date} · ${n.who}</span><div style="margin-top:2px">${n.note}</div></div>`).join('')
    : '<p style="font-size:13px;color:var(--text-light);padding:8px 0">Inga anteckningar</p>';

  const body = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <span class="badge ${statusClass}">${d.status}</span>
      <span style="font-size:12px;color:var(--text-muted)">${d.category} · Prioritet: ${d.priority}</span>
    </div>
    <p style="font-size:13.5px;color:var(--text-muted);line-height:1.5;margin-bottom:16px">${d.desc}</p>
    <div class="dr"><span class="dk">Tilldelad</span><span class="dv">${d.assigned}</span></div>
    <div class="dr"><span class="dk">Period</span><span class="dv">${d.period}</span></div>
    <div style="margin:12px 0">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="color:var(--text-muted)">Framdrift</span>
        <strong>${d.progress}%</strong>
      </div>
      <div class="prog-bar" style="height:10px"><div class="prog-fill ${progClass}" style="width:${d.progress}%"></div></div>
    </div>
    <div class="dl-sec">Material</div>${matRows}
    <div class="dl-sec">Anteckningar / logg</div>${noteRows}
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Stäng</button>
    <button class="btn btn-primary" onclick="closeModal();toast('Redigering öppnad för ${num}','info')">Redigera</button>
  `;
  openModal(`${d.num} — ${d.title}`, body, footer);
}


// ── Root-cause / corrective actions (per deviation, in-memory) ──
const DEVIATION_RCA = {
  'AVV-001': {
    whys:[
      'Varför: Fuktfläck på vägg rum 205 (87% fukt)',
      'Varför: Vatten läcker in från rörgenomföring ovan',
      'Varför: Tätningen mellan rör och bjälklag är skadad',
      'Varför: Tätningen applicerades fel vid VVS-installation 2023',
      'Varför: UE följde inte checklista för rörgenomföringar (grundorsak)'
    ],
    corrective:[
      {label:'Kontakta rörinspektör', done:true},
      {label:'Identifiera läckagekälla', done:false},
      {label:'Åtgärda tätning enligt checklista', done:false},
      {label:'Torka ut vägg (minst 48h avfuktare)', done:false},
      {label:'Åter-mätning fukt (mål < 20%)', done:false},
      {label:'Uppdatera UE-checklista — förebygg återfall', done:false}
    ]
  },
  'AVV-002': {
    whys:[
      'Varför: Avloppsrör badrum 102 har för liten lutning (0.5°)',
      'Varför: Montören mätte inte lutning under installation',
      'Varför: Lutningsmätare fanns inte i UE:s standardverktygsset',
      'Varför: Kvalitetskontroll saknades innan inklädnad',
      'Varför: QA-steget hoppades över p.g.a. tidsbrist (grundorsak)'
    ],
    corrective:[
      {label:'Öppna inklädnad', done:true},
      {label:'Lägg om avloppsrör med korrekt lutning', done:true},
      {label:'Verifiera med lutningsmätare (mål ≥ 1.5°)', done:false},
      {label:'Täthetsprov', done:false},
      {label:'Stäng inklädnad och slutbesiktiga', done:false}
    ]
  },
  'AVV-003': {
    whys:[
      'Varför: 12 vägguttag saknades i leverans',
      'Varför: Plockfel hos Ahlsells lager',
      'Varför: Ordern innehöll artikel med pick-to-light-fel (grundorsak)'
    ],
    corrective:[
      {label:'Reklamera till leverantör', done:true},
      {label:'Acceptera kompletteringsleverans', done:true},
      {label:'Verifiera kvantitet + artikelnummer', done:true},
      {label:'Registrera leverantörs-avvikelse (QA-mått)', done:true}
    ]
  }
};

const STATUS_FLOW = ['Öppen','Åtgärd pågår','Åtgärdad','Stängd'];

function _renderStatusTimeline(current) {
  return `
    <div style="display:flex;align-items:center;gap:4px;margin:10px 0 14px;font-size:11px">
      ${STATUS_FLOW.map((s, i) => {
        const active = STATUS_FLOW.indexOf(current) >= i;
        const isCurrent = s === current;
        return `
          <div style="flex:1;text-align:center">
            <div style="height:22px;line-height:22px;background:${active ? (isCurrent ? 'var(--primary)' : 'var(--accent-green)') : 'var(--bg-grey)'};color:${active ? 'white' : 'var(--text-muted)'};border-radius:3px;font-weight:600;padding:0 8px">${s}</div>
          </div>
          ${i < STATUS_FLOW.length - 1 ? `<div style="color:${active ? 'var(--accent-green)' : 'var(--border-med)'};font-weight:700">›</div>` : ''}
        `;
      }).join('')}
    </div>
  `;
}

function openDeviation(num) {
  const d = AVV_DATA[num];
  if (!d) return;
  const sevColors = {1:'badge-active',2:'badge-pending',3:'badge-error'};
  const rca = DEVIATION_RCA[num] || { whys:[], corrective:[] };

  const actions = d.actions.map(a =>
    `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="font-size:11px;font-weight:700;color:var(--text-light)">${a.date} · ${a.who}</span>
      <div style="margin-top:2px">${a.note}</div>
    </div>`).join('');

  const whys = rca.whys.map((w, i) =>
    `<div style="padding:6px 10px;font-size:12.5px;background:${i === rca.whys.length - 1 ? 'rgba(231,76,60,.08)' : 'var(--bg-subtle)'};border-left:3px solid ${i === rca.whys.length - 1 ? 'var(--accent-red)' : 'var(--primary)'};margin-bottom:4px;border-radius:0 3px 3px 0">
      <strong style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted)">Nivå ${i + 1}${i === rca.whys.length - 1 ? ' — Grundorsak' : ''}</strong>
      <div style="margin-top:2px">${w}</div>
    </div>`).join('');

  const corrective = rca.corrective.map((c, i) =>
    `<div style="padding:7px 0;font-size:13px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border)">
      <input type="checkbox" ${c.done ? 'checked' : ''} onchange="_toggleCorrective('${num}',${i})" style="width:16px;height:16px;cursor:pointer">
      <span style="${c.done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${c.label}</span>
    </div>`).join('');

  const completed = rca.corrective.filter(c => c.done).length;
  const total = rca.corrective.length;

  const body = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span class="badge ${sevColors[d.severity]}">Allvarlighet ${d.severity} — ${d.severityLabel}</span>
      <span style="font-size:12px;color:var(--text-muted)">${d.status} · Rapporterad ${d.reported}</span>
    </div>
    ${_renderStatusTimeline(d.status)}
    <p style="font-size:13.5px;color:var(--text-muted);line-height:1.5;margin-bottom:14px">${d.desc}</p>
    <div class="dr"><span class="dk">Ansvarig</span><span class="dv">${d.responsible}</span></div>
    <div class="dr"><span class="dk">Rapporterad</span><span class="dv">${d.reported}</span></div>

    <div class="dl-sec" style="margin-top:16px">Rotorsaksanalys — 5 varför</div>
    ${whys || '<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Ingen rotorsaksanalys registrerad.</div>'}

    <div class="dl-sec" style="margin-top:16px">Åtgärdscheckllista <span style="font-weight:400;color:var(--text-muted);font-size:12px">(${completed}/${total} klara)</span></div>
    ${corrective || '<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Inga åtgärder registrerade.</div>'}

    <div class="dl-sec" style="margin-top:16px">Åtgärdslogg</div>${actions}

    <div style="margin-top:14px">
      <label class="fl">📷 Bilagor / foton</label>
      <div style="padding:20px;border:2px dashed var(--border-med);border-radius:4px;text-align:center;color:var(--text-muted);font-size:12px;cursor:pointer" onclick="toast('Öppnar filväljare...','info')">Klicka för att ladda upp foton</div>
    </div>

    <div style="margin-top:14px">
      <label class="fl">Ny anteckning</label>
      <textarea class="ft" placeholder="Beskriv åtgärd eller uppdatering..."></textarea>
    </div>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Stäng</button>
    <button class="btn btn-primary" onclick="closeModal();toast('Anteckning sparad','success')">Spara anteckning</button>
  `;
  openModal(`${d.num} — ${d.title}`, body, footer);
}

function _toggleCorrective(num, idx) {
  const rca = DEVIATION_RCA[num];
  if (!rca) return;
  rca.corrective[idx].done = !rca.corrective[idx].done;
  openDeviation(num);
  toast('Checkllista uppdaterad','success');
}


function openDiaryEntry(idx) {
  const d = DIARY_DATA[idx];
  if (!d) return;
  const tags = d.tags.map(t => `<span class="dtag">${t}</span>`).join('');
  const body = `
    <div style="display:flex;gap:16px;margin-bottom:16px">
      <div style="width:60px;text-align:center;flex-shrink:0">
        <div style="font-size:28px;font-weight:800;color:var(--primary);line-height:1">${d.day}</div>
        <div style="font-size:12px;color:var(--text-muted)">${d.mon}</div>
      </div>
      <div>
        <div style="font-size:15px;font-weight:700;margin-bottom:2px">${d.title}</div>
        <div style="font-size:12px;color:var(--text-muted)">${d.weather}</div>
      </div>
    </div>
    <div class="dr"><span class="dk">Personal på plats</span><span class="dv" style="text-align:right">${d.staff}</span></div>
    <div style="margin:14px 0;font-size:13.5px;line-height:1.6;color:var(--text)">${d.text}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${tags}</div>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Stäng</button>
    <button class="btn btn-primary" onclick="closeModal();toast('Post öppnad i redigeringsläge','info')">Redigera</button>
  `;
  openModal(`Dagbokspost ${d.day} ${d.mon}`, body, footer);
}

// ── New record forms ───────────────────────────────────
function openNewAO() {
  const body = `
    <div class="ff"><label class="fl">Titel</label><input class="fi" id="new-ao-title" placeholder="Beskriv arbetet kortfattat"></div>
    <div class="ff"><label class="fl">Beskrivning</label><textarea class="ft" placeholder="Detaljerad beskrivning av arbetsuppgiften..."></textarea></div>
    <div class="fg2">
      <div class="ff"><label class="fl">Tilldelad</label>
        <select class="fs" id="new-ao-assigned"><option>Ej tilldelad</option><option>Sven Persson</option><option>Mia Johansson</option><option>Marcus Bergström</option></select>
      </div>
      <div class="ff"><label class="fl">Kategori</label>
        <select class="fs" id="new-ao-category"><option>El</option><option>VVS</option><option>Byggnad</option><option>Ytskikt</option><option>Golvarbete</option><option>Övrigt</option></select>
      </div>
    </div>
    <div class="fg2">
      <div class="ff"><label class="fl">Startdatum</label><input type="date" class="fi" id="new-ao-start" value="2026-04-28"></div>
      <div class="ff"><label class="fl">Slutdatum</label><input type="date" class="fi" id="new-ao-end" value="2026-05-15"></div>
    </div>
    <div class="fg2">
      <div class="ff"><label class="fl">Prioritet</label>
        <select class="fs" id="new-ao-priority"><option>Normal</option><option>Hög</option><option>Kritisk</option></select>
      </div>
      <div class="ff"><label class="fl">Beräknad kostnad (kr)</label><input type="number" class="fi" placeholder="0"></div>
    </div>
    <div class="ff"><label class="fl">Anteckning</label><textarea class="ft" placeholder="Tilläggsinfo, risker, beroenden..."></textarea></div>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
    <button class="btn btn-primary" onclick="doCreateAO()">Skapa arbetsorder</button>
  `;
  openModal('Ny arbetsorder', body, footer);
}

function doCreateAO() {
  const title    = document.getElementById('new-ao-title')?.value.trim() || 'Ny arbetsorder';
  const assigned = document.getElementById('new-ao-assigned')?.value || 'Ej tilldelad';
  const category = document.getElementById('new-ao-category')?.value || 'Övrigt';
  const start    = document.getElementById('new-ao-start')?.value || '';
  const end      = document.getElementById('new-ao-end')?.value || '';
  closeModal();
  const num = `AO-00${Object.keys(AO_DATA).length + 1}`;
  const tbody = document.getElementById('ao-tbody');
  if (tbody) {
    const tr = document.createElement('tr');
    tr.className = 'ao-row';
    tr.dataset.status = 'notstarted';
    const period = start ? `${start}${end ? '–' + end : ''}` : 'Ej satt';
    tr.innerHTML = `
      <td style="font-weight:700;color:var(--primary-teal)">${num}</td>
      <td><strong>${title}</strong><br><span style="font-size:11px;color:var(--text-muted)">${category}</span></td>
      <td><span class="text-muted text-sm">${assigned}</span></td>
      <td>${period}</td>
      <td><span class="badge badge-neutral">Ej startad</span></td>
      <td><span class="text-muted text-sm">–</span></td>
      <td><button class="btn btn-secondary" style="padding:4px 12px;font-size:12px" onclick="toast('${num} — ej sparat i demo','info')">Öppna</button></td>
    `;
    tbody.prepend(tr);
  }
  toast(`${num} skapad`, 'success');
}

function openNewDeviation() {
  const body = `
    <div class="ff"><label class="fl">Titel</label><input class="fi" id="new-avv-title" placeholder="Kortfattad beskrivning av avvikelsen"></div>
    <div class="ff"><label class="fl">Beskrivning</label><textarea class="ft" placeholder="Detaljerad beskrivning — plats, symtom, eventuell orsak..."></textarea></div>
    <div class="fg2">
      <div class="ff"><label class="fl">Allvarlighetsgrad</label>
        <select class="fs" id="new-avv-severity"><option value="1">1 — Låg</option><option value="2">2 — Medel</option><option value="3">3 — Hög</option><option value="4">4 — Kritisk</option></select>
      </div>
      <div class="ff"><label class="fl">Ansvarig</label>
        <select class="fs" id="new-avv-responsible"><option>Sven Persson</option><option>Mia Johansson</option><option>Marcus Bergström</option><option>Anna Lindqvist</option></select>
      </div>
    </div>
    <div class="fg2">
      <div class="ff"><label class="fl">Kopplad arbetsorder</label>
        <select class="fs"><option>Ingen</option><option>AO-001 El-installation</option><option>AO-004 Fönsterbyte</option></select>
      </div>
      <div class="ff"><label class="fl">Rapportdatum</label><input type="date" class="fi" value="2026-04-14"></div>
    </div>
    <div class="ff"><label class="fl">Bifogade filer</label><input type="file" class="fi" multiple accept="image/*,.pdf"></div>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
    <button class="btn btn-primary" onclick="doCreateDeviation()">Registrera avvikelse</button>
  `;
  openModal('Ny avvikelse', body, footer);
}

function doCreateDeviation() {
  const title       = document.getElementById('new-avv-title')?.value.trim() || 'Ny avvikelse';
  const severity    = parseInt(document.getElementById('new-avv-severity')?.value || '1');
  const responsible = document.getElementById('new-avv-responsible')?.value || 'Sven Persson';
  closeModal();
  const num = `AVV-00${Object.keys(AVV_DATA).length + 1}`;
  const col = document.getElementById('avv-col-open');
  if (col) {
    const sevLabels = {1:'Låg',2:'Medel',3:'Hög',4:'Kritisk'};
    const sevBadge  = severity >= 3 ? 'badge-error' : severity === 2 ? 'badge-pending' : 'badge-active';
    const card = document.createElement('div');
    card.className = 'kcard';
    card.dataset.avv = num;
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:11px;font-weight:700;color:var(--text-light)">${num}</span>
        <span class="prio prio-${severity}">${severity}</span>
      </div>
      <div class="kcard-title">${title}</div>
      <div class="kcard-meta">
        <div class="kcard-row">👤 Ansvarig: ${responsible}</div>
        <div class="kcard-row">📅 Rapporterad: 14 apr 2026</div>
        <div class="kcard-row"><span class="badge ${sevBadge}" style="font-size:10px">Allvarlighet ${severity} — ${sevLabels[severity]}</span></div>
      </div>
      <div class="kcard-actions"><button class="btn-move" onclick="event.stopPropagation();promptMove('${num}')">Flytta →</button></div>
    `;
    col.prepend(card);
    updateKanbanCounts();
  }
  toast(`${num} registrerad`, 'success');
}

function openNewATA() {
  const body = `
    <div class="ff"><label class="fl">Ärendetitel</label><input class="fi" placeholder="Beskriv ändringen/tillägget"></div>
    <div class="ff"><label class="fl">Beskrivning</label><textarea class="ft" placeholder="Detaljerat underlag för ÄTA-ärendet..."></textarea></div>
    <div class="fg2">
      <div class="ff"><label class="fl">ÄTA-typ</label>
        <select class="fs"><option>Tilläggsarbete</option><option>Ändringsarbete</option><option>Avgående arbete</option></select>
      </div>
      <div class="ff"><label class="fl">Begärd av</label>
        <select class="fs"><option>Kund (Fastighets AB)</option><option>Marcus Bergström</option><option>Sven Persson</option><option>Anna Lindqvist</option></select>
      </div>
    </div>
    <div class="fg2">
      <div class="ff"><label class="fl">Beräknad kostnad (kr)</label><input type="number" class="fi" placeholder="0"></div>
      <div class="ff"><label class="fl">Datum</label><input type="date" class="fi" value="2026-04-14"></div>
    </div>
    <div class="ff"><label class="fl">Underlag / bilagor</label><input type="file" class="fi" multiple></div>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
    <button class="btn btn-primary" onclick="closeModal();toast('ÄTA-ärende skapat och skickat för godkännande','success')">Skapa och skicka</button>
  `;
  openModal('Nytt ÄTA-ärende', body, footer);
}

function openNewDiary() {
  const body = `
    <div class="fg2">
      <div class="ff"><label class="fl">Datum</label><input type="date" class="fi" id="new-diary-date" value="2026-04-15"></div>
      <div class="ff"><label class="fl">Väder</label>
        <div style="display:flex;gap:6px">
          <input class="fi" id="new-diary-weather" placeholder="☀ Sol, 10°C" style="flex:1">
          <button type="button" class="btn btn-secondary" onclick="fetchWeather()" title="Hämta väder från SMHI för arbetsplatsens koordinater">🌤 Hämta</button>
        </div>
      </div>
    </div>
    <div class="ff"><label class="fl">Personal på plats</label>
      <select class="fs" multiple style="height:80px">
        <option selected>Sven Persson</option><option>Mia Johansson</option>
        <option>Marcus Bergström</option><option>Anna Lindqvist</option>
      </select>
    </div>
    <div class="ff"><label class="fl">Dagboksanteckning</label><textarea class="ft" id="new-diary-text" style="min-height:120px" placeholder="Beskriv dagens arbete, händelser, leveranser, besök..."></textarea></div>
    <div class="ff"><label class="fl">Koppling till arbetsorder</label>
      <select class="fs" multiple style="height:60px">
        <option>AO-001 El-installation</option><option>AO-004 Fönsterbyte</option>
      </select>
    </div>
    <div class="ff"><label class="fl">Bilagor / foton</label><input type="file" class="fi" multiple accept="image/*,.pdf"></div>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
    <button class="btn btn-primary" onclick="doCreateDiary()">Spara post</button>
  `;
  openModal('Ny dagbokspost', body, footer);
}

function fetchWeather() {
  const input = document.getElementById('new-diary-weather');
  if (!input) return;
  const originalPlaceholder = input.placeholder;
  input.disabled = true;
  input.placeholder = 'Hämtar från SMHI...';
  toast('Hämtar väder från SMHI för Storgatan 12, Örebro (59.275°N 15.213°E)','info');
  setTimeout(() => {
    const samples = [
      '☀ Sol, 12°C · Vind 3 m/s NO',
      '⛅ Halvklart, 9°C · Vind 5 m/s V',
      '🌧 Regn, 7°C · Vind 6 m/s SV · Neder. 4 mm/h',
      '☁ Molnigt, 11°C · Vind 2 m/s N'
    ];
    const pick = samples[Math.floor(Math.random() * samples.length)];
    input.value = pick;
    input.disabled = false;
    input.placeholder = originalPlaceholder;
    toast('Väder hämtat från SMHI open data API','success');
  }, 900);
}

function doCreateDiary() {
  const dateVal    = document.getElementById('new-diary-date')?.value || '2026-04-14';
  const weatherVal = document.getElementById('new-diary-weather')?.value || '–';
  const textVal    = document.getElementById('new-diary-text')?.value.trim() || 'Ny dagbokspost';
  closeModal();
  const parts = dateVal.split('-');
  const day = parts[2] || '14';
  const months = ['','JAN','FEB','MAR','APR','MAJ','JUN','JUL','AUG','SEP','OKT','NOV','DEC'];
  const mon = months[parseInt(parts[1] || '4')] || 'APR';
  const container = document.getElementById('diary-entries-card');
  if (container) {
    const entry = document.createElement('div');
    entry.className = 'diary-entry';
    entry.innerHTML = `
      <div class="diary-date"><div class="diary-day">${day}</div><div class="diary-mon">${mon}</div></div>
      <div class="diary-body">
        <div class="diary-title">Ny dagbokspost</div>
        <div class="diary-weather">${weatherVal}</div>
        <div class="diary-text">${textVal}</div>
        <div class="diary-tags"></div>
      </div>
    `;
    const first = container.querySelector('.diary-entry');
    if (first) container.insertBefore(entry, first);
    else container.appendChild(entry);
  }
  toast('Dagbokspost sparad', 'success');
}

// ── Project creation wizard (4 steps) ──
let _wizState = { step:1, name:'', id:'NEXT-2026-005', type:'Totalentreprenad', customer:'', city:'', address:'', value:0, pm:'Anna Lindqvist', startDate:'', endDate:'' };

function openNewProject() {
  _wizState = { step:1, name:'', id:'NEXT-2026-005', type:'Totalentreprenad', customer:'', city:'', address:'', value:0, pm:'Anna Lindqvist', startDate:'', endDate:'' };
  _renderWizard();
}

function _renderWizard() {
  const s = _wizState;
  const stepper = `
    <div style="display:flex;gap:6px;margin-bottom:18px;font-size:11px;text-transform:uppercase;letter-spacing:.05em">
      ${[1,2,3,4].map(n => `<div style="flex:1;padding:8px 10px;border-radius:3px;text-align:center;font-weight:700;background:${n === s.step ? 'var(--primary)' : n < s.step ? 'var(--accent-green)' : 'var(--bg-grey)'};color:${n <= s.step ? 'white' : 'var(--text-muted)'}">${n}. ${['Basuppgifter','Kund','Ekonomi & tid','Bekräfta'][n-1]}</div>`).join('')}
    </div>
  `;
  let body = stepper;
  if (s.step === 1) {
    body += `
      <div class="ff"><label class="fl">Projektnamn *</label><input id="wz-name" class="fi" placeholder="t.ex. Renovering Hamnplan 4" value="${s.name}" oninput="_wizState.name=this.value"></div>
      <div class="fg2">
        <div class="ff"><label class="fl">Projekt-ID *</label><input id="wz-id" class="fi" value="${s.id}" oninput="_wizState.id=this.value"></div>
        <div class="ff"><label class="fl">Projekttyp</label>
          <select id="wz-type" class="fs" onchange="_wizState.type=this.value">
            <option${s.type==='Totalentreprenad'?' selected':''}>Totalentreprenad</option>
            <option${s.type==='Generalentreprenad'?' selected':''}>Generalentreprenad</option>
            <option${s.type==='Utförandeentreprenad'?' selected':''}>Utförandeentreprenad</option>
            <option${s.type==='Service/underhåll'?' selected':''}>Service/underhåll</option>
          </select>
        </div>
      </div>`;
  } else if (s.step === 2) {
    body += `
      <div class="fg2">
        <div class="ff"><label class="fl">Kundnamn *</label><input class="fi" placeholder="Bolaget AB" value="${s.customer}" oninput="_wizState.customer=this.value"></div>
        <div class="ff"><label class="fl">Ort</label><input class="fi" placeholder="Stockholm" value="${s.city}" oninput="_wizState.city=this.value"></div>
      </div>
      <div class="ff"><label class="fl">Adress</label><input class="fi" placeholder="Gatuadress, postnummer" value="${s.address}" oninput="_wizState.address=this.value"></div>`;
  } else if (s.step === 3) {
    body += `
      <div class="fg2">
        <div class="ff"><label class="fl">Kontraktsvärde (kr) *</label><input type="number" class="fi" value="${s.value}" oninput="_wizState.value=Number(this.value)"></div>
        <div class="ff"><label class="fl">Projektledare *</label>
          <select class="fs" onchange="_wizState.pm=this.value">
            <option${s.pm==='Anna Lindqvist'?' selected':''}>Anna Lindqvist</option>
            <option${s.pm==='Marcus Bergström'?' selected':''}>Marcus Bergström</option>
            <option${s.pm==='Lars Eriksson'?' selected':''}>Lars Eriksson</option>
          </select>
        </div>
      </div>
      <div class="fg2">
        <div class="ff"><label class="fl">Startdatum</label><input type="date" class="fi" value="${s.startDate}" oninput="_wizState.startDate=this.value"></div>
        <div class="ff"><label class="fl">Planerat slutdatum</label><input type="date" class="fi" value="${s.endDate}" oninput="_wizState.endDate=this.value"></div>
      </div>`;
  } else {
    body += `
      <div style="background:var(--bg-subtle);padding:14px 16px;border-radius:4px;font-size:13px;line-height:1.75">
        <div><strong>Projekt:</strong> ${s.name || '<em>(saknas)</em>'} (${s.id})</div>
        <div><strong>Typ:</strong> ${s.type}</div>
        <div><strong>Kund:</strong> ${s.customer || '<em>(saknas)</em>'}${s.city ? ' · ' + s.city : ''}</div>
        <div><strong>Kontraktsvärde:</strong> ${s.value.toLocaleString('sv-SE')} kr</div>
        <div><strong>PM:</strong> ${s.pm}</div>
        <div><strong>Period:</strong> ${s.startDate || '?'} → ${s.endDate || '?'}</div>
      </div>
      <div class="note-box" style="margin-top:14px;font-size:12.5px">
        När du klickar <strong>Skapa projekt</strong> anropas <code>POST /api/ProjectProvisioner</code>
        som skapar sub-site, applicerar <code>pnp-template.xml</code>, skapar SP-grupper och registrerar
        projektet i hub-siten.
      </div>`;
  }
  const back = s.step > 1 ? `<button class="btn btn-secondary" onclick="_wizStep(-1)">‹ Tillbaka</button>` : `<button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>`;
  const next = s.step < 4 ? `<button class="btn btn-primary" onclick="_wizStep(1)">Nästa ›</button>` : `<button class="btn btn-primary" onclick="_wizProvision()">Skapa projekt</button>`;
  openModal('Nytt projekt — steg ' + s.step + ' av 4', body, back + next);
}

function _wizStep(delta) {
  const s = _wizState;
  if (delta > 0) {
    let rules = [];
    if (s.step === 1) rules = [
      { value: s.name, label: 'Projektnamn', required: true, el: document.getElementById('wz-name') },
      { value: s.id,   label: 'Projekt-ID',  required: true, el: document.getElementById('wz-id') }
    ];
    else if (s.step === 2) rules = [
      { value: s.customer, label: 'Kundnamn', required: true }
    ];
    else if (s.step === 3) rules = [
      { value: s.value, label: 'Kontraktsvärde', required: true, type: 'number', min: 1 }
    ];
    if (rules.length && !validateForm(rules).ok) return;
  }
  s.step += delta;
  _renderWizard();
}

function _wizProvision() {
  const s = _wizState;
  const body = `
    <div style="padding:8px 4px">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">Provisionerar projekt <strong>${s.id}</strong>...</div>
      <div id="pv-step" style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--primary)">Startar...</div>
      <div style="height:8px;background:var(--bg-grey);border-radius:4px;overflow:hidden;margin-bottom:16px">
        <div id="pv-bar" style="height:100%;width:0%;background:var(--accent-green);transition:width .4s ease"></div>
      </div>
      <div id="pv-log" style="font-family:monospace;font-size:11.5px;color:var(--text-muted);background:var(--bg-subtle);padding:10px 12px;border-radius:4px;max-height:160px;overflow:auto"></div>
    </div>
  `;
  openModal('Skapar projekt — ' + s.id, body, '<button class="btn btn-secondary" onclick="closeModal()" id="pv-close" disabled>Stäng</button>');
  _provisionStep(0);
}

function _provisionStep(step) {
  const steps = [
    { p:15, txt:'Skapar sub-site via Graph API...',                 log:'→ POST /sites/{hub}/sites · 201 Created' },
    { p:35, txt:'Applicerar pnp-template.xml...',                    log:'→ Invoke-PnPSiteTemplate · 9 lists, 67 fields' },
    { p:60, txt:'Skapar SP-grupper (Owners/PL/Ekonomi/Fält/Läsare)', log:'→ POST /groups · 5 grupper skapade' },
    { p:80, txt:'Lägger till rad i Projektkatalog...',               log:'→ POST /_api/web/lists/.../Projektkatalog/items · 200 OK' },
    { p:95, txt:'Synkar behörigheter...',                            log:'→ PL tilldelad Owners, Ekonomi tilldelad Ekonomi-grupp' },
    { p:100, txt:'Klar!',                                             log:`✓ Projekt ${_wizState.id} skapat · siteUrl: /sites/next/${_wizState.id}` }
  ];
  if (step >= steps.length) {
    const btn = document.getElementById('pv-close');
    if (btn) btn.disabled = false;
    toast(`Projekt ${_wizState.id} skapat`,'success');
    return;
  }
  const s = steps[step];
  const bar = document.getElementById('pv-bar');
  const txt = document.getElementById('pv-step');
  const log = document.getElementById('pv-log');
  if (bar) bar.style.width = `${s.p}%`;
  if (txt) txt.textContent = s.txt;
  if (log) log.innerHTML += `<div>${s.log}</div>`;
  setTimeout(() => _provisionStep(step + 1), 550);
}

function openSubmitWeek() {
  const w = WEEK_DATA[currentWeek];
  if (w.locked) { toast(`${w.label.split(' · ')[0]} är redan godkänd och låst`, 'info'); return; }
  const wkNum = (w.label.match(/Vecka (\d+)/) || [])[1] || '';
  const grand = w.rows.reduce((s, r) => s + r.hours.reduce((a, b) => a + b, 0), 0);
  showConfirm('📋', `Lämna in tidrapport ${w.label.split(' · ')[0]}?`,
    `Du är på väg att lämna in din tidrapport för vecka ${wkNum} med totalt ${grand} timmar. Rapporten skickas till Anna Lindqvist för godkännande.`,
    'Lämna in', 'btn-primary',
    () => toast(`Tidrapport vecka ${wkNum} inskickad för godkännande`, 'success')
  );
}

// ── ÄTA actions ────────────────────────────────────────
function approveATA() {
  showConfirm(
    '✅',
    'Godkänn ÄTA-002?',
    'Godkänn "Ändrat fönsterglastyp — 4-glas" med beräknad kostnad 18 750 kr? Beslutet registreras i systemet och bekräftas via e-post.',
    'Godkänn',
    'btn-green',
    () => {
      document.getElementById('ata002-actions').style.display = 'none';
      const d = document.getElementById('ata002-decision');
      d.className = 'ata-decision ata-dec-ok show';
      d.innerHTML = '✓ Godkänd av Anna Lindqvist · 14 apr 2026 — 18 750 kr godkänt';
      document.querySelector('#ata002-badge').className = 'badge badge-done';
      document.querySelector('#ata002-badge').textContent = 'Godkänd';
      toast('ÄTA-002 godkänd — 18 750 kr','success');
    }
  );
}

function rejectATA() {
  const body = `
    <p style="font-size:13.5px;color:var(--text-muted);margin-bottom:16px">Ange orsak till nekande av ÄTA-002:</p>
    <textarea class="ft" id="reject-reason" style="min-height:90px" placeholder="Orsak till nekande...">Kräver ytterligare teknisk dokumentation innan vi kan godkänna uppgraderingen.</textarea>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
    <button class="btn btn-red" onclick="doRejectATA()">Skicka nekande</button>
  `;
  openModal('Neka ÄTA-002', body, footer);
}

function doRejectATA() {
  closeModal();
  document.getElementById('ata002-actions').style.display = 'none';
  const d = document.getElementById('ata002-decision');
  d.className = 'ata-decision ata-dec-no show';
  d.innerHTML = '✕ Nekad av Anna Lindqvist · 14 apr 2026';
  document.querySelector('#ata002-badge').className = 'badge badge-error';
  document.querySelector('#ata002-badge').textContent = 'Nekad';
  toast('ÄTA-002 nekad','warn');
}

function requestATASupplement() {
  const body = `
    <p style="font-size:13.5px;color:var(--text-muted);margin-bottom:16px">Beskriv vilken komplettering som krävs för ÄTA-002:</p>
    <textarea class="ft" id="supplement-text" style="min-height:90px" placeholder="Beskriv vilken kompletterande information som behövs...">Vänligen bifoga energiberäkning från certifierad energikonsult samt prisunderlag från minst två leverantörer.</textarea>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
    <button class="btn btn-primary" onclick="closeModal();doRequestSupplement()">Skicka begäran</button>
  `;
  openModal('Begär komplettering — ÄTA-002', body, footer);
}

function doRequestSupplement() {
  document.getElementById('ata002-actions').style.display = 'none';
  const d = document.getElementById('ata002-decision');
  d.className = 'ata-decision ata-dec-req show';
  d.innerHTML = '⟳ Komplettering begärd av Anna Lindqvist · 14 apr 2026';
  toast('Begäran om komplettering skickad till Marcus Bergström','info');
}

// ── Filter functions ───────────────────────────────────
function filterAO(tab, statusFilter) {
  document.querySelectorAll('#ao-filter-tabs .ftab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.querySelectorAll('.ao-row').forEach(row => {
    row.style.display = (!statusFilter || row.dataset.status === statusFilter) ? '' : 'none';
  });
}

function filterATA(tab, statusFilter) {
  document.querySelectorAll('#ata-filter-tabs .ftab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.querySelectorAll('.ata-card').forEach(card => {
    card.style.display = (!statusFilter || card.dataset.status === statusFilter) ? '' : 'none';
  });
}

function filterHub(tab, statusFilter) {
  document.querySelectorAll('#hub-filter-tabs .ftab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.querySelectorAll('.proj-card').forEach(card => {
    card.style.display = (!statusFilter || card.dataset.status === statusFilter) ? '' : 'none';
  });
}

function setAvvView(tab, view) {
  document.querySelectorAll('#avv-view-tabs .ftab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById('avv-kanban').style.display = view === 'kanban' ? 'block' : 'none';
  document.getElementById('avv-list').style.display   = view === 'list'   ? 'block' : 'none';
}

// ── Timesheet week navigation ──────────────────────────

function prevWeek() { if (currentWeek > 0) { currentWeek--; renderTimesheetWeek(); } }
function nextWeek() { if (currentWeek < WEEK_DATA.length - 1) { currentWeek++; renderTimesheetWeek(); } }

// ── Timesheet: live row total + column totals + lock ──
function tsRecalc(rowIdx) {
  const row = document.querySelector(`#ts-tbody tr[data-ts-row="${rowIdx}"]`);
  if (!row) return;
  const inputs = row.querySelectorAll('input.ts-input');
  let rowSum = 0;
  inputs.forEach(i => { rowSum += Number(i.value) || 0; });
  const totalCell = document.getElementById(`ts-total-${rowIdx}`);
  if (totalCell) totalCell.textContent = `${rowSum}h`;
  tsRecalcColumns();
}

function tsRecalcColumns() {
  const rows = document.querySelectorAll('#ts-tbody tr[data-ts-row]');
  const colSums = [0,0,0,0,0];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input.ts-input');
    inputs.forEach((inp, idx) => { colSums[idx] += Number(inp.value) || 0; });
  });
  let grand = 0;
  colSums.forEach((s, i) => {
    const cell = document.getElementById(`ts-col-${i}`);
    if (cell) cell.textContent = `${s}h`;
    grand += s;
  });
  const g = document.getElementById('ts-grand');
  if (g) g.textContent = `${grand}h`;
}

// ── Fortnox sync simulation (KF + LevF views) ──
function syncFortnox(kind) {
  const title = kind === 'kf' ? 'Synkar kundfakturor till Fortnox' : 'Synkar leverantörsfakturor från Fortnox';
  const label = kind === 'kf' ? 'Kundfakturor' : 'Leverantörsfakturor';
  const body = `
    <div style="padding:8px 4px">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">
        Ansluter till Fortnox API och ${kind === 'kf' ? 'skickar nya/uppdaterade fakturor' : 'hämtar senaste betalningsstatus för inkommande fakturor'}.
      </div>
      <div id="fnox-step" style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--primary)">Kontaktar Fortnox API...</div>
      <div style="height:8px;background:var(--bg-grey);border-radius:4px;overflow:hidden;margin-bottom:16px">
        <div id="fnox-bar" style="height:100%;width:0%;background:var(--accent-green);transition:width .35s ease"></div>
      </div>
      <div id="fnox-log" style="font-family:monospace;font-size:11.5px;color:var(--text-muted);background:var(--bg-subtle);padding:10px 12px;border-radius:4px;max-height:140px;overflow:auto"></div>
    </div>
  `;
  openModal(title, body, '<button class="btn btn-secondary" onclick="closeModal()" id="fnox-close" disabled>Stäng</button>');
  _fortnoxStep(0, kind, label);
}

function _fortnoxStep(step, kind, label) {
  const steps = [
    { p:20, txt:'Autentiserar mot Fortnox (OAuth2)...', log:'→ POST /oauth/v1/token · 200 OK' },
    { p:45, txt:'Läser fakturor från SharePoint...',   log:`→ GET /_api/web/lists/GetByTitle('${label}')/items · ${kind === 'kf' ? '3' : '4'} poster` },
    { p:70, txt:'Skickar till Fortnox...',              log:kind === 'kf' ? '→ POST /3/invoices · 1 ny, 2 oförändrade' : '→ GET /3/supplierinvoices · 4 matchade · 1 betalstatus ändrad' },
    { p:95, txt:'Uppdaterar FortnoxID i SharePoint...', log:'→ PATCH /_api/web/lists/.../items(X) · 1 rad uppdaterad' },
    { p:100, txt:'Klar!',                                log:`✓ Synkronisering klar · ${kind === 'kf' ? '1 faktura skickad' : '1 status uppdaterad'}` }
  ];
  if (step >= steps.length) {
    const closeBtn = document.getElementById('fnox-close');
    if (closeBtn) closeBtn.disabled = false;
    toast(`Fortnox-synk klar — ${kind === 'kf' ? '1 faktura skickad' : '1 status uppdaterad'}`, 'success');
    return;
  }
  const s = steps[step];
  const bar = document.getElementById('fnox-bar');
  const txt = document.getElementById('fnox-step');
  const log = document.getElementById('fnox-log');
  if (bar) bar.style.width = `${s.p}%`;
  if (txt) txt.textContent = s.txt;
  if (log) log.innerHTML += `<div>${s.log}</div>`;
  setTimeout(() => _fortnoxStep(step + 1, kind, label), 450);
}

function tsLockRow(rowIdx) {
  const row = document.querySelector(`#ts-tbody tr[data-ts-row="${rowIdx}"]`);
  if (!row) return;
  const inputs = row.querySelectorAll('input.ts-input');
  inputs.forEach(i => { i.disabled = true; });
  const badge = document.getElementById(`ts-status-${rowIdx}`);
  if (badge) { badge.className = 'badge badge-done'; badge.textContent = 'Låst'; }
  const btn = document.getElementById(`ts-lock-${rowIdx}`);
  if (btn) { btn.textContent = 'Låst'; btn.disabled = true; btn.className = 'btn btn-xs btn-secondary'; }
  toast(`Rad ${rowIdx + 1} låst — inga fler ändringar möjliga`, 'success');
}

function renderTimesheetWeek() {
  const w = WEEK_DATA[currentWeek];

  document.getElementById('week-label').textContent = w.label;
  const badge = document.getElementById('week-status');
  badge.textContent = w.status;
  badge.className = `badge ${w.status === 'Godkänd' ? 'badge-done' : w.status === 'Pågår' ? 'badge-active' : 'badge-pending'}`;

  const submitBtn = document.getElementById('ts-submit-btn');
  if (submitBtn) {
    if (w.locked) {
      submitBtn.textContent = '🔒 Vecka godkänd';
      submitBtn.className = 'btn btn-secondary';
      submitBtn.onclick = () => toast(`${w.label.split(' · ')[0]} är låst — redan godkänd`, 'info');
    } else {
      submitBtn.textContent = 'Lämna in vecka';
      submitBtn.className = 'btn btn-primary';
      submitBtn.onclick = openSubmitWeek;
    }
  }

  const daysRow = document.getElementById('ts-days-row');
  if (daysRow) {
    daysRow.innerHTML = `<th class="name-col" style="width:160px">Person</th>${w.days.map(d => `<th>${d}</th>`).join('')}<th style="background:var(--bg-subtle);color:var(--primary)">Totalt</th><th>Status</th>`;
  }

  const tbody = document.getElementById('ts-tbody');
  if (tbody) {
    const statusCls = s => s === 'Godkänd' ? 'badge-done' : s === 'Pågår' ? 'badge-active' : 'badge-pending';
    let html = w.rows.map((row, rowIdx) => {
      const total = row.hours.reduce((a, b) => a + b, 0);
      const cells = row.hours.map((h, i) => {
        if (h === 0) {
          if (!w.locked) return `<td class="zero" onclick="openLogHours(${rowIdx},${i},'${w.days[i]}')" style="cursor:pointer;color:var(--accent-green);font-weight:700" title="Logga timmar">＋</td>`;
          return `<td class="zero">–</td>`;
        }
        const ao = row.ao[i] || '';
        const tip = ao ? `${h}h — ${ao}` : `${h}h registrerade`;
        if (w.locked) return `<td class="hc">${h}h</td>`;
        return `<td class="hc" onclick="toast('${tip}','info')" style="cursor:pointer">${h}h</td>`;
      }).join('');
      return `<tr><td class="nc"><div style="display:flex;align-items:center;gap:8px"><div class="av" style="width:26px;height:26px;font-size:11px;background:${row.bg}">${row.initials}</div> ${row.name}</div></td>${cells}<td class="tc">${total}h</td><td><span class="badge ${statusCls(row.status)}">${row.status}</span></td></tr>`;
    }).join('');
    const grand = w.rows.reduce((s, r) => s + r.hours.reduce((a, b) => a + b, 0), 0);
    html += `<tr class="total-row"><td class="nc">Summa</td>${w.totals.map(t => `<td>${t > 0 ? t + 'h' : '–'}</td>`).join('')}<td class="tc">${grand}h</td><td></td></tr>`;
    tbody.innerHTML = html;
  }

  const actCard = document.getElementById('ts-activity-card');
  if (actCard) {
    const wkNum = (w.label.match(/Vecka (\d+)/) || [])[1] || '';
    actCard.querySelector('.card-title').textContent = `Timmar per aktivitet — Vecka ${wkNum}`;
    const actBody = document.getElementById('ts-activity-body');
    if (actBody) {
      actBody.innerHTML = w.activities.map(a =>
        `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><span>${a.label}</span><strong style="color:var(--primary)">${a.hours}</strong></div>`
      ).join('');
    }
  }
}

// ── Resource card click ───────────────────────────────
function openResCard(name, role, projects, email) {
  const body = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
      <div class="av" style="width:52px;height:52px;font-size:18px;background:var(--bg-subtle)">${name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
      <div><div style="font-size:17px;font-weight:700">${name}</div><div style="font-size:13px;color:var(--text-muted)">${role}</div></div>
    </div>
    <div class="dr"><span class="dk">E-post</span><span class="dv" style="color:var(--primary-teal)">${email}</span></div>
    <div class="dr"><span class="dk">Aktiva projekt</span><span class="dv">${projects}</span></div>
    <div class="dr"><span class="dk">Timmar denna vecka</span><span class="dv">32h</span></div>
    <div class="dr"><span class="dk">Inloggad senast</span><span class="dv">14 apr 2026, 08:12</span></div>
  `;
  const footer = `<button class="btn btn-secondary" onclick="closeModal()">Stäng</button>`;
  openModal(name, body, footer);
}

// ══════════════════════════════════════════════════════
// QUICK WIN 1 — Checklist detail modal  (data → data.js)
// ══════════════════════════════════════════════════════

function openChecklist(id) {
  const d = CHECKLIST_DATA[id];
  if (!d) return;
  const doneCount = d.items.filter(i => i.done).length;
  const pct = Math.round(doneCount / d.items.length * 100);
  const progClass = pct >= 100 ? 'prog-green' : pct >= 60 ? 'prog-gold' : 'prog-blue';

  const itemsHTML = d.items.map((item, i) => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
      <input type="checkbox" id="ci${i}" ${item.done ? 'checked' : ''}
        style="margin-top:2px;accent-color:var(--accent-green);width:16px;height:16px;flex-shrink:0;cursor:pointer">
      <label for="ci${i}" style="font-size:13.5px;cursor:pointer;
        color:${item.done ? 'var(--text-muted)' : 'var(--text)'};
        ${item.done ? 'text-decoration:line-through' : ''}">${item.text}</label>
    </div>
  `).join('');

  const body = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span class="badge badge-info">${d.category}</span>
      ${d.linkedAO ? `<span style="font-size:12px;color:var(--text-muted)">Kopplad: ${d.linkedAO}</span>` : ''}
      <span style="font-size:12px;color:var(--text-muted);margin-left:auto">Uppdaterad ${d.updated}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px">
      <span style="color:var(--text-muted)">Framdrift</span>
      <strong style="color:var(--primary)">${doneCount} / ${d.items.length} klara</strong>
    </div>
    <div class="prog-bar" style="margin-bottom:16px">
      <div class="prog-fill ${progClass}" style="width:${pct}%"></div>
    </div>
    ${itemsHTML}
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Stäng</button>
    <button class="btn btn-primary" onclick="closeModal();toast('Checklista sparad','success')">Spara</button>
  `;
  openModal(d.name, body, footer);
}

// ══════════════════════════════════════════════════════
// QUICK WIN 2 — Supplier detail modal  (data → data.js)
// ══════════════════════════════════════════════════════

function openSupplier(id) {
  const d = SUPPLIER_DATA[id];
  if (!d) return;

  const projects = d.activeProjects.map(p =>
    `<div style="font-size:12.5px;color:var(--primary-teal);padding:3px 0">${p}</div>`
  ).join('');

  const invoiceRows = d.invoices.length
    ? d.invoices.map(inv => `
        <div class="dr">
          <span class="dk">${inv.num} · ${inv.date}</span>
          <span class="dv" style="display:flex;align-items:center;gap:8px">
            <span class="badge ${inv.cls}" style="font-size:10px">${inv.status}</span>
            ${inv.amount}
          </span>
        </div>`)
        .join('')
    : '<p style="font-size:13px;color:var(--text-light);padding:8px 0">Inga fakturor registrerade</p>';

  const body = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <span class="badge ${d.statusClass}">${d.status}</span>
      <span style="font-size:12px;color:var(--text-muted)">${d.category}</span>
      <span style="margin-left:auto;font-size:12px;color:var(--text-muted)">Leverantör sedan ${d.since}</span>
    </div>
    <div class="dr"><span class="dk">Org.nr</span><span class="dv">${d.orgnr}</span></div>
    <div class="dr"><span class="dk">Kontaktperson</span><span class="dv">${d.contact}</span></div>
    <div class="dr"><span class="dk">E-post</span><span class="dv" style="color:var(--primary-teal)">${d.email}</span></div>
    <div class="dr"><span class="dk">Telefon</span><span class="dv">${d.phone}</span></div>
    <div class="dr"><span class="dk">Kreditvärdering</span><span class="dv">${d.rating}</span></div>
    <div class="dl-sec">Aktiva projekt</div>
    <div style="padding:6px 0">${projects}</div>
    <div class="dl-sec">Senaste fakturor</div>
    ${invoiceRows}
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Stäng</button>
    <button class="btn btn-primary" onclick="closeModal();toast('Öppnar leverantörsprofil i Fortnox','info')">Öppna i Fortnox</button>
  `;
  openModal(d.name, body, footer);
}

// ══════════════════════════════════════════════════════
// QUICK WIN 4 — Leverantörsfakturor inline approve
// ══════════════════════════════════════════════════════

function approveLevInvoice(rowId, invoiceRef) {
  showConfirm(
    '✓',
    `Godkänn faktura ${invoiceRef}?`,
    'Fakturan godkänns och skickas till Fortnox för betalning.',
    'Godkänn faktura',
    'btn-green',
    () => {
      const row = document.getElementById(rowId);
      if (!row) return;
      const badge = row.querySelector('.badge');
      if (badge) { badge.className = 'badge badge-active'; badge.textContent = 'Godkänd'; }
      const btn = row.querySelector('button');
      if (btn) {
        btn.textContent = 'Visa';
        btn.setAttribute('onclick', `event.stopPropagation();toast('Öppnar ${invoiceRef} i Fortnox','info')`);
      }
      toast(`Faktura ${invoiceRef} godkänd — skickas till Fortnox`, 'success');
    }
  );
}

// ══════════════════════════════════════════════════════
// CHANGE C — Budget category drill-down  (data → data.js)
// ══════════════════════════════════════════════════════

function openBudgetCategory(key) {
  const d = BUDGET_CATEGORY_DATA[key];
  if (!d) return;
  const pctColor = d.pct >= 95 ? 'var(--accent-red)' : d.pct >= 80 ? 'var(--accent-gold)' : 'var(--accent-green)';
  const progClass = d.pct >= 95 ? 'prog-red' : d.pct >= 80 ? 'prog-gold' : 'prog-green';

  const lines = d.lines.map(l => `
    <div class="dr" style="align-items:flex-start;padding:9px 0">
      <div>
        <div style="font-size:13px">${l.desc}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${l.supplier} · ${l.date}</div>
      </div>
      <div style="font-weight:600;font-size:13px;flex-shrink:0;margin-left:16px">${l.amount}</div>
    </div>
  `).join('');

  const body = `
    <div style="background:var(--bg-subtle);padding:14px 16px;border-radius:4px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
        <span style="color:var(--text-muted)">Budget</span>
        <strong>${d.budget.toLocaleString('sv-SE')} kr</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px">
        <span style="color:var(--text-muted)">Faktiskt utfall</span>
        <strong style="color:${pctColor}">${d.actual.toLocaleString('sv-SE')} kr</strong>
      </div>
      <div class="prog-bar" style="height:10px">
        <div class="prog-fill ${progClass}" style="width:${d.pct}%"></div>
      </div>
      <div style="text-align:right;font-size:11px;color:${pctColor};margin-top:4px;font-weight:700">${d.pct}% av budgeten förbrukat</div>
    </div>
    <div class="dl-sec">Kostnadsrader</div>
    ${lines}
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Stäng</button>
    <button class="btn btn-primary" onclick="closeModal();toast('Kategorirapport exporteras...','success')">Exportera</button>
  `;
  openModal(d.name, body, footer);
}

// ══════════════════════════════════════════════════════
// CHANGE A — Multi-project context  (data → data.js)
// ══════════════════════════════════════════════════════

function openProject(projectId) {
  currentProjectId = projectId;
  const p = PROJECT_DATA[projectId];
  if (!p) return;

  document.getElementById('nav-project-title').textContent = p.name;

  // ── Item 8: Update all breadcrumb project links ──────
  document.querySelectorAll('.bc-proj').forEach(el => {
    el.textContent = p.name;
    el.onclick = p.fullDemo ? () => navigate('dashboard') : () => openProject(p.id);
  });

  // ── Item 3: Update left nav badges ────────────────────
  const aoNavCnt = document.querySelector('.nav-item[data-view="arbetsorder"] .nav-cnt');
  if (aoNavCnt) aoNavCnt.textContent = p.aoCount > 0 ? String(p.aoCount) : '';
  const ataNavCnt = document.querySelector('.nav-item[data-view="ata"] .nav-cnt');
  if (ataNavCnt) ataNavCnt.textContent = p.ataCount > 0 ? String(p.ataCount) : '';
  const avvNavBadge = document.querySelector('.nav-item[data-view="avvikelser"] .nav-badge');
  if (avvNavBadge) {
    avvNavBadge.textContent = String(p.avvCount);
    avvNavBadge.style.display = p.avvCount > 0 ? '' : 'none';
  }

  if (p.fullDemo) {
    navigate('dashboard');
    return;
  }

  const spentPct = p.budget > 0 ? Math.round(p.spent / p.budget * 100) : 0;
  const badgeClass = p.status === 'Aktiv' ? 'badge-active'
    : p.status === 'Avslutad' ? 'badge-done' : 'badge-pending';

  document.getElementById('plim-bc').textContent = p.name;
  document.getElementById('plim-title').textContent = p.name;
  document.getElementById('plim-subtitle').textContent = `${p.id} · ${p.client} · PM: ${p.pm}`;

  const badge = document.getElementById('plim-badge');
  badge.className = `badge ${badgeClass}`;
  badge.textContent = `${p.status} · ${p.phase}`;

  document.getElementById('plim-bpct').innerHTML = spentPct > 0
    ? `${spentPct}<span style="font-size:16px;font-weight:500">%</span>` : '0%';
  document.getElementById('plim-bsub').textContent =
    `${p.spent.toLocaleString('sv-SE')} kr av ${p.budget.toLocaleString('sv-SE')} kr`;

  document.getElementById('plim-dev').textContent = String(p.deviations);
  document.getElementById('plim-devsub').textContent = p.devSub;

  document.getElementById('plim-tasks').innerHTML = p.tasksTotal > 0
    ? `${p.tasksDone}<span style="font-size:16px;font-weight:500">/${p.tasksTotal}</span>` : '—';
  document.getElementById('plim-taskssub').textContent = p.tasksSub;

  document.getElementById('plim-days').textContent = p.daysLeft > 0 ? String(p.daysLeft) : '—';
  document.getElementById('plim-dayssub').textContent = `Slutdatum ${p.endDate}`;

  navigate('project-limited');
}

// Register project-limited as a navigable view
ALL_VIEWS.push('project-limited');

// ══════════════════════════════════════════════════════
// CHANGE B — Search overlay  (SEARCH_ITEMS + state → data.js)
// ══════════════════════════════════════════════════════

function openSearch() {
  _searchFocusedIdx = -1;
  document.getElementById('search-overlay').classList.add('open');
  setTimeout(() => document.getElementById('search-input').focus(), 50);
  renderSearchResults('');
}

function closeSearch() {
  document.getElementById('search-overlay').classList.remove('open');
  document.getElementById('search-input').value = '';
  _searchFocusedIdx = -1;
}

function doSearch(query) {
  renderSearchResults(query.trim().toLowerCase());
}

function _buildLiveSearchPool() {
  const pool = SEARCH_ITEMS.slice();

  // Budget categories
  if (typeof BUDGET_CATEGORY_DATA !== 'undefined') {
    Object.keys(BUDGET_CATEGORY_DATA).forEach(k => {
      const c = BUDGET_CATEGORY_DATA[k];
      pool.push({
        icon:'💰',
        title:`Budget — ${c.name || k}`,
        sub:`Kategori · ${c.spent || '?'} / ${c.budget || '?'}`,
        action:()=>{closeSearch();navigate('budget');}
      });
    });
  }

  // Leverantörsfakturor (live)
  if (typeof LF_DATA !== 'undefined') {
    Object.keys(LF_DATA).forEach(id => {
      const d = LF_DATA[id];
      pool.push({
        icon:'📥',
        title:`${d.id} — ${d.supplier}`,
        sub:`Leverantörsfaktura · ${d.amount} · ${d.status}`,
        action:()=>{closeSearch();navigate('levfakturor');setTimeout(()=>openLF(id),80);}
      });
    });
  }

  // Kundfakturor (live)
  if (typeof KF_DATA !== 'undefined') {
    Object.keys(KF_DATA).forEach(id => {
      const d = KF_DATA[id];
      pool.push({
        icon:'📤',
        title:`${id} — ${d.customer || 'Fastighets AB Centrum'}`,
        sub:`Kundfaktura · ${d.amount || ''} · ${d.status || ''}`,
        action:()=>{closeSearch();navigate('kundfakturor');setTimeout(()=>openKF(id),80);}
      });
    });
  }

  // Diary entries (live)
  if (typeof DIARY_DATA !== 'undefined' && Array.isArray(DIARY_DATA)) {
    DIARY_DATA.forEach((entry, idx) => {
      pool.push({
        icon:'📔',
        title:`Dagbok ${entry.date || entry.title || ('post ' + idx)}`,
        sub:`${entry.weather || ''} · ${(entry.text || '').slice(0,60)}`,
        action:()=>{closeSearch();navigate('dagbok');setTimeout(()=>openDiaryEntry(idx),80);}
      });
    });
  }

  return pool;
}

function renderSearchResults(query) {
  _searchFocusedIdx = -1;
  const container = document.getElementById('search-results-list');
  const pool = _buildLiveSearchPool();
  _searchResults = query
    ? pool.filter(item =>
        item.title.toLowerCase().includes(query) || item.sub.toLowerCase().includes(query))
    : pool.slice(0, 8);

  if (!_searchResults.length) {
    container.innerHTML = `<div class="search-no-results">Inga resultat för "<strong>${query}</strong>"</div>`;
    return;
  }

  container.innerHTML = _searchResults.map((item, i) => `
    <div class="search-result" onclick="handleSearchResult(${i})">
      <div class="sr-icon">${item.icon}</div>
      <div class="sr-text">
        <div class="sr-title">${item.title}</div>
        <div class="sr-sub">${item.sub}</div>
      </div>
    </div>
  `).join('');
}

function handleSearchResult(idx) {
  closeSearch();
  if (_searchResults[idx]) _searchResults[idx].action();
}

// ══════════════════════════════════════════════════════
// ÄTA-003 full detail modal
// ══════════════════════════════════════════════════════
function openATA003() {
  const body = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span class="badge badge-done">Godkänd</span>
      <span style="font-size:12px;color:var(--text-muted)">Ändringsarbete · 19 feb 2026</span>
    </div>
    <p style="font-size:13.5px;color:var(--text-muted);line-height:1.5;margin-bottom:14px">
      Rivning av icke-bärande vägg mellan rum 108 och 109 för öppen planlösning
      enligt kunds önskemål. Rivningen utfördes utan komplikationer. Gipsning och
      spackling av angränsande ytor ingick i åtgärden.
    </p>
    <div class="dr"><span class="dk">Typ</span><span class="dv">Ändringsarbete</span></div>
    <div class="dr"><span class="dk">Begärd av</span><span class="dv">Kund (Fastighets AB Centrum)</span></div>
    <div class="dr"><span class="dk">Godkänd kostnad</span><span class="dv" style="font-weight:700;color:var(--accent-green)">11 200 kr</span></div>
    <div class="dr"><span class="dk">Godkänd av</span><span class="dv">Anna Lindqvist</span></div>
    <div class="dr"><span class="dk">Datum</span><span class="dv">19 feb 2026</span></div>
    <div class="dr"><span class="dk">Kopplad AO</span>
      <span class="dv" style="color:var(--primary-teal);cursor:pointer" onclick="closeModal();openAO('AO-002')">AO-002 — VVS rör byte</span>
    </div>
    <div class="dl-sec">Åtgärdslogg</div>
    <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="font-size:11px;font-weight:700;color:var(--text-light)">19 feb · Anna L.</span>
      <div style="margin-top:2px">ÄTA-003 godkänd. Arbetet utförs i samband med AO-002-perioden.</div>
    </div>
    <div style="padding:8px 0;font-size:13px">
      <span style="font-size:11px;font-weight:700;color:var(--text-light)">28 feb · Sven P.</span>
      <div style="margin-top:2px">Rivning klar. Ytor spackladefärdiga. Inga konstruktiva problem.</div>
    </div>
  `;
  const footer = `<button class="btn btn-secondary" onclick="closeModal()">Stäng</button>`;
  openModal('ÄTA-003 — Borttagning av innervägg rum 108', body, footer);
}

// ══════════════════════════════════════════════════════
// Hub stat card filter helper
// ══════════════════════════════════════════════════════
function filterHubTo(status) {
  const tabs = document.querySelectorAll('#hub-filter-tabs .ftab');
  const idx = status === '' ? 0 : status === 'active' ? 1 : status === 'planning' ? 2 : 3;
  if (tabs[idx]) filterHub(tabs[idx], status);
}

// ══════════════════════════════════════════════════════
// Notification panel  (NOTIFICATION_DATA → data.js)
// ══════════════════════════════════════════════════════

function openNotifications() {
  const list = document.getElementById('notif-list');
  if (list) {
    const unreadCount = NOTIFICATION_DATA.filter(n => n.unread).length;
    const badge = document.querySelector('.np-badge');
    if (badge) badge.textContent = unreadCount > 0 ? String(unreadCount) : '';
    if (badge) badge.style.display = unreadCount > 0 ? '' : 'none';
    list.innerHTML = NOTIFICATION_DATA.map((n, i) => `
      <div class="np-item${n.unread ? ' unread' : ''}" onclick="handleNotification(${i})">
        <div class="np-icon np-icon-${n.type}">${n.icon}</div>
        <div class="np-text">
          <div class="np-ntitle">${n.title}</div>
          <div class="np-nsub">${n.sub}</div>
          <div class="np-ntime">${n.time}</div>
        </div>
        ${n.unread ? '<div class="np-dot"></div>' : ''}
      </div>`).join('');
  }
  document.getElementById('notif-overlay').classList.add('open');
  document.getElementById('notif-panel').classList.add('open');
}

function closeNotifications() {
  document.getElementById('notif-overlay').classList.remove('open');
  document.getElementById('notif-panel').classList.remove('open');
}

function toggleNotifications() {
  const panel = document.getElementById('notif-panel');
  if (panel.classList.contains('open')) closeNotifications();
  else openNotifications();
}

function handleNotification(idx) {
  if (NOTIFICATION_DATA[idx]) {
    NOTIFICATION_DATA[idx].unread = false;
    refreshBellBadge();
    NOTIFICATION_DATA[idx].action();
  }
}

function toggleCriticalPath() {
  const wrap = document.querySelector('#view-gantt .gantt-wrap');
  const btn = document.getElementById('gantt-cp-btn');
  if (!wrap || !btn) return;
  const on = wrap.classList.toggle('cp-on');
  btn.textContent = on ? '🔴 Dölj kritisk linje' : '🔴 Visa kritisk linje';
  btn.classList.toggle('btn-primary', on);
  btn.classList.toggle('btn-secondary', !on);
  if (on) toast('Kritisk linje: Demontering → El → Puts → Parkett → Slutbesiktning','info');
}

function toggleMilestones() {
  const wrap = document.querySelector('#view-gantt .gantt-wrap');
  const btn = document.getElementById('gantt-ms-btn');
  if (!wrap || !btn) return;
  const off = wrap.classList.toggle('ms-off');
  btn.textContent = off ? '📍 Visa milstolpar' : '📍 Dölj milstolpar';
}

function refreshBellBadge() {
  const badge = document.getElementById('sb-bell-badge');
  if (!badge) return;
  const unread = NOTIFICATION_DATA.filter(n => n.unread).length;
  if (unread > 0) {
    badge.textContent = String(unread);
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

function markAllNotificationsRead() {
  NOTIFICATION_DATA.forEach(n => { n.unread = false; });
  refreshBellBadge();
  openNotifications();
  toast('Alla notifikationer markerade som lästa','success');
}

// ══════════════════════════════════════════════════════
// Item 1 — ÄTA-001 proper detail modal
// ══════════════════════════════════════════════════════
function openATA001() {
  const body = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span class="badge badge-done">Godkänd</span>
      <span style="font-size:12px;color:var(--text-muted)">Tilläggsarbete · 13 apr 2026</span>
    </div>
    <p style="font-size:13.5px;color:var(--text-muted);line-height:1.5;margin-bottom:14px">
      Kund önskade extra vägguttag i samtliga rum på plan 2, totalt 18 st tillkommande uttag
      ej i ursprunglig ritning. Arbetet utfördes av Sven Persson i samband med AO-001.
    </p>
    <div class="dr"><span class="dk">Typ</span><span class="dv">Tilläggsarbete</span></div>
    <div class="dr"><span class="dk">Begärd av</span><span class="dv">Kund (Fastighets AB Centrum)</span></div>
    <div class="dr"><span class="dk">Godkänd kostnad</span><span class="dv" style="font-weight:700;color:var(--accent-green)">32 500 kr</span></div>
    <div class="dr"><span class="dk">Godkänd av</span><span class="dv">Anna Lindqvist</span></div>
    <div class="dr"><span class="dk">Datum</span><span class="dv">13 apr 2026</span></div>
    <div class="dr"><span class="dk">Kopplad AO</span>
      <span class="dv" style="color:var(--primary-teal);cursor:pointer" onclick="closeModal();openAO('AO-001')">AO-001 — El-installation plan 2</span>
    </div>
    <div class="dl-sec">Åtgärdslogg</div>
    <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="font-size:11px;font-weight:700;color:var(--text-light)">13 apr · Anna L.</span>
      <div style="margin-top:2px">ÄTA-001 godkänd. Kostnad 32 500 kr. Utförs i samband med AO-001-perioden.</div>
    </div>
    <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="font-size:11px;font-weight:700;color:var(--text-light)">12 apr · Marcus B.</span>
      <div style="margin-top:2px">Teknisk genomgång: 18 uttag á ca 1 800 kr inkl. material och arbete.</div>
    </div>
    <div style="padding:8px 0;font-size:13px">
      <span style="font-size:11px;font-weight:700;color:var(--text-light)">10 apr · Kund</span>
      <div style="margin-top:2px">Tilläggsbeställning inkommen per e-post. Referens: Kund-2026-44.</div>
    </div>
  `;
  const footer = `<button class="btn btn-secondary" onclick="closeModal()">Stäng</button>`;
  openModal('ÄTA-001 — Tilläggsarbete elinstallation', body, footer);
}

// ══════════════════════════════════════════════════════
// Item 2 — Timesheet: log hours on empty cells
// ══════════════════════════════════════════════════════
function openLogHours(rowIdx, dayIdx, dayLabel) {
  const w   = WEEK_DATA[currentWeek];
  const row = w.rows[rowIdx];
  const body = `
    <div class="dr"><span class="dk">Person</span><span class="dv">${row.name}</span></div>
    <div class="dr"><span class="dk">Dag</span><span class="dv">${dayLabel}</span></div>
    <div class="ff" style="margin-top:12px"><label class="fl">Antal timmar</label>
      <input type="number" class="fi" id="log-hours-val" min="0.5" max="12" step="0.5" value="8">
    </div>
    <div class="ff"><label class="fl">Arbetsorder</label>
      <select class="fs" id="log-hours-ao">
        <option value="admin">Admin / intern tid</option>
        <option value="AO-001">AO-001 El-installation</option>
        <option value="AO-004">AO-004 Fönsterbyte</option>
      </select>
    </div>
    <div class="ff"><label class="fl">Anteckning</label>
      <textarea class="ft" placeholder="Valfri anteckning om dagens arbete..."></textarea>
    </div>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
    <button class="btn btn-primary" onclick="doLogHours(${rowIdx},${dayIdx})">Spara timmar</button>
  `;
  openModal(`Logga timmar — ${dayLabel}`, body, footer);
}

function doLogHours(rowIdx, dayIdx) {
  const h  = parseFloat(document.getElementById('log-hours-val')?.value) || 0;
  const ao = document.getElementById('log-hours-ao')?.value || 'admin';
  if (h <= 0) { toast('Ange antal timmar', 'warn'); return; }
  closeModal();
  const w = WEEK_DATA[currentWeek];
  w.rows[rowIdx].hours[dayIdx] = h;
  w.rows[rowIdx].ao[dayIdx]    = ao;
  w.totals = w.days.map((_, di) => w.rows.reduce((s, r) => s + r.hours[di], 0));
  renderTimesheetWeek();
  toast(`${h}h loggad för ${w.rows[rowIdx].name}`, 'success');
}

// ══════════════════════════════════════════════════════
// Item 5 — Avvikelse kanban: Flytta till
// ══════════════════════════════════════════════════════
const _KANBAN_COLS = {
  'avv-col-open':   'Öppen',
  'avv-col-active': 'Åtgärd pågår',
  'avv-col-fixed':  'Åtgärdad',
  'avv-col-closed': 'Stängd',
};

function promptMove(avvNum) {
  const card = document.querySelector(`.kcard[data-avv="${avvNum}"]`);
  if (!card) return;
  const currentColId = card.closest('.kcol-body')?.id || '';
  const options = Object.entries(_KANBAN_COLS)
    .filter(([id]) => id !== currentColId)
    .map(([id, label]) => `<option value="${id}">${label}</option>`)
    .join('');
  const body = `
    <p style="font-size:13.5px;color:var(--text-muted);margin-bottom:16px">Välj ny status för <strong>${avvNum}</strong>:</p>
    <div class="ff"><label class="fl">Flytta till</label>
      <select class="fs" id="move-target">${options}</select>
    </div>
    <div class="ff"><label class="fl">Kommentar (valfritt)</label>
      <textarea class="ft" id="move-comment" placeholder="Beskriv utförd åtgärd eller orsak till statusändring..."></textarea>
    </div>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
    <button class="btn btn-primary" onclick="doMoveDeviation('${avvNum}')">Flytta</button>
  `;
  openModal(`Flytta ${avvNum}`, body, footer);
}

function doMoveDeviation(avvNum) {
  const targetId = document.getElementById('move-target')?.value;
  if (!targetId) return;
  closeModal();
  const card = document.querySelector(`.kcard[data-avv="${avvNum}"]`);
  const targetCol = document.getElementById(targetId);
  if (!card || !targetCol) return;
  // Remove empty-state placeholder if present
  const placeholder = targetCol.querySelector('div[style*="text-align:center"]');
  if (placeholder) placeholder.remove();
  targetCol.appendChild(card);
  updateKanbanCounts();
  toast(`${avvNum} flyttad till ${_KANBAN_COLS[targetId]}`, 'success');
}

function updateKanbanCounts() {
  Object.keys(_KANBAN_COLS).forEach(colId => {
    const col = document.getElementById(colId);
    if (!col) return;
    const count = col.querySelectorAll('.kcard').length;
    const header = col.previousElementSibling;
    if (header) {
      const cnt = header.querySelector('.kcol-cnt');
      if (cnt) cnt.textContent = String(count);
    }
  });
}

// ══════════════════════════════════════════════════════
// Item 6 — Kundfakturor: invoice detail modal
// ══════════════════════════════════════════════════════
function openKF(num) {
  const d = KF_DATA[num];
  if (!d) return;
  const lines = d.lines.map(l => `
    <div class="dr" style="align-items:flex-start;padding:9px 0">
      <div style="flex:1">
        <div style="font-size:13px">${l.desc}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${l.qty} ${l.unit}</div>
      </div>
      <div style="font-weight:600;font-size:13px;flex-shrink:0;margin-left:16px">${l.amount}</div>
    </div>`).join('');
  const body = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span class="badge ${d.statusClass}">${d.status}</span>
      <span style="font-size:12px;color:var(--text-muted)">${d.client}</span>
    </div>
    <div class="dr"><span class="dk">Fakturanummer</span><span class="dv" style="font-weight:700">${d.num}</span></div>
    <div class="dr"><span class="dk">Fakturadatum</span><span class="dv">${d.date}</span></div>
    <div class="dr"><span class="dk">Förfallodatum</span><span class="dv">${d.dueDate}</span></div>
    <div class="dr"><span class="dk">Referens</span><span class="dv">${d.ref}</span></div>
    <div class="dr"><span class="dk">Period</span><span class="dv">${d.period}</span></div>
    <div class="dl-sec">Fakturarader</div>
    ${lines}
    <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid var(--border-med);margin-top:4px">
      <strong>Totalt exkl. moms</strong>
      <strong style="color:var(--primary)">${d.amount}</strong>
    </div>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Stäng</button>
    <button class="btn btn-primary" onclick="closeModal();toast('Öppnar ${num} i Fortnox','info')">Öppna i Fortnox</button>
  `;
  openModal(`Faktura ${d.num}`, body, footer);
}

function _updateSearchFocus(newIdx) {
  const items = document.querySelectorAll('.search-result');
  items.forEach((el, i) => el.classList.toggle('focused', i === newIdx));
  _searchFocusedIdx = newIdx;
}

// ══════════════════════════════════════════════════════
// Item 1 — Leverantörsfakturor: full detail modal
// ══════════════════════════════════════════════════════

function _ocrColor(pct) {
  if (pct >= 90) return 'var(--accent-green)';
  if (pct >= 80) return 'var(--accent-gold)';
  return 'var(--accent-red)';
}
function _ocrLabel(pct) {
  if (pct >= 90) return 'Hög';
  if (pct >= 80) return 'Medel';
  return 'Låg';
}
function _ocrFillClass(pct) {
  if (pct >= 90) return 'ocr-fill-hi';
  if (pct >= 80) return 'ocr-fill-md';
  return 'ocr-fill-lo';
}

function openLF(id) {
  const d = LF_DATA[id];
  if (!d) return;
  const ocrColor = _ocrColor(d.ocrConfidence);
  const warningBox = d.ocrWarning
    ? `<div style="background:#fff8e6;border-left:3px solid var(--accent-gold);padding:10px 12px;border-radius:0 4px 4px 0;font-size:12px;margin-bottom:12px">
         ⚠ <strong>OCR-varning:</strong> ${d.ocrWarning}
       </div>` : '';
  const lines = d.lines.map(l => `
    <div class="dr" style="padding:8px 0;align-items:flex-start">
      <div style="flex:1"><div style="font-size:13px">${l.desc}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:1px">${l.qty} ${l.unit}</div></div>
      <div style="font-weight:600;font-size:13px;flex-shrink:0;margin-left:16px">${l.amount}</div>
    </div>`).join('');
  const body = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span class="badge ${d.statusClass}">${d.status}</span>
      <span style="font-size:12px;color:var(--text-muted)">${d.supplier}</span>
    </div>
    <div class="dr"><span class="dk">Fakturanummer</span><span class="dv" style="font-weight:700">${d.id}</span></div>
    <div class="dr"><span class="dk">Fakturadatum</span><span class="dv">${d.date}</span></div>
    <div class="dr"><span class="dk">Förfallodatum</span><span class="dv">${d.dueDate}</span></div>
    <div class="dr"><span class="dk">AO-referens</span>
      <span class="dv" style="color:var(--primary-teal);cursor:pointer" onclick="closeModal();openAO('${d.aoRef}')">${d.aoRef} →</span></div>
    <div class="dl-sec" style="margin-top:12px">OCR-avläsning</div>
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0 10px">
      <div style="flex:1"><div class="ocr-track" style="height:8px">
        <div class="ocr-fill ${_ocrFillClass(d.ocrConfidence)}" style="width:${d.ocrConfidence}%"></div>
      </div></div>
      <span style="font-weight:700;color:${ocrColor};min-width:36px;text-align:right">${d.ocrConfidence}%</span>
      <span style="font-size:11px;color:var(--text-muted)">${_ocrLabel(d.ocrConfidence)} konfidensgrad</span>
    </div>
    ${warningBox}
    <div class="dl-sec">Fakturarader</div>
    ${lines}
    <div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid var(--border-med);margin-top:4px">
      <strong>Totalt exkl. moms</strong>
      <strong style="color:var(--primary)">${d.amount}</strong>
    </div>`;
  const canApprove = d.status === 'Väntar godkännande';
  const actionBtns = canApprove
    ? `<button class="btn btn-primary" onclick="doApproveLF('${id}')">✓ Godkänn</button>
       <button class="btn" style="background:var(--accent-red);color:white" onclick="doRejectLF('${id}')">✕ Neka</button>`
    : `<button class="btn btn-secondary" onclick="closeModal();toast('Öppnar ${id} i Fortnox','info')">Öppna i Fortnox</button>`;
  openModal(`Leverantörsfaktura — ${d.id}`,
    body,
    `<button class="btn btn-secondary" onclick="closeModal()">Stäng</button>${actionBtns}`);
}

function doApproveLF(id) {
  const d = LF_DATA[id];
  if (!d) return;
  showConfirm('✓', `Godkänn faktura ${id}?`,
    `${d.amount} · ${d.supplier} — fakturan skickas till Fortnox för betalning.`,
    'Godkänn faktura', 'btn-green',
    () => {
      d.status = 'Godkänd';
      d.statusClass = 'badge-active';
      const row = document.querySelector(`[data-lf="${id}"]`);
      if (row) {
        const badge = row.querySelector('.badge');
        if (badge) { badge.className = 'badge badge-active'; badge.textContent = 'Godkänd'; }
        const btn = row.querySelector('button');
        if (btn) { btn.textContent = 'Fortnox'; btn.setAttribute('onclick', `event.stopPropagation();toast('Öppnar ${id} i Fortnox','info')`); }
      }
      toast(`Faktura ${id} godkänd — skickas till Fortnox`, 'success');
    }
  );
}

function doRejectLF(id) {
  const d = LF_DATA[id];
  if (!d) return;
  openModal(`Neka faktura ${id}`, `
    <div style="margin-bottom:12px;font-size:13px;color:var(--text-muted)">${d.supplier} · ${d.amount}</div>
    <div class="ff"><label class="fl">Anledning</label>
      <select class="fs" id="lf-reject-reason">
        <option>Felaktigt fakturanummer</option><option>Felaktigt belopp</option>
        <option>Saknar AO-referens</option><option>Ej beställt</option><option>Övrigt</option>
      </select></div>
    <div class="ff" style="margin-top:10px"><label class="fl">Kommentar (valfri)</label>
      <input class="fi" id="lf-reject-comment" placeholder="Lämna ett meddelande till leverantören..."></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
     <button class="btn" style="background:var(--accent-red);color:white" onclick="doConfirmRejectLF('${id}')">✕ Neka faktura</button>`);
}

function doConfirmRejectLF(id) {
  const d = LF_DATA[id];
  const sel = document.getElementById('lf-reject-reason');
  const reason = sel ? sel.value : 'Okänd anledning';
  if (d) { d.status = 'Nekad'; d.statusClass = 'badge-neutral'; }
  const row = document.querySelector(`[data-lf="${id}"]`);
  if (row) {
    const badge = row.querySelector('.badge');
    if (badge) { badge.className = 'badge'; badge.style.cssText='background:var(--bg-grey);color:var(--text-muted)'; badge.textContent = 'Nekad'; }
  }
  closeModal();
  toast(`Faktura ${id} nekad — Anledning: ${reason}`, 'warn');
}

// ══════════════════════════════════════════════════════
// Item 2 — Budget: Ny budgetpost
// ══════════════════════════════════════════════════════

function openNewBudgetPost() {
  openModal('Ny budgetpost', `
    <div class="ff"><label class="fl">Kategori</label>
      <input class="fi" id="bp-kategori" placeholder="T.ex. Elinstallation, VVS, Mark..."></div>
    <div class="fg2" style="margin-top:10px">
      <div class="ff"><label class="fl">Budget (kr)</label>
        <input class="fi" type="number" id="bp-budget" placeholder="0" min="0"></div>
      <div class="ff"><label class="fl">AO-referens (valfri)</label>
        <select class="fs" id="bp-aoref">
          <option value="">— ingen —</option>
          <option>AO-001</option><option>AO-002</option><option>AO-003</option>
          <option>AO-004</option><option>AO-005</option>
        </select></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
     <button class="btn btn-primary" onclick="doCreateBudgetPost()">Lägg till</button>`);
}

function doCreateBudgetPost() {
  const kategoriEl = document.getElementById('bp-kategori');
  const budgetEl   = document.getElementById('bp-budget');
  const aoEl       = document.getElementById('bp-aoref');
  const kategori   = kategoriEl ? kategoriEl.value.trim() : '';
  const budgetVal  = budgetEl ? parseInt(budgetEl.value, 10) || 0 : 0;
  const aoRef      = aoEl ? aoEl.value : '';
  if (!kategori) { toast('Ange en kategori', 'warn'); return; }
  const aoLabel  = aoRef ? ` · ${aoRef}` : '';
  const newRow   = document.createElement('div');
  newRow.className = 'brow';
  newRow.style.cursor = 'pointer';
  newRow.innerHTML = `
    <div class="brow-label">${kategori}${aoLabel}</div>
    <div><div class="brow-track"><div class="brow-fill prog-blue" style="width:0%"></div></div>
      <div class="brow-pct">0% · Ny post</div></div>
    <div class="bnum">${budgetVal.toLocaleString('sv-SE')}</div>
    <div class="bnum">0</div>
    <div class="bnum" style="color:var(--accent-green)">0%</div>`;
  const totalsRow = document.querySelector('#view-budget .brow[style*="bg-subtle"]');
  if (totalsRow) {
    totalsRow.parentNode.insertBefore(newRow, totalsRow);
  }
  closeModal();
  toast(`Budgetpost "${kategori}" tillagd — ${budgetVal.toLocaleString('sv-SE')} kr`, 'success');
}

// ══════════════════════════════════════════════════════
// Item 6 — Demo tour modal
// ══════════════════════════════════════════════════════

function openDemoTour() {
  const items = [
    { icon:'📅', title:'Gantt drag-to-reschedule',
      desc:'Dra de färgade aktivitetsstaplarna i Gantt-vyn för att simulera omplanering.',
      nav:'gantt', label:'Gå till Gantt' },
    { icon:'⚠', title:'Kanban flytta avvikelse',
      desc:'Klicka "Flytta →" på ett avvikelsekort för att flytta det till en annan statuskolumn.',
      nav:'avvikelser', label:'Gå till Avvikelser' },
    { icon:'📐', title:'Ritning — lagertoggling + zoom',
      desc:'Slå på/av Byggnad / El / VVS-lager i ritningsvisaren. Zooma in och ut med ± knapparna.',
      nav:'ritning', label:'Gå till Ritning' },
    { icon:'⏱', title:'Tidsrapportering — logga timmar',
      desc:'Klicka på en ＋-cell i tidrapporteringstabellen för att logga timmar direkt.',
      nav:'tidrapport', label:'Gå till Tidsrapport' },
    { icon:'📥', title:'Leverantörsfaktura — OCR + godkännande',
      desc:'Klicka på en faktura för att se OCR-konfidensgrad, fakturarader och godkännandeflöde.',
      nav:'levfakturor', label:'Gå till Leverantörsfakturor' },
    { icon:'🧾', title:'Kundfaktura — detaljvy',
      desc:'Klicka på en kundfaktura för att se fakturarader och öppna i Fortnox.',
      nav:'kundfakturor', label:'Gå till Kundfakturor' },
    { icon:'🏗', title:'Projektbyte — dynamisk kontext',
      desc:'Välj ett annat projekt i hubvyn — navigationstitlar, badges och vägledningstext uppdateras.',
      nav:'hub', label:'Gå till Projekthub' },
    { icon:'🔍', title:'Global sökning (Ctrl+K)',
      desc:'Tryck Ctrl+K var som helst för att söka bland projekt, arbetsorder, avvikelser och personal.',
      nav:null, label:'Öppna sökning' },
  ];
  const rows = items.map(it => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:22px;flex-shrink:0;width:32px;text-align:center">${it.icon}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13.5px;margin-bottom:3px">${it.title}</div>
        <div style="font-size:12.5px;color:var(--text-muted);line-height:1.5">${it.desc}</div>
      </div>
      <button class="btn btn-secondary" style="font-size:12px;padding:4px 10px;flex-shrink:0;margin-top:2px"
        onclick="${it.nav ? `closeModal();navigate('${it.nav}')` : `closeModal();openSearch()`}">${it.label}</button>
    </div>`).join('');
  openModal('🎯 Demo guide — NEXT mockup',
    `<p style="font-size:13px;color:var(--text-muted);margin-bottom:4px">Klicka på en knapp för att navigera direkt till funktionen.</p>
     <div style="margin:0 -20px;padding:0 20px">${rows}</div>`,
    `<button class="btn btn-primary" onclick="closeModal()">Stäng guide</button>`);
}

// ── Ritning layer toggle + zoom ──────────────────────
const _ritningLayers = { byggnad: true, el: true, vvs: true };
let _ritningZoom = 1.0;

function ritningToggleLayer(layer) {
  _ritningLayers[layer] = !_ritningLayers[layer];
  const btn = document.getElementById('lbtn-' + layer);
  if (btn) btn.classList.toggle('active', _ritningLayers[layer]);
  const svg = document.getElementById('ritning-svg');
  if (!svg) return;
  svg.querySelectorAll('.layer-' + layer).forEach(el => {
    el.style.display = _ritningLayers[layer] ? '' : 'none';
  });
}

function ritningZoom(delta) {
  _ritningZoom = Math.min(2.5, Math.max(0.4, _ritningZoom + delta));
  const inner = document.getElementById('ritning-inner');
  if (inner) inner.style.transform = `scale(${_ritningZoom})`;
  const lbl = document.getElementById('ritning-zoom-label');
  if (lbl) lbl.textContent = Math.round(_ritningZoom * 100) + '%';
}

// ── Ritning markup / comment pins ──
let _ritningPins = [];  // { n, xPct, yPct, author, date, text }
let _markupMode = false;

function toggleMarkupMode() {
  _markupMode = !_markupMode;
  const inner = document.getElementById('ritning-inner');
  const btn = document.getElementById('ritning-markup-btn');
  if (inner) inner.classList.toggle('markup-mode', _markupMode);
  if (btn) {
    btn.textContent = _markupMode ? '✖ Avsluta markup' : '✏ Lägg kommentar';
    btn.classList.toggle('btn-primary', _markupMode);
    btn.classList.toggle('btn-secondary', !_markupMode);
  }
  if (_markupMode) toast('Markup-läge aktivt — klicka på ritningen för att lägga en pin','info');
}

function toggleMarkupPins() {
  const inner = document.getElementById('ritning-inner');
  if (!inner) return;
  const hidden = inner.classList.toggle('pins-hidden');
  toast(hidden ? 'Pins dolda' : 'Pins synliga','info');
}

function handlePlanClick(evt) {
  if (!_markupMode) return;
  const overlay = document.getElementById('ritning-pin-overlay');
  if (!overlay) return;
  const rect = overlay.getBoundingClientRect();
  const xPct = ((evt.clientX - rect.left) / rect.width) * 100;
  const yPct = ((evt.clientY - rect.top) / rect.height) * 100;
  _promptPinComment(xPct, yPct);
}

function _promptPinComment(xPct, yPct) {
  const body = `
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Position: ${xPct.toFixed(1)}% × ${yPct.toFixed(1)}%</div>
    <div class="ff"><label class="fl">Kommentar *</label><textarea class="ft" id="pin-text" style="min-height:90px" placeholder="t.ex. 'Fönster här är trasigt — kontrollera innan montering'"></textarea></div>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Avbryt</button>
    <button class="btn btn-primary" onclick="_savePin(${xPct},${yPct})">Spara pin</button>
  `;
  openModal('Ny kommentar på ritning', body, footer);
}

function _savePin(xPct, yPct) {
  const textEl = document.getElementById('pin-text');
  const text = (textEl || {}).value || '';
  if (!validateForm([{ value: text, label: 'Kommentar', required: true, el: textEl }]).ok) return;
  _ritningPins.push({
    n: _ritningPins.length + 1,
    xPct, yPct,
    author: 'Anna Lindqvist',
    date: '15 apr 2026',
    text: text.trim()
  });
  closeModal();
  _renderPins();
  _renderPinComments();
  toggleMarkupMode();
  toast('Pin sparad','success');
}

function _renderPins() {
  const overlay = document.getElementById('ritning-pin-overlay');
  if (!overlay) return;
  overlay.innerHTML = _ritningPins.map(p =>
    `<div class="ritning-pin" style="left:${p.xPct}%;top:${p.yPct}%" title="#${p.n}: ${p.text.replace(/"/g,'&quot;')}" onclick="_showPinInfo(${p.n})"><span>${p.n}</span></div>`
  ).join('');
}

function _renderPinComments() {
  const list = document.getElementById('ritning-cmt-list');
  const count = document.getElementById('ritning-cmt-count');
  if (count) count.textContent = `(${_ritningPins.length})`;
  if (!list) return;
  if (!_ritningPins.length) {
    list.innerHTML = `<div style="padding:10px 0;color:var(--text-muted)">Inga kommentarer ännu. Klicka på <strong>✏ Lägg kommentar</strong> och sedan på ritningen för att skapa en pin.</div>`;
    return;
  }
  list.innerHTML = _ritningPins.map(p =>
    `<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:flex-start">
      <div style="min-width:26px;height:26px;border-radius:50%;background:var(--accent-red,#e74c3c);color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${p.n}</div>
      <div style="flex:1">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">${p.author} · ${p.date}</div>
        <div>${p.text}</div>
      </div>
      <button class="btn btn-xs btn-secondary" onclick="_deletePin(${p.n})">Ta bort</button>
    </div>`
  ).join('');
}

function _showPinInfo(n) {
  const p = _ritningPins.find(x => x.n === n);
  if (p) toast(`#${n} · ${p.author}: ${p.text}`,'info');
}

function _deletePin(n) {
  _ritningPins = _ritningPins.filter(p => p.n !== n).map((p, i) => ({ ...p, n: i + 1 }));
  _renderPins();
  _renderPinComments();
  toast('Pin borttagen','success');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('search-overlay')) closeSearch();
  });

  refreshBellBadge();
  refreshDashboardKPIs();

  // Item 3: Gantt bar drag simulation
  document.querySelectorAll('.gbar').forEach(bar => {
    bar.draggable = true;
    bar.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', bar.textContent.trim());
      setTimeout(() => { bar.style.opacity = '0.45'; bar.style.outline = '2px dashed rgba(255,255,255,.6)'; }, 0);
    });
    bar.addEventListener('dragend', () => {
      bar.style.opacity = '';
      bar.style.outline = '';
      const label = bar.closest('.grow')?.querySelector('.grow-name')?.textContent || 'Aktivitet';
      toast(`"${label}" — period justerad (simulerat)`, 'info');
    });
  });

  document.getElementById('notif-overlay').addEventListener('click', () => closeNotifications());

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSearch(); closeModal(); closeConfirm(); closeNotifications(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }

    const searchOpen = document.getElementById('search-overlay').classList.contains('open');
    if (!searchOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _updateSearchFocus(Math.min(_searchFocusedIdx + 1, _searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _updateSearchFocus(Math.max(_searchFocusedIdx - 1, 0));
    } else if (e.key === 'Enter' && _searchFocusedIdx >= 0) {
      e.preventDefault();
      handleSearchResult(_searchFocusedIdx);
    }
  });
});
