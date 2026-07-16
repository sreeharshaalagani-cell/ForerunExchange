'use strict';
/*
 * Domain model + business logic. All mutations run here, server-side, with
 * validation and role-based authorization. The client never mutates state
 * directly — it calls endpoints that invoke these operations.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { seed } = require('./seed');

let state = null;
const sessions = new Map(); // token -> accountId

function err(status, message) { const e = new Error(message); e.status = status; return e; }

async function init() {
  await db.init();
  state = await db.load();
  if (!state || !state.__seeded) { state = seed(); await db.save(state); }
  console.log(`[model] state ready (${db.kind}) — accounts: ${state.accounts.length}`);
}
async function persist() { await db.save(state); }

/* ---------------- auth ---------------- */
function accountByEmail(email) {
  return state.accounts.find(a => a.email.toLowerCase() === String(email || '').toLowerCase());
}
function accountById(id) { return state.accounts.find(a => a.id === id); }

function login(email, password) {
  const a = accountByEmail(email);
  if (!a || !bcrypt.compareSync(String(password || ''), a.passHash)) throw err(401, 'Invalid email or password');
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, a.id);
  return { token, account: a };
}
function logout(token) { sessions.delete(token); }
function accountForToken(token) { const id = sessions.get(token); return id ? accountById(id) : null; }

/* ---------------- authorization helpers ---------------- */
const isSupplier = a => a.role === 'supplier';
const isBuyer = a => a.role === 'buyer';
const canSeePrice = a => isSupplier(a) || a.persona !== 'engineer' || !!state.settings.showPricingToEngineers;
const canAward = a => isBuyer(a) && (a.persona === 'buyer' || a.persona === 'admin');
const isAdmin = a => isBuyer(a) && a.persona === 'admin';
function requireSupplier(a) { if (!isSupplier(a)) throw err(403, 'Suppliers only'); }
function requireBuyer(a) { if (!isBuyer(a)) throw err(403, 'Buyer-side only'); }
function requireAdmin(a) { if (!isAdmin(a)) throw err(403, 'Admins only'); }

function actorName(a) {
  if (isSupplier(a)) return a.company;
  return `${a.name} (${a.persona.charAt(0).toUpperCase() + a.persona.slice(1)})`;
}
function audit(a, action, target, kind) { state.audit.unshift({ t: 'just now', actor: actorName(a), action, target: target || '', kind: kind || 'evt' }); }
function notify(role, icon, text, link) { state.notifs.unshift({ id: ++state.nid, role, icon, text, when: 'just now', unread: true, link: link || null }); }
function supplierFlags(name) { const p = state.profiles[name]; return p ? p.research.flags : []; }

/* ---------------- viewer-scoped state ---------------- */
function publicAccounts() {
  return state.accounts.map(a => ({ id: a.id, email: a.email, name: a.name, role: a.role, persona: a.persona, company: a.company }));
}
function me(a) {
  return { id: a.id, email: a.email, name: a.name, role: a.role, persona: a.persona, company: a.company,
           canSeePrice: canSeePrice(a), canAward: canAward(a), isAdmin: isAdmin(a) };
}
function maskBid(b) { return { ...b, unit: null, ship: null, price: null, masked: true }; }
function viewerState(a) {
  const see = canSeePrice(a);
  const bidsByRfq = {};
  for (const k of Object.keys(state.bidsByRfq)) bidsByRfq[k] = state.bidsByRfq[k].map(b => see ? b : maskBid(b));
  const orders = state.orders.map(o => see ? o : { ...o, price: null });
  const mybids = state.mybids.map(m => see ? m : { ...m, price: null });
  return {
    me: me(a),
    accounts: publicAccounts(),
    opps: state.opps, mybids, rfqs: state.rfqs, bidsByRfq, declined: state.declined,
    addenda: state.addenda, sups: state.sups, orders, threads: state.threads,
    suppFeedback: state.suppFeedback, users: state.users, groups: state.groups,
    settings: state.settings, saved: state.saved, ndaSigned: state.ndaSigned,
    notifs: state.notifs.filter(n => n.role === a.role), audit: state.audit, profiles: state.profiles
  };
}

/* ---------------- operations ---------------- */
const ops = {};

