# Real Data Requirements - Test History Structure

## 📋 What Data the Notebook Expects

### test_history Table Structure

```sql
CREATE TABLE test_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  test_type VARCHAR (20),  -- 'full-mock', 'topic-wise', 'adaptive', 'assignment'
  score INTEGER,           -- e.g., 65
  max_score INTEGER,       -- Usually 100
  correct_answers INTEGER, -- e.g., 13
  total_questions INTEGER, -- e.g., 20
  questions_attempted INTEGER,
  violations INTEGER,
  completed_at TIMESTAMP,
  review_payload JSONB,    -- ⭐ CRITICAL - Must contain question details
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🎯 Critical: review_payload Structure

The **review_payload JSONB column is essential** for the progress tracker to work.

### Minimum Required Structure
```json
{
  "question_ids": ["q1", "q2", "q3"],
  "answers": ["a", "b", "c"],
  "question_reviews": [
    {
      "correct": true,
      "timeSpentSeconds": 30,
      "rapidGuessWarning": false
    },
    {
      "correct": false,
      "timeSpentSeconds": 45,
      "rapidGuessWarning": true
    },
    {
      "correct": true,
      "timeSpentSeconds": 25,
      "rapidGuessWarning": false
    }
  ]
}
```

### Complete Structure (with all fields)
```json
{
  "question_ids": ["da-2025-q001", "da-2025-q002"],
  "answers": ["A", "B"],
  "fullTestId": "full-gate",
  "attemptKind": "full-mock",
  "reviewMetadata": {
    "totalTime": 3600,
    "startTime": "2026-04-18T10:00:00Z",
    "endTime": "2026-04-18T11:00:00Z"
  },
  "question_reviews": [
    {
      "question_id": "da-2025-q001",
      "correct": true,
      "userAnswer": "A",
      "correctAnswer": "A",
      "timeSpentSeconds": 45,
      "rapidGuessWarning": false,
      "explanation": "Correct due to property X..."
    },
    {
      "question_id": "da-2025-q002",
      "correct": false,
      "userAnswer": "B",
      "correctAnswer": "C",
      "timeSpentSeconds": 30,
      "rapidGuessWarning": false,
      "explanation": "Should have selected C because..."
    }
  ]
}
```

---

## ✅ Verify Your Data

Run this SQL in Supabase to check:

```sql
-- 1. Check if test_history has data
SELECT COUNT(*) as total_tests FROM test_history;

-- 2. Check unique users
SELECT COUNT(DISTINCT user_id) as unique_students FROM test_history;

-- 3. Check a specific student
SELECT id, user_id, test_type, score, review_payload 
FROM test_history 
WHERE user_id = '12efa469-0330-42e1-bc64-82bed3402ae8'
LIMIT 5;

-- 4. Check review_payload structure
SELECT 
  id,
  review_payload->>'question_ids' as question_count,
  jsonb_array_length(review_payload->'question_reviews') as reviews_count
FROM test_history 
WHERE review_payload IS NOT NULL
LIMIT 5;

-- 5. Verify all required fields
SELECT 
  id,
  jsonb_object_keys(review_payload) as payload_keys
FROM test_history 
WHERE review_payload IS NOT NULL
LIMIT 1;
```

---

## 🔄 How Test Data Gets Saved

When you complete a test in the web app, this happens:

### 1. Frontend (React): Build Review Payload
```typescript
// src/lib/testReview.ts
const buildTestReviewPayload = (config: {
  questions,        // Array of Question objects
  answers,          // Array of PracticeAnswer objects
  fullTestId,       // e.g., 'full-gate'
  attemptKind       // e.g., 'full-mock', 'adaptive'
}) => {
  return {
    question_ids: questions.map(q => q.id),
    answers: normalizeAnswers(answers, questions),
    question_reviews: questions.map((q, idx) => ({
      correct: getReviewState(q, answers[idx]).state === 'correct',
      timeSpentSeconds: calculateTime(q),
      rapidGuessWarning: checkRapidGuess(answers[idx])
    }))
  };
};
```

### 2. Frontend: Save to Database
```typescript
// src/contexts/StudentAuthContext.tsx
const recordTestHistory = async (entry: TestHistoryInput) => {
  return studentSupabase
    .from('test_history')
    .insert([{
      user_id: currentUser.id,
      test_type: entry.testType,
      score: entry.score,
      review_payload: entry.reviewPayload,  // ⭐ This column
      completed_at: new Date()
    }]);
};
```

### 3. Database: Store JSONB
```sql
-- Supabase automatically stores as JSONB
INSERT INTO test_history (user_id, test_type, score, review_payload, completed_at)
VALUES (
  'student-uuid',
  'full-mock',
  65,
  '{"question_ids": [...], "question_reviews": [...]}'::jsonb,
  NOW()
);
```

---

## 🐛 Common Issues & Fixes

### Issue: review_payload is NULL
```sql
-- Problem: Tests saved without review payload
SELECT COUNT(*) FROM test_history WHERE review_payload IS NULL;

