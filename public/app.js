
/* ---------------- reference data ---------------- */
const CATS = {
  cnc:{label:'CNC machining', bg:'#E6F1FB', fg:'#0C447C', icon:'ti-tools'},
  sheet:{label:'Sheet metal', bg:'#E1F5EE', fg:'#085041', icon:'ti-layers-subtract'},
  gas:{label:'Gas & rough lines', bg:'#FAEEDA', fg:'#633806', icon:'ti-pipe'},
  quartz:{label:'Quartz & ceramics', bg:'#EEEDFE', fg:'#3C3489', icon:'ti-diamond'},
  rework:{label:'Reworks', bg:'#FAECE7', fg:'#712B13', icon:'ti-refresh'},
  plastic:{label:'Plastics', bg:'#E9F3E1', fg:'#3B5B12', icon:'ti-box'}
};
function tag(c){const x=CATS[c]; return x?`<span class="tag" style="background:${x.bg};color:${x.fg}">${x.label}</span>`:'';}
const COMPANIES = ['Northvale Semiconductor','ASML West','Orion Micro'];
function cotag(name){return `<span class="cotag"><i class="ti ti-building-factory" style="font-size:12px"></i>${name}</span>`;}

const OPPS = [
  {id:'VF-6061-204', title:'Vacuum flange, 6061-T6', cat:'cnc', qty:12, closes:'2d 4h', bids:7, soon:false, customer:'Northvale Semiconductor', reqs:'Tolerance ±0.05mm on bore ID. Hard anodized. Test batch ahead of production qualification.', nda:'category'},
  {id:'QV-110', title:'Quartz viewport window', cat:'quartz', qty:4, closes:'5h', bids:9, soon:true, customer:'ASML West', reqs:'Optical-grade fused silica. Scratch-dig 40-20. Edges chamfered.', nda:'drawing'},
  {id:'CMB-330', title:'Chamber mounting bracket', cat:'sheet', qty:20, closes:'1d 9h', bids:4, soon:false, customer:'Northvale Semiconductor', reqs:'304 SS, 3mm. Bead-blast finish. Weldment per drawing.', nda:'category'},
  {id:'GM-512', title:'Process gas manifold', cat:'gas', qty:6, closes:'3d', bids:2, soon:false, customer:'Orion Micro', reqs:'316L electropolished. Orbital welds. Helium leak test to 1e-9.', nda:'category'},
  {id:'EA-204R', title:'Electrode assembly rework', cat:'rework', qty:8, closes:'4d 6h', bids:1, soon:false, customer:'Orion Micro', reqs:'Re-machine seat and re-plate. Existing parts supplied by buyer.', nda:'none'},
  {id:'LP-088', title:'Lift pin housing', cat:'cnc', qty:30, closes:'2d', bids:5, soon:false, customer:'Northvale Semiconductor', reqs:'Aluminum 6061. Hard anodize. Bore concentricity 0.01mm.', nda:'category'},
  {id:'AI-076', title:'Alumina insulator ring', cat:'quartz', qty:15, closes:'1d 2h', bids:3, soon:true, customer:'ASML West', reqs:'99.5% alumina, fired. Ground flat both faces.', nda:'drawing'},
  {id:'CT-450', title:'Cable tray weldment', cat:'sheet', qty:10, closes:'5d', bids:2, soon:false, customer:'Northvale Semiconductor', reqs:'Aluminum 5052. TIG welded. Powder coat.', nda:'none'}
];
const MYBIDS = [
  {id:'VF-6061-204', title:'Vacuum flange, 6061-T6', cat:'cnc', price:1240, lead:9, status:['Leading','st-good'], stage:'active'},
  {id:'GM-512', title:'Process gas manifold', cat:'gas', price:880, lead:12, status:['In review','st-info'], stage:'review'},
  {id:'LP-088', title:'Lift pin housing', cat:'cnc', price:2100, lead:8, status:['Outbid','st-warn'], stage:'active'},
  {id:'SV-300', title:'Slit valve plate', cat:'cnc', price:1650, lead:7, status:['Won','st-win'], stage:'won'},
  {id:'HB-211', title:'Heater bracket', cat:'sheet', price:540, lead:6, status:['Won','st-win'], stage:'won'},
  {id:'QV-090', title:'Quartz boat', cat:'quartz', price:980, lead:14, status:['Lost','st-danger'], stage:'lost'}
];
const RFQS = [
  {id:'VF-6061-204', title:'Vacuum flange, 6061-T6', cat:'cnc', qty:12, status:['Open','st-good'], bids:7, closes:'2d 4h', open:true, product:'Litho stage', autoExtend:true},
  {id:'CMB-330', title:'Chamber mounting bracket', cat:'sheet', qty:20, status:['Open','st-good'], bids:4, closes:'1d 9h', open:true, product:'Etch chamber', autoExtend:true},
  {id:'SV-300', title:'Slit valve plate', cat:'cnc', qty:12, status:['Closed · review bids','st-warn'], bids:6, closes:'closed', open:false, product:'Litho stage', autoExtend:true},
  {id:'GM-512', title:'Process gas manifold', cat:'gas', qty:6, status:['Open','st-good'], bids:2, closes:'3d', open:true, product:'Deposition module', autoExtend:false},
  {id:'EA-204R', title:'Electrode assembly rework', cat:'rework', qty:8, status:['Awarded','st-win'], bids:3, closes:'awarded', open:false, awarded:true, product:'Etch chamber', autoExtend:true}
];
/* bids for the SV-300 comparison (qty 12). total = unit*qty + shipping */
const BID_QTY = 12;
const BIDS = [
  {supplier:'Nord Fab', unit:95, ship:40, incoterms:'FOB Origin', lead:14, score:4.1, best:'price'},
  {supplier:'Titan Machining', unit:105, ship:50, incoterms:'DAP', lead:7, score:4.8, best:'fast'},
  {supplier:'Acme Precision', unit:100, ship:40, incoterms:'FOB Origin', lead:9, score:4.6, revised:true},
  {supplier:'Westline Tool', unit:103, ship:59, incoterms:'EXW', lead:11, score:3.9}
].map(b=>({...b, price:b.unit*BID_QTY+b.ship}));
/* no-bid / declined — valuable signal for buyers */
const DECLINED = {
  'SV-300':[ {supplier:'Coastal CNC', reason:'Capacity — no open slot before your need-by date'},
             {supplier:'Apex Micro', reason:'Bore tolerance exceeds our process capability'} ]
};
/* public Q&A addenda, keyed by part — visible to all bidders */
let ADDENDA = {
  'VF-6061-204':[ {q:'Is the ±0.05mm tolerance on the bore ID or the flange face?', a:'Bore ID. Flange face is ±0.1mm — note 3 on the drawing updated.', at:'Jul 10 · Priya Rao', bidders:7} ]
};
const SUPS = [
  {name:'Acme Precision', cats:['cnc'], score:4.6, jobs:41, ontime:96, rnd:true},
  {name:'Nord Fab', cats:['sheet','cnc'], score:4.1, jobs:12, ontime:88, rnd:true},
  {name:'Titan Machining', cats:['cnc','rework'], score:4.8, jobs:58, ontime:97, rnd:true},
  {name:'Lumen Quartz', cats:['quartz'], score:4.5, jobs:27, ontime:94, rnd:true},
  {name:'Flowtek Lines', cats:['gas'], score:4.3, jobs:33, ontime:95, rnd:false}
];
/* orders in flight (won bids → production → delivery) */
const ORDERS = [
  {id:'SV-300', title:'Slit valve plate', cat:'cnc', supplier:'Acme Precision', buyer:'Sam Ortiz', engineer:'Priya Rao', product:'Litho stage', qty:12, price:1650, stage:'manufacturing', due:'Jul 20', tracking:null, delayed:false, delayReason:''},
  {id:'HB-211', title:'Heater bracket', cat:'sheet', supplier:'Acme Precision', buyer:'Sam Ortiz', engineer:'Marcus Vogel', product:'Etch chamber', qty:20, price:540, stage:'shipped', due:'Jul 14', tracking:'7712 3480 1123', delayed:false, delayReason:''},
  {id:'EA-204R', title:'Electrode assembly rework', cat:'rework', supplier:'Titan Machining', buyer:'Lena Park', engineer:'Marcus Vogel', product:'Etch chamber', qty:8, price:1310, stage:'manufacturing', due:'Jul 10', tracking:null, delayed:true, delayReason:'Raw material lead time slipped 4 days; new ship date Jul 16.'},
  {id:'GM-401', title:'Gas manifold (pilot)', cat:'gas', supplier:'Flowtek Lines', buyer:'Sam Ortiz', engineer:'Priya Rao', product:'Deposition module', qty:6, price:920, stage:'delivered', due:'Jul 2', tracking:'5561 9902 7781', delayed:false, delayReason:''}
];
const STAGES = ['accepted','manufacturing','shipped','delivered'];
const STAGE_LBL = {accepted:'Accepted', manufacturing:'In production', shipped:'Shipped', delivered:'Delivered'};
/* chat threads (perspective-aware) */
const THREADS = [
  {id:1, part:'VF-6061-204', partTitle:'Vacuum flange', supplier:'Acme Precision', engineer:'Priya Rao (Engineer)', buyer:'Sam Ortiz (Buyer)', company:'Northvale Semiconductor', unread:1,
   msgs:[{from:'sup', name:'Acme Precision', text:'Is the ±0.05mm tolerance on the bore ID or the flange face?', t:'9:12'},
         {from:'eng', name:'Priya Rao', text:'Bore ID. Flange face is ±0.1mm — I updated note 3 on the drawing.', t:'9:20'},
         {from:'sup', name:'Acme Precision', text:'Got it, thanks. Submitting our bid today.', t:'9:24'}]},
  {id:2, part:'QV-110', partTitle:'Quartz viewport', supplier:'Lumen Quartz', engineer:'Marcus Vogel (Engineer)', buyer:'Sam Ortiz (Buyer)', company:'ASML West', unread:0,
   msgs:[{from:'sup', name:'Lumen Quartz', text:'Can the chamfer be 0.3mm x 45° instead of 0.5mm? Better yield on our tooling.', t:'Tue'},
         {from:'eng', name:'Marcus Vogel', text:'0.3mm is fine functionally. Approved.', t:'Tue'}]},
  {id:3, part:'EA-204R', partTitle:'Electrode rework', supplier:'Titan Machining', engineer:'Marcus Vogel (Engineer)', buyer:'Lena Park (Buyer)', company:'Orion Micro', unread:0,
   msgs:[{from:'sup', name:'Titan Machining', text:'Heads-up: material lead time slipped 4 days. Flagging a delay in the tracker.', t:'Mon'},
         {from:'buy', name:'Lena Park', text:'Acknowledged — let\'s catch up on a call if the new date moves again.', t:'Mon'}]}
];
const SUPP_FEEDBACK = [
  {part:'SV-300', title:'Slit valve plate', rating:5, note:'Met spec, delivered 2 days early. Excellent finish.'},
  {part:'GM-401', title:'Gas manifold (pilot)', rating:4, note:'Good part; minor cosmetic scuff on one unit, accepted.'}
];
/* admin users */
const USERS = [
  {name:'Dana Ortiz', email:'dana.ortiz@northvale.com', role:'Admin', group:'Supply Chain', status:'Active'},
  {name:'Sam Ortiz', email:'sam.ortiz@northvale.com', role:'Buyer', group:'Litho', status:'Active'},
  {name:'Lena Park', email:'lena.park@northvale.com', role:'Buyer', group:'Etch', status:'Active'},
  {name:'Priya Rao', email:'priya.rao@northvale.com', role:'Engineer', group:'Litho', status:'Active'},
  {name:'Marcus Vogel', email:'marcus.vogel@northvale.com', role:'Engineer', group:'Etch', status:'Invited'}
];
const GROUPS = ['Supply Chain','Litho','Etch','Deposition'];
const SETTINGS = {showPricingToEngineers:false};

