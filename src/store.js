'use strict';
/*
 * Tiny persistent JSON datastore.
 * The whole application state is stored as a single JSON document on disk.
 * On Railway, set DATA_DIR to a mounted volume path (e.g. /data) so state
 * survives redeploys; without a volume it still works but resets on redeploy.
 */
const fs = require('fs');
const path = require('path');

const DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DIR, 'state.json');

function ensureDir() {
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) { /* ignore */ }
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    return null; // no state yet, or unreadable
  }
}

function save(obj) {
  ensureDir();
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, FILE); // atomic replace
}

function clear() {
  try { fs.unlinkSync(FILE); } catch (e) { /* ignore */ }
}

module.exports = { load, save, clear, FILE, DIR };
