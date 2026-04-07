import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "../utils";
import { Link } from "react-router-dom";
import PageSkeleton from "../components/shared/PageSkeleton";
import LectureForm from "@/components/course/LectureForm";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, GripVertical, Eye, Archive, Send, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function CourseEditor() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [showLectureForm, setShowLectureForm] = useState(false);
  const [editingLecture, setEditingLecture] = useState(null);
  const [lectureFormTab, setLectureFormTab] = useState("transcript");

  const { data: course, isLoading } = useQuery({
    queryKey: ["editor-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title, status, professor_id").eq("id", courseId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: lectures = [] } = useQuery({
    queryKey: ["editor-lectures", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lectures").select("id, title, type, order_index, duration_minutes, section_name, source_url, attachments, topic_timestamps, transcript_text").eq("course_id", courseId).order("order_index");
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

  const statusActions = {
    draft: { label: "Publish", icon: Send, action: () => statusMutation.mutate("published") },
    published: { label: "Archive", icon: Archive, action: () => statusMutation.mutate("archived") },
    archived: { label: "Republish", icon: Eye, action: () => statusMutation.mutate("published") },
  };
  const statusAction = statusActions[course.status];

  return (
    <div className="max-w-4xl mx-auto">
      <Link to={createPageUrl("ProfessorCourses")} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6 transition-colors"><ArrowLeft className="w-4 h-4" />Back to Courses</Link>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">{course.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={course.status === "published" ? "default" : "secondary"} className={`text-xs capitalize ${course.status === "published" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}`}>{course.status}</Badge>
            <span className="text-xs text-gray-400">{lectures.length} lectures</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl(`CoursePlayer?id=${courseId}`)}><Button variant="outline" size="sm" className="rounded-xl text-xs gap-1"><Eye className="w-3.5 h-3.5" />Preview as Student</Button></Link>
          {statusAction && (<Button size="sm" onClick={statusAction.action} disabled={statusMutation.isPending} className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl text-xs gap-1"><statusAction.icon className="w-3.5 h-3.5" />{statusAction.label}</Button>)}
        </div>
      </div>



      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-black">Lectures</h2>
          <Button size="sm" onClick={() => { setEditingLecture(null); setShowLectureForm(true); }} className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl text-xs gap-1"><Plus className="w-3.5 h-3.5" />Add Lecture</Button>
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
                              <DropdownMenuItem onClick={() => { setEditingLecture(lecture); setLectureFormTab("transcript"); setShowLectureForm(true); }}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingLecture(lecture); setLectureFormTab("quiz"); setShowLectureForm(true); }}>Add Quiz</DropdownMenuItem>
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

      {showLectureForm && (<LectureForm courseId={courseId} existingLecture={editingLecture} course={course} orderIndex={lectures.length} defaultTab={lectureFormTab} onCancel={() => { setShowLectureForm(false); setEditingLecture(null); }} onSaved={() => { queryClient.invalidateQueries(["editor-lectures", courseId]); setShowLectureForm(false); setEditingLecture(null); }} />)}
    </div>
  );
}