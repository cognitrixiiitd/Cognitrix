import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, HelpCircle, Trophy } from "lucide-react";

export default function QuizModule({ quiz, enrollment, userId, onAchievement }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  const handleSelect = (qIndex, choiceIndex) => { if (submitted) return; setAnswers((prev) => ({ ...prev, [qIndex]: choiceIndex })); };
  const handleTextAnswer = (qIndex, text) => { if (submitted) return; setAnswers((prev) => ({ ...prev, [qIndex]: text })); };

  const handleSubmit = async () => {
    // Count only gradable questions (exclude short_answer)
    const gradableQuestions = quiz.questions.filter(q => q.question_type !== "short_answer");
    let correct = 0;
    gradableQuestions.forEach((q) => {
      const qIdx = quiz.questions.indexOf(q);
      if (q.question_type === "fill_in_blank") {
        const userAnswer = (answers[qIdx] || "").trim().toLowerCase();
        const correctAnswer = (q.correct_answer || "").trim().toLowerCase();
        if (userAnswer === correctAnswer) correct++;
      } else {
        // multiple_choice
        if (answers[qIdx] === q.correct_index) correct++;
      }
    });
    const s = gradableQuestions.length > 0 ? Math.round((correct / gradableQuestions.length) * 100) : 100;
    setScore(s); setSubmitted(true);

    if (enrollment) {
      const scores = [...(enrollment.quiz_scores || [])];
      scores.push({ quiz_id: quiz.id, score: correct, max_score: gradableQuestions.length, submitted_at: new Date().toISOString() });
      await supabase.from("enrollments").update({ quiz_scores: scores }).eq("id", enrollment.id);
    }

    await supabase.from("analytics_events").insert({
      user_id: userId, course_id: quiz.course_id, lecture_id: quiz.lecture_id,
      event_type: "quiz_submit", meta: { score: s, correct, total: gradableQuestions.length },
    });

    const pointsEarned = s >= 70 ? correct * 10 : correct * 5;
    const { data: studentStats } = await supabase.from("student_stats").select("*").eq("user_id", userId).maybeSingle();

    if (studentStats) {
      const newQuizCount = (studentStats.quizzes_completed || 0) + 1;
      const newPerfectCount = s === 100 ? (studentStats.perfect_quiz_count || 0) + 1 : studentStats.perfect_quiz_count;
      const newPoints = (studentStats.total_points || 0) + pointsEarned;
      const newLevel = Math.floor(newPoints / 1000) + 1;
      await supabase.from("student_stats").update({
        total_points: newPoints, quizzes_completed: newQuizCount, perfect_quiz_count: newPerfectCount,
        level: newLevel, last_active_date: new Date().toISOString().split("T")[0],
      }).eq("id", studentStats.id);

      if (s === 100) {
        const { data: achievement } = await supabase.from("achievements").insert({
          user_id: userId, course_id: quiz.course_id, achievement_type: "perfect_score",
          badge_name: "Perfect Score!", badge_description: "Aced a quiz with 100%", badge_icon: "star", points_awarded: 50,
        }).select().single();
        if (achievement && onAchievement) onAchievement(achievement);
      } else if (s >= 90) {
        const { data: achievement } = await supabase.from("achievements").insert({
          user_id: userId, course_id: quiz.course_id, achievement_type: "quiz_ace",
          badge_name: "Quiz Master", badge_description: "Scored 90% or higher", badge_icon: "award", points_awarded: 25,
        }).select().single();
        if (achievement && onAchievement) onAchievement(achievement);
      }
    }
  };

  if (!quiz?.questions?.length) return null;

  // Check if all answerable questions have been answered
  const allAnswered = quiz.questions.every((q, i) => {
    if (q.question_type === "short_answer") return true; // optional
    if (q.question_type === "fill_in_blank") return (answers[i] || "").trim().length > 0;
    return answers[i] !== undefined; // multiple_choice
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-5"><HelpCircle className="w-5 h-5 text-[#00a98d]" /><h3 className="text-base font-semibold text-black">{quiz.title || "Quiz"}</h3></div>
      {submitted && (
        <div className={`p-4 rounded-xl mb-5 ${score >= 70 ? "bg-emerald-50 border border-emerald-200" : "bg-orange-50 border border-orange-200"}`}>
          <div className="flex items-center gap-2 mb-1">{score >= 70 && <Trophy className="w-4 h-4 text-emerald-600" />}<p className={`text-sm font-semibold ${score >= 70 ? "text-emerald-700" : "text-orange-700"}`}>Score: {score}%</p></div>
          <p className="text-xs text-gray-600">{score === 100 ? "🎉 Perfect! +50 pts bonus!" : score >= 90 ? "🏆 Excellent! +25 pts bonus!" : score >= 70 ? "✅ Good job! Points earned." : "Review the material and try again."}</p>
        </div>
      )}
      <div className="space-y-5">
        {quiz.questions.map((q, qIdx) => (
          <div key={qIdx}>
            <p className="text-sm font-medium text-black mb-2">{qIdx + 1}. {q.question_text}</p>

            {/* Multiple Choice */}
            {(!q.question_type || q.question_type === "multiple_choice") && (
              <div className="space-y-1.5">
                {q.choices?.map((choice, cIdx) => {
                  const isSelected = answers[qIdx] === cIdx; const isCorrect = submitted && cIdx === q.correct_index; const isWrong = submitted && isSelected && cIdx !== q.correct_index;
                  return (
                    <button key={cIdx} onClick={() => handleSelect(qIdx, cIdx)} disabled={submitted}
                      className={`w-full text-left p-3 rounded-xl text-sm transition-all flex items-center gap-2 ${isCorrect ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : isWrong ? "bg-red-50 text-red-700 border border-red-200" : isSelected ? "bg-[#00a98d]/10 border border-[#00a98d]/30 text-[#00a98d]" : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-transparent"}`}>
                      {isCorrect && <CheckCircle className="w-4 h-4 flex-shrink-0" />}{isWrong && <XCircle className="w-4 h-4 flex-shrink-0" />}
                      {!submitted && <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isSelected ? "border-[#00a98d] bg-[#00a98d]" : "border-gray-300"}`}>{isSelected && <div className="w-full h-full rounded-full" />}</div>}
                      {choice}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Fill in the Blank */}
            {q.question_type === "fill_in_blank" && (
              <div>
                <Input
                  placeholder="Type your answer..."
                  value={answers[qIdx] || ""}
                  onChange={(e) => handleTextAnswer(qIdx, e.target.value)}
                  disabled={submitted}
                  className={`rounded-xl text-sm ${submitted ? ((answers[qIdx] || "").trim().toLowerCase() === (q.correct_answer || "").trim().toLowerCase() ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50") : ""}`}
                />
                {submitted && (
                  <p className={`text-xs mt-1 ${(answers[qIdx] || "").trim().toLowerCase() === (q.correct_answer || "").trim().toLowerCase() ? "text-emerald-600" : "text-red-600"}`}>
                    {(answers[qIdx] || "").trim().toLowerCase() === (q.correct_answer || "").trim().toLowerCase() ? "✓ Correct!" : `✗ Correct answer: ${q.correct_answer}`}
                  </p>
                )}
              </div>
            )}

            {/* Short Answer */}
            {q.question_type === "short_answer" && (
              <div>
                <Textarea
                  placeholder="Write your answer..."
                  value={answers[qIdx] || ""}
                  onChange={(e) => handleTextAnswer(qIdx, e.target.value)}
                  disabled={submitted}
                  className="rounded-xl text-sm h-24 resize-none"
                />
                {submitted && (
                  <p className="text-xs text-gray-500 mt-1">Your response has been recorded. This will be reviewed manually.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {!submitted && (<Button onClick={handleSubmit} disabled={!allAnswered} className="mt-5 bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl">Submit Quiz</Button>)}
    </div>
  );
}

