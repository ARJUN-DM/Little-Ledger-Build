# Ledger

A pocket-sized paper cash book: income and expenses in a single ledger, kept on the
device, working offline once installed. It is a plain static PWA — no build step,
no accounts, no server.

## Layout

- `little-ledger/` — the app itself (HTML, CSS, ES modules, `sw.js`, manifest, icons).
- `deploy/worker.js` + `sites.manifest.json` — static Worker used for Freebuff Sites hosting.
- `scripts/build.mjs` — copies the app to `dist/` for Vercel.
- `scripts/serve.mjs` — dependency-free local server on http://127.0.0.1:8788.

## Run locally

```bash
npm start          # or: bun scripts/serve.mjs
```

Open http://127.0.0.1:8788. Service workers and install prompts only work on
`localhost`/`127.0.0.1` or HTTPS, not from `file://`.

## Push to GitHub

```bash
git init
git add .
git commit -m "Ledger: offline paper cash book"
git branch -M main
git remote add origin https://github.com/<you>/ledger.git
git push -u origin main
```

`.gitignore` already drops `node_modules/`, `dist/`, local tool state and env files.

## Host on Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Other**. Vercel reads `vercel.json`, runs `node scripts/build.mjs`
   and serves `dist/`.
3. Or from a terminal: `npx vercel --prod`.

`vercel.json` keeps `index.html` and `sw.js` uncached so an installed copy picks up
new versions, and serves the manifest with the correct content type.

## Publishing a new version

Bump `CACHE` in `little-ledger/sw.js` (for example `little-ledger-shell-v10` →
`v11`) whenever the shell files or `styles.css` change, so installed apps replace
their cached copy.