/* notifications (role-scoped) */
let NOTIFS = [
  {id:1, role:'buyer', icon:'ti-gavel', text:'New bid from Titan Machining on Slit valve plate (SV-300)', when:'2h ago', unread:true, link:{view:'rfq', arg:'SV-300'}},
  {id:2, role:'buyer', icon:'ti-clock-exclamation', text:'Electrode rework (EA-204R) reported a 4-day delay', when:'Yesterday', unread:true, link:{view:'tracking', arg:'delayed'}},
  {id:3, role:'buyer', icon:'ti-message-2', text:'Lumen Quartz asked a question on Quartz viewport (QV-110)', when:'Tue', unread:false, link:{view:'thread', arg:'QV-110'}},
  {id:4, role:'supplier', icon:'ti-file-text', text:'New opportunity: Process gas manifold (GM-512) — Orion Micro', when:'1h ago', unread:true, link:{view:'opp', arg:'GM-512'}},
  {id:5, role:'supplier', icon:'ti-check', text:'Your bid on Slit valve plate (SV-300) was accepted', when:'3h ago', unread:true, link:{view:'tracking'}},
  {id:6, role:'supplier', icon:'ti-clock', text:'Chamber mounting bracket (CMB-330) closes in 1d 9h', when:'today', unread:false, link:{view:'opp', arg:'CMB-330'}}
];
let _nid = 1000;
function pushNotif(role, icon, text, link){ NOTIFS.unshift({id:++_nid, role, icon, text, when:'just now', unread:true, link:link||null}); persist(); }
function routeNotif(link){ if(!link) return; const v=link.view, a=link.arg;
  if(v==='rfq') openRFQ(a); else if(v==='opp') openOpp(a); else if(v==='thread') openThreadFor(a);
  else if(v==='tracking'){ if(a) trackTab=a; go('tracking'); } else go(v||'rfqs'); }
/* audit trail */
let AUDIT = [
  {t:'Jul 11 · 14:22', actor:'Titan Machining', action:'Submitted bid', target:'SV-300', kind:'bid'},
  {t:'Jul 11 · 13:48', actor:'Acme Precision', action:'Revised bid', target:'SV-300', kind:'bid'},
  {t:'Jul 11 · 13:10', actor:'Nord Fab', action:'Viewed drawing in vault', target:'SV-300', kind:'view'},
  {t:'Jul 11 · 11:32', actor:'Coastal CNC', action:'Declined (no-bid): capacity', target:'SV-300', kind:'decline'},
  {t:'Jul 10 · 16:40', actor:'Acme Precision', action:'Signed NDA', target:'QV-110', kind:'nda'},
  {t:'Jul 10 · 15:07', actor:'Priya Rao (Engineer)', action:'Posted addendum to 7 bidders', target:'VF-6061-204', kind:'addendum'},
  {t:'Jul 10 · 11:05', actor:'Sam Ortiz (Buyer)', action:'Published RFQ', target:'VF-6061-204', kind:'rfq'}
];
function actorName(){ if(role()==='supplier') return 'Acme Precision'; const m={admin:'Dana Ortiz (Admin)', buyer:'Sam Ortiz (Buyer)', engineer:'Priya Rao (Engineer)'}; return m[persona()]; }
function logEvent(action, target, kind){ AUDIT.unshift({t:'just now', actor:actorName(), action, target, kind:kind||'evt'}); }

const PROFILES = {
 'Acme Precision':{ id:'SUP-0007', cats:['cnc'], score:4.6,
   provided:{about:'Family-owned precision machine shop specializing in tight-tolerance aluminum and stainless components for semiconductor capital equipment.', founded:2009, location:'San Jose, CA', employees:48, leadtime:'7–10 days', capacity:'~30 active jobs',
     capabilities:['5-axis CNC milling','CNC turning','Hard anodizing','In-house CMM'], materials:['6061/7075 aluminum','304/316 stainless','Titanium'], certs:['ISO 9001:2015','AS9100D']},
   research:{confidence:88, summary:'Established, well-reviewed shop with verified certifications and a strong on-platform delivery record. No risk flags identified.',
     findings:[
       {key:'Certifications', status:'verified', detail:'ISO 9001:2015 and AS9100D confirmed active with registrar (exp. 2026).', source:'NSF-ISR registry'},
       {key:'Financial stability', status:'strong', detail:'15+ years operating; no liens or bankruptcies on record.', source:'D&B summary'},
       {key:'Denied-party screening', status:'clear', detail:'No matches on OFAC / BIS / DDTC lists.', source:'Consolidated Screening List'},
       {key:'Compliance history', status:'clear', detail:'No quality disputes or compliance actions found.', source:'Forerun history'},
       {key:'Delivery performance', status:'strong', detail:'96% on-time across 41 platform orders.', source:'Forerun history'},
       {key:'Corporate & ownership', status:'clear', detail:'US-incorporated, US-owned. No deemed-export exposure indicated.', source:'CA SoS filings'}
     ], flags:[]}},
 'Nord Fab':{ id:'SUP-0014', cats:['sheet','cnc'], score:4.1,
   provided:{about:'Sheet-metal fabrication shop expanding into CNC, serving industrial and semiconductor enclosures and brackets.', founded:2015, location:'Portland, OR', employees:30, leadtime:'12–16 days', capacity:'~18 active jobs',
     capabilities:['Laser cutting','Press brake','Welding','3-axis CNC'], materials:['Aluminum','304 stainless','Cold-rolled steel'], certs:['ISO 9001:2015']},
   research:{confidence:64, summary:'Verified certification and clean screening, but a newer company with a softer delivery record. Worth confirming capacity before high-priority work.',
     findings:[
       {key:'Certifications', status:'verified', detail:'ISO 9001:2015 confirmed active (exp. 2025).', source:'registrar lookup'},
       {key:'Financial stability', status:'attention', detail:'Founded 2015; thin public financials and limited credit history. Not adverse, but unestablished.', source:'D&B summary'},
       {key:'Denied-party screening', status:'clear', detail:'No denied-party matches.', source:'Consolidated Screening List'},
       {key:'Compliance history', status:'clear', detail:'No disputes found.', source:'Forerun history'},
       {key:'Delivery performance', status:'attention', detail:'88% on-time across 12 orders; two recent late deliveries.', source:'Forerun history'},
       {key:'Corporate & ownership', status:'clear', detail:'US-incorporated, US-owned.', source:'OR SoS filings'}
     ], flags:['Lower on-time rate and limited track record — confirm capacity for the quantity before awarding.']}},
 'Titan Machining':{ id:'SUP-0003', cats:['cnc','rework'], score:4.8,
   provided:{about:'Full-service precision machining and rework house with defense-grade controls, serving semiconductor and aerospace primes.', founded:2001, location:'Austin, TX', employees:75, leadtime:'5–8 days', capacity:'~60 active jobs',
     capabilities:['5-axis CNC','Swiss turning','Reworks & refurb','EDM','CMM + laser scan'], materials:['Aluminum','Stainless','Inconel','Titanium'], certs:['ISO 9001:2015','AS9100D','ITAR registered']},
   research:{confidence:91, summary:'Strong, well-established supplier with verified certifications including ITAR registration — relevant for controlled or defense-adjacent work. No flags.',
     findings:[
       {key:'Certifications', status:'verified', detail:'ISO 9001:2015 and AS9100D active; ITAR registration confirmed with DDTC.', source:'DDTC + registrar'},
       {key:'Financial stability', status:'strong', detail:'20+ years; healthy credit profile, no adverse filings.', source:'D&B summary'},
       {key:'Denied-party screening', status:'clear', detail:'No denied-party matches.', source:'Consolidated Screening List'},
       {key:'Compliance history', status:'clear', detail:'No disputes; ITAR-compliant handling on record.', source:'Forerun history'},
       {key:'Delivery performance', status:'strong', detail:'97% on-time across 58 orders.', source:'Forerun history'},
       {key:'Corporate & ownership', status:'clear', detail:'US-incorporated, US-owned; cleared for controlled technical data.', source:'TX SoS filings'}
     ], flags:[]}},
 'Westline Tool':{ id:'SUP-0021', cats:['cnc'], score:3.9,
   provided:{about:'General CNC machining shop serving industrial and electronics customers.', founded:2012, location:'Phoenix, AZ', employees:40, leadtime:'10–14 days', capacity:'~22 active jobs',
     capabilities:['3- and 4-axis CNC','Anodizing (outsourced)','Manual machining'], materials:['Aluminum','Mild steel','Stainless'], certs:['ISO 9001:2015']},
   research:{confidence:52, summary:'Two findings warrant review before award: the claimed ISO certificate appears lapsed, and corporate records indicate partial foreign ownership — relevant to deemed-export controls for sharing controlled drawings.',
     findings:[
       {key:'Certifications', status:'flag', detail:'Claimed ISO 9001:2015 appears LAPSED — registrar shows certificate expired 2024 and not renewed.', source:'registrar lookup'},
       {key:'Financial stability', status:'attention', detail:'Adequate but modest; one tax lien resolved 2023.', source:'D&B summary'},
       {key:'Denied-party screening', status:'clear', detail:'No denied-party matches.', source:'Consolidated Screening List'},
       {key:'Compliance history', status:'attention', detail:'One quality dispute on platform (2024), resolved with rework.', source:'Forerun history'},
       {key:'Delivery performance', status:'attention', detail:'90% on-time across 19 orders.', source:'Forerun history'},
       {key:'Corporate & ownership', status:'flag', detail:'Records indicate ~30% ownership by an overseas parent. Sharing controlled technical data may trigger deemed-export review.', source:'AZ SoS + corporate filings'}
     ], flags:['ISO certificate appears lapsed — confirm current quality system before award.','Partial foreign ownership — assess deemed-export exposure before sharing controlled drawings.']}},
 'Lumen Quartz':{ id:'SUP-0009', cats:['quartz'], score:4.5,
   provided:{about:'Specialist in optical-grade fused silica and technical ceramics for semiconductor process equipment.', founded:2008, location:'Fremont, CA', employees:35, leadtime:'12–18 days', capacity:'~25 active jobs',
     capabilities:['Quartz fabrication','Flame working','Precision grinding','Ceramic machining'], materials:['Fused silica','Quartz','Alumina','Sapphire'], certs:['ISO 9001:2015']},
   research:{confidence:84, summary:'Well-regarded quartz and ceramics specialist with verified certification and clean screening.',
     findings:[
       {key:'Certifications', status:'verified', detail:'ISO 9001:2015 active.', source:'registrar lookup'},
       {key:'Financial stability', status:'strong', detail:'Stable; no adverse filings.', source:'D&B summary'},
       {key:'Denied-party screening', status:'clear', detail:'No matches.', source:'Consolidated Screening List'},
       {key:'Delivery performance', status:'strong', detail:'94% on-time across 27 orders.', source:'Forerun history'},
       {key:'Corporate & ownership', status:'clear', detail:'US-incorporated, US-owned.', source:'CA SoS filings'}
     ], flags:[]}},
 'Flowtek Lines':{ id:'SUP-0017', cats:['gas'], score:4.3,
   provided:{about:'Ultra-high-purity gas line and manifold fabrication with orbital welding and helium leak testing.', founded:2006, location:'Hillsboro, OR', employees:52, leadtime:'10–15 days', capacity:'~30 active jobs',
     capabilities:['Orbital welding','UHP cleaning','Helium leak test','Electropolishing'], materials:['316L SS','Electropolished tube'], certs:['ISO 9001:2015','ASME B31.3']},
   research:{confidence:86, summary:'Established UHP line fabricator with verified certifications and strong delivery history.',
     findings:[
       {key:'Certifications', status:'verified', detail:'ISO 9001:2015 active; ASME B31.3 process qualified.', source:'registrar lookup'},
       {key:'Financial stability', status:'strong', detail:'Stable; no adverse filings.', source:'D&B summary'},
       {key:'Denied-party screening', status:'clear', detail:'No matches.', source:'Consolidated Screening List'},
       {key:'Delivery performance', status:'strong', detail:'95% on-time across 33 orders.', source:'Forerun history'},
       {key:'Corporate & ownership', status:'clear', detail:'US-incorporated, US-owned.', source:'OR SoS filings'}
     ], flags:[]}}
};
const STAT = {
  verified:['Verified','st-good','ti-circle-check','var(--good)'],
  clear:['Clear','st-good','ti-circle-check','var(--good)'],
  strong:['Strong','st-good','ti-circle-check','var(--good)'],
  attention:['Review','st-warn','ti-alert-triangle','var(--warn)'],
  flag:['Flag','st-danger','ti-alert-octagon','var(--danger)'],
  unverified:['Unverified','st-muted','ti-help-circle','var(--faint)']
};

