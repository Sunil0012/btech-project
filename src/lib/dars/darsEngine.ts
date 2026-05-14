/**
 * DARS: Dynamic Adaptive Rating System
 * Complete implementation based on the DARS paper
 * Includes: Rating updates, Performance quality, Dynamic K, Streak multipliers,
 * Graph-centrality calibration, and all supporting components
 */

export interface DarsConfig {
  // Rating parameters
  kMax: number;
  kMin: number;
  provisionalItems: number;
  calibrationItems: number;
  decayRate: number;
  referenceVariance: number;
  
  // Performance quality
  timeWeight: number;
  hintWeight: number;
  streakWeight: number;
  failureFloor: number;
  timeSlackRatio: number;
  
  // Streak multiplier
  streakMaxMultiplier: number;
  streakThreshold: number;
  streakSaturation: number;
  
  // Graph calibration
  centralityBonus: number;
  
  // Velocity detection
  anomalyTimeFraction: number;
  anomalyGainCap: number;
  
  // Remediation
  remediationK: number;
  remediationMinSteps: number;
  remediationMinAccuracy: number;
}

export const DEFAULT_DARS_CONFIG: DarsConfig = {
  kMax: 60,
  kMin: 16,
  provisionalItems: 30,
  calibrationItems: 150,
  decayRate: 0.015,
  referenceVariance: 100,
  timeWeight: 0.5,
  hintWeight: 0.3,
  streakWeight: 0.2,
  failureFloor: 0.1,
  timeSlackRatio: 0.15,
  streakMaxMultiplier: 0.35,
  streakThreshold: 3,
  streakSaturation: 7,
  centralityBonus: 150,
  anomalyTimeFraction: 0.25,
  anomalyGainCap: 1.6,
  remediationK: 0.6,
  remediationMinSteps: 3,
  remediationMinAccuracy: 0.75,
};

export interface LearnerState {
  rating: number;
  answeredCount: number;
  variance: number;
  streak: number;
  momentum: "hot" | "steady" | "cold";
  recentDeltas: number[];
  weakTopics: Set<string>;
  volatilityHistory: number[];
}

export interface ItemResponse {
  itemId: string;
  correct: boolean;
  timeSpentMs: number;
  hintsUsed: number;
  maxHints: number;
  difficulty: "easy" | "medium" | "hard";
  centrality: number;
  domain: string;
  topic: string;
  isRemediation: boolean;
}

export interface DarsRatingUpdate {
  previousRating: number;
  nextRating: number;
  delta: number;
  performanceQuality: number;
  dynamicK: number;
  streakMultiplier: number;
  expected: number;
  timeEfficiency: number;
  hintPenalty: number;
  streakQuality: number;
  effectiveDifficulty: number;
  isAnomalous: boolean;
  nextMomentum: "hot" | "steady" | "cold";
  explanations: string[];
}

class DarsEngine {
  private config: DarsConfig;

  constructor(config: Partial<DarsConfig> = {}) {
    this.config = { ...DEFAULT_DARS_CONFIG, ...config };
  }

  /**
   * Performance Quality Score P(q)
   * Combines correctness, time efficiency, hint penalty, and streak quality
   */
  private computePerformanceQuality(
    correct: boolean,
    timeEfficiency: number,
    hintPenalty: number,
    streakQuality: number
  ): { score: number; components: Record<string, number> } {
    if (!correct) {
      const failureScore = Math.min(this.config.failureFloor, 0.05 * timeEfficiency);
      return {
        score: failureScore,
        components: {
          correctness: 0,
          timeEfficiency: 0,
          hintPenalty: 0,
          streakQuality: 0,
          failureFloor: failureScore,
        },
      };
    }

    const score = this.clamp(
      this.config.timeWeight * timeEfficiency +
        this.config.hintWeight * (1 - hintPenalty) +
        this.config.streakWeight * streakQuality,
      0,
      1
    );

    return {
      score: Math.round(score * 10000) / 10000,
      components: {
        correctness: 1,
        timeEfficiency: this.config.timeWeight * timeEfficiency,
        hintPenalty: this.config.hintWeight * (1 - hintPenalty),
        streakQuality: this.config.streakWeight * streakQuality,
      },
    };
  }

  /**
   * Time Efficiency τ(q)
   * Measures how quickly the learner answered relative to reference time
   */
  private computeTimeEfficiency(timeSpentMs: number, estimatedReferenceMs: number): number {
    const slack = this.config.timeSlackRatio * estimatedReferenceMs;
    return this.clamp((estimatedReferenceMs - timeSpentMs + slack) / estimatedReferenceMs, 0, 1);
  }

