# DARS System - Complete File Listing and API Reference

## 📂 Directory Structure

```
src/lib/dars/
├── darsEngine.ts          (450 lines)  ⭐ Core rating calculation
├── itemRouter.ts          (350 lines)  ⭐ Knowledge graph & routing
├── remediationEngine.ts   (300 lines)  ⭐ Remediation & velocity detection
├── predictionAndRisk.ts   (400 lines)  ⭐ Performance prediction & risk
├── coachingEngine.ts      (350 lines)  ⭐ Coaching & session analytics
├── darsSystem.ts          (450 lines)  ⭐ System orchestrator
├── types.ts               (300 lines)  📋 Complete type definitions
├── index.ts               (80 lines)   🔗 Export index
├── IMPLEMENTATION.md      (250 lines)  📖 Architecture documentation
├── INTEGRATION_GUIDE.ts   (350 lines)  📚 Code examples
└── API_REFERENCE.md       (this file)  📍 API documentation
```

**Total:** ~3,500 lines of production-ready TypeScript code

---

## 🎯 Core Components

### 1. **darsEngine.ts** - Rating Model

**Exports:**
```typescript
- createDarsEngine(config?: Partial<DarsConfig>): DarsEngine
- createInitialLearnerState(initialRating?: number): LearnerState
- DEFAULT_DARS_CONFIG: DarsConfig
```

**Main Class: `DarsEngine`**
```typescript
class DarsEngine {
  applyRatingUpdate(
    state: LearnerState,
    response: ItemResponse,
    estimatedReferenceMs: number,
    baseDifficultyRating: number
  ): { newState: LearnerState; update: DarsRatingUpdate };

  getTier(rating: number): "Bronze" | "Silver" | "Gold" | "Platinum";
  
  estimateReferenceTime(
    stemLength: number,
    optionsLength: number,
    complexityIndex: number
  ): number;
}
```

**Configuration:**
```typescript
interface DarsConfig {
  kMax: 60;                    // Max K during provisional
  kMin: 16;                    // Floor K for calibrated
  provisionalItems: 30;        // Provisional phase length
  calibrationItems: 150;       // Full calibration threshold
  decayRate: 0.015;           // Post-provisional decay
  referenceVariance: 100;     // Volatility half-saturation
  timeWeight: 0.5;            // Time efficiency weight
  hintWeight: 0.3;            // Hint penalty weight
  streakWeight: 0.2;          // Streak quality weight
  // ... and more
}
```

---

### 2. **itemRouter.ts** - Knowledge Graph & Routing

**Exports:**
```typescript
- createItemRouter(graph: KnowledgeGraph): ItemRouter
- buildKnowledgeGraphFromItems(items: any[]): KnowledgeGraph
```

**Main Class: `ItemRouter`**
```typescript
class ItemRouter {
  recommendItem(context: RecommendationContext): RecommendedItem | null;
  getGraphStats(): {
    totalItems: number;
    totalEdges: number;
    avgCentrality: number;
    topicCount: number;
    domainCount: number;
  };
}
```

**Key Types:**
```typescript
interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  nodeMap: Map<string, KnowledgeGraphNode>;
  adjacencyList: Map<string, Set<string>>;
}

interface RecommendedItem {
  itemId: string;
  reason: string[];
  heuristic_score: number;
  graph_boost: number;
  combined_score: number;
  hopDistance: number;
  targetRating: number;
}
```

---

### 3. **remediationEngine.ts** - Remediation & Velocity Detection

**Exports:**
```typescript
- createRemediationEngine(config?: Partial<RemediationConfig>): RemediationEngine
- createVelocityDetector(config?: Partial<AnomalyDetectionConfig>): VelocityDetector
```

**RemediationEngine Methods:**
```typescript
startSession(sourceItemId: string, sourceDifficulty: Difficulty, sessionId: string): RemediationSession;
logRemediationResponse(sessionId: string, itemId: string, correct: boolean): RemediationSession | null;
checkCompletion(sessionId: string): RemediationOutcome;
endSession(sessionId: string): RemediationOutcome;
applyRemediationKFactor(originalK: number): number;
```

**VelocityDetector Methods:**
```typescript
detectRapidGuess(timeSpentMs: number, estimatedReferenceMs: number, correct: boolean, proposedGain: number, minGainThreshold: number): AnomalyReport;
detectTimeVariance(recentTimeSpents: number[], threshold?: number): AnomalyReport;
detectImpossiblePattern(recentResults: boolean[], recentTimesMs: number[], minTimePerItem?: number): AnomalyReport;
```

