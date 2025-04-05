import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { saveAs } from 'file-saver';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import './App.css'; // Ensure Tailwind or your CSS is set up
import { useAuth } from './context/AuthContext'; // Assuming context setup
import LoginScreen from './components/LoginScreen'; // Assuming component exists
import SignupScreen from './components/SignupScreen'; // Assuming component exists
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase'; // Corrected import path to local firebase.js
import { createClient } from "@deepgram/sdk";

// Simple error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error("App crashed:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-700 mb-4">{this.state.error?.message || "An unknown error occurred"}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Constants ---
const MAX_SENTIMENT_POINTS = 15; // Max sentiment points to display
const MAX_ACTION_ITEMS = 10; // Max action items to display initially

// --- Sub-components ---
const ConnectionBadge = ({ status }) => (
  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
    status === 'Connected' ? 'bg-green-100 text-green-800' :
    status === 'Connecting...' ? 'bg-yellow-100 text-yellow-800' :
    status.startsWith('Error') ? 'bg-red-100 text-red-800' :
    'bg-gray-100 text-gray-800'
  }`}>
    {status}
  </span>
);

const SearchInput = ({ value, onChange }) => (
  <input
    type="text"
    placeholder="Search transcript..."
    className="w-full md:w-48 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

const SpeakerBadge = ({ speaker }) => (
  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 shadow-sm ${
    (typeof speaker === 'number' ? speaker : 0) % 3 === 0 ? 'bg-purple-100 text-purple-800' :
    (typeof speaker === 'number' ? speaker : 0) % 3 === 1 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }`}>
    <span className="font-medium text-sm">{typeof speaker === 'number' ? speaker : '?'}</span>
  </div>
);

const TranscriptViewer = ({ entries }) => (
  <div className="h-96 overflow-y-auto p-4 bg-gray-50 rounded-md border border-gray-200 pretty-scrollbar">
    {entries.length === 0 ? (
        <p className="text-center text-gray-400 italic mt-4">Transcript will appear here...</p>
    ) : (
        entries.map((entry, index) => (
         <div key={`${entry.timestamp}-${index}`} className="mb-3 last:mb-0">
           <div className="flex items-start mb-1">
             <SpeakerBadge speaker={entry.speaker} />
             <div className="flex-1">
               <span className="font-medium text-gray-700 text-sm">
                 Speaker {typeof entry.speaker === 'number' ? entry.speaker : '?'}
               </span>
               <p className="text-gray-800 text-sm leading-relaxed">{entry.text}</p>
             </div>
           </div>
         </div>
        ))
    )}
     <style>{`
      .pretty-scrollbar::-webkit-scrollbar { width: 6px; height: 6px;}
      .pretty-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px;}
      .pretty-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px;}
      .pretty-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }
    `}</style>
  </div>
);

const ControlPanel = ({ isRecording, startRecording, stopRecording, clearTranscript, isExporting, exportJSON, exportPDF, canClear, canExport }) => (
  <div className="flex flex-col md:flex-row justify-center items-center gap-4 mt-6 pt-6 border-t border-gray-200">
    <div className="flex gap-2">
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="px-5 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 flex items-center transition duration-150 ease-in-out shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"> <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.5-10.5a.5.5 0 01.832-.374l4 3a.5.5 0 010 .748l-4 3A.5.5 0 018.5 11V7.5z" clipRule="evenodd" /> </svg>
          Start Recording
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="px-5 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 flex items-center transition duration-150 ease-in-out shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"> <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-11a1 1 0 00-1 1v4a1 1 0 001 1h2a1 1 0 001-1V8a1 1 0 00-1-1H9z" clipRule="evenodd" /> </svg>
          Stop Recording
        </button>
      )}
      <button
        onClick={clearTranscript}
        className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition duration-150 ease-in-out shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isRecording || !canClear}
      >
        Clear All
      </button>
    </div>
    <div className="flex gap-2 justify-center">
      <button onClick={exportJSON} className="px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 text-sm transition duration-150 ease-in-out shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={isExporting || !canExport}> Export JSON </button>
      <button onClick={exportPDF} className="px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-md hover:bg-indigo-200 text-sm transition duration-150 ease-in-out shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={isExporting || !canExport}> {isExporting ? 'Generating...' : 'Export PDF'} </button>
    </div>
  </div>
);

