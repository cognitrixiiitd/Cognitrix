import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import StatCard from "../components/shared/StatCard";
import CourseCard from "../components/shared/CourseCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import RecommendedCourses from "@/components/learning/RecommendedCourses";
import { BookOpen, GraduationCap, BarChart3, Clock, TrendingUp } from "lucide-react";

export default function StudentDashboard() {
  const { user, profile } = useAuth();

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["student-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("*").eq("student_id", user.id).order("last_accessed", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const courseIds = enrollments.map((e) => e.course_id);
  const { data: courses = [] } = useQuery({
    queryKey: ["student-courses", courseIds.join(",")],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase.from("courses").select("*").in("id", courseIds);
      if (error) throw error;
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  const { data: learningPaths = [] } = useQuery({
    queryKey: ["student-paths", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_paths").select("*").eq("student_id", user.id).eq("status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (isLoading) return <LoadingSpinner />;

  const activeCourses = enrollments.filter((e) => e.status === "active");
  const completedCourses = enrollments.filter((e) => e.status === "completed");
  const totalTime = enrollments.reduce((s, e) => s + (e.time_spent_minutes || 0), 0);
  const avgProgress = activeCourses.length > 0 ? Math.round(activeCourses.reduce((s, e) => s + (e.progress_percent || 0), 0) / activeCourses.length) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-black tracking-tight">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
        <p className="text-sm text-gray-500 mt-1">Continue your learning journey</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Enrolled Courses" value={enrollments.length} icon={BookOpen} />
        <StatCard title="Completed" value={completedCourses.length} icon={GraduationCap} color="#10b981" />
        <StatCard title="Avg. Progress" value={`${avgProgress}%`} icon={TrendingUp} color="#6366f1" />
        <StatCard title="Time Spent" value={`${Math.round(totalTime / 60)}h`} icon={Clock} color="#f59e0b" />
      </div>

      {activeCourses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-black mb-4">Continue Learning</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCourses.slice(0, 6).map((enrollment) => {
              const course = courses.find((c) => c.id === enrollment.course_id);
              if (!course) return null;
              return <CourseCard key={course.id} course={course} linkTo={`CoursePlayer?id=${course.id}`} progress={enrollment.progress_percent} />;
            })}
          </div>
        </div>
      )}

      {enrollments.length === 0 && (
        <EmptyState icon={BookOpen} title="No courses yet" description="Browse the course catalog to find courses to enroll in." actionLabel="Browse Courses" onAction={() => (window.location.href = createPageUrl("CourseCatalog"))} />
      )}

      {user && <RecommendedCourses userId={user.id} enrolledCourseIds={courseIds} />}
    </div>
  );
}
