import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, Play, Trash2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookmarkList({ bookmarks, onDelete }) {
  if (!bookmarks || bookmarks.length === 0) return null;

  const formatTime = (seconds) => {
    return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      {bookmarks.map((bookmark) => (
        <div key={bookmark.id} className="bg-white rounded-xl border border-gray-100 p-4 transition-all hover:border-[#00a98d]/30">
          <div className="flex items-start gap-4">
            <div className="bg-[#00a98d]/10 p-3 rounded-xl flex-shrink-0">
              <Bookmark className="w-5 h-5 text-[#00a98d]" />
            </div>
            <div className="flex-1 min-w-0">
              <Link to={createPageUrl(`CoursePlayer?id=${bookmark.course_id}&time=${bookmark.timestamp_seconds}`)}>
                <h3 className="text-sm font-semibold text-black hover:text-[#00a98d] transition-colors truncate">
                  {bookmark.note || "Bookmarked Moment"}
                </h3>
              </Link>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(bookmark.timestamp_seconds)}</span>
                <span className="flex items-center gap-1"><Play className="w-3 h-3" /> Lecture ID: {bookmark.lecture_id}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link to={createPageUrl(`CoursePlayer?id=${bookmark.course_id}&time=${bookmark.timestamp_seconds}`)}>
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg text-[#00a98d] hover:bg-[#00a98d]/10">
                  <Play className="w-3.5 h-3.5" />
                </Button>
              </Link>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(bookmark.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
