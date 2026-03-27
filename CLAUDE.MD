# Cognitrix — Claude Code Project Guide

## What This Project Is

Cognitrix is an AI-powered learning management system (LMS). It allows professors to create and manage courses, students to enroll and learn, and uses AI to generate quizzes from course material. There is also a knowledge graph and recommendation system for students based on their quiz performance.

The codebase was originally built on Base44 (an AI no-code platform) and is being migrated to a proper production stack. All Base44 code has been copied over but nothing has been migrated yet. The Base44 SDK calls must be replaced with Supabase, and the Base44 AI integration must be replaced with a real AI API.

---

## Current Tech Stack (what it was in Base44)

- React + Vite
- Tailwind CSS
- shadcn/ui component library (in src/components/ui/)
- base44-sdk for all backend, database, auth, and AI calls

## Target Tech Stack (what we are migrating to)

- React + Vite (unchanged)
- Tailwind CSS (unchanged)
- shadcn/ui (unchanged — do not touch src/components/ui/)
- Supabase — database, auth, file storage, real-time
- Vercel — hosting and deployment
- Claude API or OpenAI API — quiz generation (TBD, build abstraction layer)
- GitHub — version control

---

## User Roles

There are three roles in this system. Role is stored in the `profiles` table as an enum.

- **admin** — full platform control, manages professors and students
- **professor** — creates and manages courses, views analytics, builds quizzes
- **student** — browses course catalog, enrolls in courses, watches lectures, takes quizzes, earns achievements

---

## File Structure — What Each Part Does

### entities/ — DATABASE SCHEMA

Every file in this folder represents a Supabase table. These define the data models for the entire application. When migrating, read these files first to generate Supabase SQL.

| Entity         | Supabase Table   | Notes                                         |
| -------------- | ---------------- | --------------------------------------------- |
| Course         | courses          | Belongs to a professor                        |
| Lecture        | lectures         | Belongs to a course, has video content        |
| Quiz           | quizzes          | AI-generated, belongs to a lecture or course  |
| Question       | questions        | Individual questions inside a quiz            |
| Enrollment     | enrollments      | Junction: student ↔ course                    |
| StudentStats   | student_stats    | Feeds the knowledge graph and recommendations |
| LearningPath   | learning_paths   | Ordered sequence of courses                   |
| Achievement    | achievements     | Gamification badges earned by students        |
| Bookmark       | bookmarks        | Student saved moments in lectures             |
| AnalyticsEvent | analytics_events | Tracks all user behaviour events              |
| CourseRevision | course_revisions | Version history for course content            |

One additional table not in entities — must be created manually:

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('admin', 'professor', 'student')),
  avatar_url text,
  created_at timestamp with time zone default now()
);
```

### src/api/base44Client.js — REPLACE THIS FIRST

This is the single file that connects to Base44's servers. Everything else imports from it. Replace with `src/lib/supabaseClient.js`:

```javascript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

### src/lib/AuthContext.jsx — REWRITE AUTH

Currently wraps Base44's auth. Must be rewritten to use Supabase Auth:

- `supabase.auth.signUp()` for registration
- `supabase.auth.signInWithPassword()` for login
- `supabase.auth.onAuthStateChange()` for session tracking
- After login, fetch the user's profile from the `profiles` table to get their role
- Expose: `user`, `profile`, `role`, `loading`, `signIn`, `signOut`, `signUp`

### src/components/ui/ — DO NOT TOUCH

This entire folder is the shadcn/ui library. It has zero Base44 dependency. Copy as-is, never edit.

### src/pages/ — PARTIAL REWRITE

UI code in these files stays the same. Only the data fetching at the top of each file changes. Replace all base44-sdk calls with Supabase queries.

Priority order for migrating pages:

1. CourseCatalog.jsx — core student entry point
2. CourseDetail.jsx — course info + enrollment
3. CoursePlayer.jsx — video player + quiz, the core feature
4. ProfessorDashboard.jsx — professor home
5. CreateCourse.jsx + CourseEditor.jsx — content creation
6. StudentDashboard.jsx
7. Everything else

### src/components/ — MOSTLY KEEP, SOME REWRITE

Pure UI components (keep as-is, just pass Supabase data as props):

- CourseCard, EmptyState, LoadingSpinner, StatCard
- AchievementBadge, AchievementNotification, Leaderboard
- BookmarkList, BookmarkButton, PlayerSidebar, VideoNotes
- LectureForm, CourseHistory, BulkLectureActions, VideoSegmentBuilder, ManualQuizBuilder

Must rewrite (have Base44 dependencies):

