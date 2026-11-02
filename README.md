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

Multiplayer locally: `npm run build && npx wrangler dev` (serves everything on :8787), or run
`npx wrangler dev` and `npm run dev` together (Vite proxies `/api` and `/ws`).

To test room expiry quickly, create `.dev.vars` with `HOST_GRACE_SECONDS=8`, then run the
three-browser end-to-end script: `node e2e/rooms.cjs`. Milestone 3 (start, calling, tickets, marking,
refresh restore, late join, host resume) has its own: `node e2e/calling.cjs`. Milestone 4 plays a
whole game (Line, Two Lines, Full House) with a forged claim, lock and the final wipe:
`node e2e/full-game.cjs` (takes a few minutes, since every call rolls for 2 seconds).

Tickets are generated on the player's device (`src/shared/ticket.ts`, property-tested over 10,000
tickets) and kept in `localStorage` with the marks; the server never sees them until a claim
(a BINGO claim). Claims are untrusted: the host's claim modal re-validates the ticket and checks every
mark against the host's own called list (`src/client/components/ClaimModal.svelte`).

Room logic lives in `src/worker/room-core.ts` (no Workers runtime dependencies, unit-tested in
`test/room-core.test.ts`); `src/worker/room.ts` is the thin Durable Object adapter.

Layout: `src/client` (Svelte app), `src/worker` (Worker), `src/shared` (code used by both),
`public` (static files incl. self-hosted fonts and `_headers`), `test` (Vitest).

## Deploy

GitHub Actions (`.github/workflows/ci-deploy.yml`) runs checks and tests on every push and deploys
pushes to `main` and `multiplayer-*` branches with `wrangler deploy`. It needs one repository secret (wrangler finds the account from the token):

- `CLOUDFLARE_API_KEY`: an API token from the "Edit Cloudflare Workers" template.

Until the milestone 5 cutover the app lives at the `workers.dev` URL; `bingo.webh.dev` is still served
by GitHub Pages from the legacy `index.html` / `app.js` / `style.css` in the repo root. Those files and
`CNAME` are removed at cutover.

## Limits

- Room creation: 3 per minute per client; joins: 30 per minute per client (Workers Rate Limiting
  binding, which only supports 10 s or 60 s windows). The client IP is hashed and used only as the
  transient rate-limit key; the app never stores or logs it.
- Per connection: 10 messages per second, 4 KB per message. Up to 60 players per room.
- Rooms are deleted when the host ends the game, 60 minutes after the host disconnects, or 24 hours
  after creation, whichever comes first.

## Privacy rules for contributors

- No third-party requests at runtime. Fonts are self-hosted in `public/fonts` (SIL OFL 1.1). The CSP
  (`src/shared/security.ts`, mirrored in `public/_headers`) enforces this.
- All browser storage uses `localStorage` keys prefixed `bingo.`; nothing is written until the user acts.
  No cookies.
- Never render user-supplied text with `innerHTML` / `{@html}`.
- Any future non-essential technology (analytics, ad scripts, third-party embeds, a Buy Me a Coffee
  widget) must be wrapped in `ConsentGate` (milestone 5) and must not load before opt-in consent.