/* ---------------- nav / routing ---------------- */
const NAV = {
  supplier:[
    {v:'opportunities', i:'layout-grid', l:'Opportunities'},
    {v:'mybids', i:'gavel', l:'My bids'},
    {v:'tracking', i:'truck-delivery', l:'Orders & tracking'},
    {v:'messages', i:'message-2', l:'Messages', badge:true},
    {v:'audit', i:'history', l:'Activity'},
    {v:'scorecard', i:'star', l:'Scorecard'},
    {v:'company', i:'building-store', l:'Company profile'}
  ],
  buyer:[
    {v:'rfqs', i:'file-text', l:'My RFQs', roles:['admin','buyer','engineer']},
    {v:'createrfq', i:'plus', l:'New request', roles:['admin','buyer','engineer']},
    {v:'tracking', i:'timeline', l:'Tracking', roles:['admin','buyer','engineer']},
    {v:'suppliers', i:'users', l:'Suppliers', roles:['admin','buyer','engineer']},
    {v:'messages', i:'message-2', l:'Messages', roles:['admin','buyer','engineer'], badge:true},
    {v:'scorecards', i:'star', l:'Scorecards', roles:['admin','buyer']},
    {v:'audit', i:'history', l:'Activity', roles:['admin','buyer','engineer']},
    {v:'admin', i:'settings', l:'Admin', roles:['admin']}
  ]
};
const TITLES = {opportunities:'Opportunities', opportunity:'Opportunity', mybids:'My bids', tracking:'Orders & tracking', messages:'Messages', audit:'Activity & audit', scorecard:'Scorecard', company:'Company profile', rfqs:'My RFQs', createrfq:'New request', suppliers:'Suppliers', scorecards:'Supplier scorecards', admin:'Admin · users & roles', bidcompare:'Review bids', 'supplier-profile':'Supplier profile'};
const NAVKEY = {opportunity:'opportunities', bidcompare:'rfqs', createrfq:'createrfq', 'supplier-profile':'rfqs'};

let ROLE='supplier', PERSONA='buyer';
function role(){return document.getElementById('app').dataset.role;}
function persona(){return document.getElementById('app').dataset.persona;}
function unreadCount(){return THREADS.reduce((n,t)=>n+(t.unread?1:0),0);}
function canSeePrice(){ return role()==='supplier' ? true : (persona()!=='engineer' || SETTINGS.showPricingToEngineers); }
function money(v){ return canSeePrice() ? '$'+v.toLocaleString() : '<span class="mask">$ ••••</span>'; }

function renderNav(){
  const items = NAV[role()].filter(it=>!it.roles || it.roles.includes(persona()));
  document.getElementById('nav').innerHTML = items.map(it=>{
    const badge = it.badge && unreadCount() ? `<span class="nbadge">${unreadCount()}</span>` : '';
    return `<a data-view="${it.v}" onclick="go('${it.v}')"><i class="ti ti-${it.i}"></i><span class="lbl">${it.l}</span>${badge}</a>`;
  }).join('');
}

function go(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
  const el = document.getElementById('view-'+view); if(el) el.classList.add('on');
  const navk = NAVKEY[view]||view;
  document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('on', a.dataset.view===navk));
  document.getElementById('view-title').textContent = TITLES[view]||'';
  document.querySelector('.body').scrollTop = 0;
  if(view==='tracking') renderTracking();
  if(view==='messages') renderMessages();
  if(view==='company') renderCompany();
  if(view==='admin') renderAdmin();
  if(view==='scorecards') renderScorecards();
  if(view==='audit') renderAudit();
  document.getElementById('notifs').classList.remove('on');
}
function setRole(r){
  const app=document.getElementById('app'); app.dataset.role=r;
  document.getElementById('role-sup').classList.toggle('on', r==='supplier');
  document.getElementById('role-buy').classList.toggle('on', r==='buyer');
  document.getElementById('persona-pick').style.display = r==='buyer' ? 'block' : 'none';
  renderNav();
  updatePersonaLabel();
  updateBell();
  document.getElementById('notifs').classList.remove('on');
  if(r==='supplier'){ go('opportunities'); }
  else { go('rfqs'); }
}
function setPersona(p){
  document.getElementById('app').dataset.persona=p;
  document.querySelectorAll('#persona-pick .segrole button').forEach(b=>b.classList.toggle('on', b.dataset.p===p));
  renderNav(); updatePersonaLabel();
  const cur = document.querySelector('.view.on')?.id?.replace('view-','')||'rfqs';
  // if current view not permitted for persona, bounce to rfqs
  const allowed = NAV.buyer.find(n=>n.v===(NAVKEY[cur]||cur));
  if(allowed && allowed.roles && !allowed.roles.includes(p)) go('rfqs'); else go(cur);
}
function updatePersonaLabel(){
  if(role()==='supplier'){ document.getElementById('persona').textContent='Acme Precision · supplier'; document.getElementById('avatar').textContent='AP'; return; }
  const map={admin:['Dana Ortiz · admin','DO'], buyer:['Sam Ortiz · buyer','SO'], engineer:['Priya Rao · engineer','PR']};
  const [txt,ini]=map[persona()];
  document.getElementById('persona').textContent='Northvale Semiconductor — '+txt;
  document.getElementById('avatar').textContent=ini;
}
function toast(msg){ const t=document.getElementById('toast'); document.getElementById('toast-msg').textContent=msg; t.classList.add('show'); clearTimeout(window._tt); window._tt=setTimeout(()=>t.classList.remove('show'),2600); persist(); }

/* notifications bell */
function myNotifs(){ return NOTIFS.filter(n=>n.role===role()); }
function updateBell(){ const c=myNotifs().filter(n=>n.unread).length; const d=document.getElementById('bdot'); d.textContent=c; d.style.display=c?'block':'none'; }
function toggleNotifs(e){ if(e) e.stopPropagation(); const el=document.getElementById('notifs'); if(el.classList.contains('on')){ el.classList.remove('on'); return; } renderNotifs(); el.classList.add('on'); }
function renderNotifs(){
  const list=myNotifs();
  document.getElementById('notifs').innerHTML =
    `<div class="nhead"><span>Notifications</span><span class="link" onclick="markAllRead()">Mark all read</span></div>` +
    (list.length ? list.map(n=>`<div class="ni ${n.unread?'unread':''}" onclick="openNotif(${n.id})"><i class="ti ${n.icon}"></i><div><div class="nt">${n.text}</div><div class="nm2">${n.when}</div></div></div>`).join('') : '<div class="ni"><div class="nt">You\'re all caught up</div></div>');
}
function openNotif(id){ const n=NOTIFS.find(x=>x.id===id); if(!n) return; n.unread=false; document.getElementById('notifs').classList.remove('on'); updateBell(); persist(); try{ routeNotif(n.link); }catch(e){} }
function markAllRead(){ myNotifs().forEach(n=>n.unread=false); renderNotifs(); updateBell(); persist(); }
document.addEventListener('click', e=>{ const nf=document.getElementById('notifs'); if(nf.classList.contains('on') && !nf.contains(e.target) && !e.target.closest('#bell')) nf.classList.remove('on'); });

/* ---------------- modal ---------------- */
function openModal(html){ document.getElementById('modal').innerHTML=html; document.getElementById('overlay').classList.add('on'); }
function closeModal(){ document.getElementById('overlay').classList.remove('on'); }
document.getElementById('overlay').addEventListener('click', e=>{ if(e.target.id==='overlay') closeModal(); });

/* ---------------- supplier: opportunities ---------------- */
let oppFilter='all', oppSoon=false;
const SAVED = new Set(['AI-076']);
const MYIDS = new Set(MYBIDS.map(b=>b.id));
const NDA_SIGNED = new Set();

function renderOppFilters(){
  const chips = ['all',...COMPANIES];
  document.getElementById('opp-filters').innerHTML =
    `<span style="font-size:12px;color:var(--faint)">Customer:</span>` +
    chips.map(c=>`<span class="fchip ${oppFilter===c&&!oppSoon?'on':''}" onclick="oppFilter='${c}';oppSoon=false;renderOppFilters();renderOpps()">${c==='all'?'All':c}</span>`).join('') +
    `<span style="width:8px"></span><span class="fchip ${oppSoon?'on':''}" onclick="oppSoon=!oppSoon;renderOppFilters();renderOpps()"><i class="ti ti-clock" style="font-size:12px;vertical-align:-1px"></i> Closing today</span>`;
}
function bmBtn(id){ const on=SAVED.has(id); return `<button class="bm ${on?'on':''}" onclick="toggleSave('${id}',event)" aria-label="${on?'Saved':'Save'}"><i class="ti ti-bookmark"></i></button>`; }
function toggleSave(id, ev){ if(ev) ev.stopPropagation(); const adding=!SAVED.has(id); adding?SAVED.add(id):SAVED.delete(id); renderOpps(); renderKanban(); toast(adding?'Saved to your pipeline':'Removed from saved'); }
function renderOpps(){
  const list = OPPS.filter(o=>(oppFilter==='all'||o.customer===oppFilter) && (!oppSoon||o.soon));
  document.getElementById('opp-feed').innerHTML = list.map(o=>`<div class="card" onclick="openOpp('${o.id}')">${bmBtn(o.id)}<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${tag(o.cat)}${cotag(o.customer)}</div><span class="ti2">${o.title}</span><span class="pn">${o.id} · qty ${o.qty}${o.nda!=='none'?' · <i class="ti ti-lock" style="font-size:11px;vertical-align:-1px"></i> NDA':''}</span><div class="meta"><span class="${o.soon?'soon':''}">${o.closes}</span><span>${o.bids} bids</span></div></div>`).join('')
    || `<div class="kempty">No open opportunities for ${oppFilter}.</div>`;
}

