import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import CourseCard from "@/components/shared/CourseCard";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";

export default function RecommendedCourses({ user, enrollments, learningPaths }) {
  const [recommendations, setRecommendations] = useState(null);
  const [generating, setGenerating] = useState(false);

  const { data: allCourses = [] } = useQuery({
    queryKey: ["all-published-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("status", "published");
      if (error) throw error;
      return data || [];
    },
  });

  const generateRecommendations = async () => {
    setGenerating(true);

    const enrolledCourseIds = enrollments.map(e => e.course_id);
    const availableCourses = allCourses.filter(c => !enrolledCourseIds.includes(c.id));

    // Stub: Simple category/difficulty-based recommendations instead of AI LLM
    await new Promise(r => setTimeout(r, 600));

    // Find courses in similar categories
    const enrolledCourses = allCourses.filter(c => enrolledCourseIds.includes(c.id));
    const categories = [...new Set(enrolledCourses.map(c => c.category).filter(Boolean))];
    const domains = learningPaths?.map(lp => lp.domain?.toLowerCase()) || [];

    const scored = availableCourses.map(c => {
      let score = 0;
      if (categories.includes(c.category)) score += 3;
      if (domains.some(d => c.title?.toLowerCase().includes(d) || c.category?.toLowerCase().includes(d))) score += 2;
      return { ...c, score, reason: categories.includes(c.category) ? `Matches your interest in ${c.category}` : "Recommended to expand your skills" };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    setRecommendations(scored);
    setGenerating(false);
  };

  if (!recommendations) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <div className="w-12 h-12 bg-[#00a98d]/10 rounded-xl flex items-center justify-center mx-auto mb-4"><Sparkles className="w-6 h-6 text-[#00a98d]" /></div>
        <h3 className="text-sm font-semibold text-black mb-2">Personalized Course Recommendations</h3>
        <p className="text-xs text-gray-500 mb-4">Get course suggestions based on your learning history and goals.</p>
        <Button onClick={generateRecommendations} disabled={generating} className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl text-sm gap-2">
          {generating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? "Generating..." : "Get Recommendations"}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#00a98d]" /><h3 className="text-sm font-semibold text-black">Recommended for You</h3></div>
        <Button variant="outline" size="sm" onClick={generateRecommendations} disabled={generating} className="rounded-xl text-xs gap-1"><RefreshCw className="w-3 h-3" />Refresh</Button>
      </div>
      {recommendations.length === 0 ? (<p className="text-sm text-gray-400 text-center py-8">No recommendations available at this time.</p>) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map(course => (
            <div key={course.id} className="relative">
              <CourseCard course={course} />
              {course.reason && (<div className="mt-2 p-3 bg-[#00a98d]/5 rounded-xl"><p className="text-xs text-gray-600"><span className="font-medium text-[#00a98d]">Why: </span>{course.reason}</p></div>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
