import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bookmark } from "lucide-react";

export default function BookmarkButton({ user, courseId, lectureId, currentTime = 0 }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const createBookmarkMutation = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from("bookmarks").insert(data);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-bookmarks"] }); setOpen(false); setNote(""); },
  });

  const handleSave = () => {
    createBookmarkMutation.mutate({ user_id: user.id, course_id: courseId, lecture_id: lectureId, timestamp_seconds: Math.round(currentTime), note });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2 rounded-xl"><Bookmark className="w-4 h-4" />Bookmark</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Bookmark</DialogTitle><DialogDescription>Save this moment for later review. You can add an optional note.</DialogDescription></DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-3">Timestamp: <span className="font-medium text-black">{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, "0")}</span></p>
          <Textarea placeholder="Add a note (optional)..." value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl border-gray-200 text-sm h-24 resize-none" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={createBookmarkMutation.isPending} className="bg-[#00a98d] hover:bg-[#008f77] text-white">{createBookmarkMutation.isPending ? "Saving..." : "Save Bookmark"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
