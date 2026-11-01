// Reconnecting WebSocket to /ws/:code. Sends a keep-alive "ping" (answered by the Durable
// Object's auto-response without waking it). Close codes 4000–4999 from the server are final.
import type { ServerMsg } from '../../shared/protocol';

export type SocketStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export type GameSocketOptions = {
  code: string;
  role: 'host' | 'player';
  /** Called on every (re)connect; send the auth/join message here. */
  onOpen: (send: (msg: object) => void) => void;
  onMessage: (msg: ServerMsg) => void;
  onStatus?: (s: SocketStatus) => void;
  /** Server closed with a final (4xxx) code. */
  onFinalClose?: (code: number, reason: string) => void;
};

const PING_MS = 25_000;

export class GameSocket {
  private ws: WebSocket | null = null;
  private stopped = false;
  private attempt = 0;
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private o: GameSocketOptions) {
    this.connect();
    window.addEventListener('online', this.retryNow);
    document.addEventListener('visibilitychange', this.onVisible);
  }

  send = (msg: object) => {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  };

  close() {
    this.stopped = true;
    clearInterval(this.pingTimer);
    clearTimeout(this.retryTimer);
    window.removeEventListener('online', this.retryNow);
    document.removeEventListener('visibilitychange', this.onVisible);
    this.ws?.close(1000, 'leaving');
    this.ws = null;
    this.o.onStatus?.('closed');
  }

  private connect() {
    if (this.stopped) return;
    this.o.onStatus?.(this.attempt === 0 ? 'connecting' : 'reconnecting');
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws/${this.o.code}?role=${this.o.role}`);
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.o.onStatus?.('open');
      this.o.onOpen(this.send);
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('ping'); }, PING_MS);
    };
    ws.onmessage = e => {
      if (e.data === 'pong' || typeof e.data !== 'string') return;
      try { this.o.onMessage(JSON.parse(e.data) as ServerMsg); } catch { /* ignore */ }
    };
    ws.onclose = e => {
      clearInterval(this.pingTimer);
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.stopped) return;
      if (e.code >= 4000 && e.code < 5000) {
        this.stopped = true;
        this.o.onStatus?.('closed');
        this.o.onFinalClose?.(e.code, e.reason);
        return;
      }
      this.scheduleRetry();
    };
  }

  private scheduleRetry() {
    this.o.onStatus?.('reconnecting');
    const delay = Math.min(10_000, 500 * 2 ** this.attempt) * (0.75 + Math.random() * 0.5);
    this.attempt++;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  private retryNow = () => {
    if (this.stopped || this.ws) return;
    clearTimeout(this.retryTimer);
    this.connect();
  };

  private onVisible = () => {
    if (document.visibilityState === 'visible') this.retryNow();
  };
}
