import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "../utils";
import { Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import LectureForm from "@/components/course/LectureForm";
import BulkLectureActions from "@/components/course/BulkLectureActions";
import CourseHistory from "@/components/course/CourseHistory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft, Plus, Play, FileText, Video, ExternalLink, Trash2, GripVertical, Eye, Globe, Archive,
  Clock, Edit, FolderPlus, FolderOpen, ChevronDown, ChevronRight
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const typeIcons = {
  video: Video, youtube: Play, pdf: FileText,
  slides: FileText, notes: FileText, external_link: ExternalLink,
};

export default function CourseEditor() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedLectures, setSelectedLectures] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const courses = await base44.entities.Course.filter({ id: courseId });
      return courses[0];
    },
    enabled: !!courseId,
  });

  const { data: lectures = [], isLoading: loadingLectures } = useQuery({
    queryKey: ["editor-lectures", courseId],
    queryFn: () => base44.entities.Lecture.filter({ course_id: courseId }, "order_index"),
    enabled: !!courseId,
  });

  const publishMutation = useMutation({
    mutationFn: (status) => base44.entities.Course.update(courseId, { status }),
    onSuccess: () => queryClient.invalidateQueries(["course", courseId]),
  });

  const deleteLectureMutation = useMutation({
    mutationFn: (lectureId) => base44.entities.Lecture.delete(lectureId),
    onSuccess: () => {
      queryClient.invalidateQueries(["editor-lectures", courseId]);
      setSelectedLectures([]);
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ lectureId, newIndex, newSection }) => {
      await base44.entities.Lecture.update(lectureId, {
        order_index: newIndex,
        section_name: newSection,
      });
    },
    onSuccess: () => queryClient.invalidateQueries(["editor-lectures", courseId]),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) {
        await base44.entities.Lecture.delete(id);
      }
      if (user) {
        await base44.entities.CourseRevision.create({
          course_id: courseId,
          changed_by_user_id: user.id,
          change_type: "lecture_deleted",
          change_description: `Deleted ${ids.length} lecture(s) in bulk`,
          snapshot_data: { deleted_ids: ids },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["editor-lectures", courseId]);
      setSelectedLectures([]);
    },
  });

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const sourceSection = result.source.droppableId;
    const destSection = result.destination.droppableId;
    const items = Array.from(lectures);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    for (let i = 0; i < items.length; i++) {
      const newSection = destSection === "no-section" ? null : destSection;
      if (items[i].id === reordered.id) {
        await updateOrderMutation.mutateAsync({
          lectureId: items[i].id,
          newIndex: i,
          newSection,
        });
      } else {
        await base44.entities.Lecture.update(items[i].id, { order_index: i });
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedLectures.length === lectures.length) {
      setSelectedLectures([]);
    } else {
      setSelectedLectures(lectures.map(l => l.id));
    }
  };

  const toggleSection = (section) => {
    if (collapsedSections.includes(section)) {
      setCollapsedSections(collapsedSections.filter(s => s !== section));
    } else {
      setCollapsedSections([...collapsedSections, section]);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!course) return <div className="text-center py-20 text-gray-500">Course not found</div>;

  const sections = ["No Section", ...new Set(lectures.filter(l => l.section_name).map(l => l.section_name))];
  const groupedLectures = sections.reduce((acc, section) => {
    const sectionKey = section === "No Section" ? null : section;
    acc[section] = lectures.filter(l => l.section_name === sectionKey);
    return acc;
  }, {});

  const totalDuration = lectures.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);

  return (
    <div className="max-w-5xl mx-auto">
      <Link to={createPageUrl("ProfessorCourses")} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Courses
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold text-black tracking-tight">{course.title}</h1>
            <Badge className={`text-[10px] ${
              course.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
              course.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {course.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">{course.short_description}</p>
          {totalDuration > 0 && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.floor(totalDuration / 60)}h {totalDuration % 60}m total duration
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link to={createPageUrl(`CourseDetail?id=${courseId}`)}>
            <Button variant="outline" className="rounded-xl gap-2 text-sm">
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          </Link>
          {course.status === "draft" && (
            <Button
              onClick={() => publishMutation.mutate("published")}
              className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl gap-2 text-sm"
              disabled={publishMutation.isPending}
            >
              <Globe className="w-4 h-4" />
              Publish
            </Button>
          )}
          {course.status === "published" && (
            <Button
              variant="outline"
              onClick={() => publishMutation.mutate("archived")}
              className="rounded-xl gap-2 text-sm"
              disabled={publishMutation.isPending}
            >
              <Archive className="w-4 h-4" />
              Archive
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="lectures" className="space-y-4">
        <TabsList className="bg-gray-100 rounded-xl">
          <TabsTrigger value="lectures" className="rounded-lg text-xs">Lectures</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs gap-1">
            <Clock className="w-3 h-3" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lectures" className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-base font-semibold text-black">Course Content</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl gap-2 text-sm">
                    <Plus className="w-4 h-4" />
                    Add Lecture
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Lecture</DialogTitle>
                  </DialogHeader>
                  <LectureForm
                    courseId={courseId}
                    course={course}
                    orderIndex={lectures.length}
                    sections={sections.filter(s => s !== "No Section")}
                    onSaved={() => {
                      queryClient.invalidateQueries(["editor-lectures", courseId]);
                    }}
                    onCancel={() => {}}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {loadingLectures ? (
              <div className="p-6"><LoadingSpinner /></div>
            ) : lectures.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">
                No lectures yet. Add your first lecture to get started.
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-100">
                  <BulkLectureActions
                    lectures={lectures}
                    selectedIds={selectedLectures}
                    onSelectAll={handleSelectAll}
                    onDelete={() => bulkDeleteMutation.mutate(selectedLectures)}
                  />
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                  {sections.map((section) => {
                    const sectionLectures = groupedLectures[section] || [];
                    if (sectionLectures.length === 0 && section === "No Section") return null;
                    const isCollapsed = collapsedSections.includes(section);
                    const sectionDuration = sectionLectures.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);

                    return (
                      <div key={section} className="border-b border-gray-50 last:border-0">
                        {section !== "No Section" && (
                          <div
                            className="flex items-center gap-2 px-6 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => toggleSection(section)}
                          >
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            <FolderOpen className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-semibold text-black">{section}</span>
                            <span className="text-xs text-gray-400">({sectionLectures.length} lectures)</span>
                            {sectionDuration > 0 && (
                              <span className="text-xs text-gray-400 ml-auto">{sectionDuration} min</span>
                            )}
                          </div>
                        )}

                        {!isCollapsed && (
                          <Droppable droppableId={section === "No Section" ? "no-section" : section}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps}>
                                {sectionLectures.map((lecture, idx) => {
                                  const Icon = typeIcons[lecture.type] || FileText;
                                  const isSelected = selectedLectures.includes(lecture.id);
                                  return (
                                    <Draggable key={lecture.id} draggableId={lecture.id} index={lectures.indexOf(lecture)}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                                            snapshot.isDragging ? "bg-blue-50 shadow-lg" : ""
                                          }`}
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                setSelectedLectures([...selectedLectures, lecture.id]);
                                              } else {
                                                setSelectedLectures(selectedLectures.filter(id => id !== lecture.id));
                                              }
                                            }}
                                          />
                                          <div {...provided.dragHandleProps}>
                                            <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                                          </div>
                                          <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Icon className="w-4 h-4 text-gray-400" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-black truncate">{lecture.title}</p>
                                            <p className="text-xs text-gray-400 capitalize">
                                              {lecture.type?.replace("_", " ")}
                                              {lecture.duration_minutes > 0 && ` · ${lecture.duration_minutes} min`}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-[#00a98d]">
                                                  <Edit className="w-4 h-4" />
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                                <DialogHeader>
                                                  <DialogTitle>Edit Lecture</DialogTitle>
                                                </DialogHeader>
                                                <LectureForm
                                                  courseId={courseId}
                                                  course={course}
                                                  existingLecture={lecture}
                                                  orderIndex={lecture.order_index}
                                                  sections={sections.filter(s => s !== "No Section")}
                                                  onSaved={() => {
                                                    queryClient.invalidateQueries(["editor-lectures", courseId]);
                                                  }}
                                                  onCancel={() => {}}
                                                />
                                              </DialogContent>
                                            </Dialog>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-red-500">
                                                  <Trash2 className="w-4 h-4" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Delete Lecture</AlertDialogTitle>
                                                  <AlertDialogDescription>This will permanently delete this lecture. This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => deleteLectureMutation.mutate(lecture.id)} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        )}
                      </div>
                    );
                  })}
                </DragDropContext>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-black mb-4">Course Revision History</h2>
            <CourseHistory courseId={courseId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}