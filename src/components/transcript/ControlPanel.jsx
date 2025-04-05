import React from 'react';

const ControlPanel = ({ isRecording, startRecording, stopRecording, clearTranscript, isExporting, exportJSON, exportPDF, canClear, canExport, isProcessing }) => (
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
        <div className="flex flex-col">
          <button
            onClick={stopRecording}
            className="px-5 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 flex items-center transition duration-150 ease-in-out shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isProcessing}
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"> <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-11a1 1 0 00-1 1v4a1 1 0 001 1h2a1 1 0 001-1V8a1 1 0 00-1-1H9z" clipRule="evenodd" /> </svg>
            {isProcessing ? "Processing..." : "Stop Recording"}
          </button>
          {isProcessing && (
            <div className="w-full mt-2 h-1 bg-gray-200 rounded overflow-hidden">
              <div className="h-full bg-blue-600 animate-pulse loading-animation"></div>
            </div>
          )}
        </div>
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
      <button onClick={exportPDF} className="px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-md hover:bg-indigo-200 text-sm transition duration-150 ease-in-out shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={isExporting || !canExport}> {isExporting ? 'Generating...' : 'Export PDF'} </button>
    </div>
  </div>
);

export default ControlPanel;
