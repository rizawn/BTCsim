/**
 * Clock — game time management.
 *
 * 1 block = 600 seconds game-time (10 minutes).
 * Speed multipliers: x1, x10, x60, x300.
 * Emits 'block-ticked' each time a block elapses.
 * Emits 'epoch-ended' when 2016 blocks complete an epoch.
 */

import { EventEmitter } from './EventEmitter';

/** Seconds per block in game-time. */
export const SECONDS_PER_BLOCK = 600;

/** Blocks per epoch. */
export const BLOCKS_PER_EPOCH = 2016;

/** Expected epoch duration in minutes. */
export const EXPECTED_EPOCH_MINUTES = 20160; // 2016 blocks * 10 min

/** Halving interval in blocks. */
export const HALVING_INTERVAL = 210_000;

/** Desync starts at this epoch number. */
export const DESYNC_START_EPOCH = 104;

/** Extra blocks per epoch from desync. */
export const DESYNC_EXTRA_BLOCKS = 336;

/** Valid speed multipliers. */
export const SPEED_MULTIPLIERS = [1, 10, 60, 300] as const;
export type SpeedMultiplier = (typeof SPEED_MULTIPLIERS)[number];

export interface BlockTickedEvent {
  blockHeight: number;
  epochNumber: number;
  blockInEpoch: number;
  gameTimeSeconds: number;
}

export interface EpochEndedEvent {
  epochNumber: number;
  blockHeight: number;
  epochDurationMinutes: number;
}

interface ClockEvents {
  'block-ticked': BlockTickedEvent;
  'epoch-ended': EpochEndedEvent;
}

export interface ClockState {
  /** Total game-time elapsed in seconds. */
  gameTimeSeconds: number;
  /** Current block height (0-indexed). */
  blockHeight: number;
  /** Accumulator for sub-block time. */
  accumulator: number;
  /** Current speed multiplier. */
  speedMultiplier: SpeedMultiplier;
  /** Whether the clock is paused. */
  paused: boolean;
  /** Time the current epoch started (in game seconds). */
  epochStartTime: number;
}

export class Clock extends EventEmitter<ClockEvents> {
  private state: ClockState;

  constructor(savedState?: ClockState) {
    super();
    this.state = savedState ?? {
      gameTimeSeconds: 0,
      blockHeight: 0,
      accumulator: 0,
      speedMultiplier: 1,
      paused: false,
      epochStartTime: 0,
    };
  }

  /** Advance clock by real-time delta (seconds). */
  update(realDeltaSeconds: number): void {
    if (this.state.paused) return;

    const gameDelta = realDeltaSeconds * this.state.speedMultiplier;
    this.state.accumulator += gameDelta;
    this.state.gameTimeSeconds += gameDelta;

    // Process complete blocks
    while (this.state.accumulator >= SECONDS_PER_BLOCK) {
      this.state.accumulator -= SECONDS_PER_BLOCK;
      this.state.blockHeight++;

      const epochInfo = this.getEpochInfo();

      this.emit('block-ticked', {
        blockHeight: this.state.blockHeight,
        epochNumber: epochInfo.epochNumber,
        blockInEpoch: epochInfo.blockInEpoch,
        gameTimeSeconds: this.state.gameTimeSeconds,
      });

      // Check epoch boundary
      if (epochInfo.blockInEpoch === 0 && this.state.blockHeight > 0) {
        const epochDurationSeconds = this.state.gameTimeSeconds - this.state.epochStartTime;
        this.emit('epoch-ended', {
          epochNumber: epochInfo.epochNumber - 1,
          blockHeight: this.state.blockHeight,
          epochDurationMinutes: epochDurationSeconds / 60,
        });
        this.state.epochStartTime = this.state.gameTimeSeconds;
      }
    }
  }

  /** Get current epoch number and position within epoch. */
  getEpochInfo(): { epochNumber: number; blockInEpoch: number; blocksInThisEpoch: number } {
    return getEpochInfoForBlock(this.state.blockHeight);
  }

  /** Get blocks until next halving. */
  getBlocksToHalving(): number {
    const currentHalvingEra = Math.floor(this.state.blockHeight / HALVING_INTERVAL);
    const nextHalving = (currentHalvingEra + 1) * HALVING_INTERVAL;
    return nextHalving - this.state.blockHeight;
  }

  /** Get current block reward in satoshis. */
  getBlockReward(): number {
    return getBlockReward(this.state.blockHeight);
  }

  // --- Speed & pause ---
  setSpeed(speed: SpeedMultiplier): void {
    this.state.speedMultiplier = speed;
  }

  getSpeed(): SpeedMultiplier {
    return this.state.speedMultiplier;
  }

  pause(): void {
    this.state.paused = true;
  }

  resume(): void {
    this.state.paused = false;
  }

  isPaused(): boolean {
    return this.state.paused;
  }

  togglePause(): void {
    this.state.paused = !this.state.paused;
  }

  // --- State access ---
  getBlockHeight(): number {
    return this.state.blockHeight;
  }

  getGameTimeSeconds(): number {
    return this.state.gameTimeSeconds;
  }

  getState(): Readonly<ClockState> {
    return { ...this.state };
  }
}

/**
 * Calculate epoch info for a given block height.
 * In Bitcoin, every epoch is strictly 2016 blocks.
 * Retarget occurs at every multiple of 2016 blocks (e.g. 437.472).
 * Desync: Halving (every 210,000 blocks) desyncs from retarget by 336 blocks starting from epoch 104 (209,664).
 */
export function getEpochInfoForBlock(blockHeight: number): {
  epochNumber: number;
  blockInEpoch: number;
  blocksInThisEpoch: number;
} {
  const epochNumber = Math.floor(blockHeight / BLOCKS_PER_EPOCH);
  const blockInEpoch = blockHeight % BLOCKS_PER_EPOCH;
  return {
    epochNumber,
    blockInEpoch,
    blocksInThisEpoch: BLOCKS_PER_EPOCH,
  };
}

/**
 * Get block reward (subsidy) in satoshis for a given block height.
 * Halves every 210,000 blocks. Initial reward: 50 BTC = 5,000,000,000 sat.
 */
export function getBlockReward(blockHeight: number): number {
  const halvingEra = Math.floor(blockHeight / HALVING_INTERVAL);
  if (halvingEra >= 64) return 0; // After 64 halvings, subsidy is 0
  const reward = 5_000_000_000 / Math.pow(2, halvingEra);
  return Math.floor(reward);
}

