// Quick Diagnostic Script for Review Answers Feature
// Paste this in browser console to test the system

console.log("=== Review Answers Feature Diagnostic ===\n");

// Test 1: Check localStorage for user
console.log("1. Checking user authentication...");
const userJson = localStorage.getItem("sb-dhqbxgwxfabwakdldqdd-auth-token");
if (userJson) {
  try {
    const auth = JSON.parse(userJson);
    console.log("✓ User authenticated:", auth.user?.email);
  } catch (e) {
    console.log("✗ Failed to parse auth token");
  }
} else {
  console.log("✗ No auth token found. Not logged in.");
}

// Test 2: Check if review functions are available
console.log("\n2. Checking if review functions are available...");
try {
  // This would be available if the app is loaded
  if (window.__TAURI__) {
    console.log("✗ Running in Tauri environment");
  } else {
    console.log("✓ Running in web environment");
  }
} catch (e) {
  console.log("? Could not determine environment");
}

// Test 3: Check for console logs from recent actions
console.log("\n3. Recent console logs to check:");
console.log("  - Look for: 'buildTestReviewPayload created: ...'");
console.log("  - Look for: 'recordTestHistory: Saving test with payload: ...'");
console.log("  - Look for: 'Test history loaded from DB: ...'");
console.log("  - Look for: 'parseReviewPayload: Successfully parsed payload'");
console.log("\nScroll up in console to find these logs.");

// Test 4: Create a test review payload structure
console.log("\n4. Expected review payload structure:");
const examplePayload = {
  full_test_id: "full-gate",
  question_ids: ["q1", "q2", "q3"],
  answers: [
    { questionId: "q1", selectedIndex: 0 },
    { questionId: "q2", selectedIndices: [0, 1] },
    { questionId: "q3", selectedIndices: [] }
  ],
  question_reviews: [
    {
      questionId: "q1",
      correct: true,
      timeSpentSeconds: 45,
      rapidGuessWarning: false,
      rapidGuessThresholdSeconds: 5,
      eloAdjustment: 25,
      warningText: "",
      remediationForQuestionId: null
    }
  ],
  attemptKind: "full-mock",
  countsForStats: true,
  countsForRating: true,
  warningBreakdown: {
    violations: 0,
    testType: "full-mock"
  }
};
console.log(JSON.stringify(examplePayload, null, 2));

// Test 5: Instructions
console.log("\n5. Testing Steps:");
console.log("  Step 1: Open DevTools (F12)");
console.log("  Step 2: Go to Practice page");
console.log("  Step 3: Start a full mock test");
console.log("  Step 4: Complete and submit test");
console.log("  Step 5: Check console for logs above");
console.log("  Step 6: Go to Test History page");
console.log("  Step 7: Look for 'Review Answers' button");
console.log("  Step 8: Click button and verify review opens");

console.log("\n=== End Diagnostic ===");

// Function to extract and display recent review-related logs
console.log("\n6. Log Summary Function:");
console.log("Run this to see all review-related activity:");
console.log(`
  // Copy this function to console:
  const showReviewLogs = () => {
    const logs = [
      "buildTestReviewPayload",
      "recordTestHistory",
      "Test history loaded",
      "parseReviewPayload"
    ];
    console.log("Search console for these terms:");
    logs.forEach(term => console.log("  - " + term));
  };
  showReviewLogs();
`);

// Test payload validation
console.log("\n7. Payload Validation Helper:");
console.log(`
  const validatePayload = (payload) => {
    const checks = {
      hasQuestionIds: Array.isArray(payload?.question_ids),
      questionIdCount: payload?.question_ids?.length ?? 0,
      hasAnswers: Array.isArray(payload?.answers),
      answerCount: payload?.answers?.length ?? 0,
      hasAttemptKind: typeof payload?.attemptKind === "string",
      attemptKind: payload?.attemptKind ?? "missing",
      countsForStats: payload?.countsForStats ?? false,
      countsForRating: payload?.countsForRating ?? false
    };
    console.table(checks);
    return checks.hasQuestionIds && checks.questionIdCount > 0;
  };
`);
