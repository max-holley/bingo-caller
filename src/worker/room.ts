// GameRoom Durable Object: one per game code. A thin adapter around RoomCore using the
// WebSocket Hibernation API (idle rooms cost nothing) and alarms for expiry.
import { DurableObject } from 'cloudflare:workers';
import { RoomCore, DEFAULT_CONFIG, type Attachment, type Conn, type RoomIO, type RoomState, type Role } from './room-core';
import type { ThemeIdWire } from '../shared/protocol';
import type { Env } from './env';

const STATE_KEY = 'room';

function configFrom(env: Env) {
  const num = (v: string | undefined, d: number) => (v && /^\d+$/.test(v) ? Number(v) : d);
  return {
    ...DEFAULT_CONFIG,
    hostGraceMs: num(env.HOST_GRACE_SECONDS, DEFAULT_CONFIG.hostGraceMs / 1000) * 1000,
    ttlMs: num(env.ROOM_TTL_SECONDS, DEFAULT_CONFIG.ttlMs / 1000) * 1000,
    maxPlayers: num(env.MAX_PLAYERS, DEFAULT_CONFIG.maxPlayers),
  };
}

export class GameRoom extends DurableObject<Env> {
  private core: RoomCore;
  private conns = new WeakMap<WebSocket, Conn>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Keep-alive pings are answered without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));

    const io: RoomIO = {
      now: () => Date.now(),
      conns: () => ctx.getWebSockets().map(ws => this.wrap(ws)),
      load: () => ctx.storage.get<RoomState>(STATE_KEY),
      save: s => ctx.storage.put(STATE_KEY, s),
      deleteAll: () => ctx.storage.deleteAll(),
      setAlarm: at => ctx.storage.setAlarm(at),
      deleteAlarm: () => ctx.storage.deleteAlarm(),
    };
    this.core = new RoomCore(io, configFrom(env));
    ctx.blockConcurrencyWhile(() => this.core.init());
  }

  private wrap(ws: WebSocket): Conn {
    let c = this.conns.get(ws);
    if (!c) {
      c = {
        get att() { return ws.deserializeAttachment() as Attachment; },
        setAtt: (a: Attachment) => ws.serializeAttachment(a),
        send: msg => { try { ws.send(JSON.stringify(msg)); } catch { /* closed */ } },
        close: (code, reason) => { try { ws.close(code, reason); } catch { /* closed */ } },
      };
      this.conns.set(ws, c);
    }
    return c;
  }

  /** RPC from the Worker: create the room for this code. */
  async create(hostKeyHash: string, code: string, theme: ThemeIdWire) {
    return this.core.create(code, hostKeyHash, theme);
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    const role = new URL(request.url).searchParams.get('role') as Role;
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server, [role]);
    const att: Attachment = { role, authed: false, win: 0, count: 0 };
    server.serializeAttachment(att);
    await this.core.onConnect(this.wrap(server));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    await this.core.onMessage(this.wrap(ws), typeof message === 'string' ? message : null);
  }

  async webSocketClose(ws: WebSocket, code: number) {
    await this.core.onClose(this.wrap(ws));
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, 'bye'); } catch { /* already closed */ }
  }

  async webSocketError(ws: WebSocket) {
    await this.core.onClose(this.wrap(ws));
  }

  async alarm() {
    await this.core.onAlarm();
  }
}
