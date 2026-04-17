import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "./utils";
import { useAuth } from "@/lib/AuthContext";
import {
  GraduationCap,
  BookOpen,
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  MessageSquare,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Shield,
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
  { label: "Q&A", icon: MessageSquare, page: "StudentQA" },
];

export default function Layout({ children, currentPageName }) {
  const { profile, user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName = profile?.full_name || user?.email || "User";
  const userRole = profile?.role || "student";

  const isPublicPage = ["CourseCatalog", "LandingPage"].includes(
    currentPageName,
  );

  const professorPages = new Set([
    "ProfessorDashboard",
    "CreateCourse",
    "ProfessorCourses",
    "Analytics",
    "ProfessorQA",
    "CourseEditor",
  ]);
  const isProfessor = userRole === "professor" || userRole === "admin";
  const isAdmin = userRole === "admin";
  const isOnProfessorPage = professorPages.has(currentPageName);

  const adminNavItem = { label: "Admin Dashboard", icon: Shield, page: "AdminDashboard" };
  const baseNav = isProfessor && isOnProfessorPage ? professorNav : studentNav;
  const navItems = isAdmin ? [adminNavItem, ...baseNav] : baseNav;

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
              Cognitrix
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-gray-50 rounded-xl px-3 py-2 transition-colors">
              <div className="w-8 h-8 bg-[#00a98d]/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-[#00a98d]">
                  {displayName[0]?.toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {displayName}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              <p className="text-xs text-gray-400 capitalize">{userRole}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
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

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] lg:ml-64">
          <div className="p-4 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