const ActionItemsList = ({ items, onToggleComplete }) => (
  <div className="mb-6">
    <h4 className="font-semibold mb-3 text-base text-gray-700">Action Items (Detected)</h4>
    <div className="space-y-2 max-h-48 overflow-y-auto pretty-scrollbar pr-2">
      {items.length === 0 ? ( <p className="text-sm text-gray-500 italic">No action items detected yet</p> ) : (
        items.slice(0, MAX_ACTION_ITEMS).map((item) => (
          <div key={item.id} className="flex items-start p-2.5 bg-yellow-50 rounded-lg border border-yellow-200">
            <input type="checkbox" checked={item.completed} onChange={() => onToggleComplete(item.id)} className="mt-1 mr-3 h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500 cursor-pointer"/>
            <div className="flex-1">
              <p className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>{item.text}</p>
              <p className="text-xs text-gray-500 mt-0.5">Speaker {typeof item.speaker === 'number' ? item.speaker : '?'}</p>
            </div>
          </div>
        ))
      )}
       {items.length > MAX_ACTION_ITEMS && <p className="text-xs text-gray-500 text-center mt-2">...and {items.length - MAX_ACTION_ITEMS} more</p>}
    </div>
     <style>{`.pretty-scrollbar::-webkit-scrollbar { width: 6px; height: 6px;} .pretty-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px;} .pretty-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px;} .pretty-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }`}</style>
  </div>
);

const SentimentTimeline = ({ data }) => (
  <div className="mb-6">
    <h4 className="font-semibold mb-3 text-base text-gray-700">Sentiment Timeline</h4>
    <div className="flex overflow-x-auto pb-4 space-x-3 pretty-scrollbar">
      {data.length === 0 ? ( <p className="text-sm text-gray-500 italic">Sentiment analysis results will appear here...</p> ) : (
         data.slice(-MAX_SENTIMENT_POINTS).map((point, index) => (
           <div key={`${point.timestamp || index}`} className="flex-shrink-0 w-36 p-2.5 border border-gray-200 rounded-lg bg-white shadow-sm" title={point.text || 'Sentiment Segment'}>
             <div className={`h-1.5 w-full mb-2 rounded-full ${
               point.sentiment === 'positive' ? 'bg-green-500' :
               point.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-300'
             }`} title={`Sentiment: ${point.sentiment} (${point.score?.toFixed(2)})`} />
             <p className="text-xs text-gray-600 line-clamp-2">{point.text || `Segment ${index}`}</p>
           </div>
         ))
      )}
       <div className="flex-shrink-0 w-1 h-1"></div>
    </div>
     <style>{`.pretty-scrollbar::-webkit-scrollbar { width: 6px; height: 6px;} .pretty-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px;} .pretty-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px;} .pretty-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }`}</style>
  </div>
);

const TopicCloud = ({ topics }) => (
  <div className="mb-6">
    <h4 className="font-semibold mb-3 text-base text-gray-700">Detected Topics</h4>
    <div className="flex flex-wrap gap-2">
      {topics.length === 0 ? ( <p className="text-sm text-gray-500 italic">Topics detected by Deepgram will appear here...</p> ) : (
         Object.entries(
             topics.reduce((acc, curr) => {
                 acc[curr.topic] = (acc[curr.topic] || 0) + 1;
                 return acc;
             }, {})
         )
         .sort(([, countA], [, countB]) => countB - countA)
         .slice(0, 10)
         .map(([topic, count]) => (
           <span key={topic} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium shadow-sm" title={`Mentioned ${count} time(s)`}>
             {topic}
           </span>
         ))
      )}
    </div>
  </div>
);

