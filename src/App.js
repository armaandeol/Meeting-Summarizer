import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MeetingSummarizerHomepage from "./pages/Home/Home";
import Meeting from "./pages/Meeting/Meeting";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MeetingSummarizerHomepage />} />
        <Route path="/meeting/:id" element={<Meeting />} />
      </Routes>
    </Router>
  );
}

export default App;
