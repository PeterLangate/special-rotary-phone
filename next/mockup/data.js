/* ══════════════════════════════════════════════════════
   FlowSight · Projekthantering · Langate
   data.js — all static data objects and shared state

   NOTE: Property names in this file are MOCKUP-ONLY camelCase
   shorthand (e.g. `num`, `desc`, `status`, `severity`). They do
   NOT match the SharePoint field schema.

   For the real SP internal field names used by SPFx web parts
   and Azure Functions, see mockup/types.ts (English PascalCase:
   AONumber, Description, DeviationStatus, Severity, etc.).

   See docs/field-name-audit.md for the reasoning.
   ══════════════════════════════════════════════════════ */

// ── Shared state ──────────────────────────────────────
let currentProjectId = 'FlowSight-2024-001';
let _searchResults   = [];
let _searchFocusedIdx = -1;

// ── Work order data ────────────────────────────────────
const AO_DATA = {
  'AO-001': {
    num:'AO-001', title:'El-installation plan 2',
    desc:'Byte av elledningar och uttag, hela plan 2. Totalt 18 rum, nya uttag enligt reviderad ritning El-2024-R3.',
    assigned:'Sven Persson', status:'Pågår', period:'10–25 apr 2026',
    progress:80, category:'El', priority:'Hög',
    materials:[
      {item:'Elledning 2.5mm², grön/gul', qty:'180 m', cost:'3 420 kr'},
      {item:'Vägguttag 10A IP20 vit',      qty:'36 st', cost:'2 160 kr'},
      {item:'Kopplingsdosa Ø60mm',         qty:'24 st', cost:'720 kr'},
    ],
    notes:[
      {date:'13 apr', who:'Marcus B.', note:'Ledningsdragning rum 201–212 klar. Foton tagna.'},
      {date:'12 apr', who:'Sven P.',   note:'Startat rum 201–208. Material OK.'},
      {date:'10 apr', who:'Sven P.',   note:'Arbete påbörjat plan 2.'},
    ]
  },
  'AO-002': {
    num:'AO-002', title:'VVS rör byte',
    desc:'Byte av avloppsrör plan 1 och 2. PVC → koppar per ny spec.',
    assigned:'Mia Johansson', status:'Klar', period:'15 mar–5 apr 2026',
    progress:100, category:'VVS', priority:'Medel',
    materials:[],
    notes:[{date:'5 apr', who:'Mia J.', note:'Arbete avslutat. Slutbesiktning klar 10 apr.'}]
  },
  'AO-003': {
    num:'AO-003', title:'Puts och målning',
    desc:'Putsning och målning av alla ytor plan 1–3. Ca 1 200 m².',
    assigned:'Ej tilldelad', status:'Ej startad', period:'28 apr–15 maj 2026',
    progress:0, category:'Ytskikt', priority:'Normal',
    materials:[], notes:[]
  },
  'AO-004': {
    num:'AO-004', title:'Fönsterbyte plan 3',
    desc:'Byte av 12 fönster, plan 3. Energieffektiva 3-glas, U-värde ≤ 0.9.',
    assigned:'Marcus Bergström', status:'Pågår', period:'1–20 apr 2026',
    progress:50, category:'Byggnad', priority:'Hög',
    materials:[
      {item:'Fönster 3-glas 120×150 cm', qty:'6 st',  cost:'28 800 kr'},
      {item:'Fönster 3-glas 90×120 cm',  qty:'6 st',  cost:'19 200 kr'},
    ],
    notes:[
      {date:'14 apr', who:'Marcus B.', note:'6 av 12 fönster monterade. Rest klart v.17.'},
      {date:'8 apr',  who:'Marcus B.', note:'Rivning gamla fönster klar. Mått kontrollerade.'},
    ]
  },
  'AO-005': {
    num:'AO-005', title:'Parkettläggning',
    desc:'Parkettläggning plan 1 och 2, ca 340 m². Ek, 14mm.',
    assigned:'Ej tilldelad', status:'Ej startad', period:'10–30 maj 2026',
    progress:0, category:'Golvarbete', priority:'Normal',
    materials:[], notes:[]
  }
};

// ── Avvikelse data ─────────────────────────────────────
const AVV_DATA = {
  'AVV-001': {
    num:'AVV-001', title:'Fuktskada i vägg plan 2 — rum 205',
    status:'Öppen', severity:3, severityLabel:'Hög', category:'Kvalitet',
    responsible:'Sven Persson', reported:'10 apr 2026',
    desc:'Fuktfläck ca 40×60 cm på innervägg, rum 205. Trolig källa: rörgenomföring ovan. Fuktvärde 87% vid mätning.',
    actions:[
      {date:'12 apr', who:'Anna L.', note:'Rörinspektör beställd. Besök 16 apr.'},
      {date:'10 apr', who:'Sven P.', note:'Avvikelse registrerad. Foto tagna.'},
    ]
  },
  'AVV-002': {
    num:'AVV-002', title:'Felaktiga rördragningar i badrum 102',
    status:'Åtgärd pågår', severity:2, severityLabel:'Medel', category:'Kvalitet',
    responsible:'Mia Johansson', reported:'5 apr 2026',
    desc:'Avloppsrör i badrum 102 dragna med för liten lutning (0.5° istf. 1.5°). Risk för stopp.',
    actions:[
      {date:'8 apr', who:'Mia J.',    note:'Omläggning påbörjad. Klart 18 apr.'},
      {date:'5 apr', who:'Marcus B.', note:'Defekt identifierad vid kontrollmätning.'},
    ]
  },
  'AVV-003': {
    num:'AVV-003', title:'Saknat material (el) — leveransfel Ahlsell',
    status:'Åtgärdad', severity:1, severityLabel:'Låg', category:'Process',
    responsible:'Mia Johansson', reported:'2 apr 2026',
    desc:'12 vägguttag saknades i leverans 2 apr. Leverantör levererade resterande 3 apr.',
    actions:[
      {date:'13 apr', who:'Mia J.', note:'Avvikelse stängd. Material levererat och kontrollerat.'},
      {date:'3 apr',  who:'Mia J.', note:'Kompletterande leverans mottagen.'},
    ]
  }
};

