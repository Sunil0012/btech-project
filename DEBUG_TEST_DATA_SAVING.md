# 🔍 Debugging Test Data Saving

Follow these steps to verify test data IS being saved correctly.

---

## Step 1: Verify Database Schema

**In Supabase Console → SQL Editor**, run:

```sql
-- Check if review_payload column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'test_history'
ORDER BY ordinal_position;
```

**Expected Output** (should include):
```
id               | uuid       | not null
user_id          | uuid       | not null
test_type        | text       | not null
score            | integer    | 
max_score        | integer    | 
review_payload   | jsonb      | 
completed_at     | timestamp  | not null
... (other fields)
```

✅ If `review_payload | jsonb` appears, the column exists.
❌ If it doesn't appear, run the migration:

```bash
supabase db push
```

---

## Step 2: Verify Any Tests Exist in Database

**In Supabase Console → SQL Editor**, run:

```sql
-- Count total tests in database
SELECT COUNT(*) as total_tests FROM test_history;

-- List unique user IDs with test counts
SELECT user_id, COUNT(*) as test_count, MAX(completed_at) as last_test
FROM test_history
GROUP BY user_id
ORDER BY test_count DESC
LIMIT 10;
```

**Expected Output**:
- If tests exist, you'll see user IDs and counts > 0
- If empty, no tests have been saved yet

**If empty**: 
1. Open the app in your browser
2. Run a full mock test
3. Submit the test
4. Check console for: `"recordTestHistory: Successfully saved test history"`
5. Re-run the SQL query above

---

## Step 3: Verify Specific Student's Tests

**Get the correct student ID first**:
1. Open app and look at Profile or Dashboard
2. Find your student UUID
3. Use it in this query:

```sql
-- Replace STUDENT_UUID with actual UUID from step 1
SELECT id, test_type, score, max_score, completed_at,
       review_payload IS NOT NULL as has_review,
       jsonb_array_length(review_payload->'question_ids') as question_count
FROM test_history
WHERE user_id = 'STUDENT_UUID'
ORDER BY completed_at DESC
LIMIT 5;
```

**Expected Output**:
```
id                  | test_type    | score | max_score | has_review | question_count
... test data rows with review_payload populated
```

---

## Step 4: Inspect Review Payload Structure

```sql
-- Replace TEST_ID with actual ID from step 3
SELECT id, test_type, completed_at,
       jsonb_pretty(review_payload) as payload_details
FROM test_history
WHERE id = 'TEST_ID'
LIMIT 1;
```

**Expected Structure**:
```json
{
  "full_test_id": "full-gate",
  "question_ids": ["q001", "q002", "q003", ...],
  "answers": [0, 1, "option", ...],
  "question_reviews": [
    {
      "correct": true,
      "timeSpentSeconds": 45,
      "rapidGuessWarning": false
    },
    ...
  ],
  "attemptKind": "full-mock"
}
```

---

## Step 5: Check Browser Console Logs

1. Open app in Chrome/Firefox
2. Press **F12** to open Developer Console
3. Filter by "recordTestHistory"
4. Run a test
5. Look for these messages:

### ✅ Success Flow
```
[1] buildTestReviewPayload created: {questionCount: 20, answerCount: 20, hasReviews: true, ...}
[2] recordTestHistory: Saving test with payload: {testType: "full-mock", hasReviewPayload: true, reviewPayloadKeys: [...]}
[3] recordTestHistory: Successfully saved test history
```

### ❌ Error Flow
```
recordTestHistory: Insert error: {code: "23502", message: "null value in column..."}
```

---

## Step 6: Check RLS Policies

If you see **401 Unauthorized** or **INSERT denied** errors:

```sql
-- View RLS policies on test_history
SELECT * FROM pg_policies 
WHERE tablename = 'test_history'
ORDER BY cmd;
```

**Expected**: Should have INSERT policy allowing authenticated users

**If missing or too restrictive**: Update RLS in Supabase Dashboard
- Go to `test_history` table
- Click "RLS" 
- Enable RLS
- Add policy: `INSERT` for `authenticated` users where `auth.uid() = user_id`

---

## Step 7: Full Debugging Workflow

### Scenario: Tests not appearing in database

1. **Check column exists**:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'test_history' AND column_name = 'review_payload';
   ```
   - ❌ Empty → Run `supabase db push`
   - ✅ Has result → Column exists

2. **Open browser console** (F12) and run a test

3. **Check for save success log**:
   - ✅ "Successfully saved test history" → Check Supabase
   - ❌ "Insert error" → See step 6 (RLS policy)

4. **Query your tests**:
   ```sql
   SELECT COUNT(*) FROM test_history 
   WHERE user_id = 'YOUR_USER_ID';
   ```
   - Should increase after each test

5. **Check review_payload format**:
   ```sql
   SELECT review_payload 
   FROM test_history 
   WHERE user_id = 'YOUR_USER_ID' 
   LIMIT 1;
   ```
   - Should be valid JSON, not null

---

## Step 8: Verify in Notebook

Once database has data, update the notebook:

```python
# In cell 3 (Configuration)
STUDENT_ID = "YOUR_USER_ID"  # Replace with your actual student UUID
SUPABASE_ACCESS_TOKEN = ""    # Leave blank for public key

# Run the notebook
# Should now load real test data instead of showing "No test history found"
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "No test history found" | Database empty | Run a test in app, check console for save confirmation |
| RLS Policy blocking | INSERT permission denied | Add RLS policy: `auth.uid() = user_id` |
| review_payload is null | Column doesn't exist | Run `supabase db push` |
| Wrong student ID | Hardcoded ID ≠ logged-in user | Get correct UUID from app profile |
| Tests saved but notebook still shows error | Bad authentication token | Leave SUPABASE_ACCESS_TOKEN blank to use public key |

---

## Quick Query Summary

```sql
-- 1. Column exists?
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'test_history' AND column_name = 'review_payload';

-- 2. Any tests?
SELECT COUNT(*) FROM test_history;

-- 3. Your tests?
SELECT COUNT(*) FROM test_history 
WHERE user_id = 'YOUR_UUID';

-- 4. Review payload populated?
SELECT COUNT(*) FROM test_history 
WHERE review_payload IS NOT NULL;

-- 5. Recent tests?
SELECT id, test_type, score, completed_at 
FROM test_history 
WHERE user_id = 'YOUR_UUID'
ORDER BY completed_at DESC LIMIT 5;
```

---

## ✅ Success Criteria

When everything is working:
- ✅ Browser console shows "Successfully saved test history" after each test
- ✅ Supabase SQL query returns test rows
- ✅ review_payload contains valid JSON with question data
- ✅ Notebook loads data and shows dashboard
- ✅ Graph visualization displays green/red nodes correctly
