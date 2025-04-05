import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { format, formatDistance } from 'date-fns';
import { motion } from 'framer-motion';
import ErrorBoundary from '../../components/ErrorBoundary';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

// Mock function for Firebase database operations
const updateTabOrder = (uid, meetingId, tabOrder) => {
  console.log(`Updating tab order for ${uid}/meetings/${meetingId}/ui_preferences/tab_order`, tabOrder);
  // Implementation would use Firebase's set method with merge option
};

// Utility for getting sentiment emoji
const getSentimentEmoji = (score) => {
  if (score >= 0.5) return '😊';
  if (score >= 0) return '😐';
  return '😠';
};

// Meeting Card Component
const MeetingCard = ({ meeting, uid, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [tabOrder, setTabOrder] = useState(['summary', 'topics', 'intents', 'sentiment']);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  // Card dimensions (3:5 aspect ratio)
  const cardRef = useRef(null);

  useEffect(() => {
    // Load saved tab order from Firebase
    // This would normally be a Firebase query
    const savedTabOrder = localStorage.getItem(`tabOrder-${meeting.id}`);
    if (savedTabOrder) {
      setTabOrder(JSON.parse(savedTabOrder));
    }
  }, [meeting.id]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const newOrder = Array.from(tabOrder);
    const [removed] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, removed);

    setTabOrder(newOrder);

    // Persist to Firebase
    updateTabOrder(uid, meeting.id, newOrder);

    // For demo purposes, save to localStorage
    localStorage.setItem(`tabOrder-${meeting.id}`, JSON.stringify(newOrder));
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const truncateSummary = (text, wordCount = 50) => {
    if (!text) return '';
    const words = text.split(' ');
    if (words.length <= wordCount) return text;
    return words.slice(0, wordCount).join(' ') + '...';
  };

  // Format date
  const formattedDate = meeting.date ? format(new Date(meeting.date.seconds * 1000), 'dd/MMM/yyyy HH:mm') : 'Unknown date';
  const relativeTime = meeting.date ? formatDistance(new Date(meeting.date.seconds * 1000), new Date(), { addSuffix: true }) : '';

  // Render loading skeleton if needed
  if (isLoading) {
    return (
      <motion.div
        className="bg-gray-100 rounded-lg p-4 h-64 animate-pulse"
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Skeleton content */}
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
        <div className="h-20 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      className="relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
      style={{
        background: `linear-gradient(135deg, #f5f7fa 0%, #e2e8f0 100%)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        height: '100%',
      }}
      whileHover={{ scale: 1.02 }}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          delay: index * 0.05,
        },
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white bg-opacity-80">
        <div>
          <div className="font-medium text-gray-800">{formattedDate}</div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="bg-indigo-100 text-indigo-800 text-xs py-1 px-2 rounded-full">
            {Math.floor(meeting.duration / 60)}m {meeting.duration % 60}s
          </span>
          <span className="text-xl" title="Meeting sentiment">{getSentimentEmoji(meeting.sentiment?.score || 0)}</span>
        </div>
      </div>

      {/* Body with Tabs */}
      <div className="p-4 bg-white bg-opacity-60">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tabs">
            {(provided) => (
              <div
                className="space-y-4"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {tabOrder.map((tabId, index) => (
                  <Draggable key={tabId} draggableId={tabId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`p-3 rounded-md ${
                          snapshot.isDragging ? 'bg-blue-50 shadow-lg' : 'bg-white bg-opacity-70'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            {tabId === 'summary' && <span className="mr-2">📝</span>}
                            {tabId === 'topics' && <span className="mr-2">🔍</span>}
                            {tabId === 'intents' && <span className="mr-2">🎯</span>}
                            {tabId === 'sentiment' && <span className="mr-2">😌</span>}
                            <h3 className="font-medium text-gray-700 capitalize">{tabId}</h3>
                          </div>
                          <div {...provided.dragHandleProps} className="cursor-move text-gray-400 hover:text-gray-600">
                            ⋮⋮
                          </div>
                        </div>

                        {/* Tab Content */}
                        {tabId === 'summary' && (
                          <div>
                            <p className="text-sm text-gray-600">
                              {expanded ? meeting.summary : truncateSummary(meeting.summary)}
                            </p>
                            {meeting.summary && meeting.summary.split(' ').length > 50 && (
                              <button
                                className="text-xs text-indigo-600 mt-2 hover:text-indigo-800"
                                onClick={() => setExpanded(!expanded)}
                              >
                                {expanded ? 'Show less' : 'Show more'}
                              </button>
                            )}
                          </div>
                        )}

                        {tabId === 'topics' && (
                          <div className="flex flex-wrap">
                            {meeting.topics && Object.entries(meeting.topics).map(([topic, frequency]) => (
                              <span
                                key={topic}
                                className="inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-1 text-xs mr-2 mb-2"
                                style={{
                                  fontSize: `${Math.max(0.7, Math.min(1.3, 0.7 + frequency * 0.1))}rem`,
                                }}
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}

                        {tabId === 'intents' && (
                          <div className="flex flex-wrap">
                            {meeting.intents && meeting.intents.map((intent, i) => (
                              <span
                                key={i}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs mr-2 mb-2 ${
                                  intent === 'Decision' ? 'bg-green-100 text-green-800' :
                                  intent === 'Info' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {intent === 'Decision' && '🔨'}
                                {intent === 'Info' && 'ℹ️'}
                                {intent === 'Request' && '🙋'}
                                <span className="ml-1">{intent}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {tabId === 'sentiment' && (
                          <div className="flex items-center justify-center">
                            <div className="relative w-16 h-16">
                              <svg viewBox="0 0 100 100">
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="45"
                                  fill="none"
                                  stroke="#e5e7eb"
                                  strokeWidth="10"
                                />
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="45"
                                  fill="none"
                                  stroke={meeting.sentiment?.score >= 0 ? "#4ade80" : "#f87171"}
                                  strokeWidth="10"
                                  strokeDasharray={`${Math.abs(meeting.sentiment?.score || 0) * 283} 283`}
                                  strokeDashoffset="0"
                                  transform="rotate(-90 50 50)"
                                />
                                <text
                                  x="50"
                                  y="55"
                                  textAnchor="middle"
                                  fontSize="20"
                                  fontWeight="bold"
                                  fill="#374151"
                                >
                                  {Math.round((meeting.sentiment?.score || 0) * 100)}
                                </text>
                              </svg>
                            </div>
                            <div className="ml-4 text-sm">
                              <div className="font-medium">
                                {meeting.sentiment?.score > 0.5 ? "Positive" : 
                                 meeting.sentiment?.score > 0 ? "Neutral" : "Negative"}
                              </div>
                              <div className="text-gray-500">
                                Magnitude: {Math.round((meeting.sentiment?.magnitude || 0) * 100)/100}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-white bg-opacity-80">
        <div className="flex justify-between items-center">
          <div className="flex space-x-3">
            <button className="text-gray-500 hover:text-gray-700" title="Export PDF">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button className="text-gray-500 hover:text-gray-700" title="Share">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button className="text-gray-500 hover:text-gray-700" title="Archive">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
          </div>
          <div className="text-xs text-gray-500">{relativeTime}</div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white shadow-lg rounded-md p-2 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <ul className="text-sm">
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Edit Meeting</li>
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Reset Tab Order</li>
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Delete</li>
          </ul>
        </div>
      )}
      {contextMenu.visible && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={handleCloseContextMenu}
        />
      )}
    </motion.div>
  );
};

// Loading Component
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64 w-full">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    <p className="mt-4 text-gray-600">Loading meetings...</p>
  </div>
);

// Error Component
const ErrorState = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center h-64 w-full bg-red-50 p-8 rounded-lg border border-red-200">
    <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <h3 className="text-lg font-medium text-gray-900 mb-1">Error loading meetings</h3>
    <p className="text-gray-500 mb-4">{error?.message || 'An unexpected error occurred'}</p>
    <button 
      onClick={onRetry}
      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
    >
      Try Again
    </button>
  </div>
);

// Empty State Component with debugging info
const EmptyState = ({ debug = {} }) => (
  <div className="col-span-full flex flex-col items-center justify-center h-64 bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
    <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <h3 className="text-lg font-medium text-gray-900 mb-1">No meetings found</h3>
    <p className="text-gray-500 mb-4">No meeting data is available in your account</p>
    
    {/* Debug info that can be toggled */}
    {debug?.userId && (
      <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-left overflow-auto w-full max-w-lg">
        <div className="font-semibold mb-1">Debug Info:</div>
        <div>User ID: {debug.userId}</div>
        <div>Query Complete: {debug.queryComplete ? 'Yes' : 'No'}</div>
        <div>Documents Count: {debug.documentsCount}</div>
        {debug.error && <div className="text-red-500 mt-1">Error: {debug.error}</div>}
      </div>
    )}
  </div>
);

// Main Grid Component
const MeetingCardGrid = ({ meetings = [], uid, isLoading = false }) => {
  const [retryCount, setRetryCount] = useState({});

  // Handle retry logic for error boundaries
  const handleRetry = (meetingId) => {
    setRetryCount(prev => ({
      ...prev,
      [meetingId]: (prev[meetingId] || 0) + 1
    }));
  };

  // Responsive column count
  const getColumnCount = () => {
    if (typeof window === 'undefined') return 3; // Default for SSR
    if (window.innerWidth < 640) return 1;  // Mobile
    if (window.innerWidth < 1024) return 2; // Tablet
    return 3; // Desktop
  };

  const [columnCount, setColumnCount] = useState(getColumnCount());

  useEffect(() => {
    const handleResize = () => {
      setColumnCount(getColumnCount());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-gray-100 rounded-lg p-4 h-64 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  // Handle empty state
  if (!meetings || meetings.length === 0) {
    return <EmptyState />;
  }

  // Use virtualized grid for large data sets
  if (meetings.length > 50) {
    return (
      <div className="h-full w-full">
        <AutoSizer>
          {({ height, width }) => {
            const columnWidth = width / columnCount;
            const rowHeight = columnWidth * (5 / 3); // 3:5 aspect ratio

            const rowCount = Math.ceil(meetings.length / columnCount);

            return (
              <Grid
                columnCount={columnCount}
                columnWidth={columnWidth - 16} // Account for gap
                height={height}
                rowCount={rowCount}
                rowHeight={rowHeight + 16} // Account for gap
                width={width}
              >
                {({ columnIndex, rowIndex, style }) => {
                  const index = rowIndex * columnCount + columnIndex;
                  if (index >= meetings.length) return null;

                  const meeting = meetings[index];

                  return (
                    <div style={{
                      ...style,
                      paddingRight: 16,
                      paddingBottom: 16,
                    }}>
                      <ErrorBoundary
                        key={`${meeting.id}-${retryCount[meeting.id] || 0}`}
                        onRetry={() => handleRetry(meeting.id)}
                        fallback={<div className="bg-red-50 p-4 rounded-lg h-full border border-red-200">Error loading meeting card</div>}
                      >
                        <MeetingCard
                          meeting={meeting}
                          uid={uid}
                          index={index}
                        />
                      </ErrorBoundary>
                    </div>
                  );
                }}
              </Grid>
            );
          }}
        </AutoSizer>
      </div>
    );
  }

  // Standard grid for normal data sets
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {meetings.map((meeting, index) => (
        <ErrorBoundary
          key={`${meeting.id}-${retryCount[meeting.id] || 0}`}
          onRetry={() => handleRetry(meeting.id)}
          fallback={<div className="bg-red-50 p-4 rounded-lg h-full border border-red-200">Error loading meeting card</div>}
        >
          <MeetingCard
            meeting={meeting}
            uid={uid}
            index={index}
          />
        </ErrorBoundary>
      ))}
    </div>
  );
};

// Main Meeting Page Component
const MeetingPage = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uid, setUid] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  // Add sample meetings for testing UI when no meetings exist
  const addSampleMeetings = () => {
    const sampleMeetings = [
      {
        id: 'sample-1',
        date: { seconds: Math.floor(Date.now() / 1000) - 86400 }, // yesterday
        duration: 3600, // 1 hour
        summary: 'This is a sample meeting summary to test the UI. This meeting discussed project timelines and upcoming deliverables.',
        topics: { 'Project': 0.8, 'Timeline': 0.6, 'Deliverables': 0.5 },
        intents: ['Decision', 'Info'],
        sentiment: { score: 0.7, magnitude: 0.9 }
      },
      {
        id: 'sample-2',
        date: { seconds: Math.floor(Date.now() / 1000) - 172800 }, // 2 days ago
        duration: 1800, // 30 minutes
        summary: 'Sample sprint planning meeting. Team discussed upcoming tasks and assigned responsibilities.',
        topics: { 'Sprint': 0.9, 'Tasks': 0.7, 'Planning': 0.8 },
        intents: ['Decision', 'Request', 'Info'],
        sentiment: { score: 0.4, magnitude: 0.6 }
      }
    ];
    setMeetings(sampleMeetings);
    setIsLoading(false);
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUid(user.uid);
        fetchMeetings(user.uid);
      } else {
        setIsLoading(false);
        setError(new Error("User not authenticated"));
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchMeetings = async (userId) => {
    setIsLoading(true);
    setError(null);
    
    console.log("Fetching meetings for user:", userId);
    
    try {
      const db = getFirestore();
      
      // Try different collection paths that might contain meetings
      const possibleCollections = [
        "meetings",                       // Direct meetings collection
        `users/${userId}/meetings`,       // Nested under user document
        `meetings/${userId}/userMeetings` // Alternative nesting
      ];
      
      let meetingsData = [];
      let foundData = false;
      let debugData = { 
        userId, 
        queryComplete: false,
        documentsCount: 0
      };
      
      // Try each possible path
      for (const collPath of possibleCollections) {
        console.log(`Trying collection path: ${collPath}`);
        try {
          const collRef = collection(db, collPath);
          
          // Try with and without userId filter
          // First try: no filter for user-specific collections
          let q = collRef;
          
          // Add filter for general collections
          if (!collPath.includes(userId)) {
            // Try different field names for user ID
            const userIdFields = ["userId", "uid", "user_id", "owner"];
            for (const field of userIdFields) {
              console.log(`Trying with field: ${field} = ${userId}`);
              q = query(collRef, where(field, "==", userId));
              
              const snapshot = await getDocs(q);
              console.log(`Query with ${field} returned ${snapshot.size} documents`);
              
              if (!snapshot.empty) {
                foundData = true;
                snapshot.forEach((doc) => {
                  meetingsData.push({
                    id: doc.id,
                    ...doc.data()
                  });
                });
                break;
              }
            }
          } else {
            // Direct collection for this user, no need to filter
            const snapshot = await getDocs(q);
            console.log(`Direct collection query returned ${snapshot.size} documents`);
            
            if (!snapshot.empty) {
              foundData = true;
              snapshot.forEach((doc) => {
                meetingsData.push({
                  id: doc.id,
                  ...doc.data()
                });
              });
            }
          }
          
          if (foundData) break;
        } catch (err) {
          console.warn(`Error trying collection ${collPath}:`, err);
        }
      }
      
      // Update debug info
      debugData.queryComplete = true;
      debugData.documentsCount = meetingsData.length;
      setDebugInfo(debugData);
      
      console.log(`Found ${meetingsData.length} meetings`);
      
      // If we found meetings, use them
      if (meetingsData.length > 0) {
        setMeetings(meetingsData);
      } else {
        console.log("No meetings found in any collection path");
        // Uncomment to add sample meetings for testing UI:
        // addSampleMeetings();
      }
    } catch (err) {
      console.error("Error fetching meetings:", err);
      setError(err);
      setDebugInfo(prev => ({...prev, error: err.message}));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (uid) {
      fetchMeetings(uid);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={handleRetry} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Your Meetings</h1>
        <div className="w-20"></div> {/* Empty div for balanced alignment */}
      </div>
      
      {meetings.length === 0 ? (
        <div>
          <EmptyState debug={debugInfo} />
          
          {/* Debug button to add sample meetings */}
          <div className="text-center mt-4">
            <button 
              onClick={addSampleMeetings}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Load Sample Meetings for Testing
            </button>
          </div>
        </div>
      ) : (
        <MeetingCardGrid 
          meetings={meetings}
          uid={uid}
        />
      )}
    </div>
  );
};

export default MeetingPage;