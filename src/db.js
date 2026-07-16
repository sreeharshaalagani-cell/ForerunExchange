'use strict';
/*
 * Persistence layer. Uses Postgres when DATABASE_URL is set (state stored as a
 * single JSONB document), otherwise falls back to an atomic JSON file on disk.
 * Both expose the same async interface: init(), load() -> doc|null, save(doc).
 */
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

/* ---------------- Postgres backend ---------------- */
function pgBackend() {
  const { Pool } = require('pg');
  const ssl = /railway|render|heroku|amazonaws|supabase|neon/.test(DATABASE_URL) || process.env.PGSSL === '1'
    ? { rejectUnauthorized: false } : undefined;
  const pool = new Pool({ connectionString: DATABASE_URL, ssl });

  async function init() {
    await pool.query('CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY, doc JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())');
  }
  async function load() {
    const r = await pool.query('SELECT doc FROM app_state WHERE id = 1');
    return r.rows[0] ? r.rows[0].doc : null;
  }
  async function save(doc) {
    await pool.query(
      'INSERT INTO app_state (id, doc, updated_at) VALUES (1, $1, now()) ' +
      'ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()',
      [doc]
    );
  }
  return { init, load, save, kind: 'postgres' };
}

/* ---------------- JSON-file backend ---------------- */
function fileBackend() {
  const DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  const FILE = path.join(DIR, 'state.json');
  async function init() { try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) {} }
  async function load() {
    try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return null; }
  }
  async function save(doc) {
    try { fs.mkdirSync(DIR, { recursive: true }); } catch (e) {}
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(doc));
    fs.renameSync(tmp, FILE);
  }
  return { init, load, save, kind: 'file:' + FILE };
}

module.exports = DATABASE_URL ? pgBackend() : fileBackend();
