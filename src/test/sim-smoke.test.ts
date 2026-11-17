import { describe, it, expect } from 'vitest';
import { SIM_VERSION } from '@sim/index';

describe('Sim module', () => {
  it('exports version string', () => {
    expect(SIM_VERSION).toBe('0.1.0');
  });
});