function openOpp(id){
  const o = OPPS.find(x=>x.id===id) || RFQS.find(x=>x.id===id);
  const el = document.getElementById('opp-detail');
  const ndaReq = o.nda && o.nda!=='none';
  const signed = NDA_SIGNED.has(o.id) || !ndaReq;
  const qty = o.qty||1, hasBid = MYIDS.has(o.id);
  el.innerHTML = `
    <span class="back" onclick="go('opportunities')"><i class="ti ti-arrow-left"></i> Opportunities</span>
    <div class="sec"><h3>${o.title}</h3></div>
    <div class="meta-row">${tag(o.cat)}${o.customer?cotag(o.customer):''}<span>${o.id}</span><span>Qty ${o.qty||'—'}</span><span>Closes in ${o.closes}</span></div>
    <div class="panelcard"><div class="vault">
      <div><div class="t"><i class="ti ti-lock" style="font-size:15px;vertical-align:-2px;margin-right:5px"></i>Drawings — IP-protected</div><div class="n">${signed?'Files stay in the customer vault. Your access is logged and expires at bid close.':'This drawing requires an NDA before it unlocks. Files never leave the customer vault.'}</div></div>
      ${signed
        ? `<button class="btn" onclick="viewVault('${o.id}')">Open in vault ↗</button>`
        : `<button class="btn btn-primary" onclick="signNDA('${o.id}')"><i class="ti ti-file-pencil" style="font-size:14px;vertical-align:-2px"></i> Sign NDA to view</button>`}
    </div></div>
    ${(ADDENDA[o.id]||[]).length?`<div class="panelcard"><div class="seclbl" style="margin-top:0"><i class="ti ti-speakerphone" style="font-size:12px;vertical-align:-1px"></i> Addenda — buyer answers shared with all bidders</div>${(ADDENDA[o.id]).map(a=>`<div class="addendum"><div class="aq">Q: ${a.q}</div><div class="aa">A: ${a.a}</div><div class="at">${a.at} · posted to ${a.bidders} bidders</div></div>`).join('')}</div>`:''}
    <div class="panelcard">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-size:12.5px;color:var(--muted)">${o.reqs||''}</div><button class="btn btn-sm btn-ghost" onclick="openThreadFor('${o.id}')"><i class="ti ti-message-2" style="font-size:14px;vertical-align:-2px"></i> Ask engineer</button></div>
      ${hasBid?'<div class="banner info" style="margin-bottom:12px"><i class="ti ti-info-circle"></i><span>You have an active bid here — you can revise it until the window closes.</span></div>':''}
      <div class="row2">
        <div class="field"><label>Unit price (USD)</label><input id="bid-unit" type="text" placeholder="$ 0.00" oninput="calcTotal(${qty})" ${signed?'':'disabled'}></div>
        <div class="field"><label>Lead time (days)</label><input type="text" placeholder="e.g. 10" ${signed?'':'disabled'}></div>
      </div>
      <div class="row3">
        <div class="field"><label>Shipping (USD)</label><input id="bid-ship" type="text" placeholder="$ 0.00" oninput="calcTotal(${qty})" ${signed?'':'disabled'}></div>
        <div class="field"><label>Incoterms</label><select id="bid-inco" ${signed?'':'disabled'}><option>EXW</option><option>FOB Origin</option><option>DAP</option><option>DDP</option></select></div>
        <div class="field"><label>Total (× ${qty} + shipping)</label><input id="bid-total" type="text" value="—" readonly></div>
      </div>
      <div class="field"><label>Notes (optional)</label><textarea placeholder="Anything the engineer should know…" ${signed?'':'disabled'}></textarea></div>
      <div class="actions" style="justify-content:space-between">
        <button class="btn btn-ghost" onclick="declineBid('${o.id}')" ${signed?'':'disabled'}>Decline (no-bid)</button>
        <div style="display:flex;gap:10px;align-items:center"><span style="font-size:12.5px;color:var(--muted)">${o.bids} bids · amounts hidden</span><button class="btn btn-primary" onclick="submitBid('${o.id}')" ${signed?'':'disabled style="opacity:.5;cursor:not-allowed"'}>${hasBid?'Revise bid':'Submit bid'}</button></div>
      </div>
    </div>`;
  go('opportunity');
}
function calcTotal(qty){
  const num = el => parseFloat((document.getElementById(el).value||'').replace(/[^0-9.]/g,''))||0;
  const t = num('bid-unit')*qty + num('bid-ship');
  document.getElementById('bid-total').value = t ? '$'+t.toLocaleString() : '—';
}
function viewVault(id){ logEvent('Viewed drawing in vault', id, 'view'); toast('Opening vault link · access logged'); }
function declineBid(id){
  openModal(`<h3>Decline to bid (no-bid)</h3><div class="msub">Your reason helps the buyer plan — logged for them, never shown to competitors.</div>
    <div class="field"><label>Reason</label><select id="nb-reason"><option>Capacity — no open slot before need-by date</option><option>Outside our process capability</option><option>Material not available in time</option><option>Pricing not competitive for this work</option><option>Other</option></select></div>
    <div class="field"><label>Notes (optional)</label><textarea placeholder="Anything else the buyer should know"></textarea></div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doDecline('${id}')">Submit no-bid</button></div>`);
}
function doDecline(id){ const reason=document.getElementById('nb-reason').value; logEvent('Declined (no-bid): '+reason, id, 'decline'); pushNotif('buyer','ti-ban',`Acme Precision declined ${id}: ${reason}`); closeModal(); toast('No-bid recorded — buyer notified'); go('opportunities'); }
function signNDA(id){
  const o = OPPS.find(x=>x.id===id)||RFQS.find(x=>x.id===id);
  const kind = o.nda==='drawing' ? 'drawing-specific' : 'category-wide';
  openModal(`
    <h3>Sign NDA to view drawing</h3>
    <div class="msub">${o.customer||'Customer'} requires a ${kind} NDA before this drawing unlocks.</div>
    <div class="rcard" style="max-height:150px;overflow:auto;font-size:12px;color:var(--muted)">This Non-Disclosure Agreement covers all technical data, drawings, and specifications accessed through Forerun Exchange for ${o.customer||'the customer'}${o.nda==='drawing'?` — specifically part ${o.id}`:` in the ${CATS[o.cat]?.label} category`}. Confidential information may not be shared, reproduced, or used outside the scope of quoting and fulfilling this work…</div>
    <label style="margin-top:12px"><input type="checkbox" id="nda-ck" style="width:auto;margin-right:8px" onchange="document.getElementById('nda-go').disabled=!this.checked">I have read and agree on behalf of Acme Precision.</label>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="nda-go" disabled onclick="NDA_SIGNED.add('${o.id}');closeModal();openOpp('${o.id}');toast('NDA signed · drawing unlocked')">Accept &amp; unlock</button></div>`);
}
function submitBid(id){ const revise=MYIDS.has(id); logEvent(revise?'Revised bid':'Submitted bid', id||'', 'bid'); pushNotif('buyer','ti-gavel',`${revise?'Revised':'New'} bid on ${id||'RFQ'} from Acme Precision`, {view:'rfq', arg:'SV-300'}); toast(revise?'Bid revised — buyer notified':'Bid submitted — now in review'); go('mybids'); }
function publishRFQ(){ toast('RFQ published to qualified suppliers'); go('rfqs'); }

/* ---------------- supplier: kanban ---------------- */
function renderKanban(){
  const savedItems = OPPS.filter(o=>SAVED.has(o.id) && !MYIDS.has(o.id)).map(o=>({id:o.id, title:o.title, cat:o.cat, sub:`${o.closes} · ${o.bids} bids`, saved:true}));
  const mk = key => MYBIDS.filter(b=>b.stage===key).map(b=>({id:b.id, title:b.title, cat:b.cat, sub:`${money(b.price)} · ${b.lead}d`, pill:b.status}));
  const stages = [
    {label:'Saved', dot:'var(--warn)', items:savedItems},
    {label:'Submitted', dot:'var(--brand)', items:mk('active')},
    {label:'In review', dot:'#0C447C', items:mk('review')},
    {label:'Won', dot:'var(--win)', items:mk('won')},
    {label:'Lost', dot:'var(--danger)', items:mk('lost')}
  ];
  document.getElementById('mybids-kanban').innerHTML = stages.map(st=>{
    const cards = st.items.map(it=>`<div class="kcard" onclick="openOpp('${it.id}')">${it.saved?bmBtn(it.id):''}${tag(it.cat)}<div class="kt">${it.title}</div><div class="km"><span>${it.sub}</span>${it.pill?`<span class="pill ${it.pill[1]}">${it.pill[0]}</span>`:''}</div></div>`).join('') || '<div class="kempty">None</div>';
    return `<div class="kcol"><div class="khead"><span class="kl"><span class="kdot" style="background:${st.dot}"></span>${st.label}</span><span class="kc">${st.items.length}</span></div>${cards}</div>`;
  }).join('');
}

