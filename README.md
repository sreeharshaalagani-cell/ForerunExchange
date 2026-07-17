# Forerun Exchange

A reverse-auction procurement marketplace for **semiconductor R&D parts**. Buyers post RFQs, pre-qualified suppliers bid competitively, and the platform handles award, tracking, quality scorecards, chat, and a full audit trail — while drawings/IP stay in the customer's own vault.

Runnable **Node.js + Express** app with authentication, server-side business logic, and a persistent datastore (Postgres or JSON file). Ready to deploy on **Railway**.

## Run locally

```bash
npm install
npm start
# open http://localhost:3000
```

**Self-serve registration:** create a *Buyer workspace* (you become its admin and invite buyers/engineers with temporary passwords) or *Register as supplier* (pick capability categories; the Research Agent marks you "verification pending" until diligence completes).

**Demo accounts** (password `demo1234`) — each role gets different functionality, enforced server-side:

| Account | Email | Role-driven functionality |
|---|---|---|
| Supplier | `acme@forerun.dev` | Opportunities in qualified categories, NDA-gated bidding, own orders/tracking/delays, scorecard, company profile |
| Engineer | `priya@northvale.com` | Create RFQs, answer questions/addenda, tracking — **prices masked, cannot award/close windows** |
| Buyer | `sam@northvale.com` | Engineer + prices, close bid windows, single/split awards (flag-ack), quality reviews, reorder |
| Admin | `dana@northvale.com` | Buyer + users/roles/groups, pricing-visibility setting |

## Architecture

- **`server.js`** — Express server: auth (bcrypt + cookie sessions), validated REST endpoints, static SPA.
- **`src/model.js`** — the domain model. **All mutations run here, server-side, with validation and role-based authorization.** The client never mutates state directly.
- **`src/db.js`** — persistence: Postgres (JSONB document) when `DATABASE_URL` is set, else an atomic JSON file.
- **`src/seed.js` / `src/profiles.js`** — initial seed data.
- **`public/`** — the SPA. It authenticates, pulls viewer-scoped state from `GET /api/state`, and calls one endpoint per action; the server returns the fresh state.

### Server-enforced rules (not just UI)

- **Multi-tenant isolation:** buyers see only their company's RFQs/orders/audit; suppliers see only opportunities matching their capability categories and their own bids/orders.
- **Role authorization:** engineers cannot award, close windows, or review quality (403); only admins manage users/settings; suppliers cannot touch buyer-side ops and vice-versa.
- **Price masking:** engineers receive null prices from the API unless their admin enables visibility.
- **Bid rules:** NDA must be signed before bidding (when required); real time-based windows; anti-sniping auto-extends the window 10 min on late bids; bids revisable until close.
- **Award rules:** window must be closed (or closed early by a buyer); flagged suppliers — including newly registered "verification pending" ones — require explicit acknowledgment; split awards must sum to the RFQ quantity.
- **Scorecards are computed** from real quality reviews on closed jobs.

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
