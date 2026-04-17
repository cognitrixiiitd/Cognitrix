import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { createPageUrl } from "@/utils";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  BarChart3,
  Search,
  ChevronDown,
  ChevronRight,
  Trash2,
  Eye,
  ShieldAlert,
  UserMinus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Trophy,
  X,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";

// ─── Helpers ─────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }) {
  const map = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    draft: "bg-gray-50 text-gray-600 border-gray-200",
    archived: "bg-slate-50 text-slate-600 border-slate-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || "bg-gray-50 text-gray-600 border-gray-200"}`}
    >
      {status}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Gate: redirect non-admins immediately
  useEffect(() => {
    if (profile && profile.role !== "admin") {
      navigate(
        profile.role === "professor"
          ? "/ProfessorDashboard"
          : "/StudentDashboard",
        { replace: true },
      );
    }
  }, [profile, navigate]);

  if (!profile || profile.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage students, professors, courses and applications
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-100 p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="applications" className="text-xs rounded-lg">Applications</TabsTrigger>
          <TabsTrigger value="students" className="text-xs rounded-lg">Students</TabsTrigger>
          <TabsTrigger value="professors" className="text-xs rounded-lg">Professors</TabsTrigger>
          <TabsTrigger value="courses" className="text-xs rounded-lg">Courses</TabsTrigger>
          <TabsTrigger value="quizzes" className="text-xs rounded-lg">Quizzes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewSection /></TabsContent>
        <TabsContent value="applications"><ApplicationsSection adminId={user?.id} toast={toast} /></TabsContent>
        <TabsContent value="students"><StudentsSection toast={toast} /></TabsContent>
        <TabsContent value="professors"><ProfessorsSection toast={toast} /></TabsContent>
        <TabsContent value="courses"><CoursesSection toast={toast} /></TabsContent>
        <TabsContent value="quizzes"><QuizzesSection /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — Overview
// ═══════════════════════════════════════════════════════════════
function OverviewSection() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [studentsRes, profsRes, coursesRes, enrollmentsRes, pendingRes] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("role", "student"),
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("role", "professor"),
            supabase
              .from("courses")
              .select("id", { count: "exact", head: true }),
            supabase
              .from("enrollments")
              .select("id", { count: "exact", head: true }),
            supabase
              .from("professor_applications")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending"),
          ]);

        setStats({
          students: studentsRes.count ?? 0,
          professors: profsRes.count ?? 0,
          courses: coursesRes.count ?? 0,
          enrollments: enrollmentsRes.count ?? 0,
          pending: pendingRes.count ?? 0,
        });
      } catch (err) {
        console.error("[AdminDashboard] Stats error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const cards = [
    { label: "Total Students", value: stats?.students, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Professors", value: stats?.professors, icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Courses", value: stats?.courses, icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Enrollments", value: stats?.enrollments, icon: ClipboardList, color: "text-cyan-600", bg: "bg-cyan-50" },
    {
      label: "Pending Applications",
      value: stats?.pending,
      icon: Clock,
      color: stats?.pending > 0 ? "text-amber-600" : "text-gray-500",
      bg: stats?.pending > 0 ? "bg-amber-50" : "bg-gray-50",
      highlight: stats?.pending > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
      {cards.map((c) => (
        <Card
          key={c.label}
          className={`border ${c.highlight ? "border-amber-200 ring-1 ring-amber-100" : "border-gray-100"}`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — Professor Applications
// ═══════════════════════════════════════════════════════════════
function ApplicationsSection({ adminId, toast }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  const fetchApps = async () => {
    setLoading(true);
    let query = supabase
      .from("professor_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) console.error("[Apps] Fetch error:", error);
    setApps(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
  }, [filter]);

  const handleApprove = async (application) => {
    setApprovingId(application.id);

    const { data, error } = await supabase.functions.invoke('approve-professor', {
      body: {
        application_id: application.id,
        email: application.email,
        full_name: application.full_name,
      },
    });

    if (error) {
      let realErrorMessage = error.message;
      if (error.context && typeof error.context.json === "function") {
        try {
          const body = await error.context.json();
          if (body && body.error) realErrorMessage = body.error;
        } catch (e) {
          // ignore parsing error
        }
      }
      console.error("[Apps] Approve error:", error, realErrorMessage);
      toast({
        title: "Failed to approve",
        description: realErrorMessage || "Please try again.",
        variant: "destructive",
      });
      setApprovingId(null);
      return;
    }

    toast({
      title: "Professor approved",
      description: `${application.full_name} has been approved as a professor. A login email has been sent.`,
    });
    setApprovingId(null);
    fetchApps();
  };

  const handleReject = async (application) => {
    const confirmed = window.confirm(
      `Are you sure you want to reject ${application.full_name}'s application?`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("professor_applications")
      .update({
        status: "rejected",
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Open rejection email via mailto
    const subject = encodeURIComponent('Your Cognitrix Professor Application');
    const body = encodeURIComponent(
      `Dear ${application.full_name},\n\nThank you for your interest in joining Cognitrix as a professor.\n\nAfter reviewing your application, we are unable to approve your request at this time.\n\nIf you have any questions, please contact us at cognitrix.iiitd@gmail.com\n\n— The Cognitrix Team`
    );
    window.open(`mailto:${application.email}?subject=${subject}&body=${body}`);

    toast({ title: "Application rejected", description: `${application.full_name}'s application has been rejected.` });
    fetchApps();
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f
                ? "bg-[#00a98d] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No {filter !== "all" ? filter : ""} applications found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead className="hidden lg:table-cell">Designation</TableHead>
                <TableHead className="hidden lg:table-cell">Institution</TableHead>
                <TableHead className="hidden sm:table-cell">Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <React.Fragment key={app.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-gray-50/50"
                    onClick={() =>
                      setExpandedId(expandedId === app.id ? null : app.id)
                    }
                  >
                    <TableCell>
                      {expandedId === app.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{app.full_name}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{app.email}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">{app.department}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-gray-500">{app.designation}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-gray-500">{app.institution}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                      {formatDate(app.created_at)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {app.status === "pending" && (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            disabled={approvingId === app.id}
                            onClick={() => handleApprove(app)}
                          >
                            {approvingId === app.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {approvingId === app.id ? "Approving..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleReject(app)}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedId === app.id && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-gray-50/50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Courses Plan</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{app.courses_plan || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Reason</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{app.reason || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — Students
// ═══════════════════════════════════════════════════════════════
function StudentsSection({ toast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [progressSheet, setProgressSheet] = useState(null);
  const [removeDialog, setRemoveDialog] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const perPage = 20;

  const fetchStudents = async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("*, student_stats(*), enrollments(count)", { count: "exact" })
      .eq("role", "student")
      .order("created_at", { ascending: false })
      .range(page * perPage, (page + 1) * perPage - 1);

    if (search.trim()) {
      query = query.or(
        `full_name.ilike.%${search.trim()}%,id.eq.${isUUID(search.trim()) ? search.trim() : "00000000-0000-0000-0000-000000000000"}`,
      );
    }

    const { data, error, count } = await query;
    if (error) console.error("[Students] Fetch error:", error);
    setStudents(data || []);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, [page, search]);

  const handleRemove = async () => {
    if (!removeDialog) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", removeDialog.id);
      if (error) throw error;
      toast({
        title: "Student removed",
        description: `${removeDialog.full_name} has been removed.`,
      });
      setRemoveDialog(null);
      fetchStudents();
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="mt-4 space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d]"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No students found.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Enrolled</TableHead>
                  <TableHead className="hidden md:table-cell">Points</TableHead>
                  <TableHead className="hidden lg:table-cell">Level</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => {
                  const stats = Array.isArray(s.student_stats)
                    ? s.student_stats[0]
                    : s.student_stats;
                  const enrollCount = s.enrollments?.[0]?.count ?? 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {/* Derive email from auth or profiles if available */}
                        {s.email || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {enrollCount}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {stats?.total_points ?? 0}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {stats?.level ?? 1}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                        {formatDate(stats?.last_active_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setProgressSheet(s)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Progress
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setRemoveDialog(s)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, total)} of {total}
              </p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Student Progress Sheet (Section 6 integrated) */}
      <StudentProgressSheet
        student={progressSheet}
        onClose={() => setProgressSheet(null)}
      />

      {/* Remove Confirmation */}
      <Dialog open={!!removeDialog} onOpenChange={() => setRemoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{removeDialog?.full_name}</strong>?
              This will delete their profile, enrollments, and all associated data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={actionLoading} onClick={handleRemove}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Remove Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — Student Progress Sheet
// ═══════════════════════════════════════════════════════════════
function StudentProgressSheet({ student, onClose }) {
  const [enrollments, setEnrollments] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    (async () => {
      try {
        const [enrollRes, quizRes, achieveRes] = await Promise.all([
          supabase
            .from("enrollments")
            .select("*, courses(title)")
            .eq("student_id", student.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("quiz_attempts")
            .select("*, quizzes(title, courses(title))")
            .eq("student_id", student.id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("achievements")
            .select("*")
            .eq("user_id", student.id)
            .order("created_at", { ascending: false }),
        ]);
        setEnrollments(enrollRes.data || []);
        setQuizAttempts(quizRes.data || []);
        setAchievements(achieveRes.data || []);
      } catch (err) {
        console.error("[StudentProgress] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [student]);

  const stats = Array.isArray(student?.student_stats)
    ? student?.student_stats[0]
    : student?.student_stats;

  return (
    <Sheet open={!!student} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Student Progress</SheetTitle>
        </SheetHeader>

        {student && (
          <div className="mt-6 space-y-6">
            {/* Profile Info */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#00a98d]/10 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-[#00a98d]">
                  {student.full_name?.[0]?.toUpperCase() || "?"}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{student.full_name}</p>
                <p className="text-sm text-gray-500">Joined {formatDate(student.created_at)}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">Level {stats?.level ?? 1}</Badge>
                  <Badge variant="outline" className="text-xs">{stats?.total_points ?? 0} pts</Badge>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Enrolled Courses */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Enrolled Courses ({enrollments.length})
                  </h3>
                  {enrollments.length === 0 ? (
                    <p className="text-sm text-gray-400">No enrollments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {enrollments.map((e) => (
                        <div key={e.id} className="bg-gray-50 rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-medium text-gray-800">
                              {e.courses?.title || e.course_title || "Untitled"}
                            </p>
                            <span className="text-xs text-gray-500">
                              {Math.round(e.progress_percent || 0)}%
                            </span>
                          </div>
                          <Progress
                            value={e.progress_percent || 0}
                            className="h-1.5"
                          />
                          <div className="flex justify-between mt-1.5">
                            <span className="text-xs text-gray-400">
                              {e.time_spent_minutes ? `${Math.round(e.time_spent_minutes)} min spent` : ""}
                            </span>
                            <StatusBadge status={e.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quiz Attempts */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Quiz Attempts ({quizAttempts.length})
                  </h3>
                  {quizAttempts.length === 0 ? (
                    <p className="text-sm text-gray-400">No quiz attempts yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {quizAttempts.slice(0, 20).map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                        >
                          <div>
                            <p className="text-sm text-gray-800">
                              {q.quizzes?.title || "Quiz"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {q.quizzes?.courses?.title || ""} · {formatDate(q.created_at)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={q.is_correct ? "text-emerald-600 border-emerald-200" : "text-red-500 border-red-200"}
                          >
                            {q.is_correct ? "Correct" : "Incorrect"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Achievements */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> Achievements ({achievements.length})
                  </h3>
                  {achievements.length === 0 ? (
                    <p className="text-sm text-gray-400">No achievements yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {achievements.map((a) => (
                        <div
                          key={a.id}
                          className="bg-gray-50 rounded-lg p-3 text-center"
                        >
                          <p className="text-lg mb-1">{a.badge_icon || "🏆"}</p>
                          <p className="text-xs font-medium text-gray-800">{a.badge_name}</p>
                          <p className="text-[10px] text-gray-400">{a.points_awarded} pts</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — Professors
// ═══════════════════════════════════════════════════════════════
function ProfessorsSection({ toast }) {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coursesSheet, setCoursesSheet] = useState(null);
  const [profCourses, setProfCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [revokeDialog, setRevokeDialog] = useState(null);
  const [revokeConfirm, setRevokeConfirm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProfessors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*, courses(count)")
      .eq("role", "professor")
      .order("created_at", { ascending: false });
    if (error) console.error("[Professors] Fetch error:", error);
    setProfessors(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfessors();
  }, []);

  const openCoursesSheet = async (prof) => {
    setCoursesSheet(prof);
    setCoursesLoading(true);
    const { data } = await supabase
      .from("courses")
      .select("*, enrollments(count)")
      .eq("professor_id", prof.id)
      .order("created_at", { ascending: false });
    setProfCourses(data || []);
    setCoursesLoading(false);
  };

  const handleRevoke = async () => {
    if (!revokeDialog) return;
    setActionLoading(true);
    try {
      // Fix 3: Pause account instead of changing role
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: "paused" })
        .eq("id", revokeDialog.id);
      if (error) throw error;

      // Send suspension notification via mailto
      const subject = encodeURIComponent('Your Cognitrix Account Access');
      const body = encodeURIComponent(
        `Dear ${revokeDialog.full_name},\n\nYour Cognitrix professor account has been suspended by the administrator.\n\nIf you believe this is an error, please contact cognitrix.iiitd@gmail.com\n\n— The Cognitrix Team`
      );
      window.open(`mailto:${revokeDialog.email}?subject=${subject}&body=${body}`);

      toast({
        title: "Account paused",
        description: `${revokeDialog.full_name}'s account has been paused. They will not be able to log in.`,
      });
      setRevokeDialog(null);
      setRevokeConfirm("");
      fetchProfessors();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : professors.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No professors found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Courses</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {professors.map((p) => {
                const courseCount = p.courses?.[0]?.count ?? 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.full_name || "—"}
                      {p.account_status === "paused" && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-200">Paused</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{p.email || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{courseCount}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                      {formatDate(p.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => openCoursesSheet(p)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Courses
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setRevokeDialog(p)}
                        >
                          <UserMinus className="w-3 h-3 mr-1" />
                          Revoke
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Courses Sheet */}
      <Sheet open={!!coursesSheet} onOpenChange={() => setCoursesSheet(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{coursesSheet?.full_name}'s Courses</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {coursesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : profCourses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No courses created.</p>
            ) : (
              <div className="space-y-3">
                {profCourses.map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {c.category?.replace(/_/g, " ")} · {formatDate(c.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {c.enrollments?.[0]?.count ?? 0} students
                        </Badge>
                        <StatusBadge status={c.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Revoke Dialog */}
      <Dialog open={!!revokeDialog} onOpenChange={() => { setRevokeDialog(null); setRevokeConfirm(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" />
              Revoke Professor Access
            </DialogTitle>
            <DialogDescription>
              This will suspend <strong>{revokeDialog?.full_name}</strong>'s account.
              They will not be able to log in. Their courses and data will remain intact.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type the professor's name to confirm:
            </label>
            <input
              type="text"
              value={revokeConfirm}
              onChange={(e) => setRevokeConfirm(e.target.value)}
              placeholder={revokeDialog?.full_name}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRevokeDialog(null); setRevokeConfirm(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revokeConfirm !== revokeDialog?.full_name || actionLoading}
              onClick={handleRevoke}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — Courses
// ═══════════════════════════════════════════════════════════════
function CoursesSection({ toast }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    let query = supabase
      .from("courses")
      .select("*, profiles(full_name), enrollments(count)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);

    const { data, error } = await query;
    if (error) console.error("[Courses] Fetch error:", error);
    setCourses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, [statusFilter, search]);

  const toggleStatus = async (course) => {
    const newStatus = course.status === "published" ? "archived" : "published";
    const { error } = await supabase
      .from("courses")
      .update({ status: newStatus })
      .eq("id", course.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status updated", description: `Course is now ${newStatus}.` });
      fetchCourses();
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", deleteDialog.id);
      if (error) throw error;
      toast({
        title: "Course deleted",
        description: `"${deleteDialog.title}" has been permanently deleted.`,
      });
      setDeleteDialog(null);
      setDeleteConfirm("");
      fetchCourses();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d]"
          />
        </div>
        {/* Status filter */}
        <div className="flex gap-2">
          {["all", "published", "draft", "archived"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === f
                  ? "bg-[#00a98d] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No courses found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Professor</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Students</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {c.title}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-500">
                    {c.profiles?.full_name || c.professor_name || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-gray-500 capitalize">
                    {c.category?.replace(/_/g, " ") || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {c.enrollments?.[0]?.count ?? 0}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                    {formatDate(c.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Link to={createPageUrl("CourseDetail") + `?id=${c.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => toggleStatus(c)}
                      >
                        {c.status === "published" ? (
                          <ToggleRight className="w-3 h-3 mr-1" />
                        ) : (
                          <ToggleLeft className="w-3 h-3 mr-1" />
                        )}
                        {c.status === "published" ? "Archive" : "Publish"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setDeleteDialog(c)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => { setDeleteDialog(null); setDeleteConfirm(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Course
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>"{deleteDialog?.title}"</strong>{" "}
              including all lectures, quizzes, and enrollments. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type the course title to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deleteDialog?.title}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialog(null); setDeleteConfirm(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== deleteDialog?.title || actionLoading}
              onClick={handleDelete}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7 — Quiz Overview
// ═══════════════════════════════════════════════════════════════
function QuizzesSection() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [questions, setQuestions] = useState({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select(
          "*, courses(title, profiles(full_name)), quiz_questions(count), quiz_attempts(count)",
        )
        .order("created_at", { ascending: false });
      if (error) console.error("[Quizzes] Fetch error:", error);
      setQuizzes(data || []);
      setLoading(false);
    })();
  }, []);

  const loadQuestions = async (quizId) => {
    if (questions[quizId]) return;
    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: true });
    setQuestions((prev) => ({ ...prev, [quizId]: data || [] }));
  };

  const toggleExpand = (quizId) => {
    if (expandedId === quizId) {
      setExpandedId(null);
    } else {
      setExpandedId(quizId);
      loadQuestions(quizId);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No quizzes found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Quiz Title</TableHead>
                <TableHead className="hidden md:table-cell">Course</TableHead>
                <TableHead className="hidden lg:table-cell">Professor</TableHead>
                <TableHead className="hidden sm:table-cell">Questions</TableHead>
                <TableHead className="hidden sm:table-cell">Attempts</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((q) => (
                <React.Fragment key={q.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-gray-50/50"
                    onClick={() => toggleExpand(q.id)}
                  >
                    <TableCell>
                      {expandedId === q.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">
                      {q.courses?.title || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                      {q.courses?.profiles?.full_name || "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {q.quiz_questions?.[0]?.count ?? 0}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {q.quiz_attempts?.[0]?.count ?? 0}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                      {formatDate(q.created_at)}
                    </TableCell>
                  </TableRow>
                  {expandedId === q.id && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-gray-50/50 p-4">
                        {!questions[q.id] ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        ) : questions[q.id].length === 0 ? (
                          <p className="text-sm text-gray-400 text-center">
                            No questions in this quiz.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {questions[q.id].map((qq, idx) => (
                              <div key={qq.id} className="bg-white rounded-lg border border-gray-100 p-3">
                                <p className="text-sm text-gray-800">
                                  <span className="font-medium text-gray-500 mr-2">
                                    Q{idx + 1}.
                                  </span>
                                  {qq.question_text}
                                </p>
                                {qq.choices && qq.choices.length > 0 && (
                                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                    {qq.choices.map((ch, ci) => (
                                      <p
                                        key={ci}
                                        className={`text-xs px-2 py-1 rounded ${
                                          ci === qq.correct_index
                                            ? "bg-emerald-50 text-emerald-700 font-medium"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + ci)}. {ch}
                                      </p>
                                    ))}
                                  </div>
                                )}
                                <div className="mt-1.5 flex gap-2">
                                  <Badge variant="outline" className="text-[10px]">
                                    {qq.question_type?.replace(/_/g, " ")}
                                  </Badge>
                                  {qq.topic && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {qq.topic}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Utility ─────────────────────────────────────────────────
function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str,
  );
}
