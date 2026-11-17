import { describe, it, expect } from 'vitest';
import {
  gamblerRuinProbability,
  confirmationsNeeded,
  createHeistEvent,
  advanceHeist,
  getHeistMeterPosition,
  POOL_TEMPLATES,
  createPool,
  poolTick,
  monteCarloPoolTest,
  createSelfishMining,
  createTimejack,
  createDDoS,
  createContagion,
  isWarfareActive,
  updateWarfare,
  contagionPriceMultiplier,
  mulberry32,
} from '@sim/index';

// ═══════════════════════════════════════════════════════════════
// HEIST / GAMBLER'S RUIN TESTS
// ═══════════════════════════════════════════════════════════════

describe('FASE 3: Heist & Gambler\'s Ruin (§2.4)', () => {
  it('calculates Gambler\'s Ruin probability exactly for q=0.3, z=24', () => {
    // Spec §2.4: q=0.3, z=24 -> P = (0.3 / 0.7)^24 ≈ 1.474e-9
    const p = gamblerRuinProbability(0.3, 24);
    expect(p).toBeCloseTo(1.474e-9, 12);
  });

  it('handles edge cases in gamblerRuinProbability', () => {
    // q <= 0 -> 0%
    expect(gamblerRuinProbability(0, 10)).toBe(0);
    // q >= 0.5 -> 100% (51% attack succeeds)
    expect(gamblerRuinProbability(0.5, 10)).toBe(1);
    expect(gamblerRuinProbability(0.55, 6)).toBe(1);
    // z = 0 -> 100%
    expect(gamblerRuinProbability(0.3, 0)).toBe(1);
  });

  it('calculates confirmations needed to reach security threshold', () => {
    // For q=0.3, how many confirmations for P < 1e-6?
    // (0.3 / 0.7)^z < 1e-6 -> z * ln(3/7) < -6 * ln(10) -> z >= 17
    const z = confirmationsNeeded(0.3, 1e-6);
    expect(z).toBe(17);
    expect(gamblerRuinProbability(0.3, z)).toBeLessThan(1e-6);
  });

  it('simulates heist progression with confirmations', () => {
    const heist = createHeistEvent(0.3, 6, 100_000_000); // 1 BTC at risk
    expect(heist.active).toBe(true);
    expect(heist.currentZ).toBe(0);
    expect(heist.currentProbability).toBe(1);

    const rng = mulberry32(12345);
    let state = heist;
    for (let c = 1; c <= 6; c++) {
      state = advanceHeist(state, rng);
      expect(state.currentZ).toBe(c);
      expect(state.currentProbability).toBeCloseTo(gamblerRuinProbability(0.3, c), 8);
    }

    expect(state.active).toBe(false);
    expect(state.attackSucceeded).not.toBeNull();
  });

  it('maps heist meter position safely between 0 and 1', () => {
    const heist = createHeistEvent(0.3, 24, 10_000);
    expect(getHeistMeterPosition(heist)).toBe(1); // z=0 -> P=1

    heist.currentProbability = 1.47e-9;
    expect(getHeistMeterPosition(heist)).toBeCloseTo(1.47e-9, 10);

    heist.currentProbability = -1;
    expect(getHeistMeterPosition(heist)).toBe(0);
    heist.currentProbability = 2;
    expect(getHeistMeterPosition(heist)).toBe(1);

    // Heist inactive test
    heist.active = false;
    const rng = mulberry32(1);
    expect(advanceHeist(heist, rng)).toBe(heist);

    // Confirmations edge branches
    expect(confirmationsNeeded(0, 0.01)).toBe(0);
    expect(confirmationsNeeded(0.5, 0.01)).toBe(Infinity);
    expect(confirmationsNeeded(0.3, 1.5)).toBe(0);
    expect(confirmationsNeeded(0.3, 0)).toBe(Infinity);
  });
});

// ═══════════════════════════════════════════════════════════════
// POOL SIMULATION & MONTE CARLO TESTS
// ═══════════════════════════════════════════════════════════════

