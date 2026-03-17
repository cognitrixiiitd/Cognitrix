import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Circle,
  Play,
  FileText,
  Video,
  ExternalLink,
  Send,
} from "lucide-react";

const typeIcons = {
  video: Video,
  youtube: Play,
  pdf: FileText,
  slides: FileText,
  notes: FileText,
  external_link: ExternalLink,
};

export default function PlayerSidebar({
  lectures,
  currentIndex,
  onSelect,
  completedLectures,
  showQA,
  courseId,
  lectureId,
  user,
}) {
  const [questionText, setQuestionText] = useState("");
  const queryClient = useQueryClient();

  const { data: questions = [] } = useQuery({
    queryKey: ["lecture-questions", lectureId],
    queryFn: () =>
      base44.entities.Question.filter(
        { lecture_id: lectureId, is_stuck_flag: false },
        "-created_date",
      ),
    enabled: !!lectureId && showQA,
  });

  const askMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Question.create({
        user_id: user.id,
        user_name: user.full_name,
        course_id: courseId,
        lecture_id: lectureId,
        text: questionText,
        status: "open",
        is_stuck_flag: false,
        answers: [],
      });
    },
    onSuccess: () => {
      setQuestionText("");
      queryClient.invalidateQueries(["lecture-questions", lectureId]);
    },
  });

  return (
    <div className="w-full lg:w-80 border-l border-gray-100 bg-white overflow-y-auto">
      {showQA ? (
        <div className="p-4">
          <h3 className="text-sm font-semibold text-black mb-4">
            Questions & Discussion
          </h3>
          <div className="space-y-3 mb-4">
            {questions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                No questions yet. Be the first!
              </p>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-black">{q.text}</p>
                  <p className="text-xs text-gray-400 mt-1">{q.user_name}</p>
                  {q.answers?.map((a, i) => (
                    <div
                      key={i}
                      className="mt-2 pl-3 border-l-2 border-[#00a98d]"
                    >
                      <p className="text-xs text-gray-600">{a.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {a.user_name}
                      </p>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask a question..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="rounded-xl border-gray-200 text-sm h-16 resize-none"
            />
            <Button
              size="icon"
              onClick={() => questionText.trim() && askMutation.mutate()}
              disabled={!questionText.trim() || askMutation.isPending}
              className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <h3 className="text-sm font-semibold text-black mb-4">
            Course Content
          </h3>
          <div className="space-y-1">
            {lectures.map((lecture, i) => {
              const Icon = typeIcons[lecture.type] || FileText;
              const isCompleted = completedLectures.includes(lecture.id);
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={lecture.id}
                  onClick={() => onSelect(i)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                    isCurrent ? "bg-[#00a98d]/10" : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? "bg-emerald-50"
                        : isCurrent
                          ? "bg-[#00a98d]/20"
                          : "bg-gray-50"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <span className="text-xs font-medium text-gray-400">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-medium truncate ${isCurrent ? "text-[#00a98d]" : "text-black"}`}
                    >
                      {lecture.title}
                    </p>
                    <p className="text-[10px] text-gray-400 capitalize">
                      {lecture.type?.replace("_", " ")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
