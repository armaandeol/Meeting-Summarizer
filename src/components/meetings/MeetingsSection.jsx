import React from 'react';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar';
import MeetingsList from './MeetingsList';
import GoogleConnectButton from './GoogleConnectButton';
import CreateMeetingButton from './CreateMeetingButton';

const MeetingsSection = () => {
  // Google integration hooks
  const { 
    isGoogleAuthenticated, 
    googleUser, 
    loginWithGoogle, 
    logoutFromGoogle 
  } = useGoogleAuth();
  
  const { 
    upcomingMeetings, 
    currentMeeting, 
    isLoading: isLoadingMeetings,
    fetchMeetings, 
    joinMeeting 
  } = useGoogleCalendar(isGoogleAuthenticated);

  // Fetch meetings when user is authenticated with Google
  React.useEffect(() => {
    if (isGoogleAuthenticated) {
      fetchMeetings();
    }
  }, [isGoogleAuthenticated, fetchMeetings]);

  const handleMeetingCreated = (meetingData) => {
    // Refresh the meetings list after creating a new meeting
    fetchMeetings();
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-6 border border-blue-500/20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Your Meetings</h2>
        
        {isGoogleAuthenticated && (
          <CreateMeetingButton 
            isGoogleAuthenticated={isGoogleAuthenticated} 
            onMeetingCreated={handleMeetingCreated}
          />
        )}
      </div>
      
      {!isGoogleAuthenticated ? (
        <GoogleConnectButton loginWithGoogle={loginWithGoogle} />
      ) : (
        <MeetingsList 
          upcomingMeetings={upcomingMeetings}
          currentMeeting={currentMeeting}
          joinMeeting={joinMeeting}
          isLoading={isLoadingMeetings}
          logoutFromGoogle={logoutFromGoogle}
        />
      )}
    </div>
  );
};

export default MeetingsSection;