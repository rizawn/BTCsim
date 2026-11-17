/**
 * Energy — electricity cost model.
 *
 * Locations with $/kWh from GDD v3 §2.3:
 *   garasi $0.15, Sichuan $0.04, Texas $0.07, Iceland $0.05, data center $0.09
 *
 * Consumption formula:
 *   cost_per_second = hashrate(TH/s) * jth(J/TH) / 1000 / 3600 * $/kWh
 *
 * No Phaser dependency.
 */

export interface LocationSpec {
  id: string;
  name: string;
  /** Cost in USD per kilowatt-hour. */
  pricePerKwh: number;
  /** Era when location becomes available. */
  era: number;
}

/** All location specs from GDD v3 §2.3. */
export const LOCATIONS: readonly LocationSpec[] = [
  { id: 'garasi', name: 'Garasi Rumah', pricePerKwh: 0.15, era: 1 },
  { id: 'sichuan', name: 'PLTA Sichuan', pricePerKwh: 0.04, era: 3 },
  { id: 'texas', name: 'Container Farm Texas', pricePerKwh: 0.07, era: 4 },
  { id: 'iceland', name: 'Data Center Iceland', pricePerKwh: 0.05, era: 5 },
  { id: 'datacenter', name: 'Data Center Pro', pricePerKwh: 0.09, era: 6 },
] as const;

/**
 * Calculate electricity cost per second of game-time.
 *
 * @param hashrateTHs - Player hashrate in TH/s.
 * @param jth - Effective J/TH of the rig(s).
 * @param pricePerKwh - Electricity price $/kWh.
 * @returns Cost in USD per second of game-time.
 */
export function electricityCostPerSecond(
  hashrateTHs: number,
  jth: number,
  pricePerKwh: number,
): number {
  // Power in watts = hashrate(TH/s) * jth(J/TH)
  const watts = hashrateTHs * jth;
  // Convert to kW
  const kw = watts / 1000;
  // Cost per hour = kW * $/kWh
  const costPerHour = kw * pricePerKwh;
  // Cost per second
  return costPerHour / 3600;
}

/**
 * Calculate total electricity cost for a time period.
 *
 * @param hashrateTHs - Hashrate in TH/s.
 * @param jth - Effective J/TH.
 * @param pricePerKwh - $/kWh.
 * @param gameSeconds - Duration in game seconds.
 * @returns Total cost in USD.
 */
export function electricityCostForPeriod(
  hashrateTHs: number,
  jth: number,
  pricePerKwh: number,
  gameSeconds: number,
): number {
  return electricityCostPerSecond(hashrateTHs, jth, pricePerKwh) * gameSeconds;
}

/**
 * Calculate power consumption in watts.
 */
export function powerConsumptionWatts(hashrateTHs: number, jth: number): number {
  return hashrateTHs * jth;
}

/**
 * Find a LocationSpec by ID.
 */
export function getLocation(locationId: string): LocationSpec | undefined {
  return LOCATIONS.find((l) => l.id === locationId);
}

