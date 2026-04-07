import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageSkeleton from "../components/shared/PageSkeleton";
import EmptyState from "../components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Flag, CheckCircle, Clock } from "lucide-react";

export default function ProfessorQA() {
  const { user, profile } = useAuth();
  const [filter, setFilter] = useState("open");
  const [replyText, setReplyText] = useState({});
  const queryClient = useQueryClient();

  const { data: courses = [] } = useQuery({
    queryKey: ["qa-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").eq("professor_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const courseIds = courses.map((c) => c.id);
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["qa-questions", courseIds.join(","), filter],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      let query = supabase.from("questions").select("id, text, user_name, course_id, status, is_stuck_flag, question_answers(id, text, user_name, created_at), created_at").in("course_id", courseIds);
      if (filter !== "all") query = query.eq("status", filter);
      query = query.order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((q) => ({
        ...q,
        answers: q.question_answers || [],
        course_title: courses.find((c) => c.id === q.course_id)?.title,
      }));
    },
    enabled: courseIds.length > 0,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ questionId, text }) => {
      const { error: insertError } = await supabase.from("question_answers").insert({
        question_id: questionId,
        user_id: user.id,
        user_name: profile?.full_name || user.email || "Professor",
        text,
      });
      if (insertError) throw insertError;
      
      const { error: updateError } = await supabase.from("questions").update({ status: "answered" }).eq("id", questionId);
      if (updateError) throw updateError;
    },
    onSuccess: () => { setReplyText({}); queryClient.invalidateQueries({ queryKey: ["qa-questions"] }); },
  });

  const resolveMutation = useMutation({
    mutationFn: async (questionId) => {
      const { error } = await supabase.from("questions")
        .update({ is_stuck_flag: false, status: "answered" })
        .eq("id", questionId);
      if (error) throw error;
    },
    onMutate: async (questionId) => {
      await queryClient.cancelQueries({ queryKey: ["qa-questions"] });
      const key = ["qa-questions", courseIds.join(","), filter];
      const prev = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old) => (old || []).map(q => q.id === questionId ? { ...q, is_stuck_flag: false, status: "answered" } : q));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => { queryClient.setQueryData(ctx.key, ctx.prev); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ["qa-questions"] }); },
  });

  if (isLoading) return <PageSkeleton variant="list" />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-black tracking-tight">Questions & Answers</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 rounded-xl border-gray-200 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {questions.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No questions" description={filter === "open" ? "No open questions from students." : "No questions found."} />
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${q.is_stuck_flag ? "bg-orange-50" : "bg-blue-50"}`}>
                  {q.is_stuck_flag ? <Flag className="w-4 h-4 text-orange-500" /> : <MessageSquare className="w-4 h-4 text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black">{q.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{q.user_name || "Student"}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <Badge variant="secondary" className="text-[10px] bg-gray-50">{q.course_title}</Badge>
                    <Badge className={`text-[10px] ${q.status === "answered" ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"}`}>{q.status}</Badge>
                    {q.is_stuck_flag && <Badge className="text-[10px] bg-orange-50 text-orange-700">Stuck</Badge>}
                  </div>
                  {q.answers?.map((a, i) => (
                    <div key={i} className="mt-3 pl-3 border-l-2 border-[#00a98d]">
                      <p className="text-sm text-gray-700">{a.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.user_name} · {new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3">
                    <Textarea placeholder="Write a reply..." value={replyText[q.id] || ""} onChange={(e) => setReplyText((prev) => ({ ...prev, [q.id]: e.target.value }))} className="rounded-xl border-gray-200 text-sm h-12 resize-none" />
                    <Button size="icon" onClick={() => replyText[q.id]?.trim() && replyMutation.mutate({ questionId: q.id, text: replyText[q.id] })} disabled={!replyText[q.id]?.trim() || replyMutation.isPending} className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl flex-shrink-0"><Send className="w-4 h-4" /></Button>
                    {q.is_stuck_flag && (
                      <Button variant="outline" size="sm" onClick={() => resolveMutation.mutate(q.id)} disabled={resolveMutation.isPending} className="text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl flex-shrink-0">
                        <CheckCircle className="w-3.5 h-3.5" />Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
