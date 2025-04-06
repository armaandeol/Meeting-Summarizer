import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { Helmet } from 'react-helmet';

const SummarisedMeeting = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const passedMeetingData = location.state?.meetingData;
  const { currentUser } = useAuth();
  const [meeting, setMeeting] = useState(passedMeetingData || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [quickNotes, setQuickNotes] = useState([]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [taskProgress, setTaskProgress] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!currentUser) {
        if (passedMeetingData) {
          setMeeting(passedMeetingData);
          setIsLoading(false);
          return;
        }
        setError("You must be logged in to view this meeting");
        setIsLoading(false);
        return;
      }

      try {
        const meetingRef = doc(db, 'users', currentUser.uid, 'meetings', meetingId);
        const meetingDoc = await getDoc(meetingRef);

        if (meetingDoc.exists()) {
          const meetingData = {
            id: meetingDoc.id,
            ...meetingDoc.data()
          };
          setMeeting(meetingData);
          setNewTitle(meetingData.title || "Untitled Meeting");
          
          setQuickNotes(meetingData.quickNotes || []);
          
          if (meetingData.status === "completed" && location.state?.justCompleted) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
          }
          
          if (meetingData.actionItems && meetingData.actionItems.length > 0) {
            const completedItems = meetingData.actionItems.filter(item => item.completed).length;
            setTaskProgress(Math.round((completedItems / meetingData.actionItems.length) * 100));
          }
        } else {
          if (passedMeetingData) {
            setMeeting(passedMeetingData);
            setNewTitle(passedMeetingData.title || "Untitled Meeting");
          } else {
            setError("Meeting not found");
          }
        }
      } catch (err) {
        console.error("Error fetching meeting data:", err);
        if (passedMeetingData) {
          setMeeting(passedMeetingData);
          setNewTitle(passedMeetingData.title || "Untitled Meeting");
        } else {
          setError("Failed to load meeting data");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetingData();
  }, [currentUser, meetingId, passedMeetingData, location.state]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "Date not available";
    
    let date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      try {
        date = new Date(timestamp);
      } catch (error) {
        return "Date not available";
      }
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return "Date not available";
    }
    
    if (!(date instanceof Date) || isNaN(date)) {
      return "Date not available";
    }
    
    return new Intl.DateTimeFormat('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleSaveQuickNote = async () => {
    if (!quickNote.trim()) return;
    
    try {
      const newNote = {
        text: quickNote,
        createdAt: new Date(),
        id: Date.now().toString()
      };
      
      const updatedNotes = [...quickNotes, newNote];
      setQuickNotes(updatedNotes);
      setQuickNote('');
      
      if (currentUser) {
        const meetingRef = doc(db, 'users', currentUser.uid, 'meetings', meetingId);
        await updateDoc(meetingRef, {
          quickNotes: updatedNotes
        });
      }
    } catch (err) {
      console.error("Error saving quick note:", err);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      const updatedNotes = quickNotes.filter(note => note.id !== noteId);
      setQuickNotes(updatedNotes);
      
      if (currentUser) {
        const meetingRef = doc(db, 'users', currentUser.uid, 'meetings', meetingId);
        await updateDoc(meetingRef, {
          quickNotes: updatedNotes
        });
      }
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  const scheduleFollowUp = async () => {
    if (!followUpDate) return;
    
    try {
      const followUpMeeting = {
        title: `Follow-up: ${meeting.title}`,
        date: new Date(followUpDate),
        status: "scheduled",
        intent: `Follow-up to previous meeting: ${meeting.title}`,
        participants: meeting.participants || [],
        createdAt: new Date(),
        parentMeetingId: meetingId
      };
      
      if (currentUser) {
        const meetingsCollectionRef = collection(db, 'users', currentUser.uid, 'meetings');
        const newMeetingRef = await addDoc(meetingsCollectionRef, followUpMeeting);
        
        alert(`Follow-up meeting scheduled for ${new Date(followUpDate).toLocaleString()}`);
        setFollowUpDate('');
        setShowScheduler(false);
      }
    } catch (err) {
      console.error("Error scheduling follow-up:", err);
    }
  };

  const toggleTaskCompletion = async (index) => {
    try {
      const updatedActionItems = [...meeting.actionItems];
      updatedActionItems[index] = {
        ...updatedActionItems[index],
        completed: !updatedActionItems[index].completed
      };
      
      setMeeting({
        ...meeting,
        actionItems: updatedActionItems
      });
      
      const completedItems = updatedActionItems.filter(item => item.completed).length;
      setTaskProgress(Math.round((completedItems / updatedActionItems.length) * 100));
      
      if (currentUser) {
        const meetingRef = doc(db, 'users', currentUser.uid, 'meetings', meetingId);
        await updateDoc(meetingRef, {
          actionItems: updatedActionItems
        });
      }
    } catch (err) {
      console.error("Error toggling task completion:", err);
    }
  };

  const handleTitleEdit = () => {
    setEditingTitle(true);
  };

  const handleTitleSave = async () => {
    if (!newTitle.trim()) {
      setNewTitle(meeting.title || "Untitled Meeting");
      setEditingTitle(false);
      return;
    }

    try {
      if (currentUser) {
        const meetingRef = doc(db, 'users', currentUser.uid, 'meetings', meetingId);
        await updateDoc(meetingRef, {
          title: newTitle
        });
        
        setMeeting({
          ...meeting,
          title: newTitle
        });
      }
      setEditingTitle(false);
    } catch (err) {
      console.error("Error updating meeting title:", err);
    }
  };

  const getMeetingMood = () => {
    if (!meeting?.summary) return "neutral";
    
    const summary = meeting.summary.toLowerCase();
    const positiveWords = ["success", "productive", "achieve", "accomplish", "great", "excellent"];
    const negativeWords = ["issue", "problem", "concern", "difficult", "challenge", "delay"];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (summary.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (summary.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  };

  const getMoodDisplay = () => {
    const mood = getMeetingMood();
    
    if (mood === "positive") {
      return { icon: "fa-smile", color: "text-green-500", text: "Positive" };
    } else if (mood === "negative") {
      return { icon: "fa-meh", color: "text-yellow-500", text: "Challenging" };
    } else {
      return { icon: "fa-comment", color: "text-blue-500", text: "Neutral" };
    }
  };
  
  const renderConfetti = () => {
    return (
      <div className="fixed inset-0 pointer-events-none z-50">
        {Array.from({ length: 100 }).map((_, i) => {
          const size = Math.random() * 10 + 5;
          const left = Math.random() * 100;
          const animationDuration = Math.random() * 3 + 2;
          const delay = Math.random() * 3;
          const color = ['#ff6b6b', '#48dbfb', '#feca57', '#1dd1a1', '#ff9ff3'][Math.floor(Math.random() * 5)];
          
          return (
            <div 
              key={i}
              className="absolute top-0"
              style={{
                left: `${left}%`,
                width: size + 'px',
                height: size + 'px',
                backgroundColor: color,
                borderRadius: '50%',
                animation: `fall ${animationDuration}s ease-in ${delay}s forwards`
              }}
            ></div>
          );
        })}
        <style jsx>{`
          @keyframes fall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
          }
        `}</style>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-blue-300">Loading meeting data...</p>
        </div>
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 bg-[url('/textures/dark-pattern.png')] bg-repeat">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-lg shadow-2xl max-w-md w-full text-center border border-blue-700/30">
          <div className="text-red-400 text-5xl mb-4">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/summaries')} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-lg"
          >
            Return to Summaries
          </button>
        </div>
      </div>
    );
  }

  const moodDisplay = getMoodDisplay();

  return (
    <>
      <Helmet>
        <link 
          href="https://fonts.googleapis.com/css2?family=Lisu+Bosa:wght@400;500;600;700&display=swap" 
          rel="stylesheet"
        />
      </Helmet>
      <div className="min-h-screen bg-gray-900 font-sans bg-[url('/textures/dark-pattern.png')] bg-repeat" style={{ fontFamily: "'Lisu Bosa', serif" }}>
        {showConfetti && renderConfetti()}
        
        <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-md border-b border-blue-800/30">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div>
              <button 
                onClick={() => navigate('/summaries')} 
                className="text-blue-400 hover:text-blue-300 flex items-center transition-colors duration-300"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Summaries
              </button>
            </div>
            <div>
              <button 
                onClick={() => navigate(`/meeting/${meetingId}`)} 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 px-5 rounded-lg shadow-lg transition-all duration-300 text-sm"
              >
                <i className="fas fa-edit mr-1"></i> Edit Meeting
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-6 mb-6 border border-blue-800/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
              {editingTitle ? (
                <div className="flex w-full max-w-md">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-l-md p-2 w-full text-white focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && handleTitleSave()}
                  />
                  <button
                    onClick={handleTitleSave}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3 rounded-r-md"
                  >
                    <i className="fas fa-save"></i>
                  </button>
                </div>
              ) : (
                <h1 
                  className="text-2xl font-bold text-white cursor-pointer group flex items-center"
                  onClick={handleTitleEdit}
                >
                  {meeting?.title || "Untitled Meeting"}
                  <i className="fas fa-edit ml-2 opacity-0 group-hover:opacity-100 text-blue-400 text-sm transition-opacity duration-300"></i>
                </h1>
              )}
              <div className={`flex items-center ${moodDisplay.color} bg-opacity-20 rounded-full px-4 py-1.5 border border-${moodDisplay.color.replace('text-', '')}/30`}>
                <i className={`fas ${moodDisplay.icon} mr-2`}></i>
                <span className="text-sm font-medium">{moodDisplay.text} Meeting</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
              <div className="flex items-center">
                <i className="fas fa-calendar-alt mr-2 text-blue-400"></i>
                {formatDate(meeting?.date || meeting?.createdAt)}
              </div>
              {meeting?.duration && (
                <div className="flex items-center">
                  <i className="fas fa-clock mr-2 text-purple-400"></i>
                  {meeting.duration} minutes
                </div>
              )}
              <div className="flex items-center">
                <i className="fas fa-tag mr-2 text-indigo-400"></i>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  meeting?.status === "completed" ? "bg-green-900/60 text-green-300 border border-green-700/50" : 
                  meeting?.status === "scheduled" ? "bg-blue-900/60 text-blue-300 border border-blue-700/50" : 
                  "bg-gray-800 text-gray-300 border border-gray-700/50"
                }`}>
                  {meeting?.status || "status unknown"}
                </span>
              </div>
            </div>

            {meeting?.intent && (
              <div className="mb-2 p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
                <h3 className="font-medium text-blue-300 mb-1">Meeting Intent:</h3>
                <p className="text-gray-300">{meeting.intent}</p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-lg p-4 mb-6 flex flex-wrap gap-3 justify-center border border-blue-800/30 shadow-lg">
            <button
              onClick={() => setShowScheduler(!showScheduler)}
              className="bg-gray-800 text-blue-300 hover:bg-gray-700 py-2.5 px-5 rounded-md flex items-center text-sm shadow-md transition-all duration-300 border border-blue-700/30"
            >
              <i className="fas fa-calendar-plus mr-2"></i>
              Schedule Follow-up
            </button>
            
            <button
              onClick={() => navigate(`/meeting/share/${meetingId}`)}
              className="bg-gray-800 text-blue-300 hover:bg-gray-700 py-2.5 px-5 rounded-md flex items-center text-sm shadow-md transition-all duration-300 border border-blue-700/30"
            >
              <i className="fas fa-share-alt mr-2"></i>
              Share Summary
            </button>
            
            <button
              onClick={() => window.print()}
              className="bg-gray-800 text-blue-300 hover:bg-gray-700 py-2.5 px-5 rounded-md flex items-center text-sm shadow-md transition-all duration-300 border border-blue-700/30"
            >
              <i className="fas fa-print mr-2"></i>
              Print Summary
            </button>
          </div>
          
          {showScheduler && (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-6 mb-6 border-l-4 border-indigo-500 border-t border-r border-b border-blue-800/30">
              <h2 className="text-lg font-semibold text-white mb-3">
                <i className="fas fa-calendar-plus mr-2 text-indigo-400"></i>
                Schedule a Follow-up Meeting
              </h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-md p-2 flex-grow text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <button
                  onClick={scheduleFollowUp}
                  disabled={!followUpDate}
                  className={`px-5 py-2.5 rounded-md text-white shadow-md ${followUpDate ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300' : 'bg-gray-600 cursor-not-allowed'}`}
                >
                  Schedule Follow-up
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-6 border border-blue-800/20">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <i className="fas fa-file-alt mr-2 text-blue-400"></i>
                  Summary
                </h2>
                {meeting?.summary ? (
                  <div className="prose max-w-none">
                    <p className="text-gray-300 leading-relaxed">{meeting.summary}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No summary available for this meeting.</p>
                )}
              </div>
              
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-6 border border-blue-800/20">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <i className="fas fa-tasks mr-2 text-purple-400"></i>
                  Action Items
                </h2>
                {meeting?.actionItems && meeting.actionItems.length > 0 ? (
                  <ul className="divide-y divide-gray-700">
                    {meeting.actionItems.map((item, index) => (
                      <li key={index} className="py-3.5 group hover:bg-blue-900/20 px-3 -mx-3 rounded-md transition-colors duration-300">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <input 
                              type="checkbox" 
                              className="h-5 w-5 rounded cursor-pointer bg-gray-700 border-gray-500 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-gray-900"
                              checked={item.completed || false}
                              onChange={() => toggleTaskCompletion(index)}
                            />
                          </div>
                          <div className="ml-3 w-full">
                            <p className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                              {item.description || item}
                            </p>
                            {item.assignee && (
                              <p className="text-sm text-gray-400 mt-1">
                                <i className="fas fa-user-circle mr-1.5"></i>
                                {item.assignee}
                              </p>
                            )}
                            {item.dueDate && (
                              <p className="text-sm text-gray-400 mt-1">
                                <i className="fas fa-calendar mr-1.5"></i>
                                {formatDate(item.dueDate)}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No action items for this meeting.</p>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              {meeting?.actionItems && meeting.actionItems.length > 0 && (
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-6 border border-blue-800/20">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-medium text-white flex items-center">
                      <i className="fas fa-chart-pie mr-2 text-green-400"></i>
                      Task Progress
                    </h2>
                    <span className="text-blue-300 font-medium bg-blue-900/40 py-1 px-3 rounded-full text-sm border border-blue-700/30">
                      {taskProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3 mt-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${taskProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-6 border border-blue-800/20">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <i className="fas fa-sticky-note mr-2 text-yellow-400"></i>
                  Quick Notes
                </h2>
                
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a quick note..."
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      className="bg-gray-700 border border-gray-600 rounded-md p-2.5 flex-grow text-gray-200 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveQuickNote()}
                    />
                    <button
                      onClick={handleSaveQuickNote}
                      disabled={!quickNote.trim()}
                      className={`px-4 py-2.5 rounded-md text-white shadow-md ${quickNote.trim() ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300' : 'bg-gray-600 cursor-not-allowed'}`}
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>
                
                {quickNotes.length > 0 ? (
                  <div className="space-y-3">
                    {quickNotes.map((note) => (
                      <div key={note.id} className="bg-yellow-900/20 p-3 rounded-md border-l-4 border-yellow-500/50 group hover:bg-yellow-900/30 transition-colors duration-300">
                        <div className="flex justify-between">
                          <p className="text-gray-200">{note.text}</p>
                          <button 
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors duration-300 opacity-0 group-hover:opacity-100"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                        {note.createdAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            <i className="fas fa-clock mr-1"></i>
                            {formatDate(note.createdAt)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No notes added yet.</p>
                )}
              </div>
              
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-lg p-6 border border-blue-800/20">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <i className="fas fa-users mr-2 text-indigo-400"></i>
                  Participants
                </h2>
                {meeting?.participants && meeting.participants.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {meeting.participants.map((participant, index) => (
                      <div 
                        key={index} 
                        className="bg-gray-700 rounded-full px-3 py-1.5 text-sm text-gray-200 flex items-center border border-blue-700/30 hover:bg-gray-600 transition-colors duration-300"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs mr-2 shadow-md">
                          {(participant.name || participant).charAt(0).toUpperCase()}
                        </div>
                        <span>{participant.name || participant}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No participants recorded for this meeting.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default SummarisedMeeting;