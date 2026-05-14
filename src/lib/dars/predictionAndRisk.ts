/**
 * Performance Prediction Model
 * Predicts future performance based on multiple components
 */

export interface PredictionConfig {
  accuracyWeight: number;
  proficiencyWeight: number;
  consistencyWeight: number;
  improvementWeight: number;
  stabilityWeight: number;
  minRating: number;
  maxRating: number;
  bandHalfWidth: number;
  volatileAmplifier: number;
  volatileThreshold: number;
}

export const DEFAULT_PREDICTION_CONFIG: PredictionConfig = {
  accuracyWeight: 0.35,
  proficiencyWeight: 0.25,
  consistencyWeight: 0.2,
  improvementWeight: 0.1,
  stabilityWeight: 0.1,
  minRating: 0,
  maxRating: 3000,
  bandHalfWidth: 10,
  volatileAmplifier: 0.5,
  volatileThreshold: 400,
};

export interface PredictionBasis {
  accuracy: number;
  proficiency: number;
  consistency: number;
  improvement: number;
  stability: number;
  compositeScore: number;
}

export interface PredictionResult {
  estimatedScore: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  basis: PredictionBasis;
  readiness: "not_ready" | "emerging" | "proficient" | "advanced";
  explanation: string[];
}

export interface RiskIndicators {
  accuracy: number;
  completion: number;
  proficiency: number;
  volatility: number;
  compositeRisk: number;
}

export class PerformancePredictor {
  private config: PredictionConfig;

  constructor(config: Partial<PredictionConfig> = {}) {
    this.config = { ...DEFAULT_PREDICTION_CONFIG, ...config };
  }

  /**
   * Normalize accuracy component [0, 1]
   * failThreshold: accuracy below which is considered failing
   * passThreshold: accuracy above which is considered passing
   */
  private normalizeAccuracy(
    accuracy: number,
    failThreshold: number = 0.5,
    passThreshold: number = 0.85
  ): number {
    if (accuracy <= failThreshold) return 0;
    if (accuracy >= passThreshold) return 1;
    return (accuracy - failThreshold) / (passThreshold - failThreshold);
  }

  /**
   * Normalize proficiency based on rating range
   */
  private normalizeProficiency(
    rating: number,
    minRating: number = 1600,
    maxRating: number = 2800
  ): number {
    if (rating <= minRating) return 0;
    if (rating >= maxRating) return 1;
    return (rating - minRating) / (maxRating - minRating);
  }

  /**
   * Normalize consistency (inverse of topic variance)
   */
  private normalizeConsistency(
    topicVariance: number,
    meanAccuracy: number,
    threshold: number = 0.15
  ): number {
    if (meanAccuracy === 0) return 0;
    const cv = topicVariance / meanAccuracy;
    if (cv > threshold) return 0;
    return 1 - cv / threshold;
  }

  /**
   * Normalize improvement trend
   */
  private normalizeImprovement(
    improvementDelta: number,
    maxDelta: number = 0.15
  ): number {
    if (improvementDelta < -maxDelta) return 0;
    if (improvementDelta > maxDelta) return 1;
    return (improvementDelta + maxDelta) / (2 * maxDelta);
  }

  /**
   * Normalize stability (inverse of rating variance)
   */
  private normalizeStability(
    ratingVariance: number,
    referenceVariance: number = 400
  ): number {
    return Math.max(0, 1 - ratingVariance / referenceVariance);
  }

  /**
   * Predict performance based on learner state
   */
  public predictPerformance(
    accuracy: number,
    currentRating: number,
    topicVariances: number[], // Variance across topics
    meanAccuracy: number,
    improvementDelta: number,
    ratingVariance: number,
    completionRate: number = 0.7
  ): PredictionResult {
    // Normalize components
    const normAccuracy = this.normalizeAccuracy(accuracy);
    const normProficiency = this.normalizeProficiency(currentRating);
    const normConsistency = this.normalizeConsistency(
      topicVariances.length > 0 ? topicVariances.reduce((a, b) => a + b) / topicVariances.length : 0,
      meanAccuracy
    );
    const normImprovement = this.normalizeImprovement(improvementDelta);
    const normStability = this.normalizeStability(ratingVariance);

    // Compute basis
    const basis: PredictionBasis = {
      accuracy: this.clamp(normAccuracy, 0, 1),
      proficiency: this.clamp(normProficiency, 0, 1),
      consistency: this.clamp(normConsistency, 0, 1),
      improvement: this.clamp(normImprovement, 0, 1),
      stability: this.clamp(normStability, 0, 1),
      compositeScore: 0,
    };

    basis.compositeScore =
      this.config.accuracyWeight * basis.accuracy +
      this.config.proficiencyWeight * basis.proficiency +
      this.config.consistencyWeight * basis.consistency +
      this.config.improvementWeight * basis.improvement +
      this.config.stabilityWeight * basis.stability;

    // Scale composite score to [0, 100]
    const estimatedScore = Math.round(basis.compositeScore * 100);

    // Compute confidence band
    const bandWidth = this.config.bandHalfWidth;
    const volatileAmplify = basis.stability < 0.6 ? this.config.volatileAmplifier : 0;
    const totalUncertainty = bandWidth * (1 - basis.stability) + volatileAmplify;

    const result: PredictionResult = {
      estimatedScore,
      lowerBound: Math.max(0, estimatedScore - totalUncertainty),
      upperBound: Math.min(100, estimatedScore + totalUncertainty),
      confidence: Math.round((0.4 * basis.stability + 0.3 * completionRate + 0.3 * basis.proficiency) * 100),
      basis,
      readiness: this.classifyReadiness(basis.compositeScore),
      explanation: this.generateExplanation(basis),
    };

    return result;
  }

