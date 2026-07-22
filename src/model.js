'use strict';
/*
 * Domain model + business logic (multi-tenant, role-driven).
 * Roles:
 *   supplier  — bid/decline/NDA on opportunities in their categories; manage own orders & company profile
 *   engineer  — create RFQs, answer questions/addenda, tracking; prices masked (per company setting); cannot award
 *   buyer     — everything an engineer can + see prices, close windows, award, quality reviews, reorder
 *   admin     — everything a buyer can + user/role/group management and settings
 * Every operation validates authorization server-side; the UI only mirrors it.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { seed } = require('./seed');

let state = null;
const sessions = new Map(); // token -> userId

function err(status, message) { const e = new Error(message); e.status = status; return e; }
const now = () => Date.now();

async function init() {
  await db.init();
  state = await db.load();
  if (!state || !state.__seeded || state.version !== 3) { state = seed(); await db.save(state); }
  console.log(`[model] state ready (${db.kind}) — companies: ${state.companies.length}, users: ${state.users.length}`);
}
async function persist() { await db.save(state); }

/* ---------------- lookups ---------------- */
const company = id => state.companies.find(c => c.id === id);
const userById = id => state.users.find(u => u.id === id);
const userByEmail = e => state.users.find(u => u.email.toLowerCase() === String(e || '').toLowerCase().trim());
const rfqById = id => state.rfqs.find(r => r.id === id);
const orderById = id => state.orders.find(o => o.id === id);
const supProfile = cid => state.supplierProfiles[cid];
const supName = cid => (company(cid) || {}).name || 'Unknown';

/* ---------------- roles & permissions ---------------- */
const isSupplier = u => u.persona === 'supplier';
const isBuyerSide = u => !isSupplier(u);
const isAdmin = u => u.persona === 'admin';
const canAward = u => u.persona === 'buyer' || u.persona === 'admin';
function companySettings(cid) { return state.settingsByCompany[cid] || (state.settingsByCompany[cid] = { showPricingToEngineers: false }); }
const canSeePrice = u => isSupplier(u) || u.persona !== 'engineer' || !!companySettings(u.companyId).showPricingToEngineers;
function requireSupplier(u) { if (!isSupplier(u)) throw err(403, 'Suppliers only'); }
function requireBuyerSide(u) { if (!isBuyerSide(u)) throw err(403, 'Buyer-side only'); }
function requireAward(u) { if (!canAward(u)) throw err(403, 'Only a buyer or admin can do this (engineers cannot).'); }
function requireAdmin(u) { if (!isAdmin(u)) throw err(403, 'Admins only'); }

function actorName(u) {
  if (isSupplier(u)) return supName(u.companyId);
  return `${u.name} (${u.persona.charAt(0).toUpperCase() + u.persona.slice(1)})`;
}
function audit(u, action, target, kind, extraCompanyIds) {
  const ids = new Set([u.companyId, ...(extraCompanyIds || [])]);
  state.audit.unshift({ t: stamp(), companyIds: [...ids], actor: actorName(u), action, target: target || '', kind: kind || 'evt' });
}
function notify(companyId, role, icon, text, link) {
  state.notifications.unshift({ id: ++state.seq, companyId, role: role || null, icon, text, when: 'just now', unread: true, link: link || null });
}
function stamp() { const d = new Date(); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); }
function supplierFlags(cid) { const sp = supProfile(cid); const p = sp && state.profiles[sp.profileName]; return p ? p.research.flags : []; }

