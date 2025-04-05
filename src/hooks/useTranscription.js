import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { saveTranscriptionToFirebase } from "../services/firebaseService";

export const useTranscription = (DEEPGRAM_API_KEY) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptEntries, setTranscriptEntries] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("Not Connected");
  const [sentimentData, setSentimentData] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [detectedEntities, setDetectedEntities] = useState([]);
  const [detectedIntents, setDetectedIntents] = useState([]);
  const [summary, setSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [deepgramAnalysis, setDeepgramAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { currentUser } = useAuth() || {};
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const speakerMapRef = useRef(new Map());
  const audioChunksRef = useRef([]);
  const transcriptEndRef = useRef(null);

  const checkMicrophoneAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(
        (device) => device.kind === "audioinput"
      );
      console.log("Available audio input devices:", audioInputs.length);

      if (audioInputs.length === 0) {
        return {
          available: false,
          message: "No microphone detected on this device.",
        };
      }
      return { available: true };
    } catch (error) {
      console.error("Error checking audio devices:", error);
      return {
        available: false,
        message: error.message || "Unable to check microphone availability",
      };
    }
  };

  // Handle WebSocket messages
  const handleMessage = useCallback((message) => {
    try {
      const data = JSON.parse(message.data);

      if (data.channel?.alternatives?.[0]?.words && data.is_final) {
        const words = data.channel.alternatives[0].words;
        const newEntries = [];
        let currentSpeaker = -1;
        let currentText = [];

        words.forEach((word) => {
          const speakerId = word.speaker !== undefined ? word.speaker : -1;
          if (!speakerMapRef.current.has(speakerId)) {
            speakerMapRef.current.set(speakerId, speakerMapRef.current.size);
          }
          const displaySpeaker = speakerMapRef.current.get(speakerId);

          if (displaySpeaker !== currentSpeaker && currentText.length > 0) {
            newEntries.push({
              speaker: currentSpeaker,
              text: currentText.join(" "),
              timestamp: Date.now(),
            });
            currentText = [];
          }
          currentSpeaker = displaySpeaker;
          currentText.push(word.punctuated_word || word.word);
        });
        if (currentText.length > 0) {
          newEntries.push({
            speaker: currentSpeaker,
            text: currentText.join(" "),
            timestamp: Date.now(),
          });
        }

        if (newEntries.length > 0) {
          setTranscriptEntries((prev) => [...prev, ...newEntries]);
          newEntries.forEach((entry) =>
            detectActionItems(entry.text, entry.speaker)
          );
        }
      }

      const results = data.channel?.alternatives?.[0];

      // Process sentiment data
      if (
        results?.sentiment_segments &&
        Array.isArray(results.sentiment_segments)
      ) {
        const newSentimentData = results.sentiment_segments.map((seg) => ({
          text: seg.text,
          sentiment: seg.sentiment,
          score: seg.sentiment_score,
          start_word: seg.start_word,
          end_word: seg.end_word,
          timestamp: Date.now(),
        }));
        if (newSentimentData.length > 0) {
          setSentimentData((prev) => [...prev, ...newSentimentData]);
        }
      }

      // Process topics
      if (results?.topics && Array.isArray(results.topics)) {
        const newTopics = results.topics.map((t) => ({
          topic: t.topic,
          confidence_score: t.confidence_score,
        }));
        if (newTopics.length > 0) {
          setTopics((prev) => [...prev, ...newTopics]);
        }
      }

      // Process entities
      if (results?.entities && Array.isArray(results.entities)) {
        const newEntities = results.entities.map((e) => ({
          label: e.label,
          value: e.value,
          confidence: e.confidence,
          start_word: e.start_word,
          end_word: e.end_word,
        }));
        if (newEntities.length > 0) {
          setDetectedEntities((prev) => [...prev, ...newEntities]);
        }
      }

      // Process intents
      if (results?.intents && Array.isArray(results.intents)) {
        const newIntents = results.intents.map((i) => ({
          intent: i.intent,
          confidence_score: i.confidence_score,
        }));
        if (newIntents.length > 0) {
          setDetectedIntents((prev) => [...prev, ...newIntents]);
        }
      }

      // Process summary
      if (data.results?.summary?.short) {
        const finalSummary = data.results.summary.short;
        setSummary(finalSummary);
      }
    } catch (error) {
      console.error("Message processing error:", error);
    }
  }, []);

  // Detect action items from text
  const detectActionItems = useCallback((text, speaker) => {
    const actionRegex =
      /(\b(I need to|we should|must|please|action item|task|assign|follow up|next step|remember to|don't forget|critical|urgent)\b.*?)(?:\.|$|;)/gi;
    const matches = [...text.matchAll(actionRegex)];
    if (matches.length > 0) {
      setActionItems((prev) => {
        const existingTexts = new Set(
          prev.map((item) => item.text.toLowerCase())
        );
        const newItems = matches
          .map((m) => m[1].trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ""))
          .filter(
            (txt) => txt.length > 10 && !existingTexts.has(txt.toLowerCase())
          );
        return [
          ...prev,
          ...newItems.map((txt) => ({
            text: txt,
            speaker,
            timestamp: Date.now(),
            completed: false,
            id: crypto.randomUUID(),
          })),
        ];
      });
    }
  }, []);

  // Save recording to Firebase
  const saveRecording = async () => {
    if (audioChunksRef.current.length === 0 || !currentUser) return;

    try {
      await saveTranscriptionToFirebase({
        audioChunks: audioChunksRef.current,
        transcriptEntries,
        summary,
        topics,
        currentUser,
      });

      // Notify user
      alert("Meeting saved and analyzed successfully!");
    } catch (error) {
      console.error("Error saving meeting:", error);
      alert("Failed to save meeting: " + error.message);
    }
  };

  // Analyze audio with Deepgram
  const analyzeAudioWithDeepgram = async (audioUrl) => {
    if (!audioUrl || !DEEPGRAM_API_KEY) return null;

    setIsAnalyzing(true);

    try {
      console.log("⏳ Sending audio to proxy server for analysis...");

      const proxyResponse = await fetch(
        "http://localhost:3001/api/analyze-audio",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audioUrl,
            apiKey: DEEPGRAM_API_KEY,
          }),
        }
      );

      if (!proxyResponse.ok) {
        throw new Error(
          `Proxy server returned ${
            proxyResponse.status
          }: ${await proxyResponse.text()}`
        );
      }

      const result = await proxyResponse.json();

      // Extract useful information
      const analysisData = {
        summary: result.results?.summary?.short || null,
        topics:
          result.results?.topics?.segments?.flatMap(
            (segment) => segment.topics
          ) || [],
        intents:
          result.results?.intents?.segments?.flatMap(
            (segment) => segment.intents
          ) || [],
        sentiment: result.results?.sentiments?.average?.sentiment || null,
        sentimentScore:
          result.results?.sentiments?.average?.sentiment_score || 0,
        transcript:
          result.results?.channels[0]?.alternatives[0]?.transcript || null,
      };

      setDeepgramAnalysis(analysisData);

      // Update the summary state if it exists
      if (analysisData.summary) {
        setSummary(analysisData.summary);
      }

      return analysisData;
    } catch (error) {
      console.error("❌ Deepgram Analysis Error:", error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Cleanup resources
  const cleanupResources = useCallback(async () => {
    console.log("Cleanup: Initiating resource cleanup...");

    if (audioChunksRef.current.length > 0 && currentUser) {
      try {
        await saveRecording();
      } catch (err) {
        console.error("Error saving recording:", err);
      }
    }

    if (mediaRecorderRef.current?.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
        console.log("Cleanup: MediaRecorder stopped.");
      } catch (e) {
        console.error("Cleanup Error: Stopping MediaRecorder failed", e);
      }
    }
    mediaRecorderRef.current = null;

    // Reset audio chunks
    audioChunksRef.current = [];

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.close(1000, "Client stopping recording");
        console.log("Cleanup: WebSocket closed.");
      } catch (e) {
        console.error("Cleanup Error: Closing WebSocket failed", e);
      }
    }
    socketRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      console.log("Cleanup: MediaStream tracks stopped.");
    }
    streamRef.current = null;

    setIsRecording(false);
    setConnectionStatus("Not Connected");
    console.log("Cleanup: State reset.");
  }, [currentUser]); // Add currentUser as dependency

  // Start recording
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    console.log("Start Recording: Initiated.");

    // Reset audio chunks array
    audioChunksRef.current = [];
    speakerMapRef.current = new Map();
    setTranscriptEntries([]);
    setActionItems([]);
    setSentimentData([]);
    setTopics([]);
    setDetectedEntities([]);
    setDetectedIntents([]);
    setSummary("");
    setConnectionStatus("Connecting...");

    if (!DEEPGRAM_API_KEY) {
      alert("Deepgram API Key is missing or placeholder.");
      setConnectionStatus("Error: API Key Missing");
      return;
    }

    // Add preliminary check for microphone
    const micCheck = await checkMicrophoneAvailability();
    if (!micCheck.available) {
      alert(`Microphone check failed: ${micCheck.message}`);
      setConnectionStatus("Error: No Microphone");
      return;
    }

    try {
      console.log("Start Recording: Requesting media permissions...");
      // Add more detailed constraints for better browser compatibility
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        },
      });
      streamRef.current = stream;
      console.log("Start Recording: Media permissions granted.");

      // Check if we actually got audio tracks
      if (stream.getAudioTracks().length === 0) {
        throw new Error("No audio track available in the media stream");
      }

      const params = new URLSearchParams({
        model: "nova-2",
        language: "en-US",
        punctuate: "true",
        smart_format: "true",
        diarize: "true",
      });
      const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
      console.log("Start Recording: Connecting to WebSocket:", wsUrl);

      // Add a timeout for WebSocket connection
      const socketPromise = new Promise((resolve, reject) => {
        const socket = new WebSocket(wsUrl, ["token", DEEPGRAM_API_KEY]);
        const timeout = setTimeout(() => {
          reject(new Error("WebSocket connection timeout"));
        }, 10000); // 10 seconds timeout

        socket.onopen = () => {
          clearTimeout(timeout);
          resolve(socket);
        };

        socket.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      const socket = await socketPromise;
      socketRef.current = socket;

      console.log("WebSocket: Connection established.");
      setConnectionStatus("Connected");

      // Check for supported MIME types
      const mimeTypes = ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav"];
      let selectedMimeType = null;

      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error("No supported MIME type found for MediaRecorder");
      }

      console.log(`Using MIME type: ${selectedMimeType}`);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          console.log(`Audio data received: ${event.data.size} bytes`);
          // Store audio chunks for later saving
          audioChunksRef.current.push(event.data);

          // Send to WebSocket for transcription
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(event.data);
          } else {
            console.warn("WebSocket not open when trying to send audio data");
          }
        } else {
          console.warn("Empty audio data received");
        }
      });

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder Error:", event.error);
        setConnectionStatus("Error: MediaRecorder");
        cleanupResources();
      };

      socket.onmessage = handleMessage;

      socket.onclose = (event) => {
        console.log("WebSocket: Closed.", event.code, event.reason);
        if (connectionStatus !== "Not Connected") {
          setConnectionStatus(`Disconnected (${event.code})`);
        }
        setIsRecording(false);
      };

      socket.onerror = (error) => {
        console.error("WebSocket: Error:", error);
        setConnectionStatus("Error: Connection Failed");
        cleanupResources();
      };

      // Start recording with smaller time slices for more frequent data
      mediaRecorder.start(250);
      setIsRecording(true);
      console.log("Start Recording: MediaRecorder started.");
    } catch (error) {
      console.error("Start Recording Error:", error);

      // Improved error handling with better diagnostics
      let errorMessage = "Unknown error";

      if (error.name === "NotAllowedError") {
        errorMessage =
          "Permission denied. Please allow microphone access in your browser settings.";
      } else if (error.name === "NotFoundError") {
        errorMessage =
          "No microphone found. Please connect a microphone and try again.";
      } else if (
        error.name === "NotReadableError" ||
        error.name === "AbortError"
      ) {
        errorMessage =
          "Could not access your microphone. It might be in use by another application.";
      } else if (error.name === "SecurityError") {
        errorMessage =
          "Media access is not allowed in this context due to security restrictions.";
      } else if (error.name === "TypeError") {
        errorMessage =
          "Media constraints are not valid or not supported by this browser.";
      } else {
        errorMessage =
          error.message || "Failed to access microphone for unknown reasons.";
      }

      setConnectionStatus(`Error: ${error.name || "Access Failed"}`);
      cleanupResources();

      // Show a more detailed error message to the user
      alert(`Failed to start recording: ${errorMessage}`);
    }
  }, [
    isRecording,
    connectionStatus,
    cleanupResources,
    handleMessage,
    DEEPGRAM_API_KEY,
  ]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    if (isRecording) return;
    setTranscriptEntries([]);
    setActionItems([]);
    setSentimentData([]);
    setTopics([]);
    setDetectedEntities([]);
    setDetectedIntents([]);
    setSummary("");
    speakerMapRef.current = new Map();
  }, [isRecording]);

  // Cleanup effect
  useEffect(() => {
    return () => cleanupResources();
  }, [cleanupResources]);

  // Scroll effect for transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptEntries]);

  return {
    isRecording,
    transcriptEntries,
    connectionStatus,
    sentimentData,
    actionItems,
    topics,
    detectedEntities,
    detectedIntents,
    summary,
    isSummarizing,
    deepgramAnalysis,
    isAnalyzing,
    transcriptEndRef,
    startRecording,
    cleanupResources,
    clearTranscript,
    analyzeAudioWithDeepgram,
  };
};
