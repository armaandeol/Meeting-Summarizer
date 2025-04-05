import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const SummarisedMeeting = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!currentUser) {
        setError("You must be logged in to view this meeting");
        setIsLoading(false);
        return;
      }

      try {
        const meetingRef = doc(db, 'users', currentUser.uid, 'meetings', meetingId);
        const meetingDoc = await getDoc(meetingRef);

        if (meetingDoc.exists()) {
          setMeeting({
            id: meetingDoc.id,
            ...meetingDoc.data()
          });
        } else {
          setError("Meeting not found");
        }
      } catch (err) {
        console.error("Error fetching meeting data:", err);
        setError("Failed to load meeting data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetingData();
  }, [currentUser, meetingId]);

  // Format date helper function
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading meeting data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/transcription/')} 
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <button 
              onClick={() => navigate('/transcription/')} 
              className="text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Dashboard
            </button>
          </div>
          <div>
            <button 
              onClick={() => navigate(`/meeting/${meetingId}`)} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-4 rounded-lg text-sm"
            >
              Edit Meeting
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Meeting Title and Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {meeting?.title || "Untitled Meeting"}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center">
              <i className="fas fa-calendar-alt mr-2"></i>
              {formatDate(meeting?.date || meeting?.createdAt)}
            </div>
            {meeting?.duration && (
              <div className="flex items-center">
                <i className="fas fa-clock mr-2"></i>
                {meeting.duration} minutes
              </div>
            )}
            <div className="flex items-center">
              <i className="fas fa-tag mr-2"></i>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                meeting?.status === "completed" ? "bg-green-100 text-green-800" : 
                meeting?.status === "scheduled" ? "bg-blue-100 text-blue-800" : 
                "bg-gray-100 text-gray-800"
              }`}>
                {meeting?.status || "status unknown"}
              </span>
            </div>
          </div>

          {meeting?.intent && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-1">Meeting Intent:</h3>
              <p className="text-gray-600">{meeting.intent}</p>
            </div>
          )}
        </div>

        {/* Meeting Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            <i className="fas fa-file-alt mr-2 text-indigo-500"></i>
            Summary
          </h2>
          {meeting?.summary ? (
            <div className="prose max-w-none">
              <p className="text-gray-700">{meeting.summary}</p>
            </div>
          ) : (
            <p className="text-gray-500 italic">No summary available for this meeting.</p>
          )}
        </div>

        {/* Action Items */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            <i className="fas fa-tasks mr-2 text-indigo-500"></i>
            Action Items
          </h2>
          {meeting?.actionItems && meeting.actionItems.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {meeting.actionItems.map((item, index) => (
                <li key={index} className="py-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <input type="checkbox" className="h-5 w-5 text-indigo-600 rounded" />
                    </div>
                    <div className="ml-3 w-full">
                      <p className="text-gray-800 font-medium">{item.description || item}</p>
                      {item.assignee && (
                        <p className="text-sm text-gray-500">Assigned to: {item.assignee}</p>
                      )}
                      {item.dueDate && (
                        <p className="text-sm text-gray-500">Due: {formatDate(item.dueDate)}</p>
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

        {/* Participants */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            <i className="fas fa-users mr-2 text-indigo-500"></i>
            Participants
          </h2>
          {meeting?.participants && meeting.participants.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {meeting.participants.map((participant, index) => (
                <div 
                  key={index} 
                  className="bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-700 flex items-center"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs mr-2">
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
      </main>
    </div>
  );
};

export default SummarisedMeeting;
