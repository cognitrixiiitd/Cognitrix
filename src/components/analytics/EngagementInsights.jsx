import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function EngagementInsights({
  lectures,
  stuckFlags,
  enrollments,
}) {
  // Calculate time spent per lecture (from stuck flags and questions as proxy)
  const lectureEngagement = lectures
    .map((lecture) => {
      const flags = stuckFlags.filter(
        (f) => f.lecture_id === lecture.id,
      ).length;
      const completed = enrollments.filter((e) =>
        e.completed_lectures?.includes(lecture.id),
      ).length;
      return {
        id: lecture.id,
        title:
          lecture.title.length > 15
            ? lecture.title.slice(0, 15) + "..."
            : lecture.title,
        flags,
        completed,
        engagementScore:
          completed > 0
            ? Math.round((1 - flags / Math.max(completed, 1)) * 100)
            : 0,
      };
    })
    .sort((a, b) => a.engagementScore - b.engagementScore);

  const challengingLectures = lectureEngagement
    .filter((l) => l.flags > 0 || l.engagementScore < 70)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-black">
          Challenging Content
        </h3>
      </div>

      {challengingLectures.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={challengingLectures}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="title" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar
                dataKey="flags"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                name="Stuck Flags"
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {challengingLectures.slice(0, 3).map((lecture) => (
              <div
                key={lecture.id}
                className="flex items-center justify-between p-3 bg-orange-50 rounded-xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black truncate">
                    {lecture.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {lecture.flags} stuck flags
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] text-orange-600 border-orange-200"
                >
                  {lecture.engagementScore}% engagement
                </Badge>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 text-center py-8">
          No challenging content detected
        </p>
      )}
    </div>
  );
}
