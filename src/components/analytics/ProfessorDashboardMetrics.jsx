import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/shared/StatCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  Users,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Award,
  Flag,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ProfessorDashboardMetrics({ professorId }) {
  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["professor-courses", professorId],
    queryFn: () => base44.entities.Course.filter({ professor_id: professorId }),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["all-enrollments"],
    queryFn: () => base44.entities.Enrollment.list(),
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["all-questions"],
    queryFn: () => base44.entities.Question.list("-created_date", 100),
  });

  const { data: analytics = [] } = useQuery({
    queryKey: ["analytics-events"],
    queryFn: () => base44.entities.AnalyticsEvent.list("-created_date", 500),
  });

  if (loadingCourses) return <LoadingSpinner />;

  const courseIds = courses.map((c) => c.id);
  const myEnrollments = enrollments.filter((e) =>
    courseIds.includes(e.course_id),
  );
  const myQuestions = questions.filter((q) => courseIds.includes(q.course_id));
  const stuckFlags = myQuestions.filter((q) => q.is_stuck_flag);

  const totalStudents = new Set(myEnrollments.map((e) => e.student_id)).size;
  const activeStudents = myEnrollments.filter(
    (e) => e.status === "active",
  ).length;
  const completedCourses = myEnrollments.filter(
    (e) => e.status === "completed",
  ).length;
  const avgProgress =
    myEnrollments.length > 0
      ? Math.round(
          myEnrollments.reduce((sum, e) => sum + (e.progress_percent || 0), 0) /
            myEnrollments.length,
        )
      : 0;

  const engagementByDate = analytics
    .filter((a) => courseIds.includes(a.course_id))
    .reduce((acc, event) => {
      const date = new Date(event.created_date).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

  const chartData = Object.entries(engagementByDate)
    .slice(-7)
    .map(([date, count]) => ({ date, events: count }));

  const coursePerformance = courses
    .map((course) => {
      const courseEnrollments = myEnrollments.filter(
        (e) => e.course_id === course.id,
      );
      const avgCourseProgress =
        courseEnrollments.length > 0
          ? Math.round(
              courseEnrollments.reduce(
                (sum, e) => sum + (e.progress_percent || 0),
                0,
              ) / courseEnrollments.length,
            )
          : 0;
      return {
        name: course.title.slice(0, 20),
        students: courseEnrollments.length,
        progress: avgCourseProgress,
      };
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={totalStudents}
          icon={Users}
          color="blue"
          subtitle={`${activeStudents} active`}
        />
        <StatCard
          title="Courses Published"
          value={courses.filter((c) => c.status === "published").length}
          icon={BookOpen}
          color="purple"
          subtitle={`${courses.length} total`}
        />
        <StatCard
          title="Avg Progress"
          value={`${avgProgress}%`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Questions Asked"
          value={myQuestions.length}
          icon={MessageSquare}
          color="orange"
          subtitle={`${stuckFlags.length} stuck flags`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-black mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Engagement (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="events"
                stroke="#00a98d"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-black mb-4 flex items-center gap-2">
            <Award className="w-4 h-4" />
            Course Performance
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={coursePerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="progress" fill="#00a98d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-black mb-4 flex items-center gap-2">
          <Flag className="w-4 h-4 text-orange-500" />
          Recent Student Flags ({stuckFlags.length})
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {stuckFlags.slice(0, 10).map((flag) => {
            const course = courses.find((c) => c.id === flag.course_id);
            return (
              <div
                key={flag.id}
                className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100"
              >
                <Flag className="w-4 h-4 text-orange-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black">
                    {flag.user_name}
                  </p>
                  <p className="text-xs text-gray-600 truncate">{flag.text}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {course?.title || "Unknown Course"}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(flag.created_date).toLocaleDateString()}
                </span>
              </div>
            );
          })}
          {stuckFlags.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              No stuck flags reported
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
