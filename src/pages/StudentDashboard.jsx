import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import StatCard from "../components/shared/StatCard";
import CourseCard from "../components/shared/CourseCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import {
  BookOpen,
  GraduationCap,
  Clock,
  Trophy,
  Route,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function StudentDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["student-enrollments", user?.id],
    queryFn: () =>
      base44.entities.Enrollment.filter(
        { student_id: user.id },
        "-updated_date",
      ),
    enabled: !!user?.id,
  });

  const { data: courses = [] } = useQuery({
    queryKey: [
      "enrolled-courses",
      enrollments.map((e) => e.course_id).join(","),
    ],
    queryFn: async () => {
      const all = [];
      for (const e of enrollments) {
        const courseList = await base44.entities.Course.filter({
          id: e.course_id,
        });
        if (courseList.length > 0)
          all.push({ ...courseList[0], enrollment: e });
      }
      return all;
    },
    enabled: enrollments.length > 0,
  });

  const { data: paths = [] } = useQuery({
    queryKey: ["student-paths", user?.id],
    queryFn: () =>
      base44.entities.LearningPath.filter({
        student_id: user.id,
        status: "active",
      }),
    enabled: !!user?.id,
  });

  if (isLoading) return <LoadingSpinner />;

  const activeCourses = courses.filter(
    (c) => c.enrollment?.status === "active",
  );
  const completedCourses = courses.filter(
    (c) => c.enrollment?.status === "completed",
  );
  const totalHours = enrollments.reduce(
    (sum, e) => sum + (e.time_spent_minutes || 0),
    0,
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">
            Hello{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Continue your learning journey
          </p>
        </div>
        <Link to={createPageUrl("CourseCatalog")}>
          <Button className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl gap-2">
            <BookOpen className="w-4 h-4" />
            Browse Courses
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Enrolled Courses"
          value={enrollments.length}
          icon={BookOpen}
        />
        <StatCard
          title="Completed"
          value={completedCourses.length}
          icon={Trophy}
          color="#f59e0b"
        />
        <StatCard
          title="Hours Learned"
          value={Math.round(totalHours / 60)}
          icon={Clock}
          color="#6366f1"
        />
        <StatCard
          title="Active Paths"
          value={paths.length}
          icon={Route}
          color="#00a98d"
        />
      </div>

      {/* Continue Learning */}
      {activeCourses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-black mb-4">
            Continue Learning
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeCourses.slice(0, 4).map((course) => (
              <Link
                key={course.id}
                to={createPageUrl(`CoursePlayer?id=${course.id}`)}
                className="block group"
              >
                <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all duration-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-black group-hover:text-[#00a98d] transition-colors truncate">
                        {course.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {course.professor_name}
                      </p>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                          <span>
                            {Math.min(
                              100,
                              course.enrollment?.progress_percent || 0,
                            )}
                            % complete
                          </span>
                        </div>
                        <Progress
                          value={Math.min(
                            100,
                            course.enrollment?.progress_percent || 0,
                          )}
                          className="h-1.5 bg-gray-100"
                        />
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#00a98d] transition-colors flex-shrink-0 mt-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Learning Paths */}
      {paths.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-black">
              Your Learning Paths
            </h2>
            <Link
              to={createPageUrl("LearningPaths")}
              className="text-sm text-[#00a98d] font-medium hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paths.slice(0, 2).map((path) => (
              <div
                key={path.id}
                className="bg-white rounded-2xl border border-gray-100 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#00a98d]/10 rounded-xl flex items-center justify-center">
                    <Route className="w-5 h-5 text-[#00a98d]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black text-sm">
                      {path.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {path.steps?.length || 0} steps
                    </p>
                  </div>
                </div>
                <Progress
                  value={path.progress_percent || 0}
                  className="h-1.5 bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {path.progress_percent || 0}% complete
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {enrollments.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="Start your learning journey"
          description="Browse the course catalog to find courses that match your goals and interests."
          actionLabel="Browse Courses"
          onAction={() =>
            (window.location.href = createPageUrl("CourseCatalog"))
          }
        />
      )}
    </div>
  );
}
