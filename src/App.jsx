import { useState, useRef, useEffect } from 'react'
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import './App.css'

function App() {
  console.log("App component rendering");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const deepgramConnectionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);

  // Log state changes
  useEffect(() => {
    console.log("isRecording state changed:", isRecording);
  }, [isRecording]);

  useEffect(() => {
    console.log("transcript state changed:", transcript);
  }, [transcript]);

  const startRecording = async () => {
    console.log("startRecording function called");
    try {
      console.log("Requesting microphone access...");
      // Get user media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      console.log("Microphone access granted:", stream);
      
      // Initialize Deepgram client
      console.log("Initializing Deepgram client...");
      const deepgram = createClient('16dcb20c07a4be54791de06f5059e9c412284862');
      console.log("Deepgram client created:", deepgram);
      
      // Create a live transcription connection
      console.log("Creating live transcription connection...");
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        punctuate: true,
        smart_format: true,
      });
      console.log("Live transcription connection created");
      
      deepgramConnectionRef.current = connection;
      
      // Set up event listeners for the connection
      console.log("Setting up Deepgram event listeners");
      
      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log("Deepgram connection opened successfully");
        setIsRecording(true);
        
        // Set up audio context for processing microphone input
        console.log("Setting up AudioContext...");
        const audioContext = new AudioContext();
        console.log("AudioContext created:", audioContext);
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        console.log("MediaStreamSource created:", source);
        
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        console.log("ScriptProcessor created:", processor);
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        console.log("Audio processing pipeline connected");
        
        processor.onaudioprocess = (e) => {
          // Get audio data from input channel
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Log audio data periodically (not every frame to avoid console spam)
          if (Math.random() < 0.01) {  // Log approximately 1% of audio frames
            console.log("Audio processing event. Buffer size:", inputData.length, "Sample values:", inputData[0], inputData[1], "...");
            console.log("Audio level:", calculateAudioLevel(inputData));
          }
          
          // Convert float32 to int16 (what Deepgram expects)
          const convertedData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            // Convert Float32 to Int16
            convertedData[i] = inputData[i] * 32767;
          }
          
          // Send audio data to Deepgram
          try {
            connection.send(convertedData.buffer);
            if (Math.random() < 0.01) {  // Log occasionally to avoid spam
              console.log("Sent audio data to Deepgram, buffer size:", convertedData.buffer.byteLength);
            }
          } catch (error) {
            console.error("Error sending audio data to Deepgram:", error);
          }
        };
        
        mediaRecorderRef.current = { 
          stream,
          processor,
          source
        };
      });
      
      connection.on(LiveTranscriptionEvents.Close, (event) => {
        console.log("Deepgram connection closed", event);
        stopRecording();
      });
      
      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        console.log("Transcript received from Deepgram:", JSON.stringify(data));
        
        if (data.channel && 
            data.channel.alternatives && 
            data.channel.alternatives.length > 0) {
          const receivedTranscript = data.channel.alternatives[0].transcript;
          console.log("Extracted transcript text:", receivedTranscript);
          
          if (receivedTranscript && receivedTranscript.trim() !== '') {
            console.log("Adding text to transcript state:", receivedTranscript);
            setTranscript(prev => {
              const newTranscript = prev + ' ' + receivedTranscript;
              console.log("New complete transcript:", newTranscript);
              return newTranscript;
            });
          } else {
            console.log("Empty transcript received, not updating state");
          }
        } else {
          console.log("Received transcript event but missing expected structure:", data);
        }
      });
      
      connection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error("Deepgram error event received:", error);
        stopRecording();
      });
      
      connection.on(LiveTranscriptionEvents.Warning, (warning) => {
        console.warn("Deepgram warning event received:", warning);
      });
      
      console.log("All Deepgram event listeners set up successfully");
      
    } catch (error) {
      console.error("Error in startRecording:", error);
    }
  };

  // Helper function to calculate audio level for debugging
  const calculateAudioLevel = (buffer) => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += Math.abs(buffer[i]);
    }
    return sum / buffer.length;
  };

  const stopRecording = () => {
    console.log("stopRecording function called");
    
    // Clean up audio processing
    if (mediaRecorderRef.current) {
      console.log("Cleaning up media recorder...");
      if (mediaRecorderRef.current.source) {
        console.log("Disconnecting audio source");
        mediaRecorderRef.current.source.disconnect();
      }
      if (mediaRecorderRef.current.processor) {
        console.log("Disconnecting audio processor");
        mediaRecorderRef.current.processor.disconnect();
      }
      if (mediaRecorderRef.current.stream) {
        console.log("Stopping audio tracks");
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      mediaRecorderRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      console.log("Closing AudioContext...");
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        console.log("AudioContext closed");
      }
      audioContextRef.current = null;
    }
    
    // Close Deepgram connection
    if (deepgramConnectionRef.current) {
      console.log("Finishing Deepgram connection...");
      try {
        deepgramConnectionRef.current.finish();
        console.log("Deepgram connection finished successfully");
      } catch (error) {
        console.error("Error finishing Deepgram connection:", error);
      }
      deepgramConnectionRef.current = null;
    }
    
    setIsRecording(false);
  };

  useEffect(() => {
    console.log("Component mounted");
    // Clean up on component unmount
    return () => {
      console.log("Component unmounting, cleaning up...");
      stopRecording();
    };
  }, []);

  console.log("Rendering component with transcript:", transcript);
  
  return (
    <>
      {/* Navbar */}
      <nav className="bg-white shadow-sm fixed top-0 left-0 w-full z-10">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">MeetingSummarizer</span>
            </div>
            <div className="flex items-center">
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white pt-16">
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
                <div className="bg-white shadow-md rounded-lg p-6 mb-8">
                  <h2 className="text-2xl font-bold mb-4 text-gray-800">Real-time Transcription</h2>
                  
                  {/* Transcription Display */}
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4 min-h-[200px] max-h-[400px] overflow-y-auto text-left">
                    {transcript ? (
                      <p>{transcript}</p>
                    ) : (
                      <p className="text-gray-400 italic">Your transcription will appear here... (UI Check: This text should be visible)</p>
                    )}
                  </div>
                  
                  <div className="bg-blue-100 p-2 mb-4 rounded">
                    <p className="text-sm">Debug info: isRecording={isRecording.toString()}, transcript length={transcript.length}</p>
                  </div>
                  
                  {/* Recording Controls */}
                  <div className="flex justify-center space-x-4">
                    {!isRecording ? (
                      <button 
                        onClick={() => {
                          console.log("Start Recording button clicked");
                          startRecording();
                        }} 
                        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Start Recording
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          console.log("Stop Recording button clicked");
                          stopRecording();
                        }} 
                        className="px-6 py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                        </svg>
                        Stop Recording
                      </button>
                    )}
                    
                    <button 
                      onClick={() => {
                        console.log("Clear button clicked");
                        setTranscript('');
                      }} 
                      className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              
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
        <footer className="bg-white">
          <div className="w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500">© 2025 Meeting Summarizer. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </>
  )
}

export default App