# Review Answers Feature - Verification & Debugging Guide

## Overview
This guide helps verify that the "Review Answers" feature is working correctly for all test types. The feature should:
1. Capture review payload during test submission
2. Save review payload to database
3. Display "Review Answers" button in TestHistoryPage
4. Open review interface when button clicked

## System Architecture

### Data Flow
```
Test Submission
    ↓
buildTestReviewPayload() - Builds complete review data
    ↓
recordTestHistory() - Saves to test_history table with review_payload
    ↓
Database (test_history.review_payload)
    ↓
TestHistoryPage.parseReviewPayload() - Parses and validates data
    ↓
Review Button (enabled/disabled based on payload)
    ↓
HistoryReviewPage - Displays review interface
```

## Key Files

| File | Purpose | Key Function |
|------|---------|---------------|
| `src/lib/testReview.ts` | Review payload builder | `buildTestReviewPayload()` |
| `src/contexts/StudentAuthContext.tsx` | Test history recording | `recordTestHistory()` |
| `src/pages/TestHistoryPage.tsx` | History display & review button | `parseReviewPayload()` |
| `src/pages/PracticePage.tsx` | Full mock test submission | Calls `buildTestReviewPayload()` |
| `src/components/ExamShellComponent.tsx` | Topic-wise/adaptive submission | Calls `buildTestReviewPayload()` |
| `src/pages/AssignmentAttemptPage.tsx` | Assignment submission | Calls `buildTestReviewPayload()` |

## Verification Checklist

### Phase 1: Database Setup
- [ ] Run migration: `supabase db push`
- [ ] Verify `test_history.review_payload` column exists (JSONB type)
- [ ] Check RLS policies allow insert with new column
- [ ] Run `SELECT * FROM test_history LIMIT 1` to confirm column

### Phase 2: Test Submission Flow
1. **Open browser DevTools** (F12)
2. **Navigate to Practice page**
3. **Start a full mock test** (or any test type)
4. **Complete the test** (submit answers)
5. **Check console for logs:**
   ```
   ✓ "buildTestReviewPayload created: {questionCount: X, answerCount: X, hasReviews: Y, payload: {...}}"
   ✓ "recordTestHistory: Saving test with payload: {testType: ..., hasReviewPayload: true, reviewPayloadKeys: [...]}"
   ✓ "recordTestHistory: Successfully saved test history"
   ```

### Phase 3: Database Verification
1. **Open Supabase dashboard**
2. **Go to test_history table**
3. **Find latest row with your test**
4. **Check review_payload column:**
   - Should contain JSON object
   - Should have `question_ids` array with question IDs
   - Should have `answers` array (may be empty for some tests)
   - Example structure:
     ```json
     {
       "full_test_id": "full-gate",
       "question_ids": ["q1", "q2", "q3", ...],
       "answers": [...],
       "question_reviews": [...],
       "attemptKind": "full-mock",
       "countsForStats": true,
       "countsForRating": true
     }
     ```

### Phase 4: TestHistoryPage Display
1. **Navigate to Test History page**
2. **Open browser console**
3. **Check logs:**
   ```
   "Test history loaded from DB: {rowCount: X, rows: [{id: ..., testType: ..., hasReviewPayload: true, reviewPayloadKeys: [...]}]}"
   ```
4. **In UI:**
   - [ ] Test card shows "Review Answers" button
   - [ ] Button is **enabled** (not grayed out)
   - [ ] Shows question count: "X questions"
   - [ ] Click button should open review interface

### Phase 5: Review Interface
1. **Click "Review Answers" button**
2. **Should see HistoryReviewPage with:**
   - [ ] Test info header (score, accuracy, etc.)
   - [ ] Question navigation
   - [ ] Your answer displayed
   - [ ] Correct answer displayed
   - [ ] Explanation from question bank
   - [ ] Previous/Next question buttons
3. **Check console for any errors:**
   - Should see `"Opening review for test: {id}, {payload}"`

## Common Issues & Solutions

### Issue 1: "Review Answers" button shows "Not available"
**Symptoms:**
- Button is grayed out
- Console shows: `"hasReviewPayload: false"`

**Possible Causes:**
1. review_payload not being built during submission
2. review_payload not being saved to database
3. parseReviewPayload returning null

**Solutions:**
```
1. Check Phase 2 console logs - do you see "buildTestReviewPayload created"?
   NO → Review payload not being built. Check if test is using latest code.
   YES → Payload is built. Check Phase 2 next step.

2. Check Phase 2 console logs - do you see "Successfully saved test history"?
   NO → Database save failed. Check console error message.
   YES → Saved. Check database in Phase 3.

3. Check Supabase dashboard - is review_payload column populated?
   NO → Migration didn't run. Run: supabase db push
   YES → Data is there. Check Phase 4.

4. Check Phase 4 console logs - do you see "hasReviewPayload: true"?
   NO → parseReviewPayload returning null. Check what's in the DB.
   YES → Data loaded. UI should show enabled button.
```

### Issue 2: Console shows "recordTestHistory: Insert error"
**Symptoms:**
- Error in console during submission
- Test not saved to history

**Possible Causes:**
1. Missing review_payload column
2. RLS policy blocking insert
3. Invalid data format

