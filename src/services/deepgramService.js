/**
 * Deepgram service that uses a proxy approach to avoid CORS issues
 */
class DeepgramService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.isInitialized = !!apiKey;
    this.proxyUrl = "http://localhost:3001/api/analyze-audio";
  }

  /**
   * Analyze audio from a URL using Deepgram's prerecorded API via our proxy
   */
  async analyzeAudio(audioUrl, options = {}) {
    if (!this.isInitialized) {
      throw new Error("Deepgram service is not initialized with valid API key");
    }

    try {
      console.log("🔄 Sending audio to proxy for analysis:", audioUrl);

      // Define default options
      const defaultOptions = {
        model: "nova-2",
        language: "en",
        smart_format: true,
        diarize: true,
        sentiment: true,
        summarize: true,
        topics: true,
        detect_topics: true,
        detect_entities: true,
        utterances: true,
        punctuate: true,
      };

      // Merge with user options
      const mergedOptions = { ...defaultOptions, ...options };

      // Call proxy server instead of direct SDK
      const response = await fetch(this.proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioUrl,
          apiKey: this.apiKey,
          options: mergedOptions,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Proxy server error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Deepgram service error:", error);
      throw error;
    }
  }

  /**
   * Perform comprehensive analysis of an audio recording
   * Includes summary, topics, and intent analysis
   */
  async analyzeFullRecording(audioUrl) {
    if (!this.isInitialized) {
      throw new Error("Deepgram service is not initialized with valid API key");
    }

    try {
      console.log(
        "🔄 Sending full recording for comprehensive analysis:",
        audioUrl
      );

      // Request all available analyses
      const options = {
        model: "nova-3", // Using the latest model
        language: "en",
        smart_format: true,
        diarize: true,
        sentiment: true,
        summarize: "v2", // Use v2 summarization
        topics: true,
        detect_topics: true,
        detect_entities: true,
        intents: true, // Add intent analysis
        utterances: true,
        punctuate: true,
      };

      // Call proxy server
      const response = await fetch(this.proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioUrl,
          apiKey: this.apiKey,
          options: options,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Proxy server error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      return this.processComprehensiveResult(result);
    } catch (error) {
      console.error("Deepgram comprehensive analysis error:", error);
      throw error;
    }
  }

  /**
   * Process the API result into a standardized format
   */
  processApiResult(result) {
    if (!result) return null;

    try {
      return {
        summary: result.results?.summary?.short || null,
        topics:
          result.results?.topics?.segments?.flatMap(
            (segment) => segment.topics
          ) || [],
        intents:
          result.results?.intents?.segments?.flatMap(
            (segment) => segment.intents
          ) || [],
        entities: this.extractEntities(result),
        sentiment: result.results?.sentiments?.average?.sentiment || null,
        sentimentScore:
          result.results?.sentiments?.average?.sentiment_score || 0,
        transcript:
          result.results?.channels[0]?.alternatives[0]?.transcript || null,
      };
    } catch (err) {
      console.error("Error processing Deepgram result:", err);
      return null;
    }
  }

  /**
   * Process the comprehensive API result
   */
  processComprehensiveResult(result) {
    if (!result) return null;

    try {
      return {
        summary: result.results?.summary?.short || null,
        topics:
          result.results?.topics?.segments?.flatMap(
            (segment) => segment.topics
          ) || [],
        intents:
          result.results?.intents?.segments?.flatMap(
            (segment) => segment.intents
          ) || [],
        entities: this.extractEntities(result),
        sentiment: result.results?.sentiments?.average?.sentiment || null,
        sentimentScore:
          result.results?.sentiments?.average?.sentiment_score || 0,
        transcript:
          result.results?.channels[0]?.alternatives[0]?.transcript || null,
        // Include raw result for debugging/advanced use
        rawResult: result,
      };
    } catch (err) {
      console.error("Error processing comprehensive Deepgram result:", err);
      return null;
    }
  }

  /**
   * Extract entities from Deepgram results
   */
  extractEntities(result) {
    try {
      const entities = [];

      if (result.results?.channels?.[0]?.alternatives?.[0]?.entities) {
        const rawEntities = result.results.channels[0].alternatives[0].entities;
        entities.push(...rawEntities);
      }

      return entities;
    } catch (error) {
      console.error("Error extracting entities:", error);
      return [];
    }
  }
}

export default DeepgramService;
