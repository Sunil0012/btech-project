# 🔍 How to Verify Test Data Storage

Follow these steps to confirm that test data is being saved to the database.

---

## Step 1: Apply the Database Migration

This adds the `review_payload` column to the `test_history` table.

**In your terminal**:
```bash
cd c:\Users\sunil\Downloads\btech-project
supabase db push
```

**Expected Output**:
```
✔ Created migration 20260413113000_add_test_history_review_payload.sql
✔ Applied migration
```

If you get an error, you can also apply it manually in Supabase console.

---

## Step 2: Verify Column Exists

**Go to**: Supabase Console → SQL Editor

**Run this query**:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'test_history' AND column_name = 'review_payload';
```

**Expected Result**:
```
review_payload | jsonb | YES
```

If empty, the column doesn't exist. Run migration again.

---

## Step 3: Run a Test in the App

1. Open the web app in your browser
2. Press **F12** to open Developer Console
3. Go to **Console** tab
4. Run a full mock test
5. On test completion, click "Submit"

---

## Step 4: Check Console Logs

In the **Console** tab, you should see these messages (in order):

✅ **Success Flow**:
```
buildTestReviewPayload created: {questionCount: 20, answerCount: 20, hasReviews: true, ...}

recordTestHistory: Saving test with payload: {testType: "full-mock", hasReviewPayload: true, reviewPayloadKeys: [...]}

recordTestHistory: Successfully saved test history
```

❌ **If Error**:
```
recordTestHistory: Insert error: {code: "...", message: "..."}
```

**What to do**: Screenshot the error and check the troubleshooting guide below.

---

## Step 5: Query the Database

**In Supabase SQL Editor**, run:

```sql
-- Check if any tests exist
SELECT COUNT(*) as total_tests FROM test_history;

-- Check tests for your student ID
SELECT 
  id, test_type, score, completed_at,
  review_payload IS NOT NULL as has_payload
FROM test_history
WHERE user_id = '12efa469-0330-42e1-bc64-82bed3402ae8'
ORDER BY completed_at DESC
LIMIT 5;
```

**Expected**:
- `total_tests` should be > 0
- Your tests should show `has_payload: true`

---

## Step 6: Inspect Review Payload

```sql
-- View the actual review_payload data
SELECT 
  jsonb_pretty(review_payload) as data
FROM test_history
WHERE user_id = '12efa469-0330-42e1-bc64-82bed3402ae8'
  AND review_payload IS NOT NULL
LIMIT 1;
```

**Expected Output**: JSON structure with `question_ids`, `answers`, `question_reviews`

```json
{
  "answers": [...],
  "question_ids": [...],
  "question_reviews": [...],
  "attemptKind": "full-mock",
  ...
}
```

---

## Step 7: Run the Notebook

Now that data exists, try the notebook:

1. Open `STUDENT_PROGRESS_TRACKER.ipynb`
2. Set `STUDENT_ID = "12efa469-0330-42e1-bc64-82bed3402ae8"` in cell 4
3. Run cells in order
4. Cell 5 should connect to Supabase
5. Cell 7 should load test data
6. You should see: `✅ Loaded X test attempts from database`

---

## Troubleshooting

### Issue: "review_payload column missing" error

**Cause**: Migration not applied

**Solution**:
```bash
supabase db push
```

---

### Issue: Console shows "Successfully saved" but no data in database

**Cause**: Possible authentication or RLS issue

**Check**:
1. Are you logged in to the app?
2. Can you see your profile/dashboard?
3. Check console for auth errors

**Solution**: Verify RLS policy allows your student to INSERT:
```sql
SELECT * FROM pg_policies WHERE tablename = 'test_history';
```

Should show a policy like:
```
INSERT for authenticated users using (auth.uid() = user_id)
```

---

### Issue: Notebook shows "401 Unauthorized"

**Cause**: Public key doesn't have access (RLS blocking)

**Solution**: 
1. Get a JWT token from the app
2. Paste it in notebook cell 3: `SUPABASE_ACCESS_TOKEN = "eyJ..."`
3. Or update RLS policies to allow public key

---

### Issue: No tests showing in Supabase

**Cause**: No tests have been submitted yet

**Solution**:
1. Run a test in the app
2. See console log: "Successfully saved test history"
3. Wait 2-3 seconds
4. Re-query the database

---

## Summary Checklist

- [ ] Applied migration: `supabase db push`
- [ ] Column exists: `review_payload | jsonb` in test_history
- [ ] Ran a test in the app
- [ ] Saw "Successfully saved" in browser console
- [ ] Found test data in Supabase SQL query
- [ ] review_payload contains JSON data
- [ ] Notebook loads data successfully

Once all checkboxes are ✅, your test data storage is working correctly!

---

## Quick Commands

Save these to run quickly:

**Check column exists**:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'test_history' AND column_name = 'review_payload';
```

**Count your tests**:
```sql
SELECT COUNT(*) FROM test_history 
WHERE user_id = '12efa469-0330-42e1-bc64-82bed3402ae8';
```

**View your latest test**:
```sql
SELECT * FROM test_history 
WHERE user_id = '12efa469-0330-42e1-bc64-82bed3402ae8'
ORDER BY completed_at DESC LIMIT 1;
```

**View review_payload**:
```sql
SELECT jsonb_pretty(review_payload) FROM test_history
WHERE user_id = '12efa469-0330-42e1-bc64-82bed3402ae8'
ORDER BY completed_at DESC LIMIT 1;
```
