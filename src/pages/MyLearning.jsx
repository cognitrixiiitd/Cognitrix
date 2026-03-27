import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import BookmarkList from "@/components/player/BookmarkList";
import { BookOpen, GraduationCap, Trash2, Play, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function MyLearning() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("*").eq("student_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const courseIds = enrollments.map((e) => e.course_id);
  const { data: courses = [] } = useQuery({
    queryKey: ["my-courses", courseIds.join(",")],
    queryFn: async () => {
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase.from("courses").select("*").in("id", courseIds);
      if (error) throw error;
      return data || [];
    },
    enabled: courseIds.length > 0,
  });

  const { data: bookmarks = [] } = useQuery({
    queryKey: ["my-bookmarks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookmarks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: learningPaths = [] } = useQuery({
    queryKey: ["my-paths", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_paths").select("*").eq("student_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("bookmarks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(["my-bookmarks"]),
  });

  const unenrollMutation = useMutation({
    mutationFn: async (enrollmentId) => {
      const { error } = await supabase.from("enrollments").delete().eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(["my-enrollments"]),
  });

  if (isLoading) return <LoadingSpinner />;

  const activeCourses = enrollments.filter((e) => e.status === "active");
  const completedCourses = enrollments.filter((e) => e.status === "completed");

  const renderCourseCard = (enrollment) => {
    const course = courses.find((c) => c.id === enrollment.course_id);
    if (!course) return null;
    return (
      <div key={enrollment.id} className="bg-white rounded-2xl border border-gray-100 p-5">
        <Link to={createPageUrl(`CoursePlayer?id=${course.id}`)}>
          <h3 className="text-sm font-semibold text-black hover:text-[#00a98d] transition-colors">{course.title}</h3>
        </Link>
        <p className="text-xs text-gray-400 mt-1">{course.professor_name}</p>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{enrollment.progress_percent || 0}% complete</span>
            <span>{enrollment.time_spent_minutes || 0} min</span>
          </div>
          <Progress value={enrollment.progress_percent || 0} className="h-1.5" />
        </div>
        <div className="flex gap-2 mt-3">
          <Link to={createPageUrl(`CoursePlayer?id=${course.id}`)} className="flex-1">
            <Button size="sm" className="w-full bg-[#00a98d] hover:bg-[#008f77] text-white rounded-lg text-xs gap-1"><Play className="w-3 h-3" />Continue</Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={() => unenrollMutation.mutate(enrollment.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-black tracking-tight mb-8">My Learning</h1>
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="bg-gray-100 rounded-xl">
          <TabsTrigger value="active" className="rounded-lg text-xs">In Progress ({activeCourses.length})</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg text-xs">Completed ({completedCourses.length})</TabsTrigger>
          <TabsTrigger value="bookmarks" className="rounded-lg text-xs">Bookmarks ({bookmarks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeCourses.length === 0 ? (
            <EmptyState icon={BookOpen} title="No active courses" description="Browse the catalog to find courses." actionLabel="Browse Courses" onAction={() => (window.location.href = createPageUrl("CourseCatalog"))} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{activeCourses.map(renderCourseCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedCourses.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No completed courses" description="Complete your first course to see it here." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{completedCourses.map(renderCourseCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="bookmarks">
          {bookmarks.length === 0 ? (
            <EmptyState icon={BookOpen} title="No bookmarks" description="Bookmark moments in lectures to revisit later." />
          ) : (
            <BookmarkList bookmarks={bookmarks} onDelete={(id) => deleteBookmarkMutation.mutate(id)} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
