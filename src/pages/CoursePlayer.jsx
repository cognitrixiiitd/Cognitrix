import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "../utils";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import PlayerSidebar from "@/components/player/PlayerSidebar";
import QuizModule from "@/components/player/QuizModule";
import BookmarkButton from "@/components/player/BookmarkButton";
import VideoNotes from "@/components/player/VideoNotes";
import AchievementNotification from "@/components/gamification/AchievementNotification";
import LectureRecommendations from "@/components/player/LectureRecommendations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Flag, CheckCircle, ChevronLeft, ChevronRight,
  MessageSquare, Play, FileText, Gauge,
} from "lucide-react";

export default function CoursePlayer() {
  const params = new URLSearchParams(window.location.search);
  const courseId = params.get("id");
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [currentLectureIndex, setCurrentLectureIndex] = useState(0);
  const [showQA, setShowQA] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState("1");
  const [watchTimeStart, setWatchTimeStart] = useState(null);
  const [lastSeekTime, setLastSeekTime] = useState(0);
  const [newAchievement, setNewAchievement] = useState(null);
  const [justCompletedId, setJustCompletedId] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const initStats = async () => {
      const { data } = await supabase
        .from("student_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) {
        await supabase.from("student_stats").insert({ user_id: user.id, total_points: 0, level: 1 });
      }
    };
    initStats();
  }, [user]);

  useEffect(() => {
    const urlTime = params.get("t");
    if (urlTime && videoRef.current) {
      videoRef.current.currentTime = parseInt(urlTime);
    }
    setWatchTimeStart(Date.now());
    setJustCompletedId(null);
  }, [currentLectureIndex]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = parseFloat(playbackSpeed);
  }, [playbackSpeed]);

  const { data: course, isLoading } = useQuery({
    queryKey: ["player-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: lectures = [] } = useQuery({
    queryKey: ["player-lectures", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lectures").select("*").eq("course_id", courseId).order("order_index");
      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["player-enrollment", courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("*").eq("course_id", courseId).eq("student_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!user,
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ["player-quizzes", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*").eq("course_id", courseId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId,
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (lectureId) => {
      if (!enrollment || !user) return;
      const completed = [...(enrollment.completed_lectures || [])];
      const wasAlreadyCompleted = completed.includes(lectureId);
      if (!wasAlreadyCompleted) completed.push(lectureId);
      const progress = lectures.length > 0 ? Math.min(100, Math.round((completed.length / lectures.length) * 100)) : 0;
      const watchDuration = watchTimeStart ? Math.round((Date.now() - watchTimeStart) / 1000) : 0;

      await supabase.from("enrollments").update({
        completed_lectures: completed,
        progress_percent: progress,
        last_accessed: new Date().toISOString(),
        time_spent_minutes: (enrollment.time_spent_minutes || 0) + Math.round(watchDuration / 60),
        status: progress === 100 ? "completed" : "active",
        completed_at: progress === 100 ? new Date().toISOString() : null,
      }).eq("id", enrollment.id);

      await supabase.from("analytics_events").insert({
        user_id: user.id,
        course_id: courseId,
        lecture_id: lectureId,
        event_type: "complete",
        timestamp_seconds: currentTime,
        meta: { watch_duration_seconds: watchDuration, video_duration_seconds: videoDuration, playback_speed: playbackSpeed },
      });

      if (!wasAlreadyCompleted) {
        const { data: stats } = await supabase.from("student_stats").select("*").eq("user_id", user.id).single();
        if (stats) {
          const newPoints = (stats.total_points || 0) + 20;
          const newLevel = Math.floor(newPoints / 1000) + 1;
          await supabase.from("student_stats").update({
            total_points: newPoints,
            level: newLevel,
            last_active_date: new Date().toISOString().split("T")[0],
          }).eq("id", stats.id);
        }

        if (progress === 100) {
          const { data: stats2 } = await supabase.from("student_stats").select("*").eq("user_id", user.id).single();
          if (stats2) {
            const newCoursesCompleted = (stats2.courses_completed || 0) + 1;
            await supabase.from("student_stats").update({
              courses_completed: newCoursesCompleted,
              total_points: (stats2.total_points || 0) + 100,
            }).eq("id", stats2.id);

            const { data: achievement } = await supabase.from("achievements").insert({
              user_id: user.id,
              course_id: courseId,
              achievement_type: newCoursesCompleted === 1 ? "first_course" : "course_completed",
              badge_name: newCoursesCompleted === 1 ? "First Course!" : "Course Completed!",
              badge_description: newCoursesCompleted === 1 ? "Completed your first course" : `Completed ${newCoursesCompleted} courses`,
              badge_icon: "trophy",
              points_awarded: 100,
            }).select().single();
            if (achievement) setNewAchievement(achievement);
          }
        }
      }
    },
    onSuccess: (_, lectureId) => {
      setJustCompletedId(lectureId);
      queryClient.invalidateQueries(["player-enrollment", courseId, user?.id]);
    },
  });

  const trackSeekMutation = useMutation({
    mutationFn: async ({ fromTime, toTime }) => {
      if (!user || !currentLecture) return;
      const seekBack = toTime < fromTime;
      if (seekBack && Math.abs(toTime - fromTime) > 3) {
        await supabase.from("analytics_events").insert({
          user_id: user.id, course_id: courseId, lecture_id: currentLecture.id,
          event_type: "pause", timestamp_seconds: toTime,
          meta: { seek_from: fromTime, seek_to: toTime, replay_seconds: Math.abs(toTime - fromTime), possible_confusion: true },
        });
      }
    },
  });

  const handleTimeUpdate = (e) => {
    const newTime = e.target.currentTime;
    if (Math.abs(newTime - lastSeekTime) > 5) {
      trackSeekMutation.mutate({ fromTime: lastSeekTime, toTime: newTime });
    }
    setCurrentTime(newTime);
    setLastSeekTime(newTime);
  };

  const flagStuckMutation = useMutation({
    mutationFn: async () => {
      const cl = lectures[currentLectureIndex];
      if (!cl || !user) return;
      await supabase.from("questions").insert({
        user_id: user.id, user_name: profile?.full_name,
        course_id: courseId, lecture_id: cl.id,
        text: `Flagged as stuck on: ${cl.title}`, status: "open", is_stuck_flag: true,
      });
      await supabase.from("analytics_events").insert({
        user_id: user.id, course_id: courseId, lecture_id: cl.id, event_type: "flag_stuck",
      });
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (!course) return <div className="text-center py-20 text-gray-500">Course not found</div>;

  const currentLecture = lectures[currentLectureIndex];
  const isCompleted = enrollment?.completed_lectures?.includes(currentLecture?.id) || justCompletedId === currentLecture?.id;
  const currentQuiz = quizzes.find((q) => q.lecture_id === currentLecture?.id);

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&#]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  return (
    <div className="-m-4 lg:-m-8">
      <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl(`CourseDetail?id=${courseId}`)} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-medium text-black truncate">{course.title}</p>
            <p className="text-xs text-gray-400">{currentLectureIndex + 1} of {lectures.length} lectures</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => flagStuckMutation.mutate()} disabled={flagStuckMutation.isPending} className="text-xs gap-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50">
            <Flag className="w-3.5 h-3.5" /> I'm Stuck
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowQA(!showQA)} className="text-xs gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Q&A
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 4rem - 3.5rem)" }}>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            {currentLecture ? (
              <div>
                {currentLecture.type === "youtube" || currentLecture.type === "video" ? (
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    {currentLecture.type === "youtube" && getYouTubeEmbedUrl(currentLecture.source_url) ? (
                      <iframe src={getYouTubeEmbedUrl(currentLecture.source_url)} className="absolute inset-0 w-full h-full rounded-2xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    ) : currentLecture.source_url ? (
                      <video ref={videoRef} src={currentLecture.source_url} controls onTimeUpdate={handleTimeUpdate} onLoadedMetadata={(e) => setVideoDuration(e.target.duration)} className="absolute inset-0 w-full h-full rounded-2xl bg-black" />
                    ) : (
                      <div className="absolute inset-0 w-full h-full rounded-2xl bg-gray-100 flex items-center justify-center"><Play className="w-12 h-12 text-gray-300" /></div>
                    )}
                  </div>
                ) : currentLecture.type === "pdf" || currentLecture.type === "slides" ? (
                  <div className="bg-gray-100 rounded-2xl p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Document content</p>
                    {currentLecture.source_url && (<a href={currentLecture.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#00a98d] hover:underline mt-2 inline-block">Open Document</a>)}
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-2xl p-8 text-center"><p className="text-sm text-gray-500">{currentLecture.title}</p></div>
                )}

                <div className="mt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-black">{currentLecture.title}</h2>
                      {currentLecture.ai_generated_description && (<p className="text-sm text-gray-500 mt-1">{currentLecture.ai_generated_description}</p>)}
                      {videoDuration > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress: {Math.round((currentTime / videoDuration) * 100)}%</span>
                            <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, "0")} / {Math.floor(videoDuration / 60)}:{Math.floor(videoDuration % 60).toString().padStart(2, "0")}</span>
                          </div>
                          <Progress value={(currentTime / videoDuration) * 100} className="h-1.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(currentLecture.type === "video" || currentLecture.type === "youtube") && (
                        <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
                          <SelectTrigger className="w-20 h-9 text-xs rounded-lg"><Gauge className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.5">0.5x</SelectItem><SelectItem value="0.75">0.75x</SelectItem><SelectItem value="1">1x</SelectItem>
                            <SelectItem value="1.25">1.25x</SelectItem><SelectItem value="1.5">1.5x</SelectItem><SelectItem value="2">2x</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {user && <BookmarkButton user={user} courseId={courseId} lectureId={currentLecture.id} currentTime={currentTime} />}
                      <Button variant={isCompleted ? "outline" : "default"} onClick={() => !isCompleted && markCompleteMutation.mutate(currentLecture.id)} disabled={isCompleted || markCompleteMutation.isPending} className={`rounded-xl text-sm gap-1.5 ${!isCompleted ? "bg-[#00a98d] hover:bg-[#008f77] text-white" : "text-emerald-600 border-emerald-200"}`}>
                        <CheckCircle className="w-4 h-4" />{isCompleted ? "Completed" : "Mark Complete"}
                      </Button>
                    </div>
                  </div>

                  {currentLecture.suggested_resources?.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs font-medium text-blue-900 mb-2">📚 Recommended Resources</p>
                      <div className="space-y-2">
                        {currentLecture.suggested_resources.map((res, i) => (<a key={i} href={res.url} target="_blank" rel="noopener noreferrer" className="block"><p className="text-sm font-medium text-blue-700 hover:underline">{res.title}</p><p className="text-xs text-blue-600">{res.description}</p></a>))}
                      </div>
                    </div>
                  )}
                </div>

                {user && <VideoNotes user={user} courseId={courseId} lectureId={currentLecture.id} currentTime={currentTime} />}
                <LectureRecommendations currentLecture={currentLecture} allLectures={lectures} onSelectLecture={setCurrentLectureIndex} />

                {currentLecture.transcript_text && (
                  <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-black mb-3">Transcript</h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{currentLecture.transcript_text}</p>
                  </div>
                )}

                {currentQuiz && isCompleted && (<div className="mt-6"><QuizModule quiz={currentQuiz} enrollment={enrollment} userId={user?.id} onAchievement={(a) => setNewAchievement(a)} /></div>)}
                {currentQuiz && !isCompleted && (
                  <div className="mt-6 p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                    <p className="text-sm text-amber-800 font-medium">📝 Quiz available after completing this lecture</p>
                    <p className="text-xs text-amber-600 mt-1">Mark the lecture as complete to unlock the quiz</p>
                  </div>
                )}

                <AchievementNotification achievement={newAchievement} onClose={() => setNewAchievement(null)} />

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <Button variant="outline" onClick={() => setCurrentLectureIndex(Math.max(0, currentLectureIndex - 1))} disabled={currentLectureIndex === 0} className="rounded-xl text-sm gap-1"><ChevronLeft className="w-4 h-4" />Previous</Button>
                  <Button variant="outline" onClick={() => setCurrentLectureIndex(Math.min(lectures.length - 1, currentLectureIndex + 1))} disabled={currentLectureIndex >= lectures.length - 1} className="rounded-xl text-sm gap-1">Next<ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">No lectures available</div>
            )}
          </div>
        </div>

        <PlayerSidebar lectures={lectures} currentIndex={currentLectureIndex} onSelect={setCurrentLectureIndex} completedLectures={enrollment?.completed_lectures || []} showQA={showQA} courseId={courseId} lectureId={currentLecture?.id} user={user} />
      </div>
    </div>
  );
}
