import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import StatCard from "../components/shared/StatCard";
import CourseCard from "../components/shared/CourseCard";
import PageSkeleton from "../components/shared/PageSkeleton";
import EmptyState from "../components/shared/EmptyState";
import ProfessorDashboardMetrics from "@/components/analytics/ProfessorDashboardMetrics";
import {
  BookOpen, Users, BarChart3, MessageSquare, PlusCircle, TrendingUp,
  CheckCircle2, XCircle, Loader2, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

export default function ProfessorDashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["prof-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, status, thumbnail_url, created_at, enrollment_count")
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
        .select("id, course_id, student_id, progress_percent")
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
        .select("id, text, user_name, course_id, status")
        .in("course_id", courseIds)
        .eq("status", "open");
      if (error) throw error;
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  // Fix 5: Fetch pending enrollment requests for professor's courses
  const { data: enrollmentRequests = [] } = useQuery({
    queryKey: ["prof-enrollment-requests", courseIds.join(",")],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("enrollment_requests")
        .select("id, student_id, course_id, status, message, created_at, courses(title), profiles(full_name, email)")
        .in("course_id", courseIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  if (loadingCourses) return <PageSkeleton variant="dashboard" />;

  const totalStudents = new Set(enrollments.map((e) => e.student_id)).size;
  const avgCompletion =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce((sum, e) => sum + (e.progress_percent || 0), 0) /
            enrollments.length,
        )
      : 0;
  const pendingCount = enrollmentRequests.length;

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
          <TabsTrigger value="requests" className="rounded-lg text-xs gap-1">
            <UserPlus className="w-3 h-3" />
            Enrollment Requests
            {pendingCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg text-xs gap-1">
            <BarChart3 className="w-3 h-3" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Courses" value={courses.length} icon={BookOpen} />
            <StatCard title="Total Students" value={totalStudents} icon={Users} color="#6366f1" />
            <StatCard title="Avg. Completion" value={`${avgCompletion}%`} icon={TrendingUp} color="#f59e0b" />
            <StatCard title="Open Questions" value={questions.length} icon={MessageSquare} color="#ef4444" />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-black">Recent Courses</h2>
              <Link to={createPageUrl("ProfessorCourses")} className="text-sm text-[#00a98d] font-medium hover:underline">
                View all
              </Link>
            </div>
            {courses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description="Create your first course to get started with AI-powered content generation."
                actionLabel="Create Course"
                onAction={() => (window.location.href = createPageUrl("CreateCourse"))}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.slice(0, 6).map((course) => (
                  <CourseCard key={course.id} course={course} showStatus linkTo={`CourseEditor?id=${course.id}`} />
                ))}
              </div>
            )}
          </div>

          {questions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-black mb-4">Recent Questions</h2>
              <div className="space-y-3">
                {questions.slice(0, 5).map((q) => (
                  <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-black truncate">{q.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">by {q.user_name || "Student"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Fix 5: Enrollment Requests Tab */}
        <TabsContent value="requests">
          <EnrollmentRequestsTab
            requests={enrollmentRequests}
            toast={toast}
            queryClient={queryClient}
            courseIds={courseIds}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <ProfessorDashboardMetrics professorId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Fix 5: Enrollment Requests sub-component
function EnrollmentRequestsTab({ requests, toast, queryClient, courseIds }) {
  const [processingId, setProcessingId] = useState(null);

  const handleApproveEnrollment = async (request) => {
    setProcessingId(request.id);
    try {
      // Create the actual enrollment
      const { error: enrollError } = await supabase.from("enrollments").insert({
        student_id: request.student_id,
        course_id: request.course_id,
        course_title: request.courses?.title || "",
        student_name: request.profiles?.full_name || "",
        student_email: request.profiles?.email || "",
        status: "active",
        progress_percent: 0,
        completed_lectures: [],
        time_spent_minutes: 0,
      });
      if (enrollError) throw enrollError;

      // Update request status
      const { error: updateError } = await supabase
        .from("enrollment_requests")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", request.id);
      if (updateError) throw updateError;

      toast({ title: "Student enrolled", description: `${request.profiles?.full_name || "Student"} has been enrolled successfully.` });
      queryClient.invalidateQueries({ queryKey: ["prof-enrollment-requests", courseIds.join(",")] });
      queryClient.invalidateQueries({ queryKey: ["prof-enrollments"] });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectEnrollment = async (request) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from("enrollment_requests")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", request.id);
      if (error) throw error;

      toast({ title: "Request rejected", description: "Enrollment request has been rejected." });
      queryClient.invalidateQueries({ queryKey: ["prof-enrollment-requests", courseIds.join(",")] });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="No pending requests"
        description="When students request to enroll in your courses, they will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{requests.length} pending enrollment request{requests.length !== 1 ? "s" : ""}</p>
      {requests.map((req) => (
        <div key={req.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-[#00a98d]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-[#00a98d]">
                {(req.profiles?.full_name || "?")[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-black truncate">{req.profiles?.full_name || "Student"}</p>
              <p className="text-xs text-gray-500 truncate">
                wants to enroll in <span className="font-medium text-gray-700">{req.courses?.title || "a course"}</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {new Date(req.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              disabled={processingId === req.id}
              onClick={() => handleApproveEnrollment(req)}
            >
              {processingId === req.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
              disabled={processingId === req.id}
              onClick={() => handleRejectEnrollment(req)}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
