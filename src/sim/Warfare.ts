/**
 * Warfare — advanced attack mechanics.
 *
 * From GDD v3 §Warfare:
 * - Selfish mining: withhold blocks to gain unfair advantage
 * - Timejack: offset epoch clock ± hours (subtle visual clue)
 * - DDoS: pool uptime drops
 * - Contagion: exchange hack → price drop + withdrawal freeze
 *
 * No Phaser dependency.
 */

export type WarfareType = 'selfish_mining' | 'timejack' | 'ddos' | 'contagion';

export interface WarfareEvent {
  id: string;
  type: WarfareType;
  /** When the event started (block height). */
  startBlock: number;
  /** Duration in blocks. */
  durationBlocks: number;
  /** Whether the event is currently active. */
  active: boolean;
  /** Event-specific parameters. */
  params: WarfareParams;
}

export type WarfareParams =
  | SelfishMiningParams
  | TimejackParams
  | DDoSParams
  | ContagionParams;

export interface SelfishMiningParams {
  type: 'selfish_mining';
  /** Fraction of network hashrate held by selfish miner. */
  selfishHashFraction: number;
  /** Number of blocks withheld. */
  withheldBlocks: number;
  /** Revenue advantage gained (multiplier). */
  revenueAdvantage: number;
}

export interface TimejackParams {
  type: 'timejack';
  /** Clock offset in seconds (positive = forward, negative = backward). */
  clockOffsetSeconds: number;
  /** Whether the player has detected the timejack. */
  detected: boolean;
}

export interface DDoSParams {
  type: 'ddos';
  /** Target pool name. */
  targetPool: string;
  /** Uptime reduction factor (0–1). */
  uptimeReduction: number;
}

export interface ContagionParams {
  type: 'contagion';
  /** Exchange name. */
  exchangeName: string;
  /** Price drop percentage (0–1). */
  priceDrop: number;
  /** Withdrawal freeze duration in blocks. */
  freezeDurationBlocks: number;
  /** Whether withdrawals are currently frozen. */
  withdrawalsFrozen: boolean;
}

/**
 * Create a selfish mining event.
 */
export function createSelfishMining(
  startBlock: number,
  durationBlocks: number,
  selfishHashFraction: number,
): WarfareEvent {
  return {
    id: `warfare_selfish_${startBlock}`,
    type: 'selfish_mining',
    startBlock,
    durationBlocks,
    active: true,
    params: {
      type: 'selfish_mining',
      selfishHashFraction,
      withheldBlocks: 0,
      // Selfish mining revenue advantage formula (simplified):
      // gamma = 0 (no honest miner races attacker)
      // Revenue ratio ≈ (alpha^2 + alpha*(1-alpha)*gamma) / (1 - alpha*(1 + (2-alpha)*alpha*gamma))
      // For gamma=0: ratio = alpha / (1 - alpha) when alpha > 1/3
      revenueAdvantage: selfishHashFraction > 1 / 3
        ? selfishHashFraction / (1 - selfishHashFraction)
        : 0,
    },
  };
}

/**
 * Create a timejack event.
 * Visual clue: epoch clock ticks asymmetrically, jumps ~2 hours.
 */
export function createTimejack(
  startBlock: number,
  durationBlocks: number,
  clockOffsetSeconds: number,
): WarfareEvent {
  return {
    id: `warfare_timejack_${startBlock}`,
    type: 'timejack',
    startBlock,
    durationBlocks,
    active: true,
    params: {
      type: 'timejack',
      clockOffsetSeconds,
      detected: false,
    },
  };
}

/**
 * Create a DDoS event targeting a pool.
 */
export function createDDoS(
  startBlock: number,
  durationBlocks: number,
  targetPool: string,
  uptimeReduction: number,
): WarfareEvent {
  return {
    id: `warfare_ddos_${startBlock}`,
    type: 'ddos',
    startBlock,
    durationBlocks,
    active: true,
    params: {
      type: 'ddos',
      targetPool,
      uptimeReduction: Math.min(1, Math.max(0, uptimeReduction)),
    },
  };
}

/**
 * Create a contagion (exchange hack) event.
 */
export function createContagion(
  startBlock: number,
  durationBlocks: number,
  exchangeName: string,
  priceDrop: number,
  freezeDurationBlocks: number,
): WarfareEvent {
  return {
    id: `warfare_contagion_${startBlock}`,
    type: 'contagion',
    startBlock,
    durationBlocks,
    active: true,
    params: {
      type: 'contagion',
      exchangeName,
      priceDrop: Math.min(1, Math.max(0, priceDrop)),
      freezeDurationBlocks,
      withdrawalsFrozen: true,
    },
  };
}

/**
 * Check if a warfare event is still active at given block.
 */
export function isWarfareActive(event: WarfareEvent, currentBlock: number): boolean {
  return event.active && currentBlock < event.startBlock + event.durationBlocks;
}

/**
 * Update warfare event state at a given block.
 */
export function updateWarfare(event: WarfareEvent, currentBlock: number): WarfareEvent {
  const updated = { ...event, params: { ...event.params } };

  if (currentBlock >= event.startBlock + event.durationBlocks) {
    updated.active = false;
    // Clean up contagion
    if (updated.params.type === 'contagion') {
      (updated.params as ContagionParams).withdrawalsFrozen = false;
    }
    return updated;
  }

  // Type-specific updates
  if (updated.params.type === 'contagion') {
    const contagion = updated.params as ContagionParams;
    const blocksElapsed = currentBlock - event.startBlock;
    if (blocksElapsed >= contagion.freezeDurationBlocks) {
      contagion.withdrawalsFrozen = false;
    }
  }

  if (updated.params.type === 'selfish_mining') {
    const selfish = updated.params as SelfishMiningParams;
    selfish.withheldBlocks = currentBlock - event.startBlock;
  }

  return updated;
}

/**
 * Apply contagion price impact.
 * Returns the multiplier to apply to current BTC price.
 */
export function contagionPriceMultiplier(params: ContagionParams): number {
  return 1 - params.priceDrop;
}

