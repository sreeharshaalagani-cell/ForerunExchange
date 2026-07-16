/* ============================================================
   Forerun Exchange — API-driven client.
   All state comes from the server; all mutations call REST endpoints.
   ============================================================ */

/* ---------------- static presentation data ---------------- */
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
const STAGES = ['accepted','manufacturing','shipped','delivered'];
const STAGE_LBL = {accepted:'Accepted', manufacturing:'In production', shipped:'Shipped', delivered:'Delivered'};
const STAT = {
  verified:['Verified','st-good','ti-circle-check','var(--good)'],
  clear:['Clear','st-good','ti-circle-check','var(--good)'],
  strong:['Strong','st-good','ti-circle-check','var(--good)'],
  attention:['Review','st-warn','ti-alert-triangle','var(--warn)'],
  flag:['Flag','st-danger','ti-alert-octagon','var(--danger)'],
  unverified:['Unverified','st-muted','ti-help-circle','var(--faint)']
};
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

/* ---------------- server-backed state ---------------- */
let ME=null, ACCOUNTS=[];
let OPPS=[], MYBIDS=[], RFQS=[], BIDSBYRFQ={}, DECLINED={}, ADDENDA={}, SUPS=[], ORDERS=[],
    THREADS=[], SUPP_FEEDBACK=[], USERS=[], GROUPS=[], SETTINGS={}, NOTIFS=[], AUDIT=[], PROFILES={};
let SAVED=new Set(), NDA_SIGNED=new Set(), MYIDS=new Set();
let BIDS=[]; // bids of the RFQ currently being reviewed
let VIEW='opportunities';

function role(){ return ME ? ME.role : 'supplier'; }
function persona(){ return ME ? (ME.persona||'buyer') : 'buyer'; }
function canSeePrice(){ return !!(ME && ME.canSeePrice); }
function money(v){ return (v===null||v===undefined) ? '<span class="mask">$ ••••</span>' : '$'+Number(v).toLocaleString(); }
function unreadCount(){ return THREADS.reduce((n,t)=>n+(t.unread?1:0),0); }
function initials(name){ return (name||'?').split(' ').map(w=>w[0]).slice(0,2).join(''); }

function applyState(s){
  if(!s) return;
  ME=s.me; ACCOUNTS=s.accounts||[];
  OPPS=s.opps||[]; MYBIDS=s.mybids||[]; RFQS=s.rfqs||[]; BIDSBYRFQ=s.bidsByRfq||{}; DECLINED=s.declined||{};
  ADDENDA=s.addenda||{}; SUPS=s.sups||[]; ORDERS=s.orders||[]; THREADS=s.threads||[]; SUPP_FEEDBACK=s.suppFeedback||[];
  USERS=s.users||[]; GROUPS=s.groups||[]; SETTINGS=s.settings||{}; NOTIFS=s.notifs||[]; AUDIT=s.audit||[]; PROFILES=s.profiles||{};
  SAVED=new Set(s.saved||[]); NDA_SIGNED=new Set(s.ndaSigned||[]); MYIDS=new Set(MYBIDS.map(b=>b.id));
  const app=document.getElementById('app'); app.dataset.role=ME.role; app.dataset.persona=ME.persona||'buyer';
}

/* ---------------- API layer ---------------- */
async function api(name, body){
  try{
    const r=await fetch('/api/'+name, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body||{})});
    if(r.status===401){ showLogin(); return {error:'Session expired — please sign in'}; }
    return await r.json();
  }catch(e){ return {error:'Network error'}; }
}
/* run an operation: apply returned state, toast message/error, return success bool */
async function act(name, body){
  const r=await api(name, body);
  if(r.state) applyState(r.state);
  if(r.error){ toast(r.error); return false; }
  if(r.msg) toast(r.msg);
  return true;
}

