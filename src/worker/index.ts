// Worker entry: routing, rate limits and Origin checks. Static assets are served by the
// assets layer; only /api/* and /ws/* reach this code first.
// No logging of request data (names, secrets, IPs) anywhere in application code.
import * as v from 'valibot';
import { SECURITY_HEADERS } from '../shared/security';
import { CreateRoomBody, type CreateRoomResponse } from '../shared/protocol';
import { generateCode, isCode } from '../shared/code';
import { randomToken, sha256 } from '../shared/secrets';
import type { Env } from './env';

export { GameRoom } from './room';

function withSecurityHeaders(res: Response): Response {
  // 101 responses carry a WebSocket and must be returned untouched.
  if (res.status === 101) return res;
  const out = new Response(res.body, res);
  for (const [k, val] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, val);
  return out;
}

function json(body: unknown, status = 200): Response {
  return withSecurityHeaders(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    }),
  );
}

const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Only the app's own origin may open sockets or create rooms (localhost allowed in dev). */
export function originAllowed(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  const url = new URL(request.url);
  if (origin === url.origin) return true;
  try {
    const o = new URL(origin);
    return LOCAL.has(url.hostname) && LOCAL.has(o.hostname);
  } catch {
    return false;
  }
}

/**
 * Rate-limit key derived from the client IP. The IP is hashed and used only as a transient
 * counter key inside Cloudflare's rate limiter; it is never stored or logged by the app.
 */
async function clientKey(request: Request, scope: string): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  return `${scope}:${await sha256(ip)}`;
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  if (!originAllowed(request)) return json({ error: 'forbidden' }, 403);
  const { success } = await env.CREATE_LIMIT.limit({ key: await clientKey(request, 'create') });
  if (!success) return json({ error: 'rate_limited' }, 429);

  let body: unknown = {};
  const text = await request.text();
  if (text.length > 1024) return json({ error: 'bad_request' }, 400);
  if (text) { try { body = JSON.parse(text); } catch { return json({ error: 'bad_request' }, 400); } }
  const parsed = v.safeParse(CreateRoomBody, body);
  if (!parsed.success) return json({ error: 'bad_request' }, 400);

  const hostKey = randomToken();
  const hostKeyHash = await sha256(hostKey);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
    const r = await stub.create(hostKeyHash, code, parsed.output.theme ?? 'midnight');
    if (r.ok) return json({ code, hostKey, expiresAt: r.expiresAt! } satisfies CreateRoomResponse, 201);
  }
  return json({ error: 'busy' }, 503);
}

async function connect(request: Request, env: Env, code: string): Promise<Response> {
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'upgrade_required' }, 426);
  if (!originAllowed(request)) return json({ error: 'forbidden' }, 403);
  if (!isCode(code)) return json({ error: 'not_found' }, 404);
  const role = new URL(request.url).searchParams.get('role');
  if (role !== 'host' && role !== 'player') return json({ error: 'bad_request' }, 400);
  const { success } = await env.JOIN_LIMIT.limit({ key: await clientKey(request, 'join') });
  if (!success) return json({ error: 'rate_limited' }, 429);
  const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
  return stub.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.protocol === 'http:' && !LOCAL.has(url.hostname)) {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === '/api/rooms') {
      if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
      return createRoom(request, env);
    }
    const ws = url.pathname.match(/^\/ws\/([^/]+)$/);
    if (ws) return connect(request, env, ws[1]);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) return json({ error: 'not_found' }, 404);

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;