/* ---------------- time / window helpers ---------------- */
function humanize(ms) {
  if (ms <= 0) return 'closed';
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ${h % 24}h`;
  if (h >= 1) return `${h}h ${m % 60}m`;
  return `${m}m`;
}
const windowOpen = r => r.status === 'open' && r.closesAt > now();
function rfqBids(id) { return state.bids.filter(b => b.rfqId === id); }
function bidPrice(b, r) { return b.unit * r.qty + (b.ship || 0); }

/* ---------------- scorecard (computed) ---------------- */
function supplierScore(cid) {
  const sp = supProfile(cid); if (!sp) return { score: null, jobs: 0, ontime: null };
  const revs = state.reviews.filter(v => v.supplierCompanyId === cid);
  const jobs = sp.baseJobs + revs.length;
  const sum = (sp.baseScore || 0) * sp.baseJobs + revs.reduce((a, v) => a + v.rating, 0);
  const score = jobs ? Math.round((sum / jobs) * 10) / 10 : null;
  return { score, jobs, ontime: sp.ontime };
}

/* ---------------- auth & registration ---------------- */
function login(email, password) {
  const u = userByEmail(email);
  if (!u || !bcrypt.compareSync(String(password || ''), u.passHash)) throw err(401, 'Invalid email or password');
  if (u.status === 'Invited') u.status = 'Active';
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, u.id);
  return { token, user: u };
}
function logout(token) { sessions.delete(token); }
function userForToken(token) { const id = sessions.get(token); return id ? userById(id) : null; }

async function registerBuyer({ companyName, name, email, password }) {
  if (!companyName || !name || !email || !password) throw err(400, 'All fields are required');
  if (String(password).length < 8) throw err(400, 'Password must be at least 8 characters');
  if (userByEmail(email)) throw err(409, 'An account with this email already exists');
  const cid = 'c_' + (++state.seq);
  state.companies.push({ id: cid, name: companyName.trim(), type: 'buyer' });
  const u = { id: 'u_' + (++state.seq), email: email.trim(), passHash: bcrypt.hashSync(password, 10), name: name.trim(), companyId: cid, persona: 'admin', group: 'Supply Chain', status: 'Active' };
  state.users.push(u);
  state.groupsByCompany[cid] = ['Supply Chain'];
  state.settingsByCompany[cid] = { showPricingToEngineers: false };
  state.audit.unshift({ t: stamp(), companyIds: [cid], actor: `${u.name} (Admin)`, action: 'Created buyer workspace ' + companyName, target: '', kind: 'evt' });
  await persist();
  return u;
}

async function registerSupplier({ companyName, name, email, password, cats, rnd, about, location }) {
  if (!companyName || !name || !email || !password) throw err(400, 'All fields are required');
  if (String(password).length < 8) throw err(400, 'Password must be at least 8 characters');
  if (userByEmail(email)) throw err(409, 'An account with this email already exists');
  const catList = Array.isArray(cats) && cats.length ? cats : ['cnc'];
  const cid = 'c_' + (++state.seq);
  state.companies.push({ id: cid, name: companyName.trim(), type: 'supplier' });
  const u = { id: 'u_' + (++state.seq), email: email.trim(), passHash: bcrypt.hashSync(password, 10), name: name.trim(), companyId: cid, persona: 'supplier', group: '', status: 'Active' };
  state.users.push(u);
  state.supplierProfiles[cid] = { cats: catList, rnd: rnd !== false, baseScore: 0, baseJobs: 0, ontime: null, profileName: companyName.trim() };
  state.profiles[companyName.trim()] = {
    id: 'SUP-' + (1000 + state.seq), cats: catList, score: null,
    provided: { about: about || 'Newly registered supplier.', founded: '—', location: location || '—', employees: '—', leadtime: '—', capacity: '—', capabilities: [], materials: [], certs: [] },
    research: { confidence: 30, summary: 'Newly registered supplier — Research Agent verification is in progress. Certifications, financials and screening have not been independently confirmed yet.',
      findings: [
        { key: 'Certifications', status: 'unverified', detail: 'Claimed certifications not yet confirmed with registrar.', source: 'pending' },
        { key: 'Denied-party screening', status: 'unverified', detail: 'Screening queued.', source: 'pending' },
        { key: 'Delivery performance', status: 'unverified', detail: 'No platform history yet.', source: 'Forerun history' }
      ], flags: ['Newly registered — verification pending. Confirm diligence before sharing controlled drawings.'] }
  };
  state.audit.unshift({ t: stamp(), companyIds: [cid], actor: companyName.trim(), action: 'Registered as supplier', target: '', kind: 'evt' });
  await persist();
  return u;
}

/* ---------------- projections (viewer-scoped state) ---------------- */
function me(u) {
  return { id: u.id, email: u.email, name: u.name, company: supName(u.companyId), companyId: u.companyId,
           role: isSupplier(u) ? 'supplier' : 'buyer', persona: u.persona,
           canSeePrice: canSeePrice(u), canAward: canAward(u), isAdmin: isAdmin(u), canCreateRfq: isBuyerSide(u) };
}

function bidView(b, r, see) {
  const price = bidPrice(b, r);
  const sc = supplierScore(b.supplierCompanyId);
  return { supplier: supName(b.supplierCompanyId), supplierCompanyId: b.supplierCompanyId,
    unit: see ? b.unit : null, ship: see ? b.ship : null, price: see ? price : null, masked: !see,
    incoterms: b.incoterms, lead: b.lead, revised: !!b.revised, score: sc.score, notes: b.notes || '' };
}

function rfqStatus(r) {
  if (r.status === 'draft') return ['Draft', 'st-muted'];
  if (r.status === 'awarded') return ['Awarded', 'st-win'];
  if (windowOpen(r)) return ['Open', 'st-good'];
  return ['Closed · review bids', 'st-warn'];
}

function supplierBidStage(u, r, myBid) {
  if (r.status === 'awarded') {
    const won = state.orders.some(o => o.rfqId === r.id && o.supplierCompanyId === u.companyId);
    return won ? { stage: 'won', status: ['Won', 'st-win'] } : { stage: 'lost', status: ['Lost', 'st-danger'] };
  }
  if (!windowOpen(r)) return { stage: 'review', status: ['In review', 'st-info'] };
  const all = rfqBids(r.id);
  if (all.length > 1) {
    const lowest = Math.min(...all.map(b => bidPrice(b, r)));
    return bidPrice(myBid, r) <= lowest
      ? { stage: 'active', status: ['Leading', 'st-good'] }
      : { stage: 'active', status: ['Outbid', 'st-warn'] };
  }
  return { stage: 'active', status: ['Submitted', 'st-muted'] };
}

function viewerState(u) {
  const see = canSeePrice(u);
  const base = { me: me(u), settings: companySettings(isSupplier(u) ? u.companyId : u.companyId), profiles: state.profiles };

  if (isSupplier(u)) {
    const sp = supProfile(u.companyId) || { cats: [] };
    const opps = state.rfqs
      .filter(r => r.status === 'open' && windowOpen(r) && sp.cats.includes(r.cat))
      .map(r => {
        const mine = rfqBids(r.id).find(b => b.supplierCompanyId === u.companyId);
        return { id: r.id, title: r.title, cat: r.cat, qty: r.qty, closes: humanize(r.closesAt - now()),
          soon: r.closesAt - now() < 24 * 3600e3, customer: supName(r.buyerCompanyId), reqs: r.reqs, nda: r.nda,
          bids: rfqBids(r.id).length, hasMyBid: !!mine,
          myBid: mine ? { unit: mine.unit, ship: mine.ship, incoterms: mine.incoterms, lead: mine.lead, notes: mine.notes || '' } : null };
      });
    const mybids = state.bids.filter(b => b.supplierCompanyId === u.companyId).map(b => {
      const r = rfqById(b.rfqId); if (!r) return null;
      const st = supplierBidStage(u, r, b);
      // won cards show the awarded order total (what was actually won), not the last bid amount
      let price = bidPrice(b, r);
      if (st.stage === 'won') {
        const won = state.orders.filter(o => o.rfqId === r.id && o.supplierCompanyId === u.companyId);
        if (won.length) price = won.reduce((a, o) => a + (o.price || 0), 0);
      }
      return { id: r.id, title: r.title, cat: r.cat, price, lead: b.lead, stage: st.stage, status: st.status };
    }).filter(Boolean);
    const orders = state.orders.filter(o => o.supplierCompanyId === u.companyId)
      .map(o => ({ ...o, buyerName: o.buyer, customer: supName(o.buyerCompanyId) }));
    const threads = state.threads.filter(t => t.supplierCompanyId === u.companyId)
      .map(t => threadView(t, u));
    const sc = supplierScore(u.companyId);
    // open RFQs hidden because the supplier is not qualified in that category
    const outsideByCat = {};
    state.rfqs.filter(r => r.status === 'open' && windowOpen(r) && !sp.cats.includes(r.cat))
      .forEach(r => { outsideByCat[r.cat] = (outsideByCat[r.cat] || 0) + 1; });
    return { ...base,
      opps, mybids, orders, threads, qualifiedCats: sp.cats, outsideByCat,
      saved: state.savedByUser[u.id] || [],
      ndaSigned: state.ndas.filter(n => n.supplierCompanyId === u.companyId).map(n => n.rfqId),
      addenda: pickAddenda(opps.map(o => o.id)),
      scorecard: { ...sc, feedback: state.reviews.filter(v => v.supplierCompanyId === u.companyId).map(v => ({ part: v.part || v.orderId, title: v.title, rating: v.rating, note: v.note })) },
      companyProfile: { name: supName(u.companyId), cats: sp.cats, rnd: sp.rnd, ...( (state.profiles[sp.profileName]||{}).provided || {} ) },
      notifs: myNotifs(u), audit: myAudit(u),
      rfqs: [], bidsByRfq: {}, declined: {}, sups: [], users: [], groups: [] };
  }

  /* buyer-side */
  const myRfqs = state.rfqs.filter(r => r.buyerCompanyId === u.companyId);
  const rfqs = myRfqs.map(r => ({ id: r.id, title: r.title, cat: r.cat, qty: r.qty, product: r.product,
    status: rfqStatus(r), bids: rfqBids(r.id).length, closes: r.status === 'awarded' ? 'awarded' : (windowOpen(r) ? humanize(r.closesAt - now()) : 'closed'),
    open: windowOpen(r), awarded: r.status === 'awarded', draft: r.status === 'draft', autoExtend: r.autoExtend, engineer: r.engineer }));
  const bidsByRfq = {};
  myRfqs.forEach(r => { bidsByRfq[r.id] = rfqBids(r.id).map(b => bidView(b, r, see)); });
  const declined = {};
  state.declines.forEach(d => { const r = rfqById(d.rfqId); if (r && r.buyerCompanyId === u.companyId) (declined[d.rfqId] = declined[d.rfqId] || []).push({ supplier: d.supplierName || supName(d.supplierCompanyId), reason: d.reason }); });
  const sups = Object.keys(state.supplierProfiles).map(cid => {
    const sp = state.supplierProfiles[cid]; const sc = supplierScore(cid);
    return { name: supName(cid), companyId: cid, cats: sp.cats, rnd: sp.rnd, score: sc.score, jobs: sc.jobs, ontime: sc.ontime };
  });
  const orders = state.orders.filter(o => o.buyerCompanyId === u.companyId)
    .map(o => ({ ...o, price: see ? o.price : null, supplier: supName(o.supplierCompanyId) }));
  const threads = state.threads.filter(t => t.buyerCompanyId === u.companyId).map(t => threadView(t, u));
  return { ...base,
    rfqs, bidsByRfq, declined, sups, orders, threads,
    addenda: pickAddenda(myRfqs.map(r => r.id)),
    users: state.users.filter(x => x.companyId === u.companyId).map(x => ({ name: x.name, email: x.email, role: x.persona.charAt(0).toUpperCase() + x.persona.slice(1), group: x.group, status: x.status })),
    groups: state.groupsByCompany[u.companyId] || [],
    notifs: myNotifs(u), audit: myAudit(u),
    opps: [], mybids: [], saved: [], ndaSigned: [], scorecard: null, companyProfile: null };
}
function pickAddenda(ids) { const out = {}; ids.forEach(id => { if (state.addenda[id]) out[id] = state.addenda[id]; }); return out; }
function threadView(t, u) {
  const r = rfqById(t.rfqId);
  return { id: t.id, part: t.rfqId, partTitle: r ? r.title : t.rfqId, supplier: supName(t.supplierCompanyId),
    engineer: r ? (r.engineer + ' (Engineer)') : 'Engineer', buyer: r ? 'Buyer team' : '', company: r ? supName(r.buyerCompanyId) : '',
    unread: (isSupplier(u) ? t.unreadFor === 'supplier' : t.unreadFor === 'buyer') ? 1 : 0, msgs: t.msgs };
}
function myNotifs(u) { return state.notifications.filter(n => n.companyId === u.companyId && (!n.role || n.role === u.persona || isAdmin(u))); }
function myAudit(u) { return state.audit.filter(a => a.companyIds.includes(u.companyId)); }

/* ---------------- operations ---------------- */
const ops = {};

/* ----- supplier ops ----- */
ops.toggleSave = async (u, { oppId }) => {
  requireSupplier(u);
  const arr = state.savedByUser[u.id] = state.savedByUser[u.id] || [];
  const i = arr.indexOf(oppId);
  if (i >= 0) arr.splice(i, 1); else arr.push(oppId);
  await persist();
  return { msg: i >= 0 ? 'Removed from saved' : 'Saved to your pipeline' };
};

ops.viewVault = async (u, { oppId }) => {
  const r = rfqById(oppId);
  audit(u, 'Viewed drawing in vault', oppId, 'view', r ? [r.buyerCompanyId] : []);
  await persist();
  return { msg: 'Opening vault link · access logged' };
};

ops.signNda = async (u, { oppId }) => {
  requireSupplier(u);
  const r = rfqById(oppId); if (!r) throw err(404, 'RFQ not found');
  if (!state.ndas.some(n => n.rfqId === oppId && n.supplierCompanyId === u.companyId)) {
    state.ndas.push({ rfqId: oppId, supplierCompanyId: u.companyId, by: u.name, at: stamp() });
  }
  audit(u, 'Signed NDA', oppId, 'nda', [r.buyerCompanyId]);
  await persist();
  return { msg: 'NDA signed · drawing unlocked' };
};

ops.submitBid = async (u, { rfqId, unit, ship, incoterms, lead, notes }) => {
  requireSupplier(u);
  const r = rfqById(rfqId); if (!r) throw err(404, 'RFQ not found');
  if (!windowOpen(r)) throw err(400, 'Bid window is closed');
  const sp = supProfile(u.companyId);
  if (!sp || !sp.cats.includes(r.cat)) throw err(403, 'Your company is not qualified in this category');
  if (r.nda !== 'none' && !state.ndas.some(n => n.rfqId === rfqId && n.supplierCompanyId === u.companyId)) throw err(403, 'Sign the NDA before bidding');
  const un = Number(unit), ld = Number(lead);
  if (!(un > 0)) throw err(400, 'Unit price is required');
  if (!(ld > 0)) throw err(400, 'Lead time is required');
  let bid = state.bids.find(b => b.rfqId === rfqId && b.supplierCompanyId === u.companyId);
  const revise = !!bid;
  if (bid) Object.assign(bid, { unit: un, ship: Number(ship) || 0, incoterms: incoterms || bid.incoterms, lead: ld, notes: notes || '', revised: true, at: now() });
  else state.bids.push({ id: 'b_' + (++state.seq), rfqId, supplierCompanyId: u.companyId, unit: un, ship: Number(ship) || 0, incoterms: incoterms || 'FOB Origin', lead: ld, notes: notes || '', revised: false, at: now() });
  // anti-sniping: a bid in the final 10 minutes auto-extends the window
  let extended = false;
  if (r.autoExtend && r.closesAt - now() < 10 * 60e3) { r.closesAt = now() + 10 * 60e3; extended = true; }
  audit(u, (revise ? 'Revised bid' : 'Submitted bid') + (extended ? ' · window auto-extended 10m' : ''), rfqId, 'bid', [r.buyerCompanyId]);
  notify(r.buyerCompanyId, null, 'ti-gavel', `${revise ? 'Revised' : 'New'} bid on ${r.title} (${rfqId}) from ${supName(u.companyId)}`, { view: 'rfq', arg: rfqId });
  await persist();
  return { msg: (revise ? 'Bid revised — buyer notified' : 'Bid submitted — now in review') + (extended ? ' · anti-snipe extended the window 10 min' : '') };
};

ops.declineBid = async (u, { rfqId, reason }) => {
  requireSupplier(u);
  const r = rfqById(rfqId); if (!r) throw err(404, 'RFQ not found');
  state.declines.push({ rfqId, supplierCompanyId: u.companyId, supplierName: supName(u.companyId), reason: reason || 'No-bid' });
  audit(u, 'Declined (no-bid): ' + (reason || ''), rfqId, 'decline', [r.buyerCompanyId]);
  notify(r.buyerCompanyId, null, 'ti-ban', `${supName(u.companyId)} declined ${rfqId}: ${reason || 'no-bid'}`, { view: 'rfq', arg: rfqId });
  await persist();
  return { msg: 'No-bid recorded — buyer notified' };
};

ops.updateCompanyProfile = async (u, body) => {
  requireSupplier(u);
  const sp = supProfile(u.companyId); if (!sp) throw err(404, 'No supplier profile');
  if (Array.isArray(body.cats) && body.cats.length) sp.cats = body.cats;
  if (typeof body.rnd === 'boolean') sp.rnd = body.rnd;
  const prof = state.profiles[sp.profileName];
  if (prof) {
    const p = prof.provided;
    ['about', 'location', 'founded', 'employees', 'leadtime', 'capacity'].forEach(k => { if (body[k] !== undefined && body[k] !== '') p[k] = body[k]; });
    if (Array.isArray(body.certs)) p.certs = body.certs;
    prof.cats = sp.cats;
  }
  audit(u, 'Updated company profile', '', 'evt');
  await persist();
  return { msg: 'Profile saved — submitted for verification' };
};

/* ----- shared chat ----- */
ops.openThread = async (u, { rfqId }) => {
  const r = rfqById(rfqId); if (!r) throw err(404, 'RFQ not found');
  let t;
  if (isSupplier(u)) t = state.threads.find(x => x.rfqId === rfqId && x.supplierCompanyId === u.companyId);
  else t = state.threads.find(x => x.rfqId === rfqId && x.buyerCompanyId === u.companyId);
  if (!t && isSupplier(u)) {
    t = { id: ++state.seq, rfqId, buyerCompanyId: r.buyerCompanyId, supplierCompanyId: u.companyId, unreadFor: null, msgs: [] };
    state.threads.push(t);
  }
  if (!t) throw err(404, 'No conversation yet for this RFQ');
  return { threadId: t.id };
};

ops.postMessage = async (u, { threadId, text, addendum }) => {
  const t = state.threads.find(x => x.id === threadId);
  if (!t) throw err(404, 'Thread not found');
  const mine = isSupplier(u) ? t.supplierCompanyId === u.companyId : t.buyerCompanyId === u.companyId;
  if (!mine) throw err(403, 'Not your conversation');
  if (!text || !String(text).trim()) throw err(400, 'Message is empty');
  const from = isSupplier(u) ? 'sup' : (u.persona === 'engineer' ? 'eng' : 'buy');
  t.msgs.push({ from, name: u.name, text: String(text).trim(), t: 'now' });
  t.unreadFor = isSupplier(u) ? 'buyer' : 'supplier';
  const r = rfqById(t.rfqId);
  if (addendum && isBuyerSide(u)) {
    const lastQ = [...t.msgs].reverse().find(m => m.from === 'sup');
    const bidders = rfqBids(t.rfqId).length || 1;
    (state.addenda[t.rfqId] = state.addenda[t.rfqId] || []).push({ q: lastQ ? lastQ.text : '(buyer clarification)', a: String(text).trim(), at: actorName(u), bidders });
    t.msgs.push({ from: 'sys', text: `Posted as an addendum to ${bidders === 1 ? 'the 1 bidder' : 'all ' + bidders + ' bidders'} on ${t.rfqId}` });
    rfqBids(t.rfqId).forEach(b => notify(b.supplierCompanyId, null, 'ti-speakerphone', `Addendum posted on ${r ? r.title : t.rfqId} (${t.rfqId})`, { view: 'opp', arg: t.rfqId }));
    audit(u, `Posted addendum to ${bidders} bidders`, t.rfqId, 'addendum');
    await persist();
    return { msg: 'Answer posted as an addendum to all bidders' };
  }
  if (isSupplier(u)) notify(t.buyerCompanyId, null, 'ti-message-2', `${supName(u.companyId)} asked a question on ${r ? r.title : t.rfqId}`, { view: 'thread', arg: t.rfqId });
  else notify(t.supplierCompanyId, null, 'ti-message-2', `Reply from ${actorName(u)} on ${r ? r.title : t.rfqId}`, { view: 'thread', arg: t.rfqId });
  await persist();
  return { msg: 'Message sent · notification pushed' };
};

/* ----- buyer-side: RFQ lifecycle ----- */
ops.createRfq = async (u, body) => {
  requireBuyerSide(u);
  const id = String(body.partNumber || '').trim() || 'RFQ-' + (++state.seq);
  if (rfqById(id)) throw err(409, `Part number ${id} already has an RFQ`);
  if (!body.title || !String(body.title).trim()) throw err(400, 'Title is required');
  const qty = Number(body.qty); if (!(qty > 0)) throw err(400, 'Quantity must be a positive number');
  const windowDays = Number(body.windowDays) || 3;
  const r = { id, buyerCompanyId: u.companyId, title: String(body.title).trim(), cat: body.cat || 'cnc', qty,
    product: body.product || 'General', costCenter: body.costCenter || '', reqs: body.reqs || '',
    vaultLink: body.vaultLink || '', nda: ['category', 'drawing', 'none'].includes(body.nda) ? body.nda : 'category',
    autoExtend: body.autoExtend !== false, status: body.draft ? 'draft' : 'open',
    closesAt: now() + windowDays * 24 * 3600e3, createdBy: u.id, engineer: body.engineer || u.name, createdAt: now() };
  state.rfqs.unshift(r);
  audit(u, body.draft ? 'Saved RFQ draft' : 'Published RFQ', id, 'rfq');
  if (!body.draft) notifySuppliersOfRfq(r);
  await persist();
  return { msg: body.draft ? 'Draft saved' : 'RFQ published to qualified suppliers in ' + r.cat, rfqId: id };
};
function notifySuppliersOfRfq(r) {
  Object.keys(state.supplierProfiles).forEach(cid => {
    const sp = state.supplierProfiles[cid];
    if (sp.cats.includes(r.cat) && sp.rnd !== false) {
      notify(cid, null, 'ti-file-text', `New opportunity: ${r.title} (${r.id}) — ${supName(r.buyerCompanyId)}`, { view: 'opp', arg: r.id });
    }
  });
}
ops.publishDraft = async (u, { rfqId, windowDays }) => {
  requireBuyerSide(u);
  const r = rfqById(rfqId); if (!r || r.buyerCompanyId !== u.companyId) throw err(404, 'RFQ not found');
  if (r.status !== 'draft') throw err(400, 'Not a draft');
  r.status = 'open'; r.closesAt = now() + (Number(windowDays) || 3) * 24 * 3600e3;
  audit(u, 'Published RFQ', rfqId, 'rfq');
  notifySuppliersOfRfq(r);
  await persist();
  return { msg: 'RFQ published to qualified suppliers' };
};
ops.closeWindow = async (u, { rfqId }) => {
  requireAward(u);
  const r = rfqById(rfqId); if (!r || r.buyerCompanyId !== u.companyId) throw err(404, 'RFQ not found');
  if (!windowOpen(r)) throw err(400, 'Window already closed');
  r.closesAt = now();
  audit(u, 'Closed bid window early', rfqId, 'rfq');
  rfqBids(rfqId).forEach(b => notify(b.supplierCompanyId, null, 'ti-clock', `Bid window closed on ${r.title} (${rfqId}) — bids in review`, { view: 'mybids' }));
  await persist();
  return { msg: 'Bid window closed — bids now in review' };
};
ops.duplicateRfq = async (u, { rfqId }) => {
  requireBuyerSide(u);
  const r = rfqById(rfqId); if (!r || r.buyerCompanyId !== u.companyId) throw err(404, 'RFQ not found');
  const nid = r.id + '-R' + (++state.seq % 100);
  state.rfqs.unshift({ ...r, id: nid, status: 'draft', closesAt: now() + 3 * 24 * 3600e3, createdBy: u.id, createdAt: now() });
  audit(u, 'Duplicated RFQ to new draft ' + nid, rfqId, 'rfq');
  await persist();
  return { msg: `Duplicated ${rfqId} as draft ${nid}`, rfqId: nid };
};

/* ----- buyer-side: award ----- */
ops.award = async (u, { rfqId, mode, supplierCompanyId, alloc, ackFlags }) => {
  requireAward(u);
  const r = rfqById(rfqId); if (!r || r.buyerCompanyId !== u.companyId) throw err(404, 'RFQ not found');
  if (r.status === 'awarded') throw err(400, 'Already awarded');
  if (windowOpen(r)) throw err(400, 'Award unlocks only after the bid window closes');
  const bids = rfqBids(rfqId);
  const mkOrder = (scid, qty, price, lead) => {
    const oid = 'ORD-' + (++state.seq);
    state.orders.push({ id: oid, rfqId: r.id, buyerCompanyId: u.companyId, supplierCompanyId: scid, title: r.title, cat: r.cat,
      qty, price, stage: 'accepted', due: new Date(now() + (lead || 10) * 24 * 3600e3).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tracking: null, delayed: false, delayReason: '', buyer: u.name, engineer: r.engineer, product: r.product });
  };
  if (mode === 'split') {
    const parts = Object.entries(alloc || {}).filter(([, q]) => Number(q) > 0).map(([cid, q]) => [cid, Number(q)]);
    if (!parts.length) throw err(400, 'Allocate quantity to at least one supplier');
    const total = parts.reduce((n, [, q]) => n + q, 0);
    if (total !== r.qty) throw err(400, `Split must sum to ${r.qty} (got ${total})`);
    const flagged = parts.map(([cid]) => cid).filter(cid => supplierFlags(cid).length);
    if (flagged.length && !ackFlags) throw err(409, `Risk flags on ${flagged.map(supName).join(', ')} require acknowledgment`);
    parts.forEach(([cid, q]) => {
      const b = bids.find(x => x.supplierCompanyId === cid);
      if (!b) throw err(400, `${supName(cid)} has no bid on this RFQ`);
      mkOrder(cid, q, b.unit * q, b.lead);
      audit(u, `Awarded ${q} units to ${supName(cid)} (split)`, rfqId, 'award', [cid]);
      notify(cid, null, 'ti-check', `You were awarded ${q} units of ${r.title} (${rfqId})`, { view: 'tracking' });
    });
  } else {
    const cid = supplierCompanyId;
    if (!cid) throw err(400, 'Select a supplier to award');
    const b = bids.find(x => x.supplierCompanyId === cid);
    if (!b) throw err(400, 'That supplier has no bid on this RFQ');
    if (supplierFlags(cid).length && !ackFlags) throw err(409, `Risk flags on ${supName(cid)} require acknowledgment`);
    mkOrder(cid, r.qty, bidPrice(b, r), b.lead);
    audit(u, `Awarded to ${supName(cid)} — sign-off requested`, rfqId, 'award', [cid]);
    notify(cid, null, 'ti-check', `Your bid on ${r.title} (${rfqId}) was accepted — lead time starts now`, { view: 'tracking' });
    bids.filter(x => x.supplierCompanyId !== cid).forEach(x =>
      notify(x.supplierCompanyId, null, 'ti-x', `${r.title} (${rfqId}) was awarded to another supplier`, { view: 'mybids' }));
  }
  r.status = 'awarded';
  await persist();
  return { msg: mode === 'split' ? 'Split award sent for sign-off' : `${supName(supplierCompanyId)} awarded — sign-off requested, supplier notified` };
};

/* ----- orders ----- */
ops.advanceOrder = async (u, { orderId }) => {
  requireSupplier(u);
  const o = orderById(orderId); if (!o || o.supplierCompanyId !== u.companyId) throw err(404, 'Order not found');
  if (o.stage === 'accepted') o.stage = 'manufacturing';
  else if (o.stage === 'manufacturing') { o.stage = 'shipped'; o.delayed = false; }
  else if (o.stage === 'shipped') o.stage = 'delivered';
  audit(u, `Order ${o.stage}`, orderId, 'evt', [o.buyerCompanyId]);
  notify(o.buyerCompanyId, null, 'ti-truck', `${o.title} (${orderId}) marked ${o.stage}`, { view: 'tracking' });
  await persist();
  return { msg: 'Marked ' + o.stage + ' — buyer & engineer notified' };
};
ops.addTracking = async (u, { orderId, tracking }) => {
  requireSupplier(u);
  const o = orderById(orderId); if (!o || o.supplierCompanyId !== u.companyId) throw err(404, 'Order not found');
  if (!tracking || !String(tracking).trim()) throw err(400, 'Tracking number required');
  o.tracking = String(tracking).trim(); if (o.stage === 'accepted' || o.stage === 'manufacturing') o.stage = 'shipped';
  o.delayed = false;
  audit(u, 'Added tracking ' + o.tracking, orderId, 'evt', [o.buyerCompanyId]);
  notify(o.buyerCompanyId, null, 'ti-truck', `Tracking added for ${o.title} (${orderId})`, { view: 'tracking' });
  await persist();
  return { msg: 'Tracking added · marked shipped' };
};
ops.reportDelay = async (u, { orderId, reason }) => {
  requireSupplier(u);
  const o = orderById(orderId); if (!o || o.supplierCompanyId !== u.companyId) throw err(404, 'Order not found');
  o.delayed = true; o.delayReason = reason || 'Timeline slipped.';
  audit(u, 'Reported delay: ' + o.delayReason, orderId, 'evt', [o.buyerCompanyId]);
  notify(o.buyerCompanyId, null, 'ti-clock-exclamation', `${o.title} (${orderId}) reported a delay`, { view: 'tracking', arg: 'delayed' });
  await persist();
  return { msg: 'Delay reported — engineer & buyer notified' };
};
ops.reviewOrder = async (u, { orderId, rating, escalate, note }) => {
  requireAward(u);
  const o = orderById(orderId); if (!o || o.buyerCompanyId !== u.companyId) throw err(404, 'Order not found');
  state.orders = state.orders.filter(x => x !== o);
  state.reviews.unshift({ orderId, supplierCompanyId: o.supplierCompanyId, title: o.title, part: o.rfqId, rating: Math.min(5, Math.max(1, Number(rating) || 4)), note: note || (escalate ? 'Quality finding escalated to QA.' : 'Closed on delivery.'), at: now() });
  audit(u, escalate ? 'Closed job · quality escalation' : `Closed job · rated ${rating || 4}★`, orderId, 'evt', [o.supplierCompanyId]);
  notify(o.supplierCompanyId, null, 'ti-star', `${o.title} rated ${rating || 4}★ on your scorecard`, { view: 'scorecard' });
  await persist();
  return { msg: escalate ? 'Job closed · quality finding escalated to QA' : 'Job closed · rating posted to supplier scorecard' };
};
ops.reorder = async (u, { orderId, mode }) => {
  requireAward(u);
  const src = orderById(orderId) || state.orders.find(o => o.id === orderId);
  if (!src || src.buyerCompanyId !== u.companyId) throw err(404, 'Order not found');
  if (mode === 'requote') {
    const r = rfqById(src.rfqId);
    const nid = src.rfqId + '-RQ' + (++state.seq % 100);
    state.rfqs.unshift({ id: nid, buyerCompanyId: u.companyId, title: src.title, cat: src.cat, qty: src.qty,
      product: src.product, costCenter: r ? r.costCenter : '', reqs: r ? r.reqs : '', vaultLink: r ? r.vaultLink : '',
      nda: r ? r.nda : 'category', autoExtend: true, status: 'open', closesAt: now() + 3 * 24 * 3600e3,
      createdBy: u.id, engineer: src.engineer, createdAt: now() });
    audit(u, 'Re-quote opened as ' + nid, orderId, 'rfq');
    notifySuppliersOfRfq(rfqById(nid));
    await persist();
    return { msg: `New RFQ ${nid} opened for competitive bids` };
  }
  const oid = 'ORD-' + (++state.seq);
  state.orders.push({ ...src, id: oid, stage: 'accepted', tracking: null, delayed: false, delayReason: '', buyer: u.name });
  audit(u, 'Repeat order placed as ' + oid, orderId, 'evt', [src.supplierCompanyId]);
  notify(src.supplierCompanyId, null, 'ti-repeat', `Repeat order for ${src.title} (${oid}) — same terms`, { view: 'tracking' });
  await persist();
  return { msg: `Repeat order placed — ${supName(src.supplierCompanyId)} notified` };
};

/* ----- notifications ----- */
ops.readNotif = async (u, { id }) => {
  const n = state.notifications.find(x => x.id === id && x.companyId === u.companyId);
  if (n) n.unread = false;
  await persist();
  return {};
};
ops.markAllRead = async (u) => {
  state.notifications.forEach(n => { if (n.companyId === u.companyId) n.unread = false; });
  await persist();
  return {};
};

/* ----- admin ----- */
ops.addUser = async (u, { name, email, role, group }) => {
  requireAdmin(u);
  if (!email || !String(email).includes('@')) throw err(400, 'Valid email required');
  if (userByEmail(email)) throw err(409, 'That email already has an account');
  const persona = { Admin: 'admin', Buyer: 'buyer', Engineer: 'engineer' }[role] || 'buyer';
  const temp = crypto.randomBytes(4).toString('hex');
  state.users.push({ id: 'u_' + (++state.seq), email: String(email).trim(), passHash: bcrypt.hashSync(temp, 10), name: name || 'New User', companyId: u.companyId, persona, group: group || '', status: 'Invited' });
  audit(u, `Invited ${email} as ${role}`, '', 'evt');
  await persist();
  return { msg: `Invite created — temporary password: ${temp}`, tempPassword: temp };
};
ops.updateUserRole = async (u, { email, role }) => {
  requireAdmin(u);
  const x = userByEmail(email);
  if (!x || x.companyId !== u.companyId) throw err(404, 'User not found');
  x.persona = { Admin: 'admin', Buyer: 'buyer', Engineer: 'engineer' }[role] || x.persona;
  audit(u, `Changed ${email} role to ${role}`, '', 'evt');
  await persist();
  return { msg: 'Role updated' };
};
ops.addGroup = async (u, { name }) => {
  requireAdmin(u);
  if (!name || !String(name).trim()) throw err(400, 'Group name required');
  const arr = state.groupsByCompany[u.companyId] = state.groupsByCompany[u.companyId] || [];
  if (!arr.includes(name.trim())) arr.push(name.trim());
  await persist();
  return { msg: 'Group added' };
};
ops.updateSettings = async (u, { key, value }) => {
  requireAdmin(u);
  if (key !== 'showPricingToEngineers') throw err(400, 'Unknown setting');
  companySettings(u.companyId)[key] = !!value;
  audit(u, `Setting ${key} = ${!!value}`, '', 'evt');
  await persist();
  return { msg: 'Setting updated' };
};

async function reset() { state = seed(); await db.save(state); sessions.clear(); }

module.exports = { init, login, logout, userForToken, viewerState, ops, registerBuyer, registerSupplier, reset };
