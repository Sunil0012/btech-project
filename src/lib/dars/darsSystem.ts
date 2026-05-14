/**
 * DARS System Integration
 * Main orchestrator that combines all DARS components
 */

import type { DarsConfig } from "./darsEngine";
import { createDarsEngine, createInitialLearnerState, type LearnerState, type ItemResponse, type DarsRatingUpdate } from "./darsEngine";
import { createItemRouter, buildKnowledgeGraphFromItems, type KnowledgeGraph, type RecommendedItem } from "./itemRouter";
import { createRemediationEngine, createVelocityDetector, type RemediationConfig, type AnomalyDetectionConfig } from "./remediationEngine";
import { createPerformancePredictor, createRiskAnalyzer, type PredictionConfig, type RiskConfig, type PredictionResult, type InterventionRecommendation } from "./predictionAndRisk";
import { CoachingEngine, SessionAnalyzer, type CoachingAdvice, type SessionAnalytics } from "./coachingEngine";

export interface DarsSystemConfig {
  rating?: Partial<DarsConfig>;
  prediction?: Partial<PredictionConfig>;
  risk?: Partial<RiskConfig>;
  remediation?: Partial<RemediationConfig>;
  anomaly?: Partial<AnomalyDetectionConfig>;
}

export interface DarsSystemState {
  learnerState: LearnerState;
  currentSessionId: string;
  remediationActive: boolean;
  remediationSourceId?: string;
  topicAccuracies: Map<string, number>;
  recentSessions: SessionAnalytics[];
}

export interface DarsResponse {
  ratingUpdate: DarsRatingUpdate;
  nextRecommendation?: RecommendedItem;
  prediction?: PredictionResult;
  riskAssessment?: InterventionRecommendation;
  coaching?: CoachingAdvice;
  anomalyFlags?: string[];
}

/**
 * Main DARS System Orchestrator
 */
export class DarsSystem {
  private ratingEngine;
  private itemRouter;
  private remediationEngine;
  private velocityDetector;
  private predictor;
  private riskAnalyzer;
  private graph: KnowledgeGraph;
  private systemState: DarsSystemState;

  constructor(
    items: any[],
    initialRating: number = 1500,
    config: DarsSystemConfig = {}
  ) {
    // Initialize components
    this.ratingEngine = createDarsEngine(config.rating);
    this.remediationEngine = createRemediationEngine(config.remediation);
    this.velocityDetector = createVelocityDetector(config.anomaly);
    this.predictor = createPerformancePredictor(config.prediction);
    this.riskAnalyzer = createRiskAnalyzer(config.risk);

    // Build knowledge graph
    this.graph = buildKnowledgeGraphFromItems(items);
    this.itemRouter = createItemRouter(this.graph);

    // Initialize system state
    this.systemState = {
      learnerState: createInitialLearnerState(initialRating),
      currentSessionId: this.generateSessionId(),
      remediationActive: false,
      topicAccuracies: new Map(),
      recentSessions: [],
    };
  }

