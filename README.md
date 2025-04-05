# Meeting Summarizer

This application records and transcribes meetings using Deepgram's API through a proxy server.

## Setup and Running

### 1. Install dependencies for both client and server:

```bash
# Install client dependencies (from the root folder)
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Start the proxy server:

```bash
# From the root folder
cd server
npm start
```

The server will run on http://localhost:3001

### 3. Start the React app:

```bash
# From the root folder, in a new terminal
npm start
```

The React app will run on http://localhost:3000

## How it works

1. The React app records audio and sends it to Firebase Storage
2. When analysis is needed, the app sends the audio URL to our proxy server
3. The proxy server forwards the request to Deepgram's API with proper authentication
4. Deepgram processes the audio and returns results to the proxy
5. The proxy forwards the results back to the React app
6. The app displays the analysis results to the user

This proxy approach avoids CORS issues that happen when calling Deepgram directly from the browser.

## CORS Solution for Deepgram API

The application currently faces a CORS (Cross-Origin Resource Sharing) restriction when calling Deepgram's API directly from the browser. Here are solutions to fix this:

### Option 1: Firebase Functions (Recommended)

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize Functions: `firebase init functions`
3. Create a function in `functions/index.js`:

```javascript
const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const axios = require("axios");

exports.analyzeAudio = functions.https.onCall(async (data, context) => {
  // Verify authentication if needed
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in"
    );
  }

  const { audioUrl, apiKey } = data;

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

    return response.data;
  } catch (error) {
    console.error("Deepgram API error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
```

4. Deploy: `firebase deploy --only functions`
5. Update your client code to call this function instead of directly calling Deepgram

### Option 2: Simple Express.js Proxy Server

Create a simple server that proxies requests to Deepgram:

```javascript
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();

app.use(cors());
app.use(express.json());

app.post("/analyze-audio", async (req, res) => {
  const { audioUrl, apiKey } = req.body;

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

    res.json(response.data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Option 3: Deepgram Proxy Solution

Follow Deepgram's proxy solution guidance at: https://dpgr.am/js-proxy
