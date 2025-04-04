import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

// --- IMPORTANT ---
// Replace this with your actual Deepgram API Key.
// In a real application, use environment variables (e.g., import.meta.env.VITE_DEEPGRAM_API_KEY)
const DEEPGRAM_API_KEY = '16dcb20c07a4be54791de06f5059e9c412284862';
// --- IMPORTANT ---

function App() {
  console.log("App component rendering");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Not Connected');

  // Refs for managing resources
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  // --- Cleanup Function ---
  const cleanupResources = useCallback(() => {
    console.log("Cleaning up resources...");

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log("Stopping MediaRecorder...");
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Close WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log("Closing WebSocket connection...");
      socketRef.current.close();
      socketRef.current = null;
    }

    // Stop media stream tracks
    if (streamRef.current) {
      console.log("Stopping media stream tracks...");
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setConnectionStatus('Not Connected');
    console.log("Cleanup complete.");
  }, []);

  // --- Start Recording ---
  const startRecording = async () => {
    console.log("startRecording function called");
    if (isRecording) {
      console.warn("Already recording.");
      return;
    }

    // Clear previous transcript before starting new recording
    setTranscript('');
    setConnectionStatus('Connecting...');

    try {
      // Check browser support for MediaRecorder and webm format
      if (!window.MediaRecorder || !MediaRecorder.isTypeSupported('audio/webm')) {
        alert('Your browser does not support the required audio recording capabilities');
        setConnectionStatus('Browser not supported');
        return;
      }

      // Request microphone access
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access granted");
      streamRef.current = stream;

      // Create WebSocket connection to Deepgram
      console.log("Creating WebSocket connection to Deepgram...");
      const socket = new WebSocket('wss://api.deepgram.com/v1/listen', [
        'token',
        DEEPGRAM_API_KEY
      ]);
      socketRef.current = socket;

      // Set up WebSocket event handlers
      socket.onopen = () => {
        console.log("WebSocket connection opened");
        setConnectionStatus('Connected');

        // Create and start MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });
        mediaRecorderRef.current = mediaRecorder;

        // Handle data available event
        mediaRecorder.addEventListener('dataavailable', async (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            // Send audio data to Deepgram
            socket.send(event.data);
            console.log("Sent audio chunk, size:", event.data.size);
          }
        });

        // Start recording, sending data every 1000ms
        mediaRecorder.start(1000);
        setIsRecording(true);
        console.log("MediaRecorder started");
      };

      // Handle incoming messages (transcription results)
      socket.onmessage = (message) => {
        try {
          const received = JSON.parse(message.data);
          console.log("Received message from Deepgram:", received);
          
          // Extract transcript from the response
          if (received.channel && 
              received.channel.alternatives && 
              received.channel.alternatives.length > 0) {
            
            const receivedText = received.channel.alternatives[0].transcript;
            
            // Only add non-empty transcripts that are final
            if (receivedText && received.is_final) {
              console.log("Final transcript:", receivedText);
              setTranscript(prev => (prev + ' ' + receivedText).trim());
            }
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      // Handle WebSocket closure
      socket.onclose = (event) => {
        console.log("WebSocket connection closed:", event);
        setConnectionStatus(`Disconnected (${event.code})`);
        setIsRecording(false);
        
        // Stop MediaRecorder if it's still running
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      };

      // Handle WebSocket errors
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus('Connection Error');
        cleanupResources();
      };

    } catch (error) {
      console.error("Error in startRecording:", error);
      setConnectionStatus(`Error: ${error.message || 'Failed to start'}`);
      alert(`Failed to start recording: ${error.message || 'Unknown error'}`);
      cleanupResources();
    }
  };

  // --- Stop Recording ---
  const stopRecording = () => {
    console.log("stopRecording function called by user");
    cleanupResources();
  };

  // --- Effect for Component Unmount Cleanup ---
  useEffect(() => {
    console.log("App component mounted");
    return () => {
      console.log("App component unmounting...");
      cleanupResources();
    };
  }, [cleanupResources]);

  return (
    <>
      {/* Navbar */}
      <nav className="bg-white shadow-sm fixed top-0 left-0 w-full z-10">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">MeetingSummarizer</span>
            </div>
            <div className="flex items-center space-x-4">
               <span className={`text-sm font-medium px-2 py-1 rounded ${
                 connectionStatus === 'Connected' ? 'bg-green-100 text-green-800' :
                 connectionStatus.startsWith('Error') ? 'bg-red-100 text-red-800' :
                 connectionStatus === 'Connecting...' ? 'bg-yellow-100 text-yellow-800' :
                 'bg-gray-100 text-gray-800'
               }`}>
                 Status: {connectionStatus}
               </span>
               <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                 Login
               </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-16 font-sans">
        {/* Hero Section */}
        <div className="py-12 w-full">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">Hello!</span>
                <span className="block text-blue-600">Welcome to Meeting Summarizer</span>
              </h1>
              <p className="mt-3 mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl">
                The smart way to summarize and organize your meeting notes
              </p>

              {/* Transcription Section */}
              <div className="mt-8 mx-auto max-w-3xl">
                <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
                  <h2 className="text-2xl font-semibold mb-4 text-gray-800">Real-time Transcription</h2>

                  {/* Transcription Display */}
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6 min-h-[200px] max-h-[400px] overflow-y-auto text-left text-gray-700 leading-relaxed">
                    {transcript ? (
                      <p>{transcript}</p>
                    ) : (
                      <p className="text-gray-400 italic">
                        {connectionStatus === 'Connected' ? 'Listening... Speak into your microphone.' :
                         connectionStatus === 'Connecting...' ? 'Connecting to transcription service...' :
                         connectionStatus.includes('Error') ? 'An error occurred. Please try again.' :
                         'Click "Start Recording" to begin.'}
                      </p>
                    )}
                  </div>

                  {/* Status Display */}
                  <div className="mb-4 text-sm">
                    <span className={`inline-block px-2 py-1 rounded ${
                      connectionStatus === 'Connected' ? 'bg-green-100 text-green-800' :
                      connectionStatus.includes('Error') ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Status: {connectionStatus}
                    </span>
                  </div>

                  {/* Recording Controls */}
                  <div className="flex justify-center space-x-4">
                    {!isRecording ? (
                      <button 
                        onClick={startRecording} 
                        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                        disabled={connectionStatus === 'Connecting...'}
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Start Recording
                      </button>
                    ) : (
                      <button 
                        onClick={stopRecording} 
                        className="px-6 py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                        </svg>
                        Stop Recording
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setTranscript('')} 
                      className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                      disabled={isRecording}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Placeholder Buttons */}
              <div className="mt-5 mx-auto flex flex-col sm:flex-row justify-center md:mt-8">
                <div className="rounded-md shadow">
                  <a href="#" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10">
                    Get started
                  </a>
                </div>
                <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                  <a href="#" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10">
                    Learn more
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white mt-auto">
          <div className="w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm">© {new Date().getFullYear()} Meeting Summarizer. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </>
  )
}

export default App;