ops.toggleSave = async (a, { oppId }) => {
  requireSupplier(a);
  const i = state.saved.indexOf(oppId);
  if (i >= 0) state.saved.splice(i, 1); else state.saved.push(oppId);
  await persist();
  return { msg: i >= 0 ? 'Removed from saved' : 'Saved to your pipeline' };
};

ops.viewVault = async (a, { oppId }) => {
  audit(a, 'Viewed drawing in vault', oppId, 'view');
  await persist();
  return { msg: 'Opening vault link · access logged' };
};

ops.signNda = async (a, { oppId }) => {
  requireSupplier(a);
  if (!state.ndaSigned.includes(oppId)) state.ndaSigned.push(oppId);
  audit(a, 'Signed NDA', oppId, 'nda');
  await persist();
  return { msg: 'NDA signed · drawing unlocked' };
};

ops.submitBid = async (a, { rfqId, unit, ship, incoterms, lead }) => {
  requireSupplier(a);
  const rfq = state.rfqs.find(r => r.id === rfqId) || state.opps.find(o => o.id === rfqId);
  const qty = (rfq && rfq.qty) || 12;
  const u = Number(unit), s = Number(ship) || 0, l = Number(lead);
  const list = (state.bidsByRfq[rfqId] = state.bidsByRfq[rfqId] || []);
  let bid = list.find(b => b.supplier === a.company);
  const revise = !!bid;
  const price = (u ? u * qty : 0) + s;
  if (bid) { Object.assign(bid, { unit: u || bid.unit, ship: s, incoterms: incoterms || bid.incoterms, lead: l || bid.lead, price, revised: true }); }
  else { list.push({ supplier: a.company, unit: u || 0, ship: s, incoterms: incoterms || 'FOB Origin', lead: l || 0, score: 4.6, price }); }
  // reflect on the supplier's own board
  let mb = state.mybids.find(m => m.id === rfqId);
  if (mb) { mb.price = price || mb.price; mb.lead = l || mb.lead; mb.stage = 'review'; mb.status = ['In review', 'st-info']; }
  audit(a, revise ? 'Revised bid' : 'Submitted bid', rfqId, 'bid');
  notify('buyer', 'ti-gavel', `${revise ? 'Revised' : 'New'} bid on ${rfqId} from ${a.company}`, { view: 'rfq', arg: rfqId });
  await persist();
  return { msg: revise ? 'Bid revised — buyer notified' : 'Bid submitted — now in review' };
};

ops.declineBid = async (a, { rfqId, reason }) => {
  requireSupplier(a);
  (state.declined[rfqId] = state.declined[rfqId] || []).push({ supplier: a.company, reason: reason || 'No-bid' });
  audit(a, 'Declined (no-bid): ' + (reason || ''), rfqId, 'decline');
  notify('buyer', 'ti-ban', `${a.company} declined ${rfqId}: ${reason || 'no-bid'}`, { view: 'rfq', arg: rfqId });
  await persist();
  return { msg: 'No-bid recorded — buyer notified' };
};

ops.postMessage = async (a, { threadId, text, addendum }) => {
  const t = state.threads.find(x => x.id === threadId);
  if (!t) throw err(404, 'Thread not found');
  if (!text || !String(text).trim()) throw err(400, 'Message is empty');
  const from = isSupplier(a) ? 'sup' : (a.persona === 'engineer' ? 'eng' : 'buy');
  t.msgs.push({ from, name: a.name, text: String(text).trim(), t: 'now' });
  if (addendum && isBuyer(a)) {
    const lastQ = [...t.msgs].reverse().find(m => m.from === 'sup');
    const rfq = state.rfqs.find(r => r.id === t.part);
    const bidders = (rfq && rfq.bids) || 1;
    (state.addenda[t.part] = state.addenda[t.part] || []).push({ q: lastQ ? lastQ.text : '(buyer clarification)', a: String(text).trim(), at: 'now · ' + actorName(a), bidders });
    t.msgs.push({ from: 'sys', text: `Posted as an addendum to all ${bidders} bidders on ${t.part}` });
    notify('supplier', 'ti-speakerphone', `Addendum posted on ${t.partTitle} (${t.part}) — all bidders`, { view: 'opp', arg: t.part });
    audit(a, `Posted addendum to ${bidders} bidders`, t.part, 'addendum');
    await persist();
    return { msg: 'Answer posted as an addendum to all bidders' };
  }
  await persist();
  return { msg: 'Message sent · notification pushed' };
};

