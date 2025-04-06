// File: api/index.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();

// Enable CORS for all origins in development, specific origins in production
app.use(
  cors({
    origin: "*", // Allow all origins - you can restrict this in production
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Increase the limit for JSON payloads
app.use(bodyParser.json({ limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Deepgram proxy server is running" });
});

// Validate audio URL
function isValidAudioUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (e) {
    return false;
  }
}

// Proxy endpoint for Deepgram transcribeUrl
app.post("/api/analyze-audio", async (req, res) => {
  const { audioUrl, apiKey, options } = req.body;

  console.log("📥 Received analyze-audio request");

  if (!audioUrl || !apiKey) {
    console.error("❌ Missing required parameters");
    return res
      .status(400)
      .json({ error: "Missing required parameters: audioUrl and apiKey" });
  }

  // Validate the audio URL
  if (!isValidAudioUrl(audioUrl)) {
    console.error("❌ Invalid audio URL:", audioUrl);
    return res.status(400).json({ error: "Invalid audio URL format" });
  }

  console.log("🔄 Proxying request to Deepgram API:", {
    url: audioUrl,
    modelType: options?.model || "nova-3",
  });

  try {
    // Set timeout for the Deepgram API request - 25 seconds
    const deepgramResponse = await axios({
      method: "POST",
      url: "https://api.deepgram.com/v1/listen",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      params: {
        model: options?.model || "nova-3",
        sentiment: true,
        intents: true,
        summarize: "v2",
        topics: true,
        diarize: true,
        ...(options || {}),
      },
      data: {
        url: audioUrl,
      },
      timeout: 25000, // 25 second timeout
    });

    console.log("✅ Received response from Deepgram API");
    console.log(
      `📊 Response includes: ${Object.keys(
        deepgramResponse.data.results || {}
      ).join(", ")}`
    );

    res.json(deepgramResponse.data);
  } catch (error) {
    console.error("❌ Proxy Error:", error.message);

    if (error.response) {
      // The request was made and the server responded with a non-2xx status
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);

      res.status(error.response.status).json({
        error: "Error from Deepgram API",
        message: error.message,
        details: error.response.data,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received from Deepgram API");
      res.status(504).json({
        error: "Gateway Timeout",
        message: "No response received from Deepgram API",
      });
    } else if (error.code === "ECONNABORTED") {
      // Request timeout
      res.status(504).json({
        error: "Timeout",
        message: "Deepgram API request timed out",
      });
    } else {
      // Something happened in setting up the request
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }
});

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Deepgram proxy server running on port ${PORT}`);
    console.log(
      `🔗 Test the server health at: http://localhost:${PORT}/health`
    );
  });
}

// Export for Vercel serverless functions
module.exports = app;
