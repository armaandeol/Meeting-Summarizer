/**
 * Connection diagnostic utilities for the meeting summarizer app
 */

/**
 * Check if the proxy server is available
 * @returns {Promise<{available: boolean, message: string}>}
 */
export const checkProxyServerConnection = async () => {
  try {
    // Simple fetch with a 3-second timeout
    const response = await fetch("http://localhost:3001/api/analyze-audio", {
      method: "OPTIONS",
      signal: AbortSignal.timeout(3000),
    });

    // ANY response means the server is running - even 404s
    return {
      available: true,
      message: "Proxy server is available",
    };
  } catch (error) {
    console.log("Proxy server check error:", error.name, error.message);

    return {
      available: false,
      message:
        "Cannot connect to proxy server. Is it running on http://localhost:3001?",
    };
  }
};

/**
 * Check if Firebase is properly configured and accessible
 * @returns {Promise<{configured: boolean, accessible: boolean, message: string}>}
 */
export const checkFirebaseConnection = async () => {
  try {
    // Dynamic import to avoid circular dependencies
    const { db, getApp } = await import("../firebase");

    // Check if Firebase app is initialized
    try {
      getApp();
    } catch (e) {
      return {
        configured: false,
        accessible: false,
        message: "Firebase app is not initialized. Check your configuration.",
      };
    }

    // Try a simple Firestore read operation with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      // Try to access a test collection
      const testRef = db.collection("__connection_test__").doc("test");
      await testRef.get({ signal: controller.signal });
      clearTimeout(timeoutId);

      return {
        configured: true,
        accessible: true,
        message: "Firebase connection successful",
      };
    } catch (error) {
      clearTimeout(timeoutId);

      return {
        configured: true,
        accessible: false,
        message: `Firebase is configured but not accessible: ${error.message}`,
      };
    }
  } catch (error) {
    console.error("Firebase connection check failed:", error);
    return {
      configured: false,
      accessible: false,
      message: `Firebase connection check error: ${error.message}`,
    };
  }
};

/**
 * Check if Deepgram API key is valid
 * @param {string} apiKey - The Deepgram API key to check
 * @returns {Promise<{valid: boolean, message: string}>}
 */
export const checkDeepgramApiKey = async (apiKey) => {
  if (!apiKey) {
    return { valid: false, message: "No API key provided" };
  }

  try {
    // First check if proxy is available
    const proxyCheck = await checkProxyServerConnection();
    if (!proxyCheck.available) {
      return {
        valid: false,
        message: `Cannot validate Deepgram API key: ${proxyCheck.message}`,
      };
    }

    // Use the proxy to validate the API key
    const response = await fetch("http://localhost:3001/api/validate-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey }),
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: data.valid,
        message: data.valid
          ? "API key is valid"
          : data.message || "Invalid API key",
      };
    }

    return {
      valid: false,
      message: `Failed to validate API key: ${response.statusText}`,
    };
  } catch (error) {
    return {
      valid: false,
      message: `API key validation error: ${error.message}`,
    };
  }
};
