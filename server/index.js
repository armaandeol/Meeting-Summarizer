const express = require("express");
const cors = require("cors");
const axios = require("axios");
const bodyParser = require("body-parser");
const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for your React app domain
app.use(
  cors({
    origin: "http://localhost:3000", // Update this to your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON request bodies
app.use(bodyParser.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Deepgram proxy server is running" });
});

// Proxy endpoint for Deepgram transcribeUrl
app.post("/api/analyze-audio", async (req, res) => {
  const { audioUrl, apiKey } = req.body;

  if (!audioUrl || !apiKey) {
    return res
      .status(400)
      .json({ error: "Missing required parameters: audioUrl and apiKey" });
  }

  console.log("🔄 Proxying request to Deepgram API:", {
    url: audioUrl,
    modelType: "nova-3",
  });

  try {
    const response = await axios({
      method: "POST",
      url: "https://api.deepgram.com/v1/listen",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      params: {
        model: "nova-3",
        sentiment: true,
        intents: true,
        summarize: "v2",
        topics: true,
      },
      data: {
        url: audioUrl,
      },
    });

    console.log("✅ Received response from Deepgram API");
    console.log(
      `📊 Response includes: ${Object.keys(response.data.results || {}).join(
        ", "
      )}`
    );

    res.json(response.data);
  } catch (error) {
    console.error("❌ Proxy Error:", error.message);

    // Send a more helpful error response
    res.status(error.response?.status || 500).json({
      error: "Proxy error when calling Deepgram API",
      message: error.message,
      details: error.response?.data,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Deepgram proxy server running on port ${PORT}`);
  console.log(`🔗 Test the server health at: http://localhost:${PORT}/health`);
});
