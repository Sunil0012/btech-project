/**
 * DARS (Dynamic Adaptive Rating System)
 * Complete export index for all DARS components
 */

// Core Rating Engine
export {
  createDarsEngine,
  createInitialLearnerState,
  DEFAULT_DARS_CONFIG,
  type DarsConfig,
  type LearnerState,
  type ItemResponse,
  type DarsRatingUpdate,
} from "./darsEngine";

// Knowledge Graph and Item Routing
export {
  createItemRouter,
  buildKnowledgeGraphFromItems,
  type KnowledgeGraph,
  type KnowledgeGraphNode,
  type KnowledgeGraphEdge,
  type RecommendationContext,
  type RecommendedItem,
  type TargetPolicy,
} from "./itemRouter";

// Remediation and Velocity Detection
export {
  createRemediationEngine,
  createVelocityDetector,
  RemediationEngine,
  VelocityDetector,
  DEFAULT_REMEDIATION_CONFIG,
  DEFAULT_ANOMALY_CONFIG,
  type RemediationConfig,
  type RemediationSession,
  type RemediationOutcome,
  type AnomalyDetectionConfig,
  type AnomalyReport,
} from "./remediationEngine";

// Performance Prediction and Risk Analysis
export {
  createPerformancePredictor,
  createRiskAnalyzer,
  PerformancePredictor,
  RiskAnalyzer,
  DEFAULT_PREDICTION_CONFIG,
  DEFAULT_RISK_CONFIG,
  type PredictionConfig,
  type PredictionResult,
  type PredictionBasis,
  type RiskConfig,
  type RiskIndicators,
  type InterventionRecommendation,
} from "./predictionAndRisk";

// Coaching Engine
export {
  CoachingEngine,
  SessionAnalyzer,
  createCoachingEngine,
  createSessionAnalyzer,
  type CoachingContext,
  type CoachingAdvice,
  type SessionAnalytics,
  type ProficiencyLevel,
  type VolatilityLevel,
} from "./coachingEngine";

// System Integration
export {
  createDarsSystem,
  DarsSystem,
  type DarsSystemConfig,
  type DarsSystemState,
  type DarsResponse,
} from "./darsSystem";

// Re-export commonly used items for convenience
export { DEFAULT_DARS_CONFIG as DARS_DEFAULTS } from "./darsEngine";
