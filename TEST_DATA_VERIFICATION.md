# ✅ Test Data Saving Verification Report

**Status**: All code properly configured to save test data to `test_history` table with `review_payload`.

## 1. Database Schema

**Migration File**: `supabase/migrations/20260413113000_add_test_history_review_payload.sql`

```sql
alter table public.test_history
add column if not exists review_payload jsonb;
```

✅ Migration created to add `review_payload` column (JSONB type)

**Required Action**: Run in Supabase console or terminal:
```bash
supabase db push
```

---

## 2. Code Flow - Test Submission → Database

### Core Functions

**[src/lib/testReview.ts](src/lib/testReview.ts)**
- `buildTestReviewPayload()` - Builds TestReviewPayload object with:
  - `full_test_id`: Test identifier
  - `question_ids[]`: Array of question IDs
  - `answers[]`: Array of student answers
  - `question_reviews[]`: Detailed review data for each question
  - `attemptKind`: "full-mock" | "topic-wise" | "adaptive" | "assignment-test" | "assignment-homework"

**[src/contexts/StudentAuthContext.tsx](src/contexts/StudentAuthContext.tsx) - Lines 671-730**
- `recordTestHistory()` callback - Saves to Supabase:
  1. Creates history entry with `user_id` (current student)
  2. Inserts into `test_history` table with all fields including `review_payload`
  3. Logs: `"recordTestHistory: Saving test with payload: {testType, hasReviewPayload, reviewPayloadKeys}"`
  4. Falls back gracefully if `review_payload` column missing
  5. Syncs with teacher backend via `syncStudentTestHistory()`

---

## 3. All Test Submission Paths

### ✅ Full Mock Tests
**File**: [src/pages/PracticePage.tsx](src/pages/PracticePage.tsx) (Lines 650-677)

```
buildTestReviewPayload() ──> recordTestHistory()
├─ full_test_id: testId
├─ attemptKind: "full-mock"
└─ review_payload: {question_ids, answers, question_reviews}
```

**Data saved**:
- test_type: "full-mock"
- review_payload: ✅ Included
- subject_id: null
- topic_id: null

### ✅ Topic-Wise Tests
**File**: [src/components/ExamShellComponent.tsx](src/components/ExamShellComponent.tsx) (Lines 270-310)

```
buildTestReviewPayload() ──> recordTestHistory()
├─ attemptKind: "topic-wise"
├─ reviewMetadata: {attemptDuration, startTime, endTime}
└─ review_payload: {question_ids, answers, question_reviews}
```

**Data saved**:
- test_type: "topic-wise"
- review_payload: ✅ Included
- subject_id: ✅ Included
- topic_id: ✅ Included

### ✅ Adaptive Tests
**File**: [src/components/ExamShellComponent.tsx](src/components/ExamShellComponent.tsx) (Lines 270-310)

```
buildTestReviewPayload() ──> recordTestHistory()
├─ attemptKind: "adaptive"
├─ reviewMetadata: {attemptDuration, startTime, endTime}
└─ review_payload: {question_ids, answers, question_reviews}
```

**Data saved**:
- test_type: "adaptive"
- review_payload: ✅ Included
- subject_id: ✅ Included
- topic_id: ✅ Included

### ✅ Assignments
**File**: [src/pages/AssignmentAttemptPage.tsx](src/pages/AssignmentAttemptPage.tsx) (Lines 160-200)

```
buildTestReviewPayload() ──> recordTestHistory()
├─ attemptKind: "assignment-test" | "assignment-homework"
└─ review_payload: {question_ids, answers, question_reviews}
```

**Data saved**:
- test_type: "assignment-test" | "assignment-homework"
- review_payload: ✅ Included
- subject_id: ✅ Included
- topic_id: ✅ Included

---

## 4. Console Logging Points

When running tests, check browser console for these logs:

1. **Building payload**: 
   ```
   buildTestReviewPayload created: {questionCount, answerCount, hasReviews, payload}
   ```

2. **Saving to DB**: 
   ```
   recordTestHistory: Saving test with payload: {testType, hasReviewPayload, reviewPayloadKeys}
   ```

3. **Success confirmation**: 
   ```
   recordTestHistory: Successfully saved test history
   ```

4. **Error handling**: 
   ```
   recordTestHistory: Insert error: {...}
   recordTestHistory: Final error: {...}
   ```

---

## 5. Database Schema Check

**To verify the column exists in Supabase**, run in SQL Editor:

```sql
-- Check if review_payload column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'test_history' AND column_name = 'review_payload';

-- Should return: review_payload | jsonb
```

**To see saved test data**:

```sql
-- Count tests by user
SELECT user_id, COUNT(*) as test_count
FROM test_history
GROUP BY user_id
LIMIT 10;

-- View recent tests with review_payload
SELECT id, user_id, test_type, score, review_payload IS NOT NULL as has_review
FROM test_history
ORDER BY completed_at DESC
LIMIT 5;

-- View test data for specific student
SELECT id, test_type, score, max_score, 
       review_payload->'question_ids' as questions
FROM test_history
WHERE user_id = '12efa469-0330-42e1-bc64-82bed3402ae8'
ORDER BY completed_at DESC;
```

---

## 6. Checklist to Ensure Tests Save

- [ ] `.env` has `VITE_STUDENT_SUPABASE_URL` and `VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY`
- [ ] Supabase migration applied: `supabase db push`
- [ ] Database has `review_payload` column (JSONB type) in `test_history` table
- [ ] Student is logged in (user session exists)
- [ ] RLS policies allow INSERT on `test_history` for authenticated students
- [ ] Run a test in the app
- [ ] Check browser console for "recordTestHistory: Successfully saved test history"
- [ ] Query Supabase SQL Editor to verify test appears in `test_history` table

---

## 7. Why Tests May Not Appear

### Issue 1: Migration Not Applied
**Solution**: Run `supabase db push` to apply migration

### Issue 2: RLS Policy Blocking
**Check**: Are RLS policies allowing INSERT to `test_history`?
```sql
SELECT * FROM pg_policies WHERE tablename = 'test_history';
```

### Issue 3: Wrong Student ID
**Check**: Is the logged-in user's ID matching what's queried?
- App uses: `user.id` from authentication
- Notebook uses: hardcoded student ID
- These must match!

### Issue 4: Network/Auth Issue
**Check**: Is student authentication working?
- Can you create a profile?
- Can you view dashboard?
- Does console show auth errors?

---

## 8. Summary

✅ **Code is correct and complete**
- All 4 submission paths properly build review payload
- All 4 paths properly call recordTestHistory()
- Database migration exists to add review_payload column
- Console logging configured at 4 points

⚠️ **Potential Issues to Check**
1. Has the migration been applied to the database?
2. Does the test_history table have review_payload column?
3. Are RLS policies blocking the INSERT?
4. Is the logged-in student ID correct?
5. Are there any network errors when saving?

**Next Step**: Check the Supabase console to verify:
1. Column exists: `SELECT * FROM test_history LIMIT 1;`
2. Run a test in the app
3. Check if new row appears in test_history table
4. View the review_payload JSON to confirm it's populated