// ── Diary data ─────────────────────────────────────────
const DIARY_DATA = [
  {day:'14', mon:'APR', title:'Måndag — Vecka 16', weather:'☀ Sol, 8°C', staff:'Sven Persson, Mia Johansson',
   text:'El-arbete plan 2 fortgår enligt plan, uppskattat till 80% klart. Fönsterbyte plan 3 pågår — 6 av 12 fönster monterade. Materialleverans från Ahlsell kl. 09:15 mottagen och kontrollerad. Inga avvikelser noterade idag.',
   tags:['AO-001 El','AO-004 Fönster','Materialleverans']},
  {day:'13', mon:'APR', title:'Söndag — (Övertid)', weather:'⛅ Halvmulet, 6°C', staff:'Sven Persson, Marcus Bergström',
   text:'Övertidsarbete för att hålla tidplanen för el-installationen. Ledningsdragning plan 2 färdigställd på rum 201–212. Marcus genomförde kontroll och dokumenterade med foton.',
   tags:['AO-001 El','Övertid']},
  {day:'10', mon:'APR', title:'Torsdag', weather:'🌧 Regn, 5°C', staff:'Sven Persson, Mia Johansson',
   text:'Inomhusarbete pga kraftigt regn. El-installation fortgick inomhus. Mia avslutade VVS-arbete AO-002. Fuktkontroll utförd i källarplan — inga nya skador noterade utöver känd avvikelse AVV-001.',
   tags:['AO-002 Klar','Fuktkontroll']},
  {day:'8',  mon:'APR', title:'Tisdag', weather:'☀ Sol, 9°C', staff:'Sven Persson, Mia Johansson, Marcus Bergström',
   text:'Fönsterbyte plan 3 påbörjades. Rivning av gamla fönster gick utan problem. Marcus dokumenterade befintliga mått och bekräftade beställda fönstermåtten stämmer. 3 fönster monterade på förmiddagen.',
   tags:['AO-004 Start','Fönsterbyte']},
];

// ── Checklist data ─────────────────────────────────────
const CHECKLIST_DATA = {
  'el-slutkontroll': {
    name:'El-installation slutkontroll', category:'El',
    updated:'12 jan 2026', linkedAO:'AO-001',
    items:[
      {text:'Ledningsdragning följer ritning El-2024-R3', done:true},
      {text:'Isolationsresistens mätt — alla kretsar ≥ 1 MΩ', done:true},
      {text:'Jordfelsbrytare testad och utlösning verifierad', done:true},
      {text:'Samtliga uttag märkta och registrerade', done:true},
      {text:'Kopplingsdosor stängda och säkrade med skruv', done:true},
      {text:'Kablar fästa med kabelkanaler var 20:e cm', done:true},
      {text:'Genomföringar brandtätade', done:false},
      {text:'Elcentral märkt och schema uppdaterat', done:false},
      {text:'Fotodokumentation av alla skarvar och dosor', done:false},
      {text:'Kontrollmätning av certifierad elinstallatör', done:false},
      {text:'OVK-protokoll ifyllt och signerat', done:false},
      {text:'Besiktningsprotokoll arkiverat i projektmappen', done:false},
    ]
  },
  'vvs-trycksattning': {
    name:'VVS trycksättningsttest', category:'VVS',
    updated:'3 mar 2026', linkedAO:'AO-002',
    items:[
      {text:'Systemet rengjort och spolat', done:true},
      {text:'Trycksättning till 1.5× drifttryck utförd', done:true},
      {text:'Trycket hållit stabilt i 30 minuter', done:true},
      {text:'Alla skarvar kontrollerade med läckdetektor', done:true},
      {text:'Avlufning utförd på samtliga höjdpunkter', done:false},
      {text:'Tryckfall noterat och dokumenterat', done:false},
      {text:'Slutresultat godkänt av certifierad VVS-installatör', done:false},
    ]
  },
  'fuktkontroll': {
    name:'Fuktkontroll golvbjälklag', category:'Fuktsäkerhet',
    updated:'22 feb 2026', linkedAO:null,
    items:[
      {text:'Mätpunkter markerade på ritning (min. 3 per rum)', done:true},
      {text:'Mätning med RF-sond plan 1 — källarplanet', done:true},
      {text:'Mätning plan 2', done:false},
      {text:'Mätning plan 3', done:false},
      {text:'RF ≤ 75% godkänt · > 85% → avvikelse krävs', done:false},
      {text:'Fotodokumentation av varje mätpunkt', done:false},
      {text:'Rapport signerad av fuktexpert', done:false},
      {text:'Rapport arkiverad i SharePoint "Fuktkontroller"', done:false},
    ]
  },
  'slutbesiktning': {
    name:'Slutbesiktning totalentreprenad', category:'Besiktning',
    updated:'5 apr 2026', linkedAO:null,
    items:[
      {text:'Besiktningsprotokoll förberett och utskrivet', done:false},
      {text:'Alla ÄTA-ärenden dokumenterade och godkända', done:false},
      {text:'Avvikelsregister stängt — inga öppna avvikelser', done:false},
      {text:'Samtliga arbetsorder med status "Klar"', done:false},
      {text:'El-installation godkänd av certifierad installatör', done:false},
      {text:'VVS-installation godkänd', done:false},
      {text:'Brandskyddsdokumentation komplett', done:false},
      {text:'OVK-protokoll godkänt', done:false},
      {text:'Fuktkontrollrapport arkiverad', done:false},
      {text:'Ritningar uppdaterade (as-built)', done:false},
      {text:'Alla nycklar överlämnade till kund', done:false},
      {text:'Driftsättningsmöte hållet med kund', done:false},
      {text:'Garantibevis och driftsättningsdokument överlämnade', done:false},
      {text:'Slutfaktura skickad och bekräftad i Fortnox', done:false},
      {text:'Besiktningsprotokoll signerat av beställare', done:false},
    ]
  }
};

