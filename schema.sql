-- ============================================================
-- Cognitrix — Complete Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
--
-- Table order chosen so no policy references a table that
-- has not yet been created.
-- ============================================================


-- ============================================================
-- 1. TABLE: profiles
-- ============================================================
create table profiles (
  id          uuid references auth.users on delete cascade primary key,
  full_name   text,
  role        text not null check (role in ('admin', 'professor', 'student')),
  avatar_url  text,
  created_at  timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "profiles: users can insert own"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles: users can select own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: users can update own"
  on profiles for update
  using (auth.uid() = id);

-- ============================================================
-- HELPER: role lookup used by RLS policies
-- ============================================================
create or replace function get_user_role()
returns text
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- Now that the function exists, add admin policy
create policy "profiles: admins full access"
  on profiles for all
  using (public.get_user_role() = 'admin');


-- ============================================================
-- 2. TABLE: courses
-- ============================================================
create table courses (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  short_description   text,
  long_description    text,
  category            text check (category in (
                        'computer_science', 'mathematics', 'physics', 'chemistry',
                        'biology', 'engineering', 'business', 'humanities',
                        'social_sciences', 'arts', 'other'
                      )),
  difficulty_level    text default 'beginner'
                        check (difficulty_level in ('beginner', 'intermediate', 'advanced')),
  tags                text[]    default '{}',
  professor_id        uuid not null references profiles(id) on delete cascade,
  professor_name      text,
  instructor_rating   numeric   default 0,
  status              text      default 'draft'
                        check (status in ('draft', 'published', 'archived')),
  learning_outcomes   text[]    default '{}',
  prerequisites       text[]    default '{}',
  estimated_hours     numeric,
  credits             numeric,
  thumbnail_url       text,
  enrollment_count    integer   default 0,
  auto_enroll         boolean   default true,
  created_at          timestamp with time zone default now()
);

alter table courses enable row level security;

create policy "courses: professors can insert own"
  on courses for insert
  with check (auth.uid() = professor_id and public.get_user_role() = 'professor');

create policy "courses: professors can select own"
  on courses for select
  using (auth.uid() = professor_id);

create policy "courses: professors can update own"
  on courses for update
  using (auth.uid() = professor_id and public.get_user_role() = 'professor');

create policy "courses: professors can delete own"
  on courses for delete
  using (auth.uid() = professor_id and public.get_user_role() = 'professor');

create policy "courses: students can select published"
  on courses for select
  using (status = 'published' and public.get_user_role() = 'student');

create policy "courses: admins full access"
  on courses for all
  using (public.get_user_role() = 'admin');

create index courses_professor_id_idx on courses(professor_id);
create index courses_status_idx       on courses(status);


-- ============================================================
-- 3. TABLE: lectures
--    Student enrollment policy deferred until enrollments exists.
-- ============================================================
create table lectures (
  id                        uuid primary key default gen_random_uuid(),
  course_id                 uuid not null references courses(id) on delete cascade,
  section_name              text,
  title                     text not null,
  type                      text not null
                              check (type in ('video', 'youtube', 'pdf', 'slides', 'notes', 'external_link')),
  source_url                text,
  duration_minutes          numeric,
  transcript_text           text,
  topic_timestamps          jsonb   default '[]',
  order_index               integer,
  ai_generated_title        text,
  ai_generated_description  text,
  suggested_resources       jsonb   default '[]',
  attachments               jsonb   default '[]',
  generated_by_ai           boolean default false,
  allow_download            boolean default false,
  status                    text    default 'active'
                              check (status in ('active', 'archived')),
  created_at                timestamp with time zone default now()
);

alter table lectures enable row level security;

create policy "lectures: professors full access on own courses"
  on lectures for all
  using (
    public.get_user_role() = 'professor' and
    exists (
      select 1 from courses
      where courses.id = lectures.course_id
        and courses.professor_id = auth.uid()
    )
  );

create policy "lectures: admins full access"
  on lectures for all
  using (public.get_user_role() = 'admin');

create index lectures_course_id_idx on lectures(course_id);


-- ============================================================
-- 4. TABLE: quizzes
--    Student enrollment policy deferred until enrollments exists.
-- ============================================================
create table quizzes (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references courses(id) on delete cascade,
  lecture_id   uuid references lectures(id) on delete set null,
  title        text not null,
  total_points integer default 10,
  created_at   timestamp with time zone default now()
);

alter table quizzes enable row level security;

create policy "quizzes: professors full access on own courses"
  on quizzes for all
  using (
    public.get_user_role() = 'professor' and
    exists (
      select 1 from courses
      where courses.id = quizzes.course_id
        and courses.professor_id = auth.uid()
    )
  );

create policy "quizzes: admins full access"
  on quizzes for all
  using (public.get_user_role() = 'admin');

create index quizzes_course_id_idx   on quizzes(course_id);
create index quizzes_lecture_id_idx  on quizzes(lecture_id);


-- ============================================================
-- 5. TABLE: quiz_questions
--    Student enrollment policy deferred until enrollments exists.
-- ============================================================
create table quiz_questions (
  id               uuid primary key default gen_random_uuid(),
  quiz_id          uuid not null references quizzes(id) on delete cascade,
  question_type    text default 'multiple_choice'
                     check (question_type in ('multiple_choice', 'fill_in_blank', 'short_answer')),
  question_text    text not null,
  choices          text[]  default '{}',
  correct_index    integer,
  correct_answer   text,
  topic            text,
  source_timestamp text,
  generated_by_ai  boolean default false,
  order_index      integer,
  created_at       timestamp with time zone default now()
);

alter table quiz_questions enable row level security;

create policy "quiz_questions: professors full access on own courses"
  on quiz_questions for all
  using (
    public.get_user_role() = 'professor' and
    exists (
      select 1 from quizzes
      join courses on courses.id = quizzes.course_id
      where quizzes.id = quiz_questions.quiz_id
        and courses.professor_id = auth.uid()
    )
  );

create policy "quiz_questions: admins full access"
  on quiz_questions for all
  using (public.get_user_role() = 'admin');

create index quiz_questions_quiz_id_idx on quiz_questions(quiz_id);


-- ============================================================
-- 6. TABLE: enrollments
-- ============================================================
create table enrollments (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references profiles(id) on delete cascade,
  student_name        text,
  student_email       text,
  course_id           uuid not null references courses(id) on delete cascade,
  course_title        text,
  progress_percent    numeric default 0,
  completed_lectures  text[]  default '{}',
  completed_at        timestamp with time zone,
  last_accessed       timestamp with time zone,
  time_spent_minutes  numeric default 0,
  status              text    default 'active'
                        check (status in ('active', 'completed', 'dropped')),
  created_at          timestamp with time zone default now(),
  unique (student_id, course_id)
);

alter table enrollments enable row level security;

create policy "enrollments: students can insert own"
  on enrollments for insert
  with check (auth.uid() = student_id and public.get_user_role() = 'student');

create policy "enrollments: students can select own"
  on enrollments for select
  using (auth.uid() = student_id);

create policy "enrollments: students can update own progress"
  on enrollments for update
  using (auth.uid() = student_id and public.get_user_role() = 'student');

create policy "enrollments: professors can select for own courses"
  on enrollments for select
  using (
    public.get_user_role() = 'professor' and
    exists (
      select 1 from courses
      where courses.id = enrollments.course_id
        and courses.professor_id = auth.uid()
    )
  );

create policy "enrollments: admins full access"
  on enrollments for all
  using (public.get_user_role() = 'admin');

create index enrollments_student_id_idx on enrollments(student_id);
create index enrollments_course_id_idx  on enrollments(course_id);


-- ============================================================
-- DEFERRED POLICIES: student enrollment checks for tables 3-5
-- enrollments table now exists, safe to reference it.
-- ============================================================

-- lectures: students can read active lectures if enrolled
create policy "lectures: students can select active if enrolled"
  on lectures for select
  using (
    status = 'active' and
    public.get_user_role() = 'student' and
    exists (
      select 1 from enrollments
      where enrollments.course_id = lectures.course_id
        and enrollments.student_id = auth.uid()
        and enrollments.status != 'dropped'
    )
  );

-- quizzes: students can read quizzes if enrolled
create policy "quizzes: students can select if enrolled"
  on quizzes for select
  using (
    public.get_user_role() = 'student' and
    exists (
      select 1 from enrollments
      where enrollments.course_id = quizzes.course_id
        and enrollments.student_id = auth.uid()
        and enrollments.status != 'dropped'
    )
  );

-- quiz_questions: students can read questions if enrolled
create policy "quiz_questions: students can select if enrolled"
  on quiz_questions for select
  using (
    public.get_user_role() = 'student' and
    exists (
      select 1 from quizzes
      join enrollments on enrollments.course_id = quizzes.course_id
      where quizzes.id = quiz_questions.quiz_id
        and enrollments.student_id = auth.uid()
        and enrollments.status != 'dropped'
    )
  );


-- ============================================================
-- 7. TABLE: quiz_attempts
-- ============================================================
create table quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references profiles(id) on delete cascade,
  quiz_id          uuid not null references quizzes(id) on delete cascade,
  quiz_question_id uuid not null references quiz_questions(id) on delete cascade,
  selected_answer  text,
  is_correct       boolean,
  topic            text,
  created_at       timestamp with time zone default now()
);

