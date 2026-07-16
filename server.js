'use strict';
/*
 * Forerun Exchange — application server.
 * Auth + validated REST endpoints; all business logic lives in src/model.js.
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

function currentAccount(req) { return model.accountForToken(req.cookies[COOKIE]); }
function requireAuth(req, res, next) {
  const a = currentAccount(req);
  if (!a) return res.status(401).json({ error: 'Not authenticated' });
  req.account = a; next();
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'forerun-exchange', time: new Date().toISOString() }));

/* ---- auth ---- */
app.post('/api/login', (req, res) => {
  try {
    const { token, account } = model.login(req.body.email, req.body.password);
    res.cookie(COOKIE, token, cookieOpts);
    res.json({ ok: true, state: model.viewerState(account) });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});
app.post('/api/logout', (req, res) => { model.logout(req.cookies[COOKIE]); res.clearCookie(COOKIE); res.json({ ok: true }); });

/* ---- state ---- */
app.get('/api/state', requireAuth, (req, res) => res.json({ state: model.viewerState(req.account) }));

/* ---- operations ---- */
const OPS = ['toggleSave', 'viewVault', 'signNda', 'submitBid', 'declineBid', 'postMessage', 'award',
  'advanceOrder', 'addTracking', 'reportDelay', 'reviewOrder', 'reorder', 'duplicateRfq', 'publishRfq',
  'readNotif', 'markAllRead', 'addUser', 'updateUserRole', 'updateSettings'];
for (const name of OPS) {
  app.post('/api/' + name, requireAuth, async (req, res) => {
    try {
      const result = await model.ops[name](req.account, req.body || {});
      res.json({ ok: true, msg: result.msg || '', state: model.viewerState(req.account) });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message, state: model.viewerState(req.account) });
    }
  });
}

/* ---- admin: reset (demo convenience) ---- */
app.post('/api/reset', requireAuth, async (req, res) => {
  if (!(req.account.role === 'buyer' && req.account.persona === 'admin')) return res.status(403).json({ error: 'Admins only' });
  await model.reset(); res.json({ ok: true });
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
}).catch(err => { console.error('Failed to initialize:', err); process.exit(1); });
