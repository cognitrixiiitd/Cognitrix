import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function VideoNotes({ user, courseId, lectureId, currentTime }) {
  const [showForm, setShowForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ["lecture-notes", lectureId, user?.id],
    queryFn: async () => {
      const bookmarks = await base44.entities.Bookmark.filter({
        user_id: user.id,
        lecture_id: lectureId,
      });
      return bookmarks.filter((b) => b.note && b.note.trim());
    },
    enabled: !!user && !!lectureId,
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.Bookmark.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["lecture-notes", lectureId, user?.id],
      });
      setNoteText("");
      setShowForm(false);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.Bookmark.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["lecture-notes", lectureId, user?.id],
      });
    },
  });

  const handleSave = () => {
    if (!noteText.trim()) return;
    createNoteMutation.mutate({
      user_id: user.id,
      course_id: courseId,
      lecture_id: lectureId,
      timestamp_seconds: Math.round(currentTime),
      note: noteText,
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-black">My Notes</h3>
          <Badge variant="secondary" className="text-xs">
            {notes.length}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm(!showForm)}
          className="text-xs gap-1 rounded-lg"
        >
          {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showForm ? "Cancel" : "Add Note"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-2">
            At {formatTime(currentTime)}
          </p>
          <Textarea
            placeholder="Write your note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="text-sm h-20 resize-none mb-2 rounded-lg"
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!noteText.trim() || createNoteMutation.isPending}
            className="bg-[#00a98d] hover:bg-[#008f77] text-white text-xs rounded-lg"
          >
            Save Note
          </Button>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            No notes yet. Add your first note!
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="p-3 bg-gray-50 rounded-lg group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-xs mb-1">
                    {formatTime(note.timestamp_seconds)}
                  </Badge>
                  <p className="text-sm text-gray-700">{note.note}</p>
                </div>
                <button
                  onClick={() => deleteNoteMutation.mutate(note.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