alter table quiz_attempts enable row level security;

create policy "quiz_attempts: students can insert own"
  on quiz_attempts for insert
  with check (auth.uid() = student_id and public.get_user_role() = 'student');

create policy "quiz_attempts: students can select own"
  on quiz_attempts for select
  using (auth.uid() = student_id);

create policy "quiz_attempts: professors can select for own courses"
  on quiz_attempts for select
  using (
    public.get_user_role() = 'professor' and
    exists (
      select 1 from quizzes
      join courses on courses.id = quizzes.course_id
      where quizzes.id = quiz_attempts.quiz_id
        and courses.professor_id = auth.uid()
    )
  );

create policy "quiz_attempts: admins full access"
  on quiz_attempts for all
  using (public.get_user_role() = 'admin');

create index quiz_attempts_student_id_idx on quiz_attempts(student_id);
create index quiz_attempts_quiz_id_idx    on quiz_attempts(quiz_id);


-- ============================================================
-- 8. TABLE: questions  (Q&A forum posts, NOT quiz questions)
-- ============================================================
create table questions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  user_name         text,
  course_id         uuid not null references courses(id) on delete cascade,
  lecture_id        uuid references lectures(id) on delete set null,
  timestamp_seconds numeric,
  text              text not null,
  status            text default 'open'
                      check (status in ('open', 'answered', 'closed')),
  is_private        boolean default false,
  is_stuck_flag     boolean default false,
  created_at        timestamp with time zone default now()
);