// ── Supplier data ──────────────────────────────────────
const SUPPLIER_DATA = {
  ahlsell: {
    name:'Ahlsell Sverige AB', orgnr:'556025-6809', category:'Elinstallationsmaterial',
    contact:'Fredrik Lindgren', email:'orderel@ahlsell.se', phone:'010-735 00 00',
    status:'Godkänd', statusClass:'badge-active', since:'2019', rating:'A',
    activeProjects:['FlowSight-2024-001 · Renovering Centrumhuset','FlowSight-2024-003 · Industribyggnad Hallsberg'],
    invoices:[
      {num:'AHL-2026-44821', date:'10 apr 2026', amount:'48 320 kr', status:'Väntar godkännande', cls:'badge-pending'},
      {num:'AHL-2026-38110', date:'18 mar 2026', amount:'31 870 kr', status:'Betald', cls:'badge-done'},
      {num:'AHL-2026-29004', date:'2 feb 2026',  amount:'62 440 kr', status:'Betald', cls:'badge-done'},
    ]
  },
  wurth: {
    name:'Würth Sverige AB', orgnr:'556041-2321', category:'Byggmaterial / fästelement',
    contact:'Maria Svensson', email:'order@wurth.se', phone:'010-154 00 00',
    status:'Godkänd', statusClass:'badge-active', since:'2021', rating:'A',
    activeProjects:['FlowSight-2024-001 · Renovering Centrumhuset','FlowSight-2024-003 · Industribyggnad Hallsberg','FlowSight-2024-002 · Kontorslokal Hamngatan'],
    invoices:[
      {num:'WU-789234', date:'8 apr 2026',  amount:'12 450 kr', status:'Godkänd', cls:'badge-active'},
      {num:'WU-776100', date:'15 mar 2026', amount:'9 870 kr',  status:'Betald',  cls:'badge-done'},
    ]
  },
  lindens: {
    name:'Lindéns VVS AB', orgnr:'559123-4567', category:'Underentreprenör — VVS',
    contact:'Thomas Lindén', email:'info@lindens-vvs.se', phone:'019-22 44 66',
    status:'Godkänd', statusClass:'badge-active', since:'2022', rating:'B+',
    activeProjects:['FlowSight-2024-001 · Renovering Centrumhuset'],
    invoices:[
      {num:'LV-2026-112', date:'5 apr 2026', amount:'89 750 kr', status:'Godkänd', cls:'badge-active'},
      {num:'LV-2026-098', date:'1 mar 2026', amount:'74 200 kr', status:'Betald',  cls:'badge-done'},
    ]
  },
  fonsterbolaget: {
    name:'Fönsterbolaget Öst AB', orgnr:'559234-5678', category:'Fönster och dörrar',
    contact:'Erik Nilsson', email:'offert@fonsterbolaget.se', phone:'016-55 88 00',
    status:'Granskning', statusClass:'badge-pending', since:'2026', rating:'—',
    activeProjects:['FlowSight-2024-001 · Renovering Centrumhuset'],
    invoices:[]
  }
};

