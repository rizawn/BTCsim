/**
 * GameState — persistent, serializable state for SHA-256 Tycoon.
 *
 * Supports:
 * - Versioned schema (schemaVersion)
 * - Migration pipeline (v1 -> v2 stub)
 * - 3 manual save slots + 1 autosave slot
 * - Idempotent round-trip serialization
 *
 * No Phaser dependency.
 */

import { ClockState } from './Clock';
import { DifficultyState } from './Difficulty';
import { MarketState } from './Market';
import { RigInstance, createRigInstance } from './Rig';
import { PoolState } from './Pool';
import { WarfareEvent } from './Warfare';
import { SIM_CONSTANTS } from './data/constants';

export const CURRENT_SCHEMA_VERSION = 1;

export interface TreasuryState {
  satoshis: number;
  fiatUSD: number;
  totalJoulesConsumed: number;
}

export interface GameState {
  schemaVersion: number;
  savedAt: number; // timestamp in ms

  // Subsystem states
  clock: ClockState;
  difficulty: DifficultyState;
  market: MarketState;
  rigs: RigInstance[];
  activeLocationId: string;
  treasury: TreasuryState;
  miningMode: 'solo' | 'pool';
  activePool: PoolState | null;
  warfareEvents: WarfareEvent[];

  // Meta
  saveName?: string | undefined;
}

/**
 * Creates a fresh, default game state at Genesis (Era 1, block 0).
 */
export function createInitialGameState(seed = 42): GameState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: Date.now(),
    clock: {
      gameTimeSeconds: 0,
      blockHeight: 0,
      accumulator: 0,
      speedMultiplier: 1,
      paused: false,
      epochStartTime: 0,
    },
    difficulty: {
      difficulty: 1.0,
      history: [],
    },
    market: {
      priceBTC: 1.0, // Genesis $1/BTC
      era: 1,
      seed,
      rngCallCount: 0,
      priceHistory: [1.0],
    },
    rigs: [createRigInstance('cpu_genesis', 1)],
    activeLocationId: 'garasi',
    treasury: {
      satoshis: 0,
      fiatUSD: 50.0, // Starter capital for electricity
      totalJoulesConsumed: 0,
    },
    miningMode: 'solo',
    activePool: null,
    warfareEvents: [],
  };
}

/**
 * Serialization with deterministic recursive key ordering for byte-identical round-trips.
 */
export function serializeGameState(state: GameState): string {
  const sortKeys = (val: unknown): unknown => {
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) return val.map(sortKeys);
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(val).sort()) {
      sorted[key] = sortKeys((val as Record<string, unknown>)[key]);
    }
    return sorted;
  };

  return JSON.stringify(sortKeys(state), null, 2);
}

/**
 * Migration engine: converts raw JSON object of older versions to CURRENT_SCHEMA_VERSION.
 */
export function migrateGameState(raw: Record<string, unknown>): GameState {
  let version = (raw['schemaVersion'] as number) || 1;

  // v1 -> v2 stub for future expansion
  if (version === 1 && CURRENT_SCHEMA_VERSION > 1) {
    // example: raw['newField'] = defaultValue;
    version = 2;
  }

  return raw as unknown as GameState;
}

/**
 * Deserialize JSON string to validated GameState.
 */
export function deserializeGameState(json: string): GameState {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  return migrateGameState(parsed);
}

export interface SaveSlotInfo {
  slot: number | 'autosave';
  exists: boolean;
  blockHeight?: number | undefined;
  savedAt?: number | undefined;
  saveName?: string | undefined;
  fiatUSD?: number | undefined;
  satoshis?: number | undefined;
}

/**
 * SaveManager handles storage in memory or any key-value adapter (e.g. localStorage).
 */
export class SaveManager {
  private storage: Map<string, string> = new Map();

  /**
   * Save game state to a slot (1, 2, 3 or 'autosave').
   */
  save(slot: number | 'autosave', state: GameState, saveName?: string): void {
    if (typeof slot === 'number' && (slot < 1 || slot > SIM_CONSTANTS.SAVE_SLOTS_COUNT)) {
      throw new Error(`Invalid save slot: ${slot}. Must be 1..${SIM_CONSTANTS.SAVE_SLOTS_COUNT}`);
    }

    const stateToSave: GameState = {
      ...state,
      savedAt: Date.now(),
      ...(saveName ? { saveName } : {}),
    };

    const key = `save_${slot}`;
    this.storage.set(key, serializeGameState(stateToSave));
  }

  /**
   * Load game state from a slot.
   */
  load(slot: number | 'autosave'): GameState | null {
    const key = `save_${slot}`;
    const raw = this.storage.get(key);
    if (!raw) return null;
    return deserializeGameState(raw);
  }

  /**
   * Check if a slot has saved data.
   */
  has(slot: number | 'autosave'): boolean {
    return this.storage.has(`save_${slot}`);
  }

  /**
   * Get metadata info about all slots.
   */
  getAllSlotInfo(): SaveSlotInfo[] {
    const slots: (number | 'autosave')[] = [1, 2, 3, 'autosave'];
    return slots.map((s) => {
      const state = this.load(s);
      if (!state) {
        return { slot: s, exists: false };
      }
      return {
        slot: s,
        exists: true,
        blockHeight: state.clock.blockHeight,
        savedAt: state.savedAt,
        saveName: state.saveName,
        fiatUSD: state.treasury.fiatUSD,
        satoshis: state.treasury.satoshis,
      };
    });
  }

  /**
   * Clear all storage (for tests or full reset).
   */
  clear(): void {
    this.storage.clear();
  }
}
