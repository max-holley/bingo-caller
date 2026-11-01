import type { ErrorCode } from '../../shared/protocol';

const TEXT: Record<string, string> = {
  no_room: "That game doesn't exist any more. Check the code with your host.",
  bad_key: "We couldn't reconnect you to that game.",
  kicked: 'The host removed you from this game.',
  locked: 'The host has locked this game, so no one new can join.',
  full: 'This game is full.',
  bad_name: 'Please enter a nickname.',
  expired: 'This game has ended (games close automatically after a while).',
  replaced: 'This game was opened in another tab or device.',
  rate_limited: 'Too many attempts. Please wait a minute and try again.',
  offline: "Can't reach the server. Check your connection.",
  busy: 'The server is busy. Please try again.',
};

export function errorText(code: ErrorCode | string): string {
  return TEXT[code] ?? 'Something went wrong. Please try again.';
}
