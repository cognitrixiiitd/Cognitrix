import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { base44 } from "@/api/base44Client";
import {
  GraduationCap,
  BookOpen,
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  MessageSquare,
  Route,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const professorNav = [
  { label: "Dashboard", icon: LayoutDashboard, page: "ProfessorDashboard" },
  { label: "Create Course", icon: PlusCircle, page: "CreateCourse" },
  { label: "My Courses", icon: BookOpen, page: "ProfessorCourses" },
  { label: "Analytics", icon: BarChart3, page: "Analytics" },
  { label: "Q&A", icon: MessageSquare, page: "ProfessorQA" },
];

const studentNav = [
  { label: "Dashboard", icon: LayoutDashboard, page: "StudentDashboard" },
  { label: "Browse Courses", icon: BookOpen, page: "CourseCatalog" },
  { label: "My Learning", icon: GraduationCap, page: "MyLearning" },
  { label: "Achievements", icon: BarChart3, page: "StudentAchievements" },
  { label: "Learning Paths", icon: Route, page: "LearningPaths" },
  { label: "Q&A", icon: MessageSquare, page: "StudentQA" },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch {
        // not logged in
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const isPublicPage = ["CourseCatalog", "LandingPage"].includes(
    currentPageName,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#00a98d] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 tracking-wide">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !isPublicPage) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-[#00a98d]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-8 h-8 text-[#00a98d]" />
          </div>
          <h1 className="text-2xl font-semibold text-black mb-2">
            Welcome to EduFlow
          </h1>
          <p className="text-gray-500 mb-8">
            Sign in with your college account to access the platform.
          </p>
          <Button
            onClick={() => base44.auth.redirectToLogin()}
            className="bg-[#00a98d] hover:bg-[#008f77] text-white px-8 py-3 rounded-xl text-sm font-medium"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const professorPages = new Set([
    "ProfessorDashboard",
    "CreateCourse",
    "ProfessorCourses",
    "Analytics",
    "ProfessorQA",
    "CourseEditor",
  ]);
  const isProfessor = user?.role === "admin";
  const isOnProfessorPage = professorPages.has(currentPageName);
  // Only admins on professor pages see professorNav. Students NEVER see professorNav.
  const navItems = isProfessor && isOnProfessorPage ? professorNav : studentNav;
  // Non-admins cannot access professor pages — redirect them away
  const isUnauthorizedProfessorPage =
    !isProfessor && professorPages.has(currentPageName);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <style>{`
        :root {
          --color-primary: #00a98d;
          --color-primary-hover: #008f77;
          --color-muted: #808080;
          --color-bg: #ffffff;
          --color-text: #000000;
          --color-surface: #fafafa;
        }
      `}</style>

      {/* Top Nav */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-50 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-50 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <Link
            to={createPageUrl(
              isOnProfessorPage ? "ProfessorDashboard" : "StudentDashboard",
            )}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 bg-[#00a98d] rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-black">
              EduFlow
            </span>
          </Link>
          {isProfessor && (
            <Link
              to={createPageUrl(
                isOnProfessorPage ? "StudentDashboard" : "ProfessorDashboard",
              )}
              className="hidden sm:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider border transition-colors cursor-pointer border-[#00a98d]/30 text-[#00a98d] bg-[#00a98d]/10 hover:bg-[#00a98d]/20"
            >
              {isOnProfessorPage ? "→ Student View" : "→ Professor"}
            </Link>
          )}
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-gray-50 rounded-xl px-3 py-2 transition-colors">
                <div className="w-8 h-8 bg-[#00a98d]/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-[#00a98d]">
                    {user.full_name?.[0]?.toUpperCase() ||
                      user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {user.full_name || user.email}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user.full_name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => base44.auth.logout()}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        {user && (
          <>
            {/* Mobile overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <aside
              className={`
              fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-100 z-40
              transform transition-transform duration-200 ease-out
              lg:translate-x-0
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}
            >
              <nav className="p-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                        ${
                          isActive
                            ? "bg-[#00a98d]/10 text-[#00a98d]"
                            : "text-gray-600 hover:bg-gray-50 hover:text-black"
                        }
                      `}
                    >
                      <item.icon
                        className={`w-[18px] h-[18px] ${isActive ? "text-[#00a98d]" : "text-gray-400"}`}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main
          className={`flex-1 min-h-[calc(100vh-4rem)] ${user ? "lg:ml-64" : ""}`}
        >
          <div className="p-4 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
