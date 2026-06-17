import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AdminPage from "./pages/AdminPage";
import "./index.css";

const root = document.getElementById("root")!;
const path = window.location.pathname.replace(/\/$/, "") || "/";

const Page = path === "/admin" ? AdminPage : App;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>
);
