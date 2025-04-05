import React from 'react';

const RecordingControls = ({ 
  isRecording, 
  startRecording, 
  stopRecording, 
  connectionStatus,
  isProcessing
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
      {/* Main Recording Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`px-6 py-2 rounded-full flex items-center justify-center gap-2 shadow-sm transition-all
          ${isRecording 
            ? "bg-red-600 hover:bg-red-700 text-white" 
            : "bg-blue-600 hover:bg-blue-700 text-white"}
          ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {isRecording ? (
          <>
            <span className="animate-pulse">●</span> 
            <span>Stop Recording</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span>Start Recording</span>
          </>
        )}
      </button>
      
      {/* Connection Status Indicator */}
      <div className="text-sm">
        {connectionStatus === "Connected" || connectionStatus === "Recording..." ? (
          <div className="flex items-center text-green-600">
            <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span>{connectionStatus}</span>
          </div>
        ) : connectionStatus === "Connecting..." || 
           connectionStatus === "Accessing microphone..." ||
           connectionStatus === "Setting up recorder..." ? (
          <div className="flex items-center text-blue-600">
            <div className="h-2 w-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            <span>{connectionStatus}</span>
          </div>
        ) : connectionStatus.startsWith("Error") ? (
          <div className="flex items-center text-red-600">
            <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>
            <span>{connectionStatus}</span>
          </div>
        ) : (
          <span className="text-gray-500">{connectionStatus}</span>
        )}
      </div>
    </div>
  );
};

export default RecordingControls;
