import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, Save, Upload } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { value: "computer_science", label: "Computer Science" },
  { value: "mathematics", label: "Mathematics" },
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
  { value: "biology", label: "Biology" },
  { value: "engineering", label: "Engineering" },
  { value: "business", label: "Business" },
  { value: "humanities", label: "Humanities" },
  { value: "social_sciences", label: "Social Sciences" },
  { value: "arts", label: "Arts" },
  { value: "other", label: "Other" },
];

export default function CreateCourse() {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [outcomeInput, setOutcomeInput] = useState("");
  const [prereqInput, setPrereqInput] = useState("");
  const [form, setForm] = useState({
    title: "", short_description: "", long_description: "", category: "",
    tags: [], learning_outcomes: [], prerequisites: [],
    estimated_hours: 0, credits: 0, auto_enroll: true, status: "draft", thumbnail_url: "",
  });

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const addToArray = (field, value, setter) => { if (value.trim()) { updateField(field, [...form[field], value.trim()]); setter(""); } };
  const removeFromArray = (field, index) => updateField(field, form[field].filter((_, i) => i !== index));

  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingThumbnail(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    
    const { error } = await supabase.storage.from("thumbnails").upload(filePath, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(filePath);
      if (urlData) updateField("thumbnail_url", urlData.publicUrl);
    } else {
      console.error("Thumbnail upload failed:", error);
    }
    setUploadingThumbnail(false);
  };

  const handleSave = async () => {
    if (!form.title || !form.category) return;
    setSaving(true);
    const { data: course, error } = await supabase.from("courses").insert({
      ...form,
      professor_id: user.id,
      professor_name: profile?.full_name,
    }).select().single();
    if (!error && course) {
      window.location.href = createPageUrl(`CourseEditor?id=${course.id}`);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link to={createPageUrl("ProfessorDashboard")} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6 transition-colors"><ArrowLeft className="w-4 h-4" />Back to Dashboard</Link>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-black tracking-tight">Create New Course</h1>
        <p className="text-sm text-gray-500 mt-1">Set up your course basics, then add lectures and content</p>
      </div>
      <div className="space-y-8">
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-black mb-5">Basic Information</h2>
          <div className="space-y-5">
            <div><Label className="text-sm text-gray-600 mb-1.5 block">Course Title *</Label><Input placeholder="e.g., Introduction to Machine Learning" value={form.title} onChange={(e) => updateField("title", e.target.value)} className="rounded-xl border-gray-200 focus:border-[#00a98d] focus:ring-[#00a98d]/20" /></div>
            <div><Label className="text-sm text-gray-600 mb-1.5 block">Category *</Label><Select value={form.category} onValueChange={(v) => updateField("category", v)}><SelectTrigger className="rounded-xl border-gray-200"><SelectValue placeholder="Select a category" /></SelectTrigger><SelectContent>{categories.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent></Select></div>
            <div><Label className="text-sm text-gray-600 mb-1.5 block">Short Description</Label><Textarea placeholder="Brief course overview (max 100 words)" value={form.short_description} onChange={(e) => updateField("short_description", e.target.value)} className="rounded-xl border-gray-200 h-20 resize-none" /></div>
            <div><Label className="text-sm text-gray-600 mb-1.5 block">Detailed Description</Label><Textarea placeholder="Full course description" value={form.long_description} onChange={(e) => updateField("long_description", e.target.value)} className="rounded-xl border-gray-200 h-32 resize-none" /></div>
            <div>
              <Label className="text-sm text-gray-600 mb-1.5 block">Course Thumbnail (Optional)</Label>
              <div className="flex items-center gap-4">
                {form.thumbnail_url && <img src={form.thumbnail_url} alt="Thumbnail preview" className="w-24 h-16 object-cover rounded-lg border border-gray-200" />}
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
                  {uploadingThumbnail ? <div className="w-4 h-4 border-2 border-[#00a98d] border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
                  {uploadingThumbnail ? "Uploading..." : form.thumbnail_url ? "Change Thumbnail" : "Upload Thumbnail"}
                  <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailUpload} disabled={uploadingThumbnail} />
                </label>
              </div>
            </div>
          </div>
        </section>
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-black mb-5">Tags</h2>
          <div className="flex gap-2">
            <Input placeholder="Add a tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("tags", tagInput, setTagInput))} className="rounded-xl border-gray-200" />
            <Button variant="outline" onClick={() => addToArray("tags", tagInput, setTagInput)} className="rounded-xl"><Plus className="w-4 h-4" /></Button>
          </div>
          {form.tags.length > 0 && (<div className="flex flex-wrap gap-2 mt-3">{form.tags.map((tag, i) => (<Badge key={i} variant="secondary" className="px-3 py-1 bg-gray-50 text-gray-600 gap-1">{tag}<button onClick={() => removeFromArray("tags", i)}><X className="w-3 h-3" /></button></Badge>))}</div>)}
        </section>
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-black mb-5">Learning Outcomes</h2>
          <div className="flex gap-2">
            <Input placeholder="Students will be able to..." value={outcomeInput} onChange={(e) => setOutcomeInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("learning_outcomes", outcomeInput, setOutcomeInput))} className="rounded-xl border-gray-200" />
            <Button variant="outline" onClick={() => addToArray("learning_outcomes", outcomeInput, setOutcomeInput)} className="rounded-xl"><Plus className="w-4 h-4" /></Button>
          </div>
          {form.learning_outcomes.length > 0 && (<ul className="mt-3 space-y-2">{form.learning_outcomes.map((o, i) => (<li key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2"><span className="flex-1">{o}</span><button onClick={() => removeFromArray("learning_outcomes", i)}><X className="w-3.5 h-3.5 text-gray-400" /></button></li>))}</ul>)}
        </section>
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-black mb-5">Prerequisites</h2>
          <div className="flex gap-2">
            <Input placeholder="e.g., Basic Python knowledge" value={prereqInput} onChange={(e) => setPrereqInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("prerequisites", prereqInput, setPrereqInput))} className="rounded-xl border-gray-200" />
            <Button variant="outline" onClick={() => addToArray("prerequisites", prereqInput, setPrereqInput)} className="rounded-xl"><Plus className="w-4 h-4" /></Button>
          </div>
          {form.prerequisites.length > 0 && (<ul className="mt-3 space-y-2">{form.prerequisites.map((p, i) => (<li key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2"><span className="flex-1">{p}</span><button onClick={() => removeFromArray("prerequisites", i)}><X className="w-3.5 h-3.5 text-gray-400" /></button></li>))}</ul>)}
        </section>
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-black mb-5">Course Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><Label className="text-sm text-gray-600 mb-1.5 block">Estimated Hours</Label><Input type="number" min="0" value={form.estimated_hours} onChange={(e) => updateField("estimated_hours", parseFloat(e.target.value) || 0)} className="rounded-xl border-gray-200" /></div>
            <div><Label className="text-sm text-gray-600 mb-1.5 block">Credits</Label><Input type="number" min="0" value={form.credits} onChange={(e) => updateField("credits", parseFloat(e.target.value) || 0)} className="rounded-xl border-gray-200" /></div>
          </div>
        </section>
        <div className="flex justify-end gap-3 pb-8">
          <Link to={createPageUrl("ProfessorDashboard")}><Button variant="outline" className="rounded-xl">Cancel</Button></Link>
          <Button onClick={handleSave} disabled={saving || !form.title || !form.category} className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl gap-2 px-6">{saving ? (<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />) : (<Save className="w-4 h-4" />)}Create Course</Button>
        </div>
      </div>
    </div>
  );
}
