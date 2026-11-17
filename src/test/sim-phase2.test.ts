import { describe, it, expect } from 'vitest';
import {
  RIG_SPECS,
  getRigSpec,
  createRigInstance,
  getEffectiveJth,
  getEffectiveHashrate,
  getEffectiveWatts,
  updateHeat,
  LOCATIONS,
  getLocation,
  electricityCostPerSecond,
  electricityCostForPeriod,
  powerConsumptionWatts,
  blockFindProbability,
  soloBlockFound,
  isOrphaned,
  ppsRevenuePerTick,
  pplnsRevenuePerTick,
  fppsRevenuePerTick,
  poolRevenuePerTick,
  SOLO_ORPHAN_RATE,
  POOL_ORPHAN_RATE,
  Market,
  mulberry32,
  breakevenJth,
  isRigProfitable,
} from '@sim/index';

// ═══════════════════════════════════════════════════════════════
// RIG TESTS
// ═══════════════════════════════════════════════════════════════

describe('FASE 2: Rig specs', () => {
  it('has 8 rig specs matching GDD v3', () => {
    expect(RIG_SPECS).toHaveLength(8);
  });

  it('CPU Genesis has J/TH = 5500 (era 1)', () => {
    const cpu = getRigSpec('cpu_genesis');
    expect(cpu).toBeDefined();
    expect(cpu!.baseJth).toBe(5500);
    expect(cpu!.era).toBe(1);
  });

  it('ASIC H9 has J/TH = 98 (era 5)', () => {
    const h9 = getRigSpec('asic_h9');
    expect(h9).toBeDefined();
    expect(h9!.baseJth).toBe(98);
    expect(h9!.era).toBe(5);
  });

  it('Immersion H19 has J/TH = 29.5 (era 6)', () => {
    const h19 = getRigSpec('immersion_h19');
    expect(h19).toBeDefined();
    expect(h19!.baseJth).toBe(29.5);
  });

  it('Blade H21-L has J/TH = 17.5 (era 7)', () => {
    const h21 = getRigSpec('blade_h21l');
    expect(h21).toBeDefined();
    expect(h21!.baseJth).toBe(17.5);
  });

  it('Sunset Node has J/TH = 0 (era 8, symbolic)', () => {
    const sunset = getRigSpec('sunset_node');
    expect(sunset).toBeDefined();
    expect(sunset!.baseJth).toBe(0);
    expect(sunset!.era).toBe(8);

    expect(getRigSpec('non_existent')).toBeUndefined();
  });
});

describe('FASE 2: Rig instance & heat', () => {
  it('creates instance with status online and heat 0', () => {
    const inst = createRigInstance('asic_h9', 5);
    expect(inst.status).toBe('online');
    expect(inst.heat).toBe(0);
    expect(inst.quantity).toBe(5);
    expect(inst.specId).toBe('asic_h9');
  });

  it('effective J/TH = base when heat < 0.7 (no throttle)', () => {
    const spec = getRigSpec('asic_h9')!;
    const inst = createRigInstance('asic_h9');
    inst.heat = 0.5;
    expect(getEffectiveJth(spec, inst)).toBe(98);
  });

  it('effective J/TH increases up to +25% at max heat (throttling)', () => {
    const spec = getRigSpec('asic_h9')!;
    const inst = createRigInstance('asic_h9');
    inst.heat = 1.0;
    inst.status = 'throttling';
    // At heat 1.0: J/TH = 98 * 1.25 = 122.5
    expect(getEffectiveJth(spec, inst)).toBe(122.5);
  });

  it('effective J/TH is Infinity when offline', () => {
    const spec = getRigSpec('asic_h9')!;
    const inst = createRigInstance('asic_h9');
    inst.status = 'offline';
    expect(getEffectiveJth(spec, inst)).toBe(Infinity);
  });

  it('effective hashrate is 0 when offline', () => {
    const spec = getRigSpec('asic_h9')!;
    const inst = createRigInstance('asic_h9');
    inst.status = 'offline';
    expect(getEffectiveHashrate(spec, inst)).toBe(0);
    expect(getEffectiveWatts(spec, inst)).toBe(0);
  });

  it('updateHeat increases heat when online and triggers throttling', () => {
    const inst = createRigInstance('asic_h9');
    inst.heat = 0.65;
    const result = updateHeat(inst, 5, 0.01, 0.02);
    expect(result.heat).toBeGreaterThan(0.65);
    // After big delta, should cross threshold
    const inst2 = createRigInstance('asic_h9');
    inst2.heat = 0.69;
    const result2 = updateHeat(inst2, 1, 0.01, 0.02);
    expect(result2.newStatus).toBe('throttling');
  });

  it('updateHeat decreases heat when offline', () => {
    const inst = createRigInstance('asic_h9');
    inst.status = 'offline';
    inst.heat = 0.5;
    const result = updateHeat(inst, 10, 0.01, 0.02);
    expect(result.heat).toBeLessThan(0.5);
    expect(result.newStatus).toBe('offline');
  });
});

