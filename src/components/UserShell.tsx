import { Outlet, useLocation } from "react-router-dom";
import App from "../App";

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
      <div
        className={onReview ? "contents" : "hidden"}
        aria-hidden={!onReview}
      >
        <App isCovered={!onReview} />
      </div>
      {!onReview ? (
        <div className="spa-panel-enter min-h-0 h-[100dvh]">
          <Outlet />
        </div>
      ) : null}
    </>
  );
}
