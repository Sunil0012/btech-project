/**
 * DARS System Type Definitions
 * Complete TypeScript interfaces for the DARS system
 */

// ============================================================================
// RATING ENGINE TYPES
// ============================================================================

export interface DarsRatingState {
  rating: number;
  answeredCount: number;
  streak: number;
  recentRatingDeltas: number[];
}

export interface DarsResponseInput {
  question: any;
  correct: boolean;
  timeSpentSeconds?: number | null;
  hintsUsed?: number;
  maxHints?: number;
  remediationForQuestionId?: string | null;
}

export interface DarsRatingOutcome {
  previousRating: number;
  nextRating: number;
  delta: number;
  expected: number;
  performanceQuality: number;
  dynamicK: number;
  streakMultiplier: number;
  timeEfficiency: number;
  effectiveQuestionRating: number;
  rapidGuessCapped: boolean;
  rapidGuessAdjustment: number;
}

// ============================================================================
// LEARNER STATE & PROFILES
// ============================================================================

export type Momentum = "hot" | "steady" | "cold";
export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";
export type Difficulty = "easy" | "medium" | "hard";
export type EdgeType = "same_topic" | "domain_flow" | "domain_bridge";
export type ProficiencyLevel = "Low" | "Medium" | "High";
export type VolatilityLevel = "Stable" | "Moderate" | "Volatile";
export type Readiness = "not_ready" | "emerging" | "proficient" | "advanced";
export type RiskLevel = "low" | "medium" | "high";

export interface LearnerState {
  rating: number;
  answeredCount: number;
  variance: number;
  streak: number;
  momentum: Momentum;
  recentDeltas: number[];
  weakTopics: Set<string>;
  volatilityHistory: number[];
}

export interface LearnerProfile {
  rating: number;
  tier: Tier;
  momentum: Momentum;
  streak: number;
  accuracy: number;
  answeredCount: number;
  volatility: number;
}

// ============================================================================
// ITEM & RESPONSE TYPES
// ============================================================================

export interface Item {
  id: string;
  domain: string;
  topic: string;
  difficulty: Difficulty;
  centrality: number;
  question: string;
  options: string[];
  eloRating: number;
}

export interface ItemResponse {
  itemId: string;
  correct: boolean;
  timeSpentMs: number;
  hintsUsed: number;
  maxHints: number;
  difficulty: Difficulty;
  centrality: number;
  domain: string;
  topic: string;
  isRemediation: boolean;
}

// ============================================================================
// RATING UPDATE TYPES
// ============================================================================

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
  nextMomentum: Momentum;
  explanations: string[];
}

// ============================================================================
// KNOWLEDGE GRAPH TYPES
// ============================================================================

export interface KnowledgeGraphNode {
  itemId: string;
  domain: string;
  topic: string;
  difficulty: number;
  centrality: number;
  baseDifficulty: Difficulty;
}

export interface KnowledgeGraphEdge {
  sourceId: string;
  targetId: string;
  type: EdgeType;
  weight: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  nodeMap: Map<string, KnowledgeGraphNode>;
  adjacencyList: Map<string, Set<string>>;
}

// ============================================================================
// ITEM ROUTING TYPES
// ============================================================================

export interface RecommendationContext {
  learnerRating: number;
  momentum: Momentum;
  answeredCount: number;
  provisionalItems: number;
  weakTopics: Set<string>;
  answeredItems: Set<string>;
  servedItems: Set<string>;
  remediationActive: boolean;
  remediationSourceId?: string;
}

export interface RecommendedItem {
  itemId: string;
  reason: string[];
  heuristic_score: number;
  graph_boost: number;
  combined_score: number;
  hopDistance: number;
  targetRating: number;
}

// ============================================================================
// REMEDIATION TYPES
// ============================================================================

export interface RemediationSession {
  sourceItemId: string;
  sourceDifficulty: Difficulty;
  stepsCompleted: number;
  accuracyRate: number;
  items: string[];
  active: boolean;
  startedAt: Date;
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

// ============================================================================
// ANOMALY/VELOCITY DETECTION TYPES
// ============================================================================

export type AnomalyType = "rapid_correct" | "extreme_time_variance" | "impossible_pattern";
export type AnomalySeverity = "low" | "medium" | "high";

export interface AnomalyReport {
  isAnomalous: boolean;
  anomalyType?: AnomalyType;
  severity: AnomalySeverity;
  suggestion: string;
}

// ============================================================================
// PREDICTION & RISK TYPES
// ============================================================================

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
  readiness: Readiness;
  explanation: string[];
}

