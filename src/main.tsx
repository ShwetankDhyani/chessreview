import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { UserShell } from "./components/UserShell";
import AdminPage from "./pages/AdminPage";
import SharePage from "./pages/SharePage";
import PrivacyPage from "./pages/PrivacyPage";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import NotFoundPage from "./pages/NotFoundPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppCrashScreen } from "./components/AppCrashScreen";
import { installGlobalErrorHandlers } from "./utils/globalErrorHandlers";
import "./index.css";

installGlobalErrorHandlers();

/** Route changes clear a stuck boundary so navigation is always a way out. */
function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <ErrorBoundary name="route" resetKeys={[location.pathname]}>
      {children}
    </ErrorBoundary>
  );
}

function Root() {
  return (
    <ErrorBoundary
      name="app-root"
      fallback={({ error, reset }) => (
        <AppCrashScreen error={error} onRetry={reset} />
      )}
    >
      <BrowserRouter>
        <RoutedErrorBoundary>
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
            <Route element={<UserShell />}>
              <Route path="/" element={null} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/r/:id" element={<SharePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </RoutedErrorBoundary>
        <Analytics />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

const container = document.getElementById("root");

if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
} else {
  // The mount point is missing, so React cannot render the usual UI. Say so in
  // plain HTML rather than failing silently on a blank page.
  const notice = document.createElement("div");
  notice.setAttribute(
    "style",
    "font-family:Inter,system-ui,sans-serif;background:#262421;color:#f1f1f1;" +
      "min-height:100vh;display:flex;align-items:center;justify-content:center;" +
      "padding:24px;text-align:center;line-height:1.6"
  );
  notice.innerHTML =
    "<div><h1 style='font-size:16px;margin:0 0 8px'>ChessReview could not start</h1>" +
    "<p style='font-size:13px;color:#8b8784;margin:0'>Please reload the page. " +
    "If this keeps happening, try a hard refresh.</p></div>";
  document.body.appendChild(notice);
}
