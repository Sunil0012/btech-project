/**
 * FILE REFERENCE GUIDE
 * Quick navigation to all new and modified files in this overhaul
 */

// ============================================================
// CORE LIBRARY FILES (Architecture)
// ============================================================

/**
 * FILE: src/lib/testReview.ts
 * PURPOSE: Central repository for test review types and utilities
 * 
 * KEY TYPES:
 * - TestReviewPayload: Main payload structure with all exam metadata
 * - QuestionSnapshot: Complete question state at test time
 * - WarningBreakdown: Structured warning tracking with counts + details
 * - ReviewMetadata: Timing and browser context
 * - AttemptKind: Enum of all attempt types
 * 
 * KEY FUNCTIONS:
 * - buildTestReviewPayload(): Creates payload after exam submission
 * - calculateWarningBreakdown(): Normalizes warnings from violations
 * - filterTestHistoryByStatsFlag(): Filters by counts_for_stats flag
 * - parseTestReviewPayload(): Safe JSON parsing with defaults
 * 
 * USAGE: Imported by ExamShellComponent, RetakeExamComponent, history pages
 * WHEN TO MODIFY: Adding new exam metadata, warning types, or aggregation logic
 */

/**
 * FILE: src/lib/examShellState.ts
 * PURPOSE: State management for timed exam execution
 * 
 * KEY TYPES:
 * - ExamShellState: Complete exam UI state (timer, answers, visited, palette)
 * - ExamPaletteSlot: Individual question status in palette
 * - ExamShellAction: All possible state mutations
 * 
 * KEY FUNCTIONS:
 * - reduceExamShellState(): Main reducer with all action handlers
 * - updatePaletteStatus(): Helper to update question status
 * - getAnswersArray(): Convert map to array for payload
 * - canSubmitExam(): Validation check before submit
 * 
 * USAGE: Used exclusively by ExamShellComponent
 * WHEN TO MODIFY: Changing exam flow logic, palette behavior, timer logic
 */

/**
 * FILE: src/lib/retakeLogic.ts
 * PURPOSE: Question preparation for exact and templated retakes
 * 
 * KEY FUNCTIONS:
 * - buildExactReattempt(): Use stored snapshots for exact retakes
 * - buildTemplatedReattempt(): Generate question variants for new attempts
 * - createNumericTemplateVariant(): Modify NAT/numeric question values
 * - findSimilarTopicReplacement(): Fallback when templating fails
 * - getRetakeQuestionBank(): Load subject-appropriate question bank
 * 
 * DATA INPUTS: Question snapshots from review_payload
 * DATA OUTPUTS: retake_attempt with modified/variant questions
 * 
 * USAGE: Called by RetakeExamComponent to prepare retake session
 * WHEN TO MODIFY: Changing variant generation logic, fallback strategy
 */

// ============================================================
// UI COMPONENT FILES
// ============================================================

/**
 * FILE: src/components/ExamShellComponent.tsx
 * PURPOSE: Full-featured exam interface with timer and palette
 * 
 * KEY FEATURES:
 * - Question display with options
 * - Palette sidebar showing question status
 * - Timer with countdown (MM:SS)
 * - Skip and Mark-for-Review buttons
 * - Exit confirmation with data loss warning
 * - NO explanations shown during active attempt
 * - Full question snapshot capture on submit
 * 
 * PROPS:
 * - questions: Question[]
 * - onSubmit: (payload: TestReviewPayload) => void
 * - tempTimer?: number (for testing)
 * - progressiveUnlocking?: boolean (for adaptive mode)
 * - maxQuestionsPerBlock?: number (default 5)
 * 
 * INTERNAL STATE: Uses examShellState reducer for all logic
 * 
 * REPLACES: Old TopicTest and AdaptiveTest components (removed)
 * USAGE: Called from PracticePage for topic-wise/adaptive, direct use
 * WHEN TO MODIFY: Changing exam UI, timer behavior, palette display
 */

/**
 * FILE: src/components/RetakeExamComponent.tsx
 * PURPOSE: Wrapper for retake execution with question preparation
 * 
 * KEY LOGIC:
 * - Detects retake mode (exact vs templated)
 * - Uses snapshots for exact retakes
 * - Generates variants for templated retakes
 * - Builds new TestReviewPayload with retake metadata
 * - Renders ExamShellComponent with prepared questions
 * 
 * PROPS:
 * - originalAttempt: TestHistoryRow
 * - retakeMode: "exact" | "templated"
 * - onComplete: (payload: TestReviewPayload) => void
 * 
 * STATE MANAGEMENT: Handles loading, errors, question preparation
 * USAGE: Rendered conditionally from TestHistoryPage when user clicks retake button
 * WHEN TO MODIFY: Changing retake preparation logic
 */

