import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import CourseCard from "@/components/shared/CourseCard";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";

export default function RecommendedCourses({
  user,
  enrollments,
  learningPaths,
}) {
  const [recommendations, setRecommendations] = useState(null);
  const [generating, setGenerating] = useState(false);

  const { data: allCourses = [] } = useQuery({
    queryKey: ["all-published-courses"],
    queryFn: () => base44.entities.Course.filter({ status: "published" }),
  });

  const generateRecommendations = async () => {
    setGenerating(true);

    const enrolledCourseIds = enrollments.map((e) => e.course_id);
    const availableCourses = allCourses.filter(
      (c) => !enrolledCourseIds.includes(c.id),
    );

    const completedCourses = enrollments
      .filter((e) => e.status === "completed")
      .map((e) => {
        const course = allCourses.find((c) => c.id === e.course_id);
        return course?.title || "";
      });

    const learningGoals =
      learningPaths?.map((lp) => `${lp.title} (${lp.domain})`).join(", ") ||
      "General learning";

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a course recommendation AI. Based on a student's profile, recommend courses that align with their interests and goals.

STUDENT PROFILE:
- Completed courses: ${completedCourses.join(", ") || "None"}
- Learning goals: ${learningGoals}
- Current enrollments: ${enrollments.length} courses

AVAILABLE COURSES:
${availableCourses
  .slice(0, 20)
  .map(
    (c) =>
      `- ${c.title} (${c.category}, ${c.difficulty_level}): ${c.short_description}`,
  )
  .join("\n")}

Recommend 3-5 courses from the available list above. Return a JSON object with:
- recommendations: array of objects with { course_title, reason }
- Only recommend courses from the AVAILABLE COURSES list above.
- Match course titles exactly as they appear in the list.`,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                course_title: { type: "string" },
                reason: { type: "string" },
              },
            },
          },
        },
      },
    });

    const recommended =
      result.recommendations
        ?.map((rec) => {
          const course = availableCourses.find(
            (c) => c.title === rec.course_title,
          );
          return course ? { ...course, reason: rec.reason } : null;
        })
        .filter(Boolean) || [];

    setRecommendations(recommended);
    setGenerating(false);
  };

  if (!recommendations) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <div className="w-12 h-12 bg-[#00a98d]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-[#00a98d]" />
        </div>
        <h3 className="text-sm font-semibold text-black mb-2">
          Personalized Course Recommendations
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Get AI-powered course suggestions based on your learning history and
          goals.
        </p>
        <Button
          onClick={generateRecommendations}
          disabled={generating}
          className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl text-sm gap-2"
        >
          {generating ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {generating ? "Generating..." : "Get Recommendations"}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00a98d]" />
          <h3 className="text-sm font-semibold text-black">
            Recommended for You
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateRecommendations}
          disabled={generating}
          className="rounded-xl text-xs gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No recommendations available at this time.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((course) => (
            <div key={course.id} className="relative">
              <CourseCard course={course} />
              {course.reason && (
                <div className="mt-2 p-3 bg-[#00a98d]/5 rounded-xl">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium text-[#00a98d]">Why: </span>
                    {course.reason}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
