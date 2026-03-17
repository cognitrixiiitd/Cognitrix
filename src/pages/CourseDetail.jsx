import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "../utils";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  Users,
  BookOpen,
  GraduationCap,
  Play,
  CheckCircle,
  FileText,
  Video,
  ExternalLink,
} from "lucide-react";

const categoryLabels = {
  computer_science: "Computer Science",
  mathematics: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  engineering: "Engineering",
  business: "Business",
  humanities: "Humanities",
  social_sciences: "Social Sciences",
  arts: "Arts",
  other: "Other",
};

const typeIcons = {
  video: Video,
  youtube: Play,
  pdf: FileText,
  slides: FileText,
  notes: FileText,
  external_link: ExternalLink,
};

export default function CourseDetail() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth
      .me()
      .then(setUser)
      .catch(() => {});
  }, []);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const courses = await base44.entities.Course.filter({ id: courseId });
      return courses[0];
    },
    enabled: !!courseId,
  });

  const { data: lectures = [] } = useQuery({
    queryKey: ["course-lectures", courseId],
    queryFn: () =>
      base44.entities.Lecture.filter({ course_id: courseId }, "order_index"),
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const e = await base44.entities.Enrollment.filter({
        course_id: courseId,
        student_id: user.id,
      });
      return e[0] || null;
    },
    enabled: !!courseId && !!user,
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Enrollment.create({
        student_id: user.id,
        student_name: user.full_name,
        student_email: user.email,
        course_id: courseId,
        course_title: course.title,
        status: "active",
        progress_percent: 0,
        completed_lectures: [],
        quiz_scores: [],
        time_spent_minutes: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["enrollment", courseId, user?.id]);
      // Update enrollment count
      base44.entities.Course.update(courseId, {
        enrollment_count: (course.enrollment_count || 0) + 1,
      });
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (!course)
    return (
      <div className="text-center py-20 text-gray-500">Course not found</div>
    );

  const isEnrolled = !!enrollment;
  const isProfessor = user?.role === "admin";

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to={createPageUrl("CourseCatalog")}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Catalog
      </Link>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
        <div className="h-48 bg-gradient-to-br from-[#00a98d]/20 via-[#00a98d]/10 to-white flex items-center justify-center">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="w-16 h-16 text-[#00a98d]/30" />
          )}
        </div>
        <div className="p-6 lg:p-8">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge
              variant="outline"
              className="text-xs text-gray-500 border-gray-200"
            >
              {categoryLabels[course.category] || course.category}
            </Badge>
            {course.tags?.map((tag, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-xs bg-gray-50 text-gray-500"
              >
                {tag}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-black tracking-tight">
            {course.title}
          </h1>
          {course.short_description && (
            <p className="text-gray-500 mt-2 text-base">
              {course.short_description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-5 mt-5 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-gray-400" />
              {course.professor_name}
            </span>
            {course.estimated_hours > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                {course.estimated_hours} hours
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-400" />
              {course.enrollment_count || 0} students
            </span>
          </div>

          <div className="mt-6">
            {!user ? (
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl px-8"
              >
                Sign in to Enroll
              </Button>
            ) : isEnrolled ? (
              <Link to={createPageUrl(`CoursePlayer?id=${courseId}`)}>
                <Button className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl px-8 gap-2">
                  <Play className="w-4 h-4" />
                  Continue Learning
                </Button>
              </Link>
            ) : isProfessor ? (
              <Link to={createPageUrl(`CourseEditor?id=${courseId}`)}>
                <Button variant="outline" className="rounded-xl px-8">
                  Edit Course
                </Button>
              </Link>
            ) : (
              <Button
                onClick={() => enrollMutation.mutate()}
                disabled={enrollMutation.isPending}
                className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl px-8"
              >
                {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Course Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {course.long_description && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-black mb-3">
                About This Course
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {course.long_description}
              </p>
            </div>
          )}

          {/* Lectures */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-black mb-4">
              Course Content
            </h2>
            {lectures.length === 0 ? (
              <p className="text-sm text-gray-400">No lectures added yet.</p>
            ) : (
              <div className="space-y-2">
                {lectures.map((lecture, i) => {
                  const Icon = typeIcons[lecture.type] || FileText;
                  const completed = enrollment?.completed_lectures?.includes(
                    lecture.id,
                  );
                  return (
                    <div
                      key={lecture.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${completed ? "bg-emerald-50" : "bg-gray-50"}`}
                      >
                        {completed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Icon className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">
                          {lecture.title}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {lecture.type?.replace("_", " ")}
                        </p>
                      </div>
                      {lecture.duration_seconds > 0 && (
                        <span className="text-xs text-gray-400">
                          {Math.round(lecture.duration_seconds / 60)} min
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {course.learning_outcomes?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-black mb-3">
                What You'll Learn
              </h3>
              <ul className="space-y-2">
                {course.learning_outcomes.map((o, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <CheckCircle className="w-4 h-4 text-[#00a98d] flex-shrink-0 mt-0.5" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {course.prerequisites?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-black mb-3">
                Prerequisites
              </h3>
              <ul className="space-y-2">
                {course.prerequisites.map((p, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    • {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {course.credits > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-black mb-1">Credits</h3>
              <p className="text-2xl font-semibold text-[#00a98d]">
                {course.credits}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
