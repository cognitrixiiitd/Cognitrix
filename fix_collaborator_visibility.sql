-- ============================================================
-- COMPLETE COLLABORATOR & INVITATION RLS FIX
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure status column exists on course_collaborators
ALTER TABLE public.course_collaborators
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'accepted', 'rejected'));

-- 2. Helper function: is_course_collaborator (allows pending & accepted to read course metadata)
CREATE OR REPLACE FUNCTION public.is_course_collaborator(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_collaborators
    WHERE course_id = p_course_id
      AND professor_id = auth.uid()
      AND status IN ('pending', 'accepted')
  );
$$;

-- 3. Helper function: is_accepted_collaborator (ONLY accepted collaborators can edit content)
CREATE OR REPLACE FUNCTION public.is_accepted_collaborator(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_collaborators
    WHERE course_id = p_course_id
      AND professor_id = auth.uid()
      AND status = 'accepted'
  );
$$;

-- 4. Courses SELECT policy for collaborators (allows reading metadata for pending & accepted)
DROP POLICY IF EXISTS "courses: collaborators can select shared" ON public.courses;
CREATE POLICY "courses: collaborators can select shared"
  ON public.courses FOR SELECT
  USING (public.is_course_collaborator(id));

-- 5. Lectures policy for collaborators (accepted only)
DROP POLICY IF EXISTS "lectures: professors full access on own courses" ON public.lectures;
DROP POLICY IF EXISTS "lectures: professors and collaborators full access" ON public.lectures;
CREATE POLICY "lectures: professors and collaborators full access"
  ON public.lectures FOR ALL
  USING (
    (public.get_user_role() = 'professor' AND EXISTS (
      SELECT 1 FROM public.courses WHERE id = lectures.course_id AND professor_id = auth.uid()
    ))
    OR public.is_accepted_collaborator(lectures.course_id)
    OR public.get_user_role() = 'admin'
  )
  WITH CHECK (
    (public.get_user_role() = 'professor' AND EXISTS (
      SELECT 1 FROM public.courses WHERE id = lectures.course_id AND professor_id = auth.uid()
    ))
    OR public.is_accepted_collaborator(lectures.course_id)
    OR public.get_user_role() = 'admin'
  );

-- 6. RLS Policies for course_collaborators
DROP POLICY IF EXISTS "Read collaborators" ON public.course_collaborators;
CREATE POLICY "Read collaborators"
  ON public.course_collaborators FOR SELECT
  USING (
    professor_id = auth.uid()
    OR added_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid())
    OR public.get_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Collaborator can update own invite status" ON public.course_collaborators;
CREATE POLICY "Collaborator can update own invite status"
  ON public.course_collaborators FOR UPDATE
  USING (professor_id = auth.uid())
  WITH CHECK (professor_id = auth.uid());

DROP POLICY IF EXISTS "Collaborator can delete own invite" ON public.course_collaborators;
CREATE POLICY "Collaborator can delete own invite"
  ON public.course_collaborators FOR DELETE
  USING (professor_id = auth.uid() OR added_by = auth.uid());

-- 7. Accept Course Invitation RPC
CREATE OR REPLACE FUNCTION public.accept_course_invitation(p_collaboration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.course_collaborators
    SET status = 'accepted'
    WHERE id = p_collaboration_id
      AND professor_id = auth.uid()
      AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found or already processed';
    END IF;
END;
$$;

-- 8. Decline Course Invitation RPC
CREATE OR REPLACE FUNCTION public.decline_course_invitation(p_collaboration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    DELETE FROM public.course_collaborators
    WHERE id = p_collaboration_id
      AND professor_id = auth.uid()
      AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found or already processed';
    END IF;
END;
$$;

-- 9. Get Pending Invitations RPC (returns table with course title and professor name)
CREATE OR REPLACE FUNCTION public.get_my_pending_invitations()
RETURNS TABLE (
  id uuid,
  course_id uuid,
  status text,
  course_title text,
  professor_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    cc.id,
    cc.course_id,
    cc.status,
    c.title AS course_title,
    c.professor_name
  FROM public.course_collaborators cc
  JOIN public.courses c ON c.id = cc.course_id
  WHERE cc.professor_id = auth.uid()
    AND cc.status = 'pending';
$$;