/* ---------------- auth ---------------- */
function showLogin(errMsg){
  document.getElementById('app').style.display='none';
  let el=document.getElementById('login');
  if(!el){ el=document.createElement('div'); el.id='login'; el.className='login-screen'; document.body.appendChild(el); }
  el.innerHTML=`
    <div class="login-card">
      <div class="login-brand"><span class="lg">F</span><span>Forerun Exchange</span></div>
      <div class="login-sub">Reverse-auction procurement for semiconductor R&amp;D</div>
      ${errMsg?`<div class="login-err"><i class="ti ti-alert-circle" style="vertical-align:-2px"></i> ${errMsg}</div>`:''}
      <div class="field"><label>Email</label><input id="li-email" type="email" placeholder="you@company.com" value="sam@northvale.com"></div>
      <div class="field"><label>Password</label><input id="li-pass" type="password" placeholder="••••••••" value="demo1234" onkeydown="if(event.key==='Enter')submitLogin()"></div>
      <button class="btn btn-primary" style="width:100%" onclick="submitLogin()">Sign in</button>
      <div class="login-demo">Demo accounts — password <b>demo1234</b></div>
      <div class="login-accts">
        <button class="btn btn-sm" onclick="loginAs('acme@forerun.dev')">Supplier · Acme</button>
        <button class="btn btn-sm" onclick="loginAs('dana@northvale.com')">Buyer · Admin</button>
        <button class="btn btn-sm" onclick="loginAs('sam@northvale.com')">Buyer</button>
        <button class="btn btn-sm" onclick="loginAs('priya@northvale.com')">Engineer</button>
      </div>
    </div>`;
}
async function doLogin(email, password){
  let d;
  try{
    const r=await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, password})});
    d=await r.json();
    if(!r.ok) return {error:d.error||'Login failed'};
  }catch(e){ return {error:'Network error'}; }
  applyState(d.state);
  const l=document.getElementById('login'); if(l) l.remove();
  document.getElementById('app').style.display='';
  initUIFromMe(); renderNav(); renderLists(); updatePersonaLabel(); updateBell();
  go(role()==='supplier'?'opportunities':'rfqs');
  return {ok:true};
}
async function submitLogin(){ const r=await doLogin(document.getElementById('li-email').value, document.getElementById('li-pass').value); if(r.error) showLogin(r.error); }
async function loginAs(email){ const r=await doLogin(email, 'demo1234'); if(r.error) toast(r.error); }
async function logout(){ try{ await fetch('/api/logout',{method:'POST'}); }catch(e){} ME=null; showLogin(); }

function initUIFromMe(){
  document.getElementById('role-sup').classList.toggle('on', role()==='supplier');
  document.getElementById('role-buy').classList.toggle('on', role()==='buyer');
  document.getElementById('persona-pick').style.display = role()==='buyer' ? 'block':'none';
  document.querySelectorAll('#persona-pick .segrole button').forEach(b=>b.classList.toggle('on', b.dataset.p===persona()));
}
/* the sidebar role/persona controls switch demo accounts (real auth under the hood) */
function setRole(r){ loginAs(r==='supplier' ? 'acme@forerun.dev' : 'sam@northvale.com'); }
function setPersona(p){ loginAs({admin:'dana@northvale.com', buyer:'sam@northvale.com', engineer:'priya@northvale.com'}[p]); }

