// Host-side game controller: owns the socket and the reactive room state.
import { GameSocket, type SocketStatus } from './ws';
import { clearSession, type HostSession } from './session';
import { setPickHandler, setThemeOverride, isThemeId, type ThemeId } from './themes';
import { CLOSE } from './close';
import type { LeaderboardEntry, PlayerSummary, PointsTable, ServerMsg, Stage } from '../../shared/protocol';

export type HostEnd = { kind: 'ended'; leaderboard: LeaderboardEntry[] } | { kind: 'gone'; code: string };

export class HostController {
  readonly code: string;
  status = $state<SocketStatus>('connecting');
  ready = $state(false);
  players = $state<PlayerSummary[]>([]);
  stage = $state<Stage>(1);
  called = $state<number[]>([]);
  locked = $state(false);
  points = $state<PointsTable>({ 1: 10, 2: 20, 3: 50 });
  expiresAt = $state(0);
  end = $state<HostEnd | null>(null);

  private socket: GameSocket;
  private lastError = '';

  constructor(session: HostSession) {
    this.code = session.code;
    setPickHandler(id => this.setTheme(id));
    this.socket = new GameSocket({
      code: session.code,
      role: 'host',
      onOpen: send => send({ t: 'host', hostKey: session.hostKey }),
      onMessage: m => this.onMessage(m),
      onStatus: s => (this.status = s),
      onFinalClose: (code, reason) => this.onFinal(code, reason),
    });
  }

  private onMessage(m: ServerMsg) {
    switch (m.t) {
      case 'hostState':
        this.players = m.players;
        this.stage = m.stage;
        this.called = m.called;
        this.locked = m.locked;
        this.points = m.points;
        this.expiresAt = m.expiresAt;
        if (isThemeId(m.theme)) setThemeOverride(m.theme);
        this.ready = true;
        break;
      case 'roster':
        this.players = m.players;
        break;
      case 'ended':
        this.end = { kind: 'ended', leaderboard: m.leaderboard };
        break;
      case 'error':
        this.lastError = m.code;
        break;
    }
  }

  private onFinal(code: number, reason: string) {
    if (code === CLOSE.ended) {
      clearSession();
      this.end ??= { kind: 'ended', leaderboard: [] };
    } else {
      if (code !== CLOSE.replaced) clearSession();
      this.end = { kind: 'gone', code: reason || this.lastError || 'no_room' };
    }
    this.dispose();
  }

  setTheme(id: ThemeId) {
    setThemeOverride(id);
    this.socket.send({ t: 'setTheme', id });
  }

  endGame() {
    this.socket.send({ t: 'end' });
  }

  dispose() {
    setPickHandler(null);
    this.socket.close();
  }
}
