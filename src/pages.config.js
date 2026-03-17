/**
 * pages.config.js - Page routing configuration
 *
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 *
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 *
 * Example file structure:
 *
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 *
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Analytics from "./pages/Analytics";
import CourseCatalog from "./pages/CourseCatalog";
import CourseDetail from "./pages/CourseDetail";
import CourseEditor from "./pages/CourseEditor";
import CoursePlayer from "./pages/CoursePlayer";
import CreateCourse from "./pages/CreateCourse";
import LearningPaths from "./pages/LearningPaths";
import MyLearning from "./pages/MyLearning";
import ProfessorCourses from "./pages/ProfessorCourses";
import ProfessorDashboard from "./pages/ProfessorDashboard";
import ProfessorQA from "./pages/ProfessorQA";
import StudentAchievements from "./pages/StudentAchievements";
import StudentDashboard from "./pages/StudentDashboard";
import StudentQA from "./pages/StudentQA";
import __Layout from "./Layout.jsx";

export const PAGES = {
  Analytics: Analytics,
  CourseCatalog: CourseCatalog,
  CourseDetail: CourseDetail,
  CourseEditor: CourseEditor,
  CoursePlayer: CoursePlayer,
  CreateCourse: CreateCourse,
  LearningPaths: LearningPaths,
  MyLearning: MyLearning,
  ProfessorCourses: ProfessorCourses,
  ProfessorDashboard: ProfessorDashboard,
  ProfessorQA: ProfessorQA,
  StudentAchievements: StudentAchievements,
  StudentDashboard: StudentDashboard,
  StudentQA: StudentQA,
};

export const pagesConfig = {
  mainPage: "ProfessorDashboard",
  Pages: PAGES,
  Layout: __Layout,
};
