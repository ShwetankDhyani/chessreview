import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const StatsPage = lazy(() => import("./pages/StatsPage"));

const path = window.location.pathname;
const isStats =
  path === "/stats" || path.startsWith("/stats/");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isStats ? (
      <Suspense
        fallback={
          <div className="min-h-[100dvh] bg-chess-bg flex items-center justify-center text-chess-muted text-sm">
            Loading stats…
          </div>
        }
      >
        <StatsPage />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
