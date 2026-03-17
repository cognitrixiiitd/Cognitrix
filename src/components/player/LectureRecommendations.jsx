import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Play, FileText, Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const typeIcons = {
  video: Video,
  youtube: Play,
  pdf: FileText,
  slides: FileText,
  notes: FileText,
  external_link: ExternalLink,
};

export default function LectureRecommendations({
  currentLecture,
  allLectures,
  onSelectLecture,
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Reset when lecture changes
  useEffect(() => {
    setRecommendations([]);
    setGenerated(false);
  }, [currentLecture?.id]);

  const generate = async () => {
    if (!currentLecture || allLectures.length < 2) return;
    setLoading(true);

    const otherLectures = allLectures
      .filter((l) => l.id !== currentLecture.id)
      .map((l, i) => ({
        index: allLectures.indexOf(l),
        id: l.id,
        title: l.title,
        transcript_snippet: l.transcript_text?.slice(0, 300) || "",
      }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are analyzing a course lecture and need to recommend related lectures from the same course.

Current lecture: "${currentLecture.title}"
Current lecture transcript: "${currentLecture.transcript_text?.slice(0, 800) || "No transcript available"}"

Other lectures in this course:
${otherLectures.map((l) => `- ID: ${l.id} | Title: "${l.title}" | Snippet: "${l.transcript_snippet}"`).join("\n")}

Based on the content and topics covered in the current lecture's transcript, recommend up to 3 lectures from the list above that are most topically related or would complement what the student just learned.
Return ONLY lectures from the provided list. Do not invent new ones.`,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                reason: { type: "string" },
              },
            },
          },
        },
      },
    });

    const recs = (result.recommendations || [])
      .map((r) => {
        const lecture = allLectures.find((l) => l.id === r.id);
        return lecture ? { ...lecture, reason: r.reason } : null;
      })
      .filter(Boolean)
      .slice(0, 3);

    setRecommendations(recs);
    setGenerated(true);
    setLoading(false);
  };

  if (allLectures.length < 2) return null;

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#00a98d]" />
          <h3 className="text-sm font-semibold text-black">Related Lectures</h3>
        </div>
        {!generated && (
          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={loading}
            className="text-xs gap-1 rounded-lg"
          >
            {loading ? (
              <div className="w-3 h-3 border-2 border-[#00a98d] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {loading ? "Analyzing..." : "Find Related"}
          </Button>
        )}
      </div>

      {generated && recommendations.length === 0 && (
        <p className="text-xs text-gray-400">
          No closely related lectures found in this course.
        </p>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map((lecture) => {
            const Icon = typeIcons[lecture.type] || FileText;
            return (
              <button
                key={lecture.id}
                onClick={() => {
                  const idx = allLectures.findIndex((l) => l.id === lecture.id);
                  if (idx !== -1) onSelectLecture(idx);
                }}
                className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-[#00a98d]/5 border border-gray-100 hover:border-[#00a98d]/20 transition-all text-left group"
              >
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#00a98d]/10">
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#00a98d]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-black group-hover:text-[#00a98d] transition-colors truncate">
                    {lecture.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                    {lecture.reason}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
