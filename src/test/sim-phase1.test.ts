import { describe, it, expect, vi } from 'vitest';
import {
  Clock,
  SECONDS_PER_BLOCK,
  BLOCKS_PER_EPOCH,
  EXPECTED_EPOCH_MINUTES,
  HALVING_INTERVAL,
  getBlockReward,
  Difficulty,
  calcRetargetFactor,
  computeEpochClockView,
  formatEpochClockDisplay,
} from '@sim/index';

describe('FASE 1: Sim Core — Clock', () => {
  it('initializes with default state at block 0 and time 0', () => {
    const clock = new Clock();
    expect(clock.getBlockHeight()).toBe(0);
    expect(clock.getGameTimeSeconds()).toBe(0);
    expect(clock.getSpeed()).toBe(1);
    expect(clock.isPaused()).toBe(false);
  });

  it('advances 1 block every 600 seconds of game-time (speed x1)', () => {
    const clock = new Clock();
    const onBlock = vi.fn();
    clock.on('block-ticked', onBlock);

    // Advance 599s -> no block yet
    clock.update(599);
    expect(clock.getBlockHeight()).toBe(0);
    expect(onBlock).not.toHaveBeenCalled();

    // Advance 1s -> block 1 ticked
    clock.update(1);
    expect(clock.getBlockHeight()).toBe(1);
    expect(onBlock).toHaveBeenCalledTimes(1);
    expect(onBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        blockHeight: 1,
        epochNumber: 0,
        blockInEpoch: 1,
      })
    );
  });

  it('supports speed multipliers x1, x10, x60, x300', () => {
    const clock = new Clock();

    clock.setSpeed(10);
    expect(clock.getSpeed()).toBe(10);
    // At x10, 60s real-time = 600s game-time = 1 block
    clock.update(60);
    expect(clock.getBlockHeight()).toBe(1);

    clock.setSpeed(60);
    // At x60, 10s real-time = 600s game-time = 1 block
    clock.update(10);
    expect(clock.getBlockHeight()).toBe(2);

    clock.setSpeed(300);
    // At x300, 2s real-time = 600s game-time = 1 block
    clock.update(2);
    expect(clock.getBlockHeight()).toBe(3);
  });

  it('respects pause and togglePause', () => {
    const clock = new Clock();
    clock.pause();
    expect(clock.isPaused()).toBe(true);

    clock.update(1200); // 2 blocks worth of time
    expect(clock.getBlockHeight()).toBe(0);

    clock.resume();
    expect(clock.isPaused()).toBe(false);
    clock.update(600);
    expect(clock.getBlockHeight()).toBe(1);

    clock.togglePause();
    expect(clock.isPaused()).toBe(true);
  });

  it('emits epoch-ended after exactly 2016 blocks', () => {
    const clock = new Clock();
    const onEpochEnded = vi.fn();
    clock.on('epoch-ended', onEpochEnded);

    // Simulate 2016 blocks: 2016 * 600 seconds
    clock.setSpeed(300);
    const realSecondsForEpoch = (BLOCKS_PER_EPOCH * SECONDS_PER_BLOCK) / 300;
    clock.update(realSecondsForEpoch);

    expect(clock.getBlockHeight()).toBe(2016);
    expect(onEpochEnded).toHaveBeenCalledTimes(1);
    expect(onEpochEnded).toHaveBeenCalledWith(
      expect.objectContaining({
        epochNumber: 0,
        blockHeight: 2016,
        epochDurationMinutes: EXPECTED_EPOCH_MINUTES,
      })
    );
  });

  it('calculates halving block reward accurately (halving every 210,000 blocks)', () => {
    // Era 0: 50 BTC = 5,000,000,000 sats
    expect(getBlockReward(0)).toBe(5_000_000_000);
    expect(getBlockReward(209_999)).toBe(5_000_000_000);

    // Era 1 (block 210,000): 25 BTC = 2,500,000,000 sats
    expect(getBlockReward(210_000)).toBe(2_500_000_000);

    // Era 2 (block 420,000): 12.5 BTC = 1,250,000,000 sats
    expect(getBlockReward(420_000)).toBe(1_250_000_000);

    // Era 3 (block 630,000): 6.25 BTC = 625,000,000 sats
    expect(getBlockReward(630_000)).toBe(625_000_000);

    // After 64 halvings: 0 satoshi
    expect(getBlockReward(64 * HALVING_INTERVAL)).toBe(0);
  });

  it('exposes state and helper methods on Clock', () => {
    const clock = new Clock();
    clock.update(600);
    expect(clock.getBlocksToHalving()).toBe(HALVING_INTERVAL - 1);
    expect(clock.getBlockReward()).toBe(5_000_000_000);

    const state = clock.getState();
    expect(state.blockHeight).toBe(1);
    expect(state.gameTimeSeconds).toBe(600);

    // Test restoring from saved state
    const restoredClock = new Clock(state);
    expect(restoredClock.getBlockHeight()).toBe(1);
  });
});

