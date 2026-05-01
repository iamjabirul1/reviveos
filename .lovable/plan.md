
# Make the project easy to clone and run anywhere

## Why

The GitHub repo connected to this project is empty, and even once it syncs, anyone cloning it on a new laptop needs clear instructions to get the app running locally against the existing Lovable Cloud backend. Right now `.env.example` has placeholder values and there is no top-level setup guide.

I'll fix the parts I can fix from the codebase. The actual GitHub sync (pushing code into the empty repo) has to be re-triggered from the Lovable UI: **Connectors → GitHub → disconnect → reconnect**. I cannot do that step for you from here.

## What I'll add

### 1. `SETUP.md` (new file at project root)

A short, copy-pasteable guide for running the app on a fresh machine:

- Prerequisites (Node 18+, npm or bun)
- `git clone` step
- `npm install`
- Create a `.env` file with the exact values needed (the Supabase URL, anon key, and project ID — all public/safe to share)
- `npm run dev` to start the dev server on port 8080
- Notes:
  - The `.env` file is intentionally git-ignored, so it must be recreated on every machine
  - The app talks to the same Lovable Cloud backend regardless of which machine runs it, so data is shared
  - Edge functions and database migrations only deploy through Lovable, not from local dev

### 2. Improve `.env.example`

Replace the generic placeholders with the actual project values (these are the public anon key and project ref — already exposed in the shipped frontend bundle, so safe to commit) plus comments explaining each variable. This means a new developer can literally `cp .env.example .env` and the app works.

### 3. Update `README.md`

Add a short "Run locally" section near the top that links to `SETUP.md`, so anyone landing on the GitHub repo immediately sees how to get started.

## What I cannot do from here

- Push the existing project code into the empty GitHub repo. That requires re-triggering the sync from **Connectors → GitHub** in the Lovable UI. After you do that, the files I'm adding will land in the repo automatically along with everything else.

## Files

| Action | File |
|--------|------|
| Create | `SETUP.md` |
| Edit | `.env.example` |
| Edit | `README.md` |

After approval I'll make these edits, then walk you through the one manual GitHub reconnect step.
