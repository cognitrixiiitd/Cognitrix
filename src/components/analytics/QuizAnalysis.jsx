import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Award } from "lucide-react";

export default function QuizAnalysis({ enrollments }) {
  // Aggregate quiz performance data
  const quizAttempts = enrollments.flatMap((e) =>
    (e.quiz_scores || []).map((q) => ({
      ...q,
      studentId: e.student_id,
      percentage: (q.score / q.max_score) * 100,
    })),
  );

  if (quizAttempts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-black mb-4">
          Quiz Performance
        </h3>
        <p className="text-sm text-gray-400 text-center py-8">
          No quiz data available
        </p>
      </div>
    );
  }

  const avgScore = Math.round(
    quizAttempts.reduce((s, q) => s + q.percentage, 0) / quizAttempts.length,
  );
  const passRate = Math.round(
    (quizAttempts.filter((q) => q.percentage >= 70).length /
      quizAttempts.length) *
      100,
  );

  // Group by quiz_id to analyze attempt trends
  const quizGroups = {};
  quizAttempts.forEach((q) => {
    if (!quizGroups[q.quiz_id]) quizGroups[q.quiz_id] = [];
    quizGroups[q.quiz_id].push(q);
  });

  const retakeAnalysis = Object.entries(quizGroups)
    .map(([quizId, attempts]) => {
      const sorted = attempts.sort(
        (a, b) => new Date(a.submitted_at) - new Date(b.submitted_at),
      );
      const firstAttemptAvg =
        sorted
          .slice(0, Math.ceil(sorted.length / 2))
          .reduce((s, q) => s + q.percentage, 0) /
          Math.ceil(sorted.length / 2) || 0;
      const laterAttemptAvg =
        sorted
          .slice(Math.ceil(sorted.length / 2))
          .reduce((s, q) => s + q.percentage, 0) /
          Math.floor(sorted.length / 2) || firstAttemptAvg;
      return {
        quizId,
        attempts: attempts.length,
        improvement: laterAttemptAvg - firstAttemptAvg,
      };
    })
    .filter((q) => q.attempts > 3);

  const scoreDistribution = [
    {
      range: "0-50%",
      count: quizAttempts.filter((q) => q.percentage <= 50).length,
    },
    {
      range: "51-70%",
      count: quizAttempts.filter((q) => q.percentage > 50 && q.percentage <= 70)
        .length,
    },
    {
      range: "71-85%",
      count: quizAttempts.filter((q) => q.percentage > 70 && q.percentage <= 85)
        .length,
    },
    {
      range: "86-100%",
      count: quizAttempts.filter((q) => q.percentage > 85).length,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-4 h-4 text-[#00a98d]" />
        <h3 className="text-sm font-semibold text-black">Quiz Performance</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 bg-[#00a98d]/5 rounded-xl">
          <p className="text-xs text-gray-500">Avg Score</p>
          <p className="text-xl font-semibold text-[#00a98d] mt-1">
            {avgScore}%
          </p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-xl">
          <p className="text-xs text-gray-500">Pass Rate (≥70%)</p>
          <p className="text-xl font-semibold text-emerald-600 mt-1">
            {passRate}%
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Score Distribution</p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={scoreDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#00a98d"
              strokeWidth={2}
              dot={{ fill: "#00a98d", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {retakeAnalysis.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Retake Improvement</p>
          <div className="space-y-2">
            {retakeAnalysis.slice(0, 3).map((quiz, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <span className="text-xs text-gray-600">Quiz {i + 1}</span>
                <div className="flex items-center gap-1">
                  {quiz.improvement > 5 ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs text-emerald-600">
                        +{Math.round(quiz.improvement)}%
                      </span>
                    </>
                  ) : quiz.improvement < -5 ? (
                    <>
                      <TrendingDown className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600">
                        {Math.round(quiz.improvement)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">
                      ~{Math.round(quiz.improvement)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
