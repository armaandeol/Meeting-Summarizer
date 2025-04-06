import { useState, useCallback, useEffect } from 'react';

export function useGoogleCalendar(isAuthenticated) {
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to check if an event is a Google Meet event
  const isMeetEvent = (event) => {
    return (
      event.conferenceData?.conferenceSolution?.name === 'Google Meet' ||
      (event.hangoutLink && event.hangoutLink.includes('meet.google.com'))
    );
  };

  // Format calendar events to our app's format
  const formatEvents = useCallback((events) => {
    return events
      .filter(event => isMeetEvent(event))
      .map(event => ({
        id: event.id,
        title: event.summary || 'Untitled Meeting',
        description: event.description || '',
        startTime: new Date(event.start.dateTime || event.start.date),
        endTime: new Date(event.end.dateTime || event.end.date),
        meetLink: event.hangoutLink || 
                 (event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri),
        attendees: event.attendees || [],
        isRecurring: !!event.recurringEventId,
        calendarId: event.organizer?.email || 'primary'
      }));
  }, []);

  // Fetch upcoming meetings from Google Calendar
  const fetchMeetings = useCallback(async () => {
    if (!isAuthenticated || !window.gapi?.client?.calendar) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const now = new Date();
      const timeMin = now.toISOString();
      
      // Set timeMax to 7 days from now
      const timeMax = new Date(now);
      timeMax.setDate(timeMax.getDate() + 7);
      
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 10
      });
      
      const events = response.result.items;
      const formattedEvents = formatEvents(events);
      
      setUpcomingMeetings(formattedEvents);
      
      // Check if there's a current meeting
      const currentEvents = formattedEvents.filter(event => {
        const now = new Date();
        return event.startTime <= now && event.endTime >= now;
      });
      
      setCurrentMeeting(currentEvents.length > 0 ? currentEvents[0] : null);
      
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      setError('Failed to fetch meetings from Google Calendar');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, formatEvents]);

  // Auto-refresh meetings every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Initial fetch
    fetchMeetings();
    
    // Set up interval for refreshing
    const intervalId = setInterval(fetchMeetings, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated, fetchMeetings]);

  // Join a meeting
  const joinMeeting = useCallback((meetingId) => {
    const meeting = upcomingMeetings.find(m => m.id === meetingId) || currentMeeting;
    
    if (meeting && meeting.meetLink) {
      // Open the meeting in a new tab
      window.open(meeting.meetLink, '_blank');
      return true;
    }
    
    return false;
  }, [upcomingMeetings, currentMeeting]);

  return {
    upcomingMeetings,
    currentMeeting,
    isLoading,
    error,
    fetchMeetings,
    joinMeeting
  };
}