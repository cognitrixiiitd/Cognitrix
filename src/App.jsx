import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { pagesConfig } from "./pages.config";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import Login from "@/pages/Login";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, authTimedOut, retryAuth, profile } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#fafafa]">
        <div className="w-8 h-8 border-4 border-[#00a98d]/20 border-t-[#00a98d] rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 mt-4">Loading session...</p>
      </div>
    );
  }

  if (authTimedOut && !isAuthenticated) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#fafafa] p-4 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-orange-500 text-2xl">⚠️</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Connection Timeout</h2>
        <p className="text-sm text-gray-500 max-w-md mb-6">
          We couldn't connect to the authentication server. This usually happens if the server is waking up from sleep mode or if your connection is unstable.
        </p>
        <button
          onClick={retryAuth}
          className="bg-[#00a98d] hover:bg-[#008f77] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/Login" element={<Login />} />
        <Route path="*" element={<Navigate to="/Login" replace />} />
      </Routes>
    );
  }

  const roleHome = profile?.role === "student" ? "StudentDashboard" : "ProfessorDashboard";
  const RoleHomePage = Pages[roleHome] || Pages[mainPageKey];

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={roleHome}>
            <RoleHomePage />
          </LayoutWrapper>
        }
      />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/Login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