alter table questions enable row level security;

create policy "questions: users can insert own"
  on questions for insert
  with check (auth.uid() = user_id);

create policy "questions: users can select own"
  on questions for select
  using (auth.uid() = user_id);

create policy "questions: non-private visible to enrolled/professors"
  on questions for select
  using (
    is_private = false and (
      exists (
        select 1 from enrollments
        where enrollments.course_id = questions.course_id
          and enrollments.student_id = auth.uid()
      ) or
      exists (
        select 1 from courses
        where courses.id = questions.course_id
          and courses.professor_id = auth.uid()
      )
    )
  );

create policy "questions: professors can update status on own courses"
  on questions for update
  using (
    public.get_user_role() = 'professor' and
    exists (
      select 1 from courses
      where courses.id = questions.course_id
        and courses.professor_id = auth.uid()
    )
  );

create policy "questions: students can update own"
  on questions for update
  using (auth.uid() = user_id and public.get_user_role() = 'student');

create policy "questions: admins full access"
  on questions for all
  using (public.get_user_role() = 'admin');

create index questions_course_id_idx on questions(course_id);
create index questions_user_id_idx   on questions(user_id);


-- ============================================================
-- 9. TABLE: question_answers
-- ============================================================
create table question_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  user_name   text,
  text        text not null,
  created_at  timestamp with time zone default now()
);

