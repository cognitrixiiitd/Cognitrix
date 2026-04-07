import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import CourseCard from "../components/shared/CourseCard";
import PageSkeleton from "../components/shared/PageSkeleton";
import EmptyState from "../components/shared/EmptyState";
import { BookOpen, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const categories = [
  { value: "all", label: "All Categories" },
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

export default function CourseCatalog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["catalog-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, short_description, category, difficulty_level, tags, professor_name, instructor_rating, enrollment_count, thumbnail_url, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allLectures = [] } = useQuery({
    queryKey: ["all-lectures"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lectures").select("id, course_id, duration_minutes");
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <PageSkeleton variant="catalog" />;

  const filtered = courses
    .filter((c) => {
      const matchesCat = category === "all" || c.category === category;
      const matchesSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.short_description?.toLowerCase().includes(search.toLowerCase());
      const matchesDifficulty =
        difficulty === "all" || c.difficulty_level === difficulty;
      return matchesCat && matchesSearch && matchesDifficulty;
    })
    .sort((a, b) => {
      if (sortBy === "rating")
        return (b.instructor_rating || 0) - (a.instructor_rating || 0);
      if (sortBy === "popular")
        return (b.enrollment_count || 0) - (a.enrollment_count || 0);
      if (sortBy === "difficulty") {
        const order = { beginner: 1, intermediate: 2, advanced: 3 };
        return (
          (order[a.difficulty_level] || 0) - (order[b.difficulty_level] || 0)
        );
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-black tracking-tight">
          Course Catalog
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Discover and enroll in courses
        </p>
      </div>

      <div className="space-y-3 mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-gray-200"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl border-gray-200">
              <SlidersHorizontal className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-40 rounded-xl border-gray-200 text-sm">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 rounded-xl border-gray-200 text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="difficulty">By Difficulty</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />
          <Badge variant="outline" className="text-xs">
            {filtered.length} courses
          </Badge>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses found"
          description={
            search || category !== "all"
              ? "Try adjusting your filters"
              : "No published courses available yet."
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course) => {
            const lectures = allLectures.filter(
              (l) => l.course_id === course.id,
            );
            const duration = lectures.reduce(
              (sum, l) => sum + (l.duration_minutes || 0),
              0,
            );
            return (
              <CourseCard
                key={course.id}
                course={course}
                linkTo={`CourseDetail?id=${course.id}`}
                duration={duration}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
