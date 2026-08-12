import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import CourseCard from "../components/shared/CourseCard";
import PageSkeleton from "../components/shared/PageSkeleton";
import EmptyState from "../components/shared/EmptyState";
import { BookOpen, PlusCircle, Search, Play, Users, Check, X, Mail, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

export default function ProfessorCourses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [respondingId, setRespondingId] = useState(null);
  const [deleteCourse, setDeleteCourse] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // My own courses
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["prof-all-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, status, thumbnail_url, short_description, category, enrollment_count, created_at")
        .eq("professor_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Pending collaboration invitations
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ["prof-pending-invites", user?.id],
    queryFn: async () => {
      // 1. Try SECURITY DEFINER RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_my_pending_invitations");
      if (!rpcError && rpcData && rpcData.length > 0) {
        return rpcData;
      }

      // 2. Fallback: direct table query
      const { data: directData, error: directError } = await supabase
        .from("course_collaborators")
        .select("id, course_id, status, courses(id, title, professor_name)")
        .eq("professor_id", user.id)
        .eq("status", "pending");

      if (directError || !directData) return rpcData || [];
      return directData.map((r) => ({
        id: r.id,
        course_id: r.course_id,
        status: r.status,
        course_title: r.courses?.title,
        professor_name: r.courses?.professor_name,
      }));
    },
    enabled: !!user?.id,
  });

  // Courses shared with me (accepted collaborators only)
  const { data: sharedCourses = [], isLoading: isLoadingShared } = useQuery({
    queryKey: ["prof-shared-courses", user?.id],
    queryFn: async () => {
      // Step 1: get course IDs where I am an ACCEPTED collaborator
      const { data: collabRows, error: collabError } = await supabase
        .from("course_collaborators")
        .select("course_id")
        .eq("professor_id", user.id)
        .eq("status", "accepted");
      if (collabError || !collabRows || collabRows.length === 0) return [];

      const courseIds = collabRows.map((r) => r.course_id);

      // Step 2: fetch those courses directly
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("id, title, status, thumbnail_url, short_description, category, enrollment_count, created_at, professor_name")
        .in("id", courseIds);
      if (courseError) return [];
      return courseData || [];
    },
    enabled: !!user?.id,
    retry: false,
  });

  const handleAcceptInvite = async (invite) => {
    setRespondingId(invite.id);

    try {
      const { error } = await supabase.rpc("accept_course_invitation", {
        p_collaboration_id: invite.id,
      });

      if (error) throw error;

      await queryClient.invalidateQueries({
        queryKey: ["prof-pending-invites", user?.id],
      });

      await queryClient.invalidateQueries({
        queryKey: ["prof-shared-courses", user?.id],
      });

      toast({
        title: "Invitation accepted!",
        description: `You are now a collaborator on "${invite.course_title || "the course"}".`,
      });
    } catch (err) {
      console.error("Accept invitation failed:", err);

      toast({
        title: "Error accepting invite",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRespondingId(null);
    }
  };

  const handleDeclineInvite = async (invite) => {
    setRespondingId(invite.id);

    try {
      const { error } = await supabase.rpc("decline_course_invitation", {
        p_collaboration_id: invite.id,
      });

      if (error) throw error;

      await queryClient.invalidateQueries({
        queryKey: ["prof-pending-invites", user?.id],
      });

      toast({
        title: "Invitation declined",
      });
    } catch (err) {
      console.error("Decline invitation failed:", err);

      toast({
        title: "Error declining invite",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRespondingId(null);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteCourse) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", deleteCourse.id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["prof-all-courses", user?.id] });
      toast({
        title: "Course deleted",
        description: `"${deleteCourse.title}" has been permanently deleted.`,
      });
      setDeleteCourse(null);
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <PageSkeleton variant="catalog" />;

  const filtered = courses.filter((c) => {
    const matchesFilter = filter === "all" || c.status === filter;
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredShared = sharedCourses.filter((c) =>
    !search || c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-semibold text-black tracking-tight">My Courses</h1>
        <Link to={createPageUrl("CreateCourse")}>
          <Button className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl gap-2">
            <PlusCircle className="w-4 h-4" />New Course
          </Button>
        </Link>
      </div>

      {/* Pending Collaboration Invitations Banner */}
      {pendingInvites.length > 0 && (
        <div className="mb-8 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-semibold text-amber-900">
              Pending Collaboration Invitations ({pendingInvites.length})
            </h2>
          </div>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-amber-100 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {invite.course_title || invite.courses?.title || "Untitled Course"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Invited by {invite.professor_name || invite.courses?.professor_name || "another professor"}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-[#00a98d] hover:bg-[#008f77] text-white gap-1 rounded-lg"
                    disabled={respondingId === invite.id}
                    onClick={() => handleAcceptInvite(invite)}
                  >
                    {respondingId === invite.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-gray-600 border-gray-200 hover:bg-gray-50 gap-1 rounded-lg"
                    disabled={respondingId === invite.id}
                    onClick={() => handleDeclineInvite(invite)}
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl border-gray-200" />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-gray-100 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg text-xs">All ({courses.length})</TabsTrigger>
            <TabsTrigger value="published" className="rounded-lg text-xs">Published</TabsTrigger>
            <TabsTrigger value="draft" className="rounded-lg text-xs">Draft</TabsTrigger>
            <TabsTrigger value="archived" className="rounded-lg text-xs">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Own courses */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={search ? "No courses found" : "No courses yet"}
          description={search ? "Try a different search term" : "Create your first course to get started."}
          actionLabel={!search ? "Create Course" : undefined}
          onAction={!search ? () => (window.location.href = createPageUrl("CreateCourse")) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <div key={course.id} className="space-y-2">
              <CourseCard course={course} showStatus linkTo={`CourseEditor?id=${course.id}`} />
              <div className="flex gap-2">
                <Link to={createPageUrl(`CoursePlayer?id=${course.id}`)} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full rounded-xl text-xs gap-1">
                    <Play className="w-3.5 h-3.5" />Preview
                  </Button>
                </Link>
                <Link to={createPageUrl(`CourseEditor?id=${course.id}`)} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full rounded-xl text-xs">Edit</Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border-gray-200"
                  onClick={() => setDeleteCourse(course)}
                  title="Delete Course"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shared with me */}
      {!isLoadingShared && filteredShared.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-700">Shared With Me</h2>
            <Badge variant="outline" className="text-xs">{filteredShared.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShared.map((course) => (
              <div key={course.id} className="space-y-2">
                <div className="relative">
                  <CourseCard course={course} showStatus linkTo={`CourseEditor?id=${course.id}`} />
                  <div className="absolute top-2 right-2">
                    <Badge className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                      Collaborator
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-400 px-1">by {course.professor_name || "another professor"}</p>
                <div className="flex gap-2">
                  <Link to={createPageUrl(`CoursePlayer?id=${course.id}`)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full rounded-xl text-xs gap-1">
                      <Play className="w-3.5 h-3.5" />Preview
                    </Button>
                  </Link>
                  <Link to={createPageUrl(`CourseEditor?id=${course.id}`)} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full rounded-xl text-xs">Edit</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Course Dialog */}
      <Dialog open={!!deleteCourse} onOpenChange={() => setDeleteCourse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{deleteCourse?.title}"</strong>?
              <br /><br />
              This action cannot be undone. All lectures, quizzes, attachments, and student enrollment records associated with this course will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCourse(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
              onClick={handleDeleteCourse}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Delete Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