/* ---------------- orders & tracking (both roles) ---------------- */
let trackTab='all';
function stageIdx(s){ return s==='delivered'?3:s==='shipped'?2:s==='manufacturing'?1:0; }
function orderStepper(o){
  const cur = stageIdx(o.stage==='delivered'?'delivered':o.stage);
  return `<div class="steps">` + STAGES.map((s,i)=>{
    const done = i<cur || (i===3 && o.stage==='delivered');
    const isCurr = i===cur && o.stage!=='delivered';
    const late = o.delayed && i===cur;
    const cls = late?'late':done?'done':isCurr?'curr':'';
    const seg = i<STAGES.length-1 ? `<span class="segline"></span>` : '';
    return `<div class="step ${i<cur?'done':''} ${cls}"><span class="dot">${(done||late)?`<i class="ti ${late?'ti-alert-triangle':'ti-check'}"></i>`:''}</span>${seg}</div>`;
  }).join('') + `</div><div class="steplbls">${STAGES.map(s=>`<span>${STAGE_LBL[s]}</span>`).join('')}</div>`;
}
function renderTracking(){
  const isBuyer = role()==='buyer';
  let orders = ORDERS.slice();
  // supplier only sees own orders
  if(!isBuyer) orders = orders.filter(o=>o.supplier==='Acme Precision');
  const counts = {
    all:orders.length,
    manufacturing:orders.filter(o=>o.stage==='manufacturing'&&!o.delayed).length,
    shipped:orders.filter(o=>o.stage==='shipped').length,
    delayed:orders.filter(o=>o.delayed).length,
    delivered:orders.filter(o=>o.stage==='delivered').length
  };
  const tabs=[['all','All'],['manufacturing','In production'],['shipped','Shipped'],['delayed','Delayed'],['delivered','Delivered']];
  let filtered = orders;
  if(trackTab==='delayed') filtered=orders.filter(o=>o.delayed);
  else if(trackTab!=='all') filtered=orders.filter(o=>o.stage===trackTab && (trackTab!=='manufacturing'||!o.delayed));

  // group by product (buyer's "project holder")
  const byProduct = {};
  filtered.forEach(o=>{ (byProduct[o.product]=byProduct[o.product]||[]).push(o); });

  const head = isBuyer
    ? `<div class="sec"><h3>Where is every RFQ?</h3><span class="v">grouped by product · ${orders.length} active orders</span></div>`
    : `<div class="sec"><h3>Your won orders</h3><span class="v">update status &amp; add tracking</span></div>`;
  const late = orders.filter(o=>o.delayed).length;
  const summary = `<div class="kpis">
    <div class="k"><div class="l">Active</div><div class="v">${counts.all}</div></div>
    <div class="k"><div class="l">In production</div><div class="v">${orders.filter(o=>o.stage==='manufacturing').length}</div></div>
    <div class="k"><div class="l">Shipped</div><div class="v">${counts.shipped}</div></div>
    <div class="k"><div class="l">Late</div><div class="v" style="color:${late?'var(--danger)':'inherit'}">${late}</div>${late?'<div class="d" style="color:var(--danger)">needs attention</div>':''}</div>
  </div>`;
  const tabbar = `<div class="tabs">`+tabs.map(t=>`<button class="tab ${trackTab===t[0]?'on':''}" onclick="trackTab='${t[0]}';renderTracking()">${t[1]}<span class="tcount">${counts[t[0]]}</span></button>`).join('')+`</div>`;

  const rows = Object.keys(byProduct).map(prod=>{
    const cards = byProduct[prod].map(o=>{
      const who = isBuyer ? `Supplier: ${o.supplier}` : `Buyer: ${o.buyer}`;
      const trackBtn = o.tracking
        ? `<span class="link" onclick="toast('Opening FedEx tracking ${o.tracking}')"><i class="ti ti-brand-fedex" style="font-size:13px;vertical-align:-2px"></i> ${o.tracking}</span>`
        : (isBuyer?'<span style="color:var(--faint);font-size:12px">no tracking yet</span>':`<button class="btn btn-sm" onclick="addTracking('${o.id}')">Add FedEx tracking</button>`);
      const delay = o.delayed ? `<div class="banner" style="margin:10px 0 0"><i class="ti ti-clock-exclamation"></i><span><b>Delayed.</b> ${o.delayReason}</span></div>` : '';
      let supActions='';
      if(!isBuyer){
        if(o.stage==='manufacturing') supActions=`<button class="btn btn-sm" onclick="advanceOrder('${o.id}')">Mark shipped</button> <button class="btn btn-sm btn-ghost" onclick="reportDelay('${o.id}')">Report delay</button>`;
        else if(o.stage==='shipped') supActions=`<button class="btn btn-sm" onclick="advanceOrder('${o.id}')">Mark delivered</button>`;
      }
      let buyActions='';
      if(isBuyer && o.stage==='delivered') buyActions=`<button class="btn btn-sm btn-primary" onclick="qualityReview('${o.id}')">Close &amp; review</button> <button class="btn btn-sm" onclick="reorder('${o.id}')">Reorder</button>`;
      return `<div class="gantt-row">
        <div class="gr-head"><div><div class="gr-t">${o.title} <span class="pill st-muted">${o.id}</span></div><div class="gr-m">${tag(o.cat)} · qty ${o.qty} · ${who} · ${money(o.price)} · due ${o.due}</div></div>
        <div>${o.delayed?'<span class="pill st-danger">Late</span>':`<span class="pill ${o.stage==='delivered'?'st-win':o.stage==='shipped'?'st-info':'st-good'}">${STAGE_LBL[o.stage]}</span>`}</div></div>
        ${orderStepper(o)}
        ${delay}
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px">
          <div>${trackBtn}</div><div style="display:flex;gap:8px">${supActions}${buyActions}<button class="btn btn-sm btn-ghost" onclick="openThreadFor('${o.id}')"><i class="ti ti-message-2" style="font-size:13px;vertical-align:-2px"></i></button></div>
        </div>
      </div>`;
    }).join('');
    return isBuyer ? `<div class="seclbl" style="margin-top:6px"><i class="ti ti-folder" style="font-size:12px;vertical-align:-1px"></i> ${prod} · ${byProduct[prod].length}</div>${cards}` : cards;
  }).join('') || '<div class="kempty">Nothing in this stage.</div>';

  document.getElementById('tracking-body').innerHTML = head + summary + tabbar + rows;
}
function advanceOrder(id){
  const o=ORDERS.find(x=>x.id===id);
  if(o.stage==='manufacturing'){ o.stage='shipped'; o.delayed=false; toast('Marked shipped — buyer & engineer notified'); }
  else if(o.stage==='shipped'){ o.stage='delivered'; toast('Marked delivered — FedEx confirmation posted'); }
  renderTracking();
}
function addTracking(id){
  openModal(`<h3>Add FedEx tracking</h3><div class="msub">Buyer sees a live link and delivery updates flow back automatically.</div>
   <div class="field"><label>FedEx tracking number</label><input id="trk" type="text" placeholder="e.g. 7712 3480 1123"></div>
   <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTracking('${id}')">Save &amp; ship</button></div>`);
}
function saveTracking(id){ const v=document.getElementById('trk').value||'7712 3480 1123'; const o=ORDERS.find(x=>x.id===id); o.tracking=v; o.stage='shipped'; o.delayed=false; closeModal(); renderTracking(); toast('Tracking added · marked shipped'); }
function reportDelay(id){
  openModal(`<h3>Report a delay</h3><div class="msub">The engineer and buyer are notified with your reason.</div>
   <div class="field"><label>New expected ship date</label><input type="text" placeholder="e.g. Jul 16"></div>
   <div class="field"><label>Reason</label><textarea id="dreason" placeholder="What happened?"></textarea></div>
   <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveDelay('${id}')">Notify buyer &amp; engineer</button></div>`);
}
function saveDelay(id){ const o=ORDERS.find(x=>x.id===id); o.delayed=true; o.delayReason=(document.getElementById('dreason').value||'Timeline slipped.'); closeModal(); trackTab='delayed'; renderTracking(); toast('Delay reported — engineer & buyer notified'); }

/* quality review → scorecard */
let qrState={rating:0, specs:null, escalate:false};
function qualityReview(id){
  const o=ORDERS.find(x=>x.id===id); qrState={rating:0, specs:null, escalate:false};
  openModal(`<h3>Close job &amp; review — ${o.title}</h3><div class="msub">Your feedback posts to ${o.supplier}'s scorecard immediately.</div>
   <label>Satisfaction</label><div class="stars" id="qr-stars">${[1,2,3,4,5].map(n=>`<i class="ti ti-star-filled" data-n="${n}" onclick="qrStar(${n})"></i>`).join('')}</div>
   <label style="margin-top:14px">Meets specifications / works to drawing?</label>
   <div class="yn"><button class="btn" id="qr-yes" onclick="qrSpecs(true)">Yes, accept</button><button class="btn" id="qr-no" onclick="qrSpecs(false)">No, issue</button></div>
   <label style="margin-top:14px"><input type="checkbox" style="width:auto;margin-right:8px" onchange="qrState.escalate=this.checked">Escalate a quality finding (loops in quality team)</label>
   <div class="field" style="margin-top:8px"><textarea placeholder="Notes to the supplier (optional)"></textarea></div>
   <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitReview('${id}')">Submit &amp; close job</button></div>`);
}
function qrStar(n){ qrState.rating=n; document.querySelectorAll('#qr-stars i').forEach(i=>i.classList.toggle('on', +i.dataset.n<=n)); }
function qrSpecs(v){ qrState.specs=v; document.getElementById('qr-yes').classList.toggle('on',v); document.getElementById('qr-no').classList.toggle('on',!v); }
function submitReview(id){
  const o=ORDERS.find(x=>x.id===id);
  const i=ORDERS.indexOf(o); if(i>-1) ORDERS.splice(i,1);
  closeModal(); renderTracking();
  toast(qrState.escalate?'Job closed · quality finding escalated to QA':'Job closed · rating sent to supplier scorecard');
}
function reorder(id){
  const o=ORDERS.find(x=>x.id===id);
  openModal(`<h3>Reorder — ${o.title}</h3><div class="msub">Repeat with the same supplier, or open a fresh RFQ for competitive bids.</div>
   <div class="choice">
     <div class="choicecard" onclick="doReorder('${id}','repeat')"><div class="ct"><i class="ti ti-repeat"></i> Repeat order</div><div class="cd">Same price &amp; supplier (${o.supplier}). Vendor is notified instantly.</div></div>
     <div class="choicecard" onclick="doReorder('${id}','requote')"><div class="ct"><i class="ti ti-file-plus"></i> Re-quote</div><div class="cd">Reopen as a new RFQ for better pricing from all qualified suppliers.</div></div>
   </div>
   <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button></div>`);
}
function doReorder(id,mode){ closeModal(); if(mode==='repeat') toast('Repeat order placed — '+ORDERS.find(x=>x.id===id).supplier+' notified'); else { toast('New RFQ opened for competitive bids'); go('rfqs'); } }

