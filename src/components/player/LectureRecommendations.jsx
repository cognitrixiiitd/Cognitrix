import React, { useState, useEffect } from "react";
import { Sparkles, Play, FileText, Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const typeIcons = { video: Video, youtube: Play, pdf: FileText, slides: FileText, notes: FileText, external_link: ExternalLink };

export default function LectureRecommendations({ currentLecture, allLectures, onSelectLecture }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { 
    setRecommendations([]); 
    setGenerated(false);
    setError(null);
    if (currentLecture && allLectures.length > 1) {
      generate();
    }
  }, [currentLecture?.id]);

  const generate = async () => {
    if (!currentLecture || allLectures.length < 2) return;
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/get-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lectureId: currentLecture.id,
          courseId: currentLecture.course_id 
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }

      const data = await response.json();
      
      // Match the fetched recommendation IDs to the actual lecture objects passed from props
      const validRecs = (data.recommendations || []).map(rec => {
        const matched = allLectures.find(l => l.id === rec.id);
        if (matched) {
          // add human readable similarity percentage
          return {
            ...matched,
            reason: `AI Similarity: ${Math.round(rec.similarity * 100)}% Match`
          };
        }
        return null;
      }).filter(Boolean);

      setRecommendations(validRecs);
      setGenerated(true);
      setError(null);
    } catch (error) {
      console.error("Error fetching AI recommendations:", error);
      setError("AI Engine is currently offline");
      setRecommendations([]);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  if (allLectures.length < 2) return null;

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#00a98d]" /><h3 className="text-sm font-semibold text-black">Related Lectures</h3></div>
        {(!generated || error) && (
          <Button variant="outline" size="sm" onClick={generate} disabled={loading} className="text-xs gap-1 rounded-lg">
            {loading ? <div className="w-3 h-3 border-2 border-[#00a98d] border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {loading ? "Analyzing..." : "Find Related"}
          </Button>
        )}
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-4">
          <p className="text-xs font-medium text-red-800">Connection Failed</p>
          <p className="text-xs text-red-600 mt-1">{error}. Please ensure the Node.js backend server is running on port 3001.</p>
        </div>
      )}

      {generated && recommendations.length === 0 && !error && <p className="text-xs text-gray-400">No closely related lectures found in this course.</p>}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map((lecture) => {
            const Icon = typeIcons[lecture.type] || FileText;
            return (
              <button key={lecture.id} onClick={() => { const idx = allLectures.findIndex(l => l.id === lecture.id); if (idx !== -1) onSelectLecture(idx); }}
                className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-[#00a98d]/5 border border-gray-100 hover:border-[#00a98d]/20 transition-all text-left group">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#00a98d]/10"><Icon className="w-4 h-4 text-gray-400 group-hover:text-[#00a98d]" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-black group-hover:text-[#00a98d] transition-colors truncate">{lecture.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{lecture.reason}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
