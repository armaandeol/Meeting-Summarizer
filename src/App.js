import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MeetingSummarizerHomepage from "./pages/Home/Home";
import Meeting from "./pages/Meeting/Meeting";
import SummarisedMeeting from "./pages/SummarisedMeeting/SummarisedMeeting";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MeetingSummarizerHomepage />} />
        <Route path="/meeting/:id" element={<Meeting />} />
        <Route
          path="/summarised-meeting/:meetingId"
          element={<SummarisedMeeting />}
        />
      </Routes>
    </Router>
  );
}

export default App;
