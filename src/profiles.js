'use strict';
/* Supplier diligence profiles (supplier-provided + Research Agent findings). */
module.exports = {
 'Acme Precision': { id: 'SUP-0007', cats: ['cnc'], score: 4.6,
   provided: { about: 'Family-owned precision machine shop specializing in tight-tolerance aluminum and stainless components for semiconductor capital equipment.', founded: 2009, location: 'San Jose, CA', employees: 48, leadtime: '7–10 days', capacity: '~30 active jobs',
     capabilities: ['5-axis CNC milling', 'CNC turning', 'Hard anodizing', 'In-house CMM'], materials: ['6061/7075 aluminum', '304/316 stainless', 'Titanium'], certs: ['ISO 9001:2015', 'AS9100D'] },
   research: { confidence: 88, summary: 'Established, well-reviewed shop with verified certifications and a strong on-platform delivery record. No risk flags identified.',
     findings: [
       { key: 'Certifications', status: 'verified', detail: 'ISO 9001:2015 and AS9100D confirmed active with registrar (exp. 2026).', source: 'NSF-ISR registry' },
       { key: 'Financial stability', status: 'strong', detail: '15+ years operating; no liens or bankruptcies on record.', source: 'D&B summary' },
       { key: 'Denied-party screening', status: 'clear', detail: 'No matches on OFAC / BIS / DDTC lists.', source: 'Consolidated Screening List' },
       { key: 'Compliance history', status: 'clear', detail: 'No quality disputes or compliance actions found.', source: 'Forerun history' },
       { key: 'Delivery performance', status: 'strong', detail: '96% on-time across 41 platform orders.', source: 'Forerun history' },
       { key: 'Corporate & ownership', status: 'clear', detail: 'US-incorporated, US-owned. No deemed-export exposure indicated.', source: 'CA SoS filings' }
     ], flags: [] } },
 'Nord Fab': { id: 'SUP-0014', cats: ['sheet', 'cnc'], score: 4.1,
   provided: { about: 'Sheet-metal fabrication shop expanding into CNC, serving industrial and semiconductor enclosures and brackets.', founded: 2015, location: 'Portland, OR', employees: 30, leadtime: '12–16 days', capacity: '~18 active jobs',
     capabilities: ['Laser cutting', 'Press brake', 'Welding', '3-axis CNC'], materials: ['Aluminum', '304 stainless', 'Cold-rolled steel'], certs: ['ISO 9001:2015'] },
   research: { confidence: 64, summary: 'Verified certification and clean screening, but a newer company with a softer delivery record. Worth confirming capacity before high-priority work.',
     findings: [
       { key: 'Certifications', status: 'verified', detail: 'ISO 9001:2015 confirmed active (exp. 2025).', source: 'registrar lookup' },
       { key: 'Financial stability', status: 'attention', detail: 'Founded 2015; thin public financials and limited credit history. Not adverse, but unestablished.', source: 'D&B summary' },
       { key: 'Denied-party screening', status: 'clear', detail: 'No denied-party matches.', source: 'Consolidated Screening List' },
       { key: 'Compliance history', status: 'clear', detail: 'No disputes found.', source: 'Forerun history' },
       { key: 'Delivery performance', status: 'attention', detail: '88% on-time across 12 orders; two recent late deliveries.', source: 'Forerun history' },
       { key: 'Corporate & ownership', status: 'clear', detail: 'US-incorporated, US-owned.', source: 'OR SoS filings' }
     ], flags: ['Lower on-time rate and limited track record — confirm capacity for the quantity before awarding.'] } },
 'Titan Machining': { id: 'SUP-0003', cats: ['cnc', 'rework'], score: 4.8,
   provided: { about: 'Full-service precision machining and rework house with defense-grade controls, serving semiconductor and aerospace primes.', founded: 2001, location: 'Austin, TX', employees: 75, leadtime: '5–8 days', capacity: '~60 active jobs',
     capabilities: ['5-axis CNC', 'Swiss turning', 'Reworks & refurb', 'EDM', 'CMM + laser scan'], materials: ['Aluminum', 'Stainless', 'Inconel', 'Titanium'], certs: ['ISO 9001:2015', 'AS9100D', 'ITAR registered'] },
   research: { confidence: 91, summary: 'Strong, well-established supplier with verified certifications including ITAR registration — relevant for controlled or defense-adjacent work. No flags.',
     findings: [
       { key: 'Certifications', status: 'verified', detail: 'ISO 9001:2015 and AS9100D active; ITAR registration confirmed with DDTC.', source: 'DDTC + registrar' },
       { key: 'Financial stability', status: 'strong', detail: '20+ years; healthy credit profile, no adverse filings.', source: 'D&B summary' },
       { key: 'Denied-party screening', status: 'clear', detail: 'No denied-party matches.', source: 'Consolidated Screening List' },
       { key: 'Compliance history', status: 'clear', detail: 'No disputes; ITAR-compliant handling on record.', source: 'Forerun history' },
       { key: 'Delivery performance', status: 'strong', detail: '97% on-time across 58 orders.', source: 'Forerun history' },
       { key: 'Corporate & ownership', status: 'clear', detail: 'US-incorporated, US-owned; cleared for controlled technical data.', source: 'TX SoS filings' }
     ], flags: [] } },
 'Westline Tool': { id: 'SUP-0021', cats: ['cnc'], score: 3.9,
   provided: { about: 'General CNC machining shop serving industrial and electronics customers.', founded: 2012, location: 'Phoenix, AZ', employees: 40, leadtime: '10–14 days', capacity: '~22 active jobs',
     capabilities: ['3- and 4-axis CNC', 'Anodizing (outsourced)', 'Manual machining'], materials: ['Aluminum', 'Mild steel', 'Stainless'], certs: ['ISO 9001:2015'] },
   research: { confidence: 52, summary: 'Two findings warrant review before award: the claimed ISO certificate appears lapsed, and corporate records indicate partial foreign ownership — relevant to deemed-export controls for sharing controlled drawings.',
     findings: [
       { key: 'Certifications', status: 'flag', detail: 'Claimed ISO 9001:2015 appears LAPSED — registrar shows certificate expired 2024 and not renewed.', source: 'registrar lookup' },
       { key: 'Financial stability', status: 'attention', detail: 'Adequate but modest; one tax lien resolved 2023.', source: 'D&B summary' },
       { key: 'Denied-party screening', status: 'clear', detail: 'No denied-party matches.', source: 'Consolidated Screening List' },
       { key: 'Compliance history', status: 'attention', detail: 'One quality dispute on platform (2024), resolved with rework.', source: 'Forerun history' },
       { key: 'Delivery performance', status: 'attention', detail: '90% on-time across 19 orders.', source: 'Forerun history' },
       { key: 'Corporate & ownership', status: 'flag', detail: 'Records indicate ~30% ownership by an overseas parent. Sharing controlled technical data may trigger deemed-export review.', source: 'AZ SoS + corporate filings' }
     ], flags: ['ISO certificate appears lapsed — confirm current quality system before award.', 'Partial foreign ownership — assess deemed-export exposure before sharing controlled drawings.'] } },
 'Lumen Quartz': { id: 'SUP-0009', cats: ['quartz'], score: 4.5,
   provided: { about: 'Specialist in optical-grade fused silica and technical ceramics for semiconductor process equipment.', founded: 2008, location: 'Fremont, CA', employees: 35, leadtime: '12–18 days', capacity: '~25 active jobs',
     capabilities: ['Quartz fabrication', 'Flame working', 'Precision grinding', 'Ceramic machining'], materials: ['Fused silica', 'Quartz', 'Alumina', 'Sapphire'], certs: ['ISO 9001:2015'] },
   research: { confidence: 84, summary: 'Well-regarded quartz and ceramics specialist with verified certification and clean screening.',
     findings: [
       { key: 'Certifications', status: 'verified', detail: 'ISO 9001:2015 active.', source: 'registrar lookup' },
       { key: 'Financial stability', status: 'strong', detail: 'Stable; no adverse filings.', source: 'D&B summary' },
       { key: 'Denied-party screening', status: 'clear', detail: 'No matches.', source: 'Consolidated Screening List' },
       { key: 'Delivery performance', status: 'strong', detail: '94% on-time across 27 orders.', source: 'Forerun history' },
       { key: 'Corporate & ownership', status: 'clear', detail: 'US-incorporated, US-owned.', source: 'CA SoS filings' }
     ], flags: [] } },
 'Flowtek Lines': { id: 'SUP-0017', cats: ['gas'], score: 4.3,
   provided: { about: 'Ultra-high-purity gas line and manifold fabrication with orbital welding and helium leak testing.', founded: 2006, location: 'Hillsboro, OR', employees: 52, leadtime: '10–15 days', capacity: '~30 active jobs',
     capabilities: ['Orbital welding', 'UHP cleaning', 'Helium leak test', 'Electropolishing'], materials: ['316L SS', 'Electropolished tube'], certs: ['ISO 9001:2015', 'ASME B31.3'] },
   research: { confidence: 86, summary: 'Established UHP line fabricator with verified certifications and strong delivery history.',
     findings: [
       { key: 'Certifications', status: 'verified', detail: 'ISO 9001:2015 active; ASME B31.3 process qualified.', source: 'registrar lookup' },
       { key: 'Financial stability', status: 'strong', detail: 'Stable; no adverse filings.', source: 'D&B summary' },
       { key: 'Denied-party screening', status: 'clear', detail: 'No matches.', source: 'Consolidated Screening List' },
       { key: 'Delivery performance', status: 'strong', detail: '95% on-time across 33 orders.', source: 'Forerun history' },
       { key: 'Corporate & ownership', status: 'clear', detail: 'US-incorporated, US-owned.', source: 'OR SoS filings' }
     ], flags: [] } }
};
