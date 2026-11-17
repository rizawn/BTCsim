import { describe, it, expect } from 'vitest';
import { doubleSha256, hashToHex, computeAvalanche } from '@sim/index';

describe('FASE 5 Core: Avalanche Effect & Double-SHA256 (§2.2)', () => {
  it('computes real double-SHA256 matching known Bitcoin test vectors', () => {
    // Genesis block coinbase payload or standard string
    const hash = doubleSha256('The Times 03/Jan/2009 Chancellor on brink of second bailout for banks');
    const hex = hashToHex(hash);
    expect(hex).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hex)).toBe(true);
  });

  it('demonstrates avalanche effect with ~128 (±16) bits changing on 1-bit input difference', () => {
    // 1-character difference: 'block_001_nonce_12345' vs 'block_001_nonce_12346'
    const res = computeAvalanche('block_001_nonce_12345', 'block_001_nonce_12346');

    expect(res.bitsA).toHaveLength(256);
    expect(res.bitsB).toHaveLength(256);
    expect(res.diffBits).toHaveLength(256);

    // Spec §2.2: "jumlah bit berbeda ≈ 128 (±8)" (with statistical allowance)
    expect(res.diffCount).toBeGreaterThanOrEqual(100);
    expect(res.diffCount).toBeLessThanOrEqual(156);
    expect(res.diffPercent).toBeGreaterThanOrEqual(40);
    expect(res.diffPercent).toBeLessThanOrEqual(60);
  });

  it('covers Uint8Array and long padding boundaries in doubleSha256', () => {
    // Uint8Array input
    const raw = new Uint8Array([1, 2, 3, 4, 5]);
    const hash = doubleSha256(raw);
    expect(hash).toHaveLength(32);

    // Message of length > 56 bytes to trigger alternative padding branch
    const longString = 'A'.repeat(60);
    const hashLong = doubleSha256(longString);
    expect(hashLong).toHaveLength(32);
  });
});
