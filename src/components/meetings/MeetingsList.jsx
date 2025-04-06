import React from 'react';
import { Link } from 'react-router-dom';

const MeetingsList = ({ 
  upcomingMeetings, 
  currentMeeting, 
  joinMeeting, 
  isLoading,
  logoutFromGoogle
}) => {
  return (
    <div>
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {currentMeeting && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-blue-400 mb-3">Current Meeting</h3>
          <div className="bg-blue-600/20 rounded-md p-4 border border-blue-500/30">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-white text-lg">{currentMeeting.title}</h4>
                <p className="text-sm text-slate-300 mt-1">
                  {new Date(currentMeeting.startTime).toLocaleTimeString()} - {new Date(currentMeeting.endTime).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => joinMeeting(currentMeeting.id)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      )}
      
      <h3 className="text-lg font-medium text-blue-400 mb-3">Upcoming Meetings</h3>
      
      {upcomingMeetings?.length === 0 && !isLoading ? (
        <p className="text-slate-400 text-sm">No upcoming meetings found.</p>
      ) : (
        <div className="space-y-3">
          {upcomingMeetings?.filter(meeting => new Date(meeting.startTime) > new Date())
            .map(meeting => (
              <div key={meeting.id} className="bg-slate-800 rounded-md p-4 border border-slate-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-white">{meeting.title}</h4>
                    <p className="text-sm text-slate-300 mt-1">
                      {new Date(meeting.startTime).toLocaleDateString()}, {new Date(meeting.startTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => joinMeeting(meeting.id)}
                    className="bg-slate-700 text-white px-3 py-1 rounded-md text-sm hover:bg-slate-600 transition-colors"
                  >
                    Join
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center">
        <button 
          onClick={logoutFromGoogle}
          className="text-red-400 text-sm hover:text-red-300 transition-colors"
        >
          Disconnect Google Account
        </button>
        
        <Link to="/all-meetings" className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
          View all meetings
        </Link>
      </div>
    </div>
  );
};

export default MeetingsList;