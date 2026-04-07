import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import StatCard from "@/components/shared/StatCard";
import PageSkeleton from "@/components/shared/PageSkeleton";
import { Users, BookOpen, MessageSquare, TrendingUp, Award, Flag, Clock, BarChart3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ProfessorDashboardMetrics({ professorId }) {
  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["professor-courses", professorId],
    queryFn: async () => { const { data } = await supabase.from("courses").select("id, title, status").eq("professor_id", professorId); return data || []; },
    enabled: !!professorId,
  });

  const courseIds = courses.map(c => c.id);
  const { data: enrollments = [] } = useQuery({
    queryKey: ["prof-enrollments", courseIds.join(",")],
    queryFn: async () => { if (!courseIds.length) return []; const { data } = await supabase.from("enrollments").select("id, course_id, student_id, progress_percent, status").in("course_id", courseIds); return data || []; },
    enabled: courseIds.length > 0,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["prof-questions", courseIds.join(",")],
    queryFn: async () => { if (!courseIds.length) return []; const { data } = await supabase.from("questions").select("id, course_id, is_stuck_flag, user_name, text, created_at").in("course_id", courseIds).order("created_at", { ascending: false }).limit(100); return data || []; },
    enabled: courseIds.length > 0,
  });

  const { data: analytics = [] } = useQuery({
    queryKey: ["prof-analytics", courseIds.join(",")],
    queryFn: async () => { if (!courseIds.length) return []; const { data } = await supabase.from("analytics_events").select("id, course_id, event_type, created_at").in("course_id", courseIds).order("created_at", { ascending: false }).limit(500); return data || []; },
    enabled: courseIds.length > 0,
  });

  if (loadingCourses) return <PageSkeleton variant="dashboard" />;

  const stuckFlags = questions.filter(q => q.is_stuck_flag);
  const totalStudents = new Set(enrollments.map(e => e.student_id)).size;
  const activeStudents = enrollments.filter(e => e.status === "active").length;
  const avgProgress = enrollments.length > 0 ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress_percent || 0), 0) / enrollments.length) : 0;

  const engagementByDate = analytics.reduce((acc, event) => {
    const date = new Date(event.created_at).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1; return acc;
  }, {});
  const chartData = Object.entries(engagementByDate).slice(-7).map(([date, count]) => ({ date, events: count }));

  const coursePerformance = courses.map(course => {
    const courseEnrollments = enrollments.filter(e => e.course_id === course.id);
    const avgCourseProgress = courseEnrollments.length > 0 ? Math.round(courseEnrollments.reduce((sum, e) => sum + (e.progress_percent || 0), 0) / courseEnrollments.length) : 0;
    return { name: course.title.slice(0, 20), students: courseEnrollments.length, progress: avgCourseProgress };
  }).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={totalStudents} icon={Users} color="blue" subtitle={`${activeStudents} active`} />
        <StatCard title="Courses Published" value={courses.filter(c => c.status === "published").length} icon={BookOpen} color="purple" subtitle={`${courses.length} total`} />
        <StatCard title="Avg Progress" value={`${avgProgress}%`} icon={TrendingUp} color="green" />
        <StatCard title="Questions Asked" value={questions.length} icon={MessageSquare} color="orange" subtitle={`${stuckFlags.length} stuck flags`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-black mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" />Engagement (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={200}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="events" stroke="#00a98d" strokeWidth={2} /></LineChart></ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-black mb-4 flex items-center gap-2"><Award className="w-4 h-4" />Course Performance</h3>
          <ResponsiveContainer width="100%" height={200}><BarChart data={coursePerformance}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="progress" fill="#00a98d" /></BarChart></ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-black mb-4 flex items-center gap-2"><Flag className="w-4 h-4 text-orange-500" />Recent Student Flags ({stuckFlags.length})</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {stuckFlags.slice(0, 10).map(flag => {
            const course = courses.find(c => c.id === flag.course_id);
            return (
              <div key={flag.id} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                <Flag className="w-4 h-4 text-orange-500 mt-0.5" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-black">{flag.user_name}</p><p className="text-xs text-gray-600 truncate">{flag.text}</p><p className="text-xs text-gray-400 mt-1">{course?.title || "Unknown Course"}</p></div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(flag.created_at).toLocaleDateString()}</span>
              </div>
            );
          })}
          {stuckFlags.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No stuck flags reported</p>}
        </div>
      </div>
    </div>
  );
}
