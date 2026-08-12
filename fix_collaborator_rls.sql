-- Fix: Allow collaborators to also access lectures on courses they collaborate on

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "lectures: professors full access on own courses" ON public.lectures;

-- Re-create it to include collaborators
CREATE POLICY "lectures: professors full access on own courses"
  ON public.lectures FOR ALL
  USING (
    public.get_user_role() = 'professor' AND (
      -- Course owner
      EXISTS (
        SELECT 1 FROM courses
        WHERE courses.id = lectures.course_id
          AND courses.professor_id = auth.uid()
      )
      OR
      -- Collaborator
      EXISTS (
        SELECT 1 FROM course_collaborators
        WHERE course_collaborators.course_id = lectures.course_id
          AND course_collaborators.professor_id = auth.uid()
      )
    )
  );

-- Also fix course_revisions so collaborators can log revisions
DROP POLICY IF EXISTS "course_revisions: professors manage for own courses" ON public.course_revisions;

CREATE POLICY "course_revisions: professors manage for own courses"
  ON public.course_revisions FOR ALL
  USING (
    public.get_user_role() = 'professor' AND (
      EXISTS (
        SELECT 1 FROM courses
        WHERE courses.id = course_revisions.course_id
          AND courses.professor_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM course_collaborators
        WHERE course_collaborators.course_id = course_revisions.course_id
          AND course_collaborators.professor_id = auth.uid()
      )
    )
  );

-- Also fix quizzes so collaborators can manage them
DROP POLICY IF EXISTS "quizzes: professors full access on own courses" ON public.quizzes;

CREATE POLICY "quizzes: professors full access on own courses"
  ON public.quizzes FOR ALL
  USING (
    public.get_user_role() = 'professor' AND (
      EXISTS (
        SELECT 1 FROM courses
        WHERE courses.id = quizzes.course_id
          AND courses.professor_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM course_collaborators
        WHERE course_collaborators.course_id = quizzes.course_id
          AND course_collaborators.professor_id = auth.uid()
      )
    )
  );