  /**
   * Classify readiness level
   */
  private classifyReadiness(compositeScore: number): "not_ready" | "emerging" | "proficient" | "advanced" {
    if (compositeScore < 0.4) return "not_ready";
    if (compositeScore < 0.6) return "emerging";
    if (compositeScore < 0.8) return "proficient";
    return "advanced";
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(basis: PredictionBasis): string[] {
    const reasons: string[] = [];

    if (basis.accuracy < 0.5) {
      reasons.push("Accuracy is below satisfactory level.");
    } else if (basis.accuracy > 0.8) {
      reasons.push("Strong accuracy across items.");
    }

    if (basis.proficiency < 0.5) {
      reasons.push("Rating indicates foundational level.");
    } else if (basis.proficiency > 0.8) {
      reasons.push("Rating indicates advanced level.");
    }

    if (basis.consistency < 0.5) {
      reasons.push("Performance is inconsistent across topics.");
    } else {
      reasons.push("Performance is consistent across topics.");
    }

    if (basis.improvement > 0.6) {
      reasons.push("Showing upward improvement trend.");
    } else if (basis.improvement < 0.4) {
      reasons.push("Declining performance trend.");
    }

    if (basis.stability < 0.5) {
      reasons.push("Rating stability is low - performance is volatile.");
    } else {
      reasons.push("Rating is stable and well-calibrated.");
    }

    return reasons;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}

/**
 * Risk and Intervention System
 */

export interface RiskConfig {
  accuracyWeight: number;
  completionWeight: number;
  proficiencyWeight: number;
  volatilityWeight: number;
  riskThreshold: number;
  volatileThreshold: number;
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  accuracyWeight: 0.45,
  completionWeight: 0.25,
  proficiencyWeight: 0.2,
  volatilityWeight: 0.1,
  riskThreshold: 0.7,
  volatileThreshold: 400,
};

export interface InterventionRecommendation {
  shouldIntervene: boolean;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  recommendations: string[];
  priorityTopic?: string;
}

export class RiskAnalyzer {
  private config: RiskConfig;

  constructor(config: Partial<RiskConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  /**
   * Compute composite risk score
   */
  public computeRisk(
    accuracy: number,
    completionRate: number,
    proficiency: number,
    variance: number
  ): RiskIndicators {
    const risk: RiskIndicators = {
      accuracy: 1 - accuracy,
      completion: 1 - completionRate,
      proficiency: 1 - Math.min(1, proficiency),
      volatility: Math.min(1, variance / this.config.volatileThreshold),
      compositeRisk: 0,
    };

    risk.compositeRisk =
      this.config.accuracyWeight * risk.accuracy +
      this.config.completionWeight * risk.completion +
      this.config.proficiencyWeight * risk.proficiency +
      this.config.volatilityWeight * risk.volatility;

    return risk;
  }

  /**
   * Get intervention recommendation
   */
  public getInterventionRecommendation(
    risk: RiskIndicators,
    topicAccuracies: Map<string, number>
  ): InterventionRecommendation {
    const shouldIntervene = risk.compositeRisk >= this.config.riskThreshold;
    const riskLevel = this.classifyRiskLevel(risk.compositeRisk);
    const recommendations: string[] = [];

    // Topic-specific interventions
    let priorityTopic: string | undefined;
    let lowestAccuracy = 1;

    topicAccuracies.forEach((accuracy, topic) => {
      if (accuracy < 0.5) {
        recommendations.push(`Prioritize remediation on ${topic} (${(accuracy * 100).toFixed(0)}% accuracy)`);
        if (accuracy < lowestAccuracy) {
          lowestAccuracy = accuracy;
          priorityTopic = topic;
        }
      }
    });

    // General interventions
    if (risk.accuracy > 0.5) {
      recommendations.push("Schedule guided review sessions");
    }

    if (risk.volatility > 0.7) {
      recommendations.push("Focus on consistency drills before advancing");
    }

    if (risk.completion < 0.3) {
      recommendations.push("Encourage completion of pending assessments");
    }

    if (recommendations.length === 0) {
      recommendations.push("Continue current learning path");
    }

    return {
      shouldIntervene,
      riskLevel,
      riskScore: Math.round(risk.compositeRisk * 10000) / 10000,
      recommendations,
      priorityTopic,
    };
  }

  private classifyRiskLevel(riskScore: number): "low" | "medium" | "high" {
    if (riskScore < 0.4) return "low";
    if (riskScore < 0.7) return "medium";
    return "high";
  }
}

export function createPerformancePredictor(
  config?: Partial<PredictionConfig>
): PerformancePredictor {
  return new PerformancePredictor(config);
}

export function createRiskAnalyzer(config?: Partial<RiskConfig>): RiskAnalyzer {
  return new RiskAnalyzer(config);
}