**Solutions:**
```bash
# 1. Verify migration was applied
supabase db pull

# 2. Check column exists
psql -h localhost -d postgres -U postgres -c "SELECT column_name FROM information_schema.columns WHERE table_name='test_history'"

# 3. Check RLS policies
SELECT * FROM auth.users LIMIT 1  # Should return your user

# 4. Try fallback insert (without review_payload)
# Code will automatically retry without review_payload if column is missing
```

### Issue 3: "Review Answers" button opens but shows blank screen
**Symptoms:**
- Button click works
- HistoryReviewPage opens but no content

**Possible Causes:**
1. Questions not found in question bank
2. Invalid question IDs in review_payload
3. getQuestionForReview() returning null

**Solutions:**
```
1. Check browser console for errors
2. Verify question_ids in review_payload are valid
3. Check if questions exist in question bank:
   - Browse question files in src/data/questions/
   - Verify question IDs match
```

### Issue 4: Database column "review_payload" doesn't exist
**Symptoms:**
- Console error: "column \"review_payload\" does not exist"
- Fallback to legacy insert happens automatically

**Solutions:**
```bash
# Run migration
supabase db push

# Verify column was created
supabase db pull

# Check migrations folder
ls supabase/migrations/

# If migration not found, create manually:
supabase migration new add_review_payload
# Add to migration file: ALTER TABLE test_history ADD COLUMN review_payload JSONB;
supabase db push
```

## Console Output Examples

### Successful Flow
```
buildTestReviewPayload created: {
  questionCount: 55,
  answerCount: 55,
  hasReviews: false,
  payload: {...}
}

recordTestHistory: Saving test with payload: {
  testType: "full-mock",
  hasReviewPayload: true,
  reviewPayloadKeys: ["full_test_id", "question_ids", "answers", "attemptKind", "countsForStats", "countsForRating", "warningBreakdown"]
}

recordTestHistory: Successfully saved test history

Test history loaded from DB: {
  rowCount: 1,
  rows: [{
    id: "...",
    testType: "full-mock",
    hasReviewPayload: true,
    reviewPayloadKeys: ["full_test_id", "question_ids", "answers", "attemptKind", "countsForStats", "countsForRating", "warningBreakdown"]
  }]
}

parseReviewPayload: Extracted data {
  questionCount: 55,
  answerCount: 55,
  hasQuestionReviews: false,
  valueKeys: ["full_test_id", "question_ids", "answers", "attemptKind", "countsForStats", "countsForRating", "warningBreakdown"]
}

parseReviewPayload: Successfully parsed payload {
  questionCount: 55,
  answerCount: 55,
  questionReviewCount: 0
}

Opening review for test: ..., {...}
```

### Error Flow
```
recordTestHistory: Insert error: {
  code: "42P01",
  message: "column \"review_payload\" does not exist",
  ...
}

recordTestHistory: review_payload column missing, retrying without it

recordTestHistory: Final error: null  # Fallback succeeded

recordTestHistory: Successfully saved test history (without review_payload)
```

## Test Scenarios

### Scenario 1: Full Mock Test
1. Start full-mock test from Practice page
2. Submit test
3. Should show test complete page with 3 buttons:
   - "Review Answers" (should open review)
   - "Take Test Again" (should start new test)
   - "View Dashboard" (should navigate to dashboard)
4. Navigate to Test History
5. Latest test should have "Review Answers" button enabled

### Scenario 2: Topic-wise Test
1. Start topic-wise test from Practice page
2. Submit test
3. Should record with `attemptKind: "topic-wise"`
4. Should appear in Test History with review available

### Scenario 3: Adaptive Test
1. Start adaptive test from Practice page
2. Complete min 3 questions
3. Submit test
4. Should record with `attemptKind: "adaptive"`
5. Should appear in Test History with review available

### Scenario 4: Assignment
1. Open assignment from classroom
2. Submit assignment
3. Should record with `attemptKind: "assignment-test"`
4. Should appear in Test History with review available

## Performance Notes

- Review payload JSON size: ~5-50KB depending on test size
- Database insert time: <100ms typical
- parseReviewPayload parsing: <10ms
- TestHistoryPage loading: <200ms with network

## Migration Instructions

If you're adding review_payload to an existing database:

```bash
# 1. Create migration
supabase migration new add_review_payload

# 2. Add to migration file (20260413HHMMSS_add_review_payload.sql):
ALTER TABLE test_history ADD COLUMN IF NOT EXISTS review_payload jsonb;

# 3. Apply migration
supabase db push

# 4. Verify
supabase db pull
```

## Next Steps

1. **Run all 5 phases above** to verify everything works
2. **Take a full mock test** and submit
3. **Check browser console** for all expected logs
4. **Verify data in database** with Supabase dashboard
5. **Check Test History page** for "Review Answers" button
6. **Click button** and verify review interface opens
7. **Report any issues** with console output

## Success Criteria

- [ ] Console logs show all 4 key operations succeeding
- [ ] Supabase dashboard shows review_payload column populated
- [ ] TestHistoryPage shows "Review Answers" button enabled
- [ ] Clicking button opens HistoryReviewPage without errors
- [ ] Review interface displays questions and answers correctly
- [ ] Test Complete page buttons work (Review, Try Again, Dashboard)
