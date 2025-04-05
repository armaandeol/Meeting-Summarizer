import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase'; 
import { useAuth } from '../../context/AuthContext';
import { Helmet } from 'react-helmet';

const MeetingSummarizerHomepage = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  // Fetch recent meetings
  useEffect(() => {
    const fetchRecentMeetings = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      
      try {
        const meetingsRef = collection(db, 'users', currentUser.uid, 'meetings');
        const meetingsQuery = query(
          meetingsRef,
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        
        const querySnapshot = await getDocs(meetingsQuery);
        const meetings = [];
        
        querySnapshot.forEach((doc) => {
          const meetingData = doc.data();
          console.log("Meeting data:", meetingData);
          meetings.push({
            id: doc.id,
            ...meetingData
          });
        });
        
        setRecentMeetings(meetings);
      } catch (error) {
        console.error("Error fetching meetings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecentMeetings();
  }, [currentUser]);

  const createNewMeeting = async () => {
    try {
      setIsCreating(true);
      const meetingData = {
        title: "New Meeting",
        date: serverTimestamp(),
        duration: 30,
        status: "scheduled",
        summary: "",
        intent: "To be discussed",
        participants: [],
        actionItems: [],
        createdAt: serverTimestamp()
      };

      if (currentUser) {
        const userMeetingsRef = collection(db, "users", currentUser.uid, "meetings");
        const docRef = await addDoc(userMeetingsRef, meetingData);
        console.log("Meeting created with ID: ", docRef.id);
        navigate(`/transcription/${docRef.id}`);
      } else {
        alert("You must be logged in to create a meeting");
      }
    } catch (error) {
      console.error("Error creating meeting: ", error);
      alert("Error creating meeting. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const truncateSummary = (text, maxLength = 120) => {
    if (!text) return "No summary available";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Date not available";
    }
    
    let date;
    
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } 
    else if (typeof timestamp === 'string') {
      try {
        date = new Date(timestamp);
      } catch (error) {
        console.error("Error parsing date string:", error);
        return "Date not available";
      }
    } 
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    else {
      return "Date not available";
    }
    
    if (!(date instanceof Date) || isNaN(date)) {
      return "Date not available";
    }
    
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
    }).format(date);
  };

  const getDisplayDuration = (meeting) => {
    if (meeting.duration && !isNaN(parseInt(meeting.duration))) {
      return `${parseInt(meeting.duration)} min`;
    }
    return "Duration N/A";
  };

  return (
    <>
      <Helmet>
        <link 
          href="https://fonts.googleapis.com/css2?family=Lisu+Bosa:wght@400;500;600;700&display=swap" 
          rel="stylesheet"
        />
      </Helmet>
      <div className="flex h-screen bg-gray-900 font-sans bg-[url('/textures/dark-pattern.png')] bg-repeat" style={{ fontFamily: "'Lisu Bosa', serif" }}>
        {/* Left Sidebar */}
        <div className="w-72 bg-gradient-to-b from-blue-900 to-indigo-900 text-white flex flex-col h-screen border-r border-blue-800/50 shadow-lg">
          {/* Logo */}
          <div className="p-6 border-b border-blue-800/40">
            <div className="flex items-center">
              <i className="fas fa-comments text-2xl mr-3 text-blue-400"></i>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-300">meetBuddy</h1>
            </div>
          </div>
          
          {/* Navigation - More prominent */}
          <nav className="flex-1 overflow-y-auto py-6 px-3">
            <a href="#" className="flex items-center px-6 py-4 my-1 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md">
              <i className="fas fa-home mr-3"></i>
              <span className="font-medium">Home</span>
            </a>
            <a href="#" className="flex items-center px-6 py-4 my-1 rounded-lg text-blue-100 hover:bg-blue-800/50 transition-all duration-300">
              <i className="fas fa-calendar-alt mr-3"></i>
              <span>Meetings</span>
            </a>
            <a 
              onClick={() => navigate('/summaries')} 
              className="flex items-center px-6 py-4 my-1 rounded-lg text-blue-100 hover:bg-blue-800/50 transition-all duration-300 cursor-pointer"
            >
              <i className="fas fa-file-alt mr-3"></i>
              <span>Summaries</span>
            </a>
            <a href="#" className="flex items-center px-6 py-4 my-1 rounded-lg text-blue-100 hover:bg-blue-800/50 transition-all duration-300">
              <i className="fas fa-chart-bar mr-3"></i>
              <span>Analytics</span>
            </a>
            <a href="#" className="flex items-center px-6 py-4 my-1 rounded-lg text-blue-100 hover:bg-blue-800/50 transition-all duration-300">
              <i className="fas fa-cog mr-3"></i>
              <span>Settings</span>
            </a>
          </nav>
          
          {/* User Profile */}
          <div className="p-6 border-t border-blue-800/40 bg-blue-900/30">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-md">
                <span className="font-bold text-white text-lg">{currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}</span>
              </div>
              <div className="ml-4">
                <p className="font-medium text-white">{currentUser?.displayName || 'User'}</p>
                <p className="text-sm text-blue-200">{currentUser?.email || 'No email'}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-md p-6 border-b border-blue-800/30">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium text-white">Welcome to MeetBuddy</h2>
              <div className="flex items-center space-x-5">
                <button className="text-blue-300 hover:text-blue-200 text-lg">
                  <i className="fas fa-bell"></i>
                </button>
                <button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 px-6 rounded-lg flex items-center shadow-lg transition-all duration-300"
                  onClick={createNewMeeting}
                  disabled={isCreating}
                >
                  <i className="fas fa-plus mr-2"></i>
                  <span className="font-medium">{isCreating ? "Creating..." : "New Meeting"}</span>
                </button>
              </div>
            </div>
          </header>
          
          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-8 bg-gray-900">
            {/* Hero Section - Enhanced */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-12 md:p-16 mb-12 border border-blue-700/30 relative overflow-hidden min-h-[500px] transform hover:scale-[1.01] transition-all duration-700">
              {/* Enhanced animated background patterns */}
              <div className="absolute inset-0 bg-[url('/textures/circuit-pattern.png')] opacity-15"></div>
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/15 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute -left-20 bottom-0 w-64 h-64 bg-indigo-600/15 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-purple-600/10 rounded-full blur-xl animate-pulse delay-700"></div>
              
              {/* Decorative elements */}
              <div className="absolute top-8 right-8 text-blue-400/30 text-6xl">
                <i className="fas fa-comments"></i>
              </div>
              <div className="absolute bottom-8 left-8 text-indigo-400/20 text-5xl">
                <i className="fas fa-lightbulb"></i>
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-between relative z-10 h-full">
                {/* Text content - enhanced */}
                <div className="md:w-3/5 mb-10 md:mb-0 md:pr-12">
                  {/* Larger, more interactive heading */}
                  <h1 className="text-4xl md:text-5xl font-bold mb-6 relative group">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-blue-300 bg-size-200 animate-gradient-x inline-block">
                      Transform Your Meetings 
                    </span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300 mt-2">
                      with AI-Powered Magic
                    </span>
                    <span className="absolute -top-6 -right-6 text-yellow-300 text-2xl opacity-0 group-hover:opacity-100 transition-all duration-300">✨</span>
                  </h1>
                  
                  {/* Enhanced description with larger icon bullets */}
                  <div className="text-gray-300 mb-10">
                    <p className="text-xl mb-6 leading-relaxed">MeetBuddy does the heavy lifting so you can focus on what matters most in your meetings:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
                      <div className="flex items-center text-blue-200 bg-blue-900/20 p-4 rounded-lg border border-blue-800/30 transform hover:translate-x-1 transition-all duration-300">
                        <i className="fas fa-microphone text-blue-400 mr-3 text-xl"></i>
                        <span className="font-medium">Smart transcription</span>
                      </div>
                      <div className="flex items-center text-blue-200 bg-purple-900/20 p-4 rounded-lg border border-purple-800/30 transform hover:translate-x-1 transition-all duration-300">
                        <i className="fas fa-brain text-purple-400 mr-3 text-xl"></i>
                        <span className="font-medium">AI-powered summaries</span>
                      </div>
                      <div className="flex items-center text-blue-200 bg-green-900/20 p-4 rounded-lg border border-green-800/30 transform hover:translate-x-1 transition-all duration-300">
                        <i className="fas fa-tasks text-green-400 mr-3 text-xl"></i>
                        <span className="font-medium">Action item extraction</span>
                      </div>
                      <div className="flex items-center text-blue-200 bg-yellow-900/20 p-4 rounded-lg border border-yellow-800/30 transform hover:translate-x-1 transition-all duration-300">
                        <i className="fas fa-clock text-yellow-400 mr-3 text-xl"></i>
                        <span className="font-medium">Hours saved weekly</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Call-to-action buttons */}
                  <div className="flex flex-wrap gap-4 mt-6">
                    <button className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 px-8 rounded-lg shadow-lg hover:shadow-blue-700/20 transition-all duration-300 font-medium text-lg">
                      Get Started Free
                      <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-1 transition-transform"></i>
                    </button>
                    <button className="bg-transparent border-2 border-blue-400/30 text-blue-300 hover:bg-blue-900/30 py-4 px-8 rounded-lg transition-all duration-300 font-medium text-lg">
                      <i className="fas fa-play mr-2"></i>
                      Watch Demo
                    </button>
                  </div>
                </div>
                
                {/* Enhanced interactive image section */}
                <div className="md:w-2/5 relative group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  <img 
                    src="https://brandlogo.org/wp-content/uploads/2024/04/Microsoft-Copilot-Logo.png.webp" 
                    alt="Meeting Illustration" 
                    className="rounded-xl shadow-2xl border border-blue-700/20 transition-all duration-500 group-hover:shadow-blue-700/30 group-hover:scale-[1.03] max-w-[80%] mx-auto" 
                  />
                  <div className="absolute -bottom-4 -right-4 bg-blue-600 text-white rounded-full w-20 h-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg">
                    <i className="fas fa-bolt text-2xl"></i>
                  </div>
                  
                  {/* Floating badge */}
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm py-1 px-3 rounded-full opacity-90 shadow-lg">
                    New Feature
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recent Meetings Section */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-medium text-white">Recent Meetings</h3>
              <button 
                onClick={() => navigate(`/meeting-page/all`)} 
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center font-medium cursor-pointer"
              >
                View All
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              {isLoading ? (
                // Loading state
                Array(3).fill().map((_, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg shadow-md p-6 animate-pulse border border-blue-800/20">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2 mb-5"></div>
                    <div className="h-16 bg-gray-700 rounded mb-5"></div>
                    <div className="flex justify-between">
                      <div className="h-6 bg-gray-700 rounded w-1/4"></div>
                      <div className="h-6 bg-gray-700 rounded w-1/4"></div>
                    </div>
                  </div>
                ))
              ) : recentMeetings.length > 0 ? (
                recentMeetings.map((meeting) => (
                  <div key={meeting.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-blue-800/20">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium text-white text-lg">{meeting.title || "Untitled Meeting"}</h4>
                        <p className="text-sm text-gray-400">
                          {formatDate(meeting.date || meeting.createdAt)} • {getDisplayDuration(meeting)}
                        </p>
                      </div>
                      <span className="bg-green-900/60 text-green-300 text-xs py-1 px-3 rounded-full border border-green-700/50">
                        {meeting.status || "Completed"}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-5">{truncateSummary(meeting.summary)}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm shadow-md">
                          {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                        </div>
                      </div>
                      <a 
                        href={`/summarised-meeting/${meeting.id}`} 
                        className="text-blue-400 text-sm hover:text-blue-300 font-medium"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/summarised-meeting/${meeting.id}`);
                        }}
                      >
                        View Summary
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg border border-blue-800/20">
                  <p className="text-gray-300 mb-5 text-lg">You don't have any meetings yet</p>
                  <button 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-6 rounded-lg shadow-lg transition-all duration-300 font-medium"
                    onClick={createNewMeeting}
                  >
                    Create Your First Meeting
                  </button>
                </div>
              )}
            </div>
            
            {/* Features Section */}
            <h3 className="text-2xl font-medium text-white mb-6">Key Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-8 border border-blue-800/20 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-blue-800/10 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-700"></div>
                <div className="text-blue-400 mb-5 relative z-10">
                  <i className="fas fa-microphone text-4xl"></i>
                </div>
                <h4 className="text-xl font-medium mb-3 text-white relative z-10">Real-time Transcription</h4>
                <p className="text-gray-300 text-base relative z-10">Accurate speech-to-text conversion that works across multiple speakers and accents.</p>
              </div>
              
              {/* Feature 2 */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-8 border border-blue-800/20 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-purple-800/10 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-700"></div>
                <div className="text-purple-400 mb-5 relative z-10">
                  <i className="fas fa-brain text-4xl"></i>
                </div>
                <h4 className="text-xl font-medium mb-3 text-white relative z-10">AI Summarization</h4>
                <p className="text-gray-300 text-base relative z-10">Smart algorithms that extract key points, decisions, and context from your meetings.</p>
              </div>
              
              {/* Feature 3 */}
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-8 border border-blue-800/20 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-green-800/10 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-700"></div>
                <div className="text-green-400 mb-5 relative z-10">
                  <i className="fas fa-tasks text-4xl"></i>
                </div>
                <h4 className="text-xl font-medium mb-3 text-white relative z-10">Action Item Tracking</h4>
                <p className="text-gray-300 text-base relative z-10">Automatically extract action items and assign them to team members with due dates.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default MeetingSummarizerHomepage;