// ── Budget category data ───────────────────────────────
const BUDGET_CATEGORY_DATA = {
  material: {
    name:'Materialkostnader', budget:850000, actual:723000, pct:85,
    lines:[
      {desc:'Elledning, uttag, kopplingsdosor (AHL-2026-44821)', supplier:'Ahlsell Sverige AB',   amount:'54 320 kr', date:'10 apr'},
      {desc:'Fönster 3-glas 12 st (FÖ-2026-0234)',              supplier:'Fönsterbolaget Öst AB', amount:'48 000 kr', date:'1 apr'},
      {desc:'Sparkel, puts och färg (WU-789234)',                supplier:'Würth Sverige AB',      amount:'12 450 kr', date:'8 apr'},
      {desc:'Parkett Ek 14mm 340 m² (HÅ-2026-012)',             supplier:'Håkans Golv AB',        amount:'108 000 kr',date:'28 mar'},
      {desc:'VVS-rör och kopplingar (LV-2026-098)',              supplier:'Lindéns VVS AB',        amount:'74 200 kr', date:'1 mar'},
      {desc:'Övrigt material (div. kvitton)',                    supplier:'Diverse',               amount:'426 030 kr',date:'div.'},
    ]
  },
  ue: {
    name:'Underentreprenörer', budget:780000, actual:512000, pct:66,
    lines:[
      {desc:'El-installation v.14-16 (EL-INV-2026-04)',  supplier:'Svensson El AB',        amount:'188 000 kr',date:'7 apr'},
      {desc:'VVS-arbete plan 1-2 (LV-2026-112)',         supplier:'Lindéns VVS AB',        amount:'89 750 kr', date:'5 apr'},
      {desc:'Rivning och demontering (RD-2026-18)',       supplier:'Demolition Örebro AB',  amount:'124 000 kr',date:'15 mar'},
      {desc:'Isoleringsarbete (ISO-2026-03)',             supplier:'Energibygg AB',         amount:'110 250 kr',date:'8 mar'},
    ]
  },
  time: {
    name:'Egna timkostnader', budget:620000, actual:445000, pct:72,
    lines:[
      {desc:'Sven Persson — el-installation v.15-16',     supplier:'Intern', amount:'56 000 kr', date:'14 apr'},
      {desc:'Mia Johansson — VVS-koordinering v.10-15',   supplier:'Intern', amount:'68 000 kr', date:'11 apr'},
      {desc:'Marcus Bergström — projektingenjör v.10-16', supplier:'Intern', amount:'76 000 kr', date:'14 apr'},
      {desc:'Anna Lindqvist — projektledning v.1-16',     supplier:'Intern', amount:'245 000 kr',date:'löpande'},
    ]
  },
  el: {
    name:'El-installation', budget:320000, actual:267000, pct:83,
    lines:[
      {desc:'Materialkostnad el (AHL-2026-44821)',         supplier:'Ahlsell Sverige AB', amount:'54 320 kr', date:'10 apr'},
      {desc:'El-underentreprenör (EL-INV-2026-04)',        supplier:'Svensson El AB',     amount:'188 000 kr',date:'7 apr'},
      {desc:'Certifieringskostnad elinstallatör',          supplier:'Selektia AB',        amount:'24 680 kr', date:'1 apr'},
    ]
  },
  vvs: {
    name:'VVS-arbeten', budget:280000, actual:280000, pct:100,
    lines:[
      {desc:'VVS-material plan 1-2 (LV-2026-098)',         supplier:'Lindéns VVS AB',     amount:'74 200 kr', date:'1 mar'},
      {desc:'VVS-installation (LV-2026-112)',               supplier:'Lindéns VVS AB',     amount:'89 750 kr', date:'5 apr'},
      {desc:'VVS-besiktning och dokumentation',             supplier:'ByggTek Örebro',     amount:'116 050 kr',date:'30 mar'},
    ]
  },
  transport: {
    name:'Maskin och transport', budget:100000, actual:70000, pct:70,
    lines:[
      {desc:'Kranlift och hyrhiss v.13-14',                supplier:'MaskinAB Örebro',   amount:'38 000 kr', date:'28 mar'},
      {desc:'Containerhyra och borttransport',              supplier:'Renova Öst AB',     amount:'22 000 kr', date:'15 mar'},
      {desc:'Materialtransporter (diverse)',                supplier:'Diverse åkerier',   amount:'10 000 kr', date:'div.'},
    ]
  }
};

// ── Project data ───────────────────────────────────────
const PROJECT_DATA = {
  'FlowSight-2024-001': {
    id:'FlowSight-2024-001', name:'Renovering Centrumhuset',
    client:'Fastighets AB Centrum · Örebro', pm:'Anna Lindqvist',
    status:'Aktiv', phase:'Genomförande', contract:'3 200 000 kr',
    budget:2950000, spent:1947000, endDate:'2026-08-31', daysLeft:139,
    deviations:3, devSub:'1 hög · 1 medel · 1 låg',
    tasksDone:12, tasksTotal:24, tasksSub:'8 pågår · 4 ej startade',
    aoCount:5, ataCount:2, avvCount:3,
    fullDemo:true
  },
  'FlowSight-2024-003': {
    id:'FlowSight-2024-003', name:'Industribyggnad Hallsberg',
    client:'Hallsberg Industri AB · Hallsberg', pm:'Anna Lindqvist',
    status:'Aktiv', phase:'Grundläggning', contract:'7 500 000 kr',
    budget:7200000, spent:1584000, endDate:'2027-03-15', daysLeft:335,
    deviations:1, devSub:'1 medel',
    tasksDone:4, tasksTotal:18, tasksSub:'14 arbetsorder kvar',
    aoCount:2, ataCount:0, avvCount:1,
    fullDemo:false
  },
  'FlowSight-2024-002': {
    id:'FlowSight-2024-002', name:'Kontorslokal Hamngatan 12',
    client:'Svensson Fastigheter AB · Stockholm', pm:'Marcus Bergström',
    status:'Planering', phase:'Upphandling', contract:'1 800 000 kr',
    budget:1700000, spent:0, endDate:'2026-12-31', daysLeft:261,
    deviations:0, devSub:'Inga avvikelser',
    tasksDone:0, tasksTotal:0, tasksSub:'Uppstart planerad jun 2026',
    aoCount:0, ataCount:0, avvCount:0,
    fullDemo:false
  },
  'FlowSight-2023-004': {
    id:'FlowSight-2023-004', name:'Bostadsrenovering Södra Strand',
    client:'BRF Södra Strand · Västerås', pm:'Lars Eriksson',
    status:'Avslutad', phase:'Stängd', contract:'2 100 000 kr',
    budget:2100000, spent:2058000, endDate:'2025-12-18', daysLeft:0,
    deviations:0, devSub:'Alla stängda',
    tasksDone:24, tasksTotal:24, tasksSub:'Slutfört',
    aoCount:0, ataCount:0, avvCount:0,
    fullDemo:false
  }
};

