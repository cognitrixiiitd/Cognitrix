import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Clock } from "lucide-react";

export default function VideoSegmentBuilder({ segments, onChange, videoUrl }) {
  const addSegment = () => {
    onChange([
      ...segments,
      {
        title: "",
        start_time: "",
        end_time: "",
      },
    ]);
  };

  const updateSegment = (index, field, value) => {
    const updated = [...segments];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const deleteSegment = (index) => {
    onChange(segments.filter((_, i) => i !== index));
  };

  const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(timeStr);
  };

  const calculateDuration = (start, end) => {
    const startSec = timeToSeconds(start);
    const endSec = timeToSeconds(end);
    const diff = endSec - startSec;
    return diff > 0
      ? `${Math.floor(diff / 60)}:${(diff % 60).toString().padStart(2, "0")}`
      : "-";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-gray-700 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Video Segments ({segments.length})
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSegment}
          className="text-xs gap-1 rounded-lg"
        >
          <Plus className="w-3 h-3" />
          Add Segment
        </Button>
      </div>

      {videoUrl && (
        <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
          💡 Break this video into smaller segments. Each will be saved as a
          separate lecture for better student engagement.
        </p>
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {segments.map((seg, idx) => (
          <div
            key={idx}
            className="p-4 bg-gray-50 rounded-xl border border-gray-200"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <Input
                  placeholder="Segment title (e.g., Introduction, Core Concepts)"
                  value={seg.title}
                  onChange={(e) => updateSegment(idx, "title", e.target.value)}
                  className="text-sm rounded-lg font-medium"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">
                      Start (mm:ss)
                    </Label>
                    <Input
                      placeholder="0:00"
                      value={seg.start_time}
                      onChange={(e) =>
                        updateSegment(idx, "start_time", e.target.value)
                      }
                      className="text-xs rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">
                      End (mm:ss)
                    </Label>
                    <Input
                      placeholder="5:30"
                      value={seg.end_time}
                      onChange={(e) =>
                        updateSegment(idx, "end_time", e.target.value)
                      }
                      className="text-xs rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">
                      Duration
                    </Label>
                    <div className="h-9 flex items-center px-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-600">
                      {calculateDuration(seg.start_time, seg.end_time)}
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteSegment(idx)}
                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {segments.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-6">
          No segments defined. Add to break video into multiple lectures.
        </p>
      )}
    </div>
  );
}
