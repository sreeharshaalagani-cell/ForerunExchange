'use strict';
/*
 * Forerun Exchange — application server.
 * Serves the single-page app from /public and persists application state
 * through a tiny JSON store. The client hydrates from GET /api/state and
 * syncs mutations back via PUT /api/state.
 */
const express = require('express');
const path = require('path');
const store = require('./src/store');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));

// health check (useful for Railway)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'forerun-exchange', time: new Date().toISOString() });
});

// read the whole application state (null if never seeded)
app.get('/api/state', (req, res) => {
  res.json(store.load());
});

// persist the whole application state
app.put('/api/state', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'state must be a JSON object' });
  }
  store.save(body);
  res.json({ ok: true });
});

// wipe persisted state (re-seeds from the client's built-in defaults on next load)
app.post('/api/reset', (req, res) => {
  store.clear();
  res.json({ ok: true });
});

// static assets
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// SPA fallback for any non-API route
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Forerun Exchange listening on :${PORT}  (data dir: ${store.DIR})`);
});