export interface RiskIndicators {
  accuracy: number;
  completion: number;
  proficiency: number;
  volatility: number;
  compositeRisk: number;
}

export interface InterventionRecommendation {
  shouldIntervene: boolean;
  riskLevel: RiskLevel;
  riskScore: number;
  recommendations: string[];
  priorityTopic?: string;
}

// ============================================================================
// COACHING TYPES
// ============================================================================

export interface CoachingContext {
  proficiency: ProficiencyLevel;
  volatility: VolatilityLevel;
  accuracy: number;
  streakState: Momentum;
  ratingTier: Tier;
}

export interface CoachingAdvice {
  guidance: string;
  actionItems: string[];
  estimatedTimeMin: number;
  priority: "low" | "medium" | "high";
}

export interface SessionAnalytics {
  sessionDurationMin: number;
  itemsAttempted: number;
  accuracy: number;
  averageTimePerItemSec: number;
  ratingChange: number;
  momentumChange: "maintained" | "gained" | "lost";
  topicPerformance: Map<string, number>;
}

// ============================================================================
// SYSTEM INTEGRATION TYPES
// ============================================================================

export interface DarsConfig {
  kMax: number;
  kMin: number;
  provisionalItems: number;
  calibrationItems: number;
  decayRate: number;
  referenceVariance: number;
  timeWeight: number;
  hintWeight: number;
  streakWeight: number;
  failureFloor: number;
  timeSlackRatio: number;
  streakMaxMultiplier: number;
  streakThreshold: number;
  streakSaturation: number;
  centralityBonus: number;
  anomalyTimeFraction: number;
  anomalyGainCap: number;
  remediationK: number;
  remediationMinSteps: number;
  remediationMinAccuracy: number;
}

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

export interface RiskConfig {
  accuracyWeight: number;
  completionWeight: number;
  proficiencyWeight: number;
  volatilityWeight: number;
  riskThreshold: number;
  volatileThreshold: number;
}

export interface RemediationConfig {
  minStepsBeforeRetry: number;
  minAccuracyThreshold: number;
  reducedKFactor: number;
}

export interface AnomalyDetectionConfig {
  anomalyTimeFraction: number;
  anomalyGainCap: number;
}

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

// ============================================================================
// FACTORY FUNCTION SIGNATURES
// ============================================================================

export interface DarsSystemFactory {
  createDarsSystem(
    items: Item[],
    initialRating?: number,
    config?: DarsSystemConfig
  ): DarsSystemInterface;
}

export interface DarsSystemInterface {
  processResponse(
    itemId: string,
    correct: boolean,
    timeSpentMs: number,
    hintsUsed?: number,
    maxHints?: number,
    domain?: string,
    topic?: string
  ): DarsResponse;

  getLearnerState(): LearnerState;
  getSystemState(): DarsSystemState;
  getGraphStats(): { totalItems: number; totalEdges: number; avgCentrality: number };
  
  endSession(
    sessionStartTime: Date,
    itemsAttempted: number,
    correctCount: number,
    ratingBefore: number,
    timesPerItem: number[]
  ): SessionAnalytics;
}

// ============================================================================
// RATING CALCULATION HELPER TYPES
// ============================================================================

export interface RatingCalculation {
  timeEfficiency: number;
  hintPenalty: number;
  streakQuality: number;
  performanceQuality: number;
  dynamicK: number;
  streakMultiplier: number;
  expected: number;
  delta: number;
}

export interface PhaseInfo {
  phase: "provisional" | "calibration" | "established";
  itemsRemaining: number;
  expectedKRange: [number, number];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ProcessResponseApiRequest {
  itemId: string;
  correct: boolean;
  timeSpentMs: number;
  hintsUsed?: number;
  domain?: string;
  topic?: string;
}

export interface ProcessResponseApiResponse extends ApiResponse<DarsResponse> {}

export interface LearnerStateApiResponse extends ApiResponse<LearnerState> {}

export interface PredictionApiResponse extends ApiResponse<PredictionResult> {}

export interface RiskAssessmentApiResponse extends ApiResponse<InterventionRecommendation> {}