// ═══════════════════════════════════════════════════════════════
// ENERGY TESTS
// ═══════════════════════════════════════════════════════════════

describe('FASE 2: Energy / Electricity', () => {
  it('has 5 locations matching GDD v3 §2.3', () => {
    expect(LOCATIONS).toHaveLength(5);
    expect(getLocation('garasi')?.pricePerKwh).toBe(0.15);
    expect(getLocation('sichuan')?.pricePerKwh).toBe(0.04);
    expect(getLocation('texas')?.pricePerKwh).toBe(0.07);
    expect(getLocation('iceland')?.pricePerKwh).toBe(0.05);
    expect(getLocation('datacenter')?.pricePerKwh).toBe(0.09);
  });

  it('calculates electricity cost per second correctly', () => {
    // H9: 14 TH/s, 98 J/TH, garasi $0.15/kWh
    // Power = 14 * 98 = 1372 W = 1.372 kW
    // Cost/hour = 1.372 * 0.15 = $0.2058
    // Cost/sec = 0.2058 / 3600 ≈ $5.717e-5
    const cost = electricityCostPerSecond(14, 98, 0.15);
    expect(cost).toBeCloseTo(0.2058 / 3600, 8);
  });

  it('calculates cost for a full block (600s)', () => {
    const costPerSec = electricityCostPerSecond(14, 98, 0.15);
    const costBlock = electricityCostForPeriod(14, 98, 0.15, 600);
    expect(costBlock).toBeCloseTo(costPerSec * 600, 8);
  });

  it('calculates power consumption in watts', () => {
    expect(powerConsumptionWatts(14, 98)).toBe(1372);
  });
});

// ═══════════════════════════════════════════════════════════════
// REVENUE TESTS
// ═══════════════════════════════════════════════════════════════

describe('FASE 2: Revenue — solo mining', () => {
  it('block find probability = player/network hashrate', () => {
    expect(blockFindProbability(14, 100_000_000)).toBeCloseTo(14 / 100_000_000, 15);
    expect(blockFindProbability(0, 100_000_000)).toBe(0);
    expect(blockFindProbability(14, 0)).toBe(0);
  });

  it('soloBlockFound respects probability distribution', () => {
    const rng = mulberry32(123);
    let found = 0;
    const trials = 100_000;
    const p = 0.001;
    for (let i = 0; i < trials; i++) {
      if (soloBlockFound(p, rng)) found++;
    }
    // Expected: 100 ± some variance
    expect(found).toBeGreaterThan(50);
    expect(found).toBeLessThan(200);
  });

  it('orphan rate constants match spec', () => {
    expect(SOLO_ORPHAN_RATE).toBe(0.015);
    expect(POOL_ORPHAN_RATE).toBe(0.005);

    const rngAlwaysTrue = () => 0.001;
    const rngAlwaysFalse = () => 0.999;
    expect(isOrphaned(rngAlwaysTrue, 0.015)).toBe(true);
    expect(isOrphaned(rngAlwaysFalse, 0.015)).toBe(false);

    expect(soloBlockFound(0, rngAlwaysTrue)).toBe(false);
    expect(soloBlockFound(1, rngAlwaysFalse)).toBe(true);
  });
});

describe('FASE 2: Revenue — pool payouts', () => {
  const blockReward = 625_000_000; // 6.25 BTC in sats
  const playerHash = 14; // TH/s
  const networkHash = 100_000_000; // TH/s

  it('PPS gives steady payout minus fee', () => {
    const revenue = ppsRevenuePerTick(blockReward, playerHash, networkHash, 0.02);
    const expected = blockReward * (playerHash / networkHash) * (1 - 0.02);
    expect(revenue).toBeCloseTo(expected, 5);
  });

  it('PPS revenue < expected solo (due to fee)', () => {
    const pps = ppsRevenuePerTick(blockReward, playerHash, networkHash, 0.02);
    const soloExpected = blockReward * (playerHash / networkHash);
    expect(pps).toBeLessThan(soloExpected);
  });

  it('PPLNS has variance around same expected value', () => {
    const rng = mulberry32(42);
    let total = 0;
    const ticks = 10_000;
    for (let i = 0; i < ticks; i++) {
      total += pplnsRevenuePerTick(blockReward, playerHash, networkHash, 0.02, rng);
    }
    const avg = total / ticks;
    const ppsBaseline = ppsRevenuePerTick(blockReward, playerHash, networkHash, 0.02);
    // Average should be close to PPS (within 5%)
    expect(avg).toBeCloseTo(ppsBaseline, 0);
  });

  it('FPPS includes tx fees', () => {
    const txFees = 50_000_000; // 0.5 BTC in sats
    const fpps = fppsRevenuePerTick(blockReward, playerHash, networkHash, 0.02, txFees);
    const pps = ppsRevenuePerTick(blockReward, playerHash, networkHash, 0.02);
    expect(fpps).toBeGreaterThan(pps);
  });

  it('poolRevenuePerTick dispatches to correct scheme', () => {
    const rng = mulberry32(42);
    const ppsConfig = { scheme: 'PPS' as const, feeRate: 0.02, pplnsWindow: 0 };
    const ppsRev = poolRevenuePerTick(ppsConfig, blockReward, playerHash, networkHash, rng);
    const expected = ppsRevenuePerTick(blockReward, playerHash, networkHash, 0.02);
    expect(ppsRev).toBeCloseTo(expected, 5);

    const pplnsConfig = { scheme: 'PPLNS' as const, feeRate: 0.02, pplnsWindow: 10 };
    const pplnsRev = poolRevenuePerTick(pplnsConfig, blockReward, playerHash, networkHash, rng);
    expect(pplnsRev).toBeGreaterThan(0);

    const fppsConfig = { scheme: 'FPPS' as const, feeRate: 0.02, pplnsWindow: 0 };
    const fppsRev = poolRevenuePerTick(fppsConfig, blockReward, playerHash, networkHash, rng, 1000);
    expect(fppsRev).toBeGreaterThan(ppsRev);
  });
});

