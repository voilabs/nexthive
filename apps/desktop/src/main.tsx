import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/space-grotesk/wght.css";
import App from "@/app/App";
import "@/index.css";

document.documentElement.classList.toggle(
  "dark",
  window.matchMedia("(prefers-color-scheme: dark)").matches,
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
