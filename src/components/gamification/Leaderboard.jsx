import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Leaderboard({ courseId = null, limit = 10 }) {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["leaderboard", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_stats")
        .select("id, user_id, total_points, level, current_streak_days, profiles(full_name, avatar_url)")
        .order("total_points", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map(stat => ({
        ...stat,
        user_name: stat.profiles?.full_name || "Student",
        avatar_url: stat.profiles?.avatar_url || null,
      }));
    },
  });

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return null;
  };

  const getLevelBadge = (level) => {
    if (level >= 50) return "bg-purple-100 text-purple-700";
    if (level >= 25) return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-2">
      {stats.length === 0 ? (<p className="text-center text-sm text-gray-400 py-8">No students yet</p>) : (
        stats.map((stat, index) => (
          <div key={stat.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${index < 3 ? "bg-gradient-to-r from-gray-50 to-white border-gray-200" : "bg-white border-gray-100"}`}>
            <div className="flex items-center justify-center w-8 h-8 font-bold text-sm text-gray-600">{getRankIcon(index) || `#${index + 1}`}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black truncate">{stat.user_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={`text-xs ${getLevelBadge(stat.level)}`}>Level {stat.level}</Badge>
                {stat.current_streak_days > 0 && <span className="text-xs text-orange-600 flex items-center gap-0.5">🔥 {stat.current_streak_days} days</span>}
              </div>
            </div>
            <div className="text-right"><p className="text-lg font-bold text-[#00a98d]">{stat.total_points}</p><p className="text-xs text-gray-500">points</p></div>
          </div>
        ))
      )}
    </div>
  );
}