/* ---------------- messages / chat ---------------- */
let activeThread=1;
function threadCounterpart(t){ return role()==='supplier' ? (t.engineer) : (t.supplier); }
function openThreadFor(partId){ const t=THREADS.find(x=>x.part===partId); if(t){ activeThread=t.id; t.unread=0; } go('messages'); }
function renderMessages(){
  const t = THREADS.find(x=>x.id===activeThread)||THREADS[0];
  t.unread=0; renderNav();
  const list = THREADS.map(th=>{
    const last=th.msgs[th.msgs.length-1];
    return `<div class="cli ${th.id===t.id?'on':''}" onclick="activeThread=${th.id};renderMessages()">
      <div class="cn">${threadCounterpart(th)} ${th.unread?'<span class="cdot"></span>':''}</div>
      <div class="cp">${th.partTitle} · ${th.part}${role()==='buyer'?' · '+th.company:''}</div>
      <div class="cprev">${last.text}</div></div>`;
  }).join('');
  const who = m => role()==='supplier'
      ? (m.from==='sup'?'me':'them')
      : (m.from==='sup'?'them':'me');
  const bubbles = t.msgs.map(m=>{
    if(m.from==='sys') return `<div class="sysmsg"><i class="ti ti-speakerphone" style="font-size:12px;vertical-align:-1px"></i> ${m.text}</div>`;
    const side=who(m);
    return `<div class="bub ${side}">${side==='them'?`<div style="font-size:10px;color:var(--faint);margin-bottom:2px">${m.name}</div>`:''}${m.text}<div class="bt">${m.t}</div></div>`;
  }).join('');
  const addendumUI = role()==='buyer'
    ? `<label class="chk" style="padding:8px 14px 0;font-size:12px"><input type="checkbox" id="post-addendum"><span>Post this answer as an <b>addendum to all ${(RFQS.find(r=>r.id===t.part)?.bids)||'the'} bidders</b> on ${t.part} (fairness)</span></label>`
    : '';
  document.getElementById('messages-body').innerHTML = `
    <div class="sec"><h3>Messages</h3><span class="v">technical questions route to the assigned ${role()==='supplier'?'engineer/buyer':'supplier'}</span></div>
    <div class="chat">
      <div class="clist">${list}</div>
      <div class="thread">
        <div class="thhead"><div class="tn">${threadCounterpart(t)}</div><div class="tp">${t.partTitle} · ${t.part} · ${t.company}</div></div>
        <div class="thbody" id="thbody"><div class="sysmsg">Conversation started on part ${t.part}</div>${bubbles}</div>
        ${addendumUI}
        <div class="composer"><input id="chat-in" type="text" placeholder="Type a message…" onkeydown="if(event.key==='Enter')sendMsg()"><button class="btn btn-primary" onclick="sendMsg()">Send</button></div>
      </div>
    </div>`;
  const b=document.getElementById('thbody'); if(b) b.scrollTop=b.scrollHeight;
}
function sendMsg(){
  const inp=document.getElementById('chat-in'); const v=(inp.value||'').trim(); if(!v) return;
  const t=THREADS.find(x=>x.id===activeThread);
  const asAddendum = role()==='buyer' && document.getElementById('post-addendum') && document.getElementById('post-addendum').checked;
  t.msgs.push({from: role()==='supplier'?'sup':(persona()==='engineer'?'eng':'buy'), name:'You', text:v, t:'now'});
  if(asAddendum){
    const lastQ = [...t.msgs].reverse().find(m=>m.from==='sup');
    const bidders = (RFQS.find(r=>r.id===t.part)?.bids) || THREADS.filter(x=>x.part===t.part).length || 1;
    (ADDENDA[t.part]=ADDENDA[t.part]||[]).push({q:lastQ?lastQ.text:'(buyer clarification)', a:v, at:'now · '+actorName(), bidders});
    t.msgs.push({from:'sys', text:`Posted as an addendum to all ${bidders} bidders on ${t.part}`});
    pushNotif('supplier','ti-speakerphone',`Addendum posted on ${t.partTitle} (${t.part}) — all bidders`, {view:'opp', arg:t.part});
    logEvent(`Posted addendum to ${bidders} bidders`, t.part, 'addendum');
    renderMessages(); toast('Answer posted as an addendum to all bidders'); return;
  }
  renderMessages(); toast('Message sent · notification pushed');
}

/* ---------------- supplier: company profile / onboarding ---------------- */
let onboardType=null; const onboardCats=new Set(['cnc']);
function renderCompany(){
  const catList = Object.keys(CATS).map(k=>`<div class="catopt ${onboardCats.has(k)?'on':''}" onclick="toggleOnboardCat('${k}')"><i class="ti ${CATS[k].icon}"></i>${CATS[k].label}</div>`).join('');
  document.getElementById('company-body').innerHTML = `
    <div class="banner info"><i class="ti ti-info-circle"></i><span>Complete your profile so buyers can qualify you. Everything here is supplier-provided; the Research Agent verifies it independently.</span></div>
    <div class="wizsteps"><span class="wizstep done">1 · Company</span><span class="wizstep on">2 · R&amp;D capacity</span><span class="wizstep">3 · Categories</span><span class="wizstep">4 · Certifications</span></div>
    <div class="panelcard">
      <div class="seclbl" style="margin-top:0">Company details</div>
      <div class="row2"><div class="field"><label>Company name</label><input type="text" value="Acme Precision"></div><div class="field"><label>Location</label><input type="text" value="San Jose, CA"></div></div>
      <div class="row3"><div class="field"><label>Founded</label><input type="text" value="2009"></div><div class="field"><label>Employees</label><input type="text" value="48"></div><div class="field"><label>Typical lead time</label><input type="text" value="7–10 days"></div></div>
      <div class="field"><label>About</label><textarea>Family-owned precision machine shop specializing in tight-tolerance aluminum and stainless components for semiconductor capital equipment.</textarea></div>
    </div>
    <div class="panelcard">
      <div class="seclbl" style="margin-top:0">Do you take on R&amp;D work?</div>
      <div class="choice">
        <div class="choicecard ${onboardType==='rnd'?'on':''}" onclick="setOnboard('rnd')"><div class="ct"><i class="ti ti-flask"></i> Yes — R&amp;D + production</div><div class="cd">You have bandwidth for one-off prototypes and test batches, not just volume runs.</div></div>
        <div class="choicecard ${onboardType==='prod'?'on':''}" onclick="setOnboard('prod')"><div class="ct"><i class="ti ti-building-factory-2"></i> Production only</div><div class="cd">You prefer steady production volume; R&amp;D disrupts your flow.</div></div>
      </div>
      ${onboardType==='prod'?'<div class="hint" style="color:var(--warn)">Production-only suppliers won\'t receive R&amp;D bid invitations.</div>':''}
    </div>
    <div class="panelcard">
      <div class="seclbl" style="margin-top:0">Capability categories</div>
      <div class="catgrid">${catList}</div>
    </div>
    <div class="panelcard">
      <div class="seclbl" style="margin-top:0">Certifications (claimed)</div>
      <div class="chips" style="margin-bottom:10px"><span class="chip2">ISO 9001:2015</span><span class="chip2">AS9100D</span><span class="chip2">+ Add</span></div>
      <div class="hint">The Research Agent will confirm these with the registrar during qualification.</div>
    </div>
    <div class="actions"><button class="btn" onclick="toast('Draft saved')">Save draft</button><button class="btn btn-primary" onclick="toast('Profile submitted for qualification')">Submit for qualification</button></div>`;
}
function setOnboard(t){ onboardType=t; renderCompany(); }
function toggleOnboardCat(k){ onboardCats.has(k)?onboardCats.delete(k):onboardCats.add(k); renderCompany(); }

/* ---------------- buyer: lists ---------------- */
function renderRFQs(){
  document.getElementById('rfq-list').innerHTML = RFQS.map(r=>`<div class="li" onclick="openRFQ('${r.id}')"><div><div class="lt">${r.title}</div><div class="lm">${CATS[r.cat].label} · ${r.id} · ${r.product}</div></div><div class="lr"><span>${r.bids} bids</span><span>${r.closes!=='closed'&&r.closes!=='awarded'?r.closes:''}</span><span class="pill ${r.status[1]}">${r.status[0]}</span></div></div>`).join('');
}
function renderSuppliers(){
  document.getElementById('sup-list').innerHTML = SUPS.map(s=>`<div class="li" onclick="openSupplier('${s.name}','suppliers')"><div><div class="lt">${s.name} ${s.rnd?'<span class="pill st-good" style="margin-left:4px">R&amp;D</span>':'<span class="pill st-muted" style="margin-left:4px">Production only</span>'}</div><div class="lm">${s.cats.map(c=>CATS[c].label).join(' · ')} · ${s.jobs} jobs · ${s.ontime}% on-time</div></div><div class="lr"><span>★ ${s.score}</span><span class="pill st-good">Qualified</span></div></div>`).join('');
  document.getElementById('cat-select').innerHTML = Object.keys(CATS).map(k=>`<option>${CATS[k].label}</option>`).join('');
}
function renderScorecards(){
  document.getElementById('scorecards-list').innerHTML = SUPS.map(s=>`<div class="li" onclick="openSupplier('${s.name}','scorecards')">
    <div><div class="lt">${s.name}</div><div class="lm">${s.cats.map(c=>CATS[c].label).join(' · ')}</div></div>
    <div class="lr"><span>${s.jobs} jobs</span><span>${s.ontime}% on-time</span><span class="pill ${s.ontime>=95?'st-win':s.ontime>=90?'st-good':'st-warn'}">★ ${s.score}</span></div></div>`).join('');
}

