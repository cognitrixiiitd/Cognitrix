/**
 * pages.config.js - Page routing configuration
 */
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import CourseCatalog from "./pages/CourseCatalog";
import CourseDetail from "./pages/CourseDetail";
import CourseEditor from "./pages/CourseEditor";
import CoursePlayer from "./pages/CoursePlayer";
import CreateCourse from "./pages/CreateCourse";

import MyLearning from "./pages/MyLearning";
import ProfessorCourses from "./pages/ProfessorCourses";
import ProfessorDashboard from "./pages/ProfessorDashboard";
import ProfessorQA from "./pages/ProfessorQA";
import ProfessorSignUp from "./pages/ProfessorSignUp";
import StudentAchievements from "./pages/StudentAchievements";
import StudentDashboard from "./pages/StudentDashboard";
import StudentQA from "./pages/StudentQA";
import __Layout from "./Layout.jsx";

export const PAGES = {
  AdminDashboard: AdminDashboard,
  Analytics: Analytics,
  CourseCatalog: CourseCatalog,
  CourseDetail: CourseDetail,
  CourseEditor: CourseEditor,
  CoursePlayer: CoursePlayer,
  CreateCourse: CreateCourse,

  MyLearning: MyLearning,
  ProfessorCourses: ProfessorCourses,
  ProfessorDashboard: ProfessorDashboard,
  ProfessorQA: ProfessorQA,
  ProfessorSignUp: ProfessorSignUp,
  StudentAchievements: StudentAchievements,
  StudentDashboard: StudentDashboard,
  StudentQA: StudentQA,
};

export const pagesConfig = {
  mainPage: "ProfessorDashboard",
  Pages: PAGES,
  Layout: __Layout,
};