describe('FASE 3: Pool Templates & Monte Carlo Simulation', () => {
  it('provides 4 standard pool templates', () => {
    expect(POOL_TEMPLATES).toHaveLength(4);
    const slush = POOL_TEMPLATES.find((p) => p.name === 'Slush Pool');
    expect(slush).toBeDefined();
    expect(slush?.config.scheme).toBe('PPLNS');
    expect(slush?.config.feeRate).toBe(0.02);
  });

  it('executes pool ticks and registers accumulated payouts', () => {
    const template = POOL_TEMPLATES[0]!;
    const pool = createPool(template);
    const rng = mulberry32(42);

    const reward = 625_000_000;
    const playerHash = 100;
    const netHash = 10_000_000;

    let total = 0;
    for (let i = 0; i < 100; i++) {
      total += poolTick(pool, reward, playerHash, netHash, rng);
    }

    expect(pool.totalPayoutsSatoshis).toBe(total);
    expect(total).toBeGreaterThan(0);
  });

  it('runs Monte Carlo test with 100k samples within ±5% tolerance of theoretical expected payout', () => {
    const blockReward = 625_000_000;
    const playerHash = 50;
    const networkHash = 1_000_000;
    const feeRate = 0.02; // 2%
    const orphanRate = 0.005; // 0.5%
    const ppsConfig = { scheme: 'PPS' as const, feeRate, pplnsWindow: 0 };

    // Theoretical payout per tick:
    // Reward * (playerHash / netHash) * (1 - fee) * (1 - orphan)
    const theoreticalExpected = blockReward * (playerHash / networkHash) * (1 - feeRate) * (1 - orphanRate);

    const result = monteCarloPoolTest(
      ppsConfig,
      blockReward,
      playerHash,
      networkHash,
      999,
      100_000,
      orphanRate
    );

    // Tolerance ±5%
    const lowerBound = theoreticalExpected * 0.95;
    const upperBound = theoreticalExpected * 1.05;

    expect(result.mean).toBeGreaterThanOrEqual(lowerBound);
    expect(result.mean).toBeLessThanOrEqual(upperBound);
  });
});

// ═══════════════════════════════════════════════════════════════
// WARFARE TESTS
// ═══════════════════════════════════════════════════════════════

describe('FASE 3: Warfare Mechanics', () => {
  it('creates and manages selfish mining event', () => {
    const event = createSelfishMining(1000, 50, 0.4);
    expect(event.type).toBe('selfish_mining');
    expect(event.active).toBe(true);

    if (event.params.type === 'selfish_mining') {
      expect(event.params.selfishHashFraction).toBe(0.4);
      // alpha = 0.4 > 1/3 -> revenue advantage > 0
      expect(event.params.revenueAdvantage).toBeGreaterThan(0);
    }

    // Active at block 1020
    expect(isWarfareActive(event, 1020)).toBe(true);
    const updated = updateWarfare(event, 1020);
    if (updated.params.type === 'selfish_mining') {
      expect(updated.params.withheldBlocks).toBe(20);
    }

    // Deactivates after duration
    const ended = updateWarfare(event, 1051);
    expect(ended.active).toBe(false);
  });

  it('creates and tracks timejack attack offset', () => {
    const event = createTimejack(500, 100, 7200); // 2 hours offset
    expect(event.type).toBe('timejack');
    if (event.params.type === 'timejack') {
      expect(event.params.clockOffsetSeconds).toBe(7200);
      expect(event.params.detected).toBe(false);
    }
  });

  it('creates DDoS attack against a pool', () => {
    const event = createDDoS(200, 30, 'Slush Pool', 0.5); // 50% drop
    expect(event.type).toBe('ddos');
    if (event.params.type === 'ddos') {
      expect(event.params.targetPool).toBe('Slush Pool');
      expect(event.params.uptimeReduction).toBe(0.5);
    }
  });

  it('simulates contagion exchange hack and withdrawal freeze duration', () => {
    const event = createContagion(300, 100, 'Mt. Goxx', 0.4, 40); // 40% price drop, 40 blocks freeze
    expect(event.type).toBe('contagion');
    if (event.params.type === 'contagion') {
      expect(contagionPriceMultiplier(event.params)).toBe(0.6);
      expect(event.params.withdrawalsFrozen).toBe(true);
    }

    // After 20 blocks: still frozen
    const mid = updateWarfare(event, 320);
    if (mid.params.type === 'contagion') {
      expect(mid.params.withdrawalsFrozen).toBe(true);
    }

    // After 45 blocks: freeze lifted
    const thawed = updateWarfare(event, 345);
    if (thawed.params.type === 'contagion') {
      expect(thawed.params.withdrawalsFrozen).toBe(false);
    }
  });
});