/**
 * FILE: src/components/teacher/TeacherAssignmentGrouping.tsx
 * PURPOSE: Organize teacher assignments by status/priority
 * 
 * COMPONENTS:
 * - AssignmentGroupingSection: Single group with tone-based styling
 * - AssignmentGroupingLayout: Container for multiple grouped sections
 * 
 * FEATURES:
 * - Tone-based styling (primary/warning/destructive/success)
 * - Badge indicators (completion %, due status)
 * - Responsive grid layout (md:grid-cols-2)
 * - Click handlers for assignment details
 * 
 * USAGE: To be integrated into TeacherAssignmentsPage
 * WHEN TO MODIFY: Adding new grouping sections or tone types
 */

// ============================================================
// PAGE FILES
// ============================================================

/**
 * FILE: src/pages/PracticePage.tsx
 * PURPOSE: Student practice mode with exam selection
 * 
 * KEY CHANGES (from original):
 * - Question count selectors now include 40, 50
 * - Uses new ExamShellComponent instead of TopicTest/AdaptiveTest
 * - Passes exam questions to ExamShellComponent
 * - Handles exam submission via buildTestReviewPayload()
 * 
 * SECTIONS:
 * - Topic-wise selection: Subject → Topic → Count → Start
 * - Adaptive selection: Subject → Count → Start
 * - Full mock selection: Paper → Start
 * 
 * STATE: Tracks selected test_type, subject, topic, question_count
 * NAVIGATION: Renders ExamShellComponent when test starts
 * WHEN TO MODIFY: Adding new practice modes or question count options
 */

/**
 * FILE: src/pages/TestHistoryPage.tsx
 * PURPOSE: Display past attempts with review and retake capabilities
 * 
 * KEY CHANGES (from original):
 * - Added RetakeModeState for managing retake flow
 * - Added retakeMode state management
 * - Conditional render for RetakeExamComponent when retaking
 * - "Reattempt Same Test" button for exact retakes
 * - "Reattempt Similar" button for templated retakes
 * - onRetakeExact and onRetakeTemplated callbacks
 * 
 * FLOW:
 * 1. Display history list of past tests
 * 2. Click test → ReviewPage shows
 * 3. Click retake button → RetakeModeState set, flow changes
 * 4. RetakeExamComponent renders exam
 * 5. Submit → new attempt saved, history refreshes
 * 
 * WHEN TO MODIFY: Changing history UI, retake flow, review layout
 */

/**
 * FILE: src/pages/InsightsPage.tsx
 * PURPOSE: Student learning analytics dashboard
 * 
 * KEY SECTIONS:
 * - Header: Page title and description
 * - Key Metrics: 5 cards (tests, accuracy, best score, time, topics)
 * - Test Score Trend: Line chart showing progress over time
 * - Subject Accuracy: Bar chart showing per-subject performance
 * - Topic Mastery: Pie chart (strong/developing/weak breakdown)
 * - Topics to Focus On: List with progress bars
 * - Strong Topics: Grid of mastered topics
 * - AI Insights: Generated recommendations from test data
 * - Footer: Auto-included component
 * 
 * DATA SOURCES:
 * - useStudentAuth() for user context
 * - studentSupabase.from("test_history") for test data
 * - generateAIInsights() for AI coaching content
 * 
 * CHARTS: Uses Recharts library (LineChart, BarChart, PieChart)
 * ROUTE: /insights (protected for students only)
 * WHEN TO MODIFY: Adding/removing metrics, charts, or AI sections
 */

/**
 * FILE: src/pages/DashboardPage.tsx
 * PURPOSE: Student home page with quick CTAs
 * 
 * KEY CHANGE:
 * - "View Analysis" card CTA changed from /dashboard (self-link) to /insights
 * 
 * IMPACT: Students now correctly navigate to analytics page
 * WHEN TO MODIFY: Adding new dashboard sections or CTAs
 */

/**
 * FILE: src/App.tsx
 * PURPOSE: Main routing configuration
 * 
 * KEY CHANGE:
 * - Added /insights route with InsightsPage component
 * - Route protected with ProtectedRoute for "student" role only
 * 
 * ROUTE DEFINITION:
 * <Route 
 *   path="/insights" 
 *   element={<ProtectedRoute allowedRoles={["student"]}><InsightsPage /></ProtectedRoute>} 
 * />
 * 
 * WHEN TO MODIFY: Adding new routes or changing route protections
 */