describe('FASE 1: Sim Core — Difficulty Retarget', () => {
  it('keeps genesis difficulty unchanged on epoch 0', () => {
    const diff = new Difficulty();
    expect(diff.getDifficulty()).toBe(1.0);

    const newDiff = diff.retarget(0, 10000);
    expect(newDiff).toBe(1.0);
    expect(diff.getHistory()).toHaveLength(1);
  });

  it('clamps retarget to max 4x increase when epoch was extremely fast', () => {
    const diff = new Difficulty();
    // 2016 blocks mined in only 1000 minutes (expected 20160 min, ratio = 1000/20160 < 0.25)
    // ratio clamped to 0.25 -> difficulty multiplier = 1/0.25 = 4.0
    const newDiff = diff.retarget(1, 1000);
    expect(newDiff).toBeCloseTo(4.0, 5);
  });

  it('clamps retarget to max 4x decrease (factor 0.25) when epoch was extremely slow', () => {
    const diff = new Difficulty();
    // 2016 blocks mined in 100,000 minutes (ratio = 100000/20160 > 4)
    // ratio clamped to 4.0 -> difficulty multiplier = 1/4 = 0.25
    const newDiff = diff.retarget(1, 100_000);
    expect(newDiff).toBeCloseTo(0.25, 5);
  });

  it('calculates proportional difficulty change within normal bounds', () => {
    const diff = new Difficulty();
    // Epoch took exactly half the time (10,080 minutes instead of 20,160)
    // ratio = 0.5 -> difficulty should double (2x)
    const newDiff = diff.retarget(1, 10_080);
    expect(newDiff).toBeCloseTo(2.0, 5);
  });

  it('calcRetargetFactor helper matches retarget behavior', () => {
    expect(calcRetargetFactor(20_160)).toBeCloseTo(1.0, 5);
    expect(calcRetargetFactor(10_080)).toBeCloseTo(2.0, 5);
    expect(calcRetargetFactor(40_320)).toBeCloseTo(0.5, 5);
    expect(calcRetargetFactor(1_000)).toBeCloseTo(4.0, 5);
    expect(calcRetargetFactor(200_000)).toBeCloseTo(0.25, 5);
  });

  it('exposes and restores difficulty state', () => {
    const diff = new Difficulty();
    diff.retarget(1, 10_080);
    const state = diff.getState();
    expect(state.difficulty).toBeCloseTo(2.0, 5);
    expect(state.history).toHaveLength(1);

    const restored = new Difficulty(state);
    expect(restored.getDifficulty()).toBeCloseTo(2.0, 5);
  });
});

describe('FASE 1: Sim Core — EpochClockState', () => {
  it('correctly tracks genesis epoch (block 0)', () => {
    const view = computeEpochClockView(0);
    expect(view.epochNumber).toBe(0);
    expect(view.blockHeight).toBe(0);
    expect(view.blockInEpoch).toBe(0);
    expect(view.blocksInThisEpoch).toBe(2016);
    expect(view.retargetProgress).toBe(0);
    expect(view.isDesyncActive).toBe(false);
    expect(view.desyncExtraBlocks).toBe(0);
    expect(view.blocksToHalving).toBe(HALVING_INTERVAL);
    expect(view.nextEpochBlock).toBe(2016);

    const display = formatEpochClockDisplay(view);
    expect(display).toContain('EPOCH 0');
    expect(display).not.toContain('desync halving');
  });

  it('correctly transitions across epoch 103 -> 104 where desync becomes active', () => {
    // Epoch 103 ends at 104 * 2016 = 209,664
    const block103End = 104 * 2016 - 1; // 209,663
    const view103 = computeEpochClockView(block103End);
    expect(view103.epochNumber).toBe(103);
    expect(view103.isDesyncActive).toBe(false);
    expect(view103.desyncExtraBlocks).toBe(0);

    // Epoch 104 starts at 209,664
    const block104Start = 104 * 2016; // 209,664
    const view104 = computeEpochClockView(block104Start);
    expect(view104.epochNumber).toBe(104);
    expect(view104.isDesyncActive).toBe(true);
    expect(view104.desyncExtraBlocks).toBe(336);
    // Halving is at 210,000 -> exactly 336 blocks away from 209,664!
    expect(view104.blocksToHalving).toBe(336);
  });

  it('correctly handles boundary at block 437.182 / 437.472 (HUD example in §2.6)', () => {
    // 437.472 = 217 * 2016. Epoch 216 runs from 435.456 to 437.472.
    const view = computeEpochClockView(437_182);
    expect(view.epochNumber).toBe(216);
    expect(view.blockHeight).toBe(437_182);
    expect(view.nextEpochBlock).toBe(437_472);
    expect(view.isDesyncActive).toBe(true);
    expect(view.desyncExtraBlocks).toBe(336);

    const display = formatEpochClockDisplay(view);
    expect(display).toContain('EPOCH 216');
    expect(display).toContain('437.182');
    expect(display).toContain('437.472');
    expect(display).toContain('desync halving: +336 blok');
  });

  it('major tick is every 504 blocks (4 quadrants of 2016)', () => {
    const view = computeEpochClockView(1000);
    expect(view.majorTickInterval).toBe(504);
    expect(BLOCKS_PER_EPOCH / view.majorTickInterval).toBe(4);
  });
});

describe('FASE 1: Sim Core — EventEmitter', () => {
  it('supports off() and removeAllListeners()', () => {
    const clock = new Clock();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    clock.on('block-ticked', handler1);
    clock.on('block-ticked', handler2);

    clock.update(600);
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);

    clock.off('block-ticked', handler1);
    clock.update(600);
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(2);

    clock.removeAllListeners();
    clock.update(600);
    expect(handler2).toHaveBeenCalledTimes(2);
  });
});