function createOrder(a, rfq, supplier, qty, price) {
  state.orders.push({ id: rfq.id + (state.orders.some(o => o.id === rfq.id) ? '-' + supplier.slice(0, 3).toUpperCase() : ''),
    title: rfq.title, cat: rfq.cat, supplier, buyer: a.name, engineer: 'Priya Rao', product: rfq.product,
    qty, price, stage: 'accepted', due: 'TBD', tracking: null, delayed: false, delayReason: '' });
}

ops.award = async (a, { rfqId, mode, supplier, alloc, ackFlags }) => {
  if (!canAward(a)) throw err(403, 'Only a buyer or admin can award (engineers cannot).');
  const rfq = state.rfqs.find(r => r.id === rfqId);
  if (!rfq) throw err(404, 'RFQ not found');
  if (rfq.awarded) throw err(400, 'Already awarded');
  if (rfq.open) throw err(400, 'Award unlocks only after the bid window closes');
  const bids = state.bidsByRfq[rfqId] || [];

  if (mode === 'split') {
    const parts = Object.entries(alloc || {}).filter(([, q]) => Number(q) > 0).map(([s, q]) => [s, Number(q)]);
    if (!parts.length) throw err(400, 'Allocate quantity to at least one supplier');
    const total = parts.reduce((n, [, q]) => n + q, 0);
    if (total !== rfq.qty) throw err(400, `Split must sum to ${rfq.qty} (got ${total})`);
    const flagged = parts.map(([s]) => s).filter(s => supplierFlags(s).length);
    if (flagged.length && !ackFlags) throw err(409, `Risk flags on ${flagged.join(', ')} require acknowledgment`);
    parts.forEach(([s, q]) => {
      const b = bids.find(x => x.supplier === s);
      createOrder(a, rfq, s, q, (b ? b.unit : 0) * q);
      audit(a, `Awarded ${q} units to ${s} (split)`, rfqId, 'award');
      notify('supplier', 'ti-check', `You were awarded part of ${rfq.title} (${rfqId})`, { view: 'tracking' });
    });
  } else {
    if (!supplier) throw err(400, 'Select a supplier to award');
    const b = bids.find(x => x.supplier === supplier);
    if (supplierFlags(supplier).length && !ackFlags) throw err(409, `Risk flags on ${supplier} require acknowledgment`);
    createOrder(a, rfq, supplier, rfq.qty, b ? b.price : 0);
    audit(a, `Awarded to ${supplier} — sign-off requested`, rfqId, 'award');
    notify('supplier', 'ti-check', `Your bid on ${rfq.title} (${rfqId}) was accepted`, { view: 'tracking' });
  }
  rfq.awarded = true; rfq.status = ['Awarded', 'st-win']; rfq.open = false; rfq.closes = 'awarded';
  await persist();
  return { msg: mode === 'split' ? 'Split award sent for sign-off' : `${supplier} awarded — sign-off requested` };
};

ops.advanceOrder = async (a, { orderId }) => {
  requireSupplier(a);
  const o = state.orders.find(x => x.id === orderId);
  if (!o) throw err(404, 'Order not found');
  if (o.supplier !== a.company) throw err(403, 'Not your order');
  if (o.stage === 'manufacturing') { o.stage = 'shipped'; o.delayed = false; }
  else if (o.stage === 'shipped') { o.stage = 'delivered'; }
  audit(a, `Order ${o.stage}`, orderId, 'evt');
  notify('buyer', 'ti-truck', `${o.title} (${orderId}) marked ${o.stage}`, { view: 'tracking' });
  await persist();
  return { msg: o.stage === 'delivered' ? 'Marked delivered — FedEx confirmation posted' : 'Marked shipped — buyer & engineer notified' };
};

ops.addTracking = async (a, { orderId, tracking }) => {
  requireSupplier(a);
  const o = state.orders.find(x => x.id === orderId);
  if (!o || o.supplier !== a.company) throw err(404, 'Order not found');
  o.tracking = tracking || '7712 3480 1123'; o.stage = 'shipped'; o.delayed = false;
  audit(a, 'Added tracking ' + o.tracking, orderId, 'evt');
  notify('buyer', 'ti-truck', `Tracking added for ${o.title} (${orderId})`, { view: 'tracking' });
  await persist();
  return { msg: 'Tracking added · marked shipped' };
};

