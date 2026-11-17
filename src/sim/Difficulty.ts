/**
 * Difficulty — Bitcoin-style difficulty retarget every epoch.
 *
 * target_new = target_old * clamp(actual_time / 20160min, 1/4, 4)
 *
 * Difficulty is stored as a float multiplier relative to genesis difficulty.
 * No Phaser dependency.
 */

import { EXPECTED_EPOCH_MINUTES } from './Clock';

/** Minimum retarget factor (epoch 4× faster → difficulty goes up 4×). */
const MIN_ADJUSTMENT = 0.25;

/** Maximum retarget factor (epoch 4× slower → difficulty goes down to 1/4). */
const MAX_ADJUSTMENT = 4.0;

export interface DifficultyState {
  /** Current difficulty multiplier (1.0 = genesis). */
  difficulty: number;
  /** History of difficulty changes per epoch. */
  history: DifficultyRecord[];
}

export interface DifficultyRecord {
  epochNumber: number;
  difficulty: number;
  adjustmentFactor: number;
  epochDurationMinutes: number;
}

export class Difficulty {
  private state: DifficultyState;

  constructor(savedState?: DifficultyState) {
    this.state = savedState ?? {
      difficulty: 1.0,
      history: [],
    };
  }

  /**
   * Perform retarget at end of epoch.
   * @param epochNumber The epoch that just ended.
   * @param epochDurationMinutes Actual duration of the epoch in game-time minutes.
   * @returns The new difficulty value.
   */
  retarget(epochNumber: number, epochDurationMinutes: number): number {
    // Genesis epoch (epoch 0) — no retarget
    if (epochNumber === 0) {
      this.state.history.push({
        epochNumber,
        difficulty: this.state.difficulty,
        adjustmentFactor: 1.0,
        epochDurationMinutes,
      });
      return this.state.difficulty;
    }

    // Calculate adjustment factor
    // If epoch was fast (< 20160 min), ratio < 1 → difficulty increases
    // target_new = target_old * ratio → higher target = lower difficulty
    // So difficulty_new = difficulty_old / ratio (inverse relationship)
    const ratio = epochDurationMinutes / EXPECTED_EPOCH_MINUTES;
    const clampedRatio = Math.max(MIN_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, ratio));

    // difficulty = difficulty_old * (expected / actual) = difficulty_old / ratio
    // But we clamp ratio, so:
    const adjustmentFactor = 1 / clampedRatio;
    this.state.difficulty *= adjustmentFactor;

    this.state.history.push({
      epochNumber,
      difficulty: this.state.difficulty,
      adjustmentFactor,
      epochDurationMinutes,
    });

    return this.state.difficulty;
  }

  getDifficulty(): number {
    return this.state.difficulty;
  }

  getHistory(): readonly DifficultyRecord[] {
    return this.state.history;
  }

  getState(): Readonly<DifficultyState> {
    return {
      difficulty: this.state.difficulty,
      history: [...this.state.history],
    };
  }
}

/**
 * Calculate retarget adjustment factor (for preview/prediction).
 * Returns the factor by which difficulty would change.
 */
export function calcRetargetFactor(epochDurationMinutes: number): number {
  const ratio = epochDurationMinutes / EXPECTED_EPOCH_MINUTES;
  const clampedRatio = Math.max(MIN_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, ratio));
  return 1 / clampedRatio;
}