---

### 4. **predictionAndRisk.ts** - Prediction & Risk Analysis

**Exports:**
```typescript
- createPerformancePredictor(config?: Partial<PredictionConfig>): PerformancePredictor
- createRiskAnalyzer(config?: Partial<RiskConfig>): RiskAnalyzer
```

**PerformancePredictor Methods:**
```typescript
predictPerformance(
  accuracy: number,
  currentRating: number,
  topicVariances: number[],
  meanAccuracy: number,
  improvementDelta: number,
  ratingVariance: number,
  completionRate?: number
): PredictionResult;
```

**PredictionResult:**
```typescript
interface PredictionResult {
  estimatedScore: number;        // [0-100]
  lowerBound: number;            // Confidence band lower
  upperBound: number;            // Confidence band upper
  confidence: number;            // [0-1] confidence score
  basis: PredictionBasis;        // 5-component breakdown
  readiness: Readiness;          // Classification
  explanation: string[];         // Human-readable factors
}
```

**RiskAnalyzer Methods:**
```typescript
computeRisk(
  accuracy: number,
  completionRate: number,
  proficiency: number,
  variance: number
): RiskIndicators;

getInterventionRecommendation(
  risk: RiskIndicators,
  topicAccuracies: Map<string, number>
): InterventionRecommendation;
```

---

### 5. **coachingEngine.ts** - Coaching & Session Analytics

**Static Methods:**
```typescript
class CoachingEngine {
  static classifyProficiency(rating: number): ProficiencyLevel;
  static classifyVolatility(variance: number): VolatilityLevel;
  static generateAdvice(context: CoachingContext): CoachingAdvice;
  static generateStudySchedule(context: CoachingContext, availableMinutesPerDay: number): { dailyGoal: string; weeklyFocus: string[] };
  static getMotivationalMessage(streak: number, ratingTier: Tier, improvementDelta: number): string;
  static suggestNextMilestone(currentRating: number, currentTier: Tier): { milestone: string; ratingTarget: number; description: string };
}

class SessionAnalyzer {
  static analyzeSession(...): SessionAnalytics;
  static getSessionSummary(analytics: SessionAnalytics): string;
}
```

---

### 6. **darsSystem.ts** - System Orchestrator

**Main Class: `DarsSystem`**
```typescript
class DarsSystem {
  constructor(items: any[], initialRating?: number, config?: DarsSystemConfig);

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
  getGraphStats(): any;
  
  endSession(
    sessionStartTime: Date,
    itemsAttempted: number,
    correctCount: number,
    ratingBefore: number,
    timesPerItem: number[]
  ): SessionAnalytics;
}
```

**Factory Function:**
```typescript
function createDarsSystem(
  items: any[],
  initialRating?: number,
  config?: DarsSystemConfig
): DarsSystem
```

---

## 📊 Complete API Reference

### Processing a Response

```typescript
const response = darsSystem.processResponse(
  itemId: string,          // Item identifier
  correct: boolean,        // Was answer correct?
  timeSpentMs: number,     // Time in milliseconds
  hintsUsed?: number,      // Hints used (default: 0)
  maxHints?: number,       // Max hints available (default: 3)
  domain?: string,         // Item domain (default: "general")
  topic?: string           // Item topic (default: "general")
): DarsResponse
```

**Returns:**
```typescript
interface DarsResponse {
  ratingUpdate: DarsRatingUpdate;
  nextRecommendation?: RecommendedItem;
  prediction?: PredictionResult;
  riskAssessment?: InterventionRecommendation;
  coaching?: CoachingAdvice;
  anomalyFlags?: string[];
}
```

### Rating Update Details

```typescript
interface DarsRatingUpdate {
  previousRating: number;           // Rating before update
  nextRating: number;              // Rating after update
  delta: number;                   // Change (ΔR)
  performanceQuality: number;      // P(q) ∈ [0,1]
  dynamicK: number;                // K(n, σ²) ∈ [16, 60]
  streakMultiplier: number;        // ϕ(k) ∈ [0.65, 1.35]
  expected: number;                // E(q) ∈ [0,1]
  timeEfficiency: number;          // τ(q) ∈ [0,1]
  hintPenalty: number;             // H(q) ∈ [0,1]
  streakQuality: number;           // ψ(q) ∈ [0,1]
  effectiveDifficulty: number;     // Reff_q (with centrality)
  isAnomalous: boolean;            // Rapid guess detected?
  nextMomentum: "hot" | "steady" | "cold";
  explanations: string[];          // Human-readable breakdown
}
```