  /**
   * Process a learner response and generate comprehensive feedback
   */
  public processResponse(
    itemId: string,
    correct: boolean,
    timeSpentMs: number,
    hintsUsed: number = 0,
    maxHints: number = 3,
    domain: string = "general",
    topic: string = "general"
  ): DarsResponse {
    const item = this.graph.nodeMap.get(itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found in knowledge graph`);
    }

    // Step 1: Create item response
    const response: ItemResponse = {
      itemId,
      correct,
      timeSpentMs,
      hintsUsed,
      maxHints,
      difficulty: item.baseDifficulty,
      centrality: item.centrality,
      domain,
      topic,
      isRemediation: this.systemState.remediationActive,
    };

    // Step 2: Apply rating update
    const baseDifficultyRating = this.difficultyToRating(item.baseDifficulty);
    const { newState, update } = this.ratingEngine.applyRatingUpdate(
      this.systemState.learnerState,
      response,
      30000, // Estimate reference time as 30s (can be calculated per item)
      baseDifficultyRating
    );

    this.systemState.learnerState = newState;

    // Step 3: Check for anomalies
    const anomalies: string[] = [];
    const referenceTime = 30000;
    const anomalyReport = this.velocityDetector.detectRapidGuess(
      timeSpentMs,
      referenceTime,
      correct,
      update.delta,
      1.6
    );
    if (anomalyReport.isAnomalous) {
      anomalies.push(anomalyReport.suggestion);
    }

    // Step 4: Update topic accuracy
    const currentTopicAcc = this.systemState.topicAccuracies.get(topic) || 0;
    const topicAttempts = this.systemState.learnerState.answeredCount / Math.max(1, this.systemState.topicAccuracies.size || 1);
    const newTopicAcc = (currentTopicAcc * (topicAttempts - 1) + (correct ? 1 : 0)) / topicAttempts;
    this.systemState.topicAccuracies.set(topic, newTopicAcc);

    // Step 5: Check weak topics and update state
    const weakTopicsThreshold = 0.6;
    this.systemState.topicAccuracies.forEach((accuracy, topicName) => {
      if (accuracy < weakTopicsThreshold) {
        this.systemState.learnerState.weakTopics.add(topicName);
      }
    });

    // Step 6: Remediation handling
    if (!correct && !this.systemState.remediationActive) {
      this.startRemediation(itemId, item.baseDifficulty);
    } else if (this.systemState.remediationActive) {
      this.remediationEngine.logRemediationResponse(this.systemState.currentSessionId, itemId, correct);
      const remediationCheck = this.remediationEngine.checkCompletion(this.systemState.currentSessionId);
      if (remediationCheck.readyForRetry) {
        this.systemState.remediationActive = false;
      }
    }

    // Step 7: Get next recommendation
    const recommendation = this.itemRouter.recommendItem({
      learnerRating: newState.rating,
      momentum: newState.momentum,
      answeredCount: newState.answeredCount,
      provisionalItems: 30,
      weakTopics: newState.weakTopics,
      answeredItems: new Set(), // Would be passed from caller
      servedItems: new Set(),
      remediationActive: this.systemState.remediationActive,
      remediationSourceId: this.systemState.remediationSourceId,
    });

    // Step 8: Generate prediction if learner is ready
    const prediction = this.generatePrediction(newState);

    // Step 9: Get risk assessment if learner is ready
    const riskAssessment = this.generateRiskAssessment(newState);

    // Step 10: Generate coaching advice
    const coaching = this.generateCoaching(newState, newState.answeredCount);

    return {
      ratingUpdate: update,
      nextRecommendation: recommendation || undefined,
      prediction,
      riskAssessment,
      coaching,
      anomalyFlags: anomalies,
    };
  }

  /**
   * Start a remediation session after an incorrect response
   */
  private startRemediation(sourceItemId: string, sourceDifficulty: "easy" | "medium" | "hard"): void {
    this.systemState.remediationActive = true;
    this.systemState.remediationSourceId = sourceItemId;
    const remediationSession = this.remediationEngine.startSession(
      sourceItemId,
      sourceDifficulty,
      this.systemState.currentSessionId
    );
  }

  /**
   * Generate performance prediction
   */
  private generatePrediction(state: LearnerState): PredictionResult | undefined {
    // Only predict if learner has sufficient data
    if (state.answeredCount < 30) return undefined;

    const recentDeltas = state.recentDeltas.slice(-20);
    const accuracy = recentDeltas.filter((d) => d >= 0).length / Math.max(1, recentDeltas.length);
    const improvementDelta =
      recentDeltas.length > 10 ? (recentDeltas.slice(-5).reduce((a, b) => a + b) / 5 - recentDeltas.slice(-10, -5).reduce((a, b) => a + b) / 5) / 50 : 0;

    const topicVariances = Array.from(this.systemState.topicAccuracies.values()).map(
      (acc) => Math.pow(acc - accuracy, 2)
    );

    return this.predictor.predictPerformance(
      accuracy,
      state.rating,
      topicVariances,
      accuracy,
      improvementDelta,
      state.variance,
      this.systemState.topicAccuracies.size / 10 // Completion rate estimate
    );
  }

  /**
   * Generate risk assessment
   */
  private generateRiskAssessment(state: LearnerState): InterventionRecommendation | undefined {
    if (state.answeredCount < 20) return undefined;

    const recentDeltas = state.recentDeltas.slice(-20);
    const accuracy = recentDeltas.filter((d) => d >= 0).length / Math.max(1, recentDeltas.length);
    const completionRate = Math.min(1, state.answeredCount / 150);

    const risk = this.riskAnalyzer.computeRisk(accuracy, completionRate, state.rating / 3000, state.variance);
    return this.riskAnalyzer.getInterventionRecommendation(risk, this.systemState.topicAccuracies);
  }

  /**
   * Generate coaching advice
   */
  private generateCoaching(state: LearnerState, itemCount: number): CoachingAdvice {
    const proficiency = CoachingEngine.classifyProficiency(state.rating);
    const volatility = CoachingEngine.classifyVolatility(state.variance);
    const recentDeltas = state.recentDeltas.slice(-20);
    const accuracy = recentDeltas.filter((d) => d >= 0).length / Math.max(1, recentDeltas.length);
    const tier = this.ratingEngine.getTier(state.rating);

    const context = {
      proficiency,
      volatility,
      accuracy,
      streakState: state.streak > 0 ? ("hot" as const) : state.streak < 0 ? ("cold" as const) : ("steady" as const),
      ratingTier: tier,
    };

    return CoachingEngine.generateAdvice(context);
  }

  /**
   * End session and get analytics
   */
  public endSession(
    sessionStartTime: Date,
    itemsAttempted: number,
    correctCount: number,
    ratingBefore: number,
    timesPerItem: number[]
  ): SessionAnalytics {
    const analytics = SessionAnalyzer.analyzeSession(
      sessionStartTime,
      new Date(),
      itemsAttempted,
      correctCount,
      ratingBefore,
      this.systemState.learnerState.rating,
      0, // Would track actual streak before
      this.systemState.learnerState.streak,
      timesPerItem
    );

    // Add topic performance
    this.systemState.topicAccuracies.forEach((accuracy, topic) => {
      analytics.topicPerformance.set(topic, accuracy);
    });

    this.systemState.recentSessions.push(analytics);
    return analytics;
  }

  /**
   * Get learner state
   */
  public getLearnerState(): LearnerState {
    return this.systemState.learnerState;
  }

  /**
   * Get system state
   */
  public getSystemState(): DarsSystemState {
    return this.systemState;
  }

  /**
   * Get graph statistics
   */
  public getGraphStats() {
    return this.itemRouter.getGraphStats();
  }

  /**
   * Utility: convert difficulty to rating
   */
  private difficultyToRating(difficulty: string): number {
    switch (difficulty) {
      case "easy":
        return 1000;
      case "medium":
        return 1500;
      case "hard":
        return 2000;
      default:
        return 1500;
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create DARS system
 */
export function createDarsSystem(
  items: any[],
  initialRating?: number,
  config?: DarsSystemConfig
): DarsSystem {
  return new DarsSystem(items, initialRating, config);
}
