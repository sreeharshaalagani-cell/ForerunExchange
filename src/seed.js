'use strict';
/*
 * Initial application state — entity model, multi-tenant.
 * companies / users / supplierProfiles / rfqs / bids / orders / threads / …
 * Demo tenants are seeded so a fresh deploy demos well; new tenants
 * self-register through the app.
 */
const bcrypt = require('bcryptjs');
const profiles = require('./profiles');

const H = 3600 * 1000, D = 24 * H;

function seed() {
  const now = Date.now();
  const hash = p => bcrypt.hashSync(p, 10);

  const companies = [
    { id: 'c_north',   name: 'Northvale Semiconductor', type: 'buyer' },
    { id: 'c_asml',    name: 'ASML West',               type: 'buyer' },
    { id: 'c_orion',   name: 'Orion Micro',             type: 'buyer' },
    { id: 'c_acme',    name: 'Acme Precision',          type: 'supplier' },
    { id: 'c_nord',    name: 'Nord Fab',                type: 'supplier' },
    { id: 'c_titan',   name: 'Titan Machining',         type: 'supplier' },
    { id: 'c_west',    name: 'Westline Tool',           type: 'supplier' },
    { id: 'c_lumen',   name: 'Lumen Quartz',            type: 'supplier' },
    { id: 'c_flowtek', name: 'Flowtek Lines',           type: 'supplier' }
  ];

  const users = [
    { id: 'u_dana',  email: 'dana@northvale.com',  passHash: hash('demo1234'), name: 'Dana Ortiz',   companyId: 'c_north', persona: 'admin',    group: 'Supply Chain', status: 'Active' },
    { id: 'u_sam',   email: 'sam@northvale.com',   passHash: hash('demo1234'), name: 'Sam Ortiz',    companyId: 'c_north', persona: 'buyer',    group: 'Litho',        status: 'Active' },
    { id: 'u_lena',  email: 'lena@northvale.com',  passHash: hash('demo1234'), name: 'Lena Park',    companyId: 'c_north', persona: 'buyer',    group: 'Etch',         status: 'Active' },
    { id: 'u_priya', email: 'priya@northvale.com', passHash: hash('demo1234'), name: 'Priya Rao',    companyId: 'c_north', persona: 'engineer', group: 'Litho',        status: 'Active' },
    { id: 'u_marc',  email: 'marcus@northvale.com',passHash: hash('demo1234'), name: 'Marcus Vogel', companyId: 'c_north', persona: 'engineer', group: 'Etch',         status: 'Invited' },
    { id: 'u_acme',  email: 'acme@forerun.dev',    passHash: hash('demo1234'), name: 'Alex Chen',    companyId: 'c_acme',  persona: 'supplier', group: '',             status: 'Active' }
  ];

  /* supplier operating profile per supplier company */
  const supplierProfiles = {
    c_acme:    { cats: ['cnc'],            rnd: true,  baseScore: 4.6, baseJobs: 41, ontime: 96, profileName: 'Acme Precision' },
    c_nord:    { cats: ['sheet', 'cnc'],   rnd: true,  baseScore: 4.1, baseJobs: 12, ontime: 88, profileName: 'Nord Fab' },
    c_titan:   { cats: ['cnc', 'rework'],  rnd: true,  baseScore: 4.8, baseJobs: 58, ontime: 97, profileName: 'Titan Machining' },
    c_west:    { cats: ['cnc'],            rnd: true,  baseScore: 3.9, baseJobs: 19, ontime: 90, profileName: 'Westline Tool' },
    c_lumen:   { cats: ['quartz'],         rnd: true,  baseScore: 4.5, baseJobs: 27, ontime: 94, profileName: 'Lumen Quartz' },
    c_flowtek: { cats: ['gas'],            rnd: false, baseScore: 4.3, baseJobs: 33, ontime: 95, profileName: 'Flowtek Lines' }
  };

  const rfqs = [
    { id: 'VF-6061-204', buyerCompanyId: 'c_north', title: 'Vacuum flange, 6061-T6', cat: 'cnc', qty: 12, product: 'Litho stage', costCenter: 'RND-LITHO-204',
      reqs: 'Tolerance ±0.05mm on bore ID. Hard anodized. Test batch ahead of production qualification.', vaultLink: 'scv://northvale-vault/rfq/VF-6061-204',
      nda: 'category', autoExtend: true, status: 'open', closesAt: now + 2 * D + 4 * H, createdBy: 'u_sam', engineer: 'Priya Rao', createdAt: now - 5 * D },
    { id: 'CMB-330', buyerCompanyId: 'c_north', title: 'Chamber mounting bracket', cat: 'sheet', qty: 20, product: 'Etch chamber', costCenter: 'RND-ETCH-118',
      reqs: '304 SS, 3mm. Bead-blast finish. Weldment per drawing.', vaultLink: 'scv://northvale-vault/rfq/CMB-330',
      nda: 'category', autoExtend: true, status: 'open', closesAt: now + 1 * D + 9 * H, createdBy: 'u_sam', engineer: 'Marcus Vogel', createdAt: now - 3 * D },
    { id: 'SV-300', buyerCompanyId: 'c_north', title: 'Slit valve plate', cat: 'cnc', qty: 12, product: 'Litho stage', costCenter: 'RND-LITHO-204',
      reqs: 'A2 tool steel, hardened. Lapped sealing face.', vaultLink: 'scv://northvale-vault/rfq/SV-300',
      nda: 'category', autoExtend: true, status: 'open', closesAt: now - 6 * H, createdBy: 'u_sam', engineer: 'Priya Rao', createdAt: now - 8 * D },
    { id: 'GM-512', buyerCompanyId: 'c_north', title: 'Process gas manifold', cat: 'gas', qty: 6, product: 'Deposition module', costCenter: 'RND-DEP-330',
      reqs: '316L electropolished. Orbital welds. Helium leak test to 1e-9.', vaultLink: 'scv://northvale-vault/rfq/GM-512',
      nda: 'category', autoExtend: false, status: 'open', closesAt: now + 3 * D, createdBy: 'u_lena', engineer: 'Priya Rao', createdAt: now - 2 * D },
    { id: 'EA-204R', buyerCompanyId: 'c_north', title: 'Electrode assembly rework', cat: 'rework', qty: 8, product: 'Etch chamber', costCenter: 'RND-ETCH-118',
      reqs: 'Re-machine seat and re-plate. Existing parts supplied by buyer.', vaultLink: 'scv://northvale-vault/rfq/EA-204R',
      nda: 'none', autoExtend: true, status: 'awarded', closesAt: now - 3 * D, createdBy: 'u_lena', engineer: 'Marcus Vogel', createdAt: now - 10 * D },
    { id: 'QV-110', buyerCompanyId: 'c_asml', title: 'Quartz viewport window', cat: 'quartz', qty: 4, product: 'Inspection module', costCenter: 'ASML-INSP-01',
      reqs: 'Optical-grade fused silica. Scratch-dig 40-20. Edges chamfered.', vaultLink: 'scv://asml-vault/rfq/QV-110',
      nda: 'drawing', autoExtend: true, status: 'open', closesAt: now + 5 * H, createdBy: 'u_sam', engineer: 'Marcus Vogel', createdAt: now - 2 * D },
    { id: 'AI-076', buyerCompanyId: 'c_asml', title: 'Alumina insulator ring', cat: 'quartz', qty: 15, product: 'Inspection module', costCenter: 'ASML-INSP-01',
      reqs: '99.5% alumina, fired. Ground flat both faces.', vaultLink: 'scv://asml-vault/rfq/AI-076',
      nda: 'drawing', autoExtend: true, status: 'open', closesAt: now + 1 * D + 2 * H, createdBy: 'u_sam', engineer: 'Marcus Vogel', createdAt: now - 1 * D },
    { id: 'LP-088', buyerCompanyId: 'c_north', title: 'Lift pin housing', cat: 'cnc', qty: 30, product: 'Litho stage', costCenter: 'RND-LITHO-204',
      reqs: 'Aluminum 6061. Hard anodize. Bore concentricity 0.01mm.', vaultLink: 'scv://northvale-vault/rfq/LP-088',
      nda: 'category', autoExtend: true, status: 'open', closesAt: now + 2 * D, createdBy: 'u_sam', engineer: 'Priya Rao', createdAt: now - 2 * D },
    { id: 'CT-450', buyerCompanyId: 'c_orion', title: 'Cable tray weldment', cat: 'sheet', qty: 10, product: 'Frame', costCenter: 'OM-FRAME-2',
      reqs: 'Aluminum 5052. TIG welded. Powder coat.', vaultLink: 'scv://orion-vault/rfq/CT-450',
      nda: 'none', autoExtend: true, status: 'open', closesAt: now + 5 * D, createdBy: 'u_sam', engineer: 'Priya Rao', createdAt: now - 1 * D },
    { id: 'EA-205R', buyerCompanyId: 'c_orion', title: 'Electrode assembly rework (B)', cat: 'rework', qty: 8, product: 'Etch legacy', costCenter: 'OM-ETCH-1',
      reqs: 'Re-machine seat and re-plate. Existing parts supplied by buyer.', vaultLink: 'scv://orion-vault/rfq/EA-205R',
      nda: 'none', autoExtend: true, status: 'open', closesAt: now + 4 * D + 6 * H, createdBy: 'u_sam', engineer: 'Priya Rao', createdAt: now - 1 * D }
  ];

  const bids = [
    { id: 'b1', rfqId: 'SV-300', supplierCompanyId: 'c_nord',  unit: 95,  ship: 40, incoterms: 'FOB Origin', lead: 14, notes: '', revised: false, at: now - 1 * D },
    { id: 'b2', rfqId: 'SV-300', supplierCompanyId: 'c_titan', unit: 105, ship: 50, incoterms: 'DAP',        lead: 7,  notes: '', revised: false, at: now - 1 * D },
    { id: 'b3', rfqId: 'SV-300', supplierCompanyId: 'c_acme',  unit: 100, ship: 40, incoterms: 'FOB Origin', lead: 9,  notes: '', revised: true,  at: now - 20 * H },
    { id: 'b4', rfqId: 'SV-300', supplierCompanyId: 'c_west',  unit: 103, ship: 59, incoterms: 'EXW',        lead: 11, notes: '', revised: false, at: now - 18 * H },
    { id: 'b5', rfqId: 'VF-6061-204', supplierCompanyId: 'c_acme',  unit: 98, ship: 45, incoterms: 'FOB Origin', lead: 9, notes: '', revised: false, at: now - 10 * H },
    { id: 'b6', rfqId: 'VF-6061-204', supplierCompanyId: 'c_titan', unit: 104, ship: 50, incoterms: 'DAP', lead: 6, notes: '', revised: false, at: now - 8 * H },
    { id: 'b7', rfqId: 'GM-512', supplierCompanyId: 'c_flowtek', unit: 140, ship: 40, incoterms: 'FOB Origin', lead: 12, notes: '', revised: false, at: now - 6 * H },
    { id: 'b8', rfqId: 'LP-088', supplierCompanyId: 'c_acme', unit: 68, ship: 60, incoterms: 'FOB Origin', lead: 8, notes: '', revised: false, at: now - 5 * H },
    { id: 'b9', rfqId: 'LP-088', supplierCompanyId: 'c_titan', unit: 64, ship: 60, incoterms: 'DAP', lead: 7, notes: '', revised: false, at: now - 4 * H }
  ];

  const declines = [
    { rfqId: 'SV-300', supplierCompanyId: null, supplierName: 'Coastal CNC', reason: 'Capacity — no open slot before your need-by date' },
    { rfqId: 'SV-300', supplierCompanyId: null, supplierName: 'Apex Micro', reason: 'Bore tolerance exceeds our process capability' }
  ];

  const addenda = {
    'VF-6061-204': [{ q: 'Is the ±0.05mm tolerance on the bore ID or the flange face?', a: 'Bore ID. Flange face is ±0.1mm — note 3 on the drawing updated.', at: 'Priya Rao', bidders: 2 }]
  };

  const orders = [
    { id: 'ORD-1001', rfqId: 'HB-211', buyerCompanyId: 'c_north', supplierCompanyId: 'c_acme', title: 'Heater bracket', cat: 'sheet', qty: 20, price: 540,
      stage: 'shipped', due: 'Jul 14', tracking: '7712 3480 1123', delayed: false, delayReason: '', buyer: 'Sam Ortiz', engineer: 'Marcus Vogel', product: 'Etch chamber' },
    { id: 'ORD-1002', rfqId: 'EA-204R', buyerCompanyId: 'c_north', supplierCompanyId: 'c_titan', title: 'Electrode assembly rework', cat: 'rework', qty: 8, price: 1310,
      stage: 'manufacturing', due: 'Jul 10', tracking: null, delayed: true, delayReason: 'Raw material lead time slipped 4 days; new ship date Jul 16.', buyer: 'Lena Park', engineer: 'Marcus Vogel', product: 'Etch chamber' },
    { id: 'ORD-1003', rfqId: 'GM-401', buyerCompanyId: 'c_north', supplierCompanyId: 'c_flowtek', title: 'Gas manifold (pilot)', cat: 'gas', qty: 6, price: 920,
      stage: 'delivered', due: 'Jul 2', tracking: '5561 9902 7781', delayed: false, delayReason: '', buyer: 'Sam Ortiz', engineer: 'Priya Rao', product: 'Deposition module' },
    { id: 'ORD-1004', rfqId: 'SVX-290', buyerCompanyId: 'c_north', supplierCompanyId: 'c_acme', title: 'Slit valve plate (pilot)', cat: 'cnc', qty: 12, price: 1650,
      stage: 'manufacturing', due: 'Jul 20', tracking: null, delayed: false, delayReason: '', buyer: 'Sam Ortiz', engineer: 'Priya Rao', product: 'Litho stage' }
  ];

  const reviews = [
    { orderId: 'ORD-0900', supplierCompanyId: 'c_acme', title: 'Slit valve plate', part: 'SV-290', rating: 5, note: 'Met spec, delivered 2 days early. Excellent finish.', at: now - 12 * D },
    { orderId: 'ORD-0901', supplierCompanyId: 'c_flowtek', title: 'Gas manifold (pilot)', part: 'GM-401', rating: 4, note: 'Good part; minor cosmetic scuff on one unit, accepted.', at: now - 6 * D }
  ];

  const threads = [
    { id: 1, rfqId: 'VF-6061-204', buyerCompanyId: 'c_north', supplierCompanyId: 'c_acme', unreadFor: 'buyer',
      msgs: [{ from: 'sup', name: 'Alex Chen', text: 'Is the ±0.05mm tolerance on the bore ID or the flange face?', t: '9:12' },
             { from: 'eng', name: 'Priya Rao', text: 'Bore ID. Flange face is ±0.1mm — I updated note 3 on the drawing.', t: '9:20' },
             { from: 'sup', name: 'Alex Chen', text: 'Got it, thanks. Submitting our bid today.', t: '9:24' }] },
    { id: 2, rfqId: 'EA-204R', buyerCompanyId: 'c_north', supplierCompanyId: 'c_titan', unreadFor: null,
      msgs: [{ from: 'sup', name: 'Titan Machining', text: 'Heads-up: material lead time slipped 4 days. Flagging a delay in the tracker.', t: 'Mon' },
             { from: 'buy', name: 'Lena Park', text: 'Acknowledged — let\'s catch up on a call if the new date moves again.', t: 'Mon' }] }
  ];

  const notifications = [
    { id: 1, companyId: 'c_north', role: null, icon: 'ti-gavel', text: 'New bid from Titan Machining on Slit valve plate (SV-300)', when: '2h ago', unread: true, link: { view: 'rfq', arg: 'SV-300' } },
    { id: 2, companyId: 'c_north', role: null, icon: 'ti-clock-exclamation', text: 'Electrode rework (ORD-1002) reported a 4-day delay', when: 'Yesterday', unread: true, link: { view: 'tracking', arg: 'delayed' } },
    { id: 3, companyId: 'c_acme', role: null, icon: 'ti-file-text', text: 'New opportunity: Lift pin housing (LP-088) — Northvale Semiconductor', when: '1h ago', unread: true, link: { view: 'opp', arg: 'LP-088' } },
    { id: 4, companyId: 'c_acme', role: null, icon: 'ti-clock', text: 'Chamber mounting bracket (CMB-330) closes in 1d 9h', when: 'today', unread: false, link: { view: 'opp', arg: 'CMB-330' } }
  ];

  const audit = [
    { t: 'Jul 11 · 14:22', companyIds: ['c_north', 'c_titan'], actor: 'Titan Machining', action: 'Submitted bid', target: 'SV-300', kind: 'bid' },
    { t: 'Jul 11 · 13:48', companyIds: ['c_north', 'c_acme'], actor: 'Acme Precision', action: 'Revised bid', target: 'SV-300', kind: 'bid' },
    { t: 'Jul 11 · 13:10', companyIds: ['c_north', 'c_nord'], actor: 'Nord Fab', action: 'Viewed drawing in vault', target: 'SV-300', kind: 'view' },
    { t: 'Jul 10 · 15:07', companyIds: ['c_north'], actor: 'Priya Rao (Engineer)', action: 'Posted addendum to bidders', target: 'VF-6061-204', kind: 'addendum' },
    { t: 'Jul 10 · 11:05', companyIds: ['c_north'], actor: 'Sam Ortiz (Buyer)', action: 'Published RFQ', target: 'VF-6061-204', kind: 'rfq' }
  ];

  return {
    __seeded: true, version: 3, seq: 2000,
    companies, users, supplierProfiles, rfqs, bids, declines, addenda, orders, reviews, threads,
    notifications, audit,
    savedByUser: { u_acme: ['AI-076'] },
    ndas: [],            // {rfqId, supplierCompanyId, by, at}
    groupsByCompany: { c_north: ['Supply Chain', 'Litho', 'Etch', 'Deposition'] },
    settingsByCompany: { c_north: { showPricingToEngineers: false } },
    profiles             // research/diligence profiles keyed by supplier display name
  };
}

module.exports = { seed };
