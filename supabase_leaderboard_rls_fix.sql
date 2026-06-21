-- ============================================================
-- Leaderboard Fix: Allow students to read all student_stats
-- and all profiles (names/avatars) for the leaderboard.
--
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Allow any authenticated student to SELECT all student_stats rows
--    (needed so the leaderboard can show all students, not just yourself)
create policy "student_stats: all students can select for leaderboard"
  on student_stats for select
  using (public.get_user_role() = 'student');

-- 2. Allow any authenticated user to read any profile's name + avatar
--    (needed because the leaderboard query joins profiles for full_name)
create policy "profiles: all authenticated users can select for leaderboard"
  on profiles for select
  using (auth.uid() is not null);
