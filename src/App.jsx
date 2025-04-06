import React, { useState, useCallback, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './App.css';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import MainAppContent from './components/MainAppContent';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';

// Pages
import Home from './pages/Home/Home';
import Meeting_page from './pages/Meeting/Meeting_page';
import Chat from './pages/Chat/Chat';

// Hooks
import { useTranscription } from './hooks/useTranscription';
import { exportJSON, exportPDF } from './utils/exportUtils';
// Google API integration
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useGoogleCalendar } from './hooks/useGoogleCalendar';

function App() {
  console.log("App component rendering");
  
  // State variables
  const [authView, setAuthView] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { currentUser, logout } = useAuth() || {};

  // Google integration hooks
  const { 
    isGoogleAuthenticated, 
    googleUser, 
    loginWithGoogle, 
    logoutFromGoogle 
  } = useGoogleAuth();
  
  const { 
    upcomingMeetings, 
    currentMeeting, 
    isLoading: isLoadingMeetings,
    fetchMeetings, 
    joinMeeting 
  } = useGoogleCalendar(isGoogleAuthenticated);

  // Fetch meetings when user is authenticated with Google
  useEffect(() => {
    if (isGoogleAuthenticated) {
      fetchMeetings();
    }
  }, [isGoogleAuthenticated, fetchMeetings]);

  // Get API key from environment variables
  const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;
  
  // Use custom hook for transcription functionality
  const {
    isRecording,
    transcriptEntries,
    connectionStatus,
    sentimentData,
    actionItems,
    topics,
    detectedEntities,
    detectedIntents,
    summary,
    isSummarizing,
    deepgramAnalysis,
    isAnalyzing,
    transcriptEndRef,
    startRecording,
    cleanupResources,
    clearTranscript,
  } = useTranscription(DEEPGRAM_API_KEY);

  // Handle export functions
  const handleExportJSON = useCallback(() => {
    exportJSON(
      transcriptEntries, 
      actionItems, 
      sentimentData, 
      topics, 
      detectedEntities, 
      detectedIntents, 
      summary
    );
  }, [transcriptEntries, actionItems, sentimentData, topics, detectedEntities, detectedIntents, summary]);

  const handleExportPDF = useCallback(() => {
    exportPDF(
      transcriptEntries, 
      actionItems, 
      topics, 
      detectedEntities, 
      detectedIntents, 
      summary, 
      setIsExporting
    );
  }, [transcriptEntries, actionItems, topics, detectedEntities, detectedIntents, summary]);

  const handleLoginLogout = useCallback(() => { 
    if (currentUser) {
      try {
        logout();
        console.log('Auth: User logged out.');
      } catch (error) {
        console.error("Logout failed:", error);
        alert("Failed to log out. Please try again.");
      }
    } else {
      setAuthView('login');
    }
  }, [currentUser, logout]);

  const renderAuthScreen = () => { 
    if (authView === 'login') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
          <LoginScreen 
            onToggleAuth={() => setAuthView('signup')} 
            onLoginSuccess={() => {
              console.log("Login success callback triggered");
              setAuthView(null);
              // Redirect to Home page
              window.location.href = '/home';
            }} 
          />
        </div>
        
      );
    }
    if (authView === 'signup') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
          <SignupScreen 
            onToggleAuth={() => setAuthView('login')} 
            onSignupSuccess={() => {
              console.log("Signup success callback triggered");
              setAuthView(null);
              // Redirect to Home page after signup
              window.location.href = '/home';
            }} 
          />
        </div>
      );
    }
    return null;
  };

  const authScreen = renderAuthScreen();
  if (authScreen) return authScreen;

  const canClear = transcriptEntries.length > 0 || actionItems.length > 0 || topics.length > 0 || summary.length > 0 || detectedEntities.length > 0 || detectedIntents.length > 0;
  const canExport = transcriptEntries.length > 0;

  // Setup routes with Router
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <MainAppContent 
            connectionStatus={connectionStatus}
            currentUser={currentUser}
            handleLoginLogout={handleLoginLogout}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            transcriptEntries={transcriptEntries}
            transcriptEndRef={transcriptEndRef}
            isRecording={isRecording}
            startRecording={startRecording}
            cleanupResources={cleanupResources}
            clearTranscript={clearTranscript}
            isExporting={isExporting}
            exportJSON={handleExportJSON}
            exportPDF={handleExportPDF}
            canClear={canClear}
            canExport={canExport}
            summary={summary}
            isSummarizing={isSummarizing}
            deepgramAnalysis={deepgramAnalysis}
            isAnalyzing={isAnalyzing}
            setAuthView={setAuthView}
            // Google integration props
            isGoogleAuthenticated={isGoogleAuthenticated}
            loginWithGoogle={loginWithGoogle}
            upcomingMeetings={upcomingMeetings}
            currentMeeting={currentMeeting}
            joinMeeting={joinMeeting}
            isLoadingMeetings={isLoadingMeetings}
          />
        } />
        <Route path="/home" element={<Home />} />
        <Route path="/meeting-page/:id" element={<Meeting_page />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default function SafeApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}