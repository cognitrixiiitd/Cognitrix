import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Send, Flag, CheckCircle, Clock } from "lucide-react";

export default function ProfessorQA() {
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("open");
  const [replyText, setReplyText] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: courses = [] } = useQuery({
    queryKey: ["qa-courses", user?.id],
    queryFn: () => base44.entities.Course.filter({ professor_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["qa-questions", courses.map((c) => c.id).join(","), filter],
    queryFn: async () => {
      const all = [];
      for (const c of courses) {
        const filterObj = { course_id: c.id };
        if (filter !== "all") filterObj.status = filter;
        const q = await base44.entities.Question.filter(
          filterObj,
          "-created_date",
        );
        all.push(...q.map((q) => ({ ...q, course_title: c.title })));
      }
      return all;
    },
    enabled: courses.length > 0,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ questionId, text, existingAnswers }) => {
      const answers = [
        ...(existingAnswers || []),
        {
          user_id: user.id,
          user_name: user.full_name,
          text,
          created_at: new Date().toISOString(),
        },
      ];
      await base44.entities.Question.update(questionId, {
        answers,
        status: "answered",
      });
    },
    onSuccess: () => {
      setReplyText({});
      queryClient.invalidateQueries(["qa-questions"]);
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-black tracking-tight">
          Questions & Answers
        </h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 rounded-xl border-gray-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No questions"
          description={
            filter === "open"
              ? "No open questions from students."
              : "No questions found."
          }
        />
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-gray-100 p-5"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    q.is_stuck_flag ? "bg-orange-50" : "bg-blue-50"
                  }`}
                >
                  {q.is_stuck_flag ? (
                    <Flag className="w-4 h-4 text-orange-500" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-black">{q.text}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {q.user_name || "Student"}
                    </span>
                    <span className="text-xs text-gray-300">·</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-gray-50"
                    >
                      {q.course_title}
                    </Badge>
                    <Badge
                      className={`text-[10px] ${q.status === "answered" ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"}`}
                    >
                      {q.status}
                    </Badge>
                    {q.is_stuck_flag && (
                      <Badge className="text-[10px] bg-orange-50 text-orange-700">
                        Stuck
                      </Badge>
                    )}
                  </div>

                  {/* Existing answers */}
                  {q.answers?.map((a, i) => (
                    <div
                      key={i}
                      className="mt-3 pl-3 border-l-2 border-[#00a98d]"
                    >
                      <p className="text-sm text-gray-700">{a.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {a.user_name} ·{" "}
                        {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}

                  {/* Reply */}
                  <div className="flex gap-2 mt-3">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyText[q.id] || ""}
                      onChange={(e) =>
                        setReplyText((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      className="rounded-xl border-gray-200 text-sm h-12 resize-none"
                    />
                    <Button
                      size="icon"
                      onClick={() =>
                        replyText[q.id]?.trim() &&
                        replyMutation.mutate({
                          questionId: q.id,
                          text: replyText[q.id],
                          existingAnswers: q.answers,
                        })
                      }
                      disabled={
                        !replyText[q.id]?.trim() || replyMutation.isPending
                      }
                      className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
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
