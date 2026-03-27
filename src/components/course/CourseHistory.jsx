import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Sparkles, Edit, Plus, Trash } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const changeTypeIcons = { ai_generated: Sparkles, manual_edit: Edit, lecture_added: Plus, lecture_deleted: Trash, quiz_generated: Sparkles };
const changeTypeColors = { ai_generated: "bg-purple-50 text-purple-700", manual_edit: "bg-blue-50 text-blue-700", lecture_added: "bg-emerald-50 text-emerald-700", lecture_deleted: "bg-red-50 text-red-700", quiz_generated: "bg-indigo-50 text-indigo-700" };

export default function CourseHistory({ courseId }) {
  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ["course-revisions", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("course_revisions").select("*").eq("course_id", courseId).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId,
  });

  if (isLoading) return <LoadingSpinner message="Loading history..." />;
  if (revisions.length === 0) return (<div className="text-center py-8"><Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-400">No revision history yet</p></div>);

  return (
    <div className="space-y-3">
      {revisions.map((revision, index) => {
        const Icon = changeTypeIcons[revision.change_type] || Edit;
        return (
          <div key={revision.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-gray-500" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><Badge className={`text-[10px] ${changeTypeColors[revision.change_type] || "bg-gray-50 text-gray-700"}`}>{revision.change_type.replace(/_/g, " ")}</Badge><span className="text-xs text-gray-400">Rev. {revisions.length - index}</span></div>
                <p className="text-sm text-black mb-1">{revision.change_description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400"><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(revision.created_at).toLocaleDateString()}</span><span className="flex items-center gap-1"><User className="w-3 h-3" />{revision.changed_by_user_id}</span></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
