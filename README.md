# Bingo Caller

90-ball bingo caller. Runs on Cloudflare Workers (static assets + a Durable Object from milestone 2).
See the multiplayer spec for the full plan; this branch is built one milestone at a time.

## Develop

```sh
npm install
npm run dev        # Vite dev server (client only)
npm run preview    # build, then run the Worker locally with wrangler dev
npm test           # unit tests (Vitest)
npm run check      # svelte-check + Worker typecheck
```

Layout: `src/client` (Svelte app), `src/worker` (Worker), `src/shared` (code used by both),
`public` (static files incl. self-hosted fonts and `_headers`), `test` (Vitest).

## Deploy

GitHub Actions (`.github/workflows/ci-deploy.yml`) runs checks and tests on every push and deploys
pushes to `main` and `multiplayer-*` branches with `wrangler deploy`. It needs two repository secrets:

- `CLOUDFLARE_API_TOKEN`: a token from the "Edit Cloudflare Workers" template.
- `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account id.

Until the milestone 5 cutover the app lives at the `workers.dev` URL; `bingo.webh.dev` is still served
by GitHub Pages from the legacy `index.html` / `app.js` / `style.css` in the repo root. Those files and
`CNAME` are removed at cutover.

## Privacy rules for contributors

- No third-party requests at runtime. Fonts are self-hosted in `public/fonts` (SIL OFL 1.1). The CSP
  (`src/shared/security.ts`, mirrored in `public/_headers`) enforces this.
- All browser storage uses `localStorage` keys prefixed `bingo.`; nothing is written until the user acts.
  No cookies.
- Never render user-supplied text with `innerHTML` / `{@html}`.
- Any future non-essential technology (analytics, ad scripts, third-party embeds, a Buy Me a Coffee
  widget) must be wrapped in `ConsentGate` (milestone 5) and must not load before opt-in consent.
