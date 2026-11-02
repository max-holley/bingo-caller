# Bingo Caller

90-ball UK bingo you can play together: the host calls the numbers on one screen and players join on
their own phones with a 6-character code, mark their tickets and press BINGO. There's also an offline
quick caller. Live at **https://bingo.webh.dev**.

> **This is a vibe-coded app.** It was built by directing an AI coding assistant
> ([Claude Code](https://claude.com/claude-code)) rather than written line by line by hand. Every change
> was reviewed and tested (unit tests, multi-browser end-to-end tests and an accessibility scan), but it
> hasn't had a professional security or code audit. It's a free hobby project for family games: please
> don't rely on it for anything important, and [open an issue](https://github.com/max-holley/bingo-caller/issues)
> if you spot a problem.

Runs on Cloudflare Workers: static assets plus one Durable Object per game. No accounts, no tracking,
and everything about a game is deleted when it ends (see the privacy notice at `/privacy`).

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

The app is served at **https://bingo.webh.dev** (a Workers custom domain, set in `wrangler.jsonc`) and at
the `workers.dev` preview URL. GitHub Pages is no longer used.

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
  widget) must be wrapped in `src/client/slots/ConsentGate.svelte` and must not load before opt-in
  consent. ConsentGate is a deliberate no-op today (it renders nothing), so it needs a real consent UI first.
  Extension points are switched in `src/client/config.ts`.
- The privacy notice (`src/client/views/Privacy.svelte`) must describe what the code does. Change it, and
  its "Last updated" date, in the same commit as any change to data, storage or third parties.
- "Clear data on this device" (footer) wipes every `bingo.*` key via `clearAllData()` in `lib/storage.ts`.
