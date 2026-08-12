-- ================================================================
-- EMERGENCY FIX: Restore lecture visibility for professors
-- Run this in Supabase SQL Editor immediately
-- ================================================================

-- Step 1: Drop ALL existing lecture professor policies (clean slate)
DROP POLICY IF EXISTS "lectures: professors full access on own courses" ON public.lectures;
DROP POLICY IF EXISTS "lectures: professors can read own courses" ON public.lectures;
DROP POLICY IF EXISTS "lectures: professors can write own courses" ON public.lectures;

-- Step 2: Separate SELECT and write policies (more reliable than FOR ALL)

-- SELECT: professor owns the course OR is a collaborator
CREATE POLICY "lectures: professor select"
  ON public.lectures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lectures.course_id
        AND courses.professor_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM course_collaborators
      WHERE course_collaborators.course_id = lectures.course_id
        AND course_collaborators.professor_id = auth.uid()
    )
  );

-- INSERT: professor owns the course OR is a collaborator
CREATE POLICY "lectures: professor insert"
  ON public.lectures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lectures.course_id
        AND courses.professor_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM course_collaborators
      WHERE course_collaborators.course_id = lectures.course_id
        AND course_collaborators.professor_id = auth.uid()
    )
  );

-- UPDATE: professor owns the course OR is a collaborator
CREATE POLICY "lectures: professor update"
  ON public.lectures FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lectures.course_id
        AND courses.professor_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM course_collaborators
      WHERE course_collaborators.course_id = lectures.course_id
        AND course_collaborators.professor_id = auth.uid()
    )
  );

-- DELETE: professor owns the course OR is a collaborator
CREATE POLICY "lectures: professor delete"
  ON public.lectures FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lectures.course_id
        AND courses.professor_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM course_collaborators
      WHERE course_collaborators.course_id = lectures.course_id
        AND course_collaborators.professor_id = auth.uid()
    )
  );

-- ================================================================
-- Step 3: Verify your lectures still exist (run this separately)
-- If you see rows, the data is intact — only visibility was broken
-- ================================================================
-- SELECT count(*) FROM lectures;
-- SELECT id, title, course_id FROM lectures LIMIT 20;