/* ---------------- nav / routing ---------------- */
function renderNav(){
  const items = NAV[role()].filter(it=>!it.roles || it.roles.includes(persona()));
  document.getElementById('nav').innerHTML = items.map(it=>{
    const badge = it.badge && unreadCount() ? `<span class="nbadge">${unreadCount()}</span>` : '';
    return `<a data-view="${it.v}" onclick="go('${it.v}')"><i class="ti ti-${it.i}"></i><span class="lbl">${it.l}</span>${badge}</a>`;
  }).join('');
}
function go(view){
  VIEW=view;
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
function updatePersonaLabel(){
  if(role()==='supplier'){ document.getElementById('persona').textContent=ME.company+' · supplier'; }
  else { document.getElementById('persona').textContent=ME.company+' — '+ME.name+' · '+ME.persona; }
  document.getElementById('avatar').textContent=initials(ME.name);
}
function toast(msg){ const t=document.getElementById('toast'); document.getElementById('toast-msg').textContent=msg; t.classList.add('show'); clearTimeout(window._tt); window._tt=setTimeout(()=>t.classList.remove('show'),2600); }

/* ---------------- notifications bell ---------------- */
function updateBell(){ const c=NOTIFS.filter(n=>n.unread).length; const d=document.getElementById('bdot'); d.textContent=c; d.style.display=c?'block':'none'; }
function toggleNotifs(e){ if(e) e.stopPropagation(); const el=document.getElementById('notifs'); if(el.classList.contains('on')){ el.classList.remove('on'); return; } renderNotifs(); el.classList.add('on'); }
function renderNotifs(){
  document.getElementById('notifs').innerHTML =
    `<div class="nhead"><span>Notifications</span><span class="link" onclick="markAllRead()">Mark all read</span></div>` +
    (NOTIFS.length ? NOTIFS.map(n=>`<div class="ni ${n.unread?'unread':''}" onclick="openNotif(${n.id})"><i class="ti ${n.icon}"></i><div><div class="nt">${n.text}</div><div class="nm2">${n.when}</div></div></div>`).join('') : '<div class="ni"><div class="nt">You\'re all caught up</div></div>');
}
async function openNotif(id){ const n=NOTIFS.find(x=>x.id===id); const link=n?n.link:null; document.getElementById('notifs').classList.remove('on'); await act('readNotif',{id}); updateBell(); routeNotif(link); }
async function markAllRead(){ await act('markAllRead'); renderNotifs(); updateBell(); }
function routeNotif(link){ if(!link) return; const v=link.view, a=link.arg;
  if(v==='rfq') openRFQ(a); else if(v==='opp') openOpp(a); else if(v==='thread') openThreadFor(a);
  else if(v==='tracking'){ if(a) trackTab=a; go('tracking'); } else go(v||'rfqs'); }
document.addEventListener('click', e=>{ const nf=document.getElementById('notifs'); if(nf.classList.contains('on') && !nf.contains(e.target) && !e.target.closest('#bell')) nf.classList.remove('on'); });

/* ---------------- modal ---------------- */
function openModal(html){ document.getElementById('modal').innerHTML=html; document.getElementById('overlay').classList.add('on'); }
function closeModal(){ document.getElementById('overlay').classList.remove('on'); }
document.getElementById('overlay').addEventListener('click', e=>{ if(e.target.id==='overlay') closeModal(); });

/* ---------------- supplier: opportunities ---------------- */
let oppFilter='all', oppSoon=false;
function renderOppFilters(){
  const chips = ['all',...COMPANIES];
  document.getElementById('opp-filters').innerHTML =
    `<span style="font-size:12px;color:var(--faint)">Customer:</span>` +
    chips.map(c=>`<span class="fchip ${oppFilter===c&&!oppSoon?'on':''}" onclick="oppFilter='${c}';oppSoon=false;renderOppFilters();renderOpps()">${c==='all'?'All':c}</span>`).join('') +
    `<span style="width:8px"></span><span class="fchip ${oppSoon?'on':''}" onclick="oppSoon=!oppSoon;renderOppFilters();renderOpps()"><i class="ti ti-clock" style="font-size:12px;vertical-align:-1px"></i> Closing today</span>`;
}
function bmBtn(id){ const on=SAVED.has(id); return `<button class="bm ${on?'on':''}" onclick="toggleSave('${id}',event)" aria-label="${on?'Saved':'Save'}"><i class="ti ti-bookmark"></i></button>`; }
async function toggleSave(id, ev){ if(ev) ev.stopPropagation(); await act('toggleSave',{oppId:id}); renderOpps(); renderKanban(); }
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
        <div class="field"><label>Lead time (days)</label><input id="bid-lead" type="text" placeholder="e.g. 10" ${signed?'':'disabled'}></div>
      </div>
      <div class="row3">
        <div class="field"><label>Shipping (USD)</label><input id="bid-ship" type="text" placeholder="$ 0.00" oninput="calcTotal(${qty})" ${signed?'':'disabled'}></div>
        <div class="field"><label>Incoterms</label><select id="bid-inco" ${signed?'':'disabled'}><option>EXW</option><option>FOB Origin</option><option>DAP</option><option>DDP</option></select></div>
        <div class="field"><label>Total (× ${qty} + shipping)</label><input id="bid-total" type="text" value="—" readonly></div>
      </div>
      <div class="field"><label>Notes (optional)</label><textarea placeholder="Anything the engineer should know…" ${signed?'':'disabled'}></textarea></div>
      <div class="actions" style="justify-content:space-between">
        <button class="btn btn-ghost" onclick="declineBid('${o.id}')" ${signed?'':'disabled'}>Decline (no-bid)</button>
        <div style="display:flex;gap:10px;align-items:center"><span style="font-size:12.5px;color:var(--muted)">${o.bids} bids · amounts hidden</span><button class="btn btn-primary" onclick="submitBid('${o.id}')" ${signed?'':'disabled'}>${hasBid?'Revise bid':'Submit bid'}</button></div>
      </div>
    </div>`;
  go('opportunity');
}
function calcTotal(qty){
  const num = el => parseFloat((document.getElementById(el).value||'').replace(/[^0-9.]/g,''))||0;
  const t = num('bid-unit')*qty + num('bid-ship');
  document.getElementById('bid-total').value = t ? '$'+t.toLocaleString() : '—';
}
async function viewVault(id){ await act('viewVault',{oppId:id}); }
function declineBid(id){
  openModal(`<h3>Decline to bid (no-bid)</h3><div class="msub">Your reason helps the buyer plan — logged for them, never shown to competitors.</div>
    <div class="field"><label>Reason</label><select id="nb-reason"><option>Capacity — no open slot before need-by date</option><option>Outside our process capability</option><option>Material not available in time</option><option>Pricing not competitive for this work</option><option>Other</option></select></div>
    <div class="field"><label>Notes (optional)</label><textarea placeholder="Anything else the buyer should know"></textarea></div>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doDecline('${id}')">Submit no-bid</button></div>`);
}
async function doDecline(id){ const reason=document.getElementById('nb-reason').value; if(await act('declineBid',{rfqId:id, reason})){ closeModal(); go('opportunities'); } }
function signNDA(id){
  const o = OPPS.find(x=>x.id===id)||RFQS.find(x=>x.id===id);
  const kind = o.nda==='drawing' ? 'drawing-specific' : 'category-wide';
  openModal(`
    <h3>Sign NDA to view drawing</h3>
    <div class="msub">${o.customer||'Customer'} requires a ${kind} NDA before this drawing unlocks.</div>
    <div class="rcard" style="max-height:150px;overflow:auto;font-size:12px;color:var(--muted)">This Non-Disclosure Agreement covers all technical data, drawings, and specifications accessed through Forerun Exchange for ${o.customer||'the customer'}${o.nda==='drawing'?` — specifically part ${o.id}`:` in the ${CATS[o.cat]?.label} category`}. Confidential information may not be shared, reproduced, or used outside the scope of quoting and fulfilling this work…</div>
    <label style="margin-top:12px"><input type="checkbox" id="nda-ck" style="width:auto;margin-right:8px" onchange="document.getElementById('nda-go').disabled=!this.checked">I have read and agree on behalf of ${ME.company}.</label>
    <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="nda-go" disabled onclick="confirmNda('${o.id}')">Accept &amp; unlock</button></div>`);
}
async function confirmNda(id){ if(await act('signNda',{oppId:id})){ closeModal(); openOpp(id); } }
async function submitBid(id){
  const val = el => (document.getElementById(el)&&document.getElementById(el).value)||'';
  const num = s => parseFloat(String(s).replace(/[^0-9.]/g,''))||0;
  const body = { rfqId:id, unit:num(val('bid-unit')), ship:num(val('bid-ship')), incoterms:val('bid-inco')||'FOB Origin', lead:num(val('bid-lead')) };
  if(await act('submitBid', body)) go('mybids');
}
async function publishRFQ(){
  const t = document.querySelector('#view-createrfq input'); const pn = document.querySelectorAll('#view-createrfq input')[1];
  if(await act('publishRfq', { id:(pn&&pn.value)||undefined, title:(t&&t.value)||'New request' })) go('rfqs');
}

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

