import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import CourseCard from "../components/shared/CourseCard";
import PageSkeleton from "../components/shared/PageSkeleton";
import EmptyState from "../components/shared/EmptyState";
import { BookOpen, PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfessorCourses() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

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

  if (isLoading) return <PageSkeleton variant="catalog" />;

  const filtered = courses.filter((c) => {
    const matchesFilter = filter === "all" || c.status === filter;
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
            <CourseCard key={course.id} course={course} showStatus linkTo={`CourseEditor?id=${course.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
