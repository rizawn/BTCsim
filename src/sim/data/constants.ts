/**
 * Constants — single source of truth for all simulation numbers.
 * Derived from GDD v3 and academic paper specs (§2).
 *
 * No Phaser dependency.
 */

import { RIG_SPECS, RigSpec } from '../Rig';
import { LOCATIONS, LocationSpec } from '../Energy';
import {
  SECONDS_PER_BLOCK,
  BLOCKS_PER_EPOCH,
  EXPECTED_EPOCH_MINUTES,
  HALVING_INTERVAL,
  DESYNC_START_EPOCH,
  DESYNC_EXTRA_BLOCKS,
} from '../Clock';
import { SOLO_ORPHAN_RATE, POOL_ORPHAN_RATE } from '../Revenue';

export const SIM_CONSTANTS = {
  version: '0.1.0',
  schemaVersion: 1,

  // Time & Blocks
  SECONDS_PER_BLOCK,
  BLOCKS_PER_EPOCH,
  EXPECTED_EPOCH_MINUTES,
  HALVING_INTERVAL,
  DESYNC_START_EPOCH,
  DESYNC_EXTRA_BLOCKS,
  BLOCKS_PER_YEAR: 52_560, // 365 days * 24h * 6 blocks/h

  // Economic validation
  BREAKEVEN_DENOMINATOR: 2530, // BE = price / 2530

  // Orphan rates
  SOLO_ORPHAN_RATE,
  POOL_ORPHAN_RATE,

  // Hardware specs
  RIGS: RIG_SPECS,

  // Locations & power prices
  LOCATIONS,

  // Save config
  SAVE_SLOTS_COUNT: 3,
} as const;

/**
 * Returns constants formatted as serializable JSON object for balancing tools.
 */
export function getConstantsJSON(): string {
  return JSON.stringify(SIM_CONSTANTS, null, 2);
}