/* ---------------- orders & tracking ---------------- */
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
  if(!isBuyer) orders = orders.filter(o=>o.supplier===ME.company);
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
async function advanceOrder(id){ if(await act('advanceOrder',{orderId:id})) renderTracking(); }
function addTracking(id){
  openModal(`<h3>Add FedEx tracking</h3><div class="msub">Buyer sees a live link and delivery updates flow back automatically.</div>
   <div class="field"><label>FedEx tracking number</label><input id="trk" type="text" placeholder="e.g. 7712 3480 1123"></div>
   <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTracking('${id}')">Save &amp; ship</button></div>`);
}
async function saveTracking(id){ const v=document.getElementById('trk').value; if(await act('addTracking',{orderId:id, tracking:v})){ closeModal(); renderTracking(); } }
function reportDelay(id){
  openModal(`<h3>Report a delay</h3><div class="msub">The engineer and buyer are notified with your reason.</div>
   <div class="field"><label>New expected ship date</label><input type="text" placeholder="e.g. Jul 16"></div>
   <div class="field"><label>Reason</label><textarea id="dreason" placeholder="What happened?"></textarea></div>
   <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveDelay('${id}')">Notify buyer &amp; engineer</button></div>`);
}
async function saveDelay(id){ const reason=document.getElementById('dreason').value; if(await act('reportDelay',{orderId:id, reason})){ closeModal(); trackTab='delayed'; renderTracking(); } }

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
async function submitReview(id){ if(await act('reviewOrder',{orderId:id, rating:qrState.rating, escalate:qrState.escalate})){ closeModal(); renderTracking(); } }
function reorder(id){
  const o=ORDERS.find(x=>x.id===id);
  openModal(`<h3>Reorder — ${o.title}</h3><div class="msub">Repeat with the same supplier, or open a fresh RFQ for competitive bids.</div>
   <div class="choice">
     <div class="choicecard" onclick="doReorder('${id}','repeat')"><div class="ct"><i class="ti ti-repeat"></i> Repeat order</div><div class="cd">Same price &amp; supplier (${o.supplier}). Vendor is notified instantly.</div></div>
     <div class="choicecard" onclick="doReorder('${id}','requote')"><div class="ct"><i class="ti ti-file-plus"></i> Re-quote</div><div class="cd">Reopen as a new RFQ for better pricing from all qualified suppliers.</div></div>
   </div>
   <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button></div>`);
}
async function doReorder(id,mode){ closeModal(); if(await act('reorder',{orderId:id, mode})){ if(mode==='requote') go('rfqs'); else renderTracking(); } }

