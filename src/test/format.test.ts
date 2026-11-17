import { describe, it, expect } from 'vitest';
import { formatNumber, formatEngineering, formatBTC } from '@format/numbers';

describe('formatNumber', () => {
  it('formats integer with id-ID locale', () => {
    const result = formatNumber(437182);
    // id-ID uses dot as thousands separator
    expect(result).toContain('437');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatEngineering', () => {
  it('formats terahash values', () => {
    const result = formatEngineering(14_000_000_000_000);
    expect(result).toContain('T');
  });

  it('handles zero', () => {
    expect(formatEngineering(0)).toBe('0');
  });
});

describe('formatBTC', () => {
  it('formats satoshis to BTC', () => {
    const result = formatBTC(5000000000); // 50 BTC
    expect(result).toContain('₿');
    expect(result).toContain('50');
  });
});