ops.reportDelay = async (a, { orderId, reason }) => {
  requireSupplier(a);
  const o = state.orders.find(x => x.id === orderId);
  if (!o || o.supplier !== a.company) throw err(404, 'Order not found');
  o.delayed = true; o.delayReason = reason || 'Timeline slipped.';
  audit(a, 'Reported delay: ' + o.delayReason, orderId, 'evt');
  notify('buyer', 'ti-clock-exclamation', `${o.title} (${orderId}) reported a delay`, { view: 'tracking', arg: 'delayed' });
  await persist();
  return { msg: 'Delay reported — engineer & buyer notified' };
};

ops.reviewOrder = async (a, { orderId, rating, escalate }) => {
  requireBuyer(a);
  const o = state.orders.find(x => x.id === orderId);
  if (!o) throw err(404, 'Order not found');
  state.orders = state.orders.filter(x => x !== o);
  state.suppFeedback.unshift({ part: o.id, title: o.title, rating: Number(rating) || 4, note: escalate ? 'Quality finding escalated to QA.' : 'Closed on delivery.' });
  audit(a, escalate ? 'Closed job · quality escalation' : `Closed job · rated ${rating || 4}★`, orderId, 'evt');
  notify('supplier', 'ti-star', `${o.title} rated ${rating || 4}★ on your scorecard`, { view: 'tracking' });
  await persist();
  return { msg: escalate ? 'Job closed · quality finding escalated to QA' : 'Job closed · rating sent to supplier scorecard' };
};

ops.reorder = async (a, { orderId, mode }) => {
  requireBuyer(a);
  const o = state.orders.find(x => x.id === orderId);
  if (!o) throw err(404, 'Order not found');
  audit(a, mode === 'requote' ? 'Re-quote opened' : 'Repeat order placed', orderId, 'rfq');
  await persist();
  return { msg: mode === 'requote' ? 'New RFQ opened for competitive bids' : `Repeat order placed — ${o.supplier} notified` };
};

ops.duplicateRfq = async (a, { rfqId }) => {
  requireBuyer(a);
  audit(a, 'Duplicated RFQ to new draft', rfqId, 'rfq');
  await persist();
  return { msg: `Duplicated ${rfqId} as a new draft` };
};

ops.publishRfq = async (a, body) => {
  requireBuyer(a);
  const id = (body && body.id) || 'RFQ-' + (++state.nid);
  if (!state.rfqs.some(r => r.id === id)) {
    state.rfqs.unshift({ id, title: (body && body.title) || 'New request', cat: (body && body.cat) || 'cnc', qty: Number(body && body.qty) || 1,
      status: ['Open', 'st-good'], bids: 0, closes: (body && body.window) || '3 days', open: true, product: (body && body.product) || 'Litho stage', autoExtend: true });
  }
  audit(a, 'Published RFQ', id, 'rfq');
  await persist();
  return { msg: 'RFQ published to qualified suppliers' };
};

ops.readNotif = async (a, { id }) => {
  const n = state.notifs.find(x => x.id === id && x.role === a.role);
  if (n) n.unread = false;
  await persist();
  return {};
};
ops.markAllRead = async (a) => {
  state.notifs.forEach(n => { if (n.role === a.role) n.unread = false; });
  await persist();
  return {};
};

ops.addUser = async (a, { name, email, role, group }) => {
  requireAdmin(a);
  state.users.push({ name: name || 'New User', email: email || 'user@northvale.com', role: role || 'Buyer', group: group || 'Litho', status: 'Invited' });
  audit(a, `Invited user ${email || ''}`, '', 'evt');
  await persist();
  return { msg: 'Invite sent' };
};
ops.updateUserRole = async (a, { email, role }) => {
  requireAdmin(a);
  const u = state.users.find(x => x.email === email);
  if (u) u.role = role;
  await persist();
  return { msg: 'Role updated' };
};
ops.updateSettings = async (a, { key, value }) => {
  requireAdmin(a);
  const allowed = ['showPricingToEngineers'];
  if (!allowed.includes(key)) throw err(400, 'Unknown setting');
  state.settings[key] = !!value;
  audit(a, `Setting ${key} = ${!!value}`, '', 'evt');
  await persist();
  return { msg: 'Setting updated' };
};

async function reset() { state = seed(); await db.save(state); sessions.clear(); }

module.exports = { init, login, logout, accountForToken, viewerState, ops, reset };