// ── Timesheet week data ────────────────────────────────
const WEEK_DATA = [
  {
    label:'Vecka 13 · 24–28 mar 2026', status:'Godkänd', locked:true,
    days:['Mån 24/3','Tis 25/3','Ons 26/3','Tor 27/3','Fre 28/3'],
    rows:[
      {initials:'SP',name:'Sven Persson',    bg:'#e6faf6',hours:[8,8,8,8,8],ao:['AO-001','AO-001','AO-001','AO-001','AO-001'],status:'Godkänd'},
      {initials:'MJ',name:'Mia Johansson',   bg:'#fff8e6',hours:[8,8,6,8,8],ao:['AO-002','AO-002','admin','AO-002','AO-002'],status:'Godkänd'},
      {initials:'MB',name:'Marcus Bergström',bg:'#e6f4f3',hours:[0,6,8,8,4],ao:['','AO-004','AO-004','AO-004','admin'],status:'Godkänd'},
    ],
    totals:[16,22,22,24,20],
    activities:[
      {label:'AO-001: El-installation',hours:'56h'},
      {label:'AO-002: VVS rör byte',hours:'30h'},
      {label:'AO-004: Fönsterbyte (start)',hours:'10h'},
    ]
  },
  {
    label:'Vecka 14 · 31 mar–4 apr 2026', status:'Godkänd', locked:true,
    days:['Mån 31/3','Tis 1/4','Ons 2/4','Tor 3/4','Fre 4/4'],
    rows:[
      {initials:'SP',name:'Sven Persson',    bg:'#e6faf6',hours:[8,8,8,8,8],ao:['AO-001','AO-001','AO-001','AO-001','AO-001'],status:'Godkänd'},
      {initials:'MJ',name:'Mia Johansson',   bg:'#fff8e6',hours:[8,8,8,8,6],ao:['AO-002','AO-002','AO-002','AO-002','admin'],status:'Godkänd'},
      {initials:'MB',name:'Marcus Bergström',bg:'#e6f4f3',hours:[6,8,8,0,4],ao:['admin','AO-004','AO-004','','AO-004'],status:'Godkänd'},
    ],
    totals:[22,24,24,16,18],
    activities:[
      {label:'AO-001: El-installation',hours:'40h'},
      {label:'AO-002: VVS rör byte',hours:'38h'},
      {label:'AO-004: Fönsterbyte',hours:'18h'},
    ]
  },
  {
    label:'Vecka 15 · 7–11 apr 2026', status:'Ej godkänd', locked:false,
    days:['Mån 7/4','Tis 8/4','Ons 9/4','Tor 10/4','Fre 11/4'],
    rows:[
      {initials:'SP',name:'Sven Persson',    bg:'#e6faf6',hours:[8,8,8,0,8],ao:['AO-001','AO-001','AO-001','','AO-001'],status:'Godkänd'},
      {initials:'MJ',name:'Mia Johansson',   bg:'#fff8e6',hours:[8,8,6,8,8],ao:['AO-002+admin','AO-002','admin','AO-002','AO-002'],status:'Godkänd'},
      {initials:'MB',name:'Marcus Bergström',bg:'#e6f4f3',hours:[4,4,8,8,4],ao:['AO-004','AO-004','AO-004','AO-004','AO-004'],status:'Väntar godkännande'},
    ],
    totals:[20,20,22,16,20],
    activities:[
      {label:'AO-001: El-installation',hours:'48h'},
      {label:'AO-004: Fönsterbyte',hours:'32h'},
      {label:'Projektmöten / admin',hours:'18h'},
    ]
  },
  {
    label:'Vecka 16 · 14–18 apr 2026', status:'Pågår', locked:false,
    days:['Mån 14/4','Tis 15/4','Ons 16/4','Tor 17/4','Fre 18/4'],
    rows:[
      {initials:'SP',name:'Sven Persson',    bg:'#e6faf6',hours:[8,0,0,0,0],ao:['AO-001','','','',''],status:'Pågår'},
      {initials:'MJ',name:'Mia Johansson',   bg:'#fff8e6',hours:[8,0,0,0,0],ao:['admin','','','',''],status:'Pågår'},
      {initials:'MB',name:'Marcus Bergström',bg:'#e6f4f3',hours:[4,0,0,0,0],ao:['AO-004','','','',''],status:'Pågår'},
    ],
    totals:[20,0,0,0,0],
    activities:[
      {label:'AO-001: El-installation',hours:'8h'},
      {label:'AO-004: Fönsterbyte',hours:'4h'},
      {label:'Projektmöten / admin',hours:'8h'},
    ]
  }
];
let currentWeek = 2;

