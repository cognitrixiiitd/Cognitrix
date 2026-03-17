import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Archive, CheckSquare, Square } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function BulkLectureActions({
  lectures,
  selectedIds,
  onSelectAll,
  onDelete,
  onArchive,
}) {
  const allSelected =
    lectures.length > 0 && selectedIds.length === lectures.length;

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
      <Button
        variant="ghost"
        size="sm"
        onClick={onSelectAll}
        className="gap-2 text-xs"
      >
        {allSelected ? (
          <CheckSquare className="w-4 h-4" />
        ) : (
          <Square className="w-4 h-4" />
        )}
        {allSelected ? "Deselect All" : "Select All"}
      </Button>

      {selectedIds.length > 0 && (
        <>
          <div className="h-4 w-px bg-gray-300" />
          <span className="text-xs text-gray-500">
            {selectedIds.length} selected
          </span>

          <div className="flex-1" />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs text-orange-600 hover:text-orange-700"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Archive {selectedIds.length} lecture(s)?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Archived lectures will be hidden from students but can be
                  restored later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onArchive}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Archive
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {selectedIds.length} lecture(s)?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  selected lectures.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
