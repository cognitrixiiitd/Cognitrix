import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ManualQuizBuilder({
  questions,
  onChange,
  transcript,
  lectureTitle,
  onAutoGenerate,
}) {
  const [generatingAI, setGeneratingAI] = useState(false);

  const addQuestion = () => {
    onChange([
      ...questions,
      {
        question_type: "multiple_choice",
        question_text: "",
        choices: ["", "", "", ""],
        correct_index: 0,
        correct_answer: "",
        source_timestamp: "",
      },
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const updateChoice = (qIndex, cIndex, value) => {
    const updated = [...questions];
    updated[qIndex].choices[cIndex] = value;
    onChange(updated);
  };

  const deleteQuestion = (index) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const handleAutoGenerate = async () => {
    if (!transcript && !lectureTitle) return;
    setGeneratingAI(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate 3-5 quiz questions from this lecture content.

Title: ${lectureTitle || "N/A"}
Transcript: ${transcript?.slice(0, 1000) || "Use title to create general questions"}

Create questions with different types (multiple choice, fill-in-blank, short answer).
For fill_in_blank, use _____ to indicate blank.

Return JSON array of questions.`,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_type: { type: "string" },
                question_text: { type: "string" },
                choices: { type: "array", items: { type: "string" } },
                correct_index: { type: "number" },
                correct_answer: { type: "string" },
                source_timestamp: { type: "string" },
              },
            },
          },
        },
      },
    });
    onChange(result.questions || []);
    setGeneratingAI(false);
    if (onAutoGenerate) onAutoGenerate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-gray-700">
          Quiz Questions ({questions.length})
        </Label>
        <div className="flex gap-2">
          {(transcript || lectureTitle) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoGenerate}
              disabled={generatingAI}
              className="text-xs gap-1 rounded-lg"
            >
              {generatingAI ? (
                <div className="w-3 h-3 border-2 border-[#00a98d] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              AI Generate
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addQuestion}
            className="text-xs gap-1 rounded-lg"
          >
            <Plus className="w-3 h-3" />
            Add Question
          </Button>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {questions.map((q, qIdx) => (
          <div
            key={qIdx}
            className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={q.question_type}
                    onValueChange={(val) =>
                      updateQuestion(qIdx, "question_type", val)
                    }
                  >
                    <SelectTrigger className="text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">
                        Multiple Choice
                      </SelectItem>
                      <SelectItem value="fill_in_blank">
                        Fill in Blank
                      </SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Timestamp (e.g., 5:30)"
                    value={q.source_timestamp || ""}
                    onChange={(e) =>
                      updateQuestion(qIdx, "source_timestamp", e.target.value)
                    }
                    className="text-xs rounded-lg"
                  />
                </div>

                <Textarea
                  placeholder="Question text..."
                  value={q.question_text}
                  onChange={(e) =>
                    updateQuestion(qIdx, "question_text", e.target.value)
                  }
                  className="text-sm rounded-lg resize-none h-16"
                />

                {q.question_type === "multiple_choice" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Choices</Label>
                    {q.choices?.map((choice, cIdx) => (
                      <div key={cIdx} className="flex gap-2 items-center">
                        <input
                          type="radio"
                          checked={q.correct_index === cIdx}
                          onChange={() =>
                            updateQuestion(qIdx, "correct_index", cIdx)
                          }
                          className="w-4 h-4 text-[#00a98d]"
                        />
                        <Input
                          placeholder={`Choice ${cIdx + 1}`}
                          value={choice}
                          onChange={(e) =>
                            updateChoice(qIdx, cIdx, e.target.value)
                          }
                          className="text-xs rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {(q.question_type === "fill_in_blank" ||
                  q.question_type === "short_answer") && (
                  <Input
                    placeholder="Correct answer"
                    value={q.correct_answer || ""}
                    onChange={(e) =>
                      updateQuestion(qIdx, "correct_answer", e.target.value)
                    }
                    className="text-sm rounded-lg"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => deleteQuestion(qIdx)}
                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {questions.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-6">
          No questions yet. Add manually or use AI to generate.
        </p>
      )}
    </div>
  );
}