/* ---------------- buyer: bid compare + award ---------------- */
let currentRFQ=null, selectedBid=null, splitMode=false, splitAlloc={};
function supplierFlags(name){ const p=PROFILES[name]; return p ? p.research.flags : []; }
function openRFQ(id){
  const r = RFQS.find(x=>x.id===id);
  if(r.awarded){ toast('Already awarded — see Tracking'); go('tracking'); return; }
  currentRFQ=r; selectedBid=null; splitMode=false; splitAlloc={};
  renderBidCompare(); go('bidcompare');
}
function renderBidRows(){
  const r=currentRFQ, qty=r.qty||BID_QTY;
  return BIDS.map(b=>{
    const flags=supplierFlags(b.supplier);
    const sel = (!splitMode && selectedBid===b.supplier)?'sel':'';
    const first = splitMode
      ? `<input type="number" min="0" max="${qty}" value="${splitAlloc[b.supplier]||0}" onclick="event.stopPropagation()" oninput="setSplit('${b.supplier}',this.value)">`
      : `<span class="selradio"></span>`;
    return `<tr class="bidrow ${sel} ${b.best==='price'?'best':''}" onclick="${splitMode?'':`selectBid('${b.supplier}')`}">
      <td style="width:70px">${first}</td>
      <td><span class="link" onclick="event.stopPropagation();openSupplier('${b.supplier}','bidcompare')">${b.supplier} <i class="ti ti-external-link" style="font-size:11px;vertical-align:-1px"></i></span>${b.revised?'<span class="minip st-muted" style="background:var(--rule-soft);color:var(--muted)">revised</span>':''}${flags.length?`<span class="minip" style="background:#FCEBEB;color:#A32D2D">⚑ ${flags.length}</span>`:''}</td>
      <td>${money(b.unit)}<span style="color:var(--faint);font-size:11px">/u</span></td>
      <td>${money(b.price)}${b.best==='price'&&canSeePrice()?'<span class="minip" style="background:#E1F5EE;color:#085041">best</span>':''}<div style="font-size:11px;color:var(--faint)">+${canSeePrice()?'$'+b.ship:'••'} ship · ${b.incoterms}</div></td>
      <td>${b.lead}d${b.best==='fast'?'<span class="minip" style="background:#E6F1FB;color:#0C447C">fastest</span>':''}</td>
      <td>★ ${b.score}</td></tr>`;
  }).join('');
}
function renderBidCompare(){
  const r=currentRFQ, qty=r.qty||BID_QTY;
  const priceHead = canSeePrice()?'Total':'Total 🔒';
  const declined = DECLINED[r.id]||[];
  const splitTotal = Object.values(splitAlloc).reduce((a,b)=>a+(b||0),0);
  document.getElementById('bidcompare').innerHTML = `
    <span class="back" onclick="go('rfqs')"><i class="ti ti-arrow-left"></i> My RFQs</span>
    <div class="sec"><h3>${r.title} — bids</h3><span class="v">${r.bids} bids · ${declined.length} declined · qty ${qty}</span></div>
    ${persona()==='engineer'&&!SETTINGS.showPricingToEngineers?'<div class="banner"><i class="ti ti-eye-off"></i><span>Viewing as <b>engineer</b> — pricing hidden by admin. Lead time &amp; scorecard visible.</span></div>':''}
    ${r.open?`<div class="banner"><i class="ti ti-clock"></i><span>Window still open — award unlocks after close.${r.autoExtend?' <b>Anti-sniping:</b> a bid in the final 10 min auto-extends the window.':''}</span></div>`:''}
    <div class="meta-row">${tag(r.cat)}<span>${r.id}</span><span>${r.product}</span>${r.autoExtend?'<span class="pill st-info">auto-extend on</span>':''}</div>
    <div class="toolbar">
      <span class="fchip ${!splitMode?'on':''}" onclick="splitMode=false;selectedBid=null;renderBidCompare()">Single award</span>
      <span class="fchip ${splitMode?'on':''}" onclick="splitMode=true;selectedBid=null;renderBidCompare()">Split award</span>
      <span style="flex:1"></span>
      <button class="btn btn-sm" onclick="exportBids()"><i class="ti ti-download" style="font-size:13px;vertical-align:-2px"></i> Export CSV</button>
      <button class="btn btn-sm" onclick="duplicateRFQ('${r.id}')"><i class="ti ti-copy" style="font-size:13px;vertical-align:-2px"></i> Duplicate / re-run</button>
    </div>
    <div class="list" style="padding:0"><table><thead><tr><th>${splitMode?'Qty':''}</th><th>Supplier</th><th>Unit</th><th>${priceHead}</th><th>Lead</th><th>Score</th></tr></thead><tbody>${renderBidRows()}</tbody></table></div>
    <div class="hint" style="margin-top:8px">Totals include shipping as quoted (incoterms shown). ${splitMode?`Allocate quantities across suppliers — split sums to <b>${splitTotal}</b> / ${qty}.`:'Tap a row to select the awardee.'}</div>
    ${declined.length?`<div class="seclbl">Declined / no-bid (${declined.length}) — buyer signal</div>`+declined.map(d=>`<div class="li" style="border:0.5px solid var(--rule);border-radius:9px;margin-bottom:7px"><div><div class="lt">${d.supplier}</div><div class="lm">${d.reason}</div></div><span class="pill st-muted">no-bid</span></div>`).join(''):''}
    <div class="award"><span class="n"><i class="ti ti-shield-check" style="font-size:15px;vertical-align:-2px;margin-right:5px"></i>Awarding requires internal sign-off before the PO is issued.</span>
      <button class="btn btn-primary" ${r.open?'disabled style="opacity:.5;cursor:not-allowed"':''} onclick="awardConfirm()">Award &amp; request sign-off</button></div>`;
}
function selectBid(name){ selectedBid=name; renderBidCompare(); }
function setSplit(name,v){ splitAlloc[name]=Math.max(0, parseInt(v)||0); }
function awardConfirm(){
  const r=currentRFQ, qty=r.qty||BID_QTY;
  if(splitMode){
    const parts=Object.entries(splitAlloc).filter(([,q])=>q>0);
    if(!parts.length){ toast('Allocate quantity to at least one supplier'); return; }
    const total=parts.reduce((a,[,q])=>a+q,0);
    if(total!==qty){ toast(`Split must sum to ${qty} (currently ${total})`); return; }
    const rows=parts.map(([s,q])=>{const b=BIDS.find(x=>x.supplier===s); return `<div class="sumrow"><span>${s} · ${q} units</span><span class="sv">${money(b.unit*q)}</span></div>`;}).join('')+`<div class="sumrow"><span>Total qty</span><span class="sv">${qty}</span></div>`;
    openAwardModal(`Split award — ${r.title}`, rows, parts.map(p=>p[0]).filter(s=>supplierFlags(s).length));
    return;
  }
  if(!selectedBid){ toast('Select a supplier row to award'); return; }
  const b=BIDS.find(x=>x.supplier===selectedBid);
  const lowest=Math.min(...BIDS.map(x=>x.price)), delta=b.price-lowest;
  const rows=`
    <div class="sumrow"><span>Supplier</span><span class="sv">${b.supplier} · ★ ${b.score}</span></div>
    <div class="sumrow"><span>Unit price × ${qty}</span><span class="sv">${money(b.unit)} × ${qty}</span></div>
    <div class="sumrow"><span>Shipping (${b.incoterms})</span><span class="sv">${money(b.ship)}</span></div>
    <div class="sumrow"><span>Total</span><span class="sv">${money(b.price)}</span></div>
    <div class="sumrow"><span>Lead time</span><span class="sv">${b.lead} days</span></div>
    <div class="sumrow"><span>vs. lowest bid</span><span class="sv" style="color:${delta>0?'var(--warn)':'var(--good)'}">${delta>0?'+'+money(delta):'lowest bid'}</span></div>`;
  openAwardModal(`Award — ${r.title}`, rows, supplierFlags(b.supplier).length?[b.supplier]:[]);
}
function openAwardModal(title, summaryRows, flaggedSuppliers){
  const flags = (flaggedSuppliers||[]).flatMap(s=>supplierFlags(s).map(f=>({s,f})));
  const flagBox = flags.length ? `
    <div class="flagack">
      <div style="font-weight:600"><i class="ti ti-alert-triangle" style="vertical-align:-2px"></i> ${flags.length} open risk flag${flags.length>1?'s':''} on ${[...new Set(flags.map(x=>x.s))].join(', ')}</div>
      ${flags.map(x=>`<div class="fl"><i class="ti ti-point-filled" style="font-size:11px;margin-top:3px"></i><span><b>${x.s}:</b> ${x.f}</span></div>`).join('')}
      <label class="chk" style="margin-top:11px"><input type="checkbox" id="ackflags" onchange="document.getElementById('awardgo').disabled=!this.checked"><span>I acknowledge these flags and accept responsibility for awarding despite them.</span></label>
    </div>` : '';
  openModal(`
    <h3>${title}</h3>
    <div class="msub">Confirm the award — this requests internal sign-off before a PO is issued.</div>
    <div style="margin:8px 0 2px">${summaryRows}</div>
    ${flagBox}
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="awardgo" ${flags.length?'disabled':''} onclick="doAward()">Confirm &amp; request sign-off</button></div>`);
}
function doAward(){
  const r=currentRFQ;
  if(splitMode){
    const parts=Object.entries(splitAlloc).filter(([,q])=>q>0);
    parts.forEach(([s,q])=>logEvent(`Awarded ${q} units to ${s} (split)`, r.id, 'award'));
    parts.forEach(([s])=>pushNotif('supplier','ti-check',`You were awarded part of ${r.title} (${r.id})`, {view:'tracking'}));
    toast(`Split award sent for sign-off across ${parts.length} suppliers`);
  } else {
    logEvent(`Awarded to ${selectedBid} — sign-off requested`, r.id, 'award');
    pushNotif('supplier','ti-check',`Your bid on ${r.title} (${r.id}) was accepted`, {view:'tracking'});
    toast(`${selectedBid} awarded — sign-off requested, supplier notified`);
  }
  r.awarded=true; r.status=['Awarded','st-win']; r.open=false; closeModal(); renderRFQs(); go('rfqs');
}
function exportBids(){
  const r=currentRFQ, rows=[['Supplier','Unit','Qty','Shipping','Incoterms','Total','Lead(days)','Score']];
  BIDS.forEach(b=>rows.push([b.supplier,b.unit,(r.qty||BID_QTY),b.ship,b.incoterms,b.price,b.lead,b.score]));
  (DECLINED[r.id]||[]).forEach(d=>rows.push([d.supplier,'no-bid','','','','','',d.reason]));
  downloadCSV(`${r.id}-bids.csv`, rows); logEvent('Exported bid tabulation', r.id, 'export'); toast('Bid tabulation exported (CSV)');
}
function downloadCSV(name, rows){
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download=name; document.body.appendChild(a); a.click(); a.remove();
}
function duplicateRFQ(id){ logEvent('Duplicated RFQ to new draft', id, 'rfq'); toast(`Duplicated ${id} as a new draft`); go('createrfq'); }
function acceptBid(name){ logEvent(`Accepted bid from ${name}`, currentRFQ?currentRFQ.id:'', 'award'); pushNotif('supplier','ti-check',`Your bid was accepted by the buyer`, {view:'tracking'}); toast('Bid from '+name+' accepted — supplier notified, lead time started'); go('tracking'); }

/* ---------------- supplier profile (buyer diligence) ---------------- */
let profileReturn = 'bidcompare';
function openSupplier(name, ret){
  profileReturn = ret || 'bidcompare';
  const pr = PROFILES[name]; if(!pr){ toast('No profile available'); return; }
  const p = pr.provided, r = pr.research;
  const bid = (typeof BIDS!=='undefined') ? BIDS.find(b=>b.supplier===name) : null;
  const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('');
  const chips = a => a.map(c=>`<span class="chip2">${c}</span>`).join('');
  const findings = r.findings.map(f=>{const s=STAT[f.status]; return `<div class="find"><i class="ti ${s[2]} fi" style="color:${s[3]}"></i><div><div class="fk">${f.key}<span class="stat ${s[1]}">${s[0]}</span></div><div class="fd">${f.detail}</div>${f.source?`<div class="fsrc">Source: ${f.source}</div>`:''}</div></div>`;}).join('');
  const flags = r.flags.map(f=>`<div class="flagbox"><i class="ti ti-alert-triangle" style="flex-shrink:0;margin-top:1px"></i><span>${f}</span></div>`).join('');
  const certStat = r.findings[0].status==='verified' ? '<span style="color:var(--good)">Verified</span>' : (r.findings[0].status==='flag' ? '<span style="color:var(--danger)">Lapsed</span>' : 'Check');
  const showBid = bid && canSeePrice();
  document.getElementById('supplier-profile').innerHTML = `
    <span class="back" onclick="go('${profileReturn}')"><i class="ti ti-arrow-left"></i> Back</span>
    <div class="phead"><span class="pav">${initials}</span><div><div class="pname">${name}</div><div class="pmeta">${pr.cats.map(c=>tag(c)).join(' ')}<span class="pill st-good">Qualified</span><span>★ ${pr.score}</span><span class="mono">${pr.id}</span></div></div></div>
    ${showBid?`<div class="block" style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><span style="font-size:13px;color:var(--muted)">Bid under review</span><span style="font-weight:500">$${bid.price.toLocaleString()} · ${bid.lead} days · ★ ${bid.score}</span></div>`:''}
    <div class="prof">
      <div class="pmain">
        <div class="block">
          <span class="blabel bl-self"><i class="ti ti-building"></i> Supplier-provided</span>
          <div style="font-size:13.5px;margin-bottom:14px">${p.about}</div>
          <div class="kv">
            <div class="item"><div class="l">Founded</div><div class="v">${p.founded}</div></div>
            <div class="item"><div class="l">Location</div><div class="v">${p.location}</div></div>
            <div class="item"><div class="l">Employees</div><div class="v">${p.employees}</div></div>
            <div class="item"><div class="l">Lead time</div><div class="v">${p.leadtime}</div></div>
            <div class="item"><div class="l">Capacity</div><div class="v">${p.capacity}</div></div>
          </div>
          <div class="seclbl">Capabilities</div><div class="chips">${chips(p.capabilities)}</div>
          <div class="seclbl">Materials</div><div class="chips">${chips(p.materials)}</div>
          <div class="seclbl">Certifications (claimed)</div><div class="chips">${chips(p.certs)}</div>
        </div>
        <div class="block agent">
          <span class="blabel bl-agent"><i class="ti ti-sparkles"></i> Forerun Research Agent</span>
          <div style="font-size:13.5px;margin-bottom:10px">${r.summary}</div>
          <div class="conf">Confidence<span class="confbar"><span style="width:${r.confidence}%"></span></span>${r.confidence}%</div>
          <div style="margin-top:12px">${findings}</div>
          ${flags}
          <div class="disc"><i class="ti ti-info-circle" style="vertical-align:-1px"></i> Compiled automatically from public and private sources for diligence reference. Verify critical findings before relying on them.</div>
        </div>
      </div>
      <div class="rail">
        <div class="rcard">
          <div style="font-size:12.5px;font-weight:500;margin-bottom:8px">At a glance</div>
          <div class="rf"><span>Scorecard</span><span>★ ${pr.score}</span></div>
          <div class="rf"><span>Denied-party</span><span style="color:var(--good)">Clear</span></div>
          <div class="rf"><span>Certs</span>${certStat}</div>
          <div class="rf"><span>Risk flags</span><span style="color:${r.flags.length?'var(--warn)':'var(--good)'}">${r.flags.length||'None'}</span></div>
        </div>
        <div class="rcard">
          ${showBid?`<button class="btn btn-primary" style="width:100%;margin-bottom:8px" onclick="acceptBid('${name}')">Accept this bid</button>`:''}
          <button class="btn" style="width:100%;margin-bottom:8px" onclick="openThreadFor('VF-6061-204')"><i class="ti ti-message-2" style="font-size:14px;vertical-align:-2px"></i> Message</button>
          <button class="btn" style="width:100%;margin-bottom:8px" onclick="toast('Info request sent to supplier')">Request more info</button>
          <button class="btn" style="width:100%" onclick="go('${profileReturn}')">Back</button>
        </div>
      </div>
    </div>`;
  go('supplier-profile');
}

