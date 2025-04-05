import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// Basic CSS in case styles aren't loading
if (!document.getElementById("basic-styles")) {
  const style = document.createElement("style");
  style.id = "basic-styles";
  style.innerHTML = `
    body { margin: 0; padding: 0; font-family: sans-serif; }
    .loading { display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a202c; color: white; }
  `;
  document.head.appendChild(style);
}

// Create a fallback component in case the app fails
const FallbackComponent = () => (
  <div className="loading">
    <div>
      <h1>Meeting Summariser</h1>
      <p>Loading application...</p>
    </div>
  </div>
);

const root = document.getElementById("root") || document.createElement("div");
if (!document.getElementById("root")) {
  root.id = "root";
  document.body.appendChild(root);
}

try {
  const reactRoot = ReactDOM.createRoot(root);
  reactRoot.render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error("Failed to render app:", error);
  root.innerHTML = "";
  const fallbackRoot = ReactDOM.createRoot(root);
  fallbackRoot.render(<FallbackComponent />);
}
