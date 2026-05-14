-- Keep test_history private by default, but allow explicit admin JWTs to read
-- student rows through the normal authenticated Supabase client.
--
-- The publishable key alone is still not an admin credential. To use this
-- policy, sign in as a user whose JWT app_metadata contains either:
--   {"role": "admin"} or {"app_role": "admin"} or {"roles": ["admin"]}

CREATE OR REPLACE FUNCTION public.current_user_is_project_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'app_role', '') = 'admin'
    OR COALESCE(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin';
$$;

REVOKE ALL ON FUNCTION public.current_user_is_project_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_project_admin() TO authenticated;

GRANT SELECT ON public.test_history TO authenticated;
GRANT SELECT ON public.activity_events TO authenticated;

DROP POLICY IF EXISTS "Admins can read all test history" ON public.test_history;
CREATE POLICY "Admins can read all test history"
  ON public.test_history
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_project_admin());

DROP POLICY IF EXISTS "Admins can read all activity events" ON public.activity_events;
CREATE POLICY "Admins can read all activity events"
  ON public.activity_events
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_project_admin());
