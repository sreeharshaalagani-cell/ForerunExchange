'use strict';
/*
 * Forerun Exchange — application server.
 * Auth + registration + validated, role-authorized REST endpoints.
 * All business logic lives in src/model.js.
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const model = require('./src/model');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const COOKIE = 'fx_session';
const cookieOpts = { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 };

function requireAuth(req, res, next) {
  const u = model.userForToken(req.cookies[COOKIE]);
  if (!u) return res.status(401).json({ error: 'Not authenticated' });
  req.user = u; next();
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'forerun-exchange', time: new Date().toISOString() }));

/* ---- auth & registration ---- */
app.post('/api/login', (req, res) => {
  try {
    const { token, user } = model.login(req.body.email, req.body.password);
    res.cookie(COOKIE, token, cookieOpts);
    res.json({ ok: true, state: model.viewerState(user) });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});
app.post('/api/logout', (req, res) => { model.logout(req.cookies[COOKIE]); res.clearCookie(COOKIE); res.json({ ok: true }); });

async function register(kind, req, res) {
  try {
    const u = kind === 'buyer' ? await model.registerBuyer(req.body || {}) : await model.registerSupplier(req.body || {});
    const { token } = model.login(u.email, req.body.password);
    res.cookie(COOKIE, token, cookieOpts);
    res.json({ ok: true, state: model.viewerState(u) });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
}
app.post('/api/registerBuyer', (req, res) => register('buyer', req, res));
app.post('/api/registerSupplier', (req, res) => register('supplier', req, res));

/* ---- state ---- */
app.get('/api/state', requireAuth, (req, res) => res.json({ state: model.viewerState(req.user) }));

/* ---- operations (role authorization inside the model) ---- */
const OPS = ['toggleSave', 'viewVault', 'signNda', 'submitBid', 'declineBid', 'updateCompanyProfile',
  'openThread', 'postMessage',
  'createRfq', 'publishDraft', 'closeWindow', 'duplicateRfq', 'award',
  'advanceOrder', 'addTracking', 'reportDelay', 'reviewOrder', 'reorder',
  'readNotif', 'markAllRead',
  'addUser', 'updateUserRole', 'addGroup', 'updateSettings'];
for (const name of OPS) {
  app.post('/api/' + name, requireAuth, async (req, res) => {
    try {
      const result = await model.ops[name](req.user, req.body || {});
      res.json({ ok: true, ...result, state: model.viewerState(req.user) });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message, state: model.viewerState(req.user) });
    }
  });
}

/* ---- admin: reset demo data ---- */
app.post('/api/reset', requireAuth, async (req, res) => {
  if (req.user.persona !== 'admin') return res.status(403).json({ error: 'Admins only' });
  await model.reset(); res.clearCookie(COOKIE); res.json({ ok: true });
});

/* ---- static + SPA fallback ---- */
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
model.init().then(() => {
  app.listen(PORT, () => console.log(`Forerun Exchange listening on :${PORT}`));
}).catch(e => { console.error('Failed to initialize:', e); process.exit(1); });
