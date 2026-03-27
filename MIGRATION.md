Project: Cognitrix — AI-powered LMS
What it is: A learning management system where professors create courses with AI-generated quizzes, and students learn, take quizzes, and earn achievements.

Current state: Fully built on Base44 (a no-code platform). Every database call, auth call, and AI call goes through the Base44 SDK. Nothing has been migrated yet.

Goal: Migrate to a proper production stack — Supabase (database + auth) + Claude/OpenAI API + Vercel.

What Needs to Change

1. Infrastructure / Config (create new)
   Create src/lib/supabaseClient.js — replaces src/api/base44Client.js
   Create src/lib/aiClient.js — abstraction layer for Claude/OpenAI quiz generation
   Create .env file with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_AI_API_KEY
   Update vite.config.js — remove @base44/vite-plugin, add nothing (standard React Vite)
   Update package.json — remove @base44/sdk and @base44/vite-plugin, add @supabase/supabase-js
2. Database (create from scratch in Supabase)
   Generate SQL from the 11 entity files in entities/:

courses, lectures, quizzes, questions, enrollments, student_stats, learning_paths, achievements, bookmarks, analytics_events, course_revisions
Plus profiles (not in entities — already specified in CLAUDE.md)
Plus quiz_attempts (new table for knowledge graph — not yet built)
Enable RLS on all tables with role-based policies (professor sees own courses, student sees enrolled content, etc.) 3. Auth — Full Rewrite
src/lib/AuthContext.jsx — rewrite to use supabase.auth.signUp/signInWithPassword/onAuthStateChange
After login, fetch from profiles table to get user's role
Expose: user, profile, role, loading, signIn, signOut, signUp 4. Navigation & Lib Files
src/lib/NavigationTracker.jsx — remove Base44 logging, either delete or replace with Supabase analytics insert
src/lib/app-params.js — delete entirely (Base44-specific)
src/Layout.jsx — replace base44.auth.me() and base44.auth.logout() with Supabase equivalents 5. Pages — All 14 Need Data Layer Rewrite
The UI/JSX stays the same. Only the data fetching at the top changes. Priority order from CLAUDE.md:

Priority File What changes
1 CourseCatalog.jsx base44.entities.Course.filter() → supabase.from("courses").select()
2 CourseDetail.jsx Course fetch + Enrollment.create() → Supabase insert
3 CoursePlayer.jsx Most complex — quiz, bookmarks, analytics, achievements, StudentStats
4 ProfessorDashboard.jsx Multi-entity aggregation → Supabase joins
5 CreateCourse.jsx + CourseEditor.jsx Course/Lecture/Quiz creation → Supabase inserts
6 StudentDashboard.jsx Stats + enrolled courses → Supabase queries
7 Remaining 8 pages Analytics, Achievements, LearningPaths, etc. 6. Components — 7 Need Rewrites
AIGeneratePanel.jsx — replace base44.integrations.Core.InvokeLLM() with aiClient.generateQuiz()
QuizModule.jsx — replace StudentStats/Achievement/AnalyticsEvent updates with Supabase
RecommendedCourses.jsx — rewrite using student_stats from Supabase
EngagementInsights.jsx — point to analytics_events table
ProfessorDashboardMetrics.jsx — point to Supabase
QuizAnalysis.jsx — point to Supabase
SentimentAnalysis.jsx — evaluate and rewrite (may use Base44 AI) 7. What Stays Untouched
All 27 files in src/components/ui/ (shadcn/ui — zero Base44 deps)
All pure UI components: CourseCard, EmptyState, LoadingSpinner, StatCard, all player UI, all course editor UI
Tailwind CSS config
React Router setup
React Query setup
Key Issues Found Beyond Migration
Role naming bug — Layout.jsx checks user?.role === "admin" to identify professors. But the system has 3 separate roles (admin/professor/student). This needs fixing.
Quiz data model — Quiz scores are embedded inside Enrollment.quiz_scores array instead of a separate quiz_attempts table. Needs to change for the knowledge graph to work.
Knowledge graph unbuilt — The recommendation system requires a quiz_attempts table + topic tagging on questions + SQL aggregation for mastery. None of this exists yet.
No pagination — All queries fetch everything. Will need limits added.
