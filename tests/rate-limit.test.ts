import { describe, expect, it } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('allows requests under the configured limit and blocks excess calls', () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    expect(rateLimit(key, 2, 10000).allowed).toBe(true);
    expect(rateLimit(key, 2, 10000).allowed).toBe(true);
    expect(rateLimit(key, 2, 10000).allowed).toBe(false);
  });
});
