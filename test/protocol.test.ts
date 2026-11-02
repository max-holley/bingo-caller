import { describe, it, expect } from 'vitest';
import { HostMsg, PlayerMsg, parseMessage, MAX_MESSAGE_BYTES } from '../src/shared/protocol';

const key = 'A'.repeat(22);

describe('protocol', () => {
  it('accepts valid host messages', () => {
    expect(parseMessage(HostMsg, JSON.stringify({ t: 'call', n: 90 }))).toEqual({ t: 'call', n: 90 });
    expect(parseMessage(HostMsg, JSON.stringify({ t: 'host', hostKey: key }))).toBeTruthy();
    expect(parseMessage(HostMsg, JSON.stringify({ t: 'end' }))).toEqual({ t: 'end' });
  });
  it('rejects out-of-range, unknown and malformed messages', () => {
    expect(parseMessage(HostMsg, JSON.stringify({ t: 'call', n: 0 }))).toBeNull();
    expect(parseMessage(HostMsg, JSON.stringify({ t: 'call', n: 91 }))).toBeNull();
    expect(parseMessage(HostMsg, JSON.stringify({ t: 'call', n: 1.5 }))).toBeNull();
    expect(parseMessage(HostMsg, JSON.stringify({ t: 'setStage', stage: 4 }))).toBeNull();
    expect(parseMessage(HostMsg, JSON.stringify({ t: 'nope' }))).toBeNull();
    expect(parseMessage(HostMsg, '{not json')).toBeNull();
    expect(parseMessage(HostMsg, 42)).toBeNull();
  });
  it('enforces the 4 KB cap', () => {
    const big = JSON.stringify({ t: 'join', name: 'x'.repeat(MAX_MESSAGE_BYTES) });
    expect(parseMessage(PlayerMsg, big)).toBeNull();
  });
  it('host messages are not valid player messages and vice versa', () => {
    expect(parseMessage(PlayerMsg, JSON.stringify({ t: 'call', n: 5 }))).toBeNull();
    expect(parseMessage(HostMsg, JSON.stringify({ t: 'join', name: 'x' }))).toBeNull();
  });
  it('validates claim ticket shape', () => {
    const ticket = [Array(9).fill(0), Array(9).fill(0), Array(9).fill(0)];
    expect(parseMessage(PlayerMsg, JSON.stringify({ t: 'claim', stage: 1, ticket, marked: [1, 2] }))).toBeTruthy();
    expect(parseMessage(PlayerMsg, JSON.stringify({ t: 'claim', stage: 1, ticket: [[0]], marked: [] }))).toBeNull();
  });
});
