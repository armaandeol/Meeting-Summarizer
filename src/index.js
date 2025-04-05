import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Error handler for the entire app
window.addEventListener("error", (event) => {
  console.error("Global error caught:", event.error);
});

// Debug environment variables - safely
console.log("React app starting");

// Create root with error handling
try {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Failed to render React application:", error);
  document.body.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif;">
      <h1 style="color:#e53e3e;">Application Error</h1>
      <p>The application failed to start. Please check the console for details.</p>
      <button onclick="window.location.reload()" style="margin-top:20px;padding:8px 16px;background:#3182ce;color:white;border:none;border-radius:4px;cursor:pointer;">
        Reload
      </button>
    </div>
  `;
}
