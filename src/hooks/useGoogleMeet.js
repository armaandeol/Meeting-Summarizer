import { useState, useCallback } from "react";

export function useGoogleMeet(isGoogleAuthenticated) {
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [meetLink, setMeetLink] = useState(null);
  const [error, setError] = useState(null);

  // Create a new Google Meet meeting
  const createMeetingLink = useCallback(
    async (
      title = "Meeting Summarizer Meeting",
      startTime = new Date(),
      duration = 60
    ) => {
      if (!isGoogleAuthenticated) {
        console.error("Google authentication required");
        setError("Google authentication required");
        return null;
      }

      if (!window.gapi?.client?.calendar) {
        console.error("Google Calendar API not available");
        setError("Google Calendar API not available");
        return null;
      }

      setIsCreatingMeeting(true);
      setError(null);

      try {
        console.log("Creating Google Meet meeting:", {
          title,
          startTime,
          duration,
        });

        // Calculate end time (startTime + duration in minutes)
        const endTime = new Date(startTime.getTime() + duration * 60000);

        // Create a calendar event with Google Meet conferencing
        const event = {
          summary: title,
          description: "Meeting created via Meeting Summarizer app",
          start: {
            dateTime: startTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          conferenceData: {
            createRequest: {
              requestId: `meeting-summarizer-${Date.now()}`,
            },
          },
        };

        console.log("Sending calendar event request:", event);

        const response = await window.gapi.client.calendar.events.insert({
          calendarId: "primary",
          resource: event,
          conferenceDataVersion: 1,
        });

        console.log("Calendar event created:", response);

        const createdEvent = response.result;
        const meetLink =
          createdEvent.hangoutLink ||
          createdEvent.conferenceData?.entryPoints?.find(
            (e) => e.entryPointType === "video"
          )?.uri;

        console.log("Meet link created:", meetLink);

        setMeetLink(meetLink);
        return { meetLink, eventId: createdEvent.id };
      } catch (error) {
        console.error("Error creating Google Meet link:", error);
        setError(
          error.result?.error?.message ||
            error.message ||
            "Failed to create meeting"
        );
        return null;
      } finally {
        setIsCreatingMeeting(false);
      }
    },
    [isGoogleAuthenticated]
  );

  // Join an existing Google Meet meeting
  const joinMeeting = useCallback((meetLink) => {
    if (!meetLink) {
      setError("Meeting link is required");
      return;
    }

    // Open the meeting link in a new tab
    window.open(meetLink, "_blank");
  }, []);

  return {
    createMeetingLink,
    joinMeeting,
    isCreatingMeeting,
    meetLink,
    error,
  };
}
