import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Helmet } from 'react-helmet';

const Meet = () => {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const { currentUser } = useAuth();

  // Fetch all meeting summaries
  useEffect(() => {
    const fetchMeetingSummaries = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      
      try {
        const meetingsRef = collection(db, 'users', currentUser.uid, 'meetings');
        const meetingsQuery = query(
          meetingsRef,
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(meetingsQuery);
        const fetchedSummaries = [];
        
        querySnapshot.forEach((doc) => {
          const meetingData = doc.data();
          if (meetingData.summary) {
            fetchedSummaries.push({
              id: doc.id,
              ...meetingData
            });
          }
        });
        
        setSummaries(fetchedSummaries);
      } catch (error) {
        console.error("Error fetching summaries:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMeetingSummaries();
  }, [currentUser]);

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

  // Filter summaries based on search term
  const filteredSummaries = summaries.filter(summary => 
    summary.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    summary.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort summaries based on selected option
  const sortedSummaries = [...filteredSummaries].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt);
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt);
    } else if (sortBy === 'alphabetical') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });

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
            <a 
              onClick={() => navigate('/')} 
              className="flex items-center px-6 py-4 my-1 rounded-lg text-blue-100 hover:bg-blue-800/50 transition-all duration-300 cursor-pointer"
            >
              <i className="fas fa-home mr-3"></i>
              <span className="font-medium">Home</span>
            </a>
            <a href="#" className="flex items-center px-6 py-4 my-1 rounded-lg text-blue-100 hover:bg-blue-800/50 transition-all duration-300">
              <i className="fas fa-calendar-alt mr-3"></i>
              <span>Meetings</span>
            </a>
            <a 
              href="#" 
              className="flex items-center px-6 py-4 my-1 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md"
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
              <h2 className="text-xl font-medium text-white">Meeting Summaries</h2>
              <div className="flex items-center space-x-5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search summaries..."
                    className="bg-gray-800 text-white border border-blue-700/30 rounded-lg py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                </div>
                <select
                  className="bg-gray-800 text-white border border-blue-700/30 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="recent">Most Recent</option>
                  <option value="oldest">Oldest First</option>
                  <option value="alphabetical">A-Z</option>
                </select>
              </div>
            </div>
          </header>
          
          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-8 bg-gray-900">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                // Loading state
                Array(6).fill().map((_, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg shadow-md p-6 animate-pulse border border-blue-800/20">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2 mb-5"></div>
                    <div className="h-20 bg-gray-700 rounded mb-5"></div>
                    <div className="flex justify-between">
                      <div className="h-6 bg-gray-700 rounded w-1/4"></div>
                      <div className="h-6 bg-gray-700 rounded w-1/4"></div>
                    </div>
                  </div>
                ))
              ) : sortedSummaries.length > 0 ? (
                sortedSummaries.map((summary) => (
                  <div 
                    key={summary.id} 
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg border border-blue-800/20 overflow-hidden hover:shadow-blue-700/10 hover:scale-[1.01] transition-all duration-300"
                    onClick={() => navigate(`/summarised-meeting/${summary.id}`)}
                  >
                    <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-medium text-white text-lg">{summary.title || "Untitled Meeting"}</h3>
                          <p className="text-sm text-gray-400">
                            {formatDate(summary.date || summary.createdAt)} • {getDisplayDuration(summary)}
                          </p>
                        </div>
                        <span className="bg-blue-900/60 text-blue-300 text-xs py-1 px-3 rounded-full border border-blue-700/50">
                          Summary
                        </span>
                      </div>
                      
                      <div className="mt-4 bg-gray-800/50 p-4 rounded-lg border border-blue-900/10 mb-4">
                        <p className="text-gray-300 text-sm line-clamp-3">
                          {summary.summary || "No summary available for this meeting."}
                        </p>
                      </div>
                      
                      {summary.actionItems && summary.actionItems.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-gray-400 mb-2">Action Items:</p>
                          <div className="flex flex-wrap gap-2">
                            {summary.actionItems.slice(0, 2).map((item, idx) => (
                              <span key={idx} className="bg-indigo-900/30 text-indigo-300 text-xs py-1 px-2 rounded border border-indigo-700/30">
                                {item.text?.substring(0, 20)}...
                              </span>
                            ))}
                            {summary.actionItems.length > 2 && (
                              <span className="bg-gray-800 text-gray-400 text-xs py-1 px-2 rounded">
                                +{summary.actionItems.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-5 flex justify-between items-center">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm shadow-md">
                            {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                          </div>
                        </div>
                        <button 
                          className="text-blue-400 text-sm font-medium flex items-center hover:text-blue-300 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent the card's onClick from firing
                            navigate(`/summaries/${summary.id}`, { state: { meetingData: summary } });
                          }}
                        >
                          View Details
                          <i className="fas fa-chevron-right ml-1 text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-blue-800/20">
                  <div className="text-blue-400 text-5xl mb-4">
                    <i className="fas fa-file-alt"></i>
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">No Meeting Summaries Found</h3>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">
                    {searchTerm 
                      ? "No summaries match your search criteria. Try different keywords or clear your search."
                      : "You don't have any meeting summaries yet. Create a meeting and generate a summary to get started."}
                  </p>
                  <button 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 px-6 rounded-lg shadow-md transition-all duration-300"
                    onClick={() => navigate('/')}
                  >
                    Go to Home
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default Meet;