// ── Kundfaktura data ───────────────────────────────────
const KF_DATA = {
  'F-2026-003': {
    num:'F-2026-003', client:'Fastighets AB Centrum', date:'1 apr 2026', dueDate:'1 maj 2026',
    amount:'320 000 kr', status:'Obetald', statusClass:'badge-active',
    ref:'Delbetalning 3 — Genomförande', period:'mars 2026',
    lines:[
      {desc:'El-installation plan 2 (AO-001 delbetalning)', qty:'1', unit:'pauschal', amount:'120 000 kr'},
      {desc:'VVS slutbetalning (AO-002 klar)',               qty:'1', unit:'pauschal', amount:'85 000 kr'},
      {desc:'Fönsterbyte plan 3 (AO-004 delbetalning)',      qty:'1', unit:'pauschal', amount:'80 000 kr'},
      {desc:'Projektledning mars 2026',                      qty:'1', unit:'pauschal', amount:'35 000 kr'},
    ]
  },
  'F-2026-002': {
    num:'F-2026-002', client:'Fastighets AB Centrum', date:'1 mar 2026', dueDate:'1 apr 2026',
    amount:'280 000 kr', status:'Betald', statusClass:'badge-done',
    ref:'Delbetalning 2 — Rivning och grundarbeten', period:'februari 2026',
    lines:[
      {desc:'Rivning och demontering (RD-2026-18)',   qty:'1', unit:'pauschal', amount:'124 000 kr'},
      {desc:'VVS-material och installation (del)',    qty:'1', unit:'pauschal', amount:'96 000 kr'},
      {desc:'Projektledning februari 2026',           qty:'1', unit:'pauschal', amount:'35 000 kr'},
      {desc:'Övrigt',                                 qty:'1', unit:'pauschal', amount:'25 000 kr'},
    ]
  },
  'F-2026-001': {
    num:'F-2026-001', client:'Fastighets AB Centrum', date:'1 feb 2026', dueDate:'1 mar 2026',
    amount:'250 000 kr', status:'Betald', statusClass:'badge-done',
    ref:'Delbetalning 1 — Uppstart', period:'januari 2026',
    lines:[
      {desc:'Mobilisering och etablering',      qty:'1', unit:'pauschal', amount:'80 000 kr'},
      {desc:'Projektering och planering',        qty:'1', unit:'pauschal', amount:'60 000 kr'},
      {desc:'Upphandling underentreprenörer',    qty:'1', unit:'pauschal', amount:'75 000 kr'},
      {desc:'Projektledning januari 2026',       qty:'1', unit:'pauschal', amount:'35 000 kr'},
    ]
  }
};

// ── Leverantörsfaktura data ───────────────────────────
const LF_DATA = {
  'AHL-2026-44821': {
    id:'AHL-2026-44821', supplier:'Ahlsell Sverige AB', supplierKey:'ahlsell',
    date:'10 apr 2026', dueDate:'10 maj 2026',
    amount:'48 320 kr', amountSEK:48320,
    status:'Väntar godkännande', statusClass:'badge-pending',
    ocrConfidence:94, ocrWarning:null, aoRef:'AO-001',
    lines:[
      {desc:'Elledning 2.5mm² gul/grön',  qty:'180', unit:'m',        amount:'3 420 kr'},
      {desc:'Vägguttag 10A IP20 vit',      qty:'36',  unit:'st',       amount:'2 160 kr'},
      {desc:'Kopplingsdosor Ø60mm',        qty:'24',  unit:'st',       amount:'720 kr'},
      {desc:'Elinstallationsmaterial övrigt', qty:'1', unit:'pauschal', amount:'42 020 kr'},
    ]
  },
  'WU-789234': {
    id:'WU-789234', supplier:'Würth Sverige AB', supplierKey:'wurth',
    date:'8 apr 2026', dueDate:'8 maj 2026',
    amount:'12 450 kr', amountSEK:12450,
    status:'Godkänd', statusClass:'badge-active',
    ocrConfidence:98, ocrWarning:null, aoRef:'AO-004',
    lines:[
      {desc:'Skruvdragare Pro paket',    qty:'2', unit:'st',      amount:'1 980 kr'},
      {desc:'Byggskruvar sortiment',     qty:'5', unit:'paket',   amount:'875 kr'},
      {desc:'Fönsterinfästningar PAS90', qty:'24',unit:'st',      amount:'9 595 kr'},
    ]
  },
  'LV-2026-112': {
    id:'LV-2026-112', supplier:'Lindéns VVS AB', supplierKey:'lindens',
    date:'5 apr 2026', dueDate:'5 maj 2026',
    amount:'89 750 kr', amountSEK:89750,
    status:'Godkänd', statusClass:'badge-active',
    ocrConfidence:91, ocrWarning:null, aoRef:'AO-002',
    lines:[
      {desc:'UE-arbete VVS plan 1–2',    qty:'1', unit:'pauschal', amount:'68 000 kr'},
      {desc:'Kopparrör material',         qty:'1', unit:'pauschal', amount:'18 350 kr'},
      {desc:'Rörfästen och beslag',       qty:'1', unit:'pauschal', amount:'3 400 kr'},
    ]
  },
  'FON-2026-087': {
    id:'FON-2026-087', supplier:'Fönsterbolaget Öst AB', supplierKey:'fonsterbolaget',
    date:'12 apr 2026', dueDate:'12 maj 2026',
    amount:'48 000 kr', amountSEK:48000,
    status:'Väntar godkännande', statusClass:'badge-pending',
    ocrConfidence:72,
    ocrWarning:'Leverantörens momsregistreringsnummer kunde ej verifieras av OCR. Kontrollera fakturanummer och belopp manuellt.',
    aoRef:'AO-004',
    lines:[
      {desc:'Fönster 3-glas 120×150 cm (tolkat av OCR)', qty:'6', unit:'st', amount:'28 800 kr'},
      {desc:'Fönster 3-glas 90×120 cm (tolkat av OCR)',  qty:'6', unit:'st', amount:'19 200 kr'},
    ]
  }
};

