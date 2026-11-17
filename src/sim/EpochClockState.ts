/**
 * EpochClockState — derived view state for the epoch clock HUD.
 *
 * Provides:
 * - Current epoch number and block position within epoch
 * - 2016-tick progress (or 2352-tick post-desync)
 * - Desync indicator (336 extra blocks after epoch 104)
 * - Retarget progress percentage
 * - Blocks to next halving
 *
 * No Phaser dependency.
 */

import {
  BLOCKS_PER_EPOCH,
  DESYNC_START_EPOCH,
  DESYNC_EXTRA_BLOCKS,
  HALVING_INTERVAL,
  getEpochInfoForBlock,
  getBlockReward,
} from './Clock';

export interface EpochClockView {
  /** Current epoch number. */
  epochNumber: number;
  /** Current block height. */
  blockHeight: number;
  /** Block position within current epoch (0-based). */
  blockInEpoch: number;
  /** Total blocks in this epoch (2016 or 2352 post-desync). */
  blocksInThisEpoch: number;
  /** Retarget progress as percentage (0–100). */
  retargetProgress: number;
  /** Whether desync is active (epoch >= 104). */
  isDesyncActive: boolean;
  /** Number of desync extra blocks (0 or 336). */
  desyncExtraBlocks: number;
  /** Blocks until next halving event. */
  blocksToHalving: number;
  /** Current block reward in satoshis. */
  blockRewardSatoshis: number;
  /** Block height at next epoch boundary. */
  nextEpochBlock: number;
  /** Major tick interval (every 504 blocks). */
  majorTickInterval: number;
}

/**
 * Compute the full epoch clock view from a block height.
 */
export function computeEpochClockView(blockHeight: number): EpochClockView {
  const info = getEpochInfoForBlock(blockHeight);
  const isDesyncActive = info.epochNumber >= DESYNC_START_EPOCH;
  const desyncExtra = isDesyncActive ? DESYNC_EXTRA_BLOCKS : 0;
  const retargetProgress = (info.blockInEpoch / info.blocksInThisEpoch) * 100;

  // Next epoch boundary block (e.g. at block 437.182 in epoch 216, next is 437.472)
  const nextEpochBlock = (info.epochNumber + 1) * info.blocksInThisEpoch;

  // Blocks to next halving
  const currentHalvingEra = Math.floor(blockHeight / HALVING_INTERVAL);
  const nextHalving = (currentHalvingEra + 1) * HALVING_INTERVAL;
  const blocksToHalving = nextHalving - blockHeight;

  return {
    epochNumber: info.epochNumber,
    blockHeight,
    blockInEpoch: info.blockInEpoch,
    blocksInThisEpoch: info.blocksInThisEpoch,
    retargetProgress,
    isDesyncActive,
    desyncExtraBlocks: desyncExtra,
    blocksToHalving,
    blockRewardSatoshis: getBlockReward(blockHeight),
    nextEpochBlock,
    majorTickInterval: 504,
  };
}

/**
 * Format epoch clock display string (for HUD text layer).
 * Example: "EPOCH 216 · blok 437.182 / 437.472 · retarget 62%"
 */
export function formatEpochClockDisplay(view: EpochClockView): string {
  const fmtNum = (n: number) => n.toLocaleString('id-ID');
  const retargetPct = Math.round(view.retargetProgress);
  const display = `EPOCH ${fmtNum(view.epochNumber)} · blok ${fmtNum(view.blockHeight)} / ${fmtNum(view.nextEpochBlock)} · retarget ${retargetPct}%`;

  if (view.isDesyncActive) {
    return `${display}\ndesync halving: +${view.desyncExtraBlocks} blok`;
  }
  return display;
}

