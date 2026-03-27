import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Save, RefreshCw, X, CheckCircle } from "lucide-react";

export default function AIGeneratePanel({ lecture, courseId, onClose, onRefresh, userId, userName }) {
  const [generating, setGenerating] = useState(false);
  const [generatingResources, setGeneratingResources] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [resources, setResources] = useState(null);

  const generateResources = async () => {
    setGeneratingResources(true);
    // Stub: Generate placeholder resources based on lecture title
    await new Promise(r => setTimeout(r, 800));
    setResources([
      { title: `${lecture.title} - Wikipedia`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(lecture.title)}`, description: "Comprehensive overview of the topic" },
      { title: `${lecture.title} - Tutorial`, url: "#", description: "Step-by-step tutorial on this topic" },
    ]);
    setGeneratingResources(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    // Stub: Generate placeholder content from lecture info
    await new Promise(r => setTimeout(r, 1000));
    setResult({
      suggested_title: lecture.title || "Untitled Lecture",
      suggested_short_description: `An overview of ${lecture.title || "this topic"}.`,
      suggested_long_description: `This lecture covers the key concepts and fundamentals of ${lecture.title || "the topic"}. Students will learn the core principles and practical applications. The content is designed to build a strong foundation for further study.`,
      suggested_quiz: [
        { question_type: "multiple_choice", question_text: `What is the main topic covered in "${lecture.title}"?`, choices: ["Option A", "Option B", "Option C", "Option D"], correct_index: 0, source_timestamp: "0:00" },
        { question_type: "short_answer", question_text: "Summarize the key takeaway from this lecture.", correct_answer: "Key concepts and their applications" },
      ],
      topic_timestamps: [{ topic: lecture.title || "Main Topic", start: "0:00", end: "10:00" }],
    });
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);

    await supabase.from("lectures").update({
      ai_generated_title: result.suggested_title,
      ai_generated_description: result.suggested_short_description,
      topic_timestamps: result.topic_timestamps || [],
      suggested_resources: resources || [],
      generated_by_ai: true,
    }).eq("id", lecture.id);

    if (result.suggested_quiz?.length > 0) {
      await supabase.from("quizzes").insert({
        course_id: courseId, lecture_id: lecture.id, title: `Quiz: ${lecture.title}`,
        questions: result.suggested_quiz.map(q => ({
          question_type: q.question_type || "multiple_choice", question_text: q.question_text,
          choices: q.choices, correct_index: q.correct_index, correct_answer: q.correct_answer,
          source_timestamp: q.source_timestamp, generated_by_ai: true,
        })),
        total_points: result.suggested_quiz.length * 10,
      });
    }

    await supabase.from("course_revisions").insert({
      course_id: courseId, changed_by_user_id: userId, change_type: "ai_generated",
      change_description: `AI generated content for lecture: ${lecture.title}`,
      snapshot_data: { lecture_id: lecture.id, generated_quiz: result.suggested_quiz?.length || 0 },
    });

    setSaving(false);
    if (onRefresh) onRefresh();
    if (onClose) onClose();
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#00a98d]" /><h3 className="text-sm font-semibold text-black">AI Content Generator</h3></div>
        <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
      </div>

      {!result ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-gray-500 mb-4">Generate title, description, quiz questions, topic timestamps, and external resources from this lecture's content.</p>
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">⚠️ AI generation uses placeholder data. Connect an LLM API for real generation.</p>
          <div className="flex justify-center gap-2">
            <Button onClick={handleGenerate} disabled={generating} className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl gap-2">
              {generating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Generating..." : "Generate Content"}
            </Button>
            <Button onClick={generateResources} disabled={generatingResources} variant="outline" className="rounded-xl gap-2">
              {generatingResources ? <div className="w-4 h-4 border-2 border-[#00a98d] border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generatingResources ? "Finding..." : "Suggest Resources"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200"><Label className="text-xs text-gray-500 mb-1 block">Suggested Title</Label><Input value={result.suggested_title} onChange={(e) => setResult(prev => ({ ...prev, suggested_title: e.target.value }))} className="rounded-lg border-gray-200 text-sm" /></div>
          <div className="bg-white rounded-xl p-4 border border-gray-200"><Label className="text-xs text-gray-500 mb-1 block">Short Description</Label><Textarea value={result.suggested_short_description} onChange={(e) => setResult(prev => ({ ...prev, suggested_short_description: e.target.value }))} className="rounded-lg border-gray-200 text-sm h-16 resize-none" /></div>
          <div className="bg-white rounded-xl p-4 border border-gray-200"><Label className="text-xs text-gray-500 mb-1 block">Long Description</Label><Textarea value={result.suggested_long_description} onChange={(e) => setResult(prev => ({ ...prev, suggested_long_description: e.target.value }))} className="rounded-lg border-gray-200 text-sm h-24 resize-none" /></div>

          {result.suggested_quiz?.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <Label className="text-xs text-gray-500 mb-2 block">Quiz Questions ({result.suggested_quiz.length})</Label>
              <div className="space-y-3">
                {result.suggested_quiz.map((q, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-black mb-2">Q{i + 1}: {q.question_text}</p>
                    <div className="space-y-1">
                      {q.choices?.map((c, j) => (
                        <div key={j} className={`text-xs px-2 py-1 rounded ${j === q.correct_index ? "bg-emerald-50 text-emerald-700 font-medium" : "text-gray-500"}`}>
                          {j === q.correct_index && <CheckCircle className="w-3 h-3 inline mr-1" />}{c}
                        </div>
                      ))}
                    </div>
                    {q.source_timestamp && <Badge variant="outline" className="text-[10px] mt-2">{q.source_timestamp}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.topic_timestamps?.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <Label className="text-xs text-gray-500 mb-2 block">Topic Timestamps</Label>
              <div className="flex flex-wrap gap-2">{result.topic_timestamps.map((t, i) => (<Badge key={i} variant="secondary" className="text-xs">{t.topic} ({t.start} - {t.end})</Badge>))}</div>
            </div>
          )}

          {resources?.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <Label className="text-xs text-gray-500 mb-2 block">External Resources ({resources.length})</Label>
              <div className="space-y-2">
                {resources.map((res, i) => (<div key={i} className="p-2 bg-gray-50 rounded-lg"><a href={res.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#00a98d] hover:underline">{res.title}</a><p className="text-xs text-gray-500 mt-0.5">{res.description}</p></div>))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGenerate} disabled={generating} className="rounded-xl text-sm gap-1"><RefreshCw className="w-3.5 h-3.5" />Regenerate</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl text-sm gap-1">
              {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save & Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
