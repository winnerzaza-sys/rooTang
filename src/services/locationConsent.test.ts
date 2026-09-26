import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readLocationConsent,
  rememberLocationConsent,
} from './locationConsent';

describe('location consent preference', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('remembers only the permission decision, never coordinates', () => {
    rememberLocationConsent('accepted');
    expect(readLocationConsent()).toBe('accepted');
    expect(JSON.stringify(window.localStorage)).not.toContain('latitude');
  });

  it('falls back safely when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readLocationConsent()).toBeUndefined();
  });
});
