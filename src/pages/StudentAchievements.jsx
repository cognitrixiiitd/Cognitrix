import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import AchievementBadge from "@/components/gamification/AchievementBadge";
import Leaderboard from "@/components/gamification/Leaderboard";
import { Trophy, Award, Star, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function StudentAchievements() {
  const { user } = useAuth();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["student-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("student_stats").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ["student-achievements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("achievements").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (loadingStats) return <LoadingSpinner />;

  const levelProgress = stats ? ((stats.total_points % 1000) / 1000) * 100 : 0;
  const nextLevelPoints = stats ? 1000 - (stats.total_points % 1000) : 1000;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-black tracking-tight mb-8">My Achievements</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 p-5">
          <div className="flex items-center gap-3 mb-2"><Trophy className="w-5 h-5 text-purple-600" /><p className="text-xs font-medium text-purple-700">Level</p></div>
          <p className="text-3xl font-bold text-purple-900">{stats?.level || 1}</p>
          <div className="mt-3"><Progress value={levelProgress} className="h-2 bg-purple-100" /><p className="text-xs text-purple-600 mt-1">{nextLevelPoints} pts to Level {(stats?.level || 1) + 1}</p></div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-100 p-5">
          <div className="flex items-center gap-3 mb-2"><Star className="w-5 h-5 text-amber-600" /><p className="text-xs font-medium text-amber-700">Total Points</p></div>
          <p className="text-3xl font-bold text-amber-900">{stats?.total_points || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-100 p-5">
          <div className="flex items-center gap-3 mb-2"><Award className="w-5 h-5 text-emerald-600" /><p className="text-xs font-medium text-emerald-700">Achievements</p></div>
          <p className="text-3xl font-bold text-emerald-900">{achievements.length}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl border border-orange-100 p-5">
          <div className="flex items-center gap-3 mb-2"><TrendingUp className="w-5 h-5 text-orange-600" /><p className="text-xs font-medium text-orange-700">Streak</p></div>
          <p className="text-3xl font-bold text-orange-900">{stats?.current_streak_days || 0} days</p>
        </div>
      </div>

      <Tabs defaultValue="achievements" className="space-y-6">
        <TabsList className="bg-gray-100 rounded-xl">
          <TabsTrigger value="achievements" className="rounded-lg text-xs">My Badges</TabsTrigger>
          <TabsTrigger value="leaderboard" className="rounded-lg text-xs">Leaderboard</TabsTrigger>
        </TabsList>
        <TabsContent value="achievements">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-black mb-4">Unlocked Badges ({achievements.length})</h2>
            {achievements.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-12">Complete courses and quizzes to earn achievements!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{achievements.map((a) => (<AchievementBadge key={a.id} achievement={a} />))}</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="leaderboard">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-black mb-4">🏆 Top Learners</h2>
            <Leaderboard limit={20} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