-- Fix: Update frontend to always build review_payload
-- See src/pages/PracticePage.tsx line 656+
```

**Solution**: Ensure all test submission code calls `buildTestReviewPayload()` before saving.

---

### Issue: review_payload Missing question_reviews
```json
{
  "question_ids": ["q1", "q2"],
  "answers": ["a", "b"]
  // ❌ Missing "question_reviews" array
}
```

**Solution**: Add `question_reviews` to payload:
```typescript
review_payload: {
  question_ids: [...],
  answers: [...],
  question_reviews: questions.map((q, i) => ({
    correct: isCorrect(q, answers[i]),
    timeSpentSeconds: getTime(q)
  }))
}
```

---

### Issue: Question IDs Don't Match
```
❌ Stored as: "question_id": "da-2025-q001"
❌ Looking for: "q1"
```

**Solution**: Use consistent question ID format across all code:
```typescript
// In buildTestReviewPayload:
question_ids: questions.map(q => q.id),  // Must match stored IDs

// In database:
question_id: 'da-2025-q001'  // Use full ID format
```

---

## 📊 Demo Data vs Real Data Example

### Demo Data (What Notebook Uses Now)
```python
pd.DataFrame({
    'test_type': ['full-mock'],
    'score': [65],
    'review_payload': [{
        'question_ids': ['q0', 'q1', 'q2', ...],
        'question_reviews': [
            {'correct': False, 'timeSpentSeconds': 30},
            {'correct': True, 'timeSpentSeconds': 35},
            ...
        ]
    }]
})
```

### Real Data (What You'll Have)
```sql
SELECT review_payload FROM test_history 
WHERE user_id = '12efa469-0330-42e1-bc64-82bed3402ae8'
LIMIT 1;

-- Output:
{
  "question_ids": ["da-2025-q1", "da-2025-q2", ...],
  "answers": ["A", "B", ...],
  "question_reviews": [
    {"correct": true, "timeSpentSeconds": 45, "rapidGuessWarning": false},
    {"correct": false, "timeSpentSeconds": 30, "rapidGuessWarning": true},
    ...
  ]
}
```

---

## ✨ What Changes When You Connect Real Data

| Aspect | Demo | Real |
|--------|------|------|
| **Number of Tests** | 5 | Your actual test count |
| **Questions per Test** | 20 | Your actual questions |
| **Accuracy** | 65% | Your actual accuracy |
| **Score Trend** | Simulated up to 75% | Your real progression |
| **Graph Nodes** | Generic q0-q19 | Your actual question IDs |
| **Simulation** | Replays q0→q1→q2... | Replays actual attempt order |

**All visualizations work the same!** Dashboard, graph, analysis - identical output format.

---

## 🔗 How to Update Student ID

In STUDENT_PROGRESS_TRACKER.ipynb **Section 3**, change:

```python
# Line 135 - Currently:
STUDENT_ID="12efa469-0330-42e1-bc64-82bed3402ae8"

# Change to your actual UUID, e.g.:
STUDENT_ID="abc12345-1234-1234-1234-123456789def"
```

Then run the cell. If test data exists, it will load automatically.

---

## 📞 Still No Data?

1. **Verify student ID exists**:
   ```sql
   SELECT DISTINCT user_id FROM test_history LIMIT 10;
   ```

2. **Check review_payload is populated**:
   ```sql
   SELECT COUNT(*) FROM test_history WHERE review_payload IS NOT NULL;
   ```

3. **If RLS blocks access, contact backend** for JWT token or service role key

4. **Use demo data for now** - Notebook works perfectly with it

---

**Status**: ✅ Notebook ready | ⏳ Waiting for real data
**Next Step**: Update Student ID with your actual UUID when ready
