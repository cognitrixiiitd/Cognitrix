import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle, Clock } from "lucide-react";

export default function StudentQA() {
  const { user } = useAuth();

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["student-questions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_stuck_flag", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-black tracking-tight">My Questions</h1>
        <p className="text-sm text-gray-500 mt-1">Track your questions and answers from courses</p>
      </div>
      {questions.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No questions yet" description="Ask questions during your course lectures and they'll appear here." />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${q.status === "answered" ? "bg-emerald-50" : "bg-yellow-50"}`}>
                  {q.status === "answered" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-yellow-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-black">{q.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] ${q.status === "answered" ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"}`}>{q.status}</Badge>
                  </div>
                  {q.answers?.map((a, i) => (
                    <div key={i} className="mt-3 pl-3 border-l-2 border-[#00a98d]">
                      <p className="text-sm text-gray-700">{a.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.user_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
