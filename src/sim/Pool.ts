/**
 * Pool — mining pool simulation with PPS/PPLNS/FPPS payout schemes.
 *
 * Fees: 2–4%. PPLNS window for variance.
 * Orphan/stale rate: 0.5% (good pool) vs 1.5% solo.
 *
 * No Phaser dependency.
 */

import { mulberry32 } from './Market';
import { PoolConfig, PoolPayoutScheme, poolRevenuePerTick, POOL_ORPHAN_RATE } from './Revenue';

export interface PoolState {
  /** Pool name. */
  name: string;
  /** Payout configuration. */
  config: PoolConfig;
  /** Pool uptime (0–1). Affected by DDoS. */
  uptime: number;
  /** Total payouts accumulated in satoshis. */
  totalPayoutsSatoshis: number;
  /** Number of blocks pool has found. */
  blocksFound: number;
  /** Orphan/stale rate (default 0.5%). */
  orphanRate: number;
}

/** Pre-defined pool templates from GDD v3. */
export const POOL_TEMPLATES: readonly PoolState[] = [
  {
    name: 'Slush Pool',
    config: { scheme: 'PPLNS', feeRate: 0.02, pplnsWindow: 8 },
    uptime: 0.99,
    totalPayoutsSatoshis: 0,
    blocksFound: 0,
    orphanRate: POOL_ORPHAN_RATE,
  },
  {
    name: 'HashCorp PPS',
    config: { scheme: 'PPS', feeRate: 0.03, pplnsWindow: 0 },
    uptime: 0.98,
    totalPayoutsSatoshis: 0,
    blocksFound: 0,
    orphanRate: POOL_ORPHAN_RATE,
  },
  {
    name: 'OceanPool FPPS',
    config: { scheme: 'FPPS', feeRate: 0.025, pplnsWindow: 0 },
    uptime: 0.995,
    totalPayoutsSatoshis: 0,
    blocksFound: 0,
    orphanRate: 0.003,
  },
  {
    name: 'DarkPool Budget',
    config: { scheme: 'PPS', feeRate: 0.04, pplnsWindow: 0 },
    uptime: 0.90,
    totalPayoutsSatoshis: 0,
    blocksFound: 0,
    orphanRate: 0.01,
  },
];

/**
 * Create a fresh pool state from a template.
 */
export function createPool(template: PoolState): PoolState {
  return { ...template, totalPayoutsSatoshis: 0, blocksFound: 0 };
}

/**
 * Simulate one tick of pool mining.
 *
 * @returns Payout in satoshis for this tick (0 if pool is down).
 */
export function poolTick(
  pool: PoolState,
  blockRewardSatoshis: number,
  playerHashrateTHs: number,
  networkHashrateTHs: number,
  rng: () => number,
  txFeeSatoshisPerBlock: number = 0,
): number {
  // Check if pool is up this tick
  if (rng() > pool.uptime) {
    return 0; // Pool down — no payout
  }

  const payout = poolRevenuePerTick(
    pool.config,
    blockRewardSatoshis,
    playerHashrateTHs,
    networkHashrateTHs,
    rng,
    txFeeSatoshisPerBlock,
  );

  // Apply orphan rate reduction
  const effectivePayout = payout * (1 - pool.orphanRate);

  pool.totalPayoutsSatoshis += effectivePayout;
  return effectivePayout;
}

/**
 * Run a Monte Carlo simulation of pool payouts.
 * Returns average payout per tick and standard deviation.
 */
export function monteCarloPoolTest(
  config: PoolConfig,
  blockRewardSatoshis: number,
  playerHashrateTHs: number,
  networkHashrateTHs: number,
  seed: number,
  numSamples: number,
  orphanRate: number = POOL_ORPHAN_RATE,
): { mean: number; stdDev: number; min: number; max: number } {
  const rng = mulberry32(seed);
  const payouts: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const payout = poolRevenuePerTick(
      config,
      blockRewardSatoshis,
      playerHashrateTHs,
      networkHashrateTHs,
      rng,
    ) * (1 - orphanRate);
    payouts.push(payout);
  }

  const mean = payouts.reduce((a, b) => a + b, 0) / numSamples;
  const variance = payouts.reduce((a, b) => a + (b - mean) ** 2, 0) / numSamples;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...payouts);
  const max = Math.max(...payouts);

  return { mean, stdDev, min, max };
}

