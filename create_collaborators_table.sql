-- Create the course_collaborators table
CREATE TABLE IF NOT EXISTS public.course_collaborators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, professor_id)
);

-- Enable Row Level Security
ALTER TABLE public.course_collaborators ENABLE ROW LEVEL SECURITY;

-- Allow course owners and existing collaborators to read the list
CREATE POLICY "Read collaborators" ON public.course_collaborators
  FOR SELECT USING (
    auth.uid() IN (
      SELECT professor_id FROM public.courses WHERE id = course_id
      UNION
      SELECT professor_id FROM public.course_collaborators cc2 WHERE cc2.course_id = course_collaborators.course_id
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only the course owner (or admin) can add collaborators
CREATE POLICY "Owner can add collaborators" ON public.course_collaborators
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT professor_id FROM public.courses WHERE id = course_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only the course owner (or admin) can remove collaborators
CREATE POLICY "Owner can delete collaborators" ON public.course_collaborators
  FOR DELETE USING (
    auth.uid() IN (SELECT professor_id FROM public.courses WHERE id = course_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
