-- ================================================================
-- GUARANTEED FIX: Uses a security-definer function to bypass
-- the courses RLS check inside the lecture policy subquery
-- ================================================================

-- Step 1: Drop every possible lecture professor policy
DROP POLICY IF EXISTS "lectures: professors full access on own courses" ON public.lectures;
DROP POLICY IF EXISTS "lectures: professors can read own courses" ON public.lectures;
DROP POLICY IF EXISTS "lectures: professors can write own courses" ON public.lectures;
DROP POLICY IF EXISTS "lectures: professor select" ON public.lectures;
DROP POLICY IF EXISTS "lectures: professor insert" ON public.lectures;
DROP POLICY IF EXISTS "lectures: professor update" ON public.lectures;
DROP POLICY IF EXISTS "lectures: professor delete" ON public.lectures;
DROP POLICY IF EXISTS "lectures: admins full access" ON public.lectures;

-- Step 2: Create a SECURITY DEFINER helper function
-- This runs as the DB owner so it bypasses RLS on the courses table
CREATE OR REPLACE FUNCTION is_lecture_accessible(p_course_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = p_course_id
      AND courses.professor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM course_collaborators
    WHERE course_collaborators.course_id = p_course_id
      AND course_collaborators.professor_id = auth.uid()
  );
$$;

-- Step 3: Recreate policies using the helper function
CREATE POLICY "lectures: professor select"
  ON public.lectures FOR SELECT
  USING (is_lecture_accessible(lectures.course_id));

CREATE POLICY "lectures: professor insert"
  ON public.lectures FOR INSERT
  WITH CHECK (is_lecture_accessible(lectures.course_id));

CREATE POLICY "lectures: professor update"
  ON public.lectures FOR UPDATE
  USING (is_lecture_accessible(lectures.course_id));

CREATE POLICY "lectures: professor delete"
  ON public.lectures FOR DELETE
  USING (is_lecture_accessible(lectures.course_id));

-- Admin policy
CREATE POLICY "lectures: admins full access"
  ON public.lectures FOR ALL
  USING (get_user_role() = 'admin');

-- Step 4: Also fix the courses SELECT policy so professors can see
-- courses they are collaborators on (needed for CourseEditor page)
DROP POLICY IF EXISTS "courses: professors can select own" ON public.courses;

CREATE OR REPLACE FUNCTION is_course_accessible(p_course_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = p_course_id
      AND courses.professor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM course_collaborators
    WHERE course_collaborators.course_id = p_course_id
      AND course_collaborators.professor_id = auth.uid()
  );
$$;

CREATE POLICY "courses: professors can select own"
  ON public.courses FOR SELECT
  USING (
    professor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM course_collaborators
      WHERE course_collaborators.course_id = courses.id
        AND course_collaborators.professor_id = auth.uid()
    )
    OR get_user_role() = 'student' AND status = 'published'
  );
