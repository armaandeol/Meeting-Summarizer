import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import TranscriptChatbot from '../../components/TranscriptChatbot';

export default function Chat() {
  const [transcriptionData, setTranscriptionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchTranscription = async () => {
      if (!currentUser || !id) {
        setError("Missing user authentication or meeting ID");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch the meeting data from Firestore
        const meetingRef = doc(db, 'users', currentUser.uid, 'meetings', id);
        const meetingDoc = await getDoc(meetingRef);

        if (meetingDoc.exists()) {
          const data = meetingDoc.data();
          setTranscriptionData(data);
        } else {
          setError("Meeting not found");
        }
      } catch (err) {
        console.error("Error fetching transcription:", err);
        setError("Failed to load transcription data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranscription();
  }, [currentUser, id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading transcription data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <svg className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.history.back()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {transcriptionData?.fileName ? transcriptionData.fileName.replace(/\.[^/.]+$/, "") : "Meeting Chat"}
          </h1>
          <p className="text-gray-600 mb-4">
            {transcriptionData?.createdAt ? new Date(transcriptionData.createdAt.seconds * 1000).toLocaleString() : "No date available"}
          </p>
          
          {transcriptionData?.summary && (
            <div className="bg-blue-50 p-4 rounded-md mb-6">
              <h2 className="font-semibold text-blue-800 mb-2">Meeting Summary</h2>
              <p className="text-gray-700">{transcriptionData.summary}</p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 h-[600px]">
          <TranscriptChatbot transcriptionData={transcriptionData} />
        </div>
      </div>
    </div>
  );
}