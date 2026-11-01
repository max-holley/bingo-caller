// Worker entry. Milestone 1: static assets only; /api/* and /ws/* are reserved for milestone 2.
// No logging of request data (names, secrets, IPs) anywhere in application code.
import { SECURITY_HEADERS } from '../shared/security';

export interface Env {
  ASSETS: Fetcher;
}

function withSecurityHeaders(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // HTTPS only (workers.dev and custom domains already redirect, this is belt and braces).
    if (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) {
      return json({ error: 'not_found' }, 404);
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;
