import { describe, it, expect } from 'vitest';
import { decodeNBits, inspectBlockHeader, createGenesisBlockHeader } from '@sim/index';

describe('FASE 7 Core: Header Inspector & nBits Decoders', () => {
  it('correctly decodes Genesis nBits 0x1d00ffff (Difficulty 1.0)', () => {
    const res = decodeNBits(0x1d00ffff);
    expect(res.nBitsHex).toBe('0x1d00ffff');
    expect(res.exponent).toBe(0x1d);
    expect(res.mantissa).toBe(0x00ffff);
    expect(res.difficulty).toBeCloseTo(1.0, 5);

    // Edge case: 0 mantissa
    const zeroMantissa = decodeNBits(0x1d000000);
    expect(zeroMantissa.mantissa).toBe(0);
    expect(zeroMantissa.difficulty).toBeGreaterThanOrEqual(1);
  });

  it('correctly decodes Test Vector 2: Early era block nBits 0x1b0404cb', () => {
    const res = decodeNBits(0x1b0404cb);
    expect(res.exponent).toBe(0x1b);
    expect(res.mantissa).toBe(0x0404cb);
    // Exponent is lower -> difficulty is higher than 1
    expect(res.difficulty).toBeGreaterThan(1000);
  });

  it('correctly decodes Test Vector 3: Modern era target 0x1703a7ba', () => {
    const res = decodeNBits(0x1703a7ba);
    expect(res.exponent).toBe(0x17);
    expect(res.difficulty).toBeGreaterThan(1_000_000);
  });

  it('inspects full 80-byte header with all 6 fields', () => {
    const genesis = createGenesisBlockHeader();
    const analysis = inspectBlockHeader(genesis);

    expect(analysis.byteSize).toBe(80);
    expect(analysis.fields).toHaveLength(6);
    expect(analysis.fields.map((f) => f.name)).toEqual([
      'Version',
      'Previous Block Hash',
      'Merkle Root',
      'Timestamp',
      'nBits (Compact Difficulty)',
      'Nonce',
    ]);
    expect(analysis.decodedNBits.difficulty).toBeCloseTo(1.0, 5);
  });
});
