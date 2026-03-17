import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Bookmark, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BookmarkList({ bookmarks, onDelete }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-8">
        <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No bookmarks yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Link
                to={`${createPageUrl("CoursePlayer")}?id=${bookmark.course_id}&lecture=${bookmark.lecture_id}&t=${bookmark.timestamp_seconds}`}
                className="group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Play className="w-3.5 h-3.5 text-[#00a98d] flex-shrink-0" />
                  <p className="text-sm font-medium text-black group-hover:text-[#00a98d] transition-colors truncate">
                    Lecture Bookmark
                  </p>
                </div>
                {bookmark.timestamp_seconds > 0 && (
                  <Badge variant="outline" className="text-[10px] mb-1">
                    {formatTime(bookmark.timestamp_seconds)}
                  </Badge>
                )}
                {bookmark.note && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {bookmark.note}
                  </p>
                )}
              </Link>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(bookmark.id)}
              className="text-gray-400 hover:text-red-500 p-2 h-auto"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
