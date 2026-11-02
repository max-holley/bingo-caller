import type { GameRoom } from './room';

export interface Env {
  ASSETS: Fetcher;
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  CREATE_LIMIT: RateLimit;
  JOIN_LIMIT: RateLimit;
  /** Optional overrides (strings, from wrangler vars / .dev.vars). */
  HOST_GRACE_SECONDS?: string;
  ROOM_TTL_SECONDS?: string;
  MAX_PLAYERS?: string;
}
