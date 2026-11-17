/**
 * Market — BTC price random-walk model with era-based drift.
 *
 * Uses Mulberry32 seeded PRNG for deterministic replays.
 * Price follows geometric Brownian motion (GBM) with era-specific
 * drift and volatility to simulate bull/bear cycles from GDD v3.
 *
 * Break-even utility: breakevenJth(price) = price / 2530
 *
 * No Phaser dependency.
 */

/**
 * Mulberry32 — 32-bit seeded PRNG.
 * Deterministic: same seed = same sequence.
 * Returns a function that produces numbers in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Era-specific market parameters. */
export interface EraMarketParams {
  /** Annual drift (expected return). Positive = bull, negative = bear. */
  annualDrift: number;
  /** Annual volatility (standard deviation). */
  annualVolatility: number;
}

/**
 * Era market parameters from GDD v3 scenario script.
 * Index = era number (1-based). Era 0 unused (pre-game).
 */
export const ERA_MARKET_PARAMS: readonly EraMarketParams[] = [
  { annualDrift: 0, annualVolatility: 0 },        // era 0 placeholder
  { annualDrift: 2.0, annualVolatility: 1.5 },     // era 1: genesis boom
  { annualDrift: 1.5, annualVolatility: 1.2 },     // era 2: GPU gold rush
  { annualDrift: 0.5, annualVolatility: 0.8 },     // era 3: FPGA transition
  { annualDrift: -0.3, annualVolatility: 0.6 },    // era 4: first winter
  { annualDrift: 1.0, annualVolatility: 0.9 },     // era 5: ASIC bull run
  { annualDrift: 0.3, annualVolatility: 0.5 },     // era 6: immersion era
  { annualDrift: 0.1, annualVolatility: 0.4 },     // era 7: mature market
  { annualDrift: 0.0, annualVolatility: 0.3 },     // era 8: fee-only sunset
];

export interface MarketState {
  /** Current BTC price in USD. */
  priceBTC: number;
  /** Current era (for drift/volatility lookup). */
  era: number;
  /** RNG seed (for save/restore). */
  seed: number;
  /** Number of RNG calls consumed (for deterministic restore). */
  rngCallCount: number;
  /** Price history (sampled periodically). */
  priceHistory: number[];
}

export class Market {
  private state: MarketState;
  private rng: () => number;

  constructor(savedState?: MarketState) {
    if (savedState) {
      this.state = { ...savedState, priceHistory: [...savedState.priceHistory] };
      // Restore RNG to same position
      this.rng = mulberry32(savedState.seed);
      for (let i = 0; i < savedState.rngCallCount; i++) {
        this.rng();
      }
    } else {
      this.state = {
        priceBTC: 1.0, // $1 at genesis (era 1)
        era: 1,
        seed: 42,
        rngCallCount: 0,
        priceHistory: [1.0],
      };
      this.rng = mulberry32(42);
    }
  }

  /**
   * Advance price by one block tick using geometric Brownian motion.
   * dt = 1 block = 10 min = 10/(365.25*24*60) years
   */
  tick(): number {
    const dtYears = 10 / (365.25 * 24 * 60); // ~1.9×10⁻⁵ years per block
    const params = ERA_MARKET_PARAMS[this.state.era] ?? ERA_MARKET_PARAMS[ERA_MARKET_PARAMS.length - 1]!;

    // Box-Muller transform for normal distribution
    const u1 = Math.max(1e-10, this.nextRandom()); // avoid log(0)
    const u2 = this.nextRandom();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // GBM: dS = S * (mu*dt + sigma*sqrt(dt)*Z)
    const drift = params.annualDrift * dtYears;
    const diffusion = params.annualVolatility * Math.sqrt(dtYears) * z;
    const change = drift + diffusion;

    this.state.priceBTC *= Math.exp(change);

    // Floor at $0.01 (never zero)
    this.state.priceBTC = Math.max(0.01, this.state.priceBTC);

    return this.state.priceBTC;
  }

  /** Record current price to history (call periodically, e.g. every epoch). */
  recordPrice(): void {
    this.state.priceHistory.push(this.state.priceBTC);
  }

  setEra(era: number): void {
    this.state.era = era;
  }

  setSeed(seed: number): void {
    this.state.seed = seed;
    this.state.rngCallCount = 0;
    this.rng = mulberry32(seed);
  }

  getPrice(): number {
    return this.state.priceBTC;
  }

  getPriceHistory(): readonly number[] {
    return this.state.priceHistory;
  }

  getState(): MarketState {
    return {
      ...this.state,
      priceHistory: [...this.state.priceHistory],
    };
  }

  private nextRandom(): number {
    this.state.rngCallCount++;
    return this.rng();
  }
}

/**
 * Break-even J/TH calculation from GDD v3 §2.3.
 *
 * breakevenJth = priceBTC / 2530
 *
 * Rigs with J/TH above this value are losing money on electricity.
 *
 * Validation points from spec:
 *   $30k  → 11.9 J/TH
 *   $60k  → 23.7 J/TH
 *   $100k → 39.5 J/TH
 *   $180k → 71.1 J/TH
 */
export function breakevenJth(priceBTC: number): number {
  return priceBTC / 2530;
}

/**
 * Check if a rig is profitable at given BTC price.
 */
export function isRigProfitable(rigJth: number, priceBTC: number): boolean {
  return rigJth <= breakevenJth(priceBTC);
}

