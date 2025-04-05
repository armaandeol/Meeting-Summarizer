import React from 'react';
import { Link } from 'react-router-dom';
import ConnectionBadge from './ui/ConnectionBadge';
import SearchInput from './ui/SearchInput';
import TranscriptViewer from './transcript/TranscriptViewer';
import ControlPanel from './transcript/ControlPanel';
import SummarySection from './analysis/SummarySection';
import DeepgramAnalysis from './analysis/DeepgramAnalysis';
import TranscriptChatbot from './TranscriptChatbot';

const MainAppContent = ({ 
  connectionStatus, 
  currentUser, 
  handleLoginLogout,
  searchQuery,
  setSearchQuery,
  transcriptEntries,
  transcriptEndRef,
  isRecording,
  startRecording,
  cleanupResources,
  clearTranscript,
  isExporting,
  exportJSON,
  exportPDF,
  canClear,
  canExport,
  summary,
  isSummarizing,
  deepgramAnalysis,
  isAnalyzing,
  setAuthView
}) => (
  <div className="min-h-screen bg-gray-100 flex flex-col">
    <nav className="bg-white shadow-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
           <div className="flex-shrink-0 flex items-center"> <svg className="h-8 w-auto text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8S3 16.418 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /> </svg> <h1 className="text-xl font-bold text-gray-800">AI Meeting Assistant</h1> </div>
           <div className="flex items-center gap-4">
             <ConnectionBadge status={connectionStatus} />
             {currentUser ? (
               <div className="flex items-center gap-3"> 
                 <span className="text-sm font-medium text-gray-700 hidden sm:block">{currentUser.displayName || currentUser.email}</span> 
                 <Link to="/home" className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition duration-150 ease-in-out">Home</Link>
                 <button onClick={handleLoginLogout} className="px-3 py-1.5 border border-red-500 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition duration-150 ease-in-out">Logout</button> 
               </div>
             ) : (
               <div className="flex gap-2"> 
                 <button onClick={() => setAuthView('login')} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition duration-150 ease-in-out">Login</button> 
                 <button onClick={() => setAuthView('signup')} className="px-3 py-1.5 border border-blue-600 text-blue-600 text-sm font-medium rounded-md hover:bg-blue-50 transition duration-150 ease-in-out">Sign Up</button> 
               </div>
             )}
           </div>
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
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">Chat with AI</h2>
                  <div className="h-96">
                    <TranscriptChatbot transcriptionData={{
                      transcript: transcriptEntries,
                      summary: summary,
                      topics: deepgramAnalysis?.topics || []
                    }} />
                  </div>
                </div>
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

export default MainAppContent;
