import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ManualQuizBuilder from "./ManualQuizBuilder";
import VideoSegmentBuilder from "./VideoSegmentBuilder";
import { Upload, Link as LinkIcon, Save, X, Sparkles, FileText, Video } from "lucide-react";

export default function LectureForm({ courseId, orderIndex, onSaved, onCancel, course, existingLecture, sections = [] }) {
  const { user, profile } = useAuth();
  const [form, setForm] = useState(existingLecture ? {
    title: existingLecture.title || "", type: existingLecture.type || "youtube", source_url: existingLecture.source_url || "",
    transcript_text: existingLecture.transcript_text || "", attachments: existingLecture.attachments || [],
    section_name: existingLecture.section_name || "", duration_minutes: existingLecture.duration_minutes || 0,
  } : { title: "", type: "youtube", source_url: "", transcript_text: "", attachments: [], section_name: "", duration_minutes: 0 });
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [videoSegments, setVideoSegments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingTranscript, setGeneratingTranscript] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    // Upload to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from("lecture-files").upload(fileName, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from("lecture-files").getPublicUrl(fileName);
      setForm(prev => ({ ...prev, source_url: urlData.publicUrl, type: file.type.includes("video") ? "video" : "pdf" }));
    }
    setUploading(false);
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from("lecture-files").upload(`attachments/${fileName}`, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from("lecture-files").getPublicUrl(`attachments/${fileName}`);
      setForm(prev => ({ ...prev, attachments: [...prev.attachments, { name: file.name, url: urlData.publicUrl }] }));
    }
  };

  const removeAttachment = (index) => setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));

  const generateTranscript = async () => {
    if (!form.source_url) return;
    setGeneratingTranscript(true);
    // Stub placeholder
    await new Promise(r => setTimeout(r, 600));
    setForm(prev => ({ ...prev, transcript_text: `[Transcript placeholder for "${form.title || "Untitled"}"]\n\nPaste the actual transcript here or connect an AI transcription service.` }));
    setGeneratingTranscript(false);
  };

  const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    return parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : parseInt(timeStr);
  };

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);

    if (existingLecture) {
      await supabase.from("lectures").update(form).eq("id", existingLecture.id);
      if (quizQuestions.length > 0) {
        const { data: existingQuizzes } = await supabase.from("quizzes").select("*").eq("lecture_id", existingLecture.id);
        if (existingQuizzes?.length > 0) {
          await supabase.from("quizzes").update({ questions: quizQuestions, total_points: quizQuestions.length * 10 }).eq("id", existingQuizzes[0].id);
        } else {
          await supabase.from("quizzes").insert({ course_id: courseId, lecture_id: existingLecture.id, title: `Quiz: ${form.title}`, questions: quizQuestions, total_points: quizQuestions.length * 10 });
        }
      }
      await supabase.from("course_revisions").insert({ course_id: courseId, changed_by_user_id: user.id, change_type: "manual_edit", change_description: `Updated lecture: ${form.title}`, snapshot_data: { lecture_id: existingLecture.id } });
      setSaving(false); onSaved(); return;
    }

    if (videoSegments.length > 0 && (form.type === "youtube" || form.type === "video")) {
      for (let i = 0; i < videoSegments.length; i++) {
        const seg = videoSegments[i]; const startSec = timeToSeconds(seg.start_time); const endSec = timeToSeconds(seg.end_time);
        const segmentUrl = form.type === "youtube" ? `${form.source_url}&t=${startSec}s` : form.source_url;
        const { data: lecture } = await supabase.from("lectures").insert({
          title: seg.title || `${form.title} - Part ${i + 1}`, type: form.type, source_url: segmentUrl,
          transcript_text: form.transcript_text, course_id: courseId, order_index: orderIndex + i,
          section_name: form.section_name, duration_minutes: Math.ceil((endSec - startSec) / 60),
          topic_timestamps: [{ topic: seg.title, start: seg.start_time, end: seg.end_time }], attachments: form.attachments,
        }).select().single();
        if (lecture && quizQuestions.length > 0) {
          await supabase.from("quizzes").insert({ course_id: courseId, lecture_id: lecture.id, title: `Quiz: ${seg.title || form.title}`, questions: quizQuestions, total_points: quizQuestions.length * 10 });
        }
      }
      await supabase.from("course_revisions").insert({ course_id: courseId, changed_by_user_id: user.id, change_type: "lecture_added", change_description: `Added ${videoSegments.length} lecture segments from: ${form.title}`, snapshot_data: { segments: videoSegments.length } });
    } else {
      const { data: lecture } = await supabase.from("lectures").insert({ ...form, course_id: courseId, order_index: orderIndex }).select().single();
      if (lecture && quizQuestions.length > 0) {
        await supabase.from("quizzes").insert({ course_id: courseId, lecture_id: lecture.id, title: `Quiz: ${form.title}`, questions: quizQuestions, total_points: quizQuestions.length * 10 });
      }
      await supabase.from("course_revisions").insert({ course_id: courseId, changed_by_user_id: user.id, change_type: "lecture_added", change_description: `Added lecture: ${form.title}`, snapshot_data: { lecture_title: form.title, lecture_type: form.type, quiz_questions: quizQuestions.length } });
    }
    setSaving(false); onSaved();
  };

  const isVideoType = form.type === "youtube" || form.type === "video";

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-black">Add New Lecture</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label className="text-xs text-gray-500 mb-1 block">Title *</Label><Input placeholder="Lecture title" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} className="rounded-xl border-gray-200 text-sm" /></div>
        <div><Label className="text-xs text-gray-500 mb-1 block">Content Type</Label>
          <Select value={form.type} onValueChange={(v) => setForm(prev => ({ ...prev, type: v }))}><SelectTrigger className="rounded-xl border-gray-200 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="youtube">YouTube Video</SelectItem><SelectItem value="video">Video Upload</SelectItem><SelectItem value="pdf">PDF / Document</SelectItem><SelectItem value="slides">Slides</SelectItem><SelectItem value="notes">Notes</SelectItem><SelectItem value="external_link">External Link</SelectItem></SelectContent></Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label className="text-xs text-gray-500 mb-1 block">Section (optional)</Label><Input placeholder="e.g., Week 1: Introduction" value={form.section_name || ""} onChange={(e) => setForm(prev => ({ ...prev, section_name: e.target.value }))} className="rounded-xl border-gray-200 text-sm" list="section-suggestions" /><datalist id="section-suggestions">{sections.map(s => (<option key={s} value={s} />))}</datalist></div>
        <div><Label className="text-xs text-gray-500 mb-1 block">Duration (minutes)</Label><Input type="number" min="0" value={form.duration_minutes} onChange={(e) => setForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))} className="rounded-xl border-gray-200 text-sm" disabled={videoSegments.length > 0} /></div>
      </div>

      {(form.type === "youtube" || form.type === "external_link") && (
        <div><Label className="text-xs text-gray-500 mb-1 block">URL</Label><div className="relative"><LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" /><Input placeholder={form.type === "youtube" ? "https://youtube.com/watch?v=..." : "https://..."} value={form.source_url} onChange={(e) => setForm(prev => ({ ...prev, source_url: e.target.value }))} className="pl-9 rounded-xl border-gray-200 text-sm" /></div></div>
      )}

      {(form.type === "video" || form.type === "pdf" || form.type === "slides") && (
        <div><Label className="text-xs text-gray-500 mb-1 block">Upload File</Label>
          <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#00a98d] transition-colors">
            <Upload className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-500">{uploading ? "Uploading..." : form.source_url ? "File uploaded ✓" : "Click to upload a file"}</span>
            <input type="file" className="hidden" onChange={handleFileUpload} accept={form.type === "video" ? "video/*" : ".pdf,.pptx,.ppt"} />
          </label>
        </div>
      )}

      <div><Label className="text-xs text-gray-500 mb-1 block">Attachments (optional)</Label>
        <div className="space-y-2">
          {form.attachments.map((att, idx) => (<div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"><FileText className="w-4 h-4 text-gray-400" /><span className="text-xs text-gray-700 flex-1">{att.name}</span><button type="button" onClick={() => removeAttachment(idx)} className="text-xs text-red-500 hover:underline">Remove</button></div>))}
          <label className="flex items-center gap-2 p-3 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[#00a98d] transition-colors text-sm text-gray-500"><Upload className="w-4 h-4" />Add attachment<input type="file" className="hidden" onChange={handleAttachmentUpload} /></label>
        </div>
      </div>

      <Tabs defaultValue="transcript" className="space-y-4">
        <TabsList className="bg-gray-100 rounded-xl"><TabsTrigger value="transcript" className="rounded-lg text-xs">Transcript</TabsTrigger>{isVideoType && <TabsTrigger value="segments" className="rounded-lg text-xs gap-1"><Video className="w-3 h-3" />Segments</TabsTrigger>}<TabsTrigger value="quiz" className="rounded-lg text-xs">Quiz</TabsTrigger></TabsList>
        <TabsContent value="transcript" className="space-y-3">
          <div className="flex items-center justify-between"><Label className="text-sm text-gray-700">Transcript</Label><Button type="button" variant="outline" size="sm" onClick={generateTranscript} disabled={generatingTranscript || !form.source_url} className="text-xs gap-1 rounded-lg">{generatingTranscript ? <div className="w-3 h-3 border-2 border-[#00a98d] border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}AI Generate</Button></div>
          <Textarea placeholder="Paste transcript here or use AI to generate a template..." value={form.transcript_text} onChange={(e) => setForm(prev => ({ ...prev, transcript_text: e.target.value }))} className="rounded-xl border-gray-200 text-sm h-32 resize-none" />
        </TabsContent>
        {isVideoType && <TabsContent value="segments"><VideoSegmentBuilder segments={videoSegments} onChange={setVideoSegments} videoUrl={form.source_url} /></TabsContent>}
        <TabsContent value="quiz"><ManualQuizBuilder questions={quizQuestions} onChange={setQuizQuestions} transcript={form.transcript_text} lectureTitle={form.title} /></TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel} className="rounded-xl text-sm gap-1"><X className="w-3.5 h-3.5" />Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !form.title} className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl text-sm gap-1">
          {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {existingLecture ? "Update Lecture" : videoSegments.length > 0 ? `Save ${videoSegments.length} Lectures` : "Save Lecture"}
        </Button>
      </div>
    </div>
  );
}
