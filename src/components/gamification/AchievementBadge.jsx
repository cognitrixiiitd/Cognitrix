import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Award,
  Star,
  Zap,
  Target,
  BookOpen,
  Medal,
  Crown,
  Flame,
  Clock,
} from "lucide-react";

const iconMap = {
  first_course: BookOpen,
  course_completed: Trophy,
  quiz_ace: Award,
  perfect_score: Star,
  fast_learner: Zap,
  question_master: Target,
  bookmark_king: BookOpen,
  week_streak: Flame,
  month_streak: Crown,
  topic_master: Medal,
};

const colorMap = {
  first_course: "bg-blue-100 text-blue-700 border-blue-200",
  course_completed: "bg-purple-100 text-purple-700 border-purple-200",
  quiz_ace: "bg-amber-100 text-amber-700 border-amber-200",
  perfect_score: "bg-yellow-100 text-yellow-700 border-yellow-200",
  fast_learner: "bg-emerald-100 text-emerald-700 border-emerald-200",
  question_master: "bg-pink-100 text-pink-700 border-pink-200",
  bookmark_king: "bg-indigo-100 text-indigo-700 border-indigo-200",
  week_streak: "bg-orange-100 text-orange-700 border-orange-200",
  month_streak: "bg-red-100 text-red-700 border-red-200",
  topic_master: "bg-teal-100 text-teal-700 border-teal-200",
};

export default function AchievementBadge({
  achievement,
  size = "md",
  showPoints = true,
}) {
  const Icon = iconMap[achievement.achievement_type] || Trophy;
  const color =
    colorMap[achievement.achievement_type] ||
    "bg-gray-100 text-gray-700 border-gray-200";

  if (size === "sm") {
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${color}`}
      >
        <Icon className="w-3 h-3" />
        <span className="text-xs font-medium">{achievement.badge_name}</span>
        {showPoints && (
          <span className="text-xs">+{achievement.points_awarded}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border-2 ${color} text-center`}>
      <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="font-semibold text-sm mb-1">{achievement.badge_name}</h4>
      <p className="text-xs opacity-80 mb-2">{achievement.badge_description}</p>
      {showPoints && (
        <Badge variant="secondary" className="text-xs">
          +{achievement.points_awarded} pts
        </Badge>
      )}
    </div>
  );
}
