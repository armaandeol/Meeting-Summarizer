import { useState, useRef, useEffect, useCallback } from 'react';
import { saveAs } from 'file-saver';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import './App.css';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';

const DEEPGRAM_API_KEY = '16dcb20c07a4be54791de06f5059e9c412284862';

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
      <div key={index} className="mb-3 last:mb-0">
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
  <div className="flex justify-center gap-4">
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
    
    <div className="flex gap-2">
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
          key={index}
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
          key={index}
          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
        >
          {topic.label} ({topic.score})
        </span>
      ))}
    </div>
  </div>
);

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptEntries, setTranscriptEntries] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Not Connected');
  const [authView, setAuthView] = useState(null); // null, 'login', or 'signup'
  const [sentimentData, setSentimentData] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const { currentUser, logout } = useAuth();

  // Refs for resource management
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const speakerMapRef = useRef(new Map());
  const transcriptEndRef = useRef(null);
  const sentimentTimerRef = useRef(null);
  const topicTimerRef = useRef(null);
  const timestampsRef = useRef([]);
  const currentSpeakerRef = useRef(null);
  const currentSentenceRef = useRef([]);

  const SENTIMENT_INTERVAL = 15000;
  const TOPIC_INTERVAL = 30000;

  // Cleanup resources
  const cleanupResources = useCallback(() => {
    clearInterval(sentimentTimerRef.current);
    clearInterval(topicTimerRef.current);

    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    socketRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    
    // Flush remaining audio data
    if (currentSpeakerRef.current && currentSentenceRef.current.length > 0) {
      setTranscriptEntries(prev => [
        ...prev, 
        {
          speaker: currentSpeakerRef.current,
          text: currentSentenceRef.current.join(' '),
          timestamp: Date.now()
        }
      ]);
    }

    setIsRecording(false);
    setConnectionStatus('Not Connected');
    mediaRecorderRef.current = null;
    socketRef.current = null;
    streamRef.current = null;
    currentSpeakerRef.current = null;
    currentSentenceRef.current = [];
  }, []);

  const analyzeSentiment = useCallback(async (texts) => {
    try {
      // This is a placeholder. In a real app, you'd call a sentiment analysis API
      const mockSentiments = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
      const randomResults = texts.map(text => ({
        text,
        sentiment: mockSentiments[Math.floor(Math.random() * mockSentiments.length)],
        timestamp: Date.now()
      }));
      
      setSentimentData(prev => [...prev, ...randomResults]);
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    }
  }, []);

  const detectTopics = useCallback(() => {
    try {
      // This is a placeholder. In a real app, you'd call a topic detection API
      const possibleTopics = [
        'Development', 'Marketing', 'Design', 'Finance', 
        'Operations', 'Planning', 'Customer Service'
      ];
      
      const randomTopics = Array.from({ length: 3 }, () => ({
        label: possibleTopics[Math.floor(Math.random() * possibleTopics.length)],
        score: (0.5 + Math.random() * 0.5).toFixed(2)
      }));
      
      setTopics(randomTopics);
    } catch (error) {
      console.error('Topic detection error:', error);
    }
  }, []);

  const detectActionItems = useCallback((text, speaker) => {
    const actionRegex = /(\b(?:need to|must|should|please|action item|todo|assign(?:ed)?|task)\b.*?)(?:\.|$)/gi;
    const matches = [...text.matchAll(actionRegex)];

    if (matches.length > 0) {
      setActionItems(prev => [
        ...prev,
        ...matches.map(m => ({
          text: m[1],
          speaker,
          timestamp: Date.now(),
          completed: false,
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
        }))
      ]);
    }
  }, []);

  const exportJSON = () => {
    const data = {
      transcript: transcriptEntries,
      actionItems,
      sentimentData,
      topics,
      createdAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `meeting-${Date.now()}.json`);
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let y = height - 50;
      const addText = (text, size = 12) => {
        page.drawText(text, { x: 50, y, size, font });
        y -= size + 10;
      };

      addText('Meeting Summary', 18);
      addText(`Date: ${new Date().toLocaleString()}`);
      addText('\nTranscript:');
      transcriptEntries.forEach(entry => {
        addText(`[Speaker ${entry.speaker}] ${entry.text}`);
      });

      addText('\nAction Items:');
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

  // Start recording handler
  const startRecording = async () => {
    if (isRecording) return;

    // Reset tracking for new session
    speakerMapRef.current = new Map();
    currentSpeakerRef.current = null;
    currentSentenceRef.current = [];
    setTranscriptEntries([]);
    setSentimentData([]);
    setActionItems([]);
    setTopics([]);
    setConnectionStatus('Connecting...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const socket = new WebSocket('wss://api.deepgram.com/v1/listen?diarize=true&punctuate=true&utterances=true', 
        ['token', DEEPGRAM_API_KEY]
      );
      socketRef.current = socket;

      socket.onopen = () => {
        setConnectionStatus('Connected');
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (socket.readyState === WebSocket.OPEN && event.data.size > 0) {
            socket.send(event.data);
          }
        });

        mediaRecorder.start(1000);
        setIsRecording(true);
        
        // Setup analysis intervals
        sentimentTimerRef.current = setInterval(() => {
          const recentTexts = transcriptEntries
            .slice(-5)
            .filter(entry => !entry.analyzed)
            .map(entry => entry.text);
          
          if (recentTexts.length > 0) analyzeSentiment(recentTexts);
        }, SENTIMENT_INTERVAL);

        topicTimerRef.current = setInterval(detectTopics, TOPIC_INTERVAL);
      };

      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          if (!data.is_final || !data.channel?.alternatives?.[0]?.words) return;

          const newEntries = [];
          const words = data.channel.alternatives[0].words;

          words.forEach((word) => {
            const deepgramSpeakerId = word.speaker;
            
            // Map Deepgram speaker ID to sequential number
            if (!speakerMapRef.current.has(deepgramSpeakerId)) {
              speakerMapRef.current.set(deepgramSpeakerId, speakerMapRef.current.size + 1);
            }
            const displaySpeaker = speakerMapRef.current.get(deepgramSpeakerId);

            // Speaker change detection
            if (displaySpeaker !== currentSpeakerRef.current) {
              if (currentSpeakerRef.current !== null && currentSentenceRef.current.length > 0) {
                const entryText = currentSentenceRef.current.join(' ');
                newEntries.push({
                  speaker: currentSpeakerRef.current,
                  text: entryText,
                  timestamp: Date.now()
                });
                
                // Check for action items in this sentence
                detectActionItems(entryText, currentSpeakerRef.current);
              }
              currentSpeakerRef.current = displaySpeaker;
              currentSentenceRef.current = [word.punctuated_word || word.word];
            } else {
              currentSentenceRef.current.push(word.punctuated_word || word.word);
            }
          });

          // Add remaining sentence for current speaker
          if (currentSpeakerRef.current && currentSentenceRef.current.length > 0) {
            const entryText = currentSentenceRef.current.join(' ');
            newEntries.push({
              speaker: currentSpeakerRef.current,
              text: entryText,
              timestamp: Date.now()
            });
            
            // Process this text for action items
            detectActionItems(entryText, currentSpeakerRef.current);
            
            // Reset current sentence but keep the speaker for continuation
            currentSentenceRef.current = [];
          }

          if (newEntries.length > 0) {
            setTranscriptEntries(prev => [...prev, ...newEntries]);
            timestampsRef.current.push(...newEntries.map(entry => entry.timestamp));
          }
        } catch (error) {
          console.error('Message processing error:', error);
        }
      };

      socket.onclose = cleanupResources;
      socket.onerror = () => setConnectionStatus('Connection Error');

    } catch (error) {
      console.error('Recording startup error:', error);
      setConnectionStatus('Connection Failed');
      cleanupResources();
    }
  };

  const toggleActionItemCompletion = useCallback((id) => {
    setActionItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  // Component cleanup
  useEffect(() => () => cleanupResources(), [cleanupResources]);
  
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptEntries]);

  // Handle authentication
  const handleLogin = () => {
    if (currentUser) {
      // Log out if already logged in
      logout();
    } else {
      // Show login screen
      setAuthView('login');
    }
  };
  
  const handleAuthSuccess = () => {
    setAuthView(null);
  };

  const clearTranscript = () => {
    setTranscriptEntries([]);
    setActionItems([]);
    setSentimentData([]);
    setTopics([]);
  };
  
  const filteredTranscript = transcriptEntries.filter(entry =>
    entry.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render auth screens if the user is trying to log in or sign up
  if (authView === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoginScreen 
          onToggleAuth={setAuthView}
          onLoginSuccess={handleAuthSuccess} 
        />
      </div>
    );
  }
  
  if (authView === 'signup') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <SignupScreen 
          onToggleAuth={setAuthView}
          onSignupSuccess={handleAuthSuccess} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-600">Meeting Summarizer</h1>
            <div className="flex items-center gap-4">
              <ConnectionBadge status={connectionStatus} />
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {currentUser.profile?.name || currentUser.email}
                  </span>
                  <button 
                    onClick={handleLogin}
                    className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Login
                </button>
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
            <TranscriptViewer entries={filteredTranscript} />
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

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Meeting Insights</h2>
          <SentimentTimeline data={sentimentData} />
          <ActionItemsList items={actionItems} onToggleComplete={toggleActionItemCompletion} />
          <TopicCloud topics={topics} />
        </div>
      </main>

      <footer className="mt-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Meeting Summarizer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;