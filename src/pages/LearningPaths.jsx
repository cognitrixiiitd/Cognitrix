import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "../utils";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Route, Sparkles, Plus, CheckCircle, Circle, ExternalLink,
  BookOpen, ChevronDown, ChevronUp, X
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function LearningPaths() {
  const [user, setUser] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedPath, setExpandedPath] = useState(null);
  const [genForm, setGenForm] = useState({ domain: "", career_goal: "", level: "beginner" });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: paths = [], isLoading } = useQuery({
    queryKey: ["learning-paths", user?.id],
    queryFn: () => base44.entities.LearningPath.filter({ student_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["all-published-courses"],
    queryFn: () => base44.entities.Course.filter({ status: "published" }),
  });

  const generatePath = async () => {
    setGenerating(true);
    const courseList = courses.map(c => ({ id: c.id, title: c.title, category: c.category, tags: c.tags, short_description: c.short_description }));

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an academic AI that generates stepwise learning roadmaps.

INPUT:
Student goal: ${genForm.career_goal || genForm.domain}
Domain: ${genForm.domain}
Student level: ${genForm.level}
Available internal courses: ${JSON.stringify(courseList)}

INSTRUCTIONS:
- Return a JSON learning path
- Prefer internal courses (use their exact id and title)
- If no internal course matches a topic, suggest it as "topic" type with subtopics
- Order from foundational to advanced
- Generate 5-10 steps`,
      response_json_schema: {
        type: "object",
        properties: {
          path_title: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step_order: { type: "number" },
                title: { type: "string" },
                type: { type: "string" },
                target_id_or_link: { type: "string" },
                estimated_hours: { type: "number" },
                why: { type: "string" },
                completed: { type: "boolean" }
              }
            }
          },
          confidence_score: { type: "number" }
        }
      }
    });

    await base44.entities.LearningPath.create({
      student_id: user.id,
      title: response.path_title,
      domain: genForm.domain,
      career_goal: genForm.career_goal,
      student_level: genForm.level,
      steps: response.steps?.map(s => ({ ...s, completed: false })) || [],
      confidence_score: response.confidence_score || 0,
      status: "active",
      progress_percent: 0,
    });

    setGenerating(false);
    setShowGenerator(false);
    setGenForm({ domain: "", career_goal: "", level: "beginner" });
    queryClient.invalidateQueries(["learning-paths", user?.id]);
  };

  const toggleStepComplete = async (path, stepIndex) => {
    const updatedSteps = [...path.steps];
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], completed: !updatedSteps[stepIndex].completed };
    const completedCount = updatedSteps.filter(s => s.completed).length;
    const progress = Math.round((completedCount / updatedSteps.length) * 100);
    await base44.entities.LearningPath.update(path.id, {
      steps: updatedSteps,
      progress_percent: progress,
      status: progress === 100 ? "completed" : "active",
    });
    queryClient.invalidateQueries(["learning-paths", user?.id]);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-black tracking-tight">Learning Paths</h1>
          <p className="text-sm text-gray-500 mt-1">AI-generated roadmaps tailored to your goals</p>
        </div>
        <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
          <DialogTrigger asChild>
            <Button className="bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Path
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00a98d]" />
                AI Learning Path Generator
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm text-gray-600 mb-1.5 block">Domain</Label>
                <Input
                  placeholder="e.g., Computer Science, Data Science"
                  value={genForm.domain}
                  onChange={e => setGenForm(p => ({ ...p, domain: e.target.value }))}
                  className="rounded-xl border-gray-200"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600 mb-1.5 block">Career Goal</Label>
                <Input
                  placeholder="e.g., ML Engineer, Web Developer"
                  value={genForm.career_goal}
                  onChange={e => setGenForm(p => ({ ...p, career_goal: e.target.value }))}
                  className="rounded-xl border-gray-200"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600 mb-1.5 block">Your Level</Label>
                <Select value={genForm.level} onValueChange={v => setGenForm(p => ({ ...p, level: v }))}>
                  <SelectTrigger className="rounded-xl border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={generatePath}
                disabled={generating || !genForm.domain}
                className="w-full bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl gap-2"
              >
                {generating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generating ? "Generating..." : "Generate My Path"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {paths.length === 0 ? (
        <EmptyState
          icon={Route}
          title="No learning paths yet"
          description="Generate your first AI-powered learning path based on your career goals."
          actionLabel="Generate Path"
          onAction={() => setShowGenerator(true)}
        />
      ) : (
        <div className="space-y-4">
          {paths.map(path => {
            const isExpanded = expandedPath === path.id;
            return (
              <div key={path.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedPath(isExpanded ? null : path.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#00a98d]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Route className="w-5 h-5 text-[#00a98d]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-black">{path.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] bg-gray-50">{path.domain}</Badge>
                          <Badge variant="secondary" className="text-[10px] bg-gray-50">{path.student_level}</Badge>
                          <span className="text-xs text-gray-400">{path.steps?.length || 0} steps</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[#00a98d]">{path.progress_percent || 0}%</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                  <Progress value={path.progress_percent || 0} className="h-1.5 bg-gray-100 mt-3" />
                </div>

                {isExpanded && path.steps?.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <div className="space-y-2">
                      {path.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                          <button onClick={(e) => { e.stopPropagation(); toggleStepComplete(path, i); }}>
                            {step.completed ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300 mt-0.5" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${step.completed ? 'text-gray-400 line-through' : 'text-black'}`}>
                                {step.title}
                              </p>
                              <Badge variant="outline" className="text-[10px]">{step.type?.replace("_", " ")}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{step.why}</p>
                            {step.estimated_hours > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">~{step.estimated_hours}h</p>
                            )}
                            {step.type === "internal_course" && step.target_id_or_link && (
                              <Link to={createPageUrl(`CourseDetail?id=${step.target_id_or_link}`)} className="text-xs text-[#00a98d] hover:underline mt-1 inline-block" onClick={e => e.stopPropagation()}>
                                View Course →
                              </Link>
                            )}
                            {step.type === "external_resource" && step.target_id_or_link && (
                              <a href={step.target_id_or_link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#00a98d] hover:underline mt-1 inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                Open Resource <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}