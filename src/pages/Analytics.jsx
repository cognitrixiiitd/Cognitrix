import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import PageSkeleton from "../components/shared/PageSkeleton";
import StatCard from "../components/shared/StatCard";
import EngagementInsights from "@/components/analytics/EngagementInsights";
import QuizAnalysis from "@/components/analytics/QuizAnalysis";
import SentimentAnalysis from "@/components/analytics/SentimentAnalysis";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, Flag, Download, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#00a98d", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Analytics() {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState("all");

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["analytics-courses", user?.id],
    queryFn: async () => { const { data } = await supabase.from("courses").select("id, title").eq("professor_id", user.id); return data || []; },
    enabled: !!user?.id,
  });

  const courseIds = courses.map(c => c.id);
  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ["analytics-enrollments", courseIds.join(",")],
    queryFn: async () => { if (!courseIds.length) return []; const { data } = await supabase.from("enrollments").select("id, course_id, student_id, student_name, student_email, progress_percent, status, time_spent_minutes, quiz_scores").in("course_id", courseIds); return data || []; },
    enabled: courseIds.length > 0,
  });

  const { data: stuckFlags = [] } = useQuery({
    queryKey: ["analytics-stuck", courseIds.join(",")],
    queryFn: async () => { if (!courseIds.length) return []; const { data } = await supabase.from("questions").select("id, course_id").in("course_id", courseIds).eq("is_stuck_flag", true); return data || []; },
    enabled: courseIds.length > 0,
  });

  const { data: lectures = [] } = useQuery({
    queryKey: ["analytics-lectures", courseIds.join(",")],
    queryFn: async () => { if (!courseIds.length) return []; const { data } = await supabase.from("lectures").select("id, course_id, title").in("course_id", courseIds); return data || []; },
    enabled: courseIds.length > 0,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["analytics-questions", courseIds.join(",")],
    queryFn: async () => { if (!courseIds.length) return []; const { data } = await supabase.from("questions").select("id, course_id, text, user_name, created_at").in("course_id", courseIds).eq("is_stuck_flag", false); return data || []; },
    enabled: courseIds.length > 0,
  });

  if (loadingCourses || loadingEnrollments) return <PageSkeleton variant="dashboard" />;

  const filteredEnrollments = selectedCourse === "all" ? enrollments : enrollments.filter(e => e.course_id === selectedCourse);
  const totalStudents = new Set(filteredEnrollments.map(e => e.student_id)).size;
  const avgCompletion = filteredEnrollments.length > 0 ? Math.round(filteredEnrollments.reduce((s, e) => s + (e.progress_percent || 0), 0) / filteredEnrollments.length) : 0;
  const completedCount = filteredEnrollments.filter(e => e.status === "completed").length;

  const courseEnrollmentData = courses.map(c => ({
    name: c.title.length > 20 ? c.title.slice(0, 20) + "..." : c.title,
    students: enrollments.filter(e => e.course_id === c.id).length,
    completion: enrollments.filter(e => e.course_id === c.id && e.status === "completed").length,
  }));

  const completionDistribution = [
    { name: "0-25%", value: filteredEnrollments.filter(e => (e.progress_percent || 0) <= 25).length },
    { name: "26-50%", value: filteredEnrollments.filter(e => (e.progress_percent || 0) > 25 && (e.progress_percent || 0) <= 50).length },
    { name: "51-75%", value: filteredEnrollments.filter(e => (e.progress_percent || 0) > 50 && (e.progress_percent || 0) <= 75).length },
    { name: "76-100%", value: filteredEnrollments.filter(e => (e.progress_percent || 0) > 75).length },
  ].filter(d => d.value > 0);

  const exportCSV = () => {
    const headers = ["Student Name", "Student Email", "Course", "Progress %", "Status", "Time Spent (min)", "Quiz Scores"];
    const rows = filteredEnrollments.map(e => {
      const course = courses.find(c => c.id === e.course_id);
      const avgScore = e.quiz_scores?.length > 0 ? Math.round(e.quiz_scores.reduce((s, q) => s + ((q.score / q.max_score) * 100), 0) / e.quiz_scores.length) + "%" : "N/A";
      return [e.student_name, e.student_email, course?.title || "", e.progress_percent || 0, e.status, e.time_spent_minutes || 0, avgScore];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "analytics_report.csv"; a.click();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-black tracking-tight">Analytics</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-56 rounded-xl border-gray-200 text-sm"><SelectValue placeholder="All Courses" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Courses</SelectItem>{courses.map(c => (<SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>))}</SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV} className="rounded-xl gap-2 text-sm"><Download className="w-4 h-4" />Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Students" value={totalStudents} icon={Users} />
        <StatCard title="Avg. Completion" value={`${avgCompletion}%`} icon={TrendingUp} color="#6366f1" />
        <StatCard title="Completed" value={completedCount} icon={Trophy} color="#f59e0b" />
        <StatCard title="Stuck Flags" value={stuckFlags.length} icon={Flag} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-black mb-4">Enrollment by Course</h3>
          {courseEnrollmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}><BarChart data={courseEnrollmentData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="students" fill="#00a98d" radius={[4, 4, 0, 0]} /><Bar dataKey="completion" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
          ) : (<p className="text-sm text-gray-400 text-center py-8">No data available</p>)}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-black mb-4">Completion Distribution</h3>
          {completionDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={completionDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>{completionDistribution.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer>
          ) : (<p className="text-sm text-gray-400 text-center py-8">No data available</p>)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <EngagementInsights lectures={lectures.filter(l => selectedCourse === "all" || l.course_id === selectedCourse)} stuckFlags={stuckFlags.filter(f => selectedCourse === "all" || f.course_id === selectedCourse)} enrollments={filteredEnrollments} />
        <QuizAnalysis enrollments={filteredEnrollments} />
        <SentimentAnalysis questions={questions.filter(q => selectedCourse === "all" || q.course_id === selectedCourse)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100"><h3 className="text-sm font-semibold text-black">Student Details</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-50"><th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Student</th><th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Course</th><th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Progress</th><th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Status</th><th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Avg Quiz</th></tr></thead>
            <tbody>
              {filteredEnrollments.slice(0, 20).map(e => {
                const course = courses.find(c => c.id === e.course_id);
                const avgScore = e.quiz_scores?.length > 0 ? Math.round(e.quiz_scores.reduce((s, q) => s + ((q.score / q.max_score) * 100), 0) / e.quiz_scores.length) : null;
                return (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3"><p className="text-sm font-medium text-black">{e.student_name || "Student"}</p><p className="text-xs text-gray-400">{e.student_email}</p></td>
                    <td className="px-6 py-3 text-sm text-gray-600">{course?.title}</td>
                    <td className="px-6 py-3"><div className="flex items-center gap-2"><div className="w-16"><Progress value={e.progress_percent || 0} className="h-1.5" /></div><span className="text-xs text-gray-500">{e.progress_percent || 0}%</span></div></td>
                    <td className="px-6 py-3"><Badge className={`text-[10px] ${e.status === "completed" ? "bg-emerald-50 text-emerald-700" : e.status === "active" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-600"}`}>{e.status}</Badge></td>
                    <td className="px-6 py-3 text-sm text-gray-600">{avgScore !== null ? `${avgScore}%` : "—"}</td>
                  </tr>
                );
              })}
              {filteredEnrollments.length === 0 && (<tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400">No enrollment data</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}