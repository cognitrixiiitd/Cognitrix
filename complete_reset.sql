-- ================================================================
-- COMPLETE RESET — restores courses + lectures to original state
-- from schema.sql. Run this entire script in one go.
-- ================================================================

-- ── COURSES: drop every policy that may exist ────────────────────
DROP POLICY IF EXISTS "courses: professors can insert own"        ON public.courses;
DROP POLICY IF EXISTS "courses: professors can select own"        ON public.courses;
DROP POLICY IF EXISTS "courses: professors can update own"        ON public.courses;
DROP POLICY IF EXISTS "courses: professors can delete own"        ON public.courses;
DROP POLICY IF EXISTS "courses: students can select published"    ON public.courses;
DROP POLICY IF EXISTS "courses: admins full access"               ON public.courses;

-- ── COURSES: recreate exactly as in schema.sql ───────────────────
CREATE POLICY "courses: professors can insert own"
  ON public.courses FOR INSERT
  WITH CHECK (auth.uid() = professor_id AND public.get_user_role() = 'professor');

CREATE POLICY "courses: professors can select own"
  ON public.courses FOR SELECT
  USING (auth.uid() = professor_id);

CREATE POLICY "courses: professors can update own"
  ON public.courses FOR UPDATE
  USING (auth.uid() = professor_id AND public.get_user_role() = 'professor');

CREATE POLICY "courses: professors can delete own"
  ON public.courses FOR DELETE
  USING (auth.uid() = professor_id AND public.get_user_role() = 'professor');

CREATE POLICY "courses: students can select published"
  ON public.courses FOR SELECT
  USING (status = 'published' AND public.get_user_role() = 'student');

CREATE POLICY "courses: admins full access"
  ON public.courses FOR ALL
  USING (public.get_user_role() = 'admin');

-- ── LECTURES: drop every policy that may exist ───────────────────
DROP POLICY IF EXISTS "lectures: professors full access on own courses"   ON public.lectures;
DROP POLICY IF EXISTS "lectures: professors can read own courses"         ON public.lectures;
DROP POLICY IF EXISTS "lectures: professors can write own courses"        ON public.lectures;
DROP POLICY IF EXISTS "lectures: professor select"                        ON public.lectures;
DROP POLICY IF EXISTS "lectures: professor insert"                        ON public.lectures;
DROP POLICY IF EXISTS "lectures: professor update"                        ON public.lectures;
DROP POLICY IF EXISTS "lectures: professor delete"                        ON public.lectures;
DROP POLICY IF EXISTS "lectures: admins full access"                      ON public.lectures;
DROP POLICY IF EXISTS "lectures: students can select active if enrolled"  ON public.lectures;

-- ── LECTURES: recreate exactly as in schema.sql ──────────────────
CREATE POLICY "lectures: professors full access on own courses"
  ON public.lectures FOR ALL
  USING (
    public.get_user_role() = 'professor' AND
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lectures.course_id
        AND courses.professor_id = auth.uid()
    )
  );

CREATE POLICY "lectures: admins full access"
  ON public.lectures FOR ALL
  USING (public.get_user_role() = 'admin');

CREATE POLICY "lectures: students can select active if enrolled"
  ON public.lectures FOR SELECT
  USING (
    status = 'active' AND
    public.get_user_role() = 'student' AND
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = lectures.course_id
        AND enrollments.student_id = auth.uid()
        AND enrollments.status != 'dropped'
    )
  );

-- ── VERIFY after running ─────────────────────────────────────────
-- Run these two lines separately to confirm everything is visible:
-- SELECT count(*) FROM courses;
-- SELECT count(*) FROM lectures;
