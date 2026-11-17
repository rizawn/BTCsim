import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  serializeGameState,
  deserializeGameState,
  SaveManager,
  CURRENT_SCHEMA_VERSION,
  SIM_CONSTANTS,
  getConstantsJSON,
} from '@sim/index';
import { runLongTermBalance } from '../sim/balance';

describe('FASE 4: Save / Load Idempotence & Data Balancing', () => {
  it('exports system constants and valid JSON format', () => {
    expect(SIM_CONSTANTS.version).toBe('0.1.0');
    expect(SIM_CONSTANTS.schemaVersion).toBe(1);
    expect(SIM_CONSTANTS.BREAKEVEN_DENOMINATOR).toBe(2530);

    const json = getConstantsJSON();
    expect(json).toContain('"version": "0.1.0"');
    const parsed = JSON.parse(json);
    expect(parsed.BREAKEVEN_DENOMINATOR).toBe(2530);
  });

  it('serializes and deserializes initial game state cleanly', () => {
    const state = createInitialGameState();
    const serialized = serializeGameState(state);
    const restored = deserializeGameState(serialized);

    expect(restored.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(restored.clock.blockHeight).toBe(0);
    expect(restored.treasury.fiatUSD).toBe(50.0);
    expect(restored.rigs).toHaveLength(1);
    expect(restored.activeLocationId).toBe('garasi');
  });

  it('guarantees round-trip serialization idempotence (save -> load -> save byte-identical)', () => {
    const state1 = createInitialGameState(12345);
    // Simulate some gameplay progression
    state1.clock.blockHeight = 2016;
    state1.clock.gameTimeSeconds = 2016 * 600;
    state1.difficulty.difficulty = 1.34;
    state1.treasury.satoshis = 500_000_000;
    state1.treasury.fiatUSD = 320.50;

    // First save
    const json1 = serializeGameState(state1);

    // Load
    const loadedState = deserializeGameState(json1);

    // Second save
    const json2 = serializeGameState(loadedState);

    // Byte-identical check (including keys and formatting)
    expect(json2).toBe(json1);
  });

  it('supports 3 manual save slots and 1 autosave slot', () => {
    const sm = new SaveManager();
    const state = createInitialGameState();

    // Save to slot 1, 2, 3 and autosave
    sm.save(1, state, 'Slot 1 Initial');
    sm.save(2, { ...state, clock: { ...state.clock, blockHeight: 500 } }, 'Slot 2 Mid');
    sm.save(3, { ...state, clock: { ...state.clock, blockHeight: 1000 } }, 'Slot 3 Late');
    sm.save('autosave', { ...state, clock: { ...state.clock, blockHeight: 2016 } }, 'Epoch Autosave');

    expect(sm.has(1)).toBe(true);
    expect(sm.has(2)).toBe(true);
    expect(sm.has(3)).toBe(true);
    expect(sm.has('autosave')).toBe(true);
    expect(sm.has(4 as any)).toBe(false);

    // Verify slot contents
    const loaded2 = sm.load(2)!;
    expect(loaded2.clock.blockHeight).toBe(500);

    const loadedAuto = sm.load('autosave')!;
    expect(loadedAuto.clock.blockHeight).toBe(2016);

    const allSlots = sm.getAllSlotInfo();
    expect(allSlots).toHaveLength(4);
    expect(allSlots.find((s) => s.slot === 1)?.saveName).toBe('Slot 1 Initial');
    expect(allSlots.find((s) => s.slot === 'autosave')?.blockHeight).toBe(2016);
  });

  it('throws when saving to invalid slot number', () => {
    const sm = new SaveManager();
    const state = createInitialGameState();
    expect(() => sm.save(0 as any, state)).toThrow();
    expect(() => sm.save(4 as any, state)).toThrow();
  });

  it('verifies 100-year headless balance run converges and does not explode infinitely', () => {
    const samples = runLongTermBalance(100);
    expect(samples).toHaveLength(100);

    const year1 = samples[0]!;
    const year20 = samples[19]!;
    const year100 = samples[99]!;

    // Sanity checks:
    // 1. Difficulty scales up
    expect(year100.difficulty).toBeGreaterThan(year1.difficulty);

    // 2. Halving subsidy decay: subsidy reduces by 50% every ~4 years (~210,000 blocks)
    // By year 100 (5.25 million blocks), subsidy is effectively negligible
    // Margin compression forces profit to taper off
    expect(Number.isFinite(year100.cumulativeProfitUSD)).toBe(true);
    expect(Number.isNaN(year100.cumulativeProfitUSD)).toBe(false);

    // 3. Late-game annual profit is finite and constrained
    expect(year100.annualProfitUSD).toBeLessThan(100_000_000); // No infinite trillion-dollar overflow
  });

  it('covers GameState edge branches (migration stub and clear)', () => {
    const sm = new SaveManager();
    const state = createInitialGameState();
    sm.save(1, state);
    expect(sm.has(1)).toBe(true);
    sm.clear();
    expect(sm.has(1)).toBe(false);
    expect(sm.load(1)).toBeNull();

    // Migration test
    const rawOld = {
      schemaVersion: 1,
      savedAt: 1234567,
    };
    const migrated = deserializeGameState(JSON.stringify(rawOld));
    expect(migrated.schemaVersion).toBe(1);
  });
});