### Learner State

```typescript
interface LearnerState {
  rating: number;                  // Current Elo rating
  answeredCount: number;           // Total items answered
  variance: number;                // Rating volatility
  streak: number;                  // Current streak (-7 to +7)
  momentum: "hot" | "steady" | "cold";
  recentDeltas: number[];          // Last 20 rating changes
  weakTopics: Set<string>;         // Topics with <60% accuracy
  volatilityHistory: number[];     // Last 20 variances
}
```

---

## 🔄 Complete Workflow Example

```typescript
// 1. Initialize system
const dars = createDarsSystem(questions, 1500);

// 2. Process first response
const response1 = dars.processResponse(
  "item_001",
  true,          // Correct
  30000,         // 30 seconds
  0,             // No hints
  3,             // Max 3 hints
  "GATE",        // Domain
  "DataStructures" // Topic
);

console.log(`Rating: ${response1.ratingUpdate.previousRating} → ${response1.ratingUpdate.nextRating}`);
console.log(`Next item: ${response1.nextRecommendation?.itemId}`);
console.log(`Prediction: ${response1.prediction?.estimatedScore}`);

// 3. Process more responses
const response2 = dars.processResponse("item_002", false, 45000, 2);
const response3 = dars.processResponse("item_003", true, 25000, 0);

// 4. Get current state
const state = dars.getLearnerState();
console.log(`Current rating: ${state.rating}`);
console.log(`Streak: ${state.streak}`);
console.log(`Momentum: ${state.momentum}`);

// 5. End session
const analytics = dars.endSession(
  sessionStartTime,
  3,     // items attempted
  2,     // correct
  1500,  // rating before
  [30000, 45000, 25000]
);

console.log(`Session: ${analytics.sessionDurationMin}min, ${(analytics.accuracy * 100).toFixed(0)}% accuracy`);
```

---

## 📝 Configuration Reference

### Full Configuration Object

```typescript
interface DarsSystemConfig {
  rating?: Partial<DarsConfig>;
  prediction?: Partial<PredictionConfig>;
  risk?: Partial<RiskConfig>;
  remediation?: Partial<RemediationConfig>;
  anomaly?: Partial<AnomalyDetectionConfig>;
}

// Example: Custom config
const config: DarsSystemConfig = {
  rating: {
    kMax: 80,        // Higher max K for faster early calibration
    provisionalItems: 50,
  },
  prediction: {
    accuracyWeight: 0.40,  // Emphasize accuracy more
  },
  risk: {
    riskThreshold: 0.65,   // Lower threshold for more interventions
  }
};

const dars = createDarsSystem(questions, 1500, config);
```

---

## 🧮 Mathematical Formulas

### Rating Update Formula
```
ΔR = K(n, σ²) × ϕ(k) × (P(q) - E(q))

where:
  K(n, σ²) = Kmin + (Kmax - Kmin) × e^(-λn × max(0, n - nprov)) × (σ² / (σ² + σ₀²))
  ϕ(k) = piecewise function based on streak
  P(q) = S × [...] + (1-S) × εfail
  E(q) = 1 / (1 + 10^((Reff_q - R)/400))
```

### Performance Quality
```
P(q) = correctness × [
  0.50 × τ(q) +           // Time efficiency
  0.30 × (1 - H(q)) +     // Hint penalty
  0.20 × ψ(q)             // Streak quality
] + (1 - correctness) × εfail
```

### Effective Difficulty
```
Reff_q = Rlabel_q + ξ × cnorm(q)

where ξ = 150 (centrality bonus)
and cnorm(q) ∈ [0, 1] (normalized betweenness centrality)
```

---

## 📚 For More Information

- **IMPLEMENTATION.md** - Complete system architecture
- **INTEGRATION_GUIDE.ts** - Practical code examples
- **types.ts** - All TypeScript interfaces
- **Original Paper** - DARS_paper.pdf in project root

---

Generated for DARS System v1.0
