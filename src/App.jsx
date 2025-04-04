import { useState, useRef, useEffect, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import './App.css';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';

// Sub-components
const ConnectionBadge = ({ status }) => (
  <span className={`px-3 py-1 rounded-full text-sm ${
    status === 'Connected' ? 'bg-green-100 text-green-800' :
    status === 'Connecting...' ? 'bg-yellow-100 text-yellow-800' :
    'bg-gray-100 text-gray-800'
  }`}>
    {status}
  </span>
);

const SearchInput = ({ value, onChange }) => (
  <input
    type="text"
    placeholder="Search transcript..."
    className="w-48 px-3 py-1 border rounded-md text-sm"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

const SpeakerBadge = ({ speaker }) => (
  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
    speaker % 3 === 0 ? 'bg-purple-100' :
    speaker % 3 === 1 ? 'bg-blue-100' : 'bg-green-100'
  }`}>
    <span className="font-medium text-sm">{speaker}</span>
  </div>
);

const TranscriptViewer = ({ entries }) => (
  <div className="h-96 overflow-y-auto p-4 bg-gray-50 rounded-md">
    {entries.map((entry, index) => (
      <div key={`${entry.timestamp}-${index}`} className="mb-3 last:mb-0">
        <div className="flex items-center mb-1">
          <SpeakerBadge speaker={entry.speaker} />
          <span className="font-medium text-gray-700">
            Speaker {entry.speaker}
          </span>
        </div>
        <p className="ml-10 text-gray-600">{entry.text}</p>
      </div>
    ))}
  </div>
);

const ControlPanel = ({ isRecording, startRecording, stopRecording, clearTranscript, isExporting, exportJSON, exportPDF }) => (
  <div className="flex flex-col md:flex-row justify-center gap-4">
    <div className="flex gap-2">
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
          </svg>
          Start Recording
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" />
          </svg>
          Stop Recording
        </button>
      )}
      <button
        onClick={clearTranscript}
        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        disabled={isRecording}
      >
        Clear
      </button>
    </div>
    
    <div className="flex gap-2 justify-center">
      <button
        onClick={exportJSON}
        className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
        disabled={isExporting}
      >
        Export JSON
      </button>
      <button
        onClick={exportPDF}
        className="px-4 py-2 bg-blue-100 rounded-md hover:bg-blue-200 text-sm"
        disabled={isExporting}
      >
        {isExporting ? 'Generating...' : 'Export PDF'}
      </button>
    </div>
  </div>
);

const ActionItemsList = ({ items, onToggleComplete }) => (
  <div className="mb-6">
    <h4 className="font-medium mb-2">Action Items</h4>
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No action items detected yet</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="flex items-start p-2 bg-yellow-50 rounded-lg">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => onToggleComplete(item.id)}
              className="mt-1 mr-3"
            />
            <div>
              <p className="text-sm">{item.text}</p>
              <p className="text-xs text-gray-500">Speaker {item.speaker}</p>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const SentimentTimeline = ({ data }) => (
  <div className="mb-6">
    <h4 className="font-medium mb-2">Sentiment Timeline</h4>
    <div className="flex overflow-x-auto pb-4">
      {data.slice(-10).map((point, index) => (
        <div 
          key={`${point.timestamp}-${index}`}
          className="flex-shrink-0 w-32 p-2 mr-3 border rounded-lg bg-white"
        >
          <div className={`h-1 w-full mb-2 rounded-full ${
            point.sentiment === 'POSITIVE' ? 'bg-green-500' :
            point.sentiment === 'NEGATIVE' ? 'bg-red-500' : 'bg-gray-300'
          }`} />
          <p className="text-xs truncate text-gray-600">{point.text}</p>
        </div>
      ))}
    </div>
  </div>
);

const TopicCloud = ({ topics }) => (
  <div className="mb-6">
    <h4 className="font-medium mb-2">Key Topics</h4>
    <div className="flex flex-wrap gap-2">
      {topics.map((topic, index) => (
        <span 
          key={`${topic.label}-${index}`}
          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
        >
          {topic.label} ({topic.score})
        </span>
      ))}
    </div>
  </div>
);

const SummarySection = ({ summary, isLoading }) => (
  <div className="mb-6">
    <h4 className="font-medium mb-2">AI Summary</h4>
    {isLoading ? (
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-2">
          <div className="h-2 bg-gray-200 rounded"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
        </div>
      </div>
    ) : (
      <p className="text-sm text-gray-600 whitespace-pre-wrap">{summary || 'No summary generated yet'}</p>
    )}
  </div>
);

// Add these constants at the top of your App function
function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptEntries, setTranscriptEntries] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Not Connected');
  const [authView, setAuthView] = useState(null);
  const [sentimentData, setSentimentData] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  const { currentUser, logout } = useAuth();
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const speakerMapRef = useRef(new Map());
  const transcriptEndRef = useRef(null);
  const sentimentTimerRef = useRef(null);
  const topicTimerRef = useRef(null);
  const summaryTimerRef = useRef(null);
  const transcriptRef = useRef([]);

  // Replace these with your actual API keys
  const SENTIMENT_INTERVAL = 15000;
  const TOPIC_INTERVAL = 30000;
  const SUMMARY_INTERVAL = 45000;
  const DEEPGRAM_API_KEY = '16dcb20c07a4be54791de06f5059e9c412284862';
  const HF_API_KEY = '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';

  const cleanupResources = useCallback(() => {
    [sentimentTimerRef, topicTimerRef, summaryTimerRef].forEach(ref => 
      clearInterval(ref.current)
    );

    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    socketRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    
    setIsRecording(false);
    setConnectionStatus('Not Connected');
  }, []);

  // In the analyzeSentiment function, ensure proper sentiment extraction
  const analyzeSentiment = useCallback(async (texts) => {
    try {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english',
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inputs: texts }),
        }
      );

      const data = await response.json();
      
      // Handle model loading errors
      if (data.error) {
        console.error('Model loading error:', data.error);
        return;
      }

      // Handle array of results for multiple texts
      const results = Array.isArray(data) ? data : [data];
      
      setSentimentData(prev => [
        ...prev,
        ...results.map((item, index) => ({
          text: texts[index] || '',
          // Fix potential undefined errors with optional chaining and fallbacks
          sentiment: item[0]?.label || 'NEUTRAL', // Simplified label extraction
          timestamp: Date.now()
        }))
      ]);
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    }
  }, []);

  const detectTopics = useCallback(async () => {
    try {
      const transcriptText = transcriptEntries.map(t => t.text).join('\n');
      if (!transcriptText || transcriptText.length < 10) return;
      
      const response = await fetch(
        'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: transcriptText,
            parameters: {
              candidate_labels: ['Development', 'Marketing', 'Design', 'Finance', 'Planning', 'Review', 'Strategy'],
              multi_class: true
            }
          }),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        console.error('Topic detection error:', data.error);
        return;
      }

      // Proper response structure handling
      if (data?.labels) {
        const topics = data.labels
          .slice(0, 3) // Get top 3 topics
          .map((label, index) => ({
            label,
            score: data.scores[index].toFixed(2)
          }));
        setTopics(topics);
      }
    } catch (error) {
      console.error('Topic detection error:', error);
    }
  }, [transcriptEntries]);

  const generateSummary = useCallback(async () => {
    if (transcriptEntries.length < 3 || isSummarizing) return;
    
    setIsSummarizing(true);
    try {
      const transcriptText = transcriptEntries.map(t => t.text).join('\n');
      const response = await fetch(
        'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
        {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: transcriptText,
            parameters: { max_length: 200, min_length: 50 }
          }),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        console.error('Summary generation error:', data.error);
        return;
      }

      // Correct response structure handling
      if (data?.summary_text) {
        setSummary(data.summary_text);
      } else if (data[0]?.summary_text) { // Fallback for different response format
        setSummary(data[0].summary_text);
      }
    } catch (error) {
      console.error('Summary generation error:', error);
    }
    setIsSummarizing(false);
  }, [transcriptEntries, isSummarizing]);

  const detectActionItems = useCallback((text, speaker) => {
    // Improved action item detection regex
    const actionRegex = /(\b(?:need to|must|should|please|action item|todo|assign(?:ed)?|task|follow up|deadline|next steps|action required|critical|urgent)\b.*?)(?:\.|$)/gi;
    const matches = [...text.matchAll(actionRegex)];
    
    if (matches.length > 0) {
      setActionItems(prev => {
        const existingItems = new Set(prev.map(item => item.text.toLowerCase()));
        const newItems = matches
          .map(m => m[1].trim())
          .filter(text => !existingItems.has(text.toLowerCase()));

        return [
          ...prev,
          ...newItems.map(text => ({
            text,
            speaker,
            timestamp: Date.now(),
            completed: false,
            id: crypto.randomUUID()
          }))
        ];
      });
    }
  }, []);

  const exportJSON = () => {
    const data = {
      transcript: transcriptEntries,
      actionItems,
      sentimentData,
      topics,
      summary,
      createdAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `meeting-${Date.now()}.json`);
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let y = height - 50;
      const addText = (text, size = 12, isBold = false) => {
        if (y < 100) {
          page = pdfDoc.addPage();
          y = height - 50;
        }
        page.drawText(text, {
          x: 50,
          y,
          size,
          font: isBold ? boldFont : font
        });
        y -= size + 10;
      };

      addText('Meeting Summary', 18, true);
      addText(`Date: ${new Date().toLocaleString()}`, 12);
      
      if (summary) {
        addText('\nAI Summary:', 14, true);
        summary.split('. ').forEach(sentence => addText(`• ${sentence.trim()}`));
      }

      addText('\nTranscript:', 14, true);
      transcriptEntries.forEach(entry => {
        addText(`Speaker ${entry.speaker}: ${entry.text}`);
      });

      addText('\nAction Items:', 14, true);
      actionItems.forEach(item => {
        addText(`• ${item.text} (Speaker ${item.speaker})`);
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, `meeting-${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
    }
    setIsExporting(false);
  };

  const handleMessage = useCallback((message) => {
    try {
      const data = JSON.parse(message.data);
      console.log('Processing Deepgram message:', data);
      
      if (!data?.is_final) {
        console.log('Skipping non-final result');
        return;
      }
      
      if (!data.channel?.alternatives?.[0]?.words) {
        console.log('No words in response');
        return;
      }

      const newEntries = [];
      const words = data.channel.alternatives[0].words;
      let currentSpeaker = null;
      let currentText = [];

      words.forEach((word) => {
        // Make sure we get a speaker ID, or default to a unique value
        const speakerId = word.speaker !== undefined ? word.speaker : Math.floor(Math.random() * 1000);
        
        // Map Deepgram speaker IDs to our display speaker numbers
        if (!speakerMapRef.current.has(speakerId)) {
          speakerMapRef.current.set(speakerId, speakerMapRef.current.size + 1);
        }
        const displaySpeaker = speakerMapRef.current.get(speakerId);

        // When speaker changes, create a new transcript entry
        if (displaySpeaker !== currentSpeaker) {
          if (currentText.length > 0) {
            newEntries.push({
              speaker: currentSpeaker,
              text: currentText.join(' '),
              timestamp: Date.now()
            });
            currentText = [];
          }
          currentSpeaker = displaySpeaker;
        }
        currentText.push(word.punctuated_word || word.word);
      });

      // Add the final speaker's text
      if (currentText.length > 0 && currentSpeaker !== null) {
        newEntries.push({
          speaker: currentSpeaker,
          text: currentText.join(' '),
          timestamp: Date.now()
        });
      }

      if (newEntries.length > 0) {
        console.log('Adding new transcript entries:', newEntries);
        setTranscriptEntries(prev => [...prev, ...newEntries]);
        newEntries.forEach(entry => detectActionItems(entry.text, entry.speaker));
      }
    } catch (error) {
      console.error('Message processing error:', error);
    }
  }, [detectActionItems]);

  // Add this effect to keep transcriptRef in sync with transcriptEntries
  useEffect(() => {
    transcriptRef.current = transcriptEntries;
  }, [transcriptEntries]);

  const startRecording = async () => {
    if (isRecording) return;

    speakerMapRef.current = new Map();
    setTranscriptEntries([]);
    setActionItems([]);
    setSentimentData([]);
    setTopics([]);
    setSummary('');
    setConnectionStatus('Connecting...');

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;

      // Connect to Deepgram with enhanced parameters for better diarization
      const socket = new WebSocket(
        'wss://api.deepgram.com/v1/listen?diarize=true&punctuate=true&model=nova-2&smart_format=true',
        ['token', DEEPGRAM_API_KEY]
      );
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connection established');
        setConnectionStatus('Connected');
        
        // Create media recorder with proper MIME type
        const mediaRecorder = new MediaRecorder(stream, { 
          mimeType: 'audio/webm' 
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (socket.readyState === WebSocket.OPEN && event.data.size > 0) {
            socket.send(event.data);
            console.log('Sent audio chunk to Deepgram');
          }
        });

        mediaRecorder.start(1000);
        setIsRecording(true);

        // Setup analysis intervals with proper timing
        sentimentTimerRef.current = setInterval(() => {
          const recentTexts = transcriptRef.current
            .slice(-5)
            .map(entry => entry.text);
          if (recentTexts.length > 0) {
            console.log('Running sentiment analysis on recent texts');
            analyzeSentiment(recentTexts);
          }
        }, SENTIMENT_INTERVAL);

        topicTimerRef.current = setInterval(() => {
          console.log('Running topic detection');
          detectTopics();
        }, TOPIC_INTERVAL);
        
        summaryTimerRef.current = setInterval(() => {
          console.log('Generating summary');
          generateSummary();
        }, SUMMARY_INTERVAL);
      };

      socket.onmessage = (event) => {
        console.log('Received message from Deepgram');
        handleMessage(event);
      };
      
      socket.onclose = (event) => {
        console.log('WebSocket closed:', event);
        cleanupResources();
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('Connection Error');
      };

    } catch (error) {
      console.error('Recording startup error:', error);
      setConnectionStatus('Connection Failed');
      cleanupResources();
    }
  };

  useEffect(() => () => cleanupResources(), [cleanupResources]);
  useEffect(() => transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [transcriptEntries]);
  
  // The useEffect for automatic summary generation when recording stops
  useEffect(() => {
    if (!isRecording && transcriptEntries.length > 0) {
      generateSummary();
    }
  }, [isRecording, transcriptEntries, generateSummary]);

  const toggleActionItemCompletion = useCallback((id) => {
    setActionItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  const clearTranscript = () => {
    setTranscriptEntries([]);
    setActionItems([]);
    setSentimentData([]);
    setTopics([]);
    setSummary('');
  };

  const handleLogin = () => currentUser ? logout() : setAuthView('login');
  
  if (authView === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoginScreen onToggleAuth={setAuthView} onSuccess={() => setAuthView(null)} />
      </div>
    );
  }
  
  if (authView === 'signup') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <SignupScreen onToggleAuth={setAuthView} onSuccess={() => setAuthView(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-xl font-bold text-blue-600">AI Meeting Assistant</h1>
            <div className="flex items-center gap-4">
              <ConnectionBadge status={connectionStatus} />
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {currentUser.name || currentUser.email}
                  </span>
                  <button 
                    onClick={handleLogin}
                    className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setAuthView('login')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Login
                  </button>
                  <button 
                    onClick={() => setAuthView('signup')}
                    className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Live Transcription</h2>
              <SearchInput value={searchQuery} onChange={setSearchQuery} />
            </div>
            
            <TranscriptViewer entries={transcriptEntries.filter(e => 
              e.text.toLowerCase().includes(searchQuery.toLowerCase())
            )} />
            <div ref={transcriptEndRef} />
          </div>

          <ControlPanel 
            isRecording={isRecording} 
            startRecording={startRecording} 
            stopRecording={cleanupResources}
            clearTranscript={clearTranscript}
            isExporting={isExporting}
            exportJSON={exportJSON}
            exportPDF={exportPDF}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 h-fit lg:sticky lg:top-8">
          <h2 className="text-xl font-semibold mb-6">Meeting Insights</h2>
          <SummarySection summary={summary} isLoading={isSummarizing} />
          <SentimentTimeline data={sentimentData} />
          <ActionItemsList items={actionItems} onToggleComplete={toggleActionItemCompletion} />
          <TopicCloud topics={topics} />
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} AI Meeting Assistant. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;