const EntityList = ({ entities }) => (
  <div className="mb-6">
    <h4 className="font-semibold mb-3 text-base text-gray-700">Detected Entities</h4>
     <div className="space-y-1 max-h-40 overflow-y-auto pretty-scrollbar pr-2">
        {entities.length === 0 ? ( <p className="text-sm text-gray-500 italic">Entities detected by Deepgram will appear here...</p> ) : (
            entities.map((entity, index) => (
                <div key={index} className="text-sm p-1.5 bg-gray-50 rounded border border-gray-100">
                    <span className="font-medium text-gray-700">{entity.value}</span>
                    <span className="text-xs text-gray-500 ml-2">({entity.label})</span>
                </div>
            ))
        )}
     </div>
      <style>{`.pretty-scrollbar::-webkit-scrollbar { width: 6px; height: 6px;} .pretty-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px;} .pretty-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px;} .pretty-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }`}</style>
  </div>
);

const IntentList = ({ intents }) => (
  <div className="mb-6">
    <h4 className="font-semibold mb-3 text-base text-gray-700">Detected Intents</h4>
     <div className="space-y-1 max-h-40 overflow-y-auto pretty-scrollbar pr-2">
        {intents.length === 0 ? ( <p className="text-sm text-gray-500 italic">Intents detected by Deepgram will appear here...</p> ) : (
             Object.entries(
                 intents.reduce((acc, curr) => {
                     acc[curr.intent] = (acc[curr.intent] || 0) + 1;
                     return acc;
                 }, {})
             )
             .sort(([, countA], [, countB]) => countB - countA)
             .slice(0, 10)
             .map(([intent, count]) => (
                <div key={intent} className="text-sm p-1.5 bg-teal-50 rounded border border-teal-100">
                    <span className="font-medium text-teal-700">{intent}</span>
                    <span className="text-xs text-teal-500 ml-2">({count}x)</span>
                </div>
            ))
        )}
     </div>
      <style>{`.pretty-scrollbar::-webkit-scrollbar { width: 6px; height: 6px;} .pretty-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px;} .pretty-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px;} .pretty-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }`}</style>
  </div>
);

const SummarySection = ({ summary, isLoading }) => (
  <div className="mb-6">
    <h4 className="font-semibold mb-3 text-base text-gray-700">AI Summary (Final)</h4>
    {isLoading ? (
      <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-3 py-1"><div className="h-2 bg-gray-200 rounded"></div><div className="space-y-2"><div className="grid grid-cols-3 gap-4"><div className="h-2 bg-gray-200 rounded col-span-2"></div><div className="h-2 bg-gray-200 rounded col-span-1"></div></div><div className="h-2 bg-gray-200 rounded"></div></div></div></div>
    ) : (
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary || 'Final summary will appear after recording stops.'}</p>
    )}
  </div>
);