// ── Search items ───────────────────────────────────────
const SEARCH_ITEMS = [
  {icon:'🏗', title:'Renovering Centrumhuset',        sub:'FlowSight-2024-001 · Aktiv · Örebro',         action:()=>openProject('FlowSight-2024-001')},
  {icon:'🏗', title:'Industribyggnad Hallsberg',       sub:'FlowSight-2024-003 · Aktiv · Hallsberg',      action:()=>openProject('FlowSight-2024-003')},
  {icon:'🏗', title:'Kontorslokal Hamngatan 12',       sub:'FlowSight-2024-002 · Planering · Stockholm',  action:()=>openProject('FlowSight-2024-002')},
  {icon:'🏗', title:'Bostadsrenovering Södra Strand',  sub:'FlowSight-2023-004 · Avslutad · Västerås',    action:()=>openProject('FlowSight-2023-004')},
  {icon:'🔧', title:'AO-001 — El-installation plan 2', sub:'Arbetsorder · Pågår · Sven Persson',    action:()=>openAO('AO-001')},
  {icon:'🔧', title:'AO-004 — Fönsterbyte plan 3',    sub:'Arbetsorder · Pågår · Marcus B.',         action:()=>openAO('AO-004')},
  {icon:'🔧', title:'AO-002 — VVS rör byte',           sub:'Arbetsorder · Klar · Mia Johansson',    action:()=>openAO('AO-002')},
  {icon:'🔧', title:'AO-003 — Puts och målning',       sub:'Arbetsorder · Ej startad',              action:()=>openAO('AO-003')},
  {icon:'⚠',  title:'AVV-001 — Fuktskada plan 2',     sub:'Avvikelse · Öppen · Hög allvarlighet',   action:()=>openDeviation('AVV-001')},
  {icon:'⚠',  title:'AVV-002 — Felaktiga rördragningar',sub:'Avvikelse · Åtgärd pågår · Medel',    action:()=>openDeviation('AVV-002')},
  {icon:'🔄', title:'ÄTA-001 — Tilläggsarbete elinstallation',sub:'ÄTA · Godkänd · 32 500 kr',     action:()=>{closeSearch();navigate('ata');}},
  {icon:'🔄', title:'ÄTA-002 — Ändrat fönsterglastyp', sub:'ÄTA · Väntande godkännande · 18 750 kr',action:()=>{closeSearch();navigate('ata');}},
  {icon:'👤', title:'Anna Lindqvist',   sub:'Projektledare · anna.lindqvist@langate.se',     action:()=>openResCard('Anna Lindqvist','Projektledare','2 aktiva','anna.lindqvist@langate.se')},
  {icon:'👤', title:'Sven Persson',     sub:'Fältarbetare · sven.persson@langate.se',         action:()=>openResCard('Sven Persson','Fältarbetare','1 aktivt projekt','sven.persson@langate.se')},
  {icon:'👤', title:'Mia Johansson',    sub:'Fältarbetare · mia.johansson@langate.se',        action:()=>openResCard('Mia Johansson','Fältarbetare','1 aktivt projekt','mia.johansson@langate.se')},
  {icon:'👤', title:'Marcus Bergström', sub:'Projektingenjör · marcus.bergstrom@langate.se',  action:()=>openResCard('Marcus Bergström','Projektingenjör','2 aktiva projekt','marcus.bergstrom@langate.se')},
  {icon:'🏭', title:'Ahlsell Sverige AB',  sub:'Leverantör · Elinstallationsmaterial', action:()=>openSupplier('ahlsell')},
  {icon:'🏭', title:'Lindéns VVS AB',      sub:'Leverantör · Underentreprenör VVS',   action:()=>openSupplier('lindens')},
  {icon:'🏭', title:'Würth Sverige AB',    sub:'Leverantör · Byggmaterial',            action:()=>openSupplier('wurth')},
  {icon:'📈', title:'Dashboard — Centrumhuset',sub:'Projektöversikt',                  action:()=>{closeSearch();navigate('dashboard');}},
  {icon:'⏱',  title:'Tidsrapportering',    sub:'Vecka 16 pågår',                       action:()=>{closeSearch();navigate('tidrapport');}},
  {icon:'📔', title:'Dagbok',              sub:'4 poster · Senast 14 apr 2026',        action:()=>{closeSearch();navigate('dagbok');}},
  {icon:'💰', title:'Budgetöversikt',      sub:'66% förbrukat · 2 950 000 kr',        action:()=>{closeSearch();navigate('budget');}},
  {icon:'📅', title:'Gantt / Tidslinje',   sub:'Apr–Jun 2026',                        action:()=>{closeSearch();navigate('gantt');}},
  {icon:'👥', title:'Resurser / Personal', sub:'5 aktiva medarbetare',                action:()=>{closeSearch();navigate('resurser');}},
  {icon:'📋', title:'El-installation slutkontroll',    sub:'Checklistmall · 12 punkter', action:()=>openChecklist('el-slutkontroll')},
  {icon:'📋', title:'Slutbesiktning totalentreprenad', sub:'Checklistmall · 15 punkter', action:()=>openChecklist('slutbesiktning')},
];