  /**
   * Hint Penalty H(q)
   * Penalizes excessive hint usage
   */
  private computeHintPenalty(hintsUsed: number, maxHints: number): number {
    if (maxHints <= 0) return 0;
    return this.clamp(hintsUsed / maxHints, 0, 1);
  }

  /**
   * Streak Quality ψ(q)
   * Encodes the learner's streak state (positive for correct, negative for incorrect)
   */
  private computeStreakQuality(streak: number): number {
    const maxStreak = 5;
    return 0.5 * (1 + streak / Math.max(Math.abs(streak), maxStreak));
  }

  /**
   * Dynamic Update Factor K(n, σ²)
   * Decays from high (Kmax) during provisional phase to low (Kmin) when settled
   */
  private computeDynamicK(state: LearnerState): number {
    if (state.answeredCount < this.config.provisionalItems) {
      return this.config.kMax;
    }

    const countDecay = Math.exp(
      -this.config.decayRate * Math.max(0, state.answeredCount - this.config.provisionalItems)
    );
    const uncertainty = this.variance(state.recentDeltas.slice(-20));
    const uncertaintyWeight = uncertainty / (uncertainty + this.config.referenceVariance);

    return this.clamp(
      this.config.kMin + (this.config.kMax - this.config.kMin) * countDecay * uncertaintyWeight,
      this.config.kMin,
      this.config.kMax
    );
  }

  /**
   * Streak Multiplier ϕ(k)
   * Bonus for hot streaks, penalty for cold streaks
   */
  private computeStreakMultiplier(streak: number): number {
    const absStreak = Math.abs(streak);
    if (absStreak < this.config.streakThreshold) return 1;

    const scaled =
      (absStreak - this.config.streakThreshold) /
      Math.max(1, this.config.streakSaturation - this.config.streakThreshold);
    const bounded = this.clamp(scaled, 0, 1) * this.config.streakMaxMultiplier;

    return streak > 0 ? 1 + bounded : 1 - bounded;
  }

  /**
   * Effective Item Rating with Graph-Centrality Calibration
   * Higher centrality items are more diagnostic
   */
  private computeEffectiveDifficulty(baseDifficulty: number, centrality: number): number {
    return baseDifficulty + this.config.centralityBonus * centrality;
  }

  /**
   * Expected Success Probability E(q)
   * Logistic function based on rating difference
   */
  private computeExpected(learnerRating: number, itemRating: number): number {
    return 1 / (1 + Math.pow(10, (itemRating - learnerRating) / 400));
  }

  /**
   * Update Momentum Classification
   */
  private updateMomentum(
    streak: number,
    accuracy: number
  ): "hot" | "steady" | "cold" {
    if (streak >= 5 && accuracy >= 0.8) return "hot";
    if (streak <= -3 && accuracy < 0.5) return "cold";
    return "steady";
  }

