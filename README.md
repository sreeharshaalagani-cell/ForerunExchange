# Forerun Exchange

A reverse-auction procurement marketplace for **semiconductor R&D parts**. Buyers post RFQs, pre-qualified suppliers bid competitively, and the platform handles award, tracking, quality scorecards, chat, and a full audit trail — while drawings/IP stay in the customer's own vault.

Runnable **Node.js + Express** app with authentication, server-side business logic, and a persistent datastore (Postgres or JSON file). Ready to deploy on **Railway**.

## Run locally

```bash
npm install
npm start
# open http://localhost:3000
```

Sign in with a demo account (password **`demo1234`**):

| Account | Email | Sees |
|---|---|---|
| Supplier (Acme) | `acme@forerun.dev` | Opportunities, bids, own orders |
| Buyer · Admin | `dana@northvale.com` | Everything incl. user/role admin |
| Buyer | `sam@northvale.com` | RFQs, award, tracking, scorecards |
| Engineer | `priya@northvale.com` | RFQs & tracking, **prices masked, cannot award** |

The sidebar Supplier/Buyer + Admin/Buyer/Engineer controls switch between these demo accounts (real re-login under the hood).

## Architecture

- **`server.js`** — Express server: auth (bcrypt + cookie sessions), validated REST endpoints, static SPA.
- **`src/model.js`** — the domain model. **All mutations run here, server-side, with validation and role-based authorization.** The client never mutates state directly.
- **`src/db.js`** — persistence: Postgres (JSONB document) when `DATABASE_URL` is set, else an atomic JSON file.
- **`src/seed.js` / `src/profiles.js`** — initial seed data.
- **`public/`** — the SPA. It authenticates, pulls viewer-scoped state from `GET /api/state`, and calls one endpoint per action; the server returns the fresh state.

### Server-enforced rules (not just UI)

- **Auth required** for every `/api/*` operation (401 otherwise).
- **Price masking:** engineers get `null` bid/order prices unless an admin enables "show pricing to engineers".
- **Award authorization:** only Buyer/Admin can award; **engineers are blocked (403)**.
- **Award validation:** window must be closed; flagged suppliers require explicit `ackFlags`; split awards must sum to the RFQ quantity.
- **Ownership checks:** suppliers can only advance/track/delay their own orders.

### API (all POST unless noted, all require the session cookie)

`login`, `logout`, `GET /api/state`, `GET /api/health`, `toggleSave`, `viewVault`, `signNda`, `submitBid`, `declineBid`, `postMessage`, `award`, `advanceOrder`, `addTracking`, `reportDelay`, `reviewOrder`, `reorder`, `duplicateRfq`, `publishRfq`, `readNotif`, `markAllRead`, `addUser`, `updateUserRole`, `updateSettings`, `reset` (admin).

## Deploy to Railway

1. **New Project → Deploy from GitHub repo → this repo.** Railway auto-detects Node (Nixpacks) → `npm install` → `npm start`. `PORT` is injected.
2. **Persistence — pick one:**
   - **Postgres (recommended):** add a Postgres database in Railway. It sets `DATABASE_URL` automatically; the app creates its table and stores state there.
   - **Volume:** add a Volume mounted at `/data` and set `DATA_DIR=/data` to keep the JSON-file store across redeploys.
   - Neither: still runs, but state resets on each redeploy.
3. Open the generated URL and sign in with a demo account.

CLI: `npm i -g @railway/cli && railway login && railway init && railway up`

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | Set by Railway. |
| `DATABASE_URL` | — | If present, use Postgres (JSONB). |
| `DATA_DIR` | `./data` | JSON-file store path (used when no `DATABASE_URL`). |
| `PGSSL` | — | Set `1` to force TLS for Postgres if needed. |

## Notes & roadmap

Sessions are in-memory (fine for a single instance; they reset on restart). Passwords are demo credentials — replace the seed and wire real SSO/accounts for production. State is a single JSON/JSONB document (last-write-wins); a normalized relational schema and per-company tenant isolation are the next steps as concurrency grows.

The repository root also keeps a **standalone static copy** of the UI in `index.html` (no backend) that GitHub Pages publishes at the project's custom domain; the deployable app lives under `server.js` + `public/`.