alter table question_answers enable row level security;

create policy "question_answers: users can insert own"
  on question_answers for insert
  with check (auth.uid() = user_id);

create policy "question_answers: visible if parent question is visible"
  on question_answers for select
  using (
    exists (
      select 1 from questions
      where questions.id = question_answers.question_id
        and (
          questions.user_id = auth.uid() or
          (
            questions.is_private = false and (
              exists (
                select 1 from enrollments
                where enrollments.course_id = questions.course_id
                  and enrollments.student_id = auth.uid()
              ) or
              exists (
                select 1 from courses
                where courses.id = questions.course_id
                  and courses.professor_id = auth.uid()
              )
            )
          )
        )
    )
  );

create policy "question_answers: users can update own"
  on question_answers for update
  using (auth.uid() = user_id);

create policy "question_answers: admins full access"
  on question_answers for all
  using (public.get_user_role() = 'admin');

create index question_answers_question_id_idx on question_answers(question_id);


-- ============================================================
-- 10. TABLE: student_stats
-- ============================================================
create table student_stats (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles(id) on delete cascade unique,
  total_points         integer default 0,
  courses_completed    integer default 0,
  quizzes_completed    integer default 0,
  perfect_quiz_count   integer default 0,
  current_streak_days  integer default 0,
  longest_streak_days  integer default 0,
  last_active_date     date,
  level                integer default 1,
  created_at           timestamp with time zone default now()
);

alter table student_stats enable row level security;

create policy "student_stats: students can select own"
  on student_stats for select
  using (auth.uid() = user_id);

create policy "student_stats: students can insert own"
  on student_stats for insert
  with check (auth.uid() = user_id);

create policy "student_stats: students can update own"
  on student_stats for update
  using (auth.uid() = user_id);

create policy "student_stats: professors can select for enrolled students"
  on student_stats for select
  using (
    public.get_user_role() = 'professor' and
    exists (
      select 1 from enrollments
      join courses on courses.id = enrollments.course_id
      where enrollments.student_id = student_stats.user_id
        and courses.professor_id = auth.uid()
    )
  );

create policy "student_stats: admins full access"
  on student_stats for all
  using (public.get_user_role() = 'admin');


-- ============================================================
-- 11. TABLE: learning_paths
-- ============================================================
create table learning_paths (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references profiles(id) on delete cascade,
  title            text not null,
  domain           text,
  career_goal      text,
  student_level    text default 'beginner'
                     check (student_level in ('beginner', 'intermediate', 'advanced')),
  steps            jsonb   default '[]',
  confidence_score numeric,
  status           text    default 'active'
                     check (status in ('active', 'completed', 'paused')),
  progress_percent numeric default 0,
  created_at       timestamp with time zone default now()
);

alter table learning_paths enable row level security;

create policy "learning_paths: students manage own"
  on learning_paths for all
  using (auth.uid() = student_id);

create policy "learning_paths: admins full access"
  on learning_paths for all
  using (public.get_user_role() = 'admin');

create index learning_paths_student_id_idx on learning_paths(student_id);


-- ============================================================
-- 12. TABLE: achievements
-- ============================================================
create table achievements (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles(id) on delete cascade,
  course_id          uuid references courses(id) on delete set null,
  achievement_type   text not null check (achievement_type in (
                       'first_course', 'course_completed', 'quiz_ace', 'perfect_score',
                       'fast_learner', 'question_master', 'bookmark_king',
                       'week_streak', 'month_streak', 'topic_master'
                     )),
  badge_name         text not null,
  badge_description  text,
  badge_icon         text,
  points_awarded     integer default 0,
  metadata           jsonb   default '{}',
  created_at         timestamp with time zone default now()
);