  /**
   * Main rating update function
   */
  public applyRatingUpdate(
    state: LearnerState,
    response: ItemResponse,
    estimatedReferenceMs: number,
    baseDifficultyRating: number
  ): { newState: LearnerState; update: DarsRatingUpdate } {
    const explanations: string[] = [];
    const timeSeconds = response.timeSpentMs / 1000;
    const referenceSeconds = estimatedReferenceMs / 1000;

    // Step 1: Compute components
    const timeEfficiency = this.computeTimeEfficiency(response.timeSpentMs, estimatedReferenceMs);
    const hintPenalty = this.computeHintPenalty(response.hintsUsed, response.maxHints);
    const streakQuality = this.computeStreakQuality(state.streak);
    const { score: performanceQuality, components } = this.computePerformanceQuality(
      response.correct,
      timeEfficiency,
      hintPenalty,
      streakQuality
    );

    // Step 2: Compute effective difficulty with graph calibration
    const effectiveDifficulty = this.computeEffectiveDifficulty(
      baseDifficultyRating,
      response.centrality
    );

    // Step 3: Compute expected probability
    const expected = this.computeExpected(state.rating, effectiveDifficulty);

    // Step 4: Compute dynamic K
    let dynamicK = this.computeDynamicK(state);
    if (response.isRemediation) {
      dynamicK *= this.config.remediationK;
    }

    // Step 5: Compute streak multiplier
    const streakMultiplier = this.computeStreakMultiplier(state.streak);

    // Step 6: Compute rating delta
    let delta = dynamicK * streakMultiplier * (performanceQuality - expected);
    let isAnomalous = false;

    // Step 7: Anomaly detection - cap rapid guesses
    const anomalyThreshold = this.config.anomalyTimeFraction * referenceSeconds;
    if (
      response.correct &&
      timeSeconds > 0 &&
      timeSeconds < anomalyThreshold &&
      delta > this.config.anomalyGainCap
    ) {
      delta = this.config.anomalyGainCap;
      isAnomalous = true;
      explanations.push(`Rapid correct answer (${timeSeconds.toFixed(1)}s) capped at ${this.config.anomalyGainCap}`);
    }

    // Step 8: Update streak and momentum
    const nextStreak = response.correct
      ? Math.max(1, state.streak > 0 ? state.streak + 1 : 1)
      : Math.min(-1, state.streak < 0 ? state.streak - 1 : -1);

    const currentAccuracy = 
      state.answeredCount > 0 
        ? 1 - (state.recentDeltas.filter((d) => d < 0).length / state.recentDeltas.length)
        : 0.5;
    const nextMomentum = this.updateMomentum(nextStreak, currentAccuracy);

    // Step 9: Update rating
    const deltaRounded = Math.round(delta);
    const nextRating = Math.max(0, state.rating + deltaRounded);

    // Step 10: Update state
    const nextDeltas = [...state.recentDeltas, deltaRounded].slice(-20);
    const nextVariance = this.variance(nextDeltas);
    
    const newState: LearnerState = {
      rating: nextRating,
      answeredCount: state.answeredCount + 1,
      variance: nextVariance,
      streak: nextStreak,
      momentum: nextMomentum,
      recentDeltas: nextDeltas,
      weakTopics: state.weakTopics, // Updated separately by higher-level logic
      volatilityHistory: [...state.volatilityHistory, nextVariance].slice(-20),
    };

    // Build explanations
    if (response.correct) {
      explanations.push(`Correct answer (τ=${timeEfficiency.toFixed(2)}, P=${performanceQuality.toFixed(3)})`);
    } else {
      explanations.push(`Incorrect answer (P=${performanceQuality.toFixed(3)})`);
    }
    explanations.push(`Expected=${expected.toFixed(3)}, K=${dynamicK.toFixed(1)}, ϕ=${streakMultiplier.toFixed(2)}`);

    return {
      newState,
      update: {
        previousRating: state.rating,
        nextRating,
        delta: deltaRounded,
        performanceQuality,
        dynamicK: Math.round(dynamicK * 100) / 100,
        streakMultiplier: Math.round(streakMultiplier * 100) / 100,
        expected: Math.round(expected * 10000) / 10000,
        timeEfficiency: Math.round(timeEfficiency * 10000) / 10000,
        hintPenalty: Math.round(hintPenalty * 10000) / 10000,
        streakQuality: Math.round(streakQuality * 10000) / 10000,
        effectiveDifficulty,
        isAnomalous,
        nextMomentum,
        explanations,
      },
    };
  }

  /**
   * Get rating tier based on rating value
   */
  public getTier(rating: number): "Bronze" | "Silver" | "Gold" | "Platinum" {
    if (rating < 1600) return "Bronze";
    if (rating < 2000) return "Silver";
    if (rating < 2500) return "Gold";
    return "Platinum";
  }

  /**
   * Estimate reference time for an item (in milliseconds)
   */
  public estimateReferenceTime(
    stemLength: number,
    optionsLength: number,
    complexityIndex: number
  ): number {
    const base = 10 * 1000; // 10 seconds in ms
    const stemComponent = 0.02 * stemLength;
    const optionsComponent = 0.01 * optionsLength;
    const complexityComponent = 30 * complexityIndex * 1000; // 30 seconds per complexity level

    return Math.max(10000, Math.round(base + stemComponent + optionsComponent + complexityComponent));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private variance(values: number[]): number {
    if (values.length < 2) return this.config.referenceVariance;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }
}

export function createDarsEngine(config?: Partial<DarsConfig>): DarsEngine {
  return new DarsEngine(config);
}

export function createInitialLearnerState(initialRating = 1500): LearnerState {
  return {
    rating: initialRating,
    answeredCount: 0,
    variance: DEFAULT_DARS_CONFIG.referenceVariance,
    streak: 0,
    momentum: "steady",
    recentDeltas: [],
    weakTopics: new Set(),
    volatilityHistory: [],
  };
}
