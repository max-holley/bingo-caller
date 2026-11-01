import type { CreateRoomResponse, ThemeIdWire } from '../../shared/protocol';

export class ApiError extends Error {
  constructor(public code: string) { super(code); }
}

export async function createRoom(theme: ThemeIdWire): Promise<CreateRoomResponse> {
  let res: Response;
  try {
    res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme }),
    });
  } catch {
    throw new ApiError('offline');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? 'error');
  return body as CreateRoomResponse;
}