/* ---------------- messages / chat ---------------- */
let activeThread=1;
function threadCounterpart(t){ return role()==='supplier' ? (t.engineer) : (t.supplier); }
function openThreadFor(partId){ const t=THREADS.find(x=>x.part===partId); if(t){ activeThread=t.id; t.unread=0; } go('messages'); }
function renderMessages(){
  const t = THREADS.find(x=>x.id===activeThread)||THREADS[0];
  if(!t){ document.getElementById('messages-body').innerHTML='<div class="kempty">No conversations.</div>'; return; }
  t.unread=0; renderNav();
  const list = THREADS.map(th=>{
    const last=th.msgs[th.msgs.length-1];
    return `<div class="cli ${th.id===t.id?'on':''}" onclick="activeThread=${th.id};renderMessages()">
      <div class="cn">${threadCounterpart(th)} ${th.unread?'<span class="cdot"></span>':''}</div>
      <div class="cp">${th.partTitle} · ${th.part}${role()==='buyer'?' · '+th.company:''}</div>
      <div class="cprev">${last.text}</div></div>`;
  }).join('');
  const who = m => role()==='supplier' ? (m.from==='sup'?'me':'them') : (m.from==='sup'?'them':'me');
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
async function sendMsg(){
  const inp=document.getElementById('chat-in'); const v=(inp.value||'').trim(); if(!v) return;
  const addendum = role()==='buyer' && document.getElementById('post-addendum') && document.getElementById('post-addendum').checked;
  if(await act('postMessage',{threadId:activeThread, text:v, addendum})) renderMessages();
}

/* ---------------- supplier: company profile / onboarding (client-only form) ---------------- */
let onboardType=null; const onboardCats=new Set(['cnc']);
function renderCompany(){
  const catList = Object.keys(CATS).map(k=>`<div class="catopt ${onboardCats.has(k)?'on':''}" onclick="toggleOnboardCat('${k}')"><i class="ti ${CATS[k].icon}"></i>${CATS[k].label}</div>`).join('');
  document.getElementById('company-body').innerHTML = `
    <div class="banner info"><i class="ti ti-info-circle"></i><span>Complete your profile so buyers can qualify you. Everything here is supplier-provided; the Research Agent verifies it independently.</span></div>
    <div class="wizsteps"><span class="wizstep done">1 · Company</span><span class="wizstep on">2 · R&amp;D capacity</span><span class="wizstep">3 · Categories</span><span class="wizstep">4 · Certifications</span></div>
    <div class="panelcard">
      <div class="seclbl" style="margin-top:0">Company details</div>
      <div class="row2"><div class="field"><label>Company name</label><input type="text" value="${ME.company}"></div><div class="field"><label>Location</label><input type="text" value="San Jose, CA"></div></div>
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
  const cs=document.getElementById('cat-select'); if(cs) cs.innerHTML = Object.keys(CATS).map(k=>`<option>${CATS[k].label}</option>`).join('');
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
  if(!r){ toast('RFQ not found'); return; }
  if(r.awarded){ toast('Already awarded — see Tracking'); go('tracking'); return; }
  currentRFQ=r; BIDS=BIDSBYRFQ[id]||[]; selectedBid=null; splitMode=false; splitAlloc={};
  renderBidCompare(); go('bidcompare');
}
function renderBidRows(){
  const r=currentRFQ, qty=r.qty||12;
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
  const r=currentRFQ, qty=r.qty||12;
  const priceHead = canSeePrice()?'Total':'Total 🔒';
  const declined = DECLINED[r.id]||[];
  const splitTotal = Object.values(splitAlloc).reduce((a,b)=>a+(b||0),0);
  const canAward = ME.canAward;
  document.getElementById('bidcompare').innerHTML = `
    <span class="back" onclick="go('rfqs')"><i class="ti ti-arrow-left"></i> My RFQs</span>
    <div class="sec"><h3>${r.title} — bids</h3><span class="v">${r.bids} bids · ${declined.length} declined · qty ${qty}</span></div>
    ${persona()==='engineer'&&!SETTINGS.showPricingToEngineers?'<div class="banner"><i class="ti ti-eye-off"></i><span>Viewing as <b>engineer</b> — pricing hidden by admin and you cannot award.</span></div>':''}
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
      <button class="btn btn-primary" ${(r.open||!canAward)?'disabled':''} onclick="awardConfirm()">${canAward?'Award &amp; request sign-off':'Award (buyers only)'}</button></div>`;
}
function selectBid(name){ selectedBid=name; renderBidCompare(); }
function setSplit(name,v){ splitAlloc[name]=Math.max(0, parseInt(v)||0); }
function awardConfirm(){
  const r=currentRFQ, qty=r.qty||12;
  if(splitMode){
    const parts=Object.entries(splitAlloc).filter(([,q])=>q>0);
    if(!parts.length){ toast('Allocate quantity to at least one supplier'); return; }
    const total=parts.reduce((a,[,q])=>a+q,0);
    if(total!==qty){ toast(`Split must sum to ${qty} (currently ${total})`); return; }
    const rows=parts.map(([s,q])=>{const b=BIDS.find(x=>x.supplier===s); return `<div class="sumrow"><span>${s} · ${q} units</span><span class="sv">${money(b?b.unit*q:null)}</span></div>`;}).join('')+`<div class="sumrow"><span>Total qty</span><span class="sv">${qty}</span></div>`;
    openAwardModal(`Split award — ${r.title}`, rows, parts.map(p=>p[0]).filter(s=>supplierFlags(s).length));
    return;
  }
  if(!selectedBid){ toast('Select a supplier row to award'); return; }
  const b=BIDS.find(x=>x.supplier===selectedBid);
  const prices=BIDS.map(x=>x.price).filter(p=>p!=null); const lowest=prices.length?Math.min(...prices):null;
  const delta=(b&&b.price!=null&&lowest!=null)?b.price-lowest:null;
  const rows=`
    <div class="sumrow"><span>Supplier</span><span class="sv">${b.supplier} · ★ ${b.score}</span></div>
    <div class="sumrow"><span>Unit price × ${qty}</span><span class="sv">${money(b.unit)} × ${qty}</span></div>
    <div class="sumrow"><span>Shipping (${b.incoterms})</span><span class="sv">${money(b.ship)}</span></div>
    <div class="sumrow"><span>Total</span><span class="sv">${money(b.price)}</span></div>
    <div class="sumrow"><span>Lead time</span><span class="sv">${b.lead} days</span></div>
    <div class="sumrow"><span>vs. lowest bid</span><span class="sv" style="color:${delta>0?'var(--warn)':'var(--good)'}">${delta==null?'—':(delta>0?'+'+money(delta):'lowest bid')}</span></div>`;
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
async function doAward(){
  const ack = !!(document.getElementById('ackflags') && document.getElementById('ackflags').checked);
  const body = splitMode
    ? { rfqId:currentRFQ.id, mode:'split', alloc:splitAlloc, ackFlags:ack }
    : { rfqId:currentRFQ.id, mode:'single', supplier:selectedBid, ackFlags:ack };
  if(await act('award', body)){ closeModal(); renderRFQs(); go('rfqs'); }
}
function exportBids(){
  const r=currentRFQ, rows=[['Supplier','Unit','Qty','Shipping','Incoterms','Total','Lead(days)','Score']];
  BIDS.forEach(b=>rows.push([b.supplier,b.unit,(r.qty||12),b.ship,b.incoterms,b.price,b.lead,b.score]));
  (DECLINED[r.id]||[]).forEach(d=>rows.push([d.supplier,'no-bid','','','','','',d.reason]));
  downloadCSV(`${r.id}-bids.csv`, rows); toast('Bid tabulation exported (CSV)');
}
function downloadCSV(name, rows){
  const csv=rows.map(r=>r.map(c=>`"${String(c==null?'':c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download=name; document.body.appendChild(a); a.click(); a.remove();
}
async function duplicateRFQ(id){ if(await act('duplicateRfq',{rfqId:id})) go('createrfq'); }
async function acceptBid(name){ if(await act('award',{rfqId:currentRFQ.id, mode:'single', supplier:name, ackFlags:true})) go('tracking'); }

/* ---------------- supplier profile (buyer diligence) ---------------- */
let profileReturn = 'bidcompare';
function openSupplier(name, ret){
  profileReturn = ret || 'bidcompare';
  const pr = PROFILES[name]; if(!pr){ toast('No profile available'); return; }
  const p = pr.provided, r = pr.research;
  const bid = BIDS.find(b=>b.supplier===name) || null;
  const chips = a => a.map(c=>`<span class="chip2">${c}</span>`).join('');
  const findings = r.findings.map(f=>{const s=STAT[f.status]; return `<div class="find"><i class="ti ${s[2]} fi" style="color:${s[3]}"></i><div><div class="fk">${f.key}<span class="stat ${s[1]}">${s[0]}</span></div><div class="fd">${f.detail}</div>${f.source?`<div class="fsrc">Source: ${f.source}</div>`:''}</div></div>`;}).join('');
  const flags = r.flags.map(f=>`<div class="flagbox"><i class="ti ti-alert-triangle" style="flex-shrink:0;margin-top:1px"></i><span>${f}</span></div>`).join('');
  const certStat = r.findings[0].status==='verified' ? '<span style="color:var(--good)">Verified</span>' : (r.findings[0].status==='flag' ? '<span style="color:var(--danger)">Lapsed</span>' : 'Check');
  const showBid = bid && canSeePrice() && bid.price!=null;
  document.getElementById('supplier-profile').innerHTML = `
    <span class="back" onclick="go('${profileReturn}')"><i class="ti ti-arrow-left"></i> Back</span>
    <div class="phead"><span class="pav">${initials(name)}</span><div><div class="pname">${name}</div><div class="pmeta">${pr.cats.map(c=>tag(c)).join(' ')}<span class="pill st-good">Qualified</span><span>★ ${pr.score}</span><span class="mono">${pr.id}</span></div></div></div>
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
          ${showBid&&ME.canAward?`<button class="btn btn-primary" style="width:100%;margin-bottom:8px" onclick="acceptBid('${name}')">Accept this bid</button>`:''}
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
  const rows = USERS.map(u=>`<tr><td><div style="font-weight:500">${u.name}</div><div style="font-size:11.5px;color:var(--faint)">${u.email}</div></td>
    <td><select onchange="changeUserRole('${u.email}',this.value)" style="padding:5px 8px;font-size:12px;max-width:120px">${['Admin','Buyer','Engineer'].map(r=>`<option ${u.role===r?'selected':''}>${r}</option>`).join('')}</select></td>
    <td>${u.group}</td><td><span class="pill ${u.status==='Active'?'st-good':'st-warn'}">${u.status}</span></td></tr>`).join('');
  document.getElementById('admin-body').innerHTML = `
    <div class="sec"><h3>Users &amp; roles</h3><span class="v"><button class="btn btn-primary btn-sm" onclick="addUser()">+ Invite user</button></span></div>
    <div class="list" style="padding:0"><table><thead><tr><th>User</th><th>Role</th><th>Group</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="sec" style="margin-top:20px"><h3>Groups</h3><span class="v">buyers &amp; engineers are scoped to a group</span></div>
    <div class="chips" style="margin-bottom:18px">${GROUPS.map(g=>`<span class="chip2">${g}</span>`).join('')}<span class="chip2 link" onclick="toast('Group added')">+ Add group</span></div>
    <div class="sec"><h3>Access settings</h3></div>
    <div class="panelcard" style="padding:6px 18px">
      <div class="setrow"><div><div style="font-weight:500;font-size:13.5px">Show pricing to engineers</div><div style="font-size:12px;color:var(--muted)">When off, engineers see lead time &amp; scorecards but bid prices are masked (enforced server-side).</div></div><button class="toggle ${SETTINGS.showPricingToEngineers?'on':''}" onclick="toggleSetting()"></button></div>
      <div class="setrow"><div><div style="font-weight:500;font-size:13.5px">Buyers can see each other's RFQs</div><div style="font-size:12px;color:var(--muted)">Open forum within the company (recommended).</div></div><button class="toggle on" onclick="toast('Kept on — open forum')"></button></div>
      <div class="setrow"><div><div style="font-weight:500;font-size:13.5px">Seed suppliers from SAP</div><div style="font-size:12px;color:var(--muted)">Import the existing qualified-supplier list on first setup.</div></div><button class="btn btn-sm" onclick="toast('Imported 128 suppliers from SAP')">Import</button></div>
    </div>`;
}
async function toggleSetting(){ if(await act('updateSettings',{key:'showPricingToEngineers', value:!SETTINGS.showPricingToEngineers})) renderAdmin(); }
async function changeUserRole(email, role){ await act('updateUserRole',{email, role}); renderAdmin(); }
function addUser(){
  openModal(`<h3>Invite user</h3><div class="msub">They'll get an email invite to join ${ME.company}.</div>
   <div class="field"><label>Name</label><input id="u-name" type="text" placeholder="Full name"></div>
   <div class="field"><label>Email</label><input id="u-email" type="text" placeholder="name@northvale.com"></div>
   <div class="row2"><div class="field"><label>Role</label><select id="u-role"><option>Buyer</option><option>Engineer</option><option>Admin</option></select></div>
   <div class="field"><label>Group</label><select id="u-group">${GROUPS.map(g=>`<option>${g}</option>`).join('')}</select></div></div>
   <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveUser()">Send invite</button></div>`);
}
async function saveUser(){ const g=id=>document.getElementById(id).value;
  if(await act('addUser',{name:g('u-name'), email:g('u-email'), role:g('u-role'), group:g('u-group')})){ closeModal(); renderAdmin(); } }

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
    <div class="banner info"><i class="ti ti-lock"></i><span>Every drawing view, bid, NDA, addendum and award is recorded server-side — timestamped, attributable, and exportable for procurement compliance.</span></div>
    <div class="list" style="padding:0"><table><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>RFQ / part</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function exportAudit(){ const rows=[['When','Action','Actor','Target','Kind']]; AUDIT.forEach(a=>rows.push([a.t,a.action,a.actor,a.target,a.kind])); downloadCSV('forerun-audit.csv', rows); toast('Audit trail exported (CSV)'); }

/* ---------------- init / boot ---------------- */
function renderLists(){ renderOppFilters(); renderOpps(); renderKanban(); renderRFQs(); renderSuppliers(); renderSuppFeedback(); }
async function boot(){
  let d;
  try{
    const r=await fetch('/api/state');
    if(r.status===401){ showLogin(); return; }
    d=await r.json();
  }catch(e){ showLogin('Could not reach the server'); return; }
  applyState(d.state);
  document.getElementById('app').style.display='';
  initUIFromMe(); renderNav(); renderLists(); updatePersonaLabel(); updateBell();
  go(role()==='supplier'?'opportunities':'rfqs');
}
boot();
