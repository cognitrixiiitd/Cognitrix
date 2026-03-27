import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import StatCard from "../components/shared/StatCard";
import CourseCard from "../components/shared/CourseCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import ProfessorDashboardMetrics from "@/components/analytics/ProfessorDashboardMetrics";
import {
  BookOpen,
  Users,
  BarChart3,
  MessageSquare,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ProfessorDashboard() {
  const { user, profile } = useAuth();

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["prof-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("professor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const courseIds = courses.map((c) => c.id);

  const { data: enrollments = [] } = useQuery({
    queryKey: ["prof-enrollments", courseIds.join(",")],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .in("course_id", courseIds);
      if (error) throw error;
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["prof-questions", courseIds.join(",")],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .in("course_id", courseIds)
        .eq("status", "open");
      if (error) throw error;
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  if (loadingCourses) return <LoadingSpinner />;

  const totalStudents = new Set(enrollments.map((e) => e.student_id)).size;
  const avgCompletion =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce((sum, e) => sum + (e.progress_percent || 0), 0) /
            enrollments.length,
        )
      : 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">
            Welcome back
            {profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here's what's happening with your courses
          </p>
        </div>
        <Link to={createPageUrl("CreateCourse")}>
          <Button className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl gap-2">
            <PlusCircle className="w-4 h-4" />
            New Course
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-100 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg text-xs gap-1">
            <BarChart3 className="w-3 h-3" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Courses"
              value={courses.length}
              icon={BookOpen}
            />
            <StatCard
              title="Total Students"
              value={totalStudents}
              icon={Users}
              color="#6366f1"
            />
            <StatCard
              title="Avg. Completion"
              value={`${avgCompletion}%`}
              icon={TrendingUp}
              color="#f59e0b"
            />
            <StatCard
              title="Open Questions"
              value={questions.length}
              icon={MessageSquare}
              color="#ef4444"
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-black">
                Recent Courses
              </h2>
              <Link
                to={createPageUrl("ProfessorCourses")}
                className="text-sm text-[#00a98d] font-medium hover:underline"
              >
                View all
              </Link>
            </div>
            {courses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description="Create your first course to get started with AI-powered content generation."
                actionLabel="Create Course"
                onAction={() =>
                  (window.location.href = createPageUrl("CreateCourse"))
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.slice(0, 6).map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    showStatus
                    linkTo={`CourseEditor?id=${course.id}`}
                  />
                ))}
              </div>
            )}
          </div>

          {questions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-black mb-4">
                Recent Questions
              </h2>
              <div className="space-y-3">
                {questions.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-black truncate">
                        {q.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        by {q.user_name || "Student"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <ProfessorDashboardMetrics professorId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
