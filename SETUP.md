# Local Setup Guide

Run this app on any laptop in under 5 minutes. The app talks to the same Lovable Cloud backend regardless of which machine runs it, so all data, users, and AI usage are shared.

## Prerequisites

- **Node.js 18+** — check with `node -v`. Get it from [nodejs.org](https://nodejs.org/) or via [nvm](https://github.com/nvm-sh/nvm).
- **npm** (comes with Node) or **bun** (`npm i -g bun`) — either works.
- **Git** — to clone the repo.

## Steps

### 1. Clone the repo

```bash
git clone <your-github-repo-url>
cd <repo-folder>
```

### 2. Install dependencies

```bash
npm install
# or, faster:
bun install
```

### 3. Create your `.env` file

The `.env` file is intentionally git-ignored, so it does **not** come down with `git clone`. You have to create it on every new machine:

```bash
cp .env.example .env
```

The values in `.env.example` are the real public anon key and project ID for this app's Lovable Cloud backend — they're safe to commit and safe to share. No edits needed.

### 4. Start the dev server

```bash
npm run dev
# or:
bun run dev
```

Open [http://localhost:8080](http://localhost:8080).

That's it. You should see the app, log in with your existing account, and see all your real data.

---

## What runs locally vs. what runs on Lovable

| Layer | Where it runs |
|---|---|
| Frontend (React/Vite) | **Local** — hot-reloads as you edit |
| Database (Postgres) | Lovable Cloud — shared across all environments |
| Auth (sign-up / login) | Lovable Cloud |
| Edge functions (AI, email, PayPal, etc.) | Lovable Cloud — already deployed |
| File storage | Lovable Cloud |

This means:
- You can edit UI / React code locally and see changes instantly.
- You **cannot** deploy edge function changes or run database migrations from your laptop. Those still need to go through Lovable (or via `supabase` CLI if you go fully self-hosted — see `docs/SELF_HOSTING.md`).

## Common issues

**"Missing environment variable VITE_SUPABASE_URL"**
You skipped step 3. Run `cp .env.example .env`.

**Port 8080 already in use**
Edit `vite.config.ts` and change `port: 8080` to something free, e.g. `5173`.

**Login works but no data shows up**
You're logged in as a different user than your production account. Sign up / log in with the same email you use on the deployed app.

**`npm install` errors about peer dependencies**
Use `npm install --legacy-peer-deps`, or switch to `bun install`.

## Useful scripts

```bash
npm run dev        # start dev server (port 8080)
npm run build      # production build into dist/
npm run preview    # preview the production build locally
npm run test       # run vitest tests
```

## Going further

- **Deploying outside Lovable** → see [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md) and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- **Database schema** → see [`docs/DATABASE.md`](docs/DATABASE.md)
- **Edge functions** → see [`docs/EDGE_FUNCTIONS.md`](docs/EDGE_FUNCTIONS.md)
- **Product overview** → see [`docs/PRODUCT_BIBLE.md`](docs/PRODUCT_BIBLE.md)
