import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, BookOpen, Video } from "lucide-react";

const categoryLabels = {
  computer_science: "Computer Science",
  mathematics: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  engineering: "Engineering",
  business: "Business",
  humanities: "Humanities",
  social_sciences: "Social Sciences",
  arts: "Arts",
  other: "Other",
};

export default function CourseCard({
  course,
  showStatus = false,
  linkTo,
  duration,
}) {
  const target = linkTo || `CourseDetail?id=${course.id}`;

  return (
    <Link to={createPageUrl(target)} className="group block">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
        <div className="h-40 bg-gradient-to-br from-[#00a98d]/20 via-[#00a98d]/10 to-white relative overflow-hidden">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-[#00a98d]/30" />
            </div>
          )}
          {showStatus && (
            <Badge
              className={`absolute top-3 right-3 text-[10px] font-medium ${
                course.status === "published"
                  ? "bg-emerald-100 text-emerald-700"
                  : course.status === "draft"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600"
              }`}
            >
              {course.status}
            </Badge>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="text-[10px] font-medium text-gray-500 border-gray-200"
            >
              {categoryLabels[course.category] || course.category}
            </Badge>
          </div>
          <h3 className="font-semibold text-black text-base leading-snug group-hover:text-[#00a98d] transition-colors line-clamp-2">
            {course.title}
          </h3>
          {course.short_description && (
            <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">
              {course.short_description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
            {duration > 0 ? (
              <span className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5" />
                {Math.floor(duration / 60)}h {duration % 60}m
              </span>
            ) : (
              course.estimated_hours > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {course.estimated_hours}h
                </span>
              )
            )}
            {course.enrollment_count > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {course.enrollment_count}
              </span>
            )}
            {course.professor_name && (
              <span className="ml-auto text-gray-500">
                {course.professor_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