// ═══════════════════════════════════════════════════════════════
// MARKET TESTS
// ═══════════════════════════════════════════════════════════════

describe('FASE 2: Market & Break-even', () => {
  it('mulberry32 is deterministic (same seed = same sequence)', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('mulberry32 produces values in [0, 1)', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('Market initializes at $1 with seed 42', () => {
    const m = new Market();
    expect(m.getPrice()).toBe(1.0);
  });

  it('Market tick changes price (non-deterministic direction)', () => {
    const m = new Market();
    m.tick();
    // Price should have changed
    expect(m.getPrice()).not.toBe(1.0);
  });

  it('Market is deterministic with same seed', () => {
    const m1 = new Market();
    const m2 = new Market();
    for (let i = 0; i < 100; i++) {
      m1.tick();
      m2.tick();
    }
    expect(m1.getPrice()).toBe(m2.getPrice());
  });

  it('Market save/restore produces same future', () => {
    const m1 = new Market();
    for (let i = 0; i < 50; i++) m1.tick();
    const saved = m1.getState();

    // Continue m1
    for (let i = 0; i < 50; i++) m1.tick();
    const price1 = m1.getPrice();

    // Restore from save and continue
    const m2 = new Market(saved);
    for (let i = 0; i < 50; i++) m2.tick();
    const price2 = m2.getPrice();

    expect(price2).toBe(price1);
  });

  it('Market price never goes below $0.01', () => {
    const m = new Market();
    m.setEra(4); // Bear market era
    for (let i = 0; i < 100_000; i++) m.tick();
    expect(m.getPrice()).toBeGreaterThanOrEqual(0.01);

    m.recordPrice();
    expect(m.getPriceHistory().length).toBeGreaterThan(1);

    m.setSeed(999);
    expect(m.getPrice()).toBeGreaterThanOrEqual(0.01);
  });

  it('breakevenJth matches 4 validation points from §2.3', () => {
    expect(breakevenJth(30_000)).toBeCloseTo(11.86, 1);  // spec says 11.9
    expect(breakevenJth(60_000)).toBeCloseTo(23.72, 1);  // spec says 23.7
    expect(breakevenJth(100_000)).toBeCloseTo(39.53, 1); // spec says 39.5
    expect(breakevenJth(180_000)).toBeCloseTo(71.15, 1); // spec says 71.1
  });

  it('H9 (98 J/TH) is unprofitable at $30k (BE=11.9), and at $180k (BE=71.1)', () => {
    // BE = price / 2530. Rig is profitable when its J/TH <= BE.
    // At $30k:  BE = 11.86 → 98 > 11.86 → UNPROFITABLE ✓
    // At $180k: BE = 71.15 → 98 > 71.15 → UNPROFITABLE (needs ~$248k)
    // At $248k: BE = 98.02 → 98 <= 98.02 → PROFITABLE ✓
    expect(isRigProfitable(98, 30_000)).toBe(false);
    expect(isRigProfitable(98, 180_000)).toBe(false);
    expect(isRigProfitable(98, 248_000)).toBe(true);
    // The GDD notes H9 as "hero rig era 5" — it becomes profitable
    // only when BTC price is high enough (or with cheap electricity location).
  });

  it('H19 (29.5 J/TH) profitable at $100k', () => {
    expect(isRigProfitable(29.5, 100_000)).toBe(true); // BE=39.5 > 29.5
  });

  it('H21-L (17.5 J/TH) profitable at $60k', () => {
    expect(isRigProfitable(17.5, 60_000)).toBe(true); // BE=23.7 > 17.5
  });
});