/* ---------------- buyer: admin ---------------- */
function renderAdmin(){
  const rb=r=>`<span class="rolebadge rb-${r.toLowerCase()}">${r}</span>`;
  const rows = USERS.map((u,idx)=>`<tr><td><div style="font-weight:500">${u.name}</div><div style="font-size:11.5px;color:var(--faint)">${u.email}</div></td>
    <td><select onchange="USERS[${idx}].role=this.value;renderAdmin();persist()" style="padding:5px 8px;font-size:12px;max-width:120px">${['Admin','Buyer','Engineer'].map(r=>`<option ${u.role===r?'selected':''}>${r}</option>`).join('')}</select></td>
    <td>${u.group}</td><td><span class="pill ${u.status==='Active'?'st-good':'st-warn'}">${u.status}</span></td></tr>`).join('');
  document.getElementById('admin-body').innerHTML = `
    <div class="sec"><h3>Users &amp; roles</h3><span class="v"><button class="btn btn-primary btn-sm" onclick="addUser()">+ Invite user</button></span></div>
    <div class="list" style="padding:0"><table><thead><tr><th>User</th><th>Role</th><th>Group</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="sec" style="margin-top:20px"><h3>Groups</h3><span class="v">buyers &amp; engineers are scoped to a group</span></div>
    <div class="chips" style="margin-bottom:18px">${GROUPS.map(g=>`<span class="chip2">${g}</span>`).join('')}<span class="chip2 link" onclick="toast('Group added')">+ Add group</span></div>
    <div class="sec"><h3>Access settings</h3></div>
    <div class="panelcard" style="padding:6px 18px">
      <div class="setrow"><div><div style="font-weight:500;font-size:13.5px">Show pricing to engineers</div><div style="font-size:12px;color:var(--muted)">When off, engineers see lead time &amp; scorecards but bid prices are masked.</div></div><button class="toggle ${SETTINGS.showPricingToEngineers?'on':''}" onclick="SETTINGS.showPricingToEngineers=!SETTINGS.showPricingToEngineers;renderAdmin();toast('Setting updated')"></button></div>
      <div class="setrow"><div><div style="font-weight:500;font-size:13.5px">Buyers can see each other's RFQs</div><div style="font-size:12px;color:var(--muted)">Open forum within the company (recommended).</div></div><button class="toggle on" onclick="toast('Kept on — open forum')"></button></div>
      <div class="setrow"><div><div style="font-weight:500;font-size:13.5px">Seed suppliers from SAP</div><div style="font-size:12px;color:var(--muted)">Import the existing qualified-supplier list on first setup.</div></div><button class="btn btn-sm" onclick="toast('Imported 128 suppliers from SAP')">Import</button></div>
    </div>`;
}
function addUser(){
  openModal(`<h3>Invite user</h3><div class="msub">They'll get an email invite to join Northvale Semiconductor.</div>
   <div class="field"><label>Name</label><input id="u-name" type="text" placeholder="Full name"></div>
   <div class="field"><label>Email</label><input id="u-email" type="text" placeholder="name@northvale.com"></div>
   <div class="row2"><div class="field"><label>Role</label><select id="u-role"><option>Buyer</option><option>Engineer</option><option>Admin</option></select></div>
   <div class="field"><label>Group</label><select id="u-group">${GROUPS.map(g=>`<option>${g}</option>`).join('')}</select></div></div>
   <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveUser()">Send invite</button></div>`);
}
function saveUser(){ USERS.push({name:document.getElementById('u-name').value||'New User', email:document.getElementById('u-email').value||'user@northvale.com', role:document.getElementById('u-role').value, group:document.getElementById('u-group').value, status:'Invited'}); closeModal(); renderAdmin(); toast('Invite sent'); }

/* supplier feedback list */
function renderSuppFeedback(){
  document.getElementById('supp-feedback').innerHTML = SUPP_FEEDBACK.map(f=>`<div class="li"><div><div class="lt">${f.title} <span class="pill st-muted" style="margin-left:4px">${f.part}</span></div><div class="lm">${f.note}</div></div><div class="lr"><span style="color:#E0A24E">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)}</span></div></div>`).join('');
}

/* ---------------- audit trail ---------------- */
function renderAudit(){
  const kindIcon={bid:'ti-gavel', view:'ti-eye', nda:'ti-file-check', addendum:'ti-speakerphone', rfq:'ti-file-text', award:'ti-award', decline:'ti-ban', export:'ti-download', evt:'ti-point'};
  const kindColor={bid:'var(--brand)', view:'var(--faint)', nda:'var(--good)', addendum:'var(--brand)', rfq:'var(--muted)', award:'var(--win)', decline:'var(--danger)', export:'var(--muted)', evt:'var(--faint)'};
  const rows = AUDIT.map(a=>`<tr><td style="white-space:nowrap;color:var(--muted)">${a.t}</td><td><i class="ti ${kindIcon[a.kind]||'ti-point'}" style="color:${kindColor[a.kind]||'var(--faint)'};font-size:15px;vertical-align:-2px;margin-right:6px"></i>${a.action}</td><td>${a.actor}</td><td><span class="pill st-muted">${a.target||'—'}</span></td></tr>`).join('');
  document.getElementById('audit-body').innerHTML = `
    <div class="sec"><h3>Activity &amp; audit trail</h3><span class="v"><button class="btn btn-sm" onclick="exportAudit()"><i class="ti ti-download" style="font-size:13px;vertical-align:-2px"></i> Export</button></span></div>
    <div class="banner info"><i class="ti ti-lock"></i><span>Every drawing view, bid, NDA, addendum and award is recorded — timestamped, attributable, and exportable for procurement compliance.</span></div>
    <div class="list" style="padding:0"><table><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>RFQ / part</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function exportAudit(){ const rows=[['When','Action','Actor','Target','Kind']]; AUDIT.forEach(a=>rows.push([a.t,a.action,a.actor,a.target,a.kind])); downloadCSV('forerun-audit.csv', rows); toast('Audit trail exported (CSV)'); }

/* ---------------- persistence (server-backed state) ---------------- */
let _ready=false, _ptimer=null;
function snapshot(){
  return { __seeded:true,
    opps:OPPS, mybids:MYBIDS, rfqs:RFQS, bids:BIDS, declined:DECLINED, addenda:ADDENDA,
    sups:SUPS, orders:ORDERS, threads:THREADS, suppFeedback:SUPP_FEEDBACK, users:USERS,
    groups:GROUPS, settings:SETTINGS, notifs:NOTIFS, audit:AUDIT,
    saved:[...SAVED], ndaSigned:[...NDA_SIGNED], nid:_nid };
}
function _writeState(){
  return fetch('/api/state', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(snapshot())}).catch(()=>{});
}
function persist(){ if(!_ready) return; clearTimeout(_ptimer); _ptimer=setTimeout(_writeState, 350); }
function _repArr(a,b){ a.length=0; if(Array.isArray(b)) b.forEach(x=>a.push(x)); }
function _repObj(o,b){ Object.keys(o).forEach(k=>delete o[k]); if(b&&typeof b==='object') Object.assign(o,b); }
function hydrate(s){
  _repArr(OPPS,s.opps); _repArr(MYBIDS,s.mybids); _repArr(RFQS,s.rfqs); _repArr(BIDS,s.bids);
  _repObj(DECLINED,s.declined); _repObj(ADDENDA,s.addenda); _repArr(SUPS,s.sups); _repArr(ORDERS,s.orders);
  _repArr(THREADS,s.threads); _repArr(SUPP_FEEDBACK,s.suppFeedback); _repArr(USERS,s.users); _repArr(GROUPS,s.groups);
  _repObj(SETTINGS,s.settings); _repArr(NOTIFS,s.notifs); _repArr(AUDIT,s.audit);
  SAVED.clear(); (s.saved||[]).forEach(x=>SAVED.add(x));
  NDA_SIGNED.clear(); (s.ndaSigned||[]).forEach(x=>NDA_SIGNED.add(x));
  MYIDS.clear(); MYBIDS.forEach(b=>MYIDS.add(b.id));
  if(typeof s.nid==='number') _nid=s.nid;
}

/* ---------------- init / boot ---------------- */
function renderLists(){ renderOppFilters(); renderOpps(); renderKanban(); renderRFQs(); renderSuppliers(); renderSuppFeedback(); }
async function boot(){
  let seededFromServer=false;
  try{
    const r=await fetch('/api/state');
    if(r.ok){ const s=await r.json(); if(s && s.__seeded){ hydrate(s); seededFromServer=true; } }
  }catch(e){ /* offline / first run — fall back to built-in seed */ }
  renderNav(); renderLists(); updatePersonaLabel(); updateBell();
  document.getElementById('persona-pick').style.display='none';
  _ready=true;
  if(!seededFromServer){ _writeState(); } // seed the server from built-in defaults
}
boot();