const DeepgramAnalysis = ({ analysisData, isLoading }) => (
  <div className="mb-6">
    <h3 className="font-semibold mb-3 text-base text-gray-700 border-b pb-1">Deepgram Analysis</h3>
    
    {isLoading ? (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    ) : analysisData ? (
      <div className="space-y-4">
        {/* Summary Section */}
        {analysisData.summary && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-700 mb-1">AI-Generated Summary</h4>
            <p className="text-sm text-gray-700">{analysisData.summary}</p>
          </div>
        )}
        
        {/* Topics Section */}
        {analysisData.topics && analysisData.topics.length > 0 && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <h4 className="text-sm font-medium text-green-700 mb-2">Detected Topics</h4>
            <div className="flex flex-wrap gap-2">
              {analysisData.topics.map((topic, index) => (
                <span key={index} className="px-2 py-1 bg-white border border-green-200 rounded-full text-xs font-medium">
                  {topic.topic}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Intents Section */}
        {analysisData.intents && analysisData.intents.length > 0 && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <h4 className="text-sm font-medium text-purple-700 mb-2">Detected Intents</h4>
            <ul className="text-sm space-y-1">
              {analysisData.intents.map((intent, index) => (
                <li key={index} className="flex justify-between">
                  <span>{intent.intent}</span>
                  <span className="text-xs text-gray-500">{Math.round(intent.confidence_score * 100)}% confidence</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Sentiment Section */}
        {analysisData.sentiment && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <h4 className="text-sm font-medium text-yellow-700 mb-1">Overall Sentiment</h4>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-full rounded-full ${
                analysisData.sentiment === 'positive' ? 'bg-green-500' :
                analysisData.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-xs capitalize">{analysisData.sentiment}</span>
            </div>
          </div>
        )}
      </div>
    ) : (
      <p className="text-sm text-gray-500 italic">Analysis will be performed after recording and uploading.</p>
    )}
  </div>
);

// --- Main App Component ---
function App() {
  console.log("App component rendering");
  
  // State variables
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptEntries, setTranscriptEntries] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Not Connected');
  const [authView, setAuthView] = useState(null);
  const [sentimentData, setSentimentData] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [detectedEntities, setDetectedEntities] = useState([]);
  const [detectedIntents, setDetectedIntents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [appError, setAppError] = useState(null);
  const [deepgramAnalysis, setDeepgramAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { currentUser, logout } = useAuth() || {};
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const speakerMapRef = useRef(new Map());
  const transcriptEndRef = useRef(null);
  const audioChunksRef = useRef([]); // Add a ref to store audio chunks
  const DEEPGRAM_API_KEY = 'API_KEY'; // Fixed API key
  const DEBUG_MODE = true; // Set to true for additional logging
  
  console.log("Environment variables loaded:", {
    hasDeepgramKey: Boolean(DEEPGRAM_API_KEY),
    keyLength: DEEPGRAM_API_KEY?.length || 0
  });

  const cleanupResources = useCallback(async () => {
    console.log('Cleanup: Initiating resource cleanup...');

    // Save recording if we have audio chunks and user is logged in
    if (audioChunksRef.current.length > 0 && currentUser) {
      try {
        await saveRecording();
      } catch (err) {
        console.error('Error saving recording:', err);
      }
    }

    if (mediaRecorderRef.current?.state === 'recording') { 
      try { 
        mediaRecorderRef.current.stop(); 
        console.log('Cleanup: MediaRecorder stopped.'); 
      } catch (e) { 
        console.error('Cleanup Error: Stopping MediaRecorder failed', e); 
      }         
    }
    mediaRecorderRef.current = null;

    // Reset audio chunks
    audioChunksRef.current = [];

    if (socketRef.current?.readyState === WebSocket.OPEN) { 
      try { 
        socketRef.current.close(1000, "Client stopping recording"); 
        console.log('Cleanup: WebSocket closed.'); 
      } catch (e) { 
        console.error('Cleanup Error: Closing WebSocket failed', e); 
      }       
    }
    socketRef.current = null;

    if (streamRef.current) { 
      streamRef.current.getTracks().forEach(track => track.stop()); 
      console.log('Cleanup: MediaStream tracks stopped.'); 
    }
    streamRef.current = null;

    setIsRecording(false); 
    setConnectionStatus('Not Connected'); 
    console.log('Cleanup: State reset.'); 
  }, [currentUser]); // Add currentUser as dependency

  const saveRecording = async () => {
    if (audioChunksRef.current.length === 0 || !currentUser) return;
    
    try {
      // Create blob from audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Generate unique filename
      const fileName = `recording_${Date.now()}.webm`;
      const storage = getStorage();
      const audioRef = storageRef(storage, `recordings/${currentUser.uid}/${fileName}`);
      
      // Upload to Firebase Storage
      const uploadResult = await uploadBytes(audioRef, audioBlob);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      // Analyze the audio with Deepgram
      setIsSummarizing(true);
      const analysisResult = await analyzeAudioWithDeepgram(downloadURL);
      setIsSummarizing(false);
      
      // Save reference in Firestore
      const recordingData = {
        userId: currentUser.uid,
        fileName: fileName,
        fileURL: downloadURL,
        transcript: transcriptEntries,
        summary: analysisResult?.summary || summary,
        topics: analysisResult?.topics || topics,
        sentimentAnalysis: analysisResult?.sentiment || null,
        createdAt: serverTimestamp()
      };
      
      // Add to recordings collection
      const docRef = await addDoc(collection(db, 'recordings'), recordingData);
      console.log('Recording saved with ID:', docRef.id);
      
      // Notify user
      alert('Recording saved and analyzed successfully!');
      
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Failed to save recording: ' + error.message);
    }
  };

  const analyzeAudioWithDeepgram = async (audioUrl) => {
    if (!audioUrl || !DEEPGRAM_API_KEY) return null;
    
    setIsAnalyzing(true);
    
    try {
      // Log the request parameters
      console.log('🔵 Sending request to proxy server:', {
        url: audioUrl,
        options: {
          model: "nova-3",
          sentiment: true,
          intents: true,
          summarize: "v2",
          topics: true
        }
      });
      
      // Instead of creating a Deepgram client, we'll use fetch to call our proxy
      console.log('⏳ Sending audio to proxy server for analysis...');
      
      try {
        const proxyResponse = await fetch('http://localhost:3001/api/analyze-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioUrl,
            apiKey: DEEPGRAM_API_KEY
          }),
        });
        
        if (!proxyResponse.ok) {
          throw new Error(`Proxy server returned ${proxyResponse.status}: ${await proxyResponse.text()}`);
        }
        
        const result = await proxyResponse.json();
        
        // Log detailed response
        console.log('✅ Deepgram Analysis Received from proxy:');
        console.log('  📝 Transcript Length:', result.results?.channels[0]?.alternatives[0]?.transcript?.length || 0, 'characters');
        console.log('  📊 Summary:', result.results?.summary?.short ? 'Available' : 'Not available');
        console.log('  🏷️ Topics:', (result.results?.topics?.segments?.flatMap(segment => segment.topics) || []).length, 'topics detected');
        console.log('  🎯 Intents:', (result.results?.intents?.segments?.flatMap(segment => segment.intents) || []).length, 'intents detected');
        console.log('  😊 Overall Sentiment:', result.results?.sentiments?.average?.sentiment || 'Not available');
        
        // For debugging, you can log the full result (be careful with large responses)
        if (DEBUG_MODE) {
          console.log('🔍 Full Deepgram Result:', JSON.stringify(result, null, 2));
        }
        
        // Extract useful information
        const analysisData = {
          summary: result.results?.summary?.short || null,
          topics: result.results?.topics?.segments?.flatMap(segment => segment.topics) || [],
          intents: result.results?.intents?.segments?.flatMap(segment => segment.intents) || [],
          sentiment: result.results?.sentiments?.average?.sentiment || null,
          sentimentScore: result.results?.sentiments?.average?.sentiment_score || 0,
          transcript: result.results?.channels[0]?.alternatives[0]?.transcript || null,
        };
        
        setDeepgramAnalysis(analysisData);
        
        // Update the summary state if it exists
        if (analysisData.summary) {
          setSummary(analysisData.summary);
        }
        
        return analysisData;
      } catch (apiError) {
        console.error('❌ Proxy Server Error:', apiError);
        throw apiError;
      }
    } catch (error) {
      console.error('❌ Deepgram Analysis Error:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

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
                  newEntries.push({ speaker: currentSpeaker, text: currentText.join(' '), timestamp: Date.now() });
                  currentText = [];
              }
              currentSpeaker = displaySpeaker;
              currentText.push(word.punctuated_word || word.word);
          });
          if (currentText.length > 0) { 
              newEntries.push({ speaker: currentSpeaker, text: currentText.join(' '), timestamp: Date.now() });
          }

          if (newEntries.length > 0) {
              setTranscriptEntries(prev => [...prev, ...newEntries]);
              newEntries.forEach(entry => detectActionItems(entry.text, entry.speaker)); 
          }
      }

      const results = data.channel?.alternatives?.[0];
      
      if (results?.sentiment_segments && Array.isArray(results.sentiment_segments)) {
          const newSentimentData = results.sentiment_segments.map(seg => ({
              text: seg.text,
              sentiment: seg.sentiment,
              score: seg.sentiment_score,
              start_word: seg.start_word,
              end_word: seg.end_word,
              timestamp: Date.now()
          }));
          if (newSentimentData.length > 0) {
              setSentimentData(prev => [...prev, ...newSentimentData]);
          }
      }

      if (results?.topics && Array.isArray(results.topics)) {
          const newTopics = results.topics.map(t => ({
              topic: t.topic,
              confidence_score: t.confidence_score
          }));
          if (newTopics.length > 0) {
              setTopics(prev => [...prev, ...newTopics]);
          }
      }

      if (results?.entities && Array.isArray(results.entities)) {
          const newEntities = results.entities.map(e => ({
              label: e.label,
              value: e.value,
              confidence: e.confidence,
              start_word: e.start_word,
              end_word: e.end_word
          }));
          if (newEntities.length > 0) {
              setDetectedEntities(prev => [...prev, ...newEntities]);
          }
      }

      if (results?.intents && Array.isArray(results.intents)) {
          const newIntents = results.intents.map(i => ({
              intent: i.intent,
              confidence_score: i.confidence_score
          }));
          if (newIntents.length > 0) {
              setDetectedIntents(prev => [...prev, ...newIntents]);
          }
      }

      if (data.results?.summary?.short) {
          const finalSummary = data.results.summary.short;
          setSummary(finalSummary);
      }
    } catch (error) { 
      console.error('Message processing error:', error); 
    }
  }, []);

  const detectActionItems = useCallback((text, speaker) => {
    const actionRegex = /(\b(I need to|we should|must|please|action item|task|assign|follow up|next step|remember to|don't forget|critical|urgent)\b.*?)(?:\.|$|;)/gi;
    const matches = [...text.matchAll(actionRegex)];
    if (matches.length > 0) {
      setActionItems(prev => {
        const existingTexts = new Set(prev.map(item => item.text.toLowerCase()));
        const newItems = matches
          .map(m => m[1].trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
          .filter(txt => txt.length > 10 && !existingTexts.has(txt.toLowerCase()));
        return [ ...prev, ...newItems.map(txt => ({ text: txt, speaker, timestamp: Date.now(), completed: false, id: crypto.randomUUID() })) ];
      });
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    console.log('Start Recording: Initiated.');

    // Reset audio chunks array
    audioChunksRef.current = [];
    speakerMapRef.current = new Map();
    setTranscriptEntries([]); 
    setActionItems([]); 
    setSentimentData([]);
    setTopics([]); 
    setDetectedEntities([]); 
    setDetectedIntents([]);
    setSummary(''); 
    setSearchQuery('');
    setConnectionStatus('Connecting...');

    if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === 'YOUR_DEEPGRAM_API_KEY_HERE') { 
        alert("Deepgram API Key is missing or placeholder."); 
        setConnectionStatus('Error: API Key Missing'); return; 
    }

    try { 
      console.log('Start Recording: Requesting media permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        } 
      });
      streamRef.current = stream;
      console.log('Start Recording: Media permissions granted.');

      const params = new URLSearchParams({
          model: 'nova-2',
          language: 'en-US',
          punctuate: 'true',
          smart_format: 'true',
          diarize: 'true',
      });
      const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
      console.log('Start Recording: Connecting to WebSocket:', wsUrl);
      const socket = new WebSocket(wsUrl, ['token', DEEPGRAM_API_KEY]);
      socketRef.current = socket;

      socket.onopen = () => { 
        console.log('WebSocket: Connection established.');
        setConnectionStatus('Connected');
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
        console.log(`Using MIME type: ${mimeType}`);
        if (!MediaRecorder.isTypeSupported(mimeType)) { 
          throw new Error(`Unsupported MIME type: ${mimeType}`); 
        }
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0) {
            // Store audio chunks for later saving
            audioChunksRef.current.push(event.data);
            
            // Send to WebSocket for transcription
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(event.data);
            }
          }
        });
        
        mediaRecorder.onerror = (event) => { 
          console.error("MediaRecorder Error:", event.error); 
          setConnectionStatus('Error: MediaRecorder'); 
          cleanupResources(); 
        };

        mediaRecorder.start(250);
        setIsRecording(true);
        console.log('Start Recording: MediaRecorder started.');
      };

      socket.onmessage = handleMessage;
      
      socket.onclose = (event) => { 
        console.log('WebSocket: Closed.', event.code, event.reason); 
        if (connectionStatus !== 'Not Connected') { 
          setConnectionStatus(`Disconnected (${event.code})`); 
        } 
        setIsRecording(false);
      };
      
      socket.onerror = (error) => { 
        console.error('WebSocket: Error:', error); 
        setConnectionStatus('Error: Connection Failed'); 
        cleanupResources(); 
      };

    } catch (error) {
      console.error('Start Recording Error:', error); 
      setConnectionStatus(`Error: ${error.name === 'NotAllowedError' ? 'Permission Denied' : error.message}`);
      cleanupResources();
    }
  }, [isRecording, connectionStatus, cleanupResources, handleMessage, DEEPGRAM_API_KEY]);

  const exportJSON = useCallback(() => {
    if (transcriptEntries.length === 0) return alert('No transcript data to export.');
    const data = { 
      transcript: transcriptEntries, 
      actionItems, 
      sentimentData,
      topics, 
      detectedEntities, 
      detectedIntents, 
      summary,
      createdAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `meeting-export-${Date.now()}.json`);
  }, [transcriptEntries, actionItems, sentimentData, topics, detectedEntities, detectedIntents, summary]);

  const exportPDF = useCallback(async () => {
    if (transcriptEntries.length === 0) return alert('No transcript data to export.');
    setIsExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const margin = 50;
      const contentWidth = width - 2 * margin;
      let y = height - margin;

      const addText = (text, size = 10, isBold = false, indent = 0) => {
        const lines = []; 
        const words = text.split(' '); 
        let currentLine = ''; 
        const currentFont = isBold ? boldFont : font; 
        const maxWidth = contentWidth - indent;
        
        words.forEach(word => { 
          const testLine = currentLine ? `${currentLine} ${word}` : word; 
          const testWidth = currentFont.widthOfTextAtSize(testLine, size); 
          if (testWidth <= maxWidth) { 
            currentLine = testLine; 
          } else { 
            lines.push(currentLine); 
            currentLine = word; 
          } 
        }); 
        
        lines.push(currentLine);
        
        lines.forEach(line => { 
          if (y < margin + size) { 
            page = pdfDoc.addPage(); 
            y = height - margin; 
          } 
          page.drawText(line, { x: margin + indent, y, size, font: currentFont }); 
          y -= size * 1.2; 
        }); 
        
        y -= size * 0.3;
      };

      addText('Meeting Summary & Transcript', 18, true);
      addText(`Exported on: ${new Date().toLocaleString()}`, 10); 
      y -= 20;

      if (summary) { 
        addText('AI Summary (Deepgram):', 14, true); 
        addText(summary, 10); 
        y -= 10;  
      }
      
      if (actionItems.length > 0) { 
        addText('Action Items (Detected):', 14, true); 
        actionItems.forEach(item => addText(`[ ] Speaker ${typeof item.speaker === 'number' ? item.speaker : '?'}: ${item.text}`, 10, false, 10)); 
        y -= 10; 
      }
      
      if (topics.length > 0) { 
        addText('Detected Topics (Deepgram):', 14, true); 
        addText(topics.map(t => t.topic).join(', '), 10); 
        y -= 10; 
      }
      
      if (detectedEntities.length > 0) { 
        addText('Detected Entities (Deepgram):', 14, true); 
        detectedEntities.slice(0,15).forEach(e => addText(`- ${e.value} (${e.label})`, 10, false, 10)); 
        if(detectedEntities.length > 15) addText('...', 10, false, 10); 
        y -= 10; 
      }
      
      if (detectedIntents.length > 0) { 
        addText('Detected Intents (Deepgram):', 14, true); 
        detectedIntents.slice(0,15).forEach(i => addText(`- ${i.intent}`, 10, false, 10)); 
        if(detectedIntents.length > 15) addText('...', 10, false, 10); 
        y -= 10; 
      }

      addText('Full Transcript:', 14, true);
      transcriptEntries.forEach(entry => { 
        addText(`Speaker ${typeof entry.speaker === 'number' ? entry.speaker : '?'}: ${entry.text}`, 10); 
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, `meeting-export-${Date.now()}.pdf`);
    } catch (error) { 
      console.error('Export Error: PDF generation failed:', error); 
      alert('Failed to generate PDF.'); 
    }
    setIsExporting(false);
  }, [transcriptEntries, actionItems, topics, detectedEntities, detectedIntents, summary]);

  const toggleActionItemCompletion = useCallback((id) => { 
    setActionItems(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    )); 
  }, []);

  const clearTranscript = useCallback(() => {
    if (isRecording) return;
    setTranscriptEntries([]); 
    setActionItems([]); 
    setSentimentData([]);
    setTopics([]); 
    setDetectedEntities([]); 
    setDetectedIntents([]);
    setSummary(''); 
    setSearchQuery('');
    speakerMapRef.current = new Map();
  }, [isRecording]);

  useEffect(() => { 
    return () => cleanupResources(); 
  }, [cleanupResources]);

  useEffect(() => { 
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [transcriptEntries]);

  const handleLoginLogout = useCallback(() => { 
    if (currentUser) {
      try {
        logout();
        console.log('Auth: User logged out.');
      } catch (error) {
        console.error("Logout failed:", error);
      }
    } else {
      setAuthView('login');
    }
  }, [currentUser, logout]);

  const renderAuthScreen = () => { 
    try {
      if (authView === 'login') {
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Suspense fallback={<div>Loading login screen...</div>}>
              <LoginScreen 
                onToggleAuth={() => setAuthView('signup')} 
                onSuccess={() => setAuthView(null)} 
              />
            </Suspense>
          </div>
        );
      }
      if (authView === 'signup') {
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Suspense fallback={<div>Loading signup screen...</div>}>
              <SignupScreen 
                onToggleAuth={() => setAuthView('login')} 
                onSuccess={() => setAuthView(null)} 
              />
            </Suspense>
          </div>
        );
      }
    } catch (error) {
      console.error("Auth screen render error:", error);
      return <div>Failed to load authentication screen. Please refresh the page.</div>;
    }
    return null;
  };

  const authScreen = renderAuthScreen();
  if (authScreen) return authScreen;

  const canClear = transcriptEntries.length > 0 || actionItems.length > 0 || topics.length > 0 || summary.length > 0 || detectedEntities.length > 0 || detectedIntents.length > 0;
  const canExport = transcriptEntries.length > 0;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
             <div className="flex-shrink-0 flex items-center"> <svg className="h-8 w-auto text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8S3 16.418 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /> </svg> <h1 className="text-xl font-bold text-gray-800">AI Meeting Assistant</h1> </div>
             <div className="flex items-center gap-4"> <ConnectionBadge status={connectionStatus} /> {currentUser ? (<div className="flex items-center gap-3"> <span className="text-sm font-medium text-gray-700 hidden sm:block">{currentUser.displayName || currentUser.email}</span> <button onClick={handleLoginLogout} className="px-3 py-1.5 border border-red-500 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition duration-150 ease-in-out">Logout</button> </div>) : (<div className="flex gap-2"> <button onClick={() => setAuthView('login')} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition duration-150 ease-in-out">Login</button> <button onClick={() => setAuthView('signup')} className="px-3 py-1.5 border border-blue-600 text-blue-600 text-sm font-medium rounded-md hover:bg-blue-50 transition duration-150 ease-in-out">Sign Up</button> </div>)} </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                          <h2 className="text-2xl font-semibold text-gray-800">Live Transcription</h2>
                          <SearchInput value={searchQuery} onChange={setSearchQuery} />
                      </div>
                      <TranscriptViewer entries={transcriptEntries.filter(e => e.text.toLowerCase().includes(searchQuery.toLowerCase()))} />
                      <div ref={transcriptEndRef} className="h-1" />
                      <ControlPanel
                          isRecording={isRecording} 
                          startRecording={startRecording} 
                          stopRecording={cleanupResources}
                          clearTranscript={clearTranscript} 
                          isExporting={isExporting} 
                          exportJSON={exportJSON}
                          exportPDF={exportPDF} 
                          canClear={canClear} 
                          canExport={canExport}
                      />
                  </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 h-fit lg:sticky lg:top-24">
                  <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-3">Meeting Insights (Deepgram AI)</h2>
                  <SummarySection summary={summary} isLoading={isSummarizing} />
                  <DeepgramAnalysis analysisData={deepgramAnalysis} isLoading={isAnalyzing} />
                  <SentimentTimeline data={sentimentData} />
                  <ActionItemsList items={actionItems} onToggleComplete={toggleActionItemCompletion} />
                  <TopicCloud topics={topics} />
                  <EntityList entities={detectedEntities} />
                  <IntentList intents={detectedIntents} />
              </div>
          </div>
      </main>

      <footer className="mt-auto border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">© {new Date().getFullYear()} AI Meeting Assistant. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function SafeApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