alter table achievements enable row level security;

create policy "achievements: students can insert own"
  on achievements for insert
  with check (auth.uid() = user_id);

create policy "achievements: students can select own"
  on achievements for select
  using (auth.uid() = user_id);

create policy "achievements: admins full access"
  on achievements for all
  using (public.get_user_role() = 'admin');

create index achievements_user_id_idx on achievements(user_id);


-- ============================================================
-- 13. TABLE: bookmarks
-- ============================================================
create table bookmarks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  course_id         uuid not null references courses(id) on delete cascade,
  lecture_id        uuid not null references lectures(id) on delete cascade,
  timestamp_seconds numeric default 0,
  note              text,
  created_at        timestamp with time zone default now()
);

alter table bookmarks enable row level security;

create policy "bookmarks: students manage own"
  on bookmarks for all
  using (auth.uid() = user_id);

create policy "bookmarks: admins full access"
  on bookmarks for all
  using (public.get_user_role() = 'admin');

create index bookmarks_user_id_idx    on bookmarks(user_id);
create index bookmarks_lecture_id_idx on bookmarks(lecture_id);


-- ============================================================
-- 14. TABLE: analytics_events
-- ============================================================
create table analytics_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  course_id         uuid references courses(id) on delete set null,
  lecture_id        uuid references lectures(id) on delete set null,
  event_type        text not null check (event_type in (
                      'play', 'pause', 'complete', 'quiz_submit',
                      'flag_stuck', 'enroll', 'question_asked', 'bookmark'
                    )),
  timestamp_seconds numeric,
  meta              jsonb default '{}',
  created_at        timestamp with time zone default now()
);

alter table analytics_events enable row level security;

create policy "analytics_events: users can insert own"
  on analytics_events for insert
  with check (auth.uid() = user_id);

create policy "analytics_events: users can select own"
  on analytics_events for select
  using (auth.uid() = user_id);

create policy "analytics_events: professors can select for own courses"
  on analytics_events for select
  using (
    public.get_user_role() = 'professor' and
    exists (
      select 1 from courses
      where courses.id = analytics_events.course_id
        and courses.professor_id = auth.uid()
    )
  );

create policy "analytics_events: admins full access"
  on analytics_events for all
  using (public.get_user_role() = 'admin');

create index analytics_events_user_id_idx   on analytics_events(user_id);
create index analytics_events_course_id_idx on analytics_events(course_id);


-- ============================================================
-- 15. TABLE: course_revisions
-- ============================================================
create table course_revisions (
  id                  uuid primary key default gen_random_uuid(),
  course_id           uuid not null references courses(id) on delete cascade,
  revision_number     integer not null,
  changed_by_user_id  uuid not null references profiles(id) on delete cascade,
  change_type         text not null check (change_type in (
                        'ai_generated', 'manual_edit', 'lecture_added',
                        'lecture_deleted', 'quiz_generated'
                      )),
  change_description  text,
  snapshot_data       jsonb default '{}',
  created_at          timestamp with time zone default now()
);

alter table course_revisions enable row level security;

create policy "course_revisions: professors manage for own courses"
  on course_revisions for all
  using (
    public.get_user_role() = 'professor' and
    exists (
      select 1 from courses
      where courses.id = course_revisions.course_id
        and courses.professor_id = auth.uid()
    )
  );

create policy "course_revisions: admins full access"
  on course_revisions for all
  using (public.get_user_role() = 'admin');

create index course_revisions_course_id_idx on course_revisions(course_id);


-- ============================================================
-- TRIGGER: auto-create student_stats row on profile insert
-- ============================================================
create or replace function handle_new_student_profile()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role = 'student' then
    insert into student_stats (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_student_profile_created
  after insert on profiles
  for each row
  execute function handle_new_student_profile();
