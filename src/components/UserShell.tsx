import { Outlet, useLocation } from "react-router-dom";
import App from "../App";
import { TestingModeBanner } from "./TestingModeBanner";

/**
 * Keeps the review app mounted when visiting Blog / Privacy / About / Share
 * so an in-flight analysis can continue in the background. Admin is routed
 * separately and remounts on its own.
 */
export function UserShell() {
  const { pathname } = useLocation();
  const normalized = pathname.replace(/\/$/, "") || "/";
  const onReview = normalized === "/";

  return (
    <>
      <TestingModeBanner />
      <div
        className="h-[100dvh] min-h-0 overflow-hidden"
        style={{ paddingTop: "var(--testing-banner-h, 0px)" }}
      >
        <div
          className={onReview ? "h-full min-h-0" : "hidden"}
          aria-hidden={!onReview}
        >
          <App isCovered={!onReview} />
        </div>
        {!onReview ? (
          <div className="spa-panel-enter min-h-0 h-full">
            <Outlet />
          </div>
        ) : null}
      </div>
    </>
  );
}
