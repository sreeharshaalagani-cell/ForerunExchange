# Forerun Exchange

A reverse-auction procurement marketplace for **semiconductor R&D parts**. Buyers post RFQs, pre-qualified suppliers bid competitively, and the platform handles award, tracking, quality scorecards, chat, and a full audit trail — while drawings/IP stay in the customer's own vault.

This repository is a runnable **Node.js + Express** application (not just a static mock) with a persistent datastore, ready to deploy on **Railway**.

## Run locally

```bash
npm install
npm start
# open http://localhost:3000
```

By default state is written to `./data/state.json`. Delete that file (or `POST /api/reset`) to reseed from the built-in demo data.

## Architecture

- **`server.js`** — Express server. Serves the SPA from `public/` and exposes a small JSON API.
- **`src/store.js`** — tiny atomic JSON datastore (single document on disk).
- **`public/`** — the single-page app (`index.html`, `styles.css`, `app.js`).
- The server is the system of record. The client hydrates from `GET /api/state` on load and syncs mutations back via a debounced `PUT /api/state`, so RFQs, bids, awards, orders, chat, notifications, and the audit trail persist across reloads.

### API

| Method | Path           | Purpose                                   |
|--------|----------------|-------------------------------------------|
| GET    | `/api/health`  | Health check                              |
| GET    | `/api/state`   | Read full application state (`null` if unseeded) |
| PUT    | `/api/state`   | Persist full application state            |
| POST   | `/api/reset`   | Wipe persisted state (reseeds on next load) |

## Deploy to Railway

1. Push this repo to GitHub (already done).
2. In Railway: **New Project → Deploy from GitHub repo → select this repo.** Railway auto-detects Node (Nixpacks), runs `npm install`, then `npm start`. `PORT` is injected automatically.
3. **Persistence (recommended):** add a **Volume** to the service, mount it at `/data`, and set the variable `DATA_DIR=/data`. Without a volume the app still runs, but state resets on each redeploy.
4. Open the generated URL. Optionally add a custom domain in Railway → Settings → Networking.

CLI alternative:

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

## Environment variables

| Variable   | Default        | Notes                                            |
|------------|----------------|--------------------------------------------------|
| `PORT`     | `3000`         | Set automatically by Railway.                    |
| `DATA_DIR` | `./data`       | Point at a mounted volume for durable storage.   |

## Notes & roadmap

This is an MVP for demos and pilot use. Business logic currently runs client-side with the server acting as the persistent store (last-write-wins, single tenant). Natural next steps: per-resource REST endpoints with server-side validation, authentication with real accounts/SSO, per-company multi-tenancy isolation, and moving anti-sniping/window timers server-side.

The repository root also keeps a **standalone static copy** of the UI in `index.html` (no backend, state held in-memory). It is what GitHub Pages publishes at the project's custom domain; the deployable app lives under `server.js` + `public/`.
