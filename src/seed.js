'use strict';
/* Initial application state — the server is the system of record. */
const bcrypt = require('bcryptjs');

const BID_QTY = 12;
const rawBids = [
  { supplier: 'Nord Fab', unit: 95, ship: 40, incoterms: 'FOB Origin', lead: 14, score: 4.1, best: 'price' },
  { supplier: 'Titan Machining', unit: 105, ship: 50, incoterms: 'DAP', lead: 7, score: 4.8, best: 'fast' },
  { supplier: 'Acme Precision', unit: 100, ship: 40, incoterms: 'FOB Origin', lead: 9, score: 4.6, revised: true },
  { supplier: 'Westline Tool', unit: 103, ship: 59, incoterms: 'EXW', lead: 11, score: 3.9 }
].map(b => ({ ...b, price: b.unit * BID_QTY + b.ship }));

function seed() {
  const accounts = [
    { id: 'u_acme',  email: 'acme@forerun.dev',    name: 'Acme Precision', role: 'supplier', persona: null,       company: 'Acme Precision',           pass: 'demo1234' },
    { id: 'u_dana',  email: 'dana@northvale.com',  name: 'Dana Ortiz',     role: 'buyer',    persona: 'admin',    company: 'Northvale Semiconductor',  pass: 'demo1234' },
    { id: 'u_sam',   email: 'sam@northvale.com',   name: 'Sam Ortiz',      role: 'buyer',    persona: 'buyer',    company: 'Northvale Semiconductor',  pass: 'demo1234' },
    { id: 'u_priya', email: 'priya@northvale.com', name: 'Priya Rao',      role: 'buyer',    persona: 'engineer', company: 'Northvale Semiconductor',  pass: 'demo1234' }
  ].map(a => { const { pass, ...rest } = a; return { ...rest, passHash: bcrypt.hashSync(pass, 10) }; });

  return {
    __seeded: true,
    version: 2,
    nid: 1000,
    accounts,
    opps: [
      { id: 'VF-6061-204', title: 'Vacuum flange, 6061-T6', cat: 'cnc', qty: 12, closes: '2d 4h', bids: 7, soon: false, customer: 'Northvale Semiconductor', reqs: 'Tolerance ±0.05mm on bore ID. Hard anodized. Test batch ahead of production qualification.', nda: 'category' },
      { id: 'QV-110', title: 'Quartz viewport window', cat: 'quartz', qty: 4, closes: '5h', bids: 9, soon: true, customer: 'ASML West', reqs: 'Optical-grade fused silica. Scratch-dig 40-20. Edges chamfered.', nda: 'drawing' },
      { id: 'CMB-330', title: 'Chamber mounting bracket', cat: 'sheet', qty: 20, closes: '1d 9h', bids: 4, soon: false, customer: 'Northvale Semiconductor', reqs: '304 SS, 3mm. Bead-blast finish. Weldment per drawing.', nda: 'category' },
      { id: 'GM-512', title: 'Process gas manifold', cat: 'gas', qty: 6, closes: '3d', bids: 2, soon: false, customer: 'Orion Micro', reqs: '316L electropolished. Orbital welds. Helium leak test to 1e-9.', nda: 'category' },
      { id: 'EA-204R', title: 'Electrode assembly rework', cat: 'rework', qty: 8, closes: '4d 6h', bids: 1, soon: false, customer: 'Orion Micro', reqs: 'Re-machine seat and re-plate. Existing parts supplied by buyer.', nda: 'none' },
      { id: 'LP-088', title: 'Lift pin housing', cat: 'cnc', qty: 30, closes: '2d', bids: 5, soon: false, customer: 'Northvale Semiconductor', reqs: 'Aluminum 6061. Hard anodize. Bore concentricity 0.01mm.', nda: 'category' },
      { id: 'AI-076', title: 'Alumina insulator ring', cat: 'quartz', qty: 15, closes: '1d 2h', bids: 3, soon: true, customer: 'ASML West', reqs: '99.5% alumina, fired. Ground flat both faces.', nda: 'drawing' },
      { id: 'CT-450', title: 'Cable tray weldment', cat: 'sheet', qty: 10, closes: '5d', bids: 2, soon: false, customer: 'Northvale Semiconductor', reqs: 'Aluminum 5052. TIG welded. Powder coat.', nda: 'none' }
    ],
    mybids: [
      { id: 'VF-6061-204', title: 'Vacuum flange, 6061-T6', cat: 'cnc', price: 1240, lead: 9, status: ['Leading', 'st-good'], stage: 'active' },
      { id: 'GM-512', title: 'Process gas manifold', cat: 'gas', price: 880, lead: 12, status: ['In review', 'st-info'], stage: 'review' },
      { id: 'LP-088', title: 'Lift pin housing', cat: 'cnc', price: 2100, lead: 8, status: ['Outbid', 'st-warn'], stage: 'active' },
      { id: 'SV-300', title: 'Slit valve plate', cat: 'cnc', price: 1650, lead: 7, status: ['Won', 'st-win'], stage: 'won' },
      { id: 'HB-211', title: 'Heater bracket', cat: 'sheet', price: 540, lead: 6, status: ['Won', 'st-win'], stage: 'won' },
      { id: 'QV-090', title: 'Quartz boat', cat: 'quartz', price: 980, lead: 14, status: ['Lost', 'st-danger'], stage: 'lost' }
    ],
    rfqs: [
      { id: 'VF-6061-204', title: 'Vacuum flange, 6061-T6', cat: 'cnc', qty: 12, status: ['Open', 'st-good'], bids: 7, closes: '2d 4h', open: true, product: 'Litho stage', autoExtend: true },
      { id: 'CMB-330', title: 'Chamber mounting bracket', cat: 'sheet', qty: 20, status: ['Open', 'st-good'], bids: 4, closes: '1d 9h', open: true, product: 'Etch chamber', autoExtend: true },
      { id: 'SV-300', title: 'Slit valve plate', cat: 'cnc', qty: 12, status: ['Closed · review bids', 'st-warn'], bids: 6, closes: 'closed', open: false, product: 'Litho stage', autoExtend: true },
      { id: 'GM-512', title: 'Process gas manifold', cat: 'gas', qty: 6, status: ['Open', 'st-good'], bids: 2, closes: '3d', open: true, product: 'Deposition module', autoExtend: false },
      { id: 'EA-204R', title: 'Electrode assembly rework', cat: 'rework', qty: 8, status: ['Awarded', 'st-win'], bids: 3, closes: 'awarded', open: false, awarded: true, product: 'Etch chamber', autoExtend: true }
    ],
    bidsByRfq: { 'SV-300': rawBids },
    declined: {
      'SV-300': [
        { supplier: 'Coastal CNC', reason: 'Capacity — no open slot before your need-by date' },
        { supplier: 'Apex Micro', reason: 'Bore tolerance exceeds our process capability' }
      ]
    },
    addenda: {
      'VF-6061-204': [{ q: 'Is the ±0.05mm tolerance on the bore ID or the flange face?', a: 'Bore ID. Flange face is ±0.1mm — note 3 on the drawing updated.', at: 'Jul 10 · Priya Rao', bidders: 7 }]
    },
    sups: [
      { name: 'Acme Precision', cats: ['cnc'], score: 4.6, jobs: 41, ontime: 96, rnd: true },
      { name: 'Nord Fab', cats: ['sheet', 'cnc'], score: 4.1, jobs: 12, ontime: 88, rnd: true },
      { name: 'Titan Machining', cats: ['cnc', 'rework'], score: 4.8, jobs: 58, ontime: 97, rnd: true },
      { name: 'Lumen Quartz', cats: ['quartz'], score: 4.5, jobs: 27, ontime: 94, rnd: true },
      { name: 'Flowtek Lines', cats: ['gas'], score: 4.3, jobs: 33, ontime: 95, rnd: false }
    ],
    orders: [
      { id: 'SV-300', title: 'Slit valve plate', cat: 'cnc', supplier: 'Acme Precision', buyer: 'Sam Ortiz', engineer: 'Priya Rao', product: 'Litho stage', qty: 12, price: 1650, stage: 'manufacturing', due: 'Jul 20', tracking: null, delayed: false, delayReason: '' },
      { id: 'HB-211', title: 'Heater bracket', cat: 'sheet', supplier: 'Acme Precision', buyer: 'Sam Ortiz', engineer: 'Marcus Vogel', product: 'Etch chamber', qty: 20, price: 540, stage: 'shipped', due: 'Jul 14', tracking: '7712 3480 1123', delayed: false, delayReason: '' },
      { id: 'EA-204R', title: 'Electrode assembly rework', cat: 'rework', supplier: 'Titan Machining', buyer: 'Lena Park', engineer: 'Marcus Vogel', product: 'Etch chamber', qty: 8, price: 1310, stage: 'manufacturing', due: 'Jul 10', tracking: null, delayed: true, delayReason: 'Raw material lead time slipped 4 days; new ship date Jul 16.' },
      { id: 'GM-401', title: 'Gas manifold (pilot)', cat: 'gas', supplier: 'Flowtek Lines', buyer: 'Sam Ortiz', engineer: 'Priya Rao', product: 'Deposition module', qty: 6, price: 920, stage: 'delivered', due: 'Jul 2', tracking: '5561 9902 7781', delayed: false, delayReason: '' }
    ],
    threads: [
      { id: 1, part: 'VF-6061-204', partTitle: 'Vacuum flange', supplier: 'Acme Precision', engineer: 'Priya Rao (Engineer)', buyer: 'Sam Ortiz (Buyer)', company: 'Northvale Semiconductor', unread: 1,
        msgs: [{ from: 'sup', name: 'Acme Precision', text: 'Is the ±0.05mm tolerance on the bore ID or the flange face?', t: '9:12' },
               { from: 'eng', name: 'Priya Rao', text: 'Bore ID. Flange face is ±0.1mm — I updated note 3 on the drawing.', t: '9:20' },
               { from: 'sup', name: 'Acme Precision', text: 'Got it, thanks. Submitting our bid today.', t: '9:24' }] },
      { id: 2, part: 'QV-110', partTitle: 'Quartz viewport', supplier: 'Lumen Quartz', engineer: 'Marcus Vogel (Engineer)', buyer: 'Sam Ortiz (Buyer)', company: 'ASML West', unread: 0,
        msgs: [{ from: 'sup', name: 'Lumen Quartz', text: 'Can the chamfer be 0.3mm x 45° instead of 0.5mm? Better yield on our tooling.', t: 'Tue' },
               { from: 'eng', name: 'Marcus Vogel', text: '0.3mm is fine functionally. Approved.', t: 'Tue' }] },
      { id: 3, part: 'EA-204R', partTitle: 'Electrode rework', supplier: 'Titan Machining', engineer: 'Marcus Vogel (Engineer)', buyer: 'Lena Park (Buyer)', company: 'Orion Micro', unread: 0,
        msgs: [{ from: 'sup', name: 'Titan Machining', text: 'Heads-up: material lead time slipped 4 days. Flagging a delay in the tracker.', t: 'Mon' },
               { from: 'buy', name: 'Lena Park', text: 'Acknowledged — let\'s catch up on a call if the new date moves again.', t: 'Mon' }] }
    ],
    suppFeedback: [
      { part: 'SV-300', title: 'Slit valve plate', rating: 5, note: 'Met spec, delivered 2 days early. Excellent finish.' },
      { part: 'GM-401', title: 'Gas manifold (pilot)', rating: 4, note: 'Good part; minor cosmetic scuff on one unit, accepted.' }
    ],
    users: [
      { name: 'Dana Ortiz', email: 'dana@northvale.com', role: 'Admin', group: 'Supply Chain', status: 'Active' },
      { name: 'Sam Ortiz', email: 'sam@northvale.com', role: 'Buyer', group: 'Litho', status: 'Active' },
      { name: 'Lena Park', email: 'lena.park@northvale.com', role: 'Buyer', group: 'Etch', status: 'Active' },
      { name: 'Priya Rao', email: 'priya@northvale.com', role: 'Engineer', group: 'Litho', status: 'Active' },
      { name: 'Marcus Vogel', email: 'marcus.vogel@northvale.com', role: 'Engineer', group: 'Etch', status: 'Invited' }
    ],
    groups: ['Supply Chain', 'Litho', 'Etch', 'Deposition'],
    settings: { showPricingToEngineers: false },
    saved: ['AI-076'],
    ndaSigned: [],
    notifs: [
      { id: 1, role: 'buyer', icon: 'ti-gavel', text: 'New bid from Titan Machining on Slit valve plate (SV-300)', when: '2h ago', unread: true, link: { view: 'rfq', arg: 'SV-300' } },
      { id: 2, role: 'buyer', icon: 'ti-clock-exclamation', text: 'Electrode rework (EA-204R) reported a 4-day delay', when: 'Yesterday', unread: true, link: { view: 'tracking', arg: 'delayed' } },
      { id: 3, role: 'buyer', icon: 'ti-message-2', text: 'Lumen Quartz asked a question on Quartz viewport (QV-110)', when: 'Tue', unread: false, link: { view: 'thread', arg: 'QV-110' } },
      { id: 4, role: 'supplier', icon: 'ti-file-text', text: 'New opportunity: Process gas manifold (GM-512) — Orion Micro', when: '1h ago', unread: true, link: { view: 'opp', arg: 'GM-512' } },
      { id: 5, role: 'supplier', icon: 'ti-check', text: 'Your bid on Slit valve plate (SV-300) was accepted', when: '3h ago', unread: true, link: { view: 'tracking' } },
      { id: 6, role: 'supplier', icon: 'ti-clock', text: 'Chamber mounting bracket (CMB-330) closes in 1d 9h', when: 'today', unread: false, link: { view: 'opp', arg: 'CMB-330' } }
    ],
    audit: [
      { t: 'Jul 11 · 14:22', actor: 'Titan Machining', action: 'Submitted bid', target: 'SV-300', kind: 'bid' },
      { t: 'Jul 11 · 13:48', actor: 'Acme Precision', action: 'Revised bid', target: 'SV-300', kind: 'bid' },
      { t: 'Jul 11 · 13:10', actor: 'Nord Fab', action: 'Viewed drawing in vault', target: 'SV-300', kind: 'view' },
      { t: 'Jul 11 · 11:32', actor: 'Coastal CNC', action: 'Declined (no-bid): capacity', target: 'SV-300', kind: 'decline' },
      { t: 'Jul 10 · 16:40', actor: 'Acme Precision', action: 'Signed NDA', target: 'QV-110', kind: 'nda' },
      { t: 'Jul 10 · 15:07', actor: 'Priya Rao (Engineer)', action: 'Posted addendum to 7 bidders', target: 'VF-6061-204', kind: 'addendum' },
      { t: 'Jul 10 · 11:05', actor: 'Sam Ortiz (Buyer)', action: 'Published RFQ', target: 'VF-6061-204', kind: 'rfq' }
    ],
    profiles: require('./profiles')
  };
}

module.exports = { seed, BID_QTY };
