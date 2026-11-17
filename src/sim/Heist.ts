/**
 * Heist — Gambler's Ruin confirmation model.
 *
 * Merchant waits z confirmations. Attacker has hashrate fraction q.
 * P(attack success) = (q/p)^z  where p = 1-q (honest fraction).
 *
 * From GDD v3 §2.4:
 *   q=0.3, z=24 → P = 1.47×10⁻⁹
 *
 * No Phaser dependency.
 */

/**
 * Calculate probability of a double-spend attack succeeding
 * using the Gambler's Ruin formula.
 *
 * @param q - Attacker's fraction of total hashrate (0–1).
 * @param z - Number of confirmations the merchant requires.
 * @returns Probability of attack success (0–1).
 */
export function gamblerRuinProbability(q: number, z: number): number {
  if (q <= 0) return 0;
  if (q >= 0.5) return 1; // Attacker has majority — always succeeds
  if (z <= 0) return 1;   // No confirmations — instant success

  const p = 1 - q;
  return Math.pow(q / p, z);
}

/**
 * Calculate the number of confirmations needed to bring attack probability
 * below a given threshold.
 *
 * @param q - Attacker's hashrate fraction (0–1).
 * @param targetP - Maximum acceptable attack probability.
 * @returns Minimum z (confirmations).
 */
export function confirmationsNeeded(q: number, targetP: number): number {
  if (q <= 0) return 0;
  if (q >= 0.5) return Infinity;
  if (targetP >= 1) return 0;
  if (targetP <= 0) return Infinity;

  const ratio = q / (1 - q);
  // (q/p)^z <= targetP  →  z >= log(targetP) / log(q/p)
  return Math.ceil(Math.log(targetP) / Math.log(ratio));
}

export interface HeistEvent {
  /** Unique heist event ID. */
  id: string;
  /** Attacker's hashrate fraction. */
  attackerQ: number;
  /** Required confirmations. */
  requiredZ: number;
  /** Current confirmations elapsed. */
  currentZ: number;
  /** Attack probability at current z. */
  currentProbability: number;
  /** Whether the heist is still active. */
  active: boolean;
  /** Whether the attack succeeded (resolved at the end). */
  attackSucceeded: boolean | null;
  /** Amount at risk in satoshis. */
  amountSatoshis: number;
}

/**
 * Create a new heist event.
 */
export function createHeistEvent(
  attackerQ: number,
  requiredZ: number,
  amountSatoshis: number,
): HeistEvent {
  return {
    id: `heist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    attackerQ,
    requiredZ,
    currentZ: 0,
    currentProbability: gamblerRuinProbability(attackerQ, 0),
    active: true,
    attackSucceeded: null,
    amountSatoshis,
  };
}

/**
 * Advance a heist by one confirmation.
 * Returns updated heist event.
 */
export function advanceHeist(heist: HeistEvent, rng: () => number): HeistEvent {
  if (!heist.active) return heist;

  const updated = { ...heist };
  updated.currentZ++;
  updated.currentProbability = gamblerRuinProbability(updated.attackerQ, updated.currentZ);

  // Check if heist is resolved
  if (updated.currentZ >= updated.requiredZ) {
    updated.active = false;
    // Final check: did the attacker manage to catch up?
    // The probability at this point is the remaining chance
    updated.attackSucceeded = rng() < updated.currentProbability;
  }

  return updated;
}

/**
 * Get the HUD display data for the Gambler's Ruin meter.
 * Returns a value between 0 (safe) and 1 (danger) for the meter position.
 */
export function getHeistMeterPosition(heist: HeistEvent): number {
  // Map probability to 0–1 where 0 = safe (low P), 1 = danger (high P)
  // Use log scale for better visual spread
  const p = heist.currentProbability;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  // Clamp to visible range
  return Math.min(1, Math.max(0, p));
}