// ============================================================
// DOCUMENTATION FILES
// ============================================================

/**
 * FILE: FEATURE_TEST_GUIDE.ts
 * PURPOSE: Comprehensive test coverage documentation
 * 
 * SECTIONS:
 * 1. Timed Exam Shell & Question Palette (4 tests)
 * 2. Full Question Snapshots & Retakes (4 tests)
 * 3. Warning Breakdown Tracking (3 tests)
 * 4. Student Insights Page (3 tests)
 * 5. Aggregation & Stats Filtering (2 tests)
 * 6. Build & Compilation (2 tests)
 * 7. Acceptance Tests (2 end-to-end scenarios)
 * 
 * TOTAL: 20 detailed test cases with step-by-step instructions
 * USAGE: Reference for manual testing or test automation development
 */

/**
 * FILE: IMPLEMENTATION_CHECKLIST.ts
 * PURPOSE: Track completion of all 18 original tasks
 * 
 * SECTIONS:
 * - Core Architecture (3/3 complete)
 * - Exam Shell UI (3/3 complete)
 * - Retake System (2/2 complete)
 * - Aggregation (1/1 complete)
 * - Student Analytics (2/2 complete)
 * - Teacher Portal (2/3 in progress)
 * - Testing & Validation (0/3 not started)
 * 
 * TOTAL: 15/18 complete (83%)
 * USAGE: Project status tracking and remaining work visibility
 */

/**
 * FILE: FINAL_DEPLOYMENT_SUMMARY.ts
 * PURPOSE: High-level overview of deployment readiness
 * 
 * KEY SECTIONS:
 * - Implementation Summary (15/18 complete)
 * - Architecture Decisions & Rationale
 * - Feature Inventory (what works)
 * - Deployment Checklist
 * - Remaining Work (3 tasks)
 * - Deployment Readiness Assessment
 * 
 * USAGE: Executive summary for stakeholders and team leads
 */

/**
 * FILE: REMAINING_WORK_QUICK_REFERENCE.ts
 * PURPOSE: Step-by-step guide for completing final 3 tasks
 * 
 * TASKS:
 * - Task 12: Dashboard CSS (5 min)
 * - Task 13: Assignments Integration (10 min)
 * - Task 14: Profile Tabbing (15 min)
 * 
 * EACH TASK HAS:
 * - Current state
 * - TODO checklist
 * - Code examples
 * - Time estimate
 * 
 * USAGE: Quick reference during final development push
 */

// ============================================================
// REMOVED FILES (For Reference)
// ============================================================

/**
 * DEPRECATED COMPONENTS (No longer used):
 * 
 * src/components/TopicTest.tsx
 *   → Replaced by ExamShellComponent
 * 
 * src/components/AdaptiveTest.tsx
 *   → Replaced by ExamShellComponent
 * 
 * These can be deleted during cleanup, but kept for now for safety
 * All functionality merged into ExamShellComponent
 */

// ============================================================
// DATABASE CHANGES (No Migrations Required)
// ============================================================

/**
 * TABLE: test_history
 * COLUMN: review_payload (JSONB)
 * 
 * EXTENDS: Existing JSONB column to include:
 * - questions_snapshot: Full question state at test time
 * - warning_breakdown: Normalized warning tracking
 * - review_metadata: Timing and browser info
 * - attempt_kind: Test type classifier
 * - source_attempt_id: For retake linking
 * - counts_for_stats: Flag for ELO impact
 * - counts_for_rating: Flag for ranking impact
 * 
 * BACKWARD COMPATIBLE: Existing records work without new fields
 * NO MIGRATION NEEDED: JSONB already supports schema-less extension
 */

export const FILE_REFERENCE = {
  coreLibrary: ["src/lib/testReview.ts", "src/lib/examShellState.ts", "src/lib/retakeLogic.ts"],
  components: ["src/components/ExamShellComponent.tsx", "src/components/RetakeExamComponent.tsx"],
  teacherUI: ["src/components/teacher/TeacherAssignmentGrouping.tsx"],
  pages: ["src/pages/PracticePage.tsx", "src/pages/TestHistoryPage.tsx", "src/pages/InsightsPage.tsx", "src/pages/DashboardPage.tsx", "src/App.tsx"],
  documentation: ["FEATURE_TEST_GUIDE.ts", "IMPLEMENTATION_CHECKLIST.ts", "FINAL_DEPLOYMENT_SUMMARY.ts", "REMAINING_WORK_QUICK_REFERENCE.ts"],
};
