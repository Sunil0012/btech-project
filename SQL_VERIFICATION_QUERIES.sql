-- ============================================================
-- SQL VERIFICATION SCRIPT
-- Run these queries in Supabase SQL Editor to verify setup
-- ============================================================

-- Query 1: Check if review_payload column exists
-- Should return: review_payload | jsonb | NO/YES
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'test_history' AND column_name = 'review_payload';

-- Query 2: Count total tests in database
-- Should return: (some number) or 0 if no tests yet
SELECT COUNT(*) as total_tests
FROM test_history;

-- Query 3: List all unique students who have test data
-- Shows which student IDs have submissions
SELECT DISTINCT user_id, COUNT(*) as test_count
FROM test_history
GROUP BY user_id
ORDER BY test_count DESC
LIMIT 10;

-- Query 4: Check if any test has review_payload
-- Shows how many tests have review_payload populated
SELECT 
  COUNT(*) as total_tests,
  COUNT(CASE WHEN review_payload IS NOT NULL THEN 1 END) as tests_with_payload,
  COUNT(CASE WHEN review_payload IS NULL THEN 1 END) as tests_without_payload
FROM test_history;

-- Query 5: View recent tests with review_payload
-- Shows the structure of saved data
SELECT 
  id,
  user_id,
  test_type,
  score,
  max_score,
  completed_at,
  review_payload IS NOT NULL as has_payload,
  CASE 
    WHEN review_payload IS NOT NULL 
    THEN jsonb_array_length(review_payload->'question_ids')
    ELSE 0
  END as question_count
FROM test_history
ORDER BY completed_at DESC
LIMIT 5;

-- Query 6: Check your specific student's tests
-- Replace UUID with your actual student ID
SELECT 
  id,
  test_type,
  score,
  max_score,
  completed_at,
  review_payload IS NOT NULL as has_review,
  CASE 
    WHEN review_payload IS NOT NULL 
    THEN jsonb_pretty(review_payload)
    ELSE 'NULL'::jsonb
  END as payload_structure
FROM test_history
WHERE user_id = '12efa469-0330-42e1-bc64-82bed3402ae8'
ORDER BY completed_at DESC
LIMIT 3;

-- Query 7: View actual review_payload structure
-- See what data is being stored
SELECT 
  jsonb_pretty(review_payload) as payload_structure
FROM test_history
WHERE review_payload IS NOT NULL
LIMIT 1;

-- Query 8: Check RLS policies on test_history table
-- Verify access controls
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  qual as policy_condition,
  with_check as check_condition
FROM pg_policies
WHERE tablename = 'test_history'
ORDER BY policyname;

-- Query 9: Count tests by type
-- Shows distribution of test types
SELECT 
  test_type,
  COUNT(*) as count,
  ROUND(AVG(score), 1) as avg_score,
  MAX(score) as max_score,
  MIN(score) as min_score
FROM test_history
GROUP BY test_type
ORDER BY count DESC;

-- Query 10: Verify column structure
-- Shows all columns in test_history table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_name = 'test_history'
ORDER BY ordinal_position;
