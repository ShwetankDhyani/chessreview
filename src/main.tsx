import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import AdminPage from "./pages/AdminPage";
import SharePage from "./pages/SharePage";
import PrivacyPage from "./pages/PrivacyPage";
import AboutPage from "./pages/AboutPage";
import "./index.css";

const root = document.getElementById("root")!;
const path = window.location.pathname.replace(/\/$/, "") || "/";

function pickPage() {
  if (path === "/admin") return AdminPage;
  if (path === "/privacy") return PrivacyPage;
  if (path === "/about") return AboutPage;
  if (/^\/r\/[^/]+$/.test(path)) return SharePage;
  return App;
}

const Page = pickPage();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <>
      <Page />
      <Analytics />
    </>
  </React.StrictMode>
);
