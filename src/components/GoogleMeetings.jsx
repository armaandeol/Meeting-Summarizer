import React from 'react';

const GoogleMeetings = ({ 
  isGoogleAuthenticated, 
  loginWithGoogle, 
  upcomingMeetings, 
  currentMeeting, 
  joinMeeting,
  isLoading
}) => {
  if (!isGoogleAuthenticated) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-white border-b border-gray-700 pb-4">Google Calendar Integration</h2>
        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
          <p className="text-slate-300 mb-3">
            Connect your Google account to automatically access your meetings.
          </p>
          <button
            onClick={loginWithGoogle}
            className="flex items-center justify-center bg-white text-slate-800 px-4 py-2 rounded-md hover:bg-slate-100 transition-colors w-full"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Connect with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-white border-b border-gray-700 pb-4">Your Google Meetings</h2>
      
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {currentMeeting && (
        <div className="mb-4">
          <h4 className="text-md font-medium text-blue-400 mb-2">Current Meeting</h4>
          <div className="bg-blue-600/20 rounded-md p-3 border border-blue-500/30">
            <div className="flex justify-between items-start">
              <div>
                <h5 className="font-medium text-white">{currentMeeting.title}</h5>
                <p className="text-sm text-slate-300">
                  {new Date(currentMeeting.startTime).toLocaleTimeString()} - {new Date(currentMeeting.endTime).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => joinMeeting(currentMeeting.id)}
                className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      )}
      
      <h4 className="text-md font-medium text-blue-400 mt-3 mb-2">Upcoming Meetings</h4>
      
      {upcomingMeetings?.length === 0 && !isLoading ? (
        <p className="text-slate-400 text-sm">No upcoming meetings found.</p>
      ) : (
        <div className="space-y-2">
          {upcomingMeetings?.filter(meeting => new Date(meeting.startTime) > new Date())
            .slice(0, 3)
            .map(meeting => (
              <div key={meeting.id} className="bg-slate-800 rounded-md p-3 border border-slate-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-medium text-white">{meeting.title}</h5>
                    <p className="text-sm text-slate-300">
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
      
      {upcomingMeetings?.length > 3 && (
        <button className="text-blue-400 text-sm mt-2 hover:text-blue-300 transition-colors">
          View all meetings
        </button>
      )}
    </div>
  );
};

export default GoogleMeetings;