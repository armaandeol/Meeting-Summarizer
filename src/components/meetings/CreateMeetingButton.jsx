import React, { useState } from 'react';
import { useGoogleMeet } from '../../hooks/useGoogleMeet';

const CreateMeetingButton = ({ isGoogleAuthenticated, onMeetingCreated }) => {
  const [showModal, setShowModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [createdMeetLink, setCreatedMeetLink] = useState(null);
  
  const { 
    createMeetingLink, 
    joinMeeting,
    isCreatingMeeting, 
    error 
  } = useGoogleMeet(isGoogleAuthenticated);

  const handleCreateMeeting = async () => {
    const result = await createMeetingLink(
      meetingTitle || 'Meeting Summarizer Meeting',
      new Date(),
      meetingDuration
    );
    
    if (result && result.meetLink) {
      setCreatedMeetLink(result.meetLink);
      onMeetingCreated?.(result);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCreatedMeetLink(null);
    setMeetingTitle('');
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors"
        disabled={!isGoogleAuthenticated}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        Create Meeting
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-blue-500/30">
            <h3 className="text-xl font-medium text-white mb-4">Create Google Meet</h3>
            
            {createdMeetLink ? (
              <div className="mb-6">
                <div className="bg-green-900/30 border border-green-500/30 rounded-md p-4 mb-4">
                  <p className="text-green-300 font-medium">Meeting created successfully!</p>
                  <p className="text-gray-300 mt-2 break-all">{createdMeetLink}</p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => joinMeeting(createdMeetLink)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Join Meeting
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Meeting Title</label>
                  <input
                    type="text"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Meeting Summarizer Meeting"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Duration (minutes)</label>
                  <select
                    value={meetingDuration}
                    onChange={(e) => setMeetingDuration(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-md text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateMeeting}
                    disabled={isCreatingMeeting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingMeeting ? 'Creating...' : 'Create Meeting'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CreateMeetingButton;