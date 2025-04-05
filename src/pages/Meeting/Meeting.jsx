import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const Meeting = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const docRef = doc(db, "meetings", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setMeeting({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError("Meeting not found");
        }
      } catch (err) {
        console.error("Error fetching meeting:", err);
        setError("Failed to load meeting data");
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner-border text-indigo-600" role="status">
            <span className="sr-only">Loading...</span>
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-3 text-gray-600">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => navigate(-1)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Left Sidebar - reuse the same sidebar from Home.jsx */}
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
          <a href="/" className="flex items-center px-6 py-3 text-indigo-100 hover:bg-indigo-700">
            <i className="fas fa-home mr-3"></i>
            <span>Dashboard</span>
          </a>
          <a href="#" className="flex items-center px-6 py-3 bg-indigo-900 text-white">
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
            <div className="flex items-center">
              <button 
                onClick={() => navigate(-1)} 
                className="mr-4 text-gray-600 hover:text-indigo-600"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <h2 className="text-lg font-medium">Meeting Details</h2>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-bell"></i>
              </button>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center">
                <i className="fas fa-edit mr-2"></i>
                <span>Edit Meeting</span>
              </button>
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-800">{meeting.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  meeting.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Date</p>
                  <p className="font-medium">
                    {meeting.date?.toDate ? 
                      new Date(meeting.date.toDate()).toLocaleDateString() : 
                      "Not set"}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Duration</p>
                  <p className="font-medium">{meeting.duration} minutes</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Participants</p>
                  <p className="font-medium">
                    {meeting.participants?.length || 0} participants
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Meeting Intent</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p>{meeting.intent}</p>
              </div>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Summary</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                {meeting.summary ? (
                  <p>{meeting.summary}</p>
                ) : (
                  <p className="text-gray-500 italic">No summary available yet.</p>
                )}
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">Action Items</h2>
              {meeting.actionItems && meeting.actionItems.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {meeting.actionItems.map((item, index) => (
                    <li key={index} className="py-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                          <i className="fas fa-check-circle text-indigo-600"></i>
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">{item.task}</p>
                          <p className="text-sm text-gray-500">Assigned to: {item.assignee}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 italic">No action items created yet.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Meeting;
