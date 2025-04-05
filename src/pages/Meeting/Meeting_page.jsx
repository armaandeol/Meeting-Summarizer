import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const Meeting_page = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeeting = async () => {
      if (!currentUser || !id) {
        setLoading(false);
        return;
      }

      try {
        const meetingRef = doc(db, 'users', currentUser.uid, 'meetings', id);
        const meetingSnap = await getDoc(meetingRef);
        
        if (meetingSnap.exists()) {
          setMeeting({
            id: meetingSnap.id,
            ...meetingSnap.data()
          });
        } else {
          console.log("No such meeting!");
        }
      } catch (error) {
        console.error("Error fetching meeting:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [id, currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Loading meeting data...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg mb-4">Meeting not found</p>
        <button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded"
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
      </div>
    );
  }

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "Date not available";
    
    let date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return "Date not available";
    }
    
    return new Intl.DateTimeFormat('en-US', { 
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        className="mb-6 flex items-center text-indigo-600 hover:text-indigo-800"
        onClick={() => navigate('/')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Back to Home
      </button>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{meeting.title || "Untitled Meeting"}</h1>
            <p className="text-gray-600">{formatDate(meeting.date || meeting.createdAt)}</p>
          </div>
          <span className="bg-green-100 text-green-800 text-sm py-1 px-3 rounded-full">
            {meeting.status || "Completed"}
          </span>
        </div>
        
        {meeting.summary ? (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">gasti</h2>
            <p className="text-gray-700 whitespace-pre-line">{meeting.summary}</p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 rounded text-center">
            <p className="text-gray-500">No summary available for this meeting yet.</p>
          </div>
        )}
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Meeting Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600"><span className="font-medium">Duration:</span> {meeting.duration || "N/A"} minutes</p>
              <p className="text-gray-600"><span className="font-medium">Intent:</span> {meeting.intent || "Not specified"}</p>
            </div>
            <div>
              <p className="text-gray-600"><span className="font-medium">Participants:</span> {meeting.participants?.length || 0}</p>
            </div>
          </div>
        </div>
        
        {meeting.actionItems && meeting.actionItems.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold mb-3">Action Items</h2>
            <ul className="divide-y divide-gray-200">
              {meeting.actionItems.map((item, index) => (
                <li key={index} className="py-3">
                  <div className="flex items-start">
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-800">{item.description}</p>
                      <p className="text-sm text-gray-500">Assigned to: {item.assignee || "Unassigned"}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded text-center">
            <p className="text-gray-500">No action items recorded for this meeting.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Meeting_page;
