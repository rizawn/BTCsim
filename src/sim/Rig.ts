/**
 * Rig — mining hardware model.
 *
 * Each rig has: J/TH efficiency, hashrate (TH/s), wattage,
 * era availability, status (online/offline/throttling),
 * heat level 0–1 (throttling raises J/TH by up to +25%).
 *
 * No Phaser dependency.
 */

export type RigStatus = 'online' | 'offline' | 'throttling';

export interface RigSpec {
  /** Unique rig type ID. */
  id: string;
  /** Display name. */
  name: string;
  /** Era when rig becomes available. */
  era: number;
  /** Base efficiency in Joules per Terahash. */
  baseJth: number;
  /** Base hashrate in TH/s. */
  baseHashrateTHs: number;
  /** Base power consumption in watts. */
  baseWatts: number;
  /** Atlas sprite frame key. */
  spriteKey: string;
}

export interface RigInstance {
  /** Unique instance ID. */
  instanceId: string;
  /** Reference to spec ID. */
  specId: string;
  /** Current status. */
  status: RigStatus;
  /** Heat level 0–1 (0 = cool, 1 = max heat). */
  heat: number;
  /** Number of units of this rig. */
  quantity: number;
}

/** All rig specs from GDD v3 §2.3. */
export const RIG_SPECS: readonly RigSpec[] = [
  {
    id: 'cpu_genesis',
    name: 'CPU Laptop "Genesis"',
    era: 1,
    baseJth: 5500,
    baseHashrateTHs: 0.000001, // ~1 MH/s = 0.000001 TH/s
    baseWatts: 65,
    spriteKey: 'rig_01_laptop_genesis',
  },
  {
    id: 'gpu_openframe',
    name: 'GPU Open-Frame',
    era: 2,
    baseJth: 800,
    baseHashrateTHs: 0.0005, // ~500 MH/s
    baseWatts: 1200,
    spriteKey: 'rig_02_gpu_openframe',
  },
  {
    id: 'fpga_board',
    name: 'FPGA Board',
    era: 3,
    baseJth: 200,
    baseHashrateTHs: 0.005, // ~5 GH/s
    baseWatts: 100,
    spriteKey: 'rig_03_fpga_board',
  },
  {
    id: 'asic_a66',
    name: 'ASIC "A-66" 1U',
    era: 4,
    baseJth: 98,
    baseHashrateTHs: 1.0, // 1 TH/s
    baseWatts: 1050,
    spriteKey: 'rig_04_asic_a66',
  },
  {
    id: 'asic_h9',
    name: 'ASIC "H9" 2U',
    era: 5,
    baseJth: 98,
    baseHashrateTHs: 14.0, // 14 TH/s (S9-like)
    baseWatts: 1372,
    spriteKey: 'rig_05_asic_h9',
  },
  {
    id: 'immersion_h19',
    name: 'Immersion "H19"',
    era: 6,
    baseJth: 29.5,
    baseHashrateTHs: 110.0, // 110 TH/s (S19-like)
    baseWatts: 3245,
    spriteKey: 'rig_06_immersion_h19',
  },
  {
    id: 'blade_h21l',
    name: 'Blade "H21-L"',
    era: 7,
    baseJth: 17.5,
    baseHashrateTHs: 200.0, // 200 TH/s (S21-like)
    baseWatts: 3500,
    spriteKey: 'rig_07_blade_h21l',
  },
  {
    id: 'sunset_node',
    name: 'Sunset Node',
    era: 8,
    baseJth: 0, // fee-only era, symbolic
    baseHashrateTHs: 0,
    baseWatts: 50,
    spriteKey: 'rig_08_sunset_node',
  },
] as const;

/** Maximum throttling J/TH penalty (+25%). */
const THROTTLE_JTH_PENALTY = 0.25;

/** Heat threshold where throttling begins. */
const THROTTLE_HEAT_THRESHOLD = 0.7;

/**
 * Get effective J/TH for a rig instance, accounting for heat/throttling.
 * Throttling raises J/TH by up to +25% linearly from heat 0.7 to 1.0.
 */
export function getEffectiveJth(spec: RigSpec, instance: RigInstance): number {
  if (instance.status === 'offline') return Infinity;
  if (instance.heat <= THROTTLE_HEAT_THRESHOLD) return spec.baseJth;

  // Linear interpolation from threshold to max heat
  const throttleProgress = (instance.heat - THROTTLE_HEAT_THRESHOLD) / (1.0 - THROTTLE_HEAT_THRESHOLD);
  return spec.baseJth * (1 + THROTTLE_JTH_PENALTY * throttleProgress);
}

/**
 * Get effective hashrate for a rig instance (total for quantity).
 */
export function getEffectiveHashrate(spec: RigSpec, instance: RigInstance): number {
  if (instance.status === 'offline') return 0;
  return spec.baseHashrateTHs * instance.quantity;
}

/**
 * Get effective power consumption in watts (total for quantity).
 */
export function getEffectiveWatts(spec: RigSpec, instance: RigInstance): number {
  if (instance.status === 'offline') return 0;
  return spec.baseWatts * instance.quantity;
}

/**
 * Update heat based on sim tick. Heat increases when online, decreases when offline.
 * Returns new heat value and whether status should change.
 */
export function updateHeat(
  instance: RigInstance,
  deltaSeconds: number,
  ambientCooling: number = 0.01,
  heatGeneration: number = 0.02,
): { heat: number; newStatus: RigStatus } {
  let heat = instance.heat;

  if (instance.status === 'offline') {
    heat = Math.max(0, heat - ambientCooling * deltaSeconds);
    return { heat, newStatus: 'offline' };
  }

  // Online: generate heat
  heat = Math.min(1.0, heat + heatGeneration * deltaSeconds);

  const newStatus: RigStatus = heat >= THROTTLE_HEAT_THRESHOLD ? 'throttling' : 'online';
  return { heat, newStatus };
}

/**
 * Find a RigSpec by ID.
 */
export function getRigSpec(specId: string): RigSpec | undefined {
  return RIG_SPECS.find((s) => s.id === specId);
}

/**
 * Create a new rig instance.
 */
export function createRigInstance(specId: string, quantity: number = 1): RigInstance {
  return {
    instanceId: `${specId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    specId,
    status: 'online',
    heat: 0,
    quantity,
  };
}

