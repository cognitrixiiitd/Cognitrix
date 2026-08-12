import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "../utils";
import { Link, useNavigate } from "react-router-dom";
import PageSkeleton from "../components/shared/PageSkeleton";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Plus, GripVertical, Eye, Archive, Send, MoreVertical,
  Sparkles, Loader2, Users, X, Crown, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { generateQuizWithAI } from "@/utils/lectureQuizGenerator";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

// ─── Collaborators Panel ─────────────────────────────────────────────────────
function CollaboratorsPanel({ courseId, ownerId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [transferDialog, setTransferDialog] = useState(null); // professor to transfer to
  const [transferring, setTransferring] = useState(false);

  const isOwner = user?.id === ownerId;

  // Fetch current collaborators — two-step with detailed logging
  const {
    data: collaborators = [],
    isLoading,
    error: collaboratorsError,
  } = useQuery({
    queryKey: ["course-collaborators", courseId],
    queryFn: async () => {
      // 1. Fetch collaborator rows
      const { data: rows, error: rowsError } = await supabase
        .from("course_collaborators")
        .select("id, professor_id, added_by, status")
        .eq("course_id", courseId);

      if (rowsError) {
        console.error("❌ course_collaborators fetch error:", rowsError);
        throw rowsError;
      }

      console.log("✅ Collaborator rows:", rows);

      if (!rows || rows.length === 0) {
        return [];
      }

      // 2. Fetch profiles
      const profIds = rows.map((r) => r.professor_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", profIds);

      if (profilesError) {
        console.error("❌ profiles fetch error:", profilesError);
        throw profilesError;
      }

      console.log("✅ Collaborator profiles:", profiles);

      // 3. Map profiles to collaborator rows
      const profileMap = {};
      (profiles || []).forEach((profile) => {
        profileMap[profile.id] = profile;
      });

      return rows.map((row) => ({
        ...row,
        profiles: profileMap[row.professor_id] || null,
      }));
    },
    enabled: !!courseId,
    retry: false,
  });

  // Search professors by name or email
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "professor")
        .neq("id", ownerId) // exclude owner
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);

      // Exclude already-added collaborators
      const existingIds = new Set(collaborators.map((c) => c.professor_id));
      setSearchResults((data || []).filter((p) => !existingIds.has(p.id)));
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  // Add collaborator (sends invitation with pending status)
  const handleAdd = async (prof) => {
    setAddingId(prof.id);
    try {
      const { error } = await supabase.from("course_collaborators").insert({
        course_id: courseId,
        professor_id: prof.id,
        added_by: user.id,
        status: "pending",
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["course-collaborators", courseId] });
      setSearchResults((prev) => prev.filter((p) => p.id !== prof.id));
      toast({ title: "Invitation sent", description: `${prof.full_name} has been invited to collaborate.` });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingId(null);
    }
  };

  // Remove collaborator
  const handleRemove = async (collab) => {
    try {
      const { error } = await supabase
        .from("course_collaborators")
        .delete()
        .eq("id", collab.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["course-collaborators", courseId] });
      toast({ title: `${collab.profiles?.full_name || "Collaborator"} removed` });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Transfer ownership using atomic RPC function
  const handleTransfer = async () => {
    if (!transferDialog) return;
    setTransferring(true);
    try {
      const { error } = await supabase.rpc("transfer_course_ownership", {
        p_course_id: courseId,
        p_new_owner_id: transferDialog.professor_id,
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["editor-course", courseId] });
      await queryClient.invalidateQueries({ queryKey: ["course-collaborators", courseId] });

      setTransferDialog(null);
      toast({
        title: "Ownership transferred",
        description: `${transferDialog.profiles?.full_name} is now the course owner. You've been added as a collaborator.`,
      });
    } catch (err) {
      console.error("Ownership transfer failed:", err);
      toast({
        title: "Transfer failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
      {/* Header — clickable to expand/collapse */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-800">Collaborators</span>
          {collaborators.length > 0 && (
            <Badge variant="outline" className="text-xs">{collaborators.length}</Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-gray-50">

          {/* Current collaborators list */}
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">No collaborators yet.</p>
          ) : (
            <ul className="space-y-2 pt-3">
              {collaborators.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.profiles?.full_name || "—"}</p>
                      <p className="text-xs text-gray-400">{c.profiles?.email || ""}</p>
                    </div>
                    {c.status === "pending" && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 ml-2">
                        Pending Invite
                      </Badge>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex gap-1.5">
                      {c.status === "accepted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                          onClick={() => setTransferDialog(c)}
                        >
                          <Crown className="w-3 h-3" />
                          Make Owner
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => handleRemove(c)}
                        title={c.status === "pending" ? "Cancel Invite" : "Remove Collaborator"}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add collaborator — owner only */}
          {isOwner && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Add Professor</p>
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="rounded-xl text-sm border-gray-200"
              />
              {searching && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
              {searchResults.length > 0 && (
                <ul className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                  {searchResults.map((prof) => (
                    <li key={prof.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{prof.full_name}</p>
                        <p className="text-xs text-gray-400">{prof.email}</p>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-[#00a98d] hover:bg-[#008f77] text-white rounded-lg"
                        disabled={addingId === prof.id}
                        onClick={() => handleAdd(prof)}
                      >
                        {addingId === prof.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No professors found.</p>
              )}
            </div>
          )}

          {/* Info for collaborators */}
          {!isOwner && (
            <p className="text-xs text-gray-400 pt-2">
              You have collaborator access to this course. Contact the course owner to change collaborators.
            </p>
          )}
        </div>
      )}

      {/* Transfer Ownership Dialog */}
      <Dialog open={!!transferDialog} onOpenChange={() => setTransferDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
            <DialogDescription>
              This will make <strong>{transferDialog?.profiles?.full_name}</strong> the new owner of this course.
              You will be added as a collaborator and can still edit the course.
              <br /><br />
              This action cannot be undone without the new owner's cooperation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog(null)}>Cancel</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={transferring}
              onClick={handleTransfer}
            >
              {transferring ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Crown className="w-4 h-4 mr-1" />}
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main CourseEditor ────────────────────────────────────────────────────────
export default function CourseEditor() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generateProgress, setGenerateProgress] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteCourseMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prof-all-courses", user?.id] });
      toast({ title: "Course deleted", description: `"${course?.title}" has been permanently removed.` });
      navigate(createPageUrl("ProfessorCourses"));
    },
    onError: (err) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });
  const { toast } = useToast();

  const openLectureEditor = (lecture = null, tab = "transcript") => {
    const base = createPageUrl(`LectureEditor?courseId=${courseId}`);
    const withLecture = lecture ? `${base}&lectureId=${lecture.id}` : base;
    navigate(tab !== "transcript" ? `${withLecture}&tab=${tab}` : withLecture);
  };

  const handleGenerateAllQuizzes = async () => {
    if (!lectures.length) return;
    setIsGeneratingAll(true);
    let created = 0;
    let skipped = 0;
    try {
      for (const lecture of lectures) {
        setGenerateProgress(`Processing "${lecture.title}"…`);
        const { data: existing } = await supabase.from("quizzes").select("id").eq("lecture_id", lecture.id);
        if (existing && existing.length > 0) { skipped++; continue; }

        const questions = await generateQuizWithAI(lecture);
        if (!questions || questions.length === 0) { skipped++; continue; }

        const { data: newQuiz } = await supabase.from("quizzes").insert({
          course_id: courseId,
          lecture_id: lecture.id,
          title: `Quiz: ${lecture.title}`,
          total_points: questions.length * 10,
        }).select().single();

        if (newQuiz) {
          const toInsert = questions.map((q, i) => ({ ...q, quiz_id: newQuiz.id, order_index: i }));
          await supabase.from("quiz_questions").insert(toInsert);
          created++;
        }
      }
      toast({
        title: `✨ Done! ${created} quiz${created !== 1 ? "zes" : ""} generated`,
        description: skipped > 0 ? `${skipped} lecture${skipped !== 1 ? "s" : ""} already had a quiz or no content — skipped.` : "All lectures now have quizzes.",
      });
    } catch (err) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingAll(false);
      setGenerateProgress("");
    }
  };

  const { data: course, isLoading } = useQuery({
    queryKey: ["editor-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, status, professor_id, professor_name")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: lectures = [] } = useQuery({
    queryKey: ["editor-lectures", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, title, type, order_index, duration_minutes, section_name, source_url, attachments, topic_timestamps, transcript_text, ai_generated_description")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId,
  });

  const statusMutation = useMutation({
    mutationFn: async (status) => {
      const { error } = await supabase.from("courses").update({ status }).eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(["editor-course", courseId]),
  });

  const deleteLectureMutation = useMutation({
    mutationFn: async (lectureId) => {
      const { error } = await supabase.from("lectures").delete().eq("id", lectureId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(["editor-lectures", courseId]),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (lectureIds) => {
      for (const id of lectureIds) {
        await supabase.from("lectures").delete().eq("id", id);
      }
      await supabase.from("course_revisions").insert({
        course_id: courseId,
        changed_by_user_id: user.id,
        change_type: "lecture_deleted",
        change_description: `Deleted ${lectureIds.length} lectures`,
        revision_number: Date.now(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries(["editor-lectures", courseId]),
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(lectures);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    for (let i = 0; i < items.length; i++) {
      await supabase.from("lectures").update({ order_index: i }).eq("id", items[i].id);
    }
    queryClient.invalidateQueries(["editor-lectures", courseId]);
  };

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (!course) return <div className="text-center py-20 text-gray-500">Course not found</div>;

  const isOwner = user?.id === course.professor_id;

  const statusActions = {
    draft: { label: "Publish", icon: Send, action: () => statusMutation.mutate("published") },
    published: { label: "Archive", icon: Archive, action: () => statusMutation.mutate("archived") },
    archived: { label: "Republish", icon: Eye, action: () => statusMutation.mutate("published") },
  };
  const statusAction = statusActions[course.status];

  return (
    <div className="max-w-4xl mx-auto">
      <Link to={createPageUrl("ProfessorCourses")} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />Back to Courses
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-black tracking-tight">{course.title}</h1>
            {!isOwner && (
              <Badge className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                Collaborator
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={course.status === "published" ? "default" : "secondary"} className={`text-xs capitalize ${course.status === "published" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}`}>
              {course.status}
            </Badge>
            <span className="text-xs text-gray-400">{lectures.length} lectures</span>
            {!isOwner && (
              <span className="text-xs text-gray-400">by {course.professor_name || "another professor"}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl(`CoursePlayer?id=${courseId}`)}>
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1">
              <Eye className="w-3.5 h-3.5" />Preview as Student
            </Button>
          </Link>
          {statusAction && (
            <Button size="sm" onClick={statusAction.action} disabled={statusMutation.isPending} className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl text-xs gap-1">
              <statusAction.icon className="w-3.5 h-3.5" />{statusAction.label}
            </Button>
          )}
          {isOwner && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="rounded-xl text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-3.5 h-3.5" />Delete
            </Button>
          )}
        </div>
      </div>

      {/* Collaborators panel */}
      <CollaboratorsPanel courseId={courseId} ownerId={course.professor_id} />

      {/* Lectures panel */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-black">Lectures</h2>
          <div className="flex gap-2">
            {lectures.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateAllQuizzes}
                disabled={isGeneratingAll}
                className="rounded-xl text-xs gap-1.5 border-[#00a98d]/40 text-[#00a98d] hover:bg-[#00a98d]/5"
              >
                {isGeneratingAll
                  ? <><Loader2 className="w-3 h-3 animate-spin" />{generateProgress || "Generating…"}</>
                  : <><Sparkles className="w-3 h-3" />Generate All Quizzes</>
                }
              </Button>
            )}
            <Button size="sm" onClick={() => openLectureEditor()} className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl text-xs gap-1">
              <Plus className="w-3.5 h-3.5" />Add Lecture
            </Button>
          </div>
        </div>

        {lectures.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No lectures yet. Add your first lecture or use AI to generate content.</p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="lectures">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {lectures.map((lecture, index) => (
                    <Draggable key={lecture.id} draggableId={lecture.id} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                          <div {...provided.dragHandleProps}><GripVertical className="w-4 h-4 text-gray-300" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black truncate">{lecture.title}</p>
                            <p className="text-xs text-gray-400 capitalize">{lecture.type?.replace("_", " ")}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openLectureEditor(lecture, "transcript")}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openLectureEditor(lecture, "quiz")}>Add Quiz</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => deleteLectureMutation.mutate(lecture.id)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Delete Course Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{course.title}"</strong>?
              <br /><br />
              This action cannot be undone. All lectures, quizzes, attachments, and student enrollment records will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteCourseMutation.isPending}
              onClick={() => deleteCourseMutation.mutate()}
            >
              {deleteCourseMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              Delete Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
