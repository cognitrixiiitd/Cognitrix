import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import RecommendedCourses from "@/components/learning/RecommendedCourses";
import BookmarkList from "@/components/learning/BookmarkList";
import { GraduationCap, Play, CheckCircle, Clock, LogOut } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MyLearning() {
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("active");
  const [activeTab, setActiveTab] = useState("courses");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: () =>
      base44.entities.Enrollment.filter(
        { student_id: user.id },
        "-updated_date",
      ),
    enabled: !!user?.id,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["my-courses", enrollments.map((e) => e.course_id).join(",")],
    queryFn: async () => {
      const all = [];
      for (const e of enrollments) {
        const c = await base44.entities.Course.filter({ id: e.course_id });
        if (c.length > 0) {
          const lectures = await base44.entities.Lecture.filter({
            course_id: c[0].id,
            status: "active",
          });
          const totalDuration = lectures.reduce(
            (sum, l) => sum + (l.duration_seconds || 0),
            0,
          );
          const completedDuration = lectures
            .filter((l) => e.completed_lectures?.includes(l.id))
            .reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
          const remainingMinutes = Math.max(
            0,
            Math.round((totalDuration - completedDuration) / 60),
          );

          all.push({
            ...c[0],
            enrollment: e,
            remainingMinutes,
            totalLectures: lectures.length,
          });
        }
      }
      return all;
    },
    enabled: enrollments.length > 0,
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["my-bookmarks", user?.id],
    queryFn: () =>
      base44.entities.Bookmark.filter({ user_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: learningPaths = [] } = useQuery({
    queryKey: ["my-learning-paths", user?.id],
    queryFn: () => base44.entities.LearningPath.filter({ student_id: user.id }),
    enabled: !!user?.id,
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: (id) => base44.entities.Bookmark.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["my-bookmarks"] }),
  });

  const unenrollMutation = useMutation({
    mutationFn: async (enrollmentId) => {
      await base44.entities.Enrollment.delete(enrollmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["my-courses"] });
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const filtered = courses.filter(
    (c) => filter === "all" || c.enrollment?.status === filter,
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-black tracking-tight">
          My Learning
        </h1>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-100 rounded-xl">
            <TabsTrigger value="courses" className="rounded-lg text-xs">
              Courses
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="rounded-lg text-xs">
              Bookmarks
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="rounded-lg text-xs">
              Recommended
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "courses" && (
        <>
          <div className="flex items-center gap-2 mb-6">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="bg-gray-100 rounded-xl">
                <TabsTrigger value="active" className="rounded-lg text-xs">
                  In Progress
                </TabsTrigger>
                <TabsTrigger value="completed" className="rounded-lg text-xs">
                  Completed
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg text-xs">
                  All
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title={
                filter === "completed"
                  ? "No completed courses"
                  : "No courses in progress"
              }
              description="Enroll in courses from the catalog to start learning."
              actionLabel="Browse Courses"
              onAction={() =>
                (window.location.href = createPageUrl("CourseCatalog"))
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <Link
                      to={createPageUrl(`CoursePlayer?id=${course.id}`)}
                      className="w-16 h-16 bg-gradient-to-br from-[#00a98d]/20 to-[#00a98d]/5 rounded-xl flex items-center justify-center flex-shrink-0"
                    >
                      {course.enrollment?.status === "completed" ? (
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <Play className="w-6 h-6 text-[#00a98d]" />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={createPageUrl(`CoursePlayer?id=${course.id}`)}
                          className="group flex-1 min-w-0"
                        >
                          <h3 className="font-semibold text-black group-hover:text-[#00a98d] transition-colors">
                            {course.title}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {course.professor_name}
                          </p>
                        </Link>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                "Unenroll from this course? Your progress will be lost.",
                              )
                            ) {
                              unenrollMutation.mutate(course.enrollment.id);
                            }
                          }}
                          disabled={unenrollMutation.isPending}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 flex-shrink-0"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Unenroll
                        </button>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                          <span>
                            {Math.min(
                              100,
                              course.enrollment?.progress_percent || 0,
                            )}
                            % complete
                          </span>
                          <div className="flex items-center gap-3">
                            {course.enrollment?.time_spent_minutes > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.round(
                                  course.enrollment.time_spent_minutes / 60,
                                )}
                                h spent
                              </span>
                            )}
                          </div>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "bookmarks" && (
        <BookmarkList
          bookmarks={bookmarks}
          onDelete={(id) => deleteBookmarkMutation.mutate(id)}
        />
      )}

      {activeTab === "recommendations" && (
        <RecommendedCourses
          user={user}
          enrollments={enrollments}
          learningPaths={learningPaths}
        />
      )}
    </div>
  );
}
