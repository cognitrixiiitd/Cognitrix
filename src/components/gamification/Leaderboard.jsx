import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Leaderboard({ courseId = null, limit = 50, currentUserId = null }) {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["leaderboard", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_stats")
        .select("id, user_id, total_points, level, current_streak_days, profiles(full_name, avatar_url)")
        .order("total_points", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map(stat => ({
        ...stat,
        user_name: stat.profiles?.full_name || "Student",
        avatar_url: stat.profiles?.avatar_url || null,
      }));
    },
  });

  // Check if current user is in the top 50
  const currentUserInList = currentUserId
    ? stats.find(s => s.user_id === currentUserId)
    : null;

  // If current user not in top 50, fetch their rank separately
  const { data: currentUserRankData } = useQuery({
    queryKey: ["leaderboard-my-rank", currentUserId],
    queryFn: async () => {
      // Get current user's stats
      const { data: myStats, error: myErr } = await supabase
        .from("student_stats")
        .select("id, user_id, total_points, level, current_streak_days, profiles(full_name, avatar_url)")
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (myErr || !myStats) return null;

      // Count how many students have more points
      const { count, error: countErr } = await supabase
        .from("student_stats")
        .select("*", { count: "exact", head: true })
        .gt("total_points", myStats.total_points);
      if (countErr) return null;

      return {
        ...myStats,
        user_name: myStats.profiles?.full_name || "Student",
        avatar_url: myStats.profiles?.avatar_url || null,
        rank: (count ?? 0) + 1,
      };
    },
    enabled: !!currentUserId && !currentUserInList,
  });

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  const getRankDisplay = (index) => {
    if (index === 0) return <span className="text-lg">🥇</span>;
    if (index === 1) return <span className="text-lg">🥈</span>;
    if (index === 2) return <span className="text-lg">🥉</span>;
    return <span className="text-sm font-bold text-gray-500">#{index + 1}</span>;
  };

  const getLevelBadge = (level) => {
    if (level >= 50) return "bg-purple-100 text-purple-700";
    if (level >= 25) return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-600";
  };

  const renderRow = (stat, index, rank, pinned = false) => {
    const isCurrentUser = currentUserId && stat.user_id === currentUserId;
    return (
      <div
        key={stat.id}
        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
          isCurrentUser
            ? "bg-[#00a98d]/5 border-[#00a98d]/30 ring-1 ring-[#00a98d]/20"
            : index < 3 && !pinned
              ? "bg-gradient-to-r from-gray-50 to-white border-gray-200"
              : "bg-white border-gray-100"
        } ${pinned ? "mt-2 border-dashed" : ""}`}
      >
        <div className="flex items-center justify-center w-8 h-8">{getRankDisplay(rank)}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isCurrentUser ? "text-[#00a98d]" : "text-black"}`}>
            {stat.user_name}
            {isCurrentUser && <span className="text-xs text-[#00a98d] ml-1.5">(You)</span>}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={`text-xs ${getLevelBadge(stat.level)}`}>Level {stat.level}</Badge>
            {stat.current_streak_days > 0 && <span className="text-xs text-orange-600 flex items-center gap-0.5">🔥 {stat.current_streak_days} days</span>}
          </div>
        </div>
        <div className="text-right"><p className="text-lg font-bold text-[#00a98d]">{stat.total_points}</p><p className="text-xs text-gray-500">points</p></div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {stats.length === 0 ? (<p className="text-center text-sm text-gray-400 py-8">No students yet</p>) : (
        <>
          {stats.map((stat, index) => renderRow(stat, index, index))}
          {/* If current user is not in top 50, pin their row at the bottom */}
          {currentUserRankData && !currentUserInList && (
            <>
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 border-t border-dashed border-gray-200" />
                <span className="text-xs text-gray-400">Your Position</span>
                <div className="flex-1 border-t border-dashed border-gray-200" />
              </div>
              {renderRow(currentUserRankData, currentUserRankData.rank - 1, currentUserRankData.rank - 1, true)}
            </>
          )}
        </>
      )}
    </div>
  );
}
