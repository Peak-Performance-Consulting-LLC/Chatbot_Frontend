import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { PlatformAuthProvider } from "@/platform/state/auth";
import "./styles.css";
import "@/platform/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlatformAuthProvider>
        <App />
      </PlatformAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
