/**
 * Remediation and Retry Engine
 * Handles contextual remediation after incorrect responses
 */

export interface RemediationSession {
  sourceItemId: string;
  sourceDifficulty: "easy" | "medium" | "hard";
  stepsCompleted: number;
  accuracyRate: number;
  items: string[];
  active: boolean;
  startedAt: Date;
}

export interface RemediationConfig {
  minStepsBeforeRetry: number;
  minAccuracyThreshold: number;
  reducedKFactor: number;
}

export interface RemediationOutcome {
  sessionId: string;
  sourceItemId: string;
  completed: boolean;
  stepsCompleted: number;
  accuracyAchieved: number;
  estimatedTimeMs: number;
  readyForRetry: boolean;
}

const DEFAULT_REMEDIATION_CONFIG: RemediationConfig = {
  minStepsBeforeRetry: 3,
  minAccuracyThreshold: 0.75,
  reducedKFactor: 0.6,
};

export class RemediationEngine {
  private config: RemediationConfig;
  private activeSessions: Map<string, RemediationSession> = new Map();

  constructor(config: Partial<RemediationConfig> = {}) {
    this.config = { ...DEFAULT_REMEDIATION_CONFIG, ...config };
  }

  /**
   * Start a remediation session after an incorrect response
   */
  public startSession(
    sourceItemId: string,
    sourceDifficulty: "easy" | "medium" | "hard",
    sessionId: string
  ): RemediationSession {
    const session: RemediationSession = {
      sourceItemId,
      sourceDifficulty,
      stepsCompleted: 0,
      accuracyRate: 0,
      items: [],
      active: true,
      startedAt: new Date(),
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Log a response during remediation
   */
  public logRemediationResponse(
    sessionId: string,
    itemId: string,
    correct: boolean
  ): RemediationSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    session.items.push(itemId);
    session.stepsCompleted++;

    // Update accuracy rate
    const correctCount = session.items.filter((id) => correct).length;
    session.accuracyRate = correctCount / session.stepsCompleted;

    return session;
  }

  /**
   * Check if remediation is complete and learner is ready for retry
   */
  public checkCompletion(sessionId: string): RemediationOutcome {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        sessionId,
        sourceItemId: "",
        completed: false,
        stepsCompleted: 0,
        accuracyAchieved: 0,
        estimatedTimeMs: 0,
        readyForRetry: false,
      };
    }

    const meetsMinSteps = session.stepsCompleted >= this.config.minStepsBeforeRetry;
    const meetsAccuracy = session.accuracyRate >= this.config.minAccuracyThreshold;
    const readyForRetry = meetsMinSteps && meetsAccuracy;

    if (readyForRetry) {
      session.active = false;
    }

    return {
      sessionId,
      sourceItemId: session.sourceItemId,
      completed: !session.active,
      stepsCompleted: session.stepsCompleted,
      accuracyAchieved: Math.round(session.accuracyRate * 10000) / 10000,
      estimatedTimeMs: session.items.length * 45000, // Estimate 45s per item
      readyForRetry,
    };
  }

  /**
   * End remediation session and clean up
   */
  public endSession(sessionId: string): RemediationOutcome {
    const session = this.activeSessions.get(sessionId);
    const outcome = this.checkCompletion(sessionId);

    if (session) {
      session.active = false;
    }

    this.activeSessions.delete(sessionId);
    return outcome;
  }

  /**
   * Get active session
   */
  public getSession(sessionId: string): RemediationSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  public getActiveSessions(): RemediationSession[] {
    return Array.from(this.activeSessions.values()).filter((s) => s.active);
  }

  /**
   * Apply reduced K factor during remediation
   */
  public applyRemediationKFactor(originalK: number): number {
    return originalK * this.config.reducedKFactor;
  }
}

/**
 * Velocity/Anomaly Detection
 * Detects suspicious response patterns (rapid guessing, etc)
 */

export interface AnomalyDetectionConfig {
  anomalyTimeFraction: number;
  anomalyGainCap: number;
}

const DEFAULT_ANOMALY_CONFIG: AnomalyDetectionConfig = {
  anomalyTimeFraction: 0.25,
  anomalyGainCap: 1.6,
};

export interface AnomalyReport {
  isAnomalous: boolean;
  anomalyType?: "rapid_correct" | "extreme_time_variance" | "impossible_pattern";
  severity: "low" | "medium" | "high";
  suggestion: string;
}

export class VelocityDetector {
  private config: AnomalyDetectionConfig;

  constructor(config: Partial<AnomalyDetectionConfig> = {}) {
    this.config = { ...DEFAULT_ANOMALY_CONFIG, ...config };
  }

  /**
   * Detect rapid guessing (suspiciously fast correct answers)
   */
  public detectRapidGuess(
    timeSpentMs: number,
    estimatedReferenceMs: number,
    correct: boolean,
    proposedGain: number,
    minGainThreshold: number
  ): AnomalyReport {
    if (!correct || proposedGain <= minGainThreshold) {
      return { isAnomalous: false, severity: "low", suggestion: "" };
    }

    const threshold = this.config.anomalyTimeFraction * estimatedReferenceMs;
    if (timeSpentMs < threshold) {
      return {
        isAnomalous: true,
        anomalyType: "rapid_correct",
        severity: "high",
        suggestion: `Rapid correct answer (${(timeSpentMs / 1000).toFixed(1)}s < threshold ${(threshold / 1000).toFixed(1)}s). Gain capped.`,
      };
    }

    return { isAnomalous: false, severity: "low", suggestion: "" };
  }

  /**
   * Detect extreme time variance in recent history
   */
  public detectTimeVariance(
    recentTimeSpents: number[],
    threshold: number = 0.5
  ): AnomalyReport {
    if (recentTimeSpents.length < 3) {
      return { isAnomalous: false, severity: "low", suggestion: "" };
    }

    const mean = recentTimeSpents.reduce((a, b) => a + b) / recentTimeSpents.length;
    const variance = recentTimeSpents.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / recentTimeSpents.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0; // Coefficient of variation

    if (cv > threshold) {
      return {
        isAnomalous: true,
        anomalyType: "extreme_time_variance",
        severity: "medium",
        suggestion: `Extreme response time variance detected (CV=${cv.toFixed(2)}). Consider consistency drills.`,
      };
    }

    return { isAnomalous: false, severity: "low", suggestion: "" };
  }

  /**
   * Detect impossible patterns (e.g., all correct in impossible timeframe)
   */
  public detectImpossiblePattern(
    recentResults: boolean[],
    recentTimesMs: number[],
    minTimePerItem: number = 5000
  ): AnomalyReport {
    if (recentResults.length < 5) {
      return { isAnomalous: false, severity: "low", suggestion: "" };
    }

    const allCorrect = recentResults.every((r) => r);
    const allTooFast = recentTimesMs.every((t) => t < minTimePerItem);

    if (allCorrect && allTooFast) {
      return {
        isAnomalous: true,
        anomalyType: "impossible_pattern",
        severity: "high",
        suggestion: `All recent answers correct and suspiciously fast. Review assessment integrity.`,
      };
    }

    return { isAnomalous: false, severity: "low", suggestion: "" };
  }
}

export function createRemediationEngine(
  config?: Partial<RemediationConfig>
): RemediationEngine {
  return new RemediationEngine(config);
}

export function createVelocityDetector(
  config?: Partial<AnomalyDetectionConfig>
): VelocityDetector {
  return new VelocityDetector(config);
}
