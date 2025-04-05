import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase'; 
import { useAuth } from '../../context/AuthContext'; // Import auth context to get current user

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
        // Create a query against the user's meetings subcollection
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
          console.log("Meeting data:", meetingData); // Debug what's coming from Firestore
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
      // Create a new meeting document in Firestore
      const meetingData = {
        title: "New Meeting",
        date: serverTimestamp(),
        duration: 30, // default duration in minutes
        status: "scheduled",
        summary: "",
        intent: "To be discussed",
        participants: [],
        actionItems: [],
        createdAt: serverTimestamp()
      };

      // Update to use the nested collection structure
      if (currentUser) {
        const userMeetingsRef = collection(db, "users", currentUser.uid, "meetings");
        const docRef = await addDoc(userMeetingsRef, meetingData);
        console.log("Meeting created with ID: ", docRef.id);
        
        // Navigate to the Meeting page with the new meeting ID
        navigate(`/meeting/${docRef.id}`);
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

  // Function to truncate summary text
  const truncateSummary = (text, maxLength = 120) => {
    if (!text) return "No summary available";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Function to format date
  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Date not available";
    }
    
    let date;
    
    // Handle Firestore timestamp objects
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } 
    // Handle string format like "5 April 2025 at 14:34:37 UTC+5:30"
    else if (typeof timestamp === 'string') {
      try {
        date = new Date(timestamp);
      } catch (error) {
        console.error("Error parsing date string:", error);
        return "Date not available";
      }
    } 
    // If it's already a Date object
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // If it's a number (timestamp)
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    else {
      return "Date not available";
    }
    
    // Make sure date is valid
    if (!(date instanceof Date) || isNaN(date)) {
      return "Date not available";
    }
    
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
    }).format(date);
  };

  // Get display duration
  const getDisplayDuration = (meeting) => {
    if (meeting.duration && !isNaN(parseInt(meeting.duration))) {
      return `${parseInt(meeting.duration)} min`;
    }
    return "Duration N/A";
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Left Sidebar */}
      <div className="w-64 bg-indigo-800 text-white flex flex-col h-screen border-r border-indigo-900">
        {/* Logo */}
        <div className="p-5 border-b border-indigo-700">
          <div className="flex items-center">
            <i className="fas fa-comments text-2xl mr-3"></i>
            <h1 className="text-2xl font-bold">MeetSum</h1>
          </div>
          <p className="text-indigo-200 text-sm mt-1">AI Meeting Summarizer</p>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <a href="#" className="flex items-center px-6 py-3 bg-indigo-900 text-white">
            <i className="fas fa-home mr-3"></i>
            <span>Dashboard</span>
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-indigo-100 hover:bg-indigo-700">
            <i className="fas fa-calendar-alt mr-3"></i>
            <span>Meetings</span>
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-indigo-100 hover:bg-indigo-700">
            <i className="fas fa-file-alt mr-3"></i>
            <span>Summaries</span>
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-indigo-100 hover:bg-indigo-700">
            <i className="fas fa-chart-bar mr-3"></i>
            <span>Analytics</span>
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-indigo-100 hover:bg-indigo-700">
            <i className="fas fa-cog mr-3"></i>
            <span>Settings</span>
          </a>
        </nav>
        
        {/* User Profile */}
        <div className="p-5 border-t border-indigo-700">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
              <span className="font-bold text-white">JD</span>
            </div>
            <div className="ml-3">
              <p className="font-medium">John Doe</p>
              <p className="text-xs text-indigo-200">john@meetsum.ai</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Welcome to MeetSum</h2>
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-bell"></i>
              </button>
              <button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center"
                onClick={createNewMeeting}
                disabled={isCreating}
              >
                <i className="fas fa-plus mr-2"></i>
                <span>{isCreating ? "Creating..." : "New Meeting"}</span>
              </button>
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* Hero Section */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Transform Your Meetings with AI-Powered Summaries</h1>
                <p className="text-gray-600 mb-6">MeetSum automatically transcribes, summarizes and extracts action items from your meetings, saving you hours of note-taking and follow-up work.</p>
                <div className="flex space-x-4">
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg">
                    Try Now
                  </button>
                  <button className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 py-2 px-6 rounded-lg">
                    Watch Demo
                  </button>
                </div>
              </div>
              <div className="md:w-1/3">
                <img src="/api/placeholder/400/320" alt="Meeting Illustration" className="rounded-lg shadow-lg" />
              </div>
            </div>
          </div>
          
          {/* Recent Meetings Section */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-medium text-gray-800">Recent Meetings</h3>
            <button 
              onClick={() => navigate(`/meeting-page/all`)} 
              className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center font-medium cursor-pointer underline"
              style={{ textDecoration: "underline" }}
            >
              View All
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {isLoading ? (
              // Loading state
              Array(3).fill().map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-12 bg-gray-200 rounded mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))
            ) : recentMeetings.length > 0 ? (
              recentMeetings.map((meeting) => (
                <div key={meeting.id} className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-medium text-gray-800">{meeting.title || "Untitled Meeting"}</h4>
                      <p className="text-sm text-gray-500">
                        {formatDate(meeting.date || meeting.createdAt)} • {getDisplayDuration(meeting)}
                      </p>
                    </div>
                    <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded-full">
                      {meeting.status || "Completed"}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{truncateSummary(meeting.summary)}</p>
                  <div className="flex justify-between">
                    <div className="flex -space-x-2">
                      {/* We could show participants here if that data is available */}
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                        {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                      </div>
                    </div>
                    <a 
                      href={`/summarised-meeting/${meeting.id}`} 
                      className="text-indigo-600 text-sm hover:text-indigo-800"
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
              <div className="col-span-3 text-center py-10">
                <p className="text-gray-500 mb-4">You don't have any meetings yet</p>
                <button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg"
                  onClick={createNewMeeting}
                >
                  Create Your First Meeting
                </button>
              </div>
            )}
          </div>
          
          {/* Features Section */}
          <h3 className="text-xl font-medium text-gray-800 mb-4">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-indigo-500">
              <div className="text-indigo-500 mb-4">
                <i className="fas fa-microphone text-3xl"></i>
              </div>
              <h4 className="text-lg font-medium mb-2">Real-time Transcription</h4>
              <p className="text-gray-600 text-sm">Accurate speech-to-text conversion that works across multiple speakers and accents.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-purple-500">
              <div className="text-purple-500 mb-4">
                <i className="fas fa-brain text-3xl"></i>
              </div>
              <h4 className="text-lg font-medium mb-2">AI Summarization</h4>
              <p className="text-gray-600 text-sm">Smart algorithms that extract key points, decisions, and context from your meetings.</p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-green-500">
              <div className="text-green-500 mb-4">
                <i className="fas fa-tasks text-3xl"></i>
              </div>
              <h4 className="text-lg font-medium mb-2">Action Item Tracking</h4>
              <p className="text-gray-600 text-sm">Automatically extract action items and assign them to team members with due dates.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MeetingSummarizerHomepage;