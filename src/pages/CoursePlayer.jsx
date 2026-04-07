import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "../utils";
import { Link } from "react-router-dom";
import PageSkeleton from "../components/shared/PageSkeleton";
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
  ArrowLeft, CheckCircle, ChevronLeft, ChevronRight,
  MessageSquare, Play, FileText, ExternalLink, Clock,
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

  const [watchTimeStart, setWatchTimeStart] = useState(null);
  const [lastSeekTime, setLastSeekTime] = useState(0);
  const [newAchievement, setNewAchievement] = useState(null);
  const [justCompletedId, setJustCompletedId] = useState(null);
  const videoRef = useRef(null);
  const ytIframeRef = useRef(null);
  const ytIntervalRef = useRef(null);
  const lecturesRef = useRef([]);

  useEffect(() => {
    if (!user) return;
    const initStats = async () => {
      const { data } = await supabase
        .from("student_stats")
        .select("id")
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
    // For YouTube, seeking happens after the player is ready (handled in YT onReady)
    setWatchTimeStart(Date.now());
    setJustCompletedId(null);
  }, [currentLectureIndex]);

  // YouTube postMessage time polling
  useEffect(() => {
    if (ytIntervalRef.current) { clearInterval(ytIntervalRef.current); ytIntervalRef.current = null; }

    const handleMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event === 'infoDelivery' && data.info && typeof data.info.currentTime === 'number') {
          setCurrentTime(data.info.currentTime);
        }
        if (data.event === 'infoDelivery' && data.info && typeof data.info.duration === 'number' && data.info.duration > 0) {
          setVideoDuration(data.info.duration);
        }
      } catch (e) {}
    };

    window.addEventListener('message', handleMessage);

    // Start listening by sending a command to the iframe
    const startListening = () => {
      if (ytIframeRef.current && ytIframeRef.current.contentWindow) {
        ytIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
        ytIframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), '*');
      }
    };

    // Delay to ensure iframe is loaded
    const listenTimer = setTimeout(startListening, 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(listenTimer);
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
    };
  }, [currentLectureIndex]);

  // Bug 10: Track time spent — flush analytics on unmount and beforeunload
  useEffect(() => {
    const flushWatchTime = () => {
      if (!watchTimeStart || !user || !courseId) return;
      const watchDuration = Math.round((Date.now() - watchTimeStart) / 1000);
      if (watchDuration < 2) return; // ignore trivial durations
      const lectureId = lecturesRef.current?.[currentLectureIndex]?.id;
      if (!lectureId) return;

      const payload = {
        user_id: user.id,
        course_id: courseId,
        lecture_id: lectureId,
        event_type: "play",
        timestamp_seconds: Math.round(currentTime),
        meta: { watch_duration_seconds: watchDuration },
      };

      // Use sendBeacon for beforeunload (reliable delivery)
      if (typeof navigator.sendBeacon === "function") {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const url = `${supabaseUrl}/rest/v1/analytics_events`;
          const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
          navigator.sendBeacon(url + `?apikey=${supabaseKey}`, blob);
        }
      }
    };

    window.addEventListener("beforeunload", flushWatchTime);
    return () => {
      window.removeEventListener("beforeunload", flushWatchTime);
      // Also flush on component unmount using regular insert
      if (watchTimeStart && user && courseId) {
        const watchDuration = Math.round((Date.now() - watchTimeStart) / 1000);
        if (watchDuration >= 2 && lecturesRef.current?.[currentLectureIndex]?.id) {
          const lectureId = lecturesRef.current[currentLectureIndex].id;
          supabase.from("analytics_events").insert({
            user_id: user.id, course_id: courseId, lecture_id: lectureId,
            event_type: "play", timestamp_seconds: Math.round(currentTime),
            meta: { watch_duration_seconds: watchDuration },
          }).then(() => {});
        }
      }
    };
  }, [user, courseId, watchTimeStart, currentLectureIndex, currentTime]);
  const { data: course, isLoading } = useQuery({
    queryKey: ["player-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title, enrollment_count").eq("id", courseId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: lectures = [] } = useQuery({
    queryKey: ["player-lectures", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lectures").select("id, title, type, source_url, order_index, duration_minutes, transcript_text, ai_generated_description, suggested_resources, topic_timestamps, attachments, section_name").eq("course_id", courseId).order("order_index");
      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId,
  });

  // Keep lecturesRef in sync for use in cleanup effects
  useEffect(() => { lecturesRef.current = lectures; }, [lectures]);

  // Handle lecture URL param (from bookmark navigation)
  useEffect(() => {
    const lectureParam = params.get("lecture");
    if (lectureParam && lectures.length > 0) {
      const idx = lectures.findIndex(l => l.id === lectureParam);
      if (idx >= 0 && idx !== currentLectureIndex) {
        setCurrentLectureIndex(idx);
      }
    }
  }, [lectures]);

  const { data: enrollment } = useQuery({
    queryKey: ["player-enrollment", courseId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("enrollments").select("id, course_id, student_id, completed_lectures, progress_percent, time_spent_minutes, status, completed_at").eq("course_id", courseId).eq("student_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!user,
  });

  useEffect(() => {
    if (!enrollment || !lectures.length) return;
    const completedCount = enrollment.completed_lectures?.length || 0;
    const totalActive = lectures.length;
    const isActuallyCompleted = completedCount >= totalActive && totalActive > 0;
    if (enrollment.status === "completed" && !isActuallyCompleted) {
      const newProgress = Math.min(100, Math.round((completedCount / totalActive) * 100));
      supabase.from("enrollments").update({
        status: "active", progress_percent: newProgress, completed_at: null,
      }).eq("id", enrollment.id).then(({ error }) => {
        if (!error) queryClient.invalidateQueries({ queryKey: ["player-enrollment", courseId, user?.id] });
      });
    }
  }, [enrollment, lectures]);

  const { data: quizzes = [] } = useQuery({
    queryKey: ["player-quizzes", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*, quiz_questions(*)").eq("course_id", courseId);
      if (error) throw error;
      return data?.map(q => ({ ...q, questions: q.quiz_questions })) || [];
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
        completed_lectures: completed, progress_percent: progress,
        last_accessed: new Date().toISOString(),
        time_spent_minutes: (enrollment.time_spent_minutes || 0) + Math.round(watchDuration / 60),
        status: progress === 100 ? "completed" : "active",
        completed_at: progress === 100 ? new Date().toISOString() : null,
      }).eq("id", enrollment.id);

      supabase.from("analytics_events").insert({
        user_id: user.id, course_id: courseId, lecture_id: lectureId,
        event_type: "complete", timestamp_seconds: currentTime,
        meta: { watch_duration_seconds: watchDuration, video_duration_seconds: videoDuration },
      }).then(() => {});

      if (!wasAlreadyCompleted) {
        const { data: stats } = await supabase.from("student_stats").select("id, total_points, level, courses_completed").eq("user_id", user.id).single();
        if (stats) {
          const newPoints = (stats.total_points || 0) + 20;
          const newLevel = Math.floor(newPoints / 1000) + 1;
          await supabase.from("student_stats").update({
            total_points: newPoints, level: newLevel,
            last_active_date: new Date().toISOString().split("T")[0],
          }).eq("id", stats.id);
        }

        if (progress === 100) {
          const { data: stats2 } = await supabase.from("student_stats").select("id, total_points, courses_completed").eq("user_id", user.id).single();
          if (stats2) {
            const newCoursesCompleted = (stats2.courses_completed || 0) + 1;
            await supabase.from("student_stats").update({
              courses_completed: newCoursesCompleted,
              total_points: (stats2.total_points || 0) + 100,
            }).eq("id", stats2.id);

            const { data: achievement } = await supabase.from("achievements").insert({
              user_id: user.id, course_id: courseId,
              achievement_type: newCoursesCompleted === 1 ? "first_course" : "course_completed",
              badge_name: newCoursesCompleted === 1 ? "First Course!" : "Course Completed!",
              badge_description: newCoursesCompleted === 1 ? "Completed your first course" : `Completed ${newCoursesCompleted} courses`,
              badge_icon: "trophy", points_awarded: 100,
            }).select().single();
            if (achievement) setNewAchievement(achievement);
          }
        }
      }
    },
    onMutate: (lectureId) => {
      // Optimistic: immediately show completed
      setJustCompletedId(lectureId);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["player-enrollment", courseId, user?.id] });
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

  const handleSeekTo = (seconds) => {
    if (currentLecture?.type === "youtube" && ytIframeRef.current?.contentWindow) {
      ytIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
        '*'
      );
      setCurrentTime(seconds);
    } else if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  if (isLoading) return <PageSkeleton variant="player" />;
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
          <Button variant="ghost" size="sm" onClick={() => setShowQA(!showQA)} className="text-xs gap-1">
            <MessageSquare className="w-3.5 h-3.5" />Q&A
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
                      <iframe
                        ref={ytIframeRef}
                        src={getYouTubeEmbedUrl(currentLecture.source_url) + (getYouTubeEmbedUrl(currentLecture.source_url).includes('?') ? '&' : '?') + 'enablejsapi=1&origin=' + encodeURIComponent(window.location.origin) + (params.get('t') ? '&start=' + params.get('t') : '')}
                        className="absolute inset-0 w-full h-full rounded-2xl"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        key={currentLecture.id}
                      />
                    ) : currentLecture.source_url ? (
                      <video ref={videoRef} src={currentLecture.source_url} controls onTimeUpdate={handleTimeUpdate} onLoadedMetadata={(e) => setVideoDuration(e.target.duration)} className="absolute inset-0 w-full h-full rounded-2xl bg-black" />
                    ) : (
                      <div className="absolute inset-0 w-full h-full rounded-2xl bg-gray-100 flex items-center justify-center"><Play className="w-12 h-12 text-gray-300" /></div>
                    )}
                  </div>
                ) : currentLecture.type === "pdf" || currentLecture.type === "slides" ? (
                  <div className="relative w-full" style={{ paddingBottom: "75%" }}>
                    {currentLecture.source_url ? (
                      <>
                        <iframe
                          src={currentLecture.source_url}
                          className="absolute inset-0 w-full h-full rounded-2xl border border-gray-200"
                          title={currentLecture.title}
                        />
                        <div className="mt-2 text-center">
                          <a href={currentLecture.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#00a98d] hover:underline inline-flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />Open in new tab
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 w-full h-full rounded-2xl bg-gray-100 flex items-center justify-center">
                        <FileText className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                ) : currentLecture.type === "external_link" ? (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center border border-gray-200">
                    <ExternalLink className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-4">This lecture links to an external resource</p>
                    {currentLecture.source_url ? (
                      <a href={currentLecture.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#00a98d] hover:bg-[#008f77] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
                        <ExternalLink className="w-4 h-4" />Open External Link
                      </a>
                    ) : (
                      <p className="text-xs text-gray-400">No URL provided</p>
                    )}
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
                      {currentLecture.topic_timestamps && currentLecture.topic_timestamps.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1"><Clock className="w-3 h-3" />Topic Timestamps</p>
                          <div className="flex flex-wrap gap-2">
                            {currentLecture.topic_timestamps.map((ts, i) => {
                              const secs = ts.start_seconds != null ? ts.start_seconds : 0;
                              const mins = Math.floor(secs / 60);
                              const s = Math.floor(secs % 60);
                              const label = ts.label || ts.topic || `Segment ${i + 1}`;
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleSeekTo(secs)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-[#00a98d]/10 border border-gray-200 hover:border-[#00a98d]/30 text-xs transition-colors cursor-pointer"
                                >
                                  <span className="font-mono text-[#00a98d] font-medium">{mins}:{s.toString().padStart(2, '0')}</span>
                                  <span className="text-gray-700">{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">

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

                  {currentLecture.attachments?.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">📎 Attachments</p>
                      <div className="space-y-2">
                        {currentLecture.attachments.map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 hover:border-[#00a98d]/30 transition-colors">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700 hover:text-[#00a98d] truncate">{att.name || 'Attachment'}</span>
                          </a>
                        ))}
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

        <PlayerSidebar lectures={lectures} currentIndex={currentLectureIndex} onSelect={setCurrentLectureIndex} completedLectures={enrollment?.completed_lectures || []} showQA={showQA} courseId={courseId} lectureId={currentLecture?.id} user={user} profile={profile} />
      </div>
    </div>
  );
}
