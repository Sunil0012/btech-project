alter table public.test_history
add column if not exists review_payload jsonb;
