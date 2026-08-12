import React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "../utils";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import LectureForm from "@/components/course/LectureForm";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import PageSkeleton from "../components/shared/PageSkeleton";

export default function LectureEditor() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("courseId");
  const lectureId = params.get("lectureId"); // null means "add new"
  const defaultTab = params.get("tab") || "transcript";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch the course (for context like title and professor_id)
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["editor-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, status, professor_id, professor_name")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  // Fetch the existing lecture (only when editing)
  const { data: existingLecture, isLoading: lectureLoading } = useQuery({
    queryKey: ["editor-single-lecture", lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select(
          "id, title, type, order_index, duration_minutes, section_name, source_url, attachments, topic_timestamps, transcript_text, ai_generated_description"
        )
        .eq("id", lectureId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lectureId,
  });

  // Fetch order index for new lectures
  const { data: lectureCount = 0 } = useQuery({
    queryKey: ["lecture-count", courseId],
    queryFn: async () => {
      const { count } = await supabase
        .from("lectures")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId);
      return count || 0;
    },
    enabled: !!courseId && !lectureId,
  });

  const isLoading = courseLoading || (!!lectureId && lectureLoading);

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (!course) return <div className="text-center py-20 text-gray-500">Course not found</div>;

  const backUrl = createPageUrl(`CourseEditor?id=${courseId}`);

  const handleSaved = () => {
    queryClient.invalidateQueries(["editor-lectures", courseId]);
    navigate(backUrl);
  };

  const handleCancel = () => {
    navigate(backUrl);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        to={backUrl}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {course.title}
      </Link>

      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-black tracking-tight">
          {lectureId ? "Edit Lecture" : "Add New Lecture"}
        </h1>
        <p className="text-sm text-gray-400 mt-1">{course.title}</p>
      </div>

      {/* The form — same content, just on its own page */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <LectureForm
          courseId={courseId}
          existingLecture={lectureId ? existingLecture : null}
          course={course}
          orderIndex={lectureCount}
          defaultTab={defaultTab}
          onCancel={handleCancel}
          onSaved={handleSaved}
        />
      </div>
    </div>
  );
}