- **AIGeneratePanel.jsx** — calls Base44's built-in AI. Rewrite to call Claude/OpenAI API
- **QuizModule.jsx** — fetches quiz data from Base44. Redirect to Supabase
- **RecommendedCourses.jsx** — recommendation logic. Rewrite using StudentStats from Supabase
- **EngagementInsights.jsx** — analytics fetch. Redirect to analytics_events table
- **ProfessorDashboardMetrics.jsx** — metrics fetch. Redirect to Supabase
- **QuizAnalysis.jsx** — quiz data fetch. Redirect to Supabase
- **SentimentAnalysis.jsx** — may use Base44 AI. Evaluate and rewrite

---

## AI Features — Quiz Generation

The quiz generation previously used Base44's built-in AI. This must be rebuilt.

Build an abstraction layer so we can switch between Claude and OpenAI easily:

```javascript
// src/lib/aiClient.js
export async function generateQuiz(lectureContent, numQuestions = 10) {
  // Call Claude API or OpenAI API here
  // Return array of { question, options: [A,B,C,D], correct_answer, explanation }
}
```

The quiz flow is:

1. Professor uploads or pastes lecture content
2. AIGeneratePanel calls generateQuiz()
3. Returns questions as JSON
4. Questions are saved to Supabase quizzes + questions tables
5. Students see the quiz in QuizModule

---

## Knowledge Graph + Recommendations

Currently unbuilt on the new stack. The logic should be:

- Track every quiz attempt in a `quiz_attempts` table (student_id, quiz_id, score, answers JSON, created_at)
- Tag each question with a topic (add topic field to questions table)
- Calculate mastery per topic per student: average score across all questions for that topic
- Store in student_stats table
- RecommendedCourses reads student_stats and surfaces courses covering low-mastery topics

Start simple — no ML needed. Pure SQL aggregation works for v1.

---

## Environment Variables Required

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_AI_API_KEY=
```

Never commit these. They are in .env which is in .gitignore.

---

## Migration Order — Follow This Exactly

1. **Set up Supabase project** — create all tables from entities/ folder
2. **Create supabaseClient.js** — replaces base44Client.js
3. **Rewrite AuthContext.jsx** — Supabase Auth with role fetching
4. **Migrate pages one by one** — start with CourseCatalog, then CourseDetail, then CoursePlayer
5. **Rewrite AIGeneratePanel.jsx** — connect to real AI API
6. **Rewrite analytics components** — point to analytics_events table
7. **Build quiz_attempts tracking** — foundation for knowledge graph
8. **Build RecommendedCourses logic** — using student_stats data
9. **Deploy to Vercel** — connect GitHub repo, add env vars

---

## What Base44 SDK Calls Look Like (and their Supabase equivalents)

When you see Base44 code, here is how to translate it:

```javascript
// Base44 → fetch all courses
base44.entities.Course.list();
// Supabase equivalent
supabase.from("courses").select("*");

// Base44 → fetch one course
base44.entities.Course.get(id);
// Supabase equivalent
supabase.from("courses").select("*").eq("id", id).single();

// Base44 → create a course
base44.entities.Course.create({ title, description });
// Supabase equivalent
supabase.from("courses").insert({ title, description, professor_id: user.id });

// Base44 → update a course
base44.entities.Course.update(id, { title });
// Supabase equivalent
supabase.from("courses").update({ title }).eq("id", id);

// Base44 → delete
base44.entities.Course.delete(id);
// Supabase equivalent
supabase.from("courses").delete().eq("id", id);

// Base44 → filter
base44.entities.Course.filter("professor_id", "eq", userId);
// Supabase equivalent
supabase.from("courses").select("*").eq("professor_id", userId);
```

---

## Important Constraints

- This is a real academic platform — data integrity matters. Always use foreign keys and RLS (Row Level Security) in Supabase
- Professors should only see their own courses in the editor
- Students should only see enrolled course content
- Admin can see everything
- The project has approximately 1 month deadline — prioritise working core flow over perfect code
- The shadcn/ui components in src/components/ui/ must never be modified

---

## Row Level Security (RLS) Policies Needed in Supabase

Enable RLS on every table. Minimum policies required:

- **courses** — professors can CRUD their own courses, students can SELECT published courses
- **lectures** — same as courses
- **enrollments** — students can INSERT their own enrollment, SELECT their own enrollments
- **quizzes** — professors can CRUD quizzes for their courses, students can SELECT
- **quiz_attempts** — students can INSERT and SELECT their own attempts only
- **profiles** — users can SELECT and UPDATE their own profile only
- **student_stats** — students read their own, professors read their students'

---

## Current Status

- Codebase copied from Base44 into local VS Code
- Pushed to GitHub at github.com/slash0403/Cognitrix (transferred to professor's account)
- No migration done yet — all Base44 SDK calls still intact
- Supabase project not yet created
- Next step: create Supabase project and run table creation SQL
