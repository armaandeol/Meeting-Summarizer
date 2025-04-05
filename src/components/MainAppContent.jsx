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
  setAuthView,
  meetingTitle,
  setMeetingTitle,
  elapsedTime
}) => (
  <div className="min-h-screen bg-gray-900 flex flex-col bg-[url('/texture-dark.png')] bg-repeat">
    <nav className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-lg sticky top-0 z-20 border-b border-blue-500/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0 flex items-center"> 
            <svg className="h-9 w-auto text-blue-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"> 
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8S3 16.418 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /> 
            </svg> 
            <h1 className="text-2xl font-bold text-white">MeetBuddy</h1> 
          </div>
          
          <div className="flex items-center gap-6">
            {currentUser && (
              <Link to="/home" className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-md hover:from-blue-700 hover:to-indigo-700 transition duration-300 ease-in-out shadow-md">
                Home
              </Link>
            )}
            <ConnectionBadge status={connectionStatus} />
            {currentUser ? (
              <div className="flex items-center gap-4"> 
                <span className="text-sm font-medium text-gray-300 hidden sm:block">{currentUser.displayName || currentUser.email}</span> 
                <button onClick={handleLoginLogout} className="px-4 py-2 border border-red-500/70 text-red-400 text-sm font-medium rounded-md hover:bg-red-500/20 transition duration-300 ease-in-out">Logout</button> 
              </div>
            ) : (
              <div className="flex gap-3"> 
                <button onClick={() => setAuthView('login')} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-md hover:from-blue-700 hover:to-indigo-700 transition duration-300 ease-in-out shadow-md">Login</button> 
                <button onClick={() => setAuthView('signup')} className="px-4 py-2 border border-blue-500/70 text-blue-400 text-sm font-medium rounded-md hover:bg-blue-500/20 transition duration-300 ease-in-out">Sign Up</button> 
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>

    <main className="flex-grow max-w-7xl w-full mx-auto px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl overflow-hidden border border-blue-500/20">
          <div className="p-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-5">
              <div className="flex flex-col w-full">
                <input
                  type="text"
                  placeholder="Meeting Title"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="text-2xl font-semibold text-white bg-transparent border-b border-blue-500/40 focus:border-blue-500 outline-none mb-2 pb-1"
                />
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-white">Live Transcription</h2>
                  <div className="flex items-center text-blue-400 bg-blue-500/10 px-3 py-1 rounded-md">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">
                      {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
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

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-8 h-fit lg:sticky lg:top-28 border border-blue-500/20">
          <h2 className="text-xl font-semibold mb-6 text-white border-b border-gray-700 pb-4">Meeting Insights (Deepgram AI)</h2>
          <SummarySection summary={summary} isLoading={isSummarizing} />
          <DeepgramAnalysis analysisData={deepgramAnalysis} isLoading={isAnalyzing} />
          
          <div className="mt-8 pt-6 border-t border-gray-700">
            <h2 className="text-xl font-semibold mb-5 text-white">Chat with AI</h2>
            <div className="h-96">
              <TranscriptChatbot transcriptionData={{
                transcript: transcriptEntries,
                summary: summary,
                topics: deepgramAnalysis?.topics || [],
                meetingTitle: meetingTitle,
                duration: elapsedTime
              }} />
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer className="mt-auto border-t border-gray-700 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-gray-400">© {new Date().getFullYear()} AI Meeting Assistant. All rights reserved.</p>
      </div>
    </footer>
  </div>
);

export default MainAppContent;