// ── Resource data (rich view) ──────────────────────────
const RESOURCE_DATA = [
  { initials:'AL', name:'Anna Lindqvist', role:'Projektledare', email:'anna.lindqvist@langate.se',
    bg:'#ebf2f5', capacity:40, booked:34, projects:2,
    assignments:[
      {label:'Centrumhuset · PL', hours:24},
      {label:'Kontorslokal Hamngatan 12 · PL', hours:10}
    ],
    skills:['Projektledning','BAS-U','BAS-P','Besiktning','Upphandling'],
    status:'Aktiv'
  },
  { initials:'MB', name:'Marcus Bergström', role:'Projektingenjör', email:'marcus.bergstrom@langate.se',
    bg:'#e6f4f3', capacity:40, booked:28, projects:2,
    assignments:[
      {label:'Centrumhuset · Fönsterbyte AO-004', hours:18},
      {label:'Industribyggnad Hallsberg · Planering', hours:10}
    ],
    skills:['AutoCAD','Revit','Konstruktion','Fönstermontering','Kvalitetskontroll'],
    status:'Aktiv'
  },
  { initials:'SP', name:'Sven Persson', role:'Fältarbetare · El', email:'sven.persson@langate.se',
    bg:'#e6faf6', capacity:40, booked:32, projects:1,
    assignments:[
      {label:'Centrumhuset · El-installation AO-001', hours:32}
    ],
    skills:['Behörig elektriker','Kopplingsarbete','Felsökning','Dokumentation'],
    status:'Aktiv'
  },
  { initials:'MJ', name:'Mia Johansson', role:'Fältarbetare · VVS', email:'mia.johansson@langate.se',
    bg:'#fff8e6', capacity:40, booked:38, projects:1,
    assignments:[
      {label:'Centrumhuset · VVS rörbyte AO-002', hours:38}
    ],
    skills:['VVS-montör','Lödning','Täthetsprov','Avloppsmontering'],
    status:'Aktiv'
  },
  { initials:'LH', name:'Lena Holm', role:'Ekonomiansvarig', email:'lena.holm@langate.se',
    bg:'#fbeeed', capacity:40, booked:20, projects:3,
    assignments:[
      {label:'Centrumhuset · Ekonomi', hours:10},
      {label:'Kontorslokal Hamngatan 12 · Ekonomi', hours:6},
      {label:'Industribyggnad Hallsberg · Ekonomi', hours:4}
    ],
    skills:['Fortnox','Projektredovisning','Fakturering','MOMS','Rapportering'],
    status:'Aktiv'
  }
];

// ── Notification data ──────────────────────────────────
const NOTIFICATION_DATA = [
  {type:'warn', icon:'📥', title:'Faktura väntar godkännande',
   sub:'AHL-2026-44821 · 48 320 kr · Ahlsell Sverige AB',
   time:'Idag 09:14', unread:true,
   action:()=>{closeNotifications();navigate('levfakturor');}},
  {type:'info', icon:'🔄', title:'ÄTA-002 väntar ditt godkännande',
   sub:'Ändrat fönsterglastyp — 4-glas · 18 750 kr',
   time:'Idag 08:30', unread:true,
   action:()=>{closeNotifications();navigate('ata');}},
  {type:'err',  icon:'⚠',  title:'Ny avvikelse — Hög allvarlighet',
   sub:'AVV-001 · Fuktskada i vägg plan 2, rum 205',
   time:'14 apr 07:45', unread:true,
   action:()=>{closeNotifications();openDeviation('AVV-001');}},
  {type:'ok',   icon:'✓',  title:'Tidrapport v.15 inskickad',
   sub:'Marcus Bergström · Väntar ditt godkännande',
   time:'11 apr 16:45', unread:false,
   action:()=>{closeNotifications();navigate('tidrapport');}},
];
