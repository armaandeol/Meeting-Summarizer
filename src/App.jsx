import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';

const DEEPGRAM_API_KEY = '16dcb20c07a4be54791de06f5059e9c412284862';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Not Connected');
  const [authView, setAuthView] = useState(null); // null, 'login', or 'signup'
  
  const { currentUser, logout } = useAuth();

  // Refs for resource management
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const speakerMapRef = useRef(new Map());
  const currentSpeakerRef = useRef(null);
  const currentSentenceRef = useRef([]);

  // Cleanup resources
  const cleanupResources = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    socketRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    
    // Flush remaining audio data
    if (currentSpeakerRef.current && currentSentenceRef.current.length > 0) {
      const finalSentence = `Speaker ${currentSpeakerRef.current}: ${currentSentenceRef.current.join(' ')}`;
      setTranscript(prev => (prev + '\n' + finalSentence).trim());
    }

    setIsRecording(false);
    setConnectionStatus('Not Connected');
    mediaRecorderRef.current = null;
    socketRef.current = null;
    streamRef.current = null;
    speakerMapRef.current = new Map();
    currentSpeakerRef.current = null;
    currentSentenceRef.current = [];
  }, []);

  // Start recording handler
  const startRecording = async () => {
    if (isRecording) return;

    // Reset tracking for new session
    speakerMapRef.current = new Map();
    currentSpeakerRef.current = null;
    currentSentenceRef.current = [];
    setTranscript('');
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
      };

      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          if (!data.is_final || !data.channel?.alternatives?.[0]?.words) return;

          let transcriptChunk = '';
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
              if (currentSpeakerRef.current !== null) {
                transcriptChunk += `Speaker ${currentSpeakerRef.current}: ${currentSentenceRef.current.join(' ')}\n`;
              }
              currentSpeakerRef.current = displaySpeaker;
              currentSentenceRef.current = [word.punctuated_word || word.word];
            } else {
              currentSentenceRef.current.push(word.punctuated_word || word.word);
            }
          });

          // Add remaining sentence for current speaker
          if (currentSpeakerRef.current) {
            transcriptChunk += `Speaker ${currentSpeakerRef.current}: ${currentSentenceRef.current.join(' ')}`;
            currentSentenceRef.current = [];
          }

          if (transcriptChunk) {
            setTranscript(prev => (prev + '\n' + transcriptChunk).trim());
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

  // Component cleanup
  useEffect(() => () => cleanupResources(), [cleanupResources]);

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
              <span className={`px-3 py-1 rounded-full text-sm ${
                connectionStatus === 'Connected' ? 'bg-green-100 text-green-800' :
                connectionStatus === 'Connecting...' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {connectionStatus}
              </span>
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-4">Live Transcription</h2>
            <div className="h-96 overflow-y-auto p-4 bg-gray-50 rounded-md">
              {transcript.split('\n').map((line, index) => (
                line.includes(':') ? (
                  <div key={index} className="mb-3 last:mb-0">
                    <div className="flex items-center mb-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                        parseInt(line.match(/Speaker (\d+)/)?.[1]) % 3 === 0 ? 'bg-purple-100' :
                        parseInt(line.match(/Speaker (\d+)/)?.[1]) % 3 === 1 ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        <span className="font-medium text-sm">
                          {line.split(':')[0].replace('Speaker ', '')}
                        </span>
                      </div>
                      <span className="font-medium text-gray-700">
                        {line.split(':')[0]}
                      </span>
                    </div>
                    <p className="ml-10 text-gray-600">{line.split(':').slice(1).join(':').trim()}</p>
                  </div>
                ) : (
                  <p key={index} className="text-gray-600 mb-3">{line}</p>
                )
              ))}
            </div>
          </div>

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
                onClick={cleanupResources}
                className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" />
                </svg>
                Stop Recording
              </button>
            )}
            <button
              onClick={() => setTranscript('')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              disabled={isRecording}
            >
              Clear
            </button>
          </div>
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