import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  saveTranscriptionToFirebase,
  saveSegmentToFirebase,
} from "../services/firebaseService";
import { checkProxyServerConnection } from "../utils/connectionUtils";
import DeepgramService from "../services/deepgramService";

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
  const [segmentedAnalysis, setSegmentedAnalysis] = useState([]);
  const [isProcessingSegment, setIsProcessingSegment] = useState(false);

  const { currentUser } = useAuth() || {};
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const speakerMapRef = useRef(new Map());
  const audioChunksRef = useRef([]);
  const transcriptEndRef = useRef(null);
  const segmentChunksRef = useRef([]);
  const segmentTimerRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const lastSegmentTimeRef = useRef(null);

  const SEGMENT_DURATION = 15000;
  const INITIAL_DELAY = 10000;

  const [firebaseConnected, setFirebaseConnected] = useState(true);
  const [proxyServerConnected, setProxyServerConnected] = useState(true);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [connectionErrorMessage, setConnectionErrorMessage] = useState("");

  const audioBufferRef = useRef([]);
  const wsReconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;
  const heartbeatIntervalRef = useRef(null);
  const [wsState, setWsState] = useState("closed");

  const [usingSdk, setUsingSdk] = useState(true);
  const deepgramServiceRef = useRef(null);

  const reconnectWebSocketRef = useRef(null);
  const handleSocketCloseRef = useRef(null);
  const handleSocketErrorRef = useRef(null);
  const setupHeartbeatRef = useRef(null);
  const cleanupResourcesRef = useRef(null);
  const setupSegmentTimerRef = useRef(null);

  useEffect(() => {
    const checkConnections = async () => {
      const proxyStatus = await checkProxyServerConnection();
      setProxyServerConnected(proxyStatus.available);

      if (!proxyStatus.available) {
        console.error("Proxy server connection issue:", proxyStatus.message);
        setConnectionErrorMessage(proxyStatus.message);
      }

      setConnectionChecked(true);
    };

    checkConnections();
  }, []);

  useEffect(() => {
    if (DEEPGRAM_API_KEY) {
      try {
        deepgramServiceRef.current = new DeepgramService(DEEPGRAM_API_KEY);
        console.log("Deepgram SDK initialized");
      } catch (error) {
        console.error("Failed to initialize Deepgram SDK:", error);
        setUsingSdk(false);
      }
    } else {
      deepgramServiceRef.current = null;
      setUsingSdk(false);
    }
  }, [DEEPGRAM_API_KEY]);

  const checkMicrophoneAvailability = useCallback(async () => {
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
  }, []);

  const saveSegmentToLocalStorage = useCallback(
    async (audioBlob, segmentNumber) => {
      try {
        const blobUrl = URL.createObjectURL(audioBlob);

        const segmentInfo = {
          id: `local-segment-${Date.now()}-${segmentNumber}`,
          timestamp: Date.now(),
          segmentNumber,
          localUrl: blobUrl,
          size: audioBlob.size,
        };

        const existingSegmentsJson =
          localStorage.getItem("meeting-segments") || "[]";
        const existingSegments = JSON.parse(existingSegmentsJson);

        existingSegments.push(segmentInfo);

        localStorage.setItem(
          "meeting-segments",
          JSON.stringify(existingSegments)
        );

        console.log(
          `Segment ${segmentNumber} saved locally with URL: ${blobUrl}`
        );
        return blobUrl;
      } catch (error) {
        console.error("Error saving segment to local storage:", error);
        return null;
      }
    },
    []
  );

  const analyzeSegmentWithDeepgram = useCallback(
    async (audioUrl) => {
      if (!audioUrl || !DEEPGRAM_API_KEY) return null;

      console.log("⏳ Analyzing segment with proxy server...");

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

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
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!proxyResponse.ok) {
          throw new Error(
            `Proxy server returned ${
              proxyResponse.status
            }: ${await proxyResponse.text()}`
          );
        }

        const result = await proxyResponse.json();

        if (!result.results) {
          throw new Error("Unexpected response format from Deepgram");
        }

        console.log("✅ Analysis completed successfully:", {
          hasTranscript:
            !!result.results?.channels?.[0]?.alternatives?.[0]?.transcript,
          hasSummary: !!result.results?.summary?.short,
          hasTopics: !!(result.results?.topics?.segments || []).length > 0,
        });

        return {
          summary: result.results?.summary?.short || null,
          topics:
            result.results?.topics?.segments?.flatMap(
              (segment) => segment.topics
            ) || [],
          sentiment: result.results?.sentiments?.average?.sentiment || null,
          sentimentScore:
            result.results?.sentiments?.average?.sentiment_score || 0,
          transcript:
            result.results?.channels[0]?.alternatives[0]?.transcript || null,
        };
      } catch (error) {
        if (error.name === "AbortError") {
          console.error("❌ Analysis request timed out");
          throw new Error(
            "Analysis request timed out. Server might be overloaded."
          );
        }

        console.error("❌ Analysis Error:", error);
        setProxyServerConnected(false);
        throw error;
      }
    },
    [DEEPGRAM_API_KEY]
  );

  const processAudioSegment = useCallback(async () => {
    if (!isRecording || segmentChunksRef.current.length === 0) return;

    setIsProcessingSegment(true);

    try {
      const segmentBlob = new Blob(segmentChunksRef.current, {
        type: "audio/webm",
      });
      const currentSegmentChunks = [...segmentChunksRef.current];
      segmentChunksRef.current = [];
      const timestamp = Date.now();
      const segmentNumber = segmentedAnalysis.length + 1;

      let segmentURL = null;

      if (currentUser && firebaseConnected) {
        try {
          segmentURL = await saveSegmentToFirebase(
            currentSegmentChunks,
            segmentNumber,
            currentUser
          );

          if (segmentURL) {
            console.log(
              `Segment ${segmentNumber} saved to Firebase with URL: ${segmentURL}`
            );
          }
        } catch (error) {
          console.error("Firebase storage error:", error);
          setFirebaseConnected(false);
          setConnectionErrorMessage(`Firebase storage error: ${error.message}`);
        }
      }

      if (!segmentURL) {
        console.log("Falling back to local storage for segment");
        segmentURL = await saveSegmentToLocalStorage(
          segmentBlob,
          segmentNumber
        );
      }

      if (segmentURL && proxyServerConnected) {
        try {
          const segmentAnalysis = await analyzeSegmentWithDeepgram(segmentURL);

          if (segmentAnalysis) {
            setSegmentedAnalysis((prev) => [
              {
                id: `segment-${segmentNumber}`,
                timestamp,
                segmentNumber,
                audioUrl: segmentURL,
                ...segmentAnalysis,
              },
              ...prev,
            ]);
          }
        } catch (error) {
          console.error("Error analyzing segment:", error);
          setProxyServerConnected(false);
          setConnectionErrorMessage(
            `Deepgram analysis error: ${error.message}`
          );

          setSegmentedAnalysis((prev) => [
            {
              id: `segment-${segmentNumber}`,
              timestamp,
              segmentNumber,
              audioUrl: segmentURL,
              error: error.message,
              transcript: "Analysis failed - check server connection",
            },
            ...prev,
          ]);
        }
      } else if (segmentURL) {
        setSegmentedAnalysis((prev) => [
          {
            id: `segment-${segmentNumber}`,
            timestamp,
            segmentNumber,
            audioUrl: segmentURL,
            transcript: "Cannot analyze - server disconnected",
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error("Error processing audio segment:", error);
    } finally {
      setIsProcessingSegment(false);
    }
  }, [
    isRecording,
    currentUser,
    segmentedAnalysis.length,
    firebaseConnected,
    proxyServerConnected,
    saveSegmentToLocalStorage,
    analyzeSegmentWithDeepgram,
  ]);

  const setupSegmentTimer = useCallback(() => {
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
    }

    recordingStartTimeRef.current = Date.now();
    lastSegmentTimeRef.current = null;

    const initialDelayTimeout = setTimeout(() => {
      segmentTimerRef.current = setInterval(() => {
        const now = Date.now();
        if (segmentChunksRef.current.length > 0) {
          processAudioSegment();
        }
        lastSegmentTimeRef.current = now;
      }, SEGMENT_DURATION);
    }, INITIAL_DELAY);

    return () => {
      clearTimeout(initialDelayTimeout);
      if (segmentTimerRef.current) {
        clearInterval(segmentTimerRef.current);
      }
    };
  }, [processAudioSegment]);

  useEffect(() => {
    setupSegmentTimerRef.current = setupSegmentTimer;
  }, [setupSegmentTimer]);

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

  const handleMessage = useCallback(
    (message) => {
      try {
        const data = JSON.parse(message.data);
        console.log("Received message from Deepgram:", data);

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
            console.log("Adding new transcript entries:", newEntries);
            setTranscriptEntries((prev) => [...prev, ...newEntries]);
            newEntries.forEach((entry) =>
              detectActionItems(entry.text, entry.speaker)
            );
          }
        }

        const results = data.channel?.alternatives?.[0];

        if (
          results?.sentiment_segments &&
          Array.isArray(results.sentiment_segments)
        ) {
          setSentimentData((prev) => [
            ...prev,
            ...results.sentiment_segments.map((seg) => ({
              text: seg.text,
              sentiment: seg.sentiment,
              score: seg.sentiment_score,
              start_word: seg.start_word,
              end_word: seg.end_word,
              timestamp: Date.now(),
            })),
          ]);
        }

        if (results?.topics && Array.isArray(results.topics)) {
          setTopics((prev) => [
            ...prev,
            ...results.topics.map((t) => ({
              topic: t.topic,
              confidence_score: t.confidence_score,
            })),
          ]);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    },
    [detectActionItems]
  );

  const cleanupResources = useCallback(async () => {
    console.log("Cleanup: Initiating resource cleanup...");

    if (mediaRecorderRef.current?.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping media recorder:", err);
      }
    }

    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close(1000, "Recording stopped");
        }
        socketRef.current = null;
      } catch (err) {
        console.error("Error closing WebSocket:", err);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (segmentChunksRef.current.length > 0) {
      try {
        await processAudioSegment();
      } catch (err) {
        console.error("Error processing final segment:", err);
      }
    }

    if (audioChunksRef.current.length > 0 && currentUser) {
      try {
        console.log("Saving full recording to Firebase...");

        // First, save the full audio recording to Firebase Storage
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const storage = getStorage();
        const fileName = `full_recording_${Date.now()}.webm`;
        const audioRef = storageRef(
          storage,
          `recordings/${currentUser.uid}/${fileName}`
        );

        // Upload the audio file
        const uploadResult = await uploadBytes(audioRef, audioBlob);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        console.log(
          "Full recording uploaded, performing comprehensive analysis..."
        );

        // Perform comprehensive analysis if Deepgram service is available
        let comprehensiveAnalysis = null;
        if (deepgramServiceRef.current && proxyServerConnected) {
          try {
            setIsAnalyzing(true);
            comprehensiveAnalysis =
              await deepgramServiceRef.current.analyzeFullRecording(
                downloadURL
              );
            setIsAnalyzing(false);

            if (comprehensiveAnalysis) {
              // Update states with the comprehensive analysis results
              if (comprehensiveAnalysis.summary)
                setSummary(comprehensiveAnalysis.summary);
              if (comprehensiveAnalysis.topics)
                setTopics(comprehensiveAnalysis.topics);
              if (comprehensiveAnalysis.intents)
                setDetectedIntents(comprehensiveAnalysis.intents);
              if (comprehensiveAnalysis.entities)
                setDetectedEntities(comprehensiveAnalysis.entities);

              setDeepgramAnalysis(comprehensiveAnalysis);
            }
          } catch (err) {
            console.error("Error performing comprehensive analysis:", err);
            setIsAnalyzing(false);
          }
        }

        // Save all data to Firestore
        await saveTranscriptionToFirebase({
          audioChunks: audioChunksRef.current,
          transcriptEntries,
          summary: comprehensiveAnalysis?.summary || summary,
          topics: comprehensiveAnalysis?.topics || topics,
          segmentedAnalysis,
          intents: comprehensiveAnalysis?.intents || detectedIntents,
          entities: comprehensiveAnalysis?.entities || detectedEntities,
          currentUser,
        });

        console.log("Meeting saved successfully!");
      } catch (err) {
        console.error("Error saving meeting to Firebase:", err);
      }
    }

    setIsRecording(false);
    setConnectionStatus("Not Connected");
    audioChunksRef.current = [];
    audioBufferRef.current = [];
    wsReconnectAttemptsRef.current = 0;

    console.log("Cleanup complete");
  }, [
    currentUser,
    processAudioSegment,
    transcriptEntries,
    summary,
    topics,
    segmentedAnalysis,
    detectedIntents,
    detectedEntities,
    proxyServerConnected,
  ]);

  useEffect(() => {
    cleanupResourcesRef.current = cleanupResources;
  }, [cleanupResources]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    console.log("Start Recording: Initiated.");

    audioChunksRef.current = [];
    audioBufferRef.current = [];
    segmentChunksRef.current = [];
    wsReconnectAttemptsRef.current = 0;
    speakerMapRef.current = new Map();
    setTranscriptEntries([]);
    setActionItems([]);
    setSentimentData([]);
    setTopics([]);
    setDetectedEntities([]);
    setDetectedIntents([]);
    setSummary("");
    setSegmentedAnalysis([]);
    setConnectionStatus("Connecting...");

    if (!DEEPGRAM_API_KEY) {
      alert("Deepgram API Key is missing or placeholder.");
      setConnectionStatus("Error: API Key Missing");
      return;
    }

    try {
      const micCheck = await checkMicrophoneAvailability();
      if (!micCheck.available) {
        alert(`Microphone check failed: ${micCheck.message}`);
        setConnectionStatus("Error: No Microphone");
        return;
      }

      console.log("Requesting microphone access...");
      setConnectionStatus("Accessing microphone...");

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
      console.log("Microphone access granted");

      if (stream.getAudioTracks().length === 0) {
        throw new Error("No audio track available in the media stream");
      }

      console.log("Audio tracks:", stream.getAudioTracks().length);

      console.log("Setting up Deepgram WebSocket connection...");
      setConnectionStatus("Connecting to Deepgram...");

      const params = new URLSearchParams({
        model: "nova-2",
        language: "en-US",
        punctuate: "true",
        smart_format: "true",
        diarize: "true",
      });

      const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
      console.log("Connecting to:", wsUrl);

      const socketPromise = new Promise((resolve, reject) => {
        const socket = new WebSocket(wsUrl, ["token", DEEPGRAM_API_KEY]);
        const timeout = setTimeout(() => {
          reject(new Error("WebSocket connection timeout"));
        }, 10000);

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
      setWsState("open");

      socket.onmessage = handleMessage;

      socket.onclose = (event) => {
        console.log("WebSocket: Closed.", event.code, event.reason);
        setWsState("closed");
        if (connectionStatus !== "Not Connected") {
          setConnectionStatus(`Disconnected (${event.code})`);
        }
        setIsRecording(false);
      };

      socket.onerror = (error) => {
        console.error("WebSocket: Error:", error);
        setWsState("error");
        setConnectionStatus("Error: Connection Failed");
        cleanupResourcesRef.current?.();
      };

      const mimeTypes = ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav"];
      let selectedMimeType = null;

      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error("No supported audio format found");
      }

      console.log(`Using audio format: ${selectedMimeType}`);
      setConnectionStatus("Setting up recorder...");

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          console.log(`Audio data received: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
          segmentChunksRef.current.push(event.data);

          if (socketRef.current?.readyState === WebSocket.OPEN) {
            try {
              console.log("Sending audio data to WebSocket");
              socketRef.current.send(event.data);
            } catch (err) {
              console.error("Error sending data to WebSocket:", err);
              audioBufferRef.current.push(event.data);
            }
          } else if (socketRef.current) {
            console.warn("WebSocket not open, buffering data");
            audioBufferRef.current.push(event.data);
          }
        }
      });

      mediaRecorder.addEventListener("start", () => {
        console.log("MediaRecorder started");
        setIsRecording(true);
        setConnectionStatus("Recording...");
      });

      mediaRecorder.addEventListener("stop", () => {
        console.log("MediaRecorder stopped");
        setIsRecording(false);
        setConnectionStatus("Not Connected");
      });

      mediaRecorder.addEventListener("error", (error) => {
        console.error("MediaRecorder error:", error);
        setConnectionStatus("Error: Recording failed");
        cleanupResourcesRef.current?.();
      });

      mediaRecorder.start(250);
      console.log("Start Recording: MediaRecorder starting.");

      setupSegmentTimerRef.current?.();
    } catch (error) {
      console.error("Start Recording Error:", error);
      setConnectionStatus(`Error: ${error.name || "Access Failed"}`);
      alert(`Failed to start recording: ${error.message}`);
      cleanupResourcesRef.current?.();
    }
  }, [
    isRecording,
    DEEPGRAM_API_KEY,
    checkMicrophoneAvailability,
    handleMessage,
    connectionStatus,
  ]);

  const stopRecording = useCallback(() => {
    console.log("Stopping recording...");
    setConnectionStatus("Stopping...");
    cleanupResourcesRef.current?.();
  }, []);

  const clearTranscript = useCallback(() => {
    if (isRecording) return;
    setTranscriptEntries([]);
    setActionItems([]);
    setSentimentData([]);
    setTopics([]);
    setDetectedEntities([]);
    setDetectedIntents([]);
    setSummary("");
    setSegmentedAnalysis([]);
    speakerMapRef.current = new Map();
  }, [isRecording]);

  const analyzeAudioWithDeepgram = useCallback(
    async (audioUrl) => {
      if (!audioUrl || !DEEPGRAM_API_KEY) return null;

      setIsAnalyzing(true);
      console.log("Analyzing full audio with Deepgram proxy...");

      try {
        console.log("🔵 Sending request to proxy server:", {
          url: audioUrl,
          options: {
            model: "nova-2",
            sentiment: true,
            summarize: "v2",
            topics: true,
          },
        });

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

        console.log("✅ Deepgram Analysis Received from proxy:");
        console.log(
          "  📝 Transcript Length:",
          result.results?.channels[0]?.alternatives[0]?.transcript?.length || 0,
          "characters"
        );
        console.log(
          "  📊 Summary:",
          result.results?.summary?.short ? "Available" : "Not available"
        );
        console.log(
          "  🏷 Topics:",
          (
            result.results?.topics?.segments?.flatMap(
              (segment) => segment.topics
            ) || []
          ).length,
          "topics detected"
        );

        const analysisData = {
          summary: result.results?.summary?.short || null,
          topics:
            result.results?.topics?.segments?.flatMap(
              (segment) => segment.topics
            ) || [],
          sentiment: result.results?.sentiments?.average?.sentiment || null,
          sentimentScore:
            result.results?.sentiments?.average?.sentiment_score || 0,
          transcript:
            result.results?.channels[0]?.alternatives[0]?.transcript || null,
        };

        setDeepgramAnalysis(analysisData);

        if (analysisData.summary) {
          setSummary(analysisData.summary);
        }

        return analysisData;
      } catch (error) {
        console.error("❌ Analysis Error:", error);
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [DEEPGRAM_API_KEY]
  );

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
    segmentedAnalysis,
    isProcessingSegment,
    transcriptEndRef,
    startRecording,
    stopRecording,
    cleanupResources: cleanupResourcesRef.current,
    clearTranscript,
    analyzeAudioWithDeepgram,
    firebaseConnected,
    proxyServerConnected,
    connectionChecked,
    connectionErrorMessage,
    wsState,
    usingSdk,
  };
};
