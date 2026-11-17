/**
 * Revenue — block reward & mining probability model.
 *
 * Solo mining: p = hashrate_player / hashrate_network per tick.
 * Variance: draw from exponential distribution.
 * Pool: PPS/PPLNS/FPPS with fee 2–4%.
 * Orphan/stale rate: 1.5% solo, 0.5% pool (good).
 *
 * No Phaser dependency.
 */

import { mulberry32 } from './Market';

/** Orphan/stale rates from GDD v3 §2.2. */
export const SOLO_ORPHAN_RATE = 0.015; // 1.5%
export const POOL_ORPHAN_RATE = 0.005; // 0.5% (good pool)

export type PoolPayoutScheme = 'PPS' | 'PPLNS' | 'FPPS';

export interface PoolConfig {
  scheme: PoolPayoutScheme;
  /** Fee percentage (0–1), e.g. 0.02 = 2%. */
  feeRate: number;
  /** PPLNS window size (number of shares). Used only for PPLNS. */
  pplnsWindow: number;
}

/**
 * Calculate probability of player finding a block per tick (1 block = 1 tick).
 */
export function blockFindProbability(
  playerHashrateTHs: number,
  networkHashrateTHs: number,
): number {
  if (networkHashrateTHs <= 0) return 0;
  return playerHashrateTHs / networkHashrateTHs;
}

/**
 * Solo mining: determine if player found a block this tick.
 * Uses exponential distribution for realistic variance.
 *
 * @param p - Probability of finding block per tick.
 * @param rng - Random number generator function (0–1).
 * @returns True if block found.
 */
export function soloBlockFound(p: number, rng: () => number): boolean {
  if (p <= 0) return false;
  if (p >= 1) return true;
  // Geometric trial: each tick, probability p of success
  return rng() < p;
}

/**
 * Solo mining: determine if a found block is orphaned/stale.
 */
export function isOrphaned(rng: () => number, orphanRate: number = SOLO_ORPHAN_RATE): boolean {
  return rng() < orphanRate;
}

/**
 * Calculate solo mining expected revenue per block (in satoshis).
 * Accounts for orphan rate.
 */
export function soloExpectedRevenuePerBlock(
  blockRewardSatoshis: number,
  orphanRate: number = SOLO_ORPHAN_RATE,
): number {
  return blockRewardSatoshis * (1 - orphanRate);
}

/**
 * PPS (Pay Per Share): steady payout proportional to hashrate,
 * minus pool fee. No variance for miner.
 *
 * Revenue per tick (1 block period):
 *   payout = blockReward * p * (1 - feeRate)
 */
export function ppsRevenuePerTick(
  blockRewardSatoshis: number,
  playerHashrateTHs: number,
  networkHashrateTHs: number,
  feeRate: number,
): number {
  const p = blockFindProbability(playerHashrateTHs, networkHashrateTHs);
  return blockRewardSatoshis * p * (1 - feeRate);
}

/**
 * PPLNS (Pay Per Last N Shares): pays based on shares in last N rounds.
 * Higher variance than PPS, but lower fee usually.
 * Simulated here as: expected value = PPS value, but with variance applied.
 *
 * @param rng - RNG for variance.
 * @param varianceFactor - Multiplier for variance (0.1 = ±10% typical).
 */
export function pplnsRevenuePerTick(
  blockRewardSatoshis: number,
  playerHashrateTHs: number,
  networkHashrateTHs: number,
  feeRate: number,
  rng: () => number,
  varianceFactor: number = 0.15,
): number {
  const basePayout = ppsRevenuePerTick(blockRewardSatoshis, playerHashrateTHs, networkHashrateTHs, feeRate);
  // Apply variance: uniform noise centered on 1.0
  const variance = 1 + (rng() * 2 - 1) * varianceFactor;
  return basePayout * variance;
}

/**
 * FPPS (Full Pay Per Share): like PPS but also includes transaction fees.
 * Since we model block reward only for now, FPPS = PPS + small tx fee bonus.
 *
 * @param txFeeBonus - Additional satoshis from tx fees per block (divided proportionally).
 */
export function fppsRevenuePerTick(
  blockRewardSatoshis: number,
  playerHashrateTHs: number,
  networkHashrateTHs: number,
  feeRate: number,
  txFeeSatoshisPerBlock: number = 0,
): number {
  const p = blockFindProbability(playerHashrateTHs, networkHashrateTHs);
  const totalReward = blockRewardSatoshis + txFeeSatoshisPerBlock;
  return totalReward * p * (1 - feeRate);
}

/**
 * Calculate pool revenue for a tick based on pool config.
 */
export function poolRevenuePerTick(
  config: PoolConfig,
  blockRewardSatoshis: number,
  playerHashrateTHs: number,
  networkHashrateTHs: number,
  rng: () => number,
  txFeeSatoshisPerBlock: number = 0,
): number {
  switch (config.scheme) {
    case 'PPS':
      return ppsRevenuePerTick(blockRewardSatoshis, playerHashrateTHs, networkHashrateTHs, config.feeRate);
    case 'PPLNS':
      return pplnsRevenuePerTick(blockRewardSatoshis, playerHashrateTHs, networkHashrateTHs, config.feeRate, rng);
    case 'FPPS':
      return fppsRevenuePerTick(blockRewardSatoshis, playerHashrateTHs, networkHashrateTHs, config.feeRate, txFeeSatoshisPerBlock);
  }
}

