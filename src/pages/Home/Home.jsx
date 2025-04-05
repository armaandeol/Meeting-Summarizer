import React from 'react';

const MeetingSummarizerHomepage = () => {
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Left Sidebar */}
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
          <a href="#" className="flex items-center px-6 py-3 bg-indigo-900 text-white">
            <i className="fas fa-home mr-3"></i>
            <span>Dashboard</span>
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-indigo-100 hover:bg-indigo-700">
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
            <h2 className="text-lg font-medium">Welcome to MeetSum</h2>
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-bell"></i>
              </button>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg flex items-center">
                <i className="fas fa-plus mr-2"></i>
                <span>New Meeting</span>
              </button>
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* Hero Section */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Transform Your Meetings with AI-Powered Summaries</h1>
                <p className="text-gray-600 mb-6">MeetSum automatically transcribes, summarizes and extracts action items from your meetings, saving you hours of note-taking and follow-up work.</p>
                <div className="flex space-x-4">
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg">
                    Try Now
                  </button>
                  <button className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 py-2 px-6 rounded-lg">
                    Watch Demo
                  </button>
                </div>
              </div>
              <div className="md:w-1/3">
                <img src="/api/placeholder/400/320" alt="Meeting Illustration" className="rounded-lg shadow-lg" />
              </div>
            </div>
          </div>
          
          {/* Recent Meetings Section */}
          <h3 className="text-xl font-medium text-gray-800 mb-4">Recent Meetings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Meeting Card 1 */}
            <div className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium text-gray-800">Weekly Team Sync</h4>
                  <p className="text-sm text-gray-500">Apr 4, 2025 • 45 min</p>
                </div>
                <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded-full">Completed</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">Discussed Q2 goals, project timeline updates, and resource allocation for the marketing campaign.</p>
              <div className="flex justify-between">
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">JD</div>
                  <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs">AM</div>
                  <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs">RK</div>
                </div>
                <a href="#" className="text-indigo-600 text-sm hover:text-indigo-800">View Summary</a>
              </div>
            </div>
            
            {/* Meeting Card 2 */}
            <div className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium text-gray-800">Product Review</h4>
                  <p className="text-sm text-gray-500">Apr 3, 2025 • 60 min</p>
                </div>
                <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded-full">Completed</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">Reviewed new feature designs, discussed user feedback, and finalized release schedule for v2.5.</p>
              <div className="flex justify-between">
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">LM</div>
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">TS</div>
                </div>
                <a href="#" className="text-indigo-600 text-sm hover:text-indigo-800">View Summary</a>
              </div>
            </div>
            
            {/* Meeting Card 3 */}
            <div className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium text-gray-800">Client Presentation</h4>
                  <p className="text-sm text-gray-500">Apr 2, 2025 • 90 min</p>
                </div>
                <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded-full">Completed</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">Presented quarterly results, discussed strategy adjustments, and collected feedback for improvement areas.</p>
              <div className="flex justify-between">
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">KP</div>
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">JD</div>
                  <div className="w-6 h-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs">+2</div>
                </div>
                <a href="#" className="text-indigo-600 text-sm hover:text-indigo-800">View Summary</a>
              </div>
            </div>
          </div>
          
          {/* Features Section */}
          <h3 className="text-xl font-medium text-gray-800 mb-4">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-indigo-500">
              <div className="text-indigo-500 mb-4">
                <i className="fas fa-microphone text-3xl"></i>
              </div>
              <h4 className="text-lg font-medium mb-2">Real-time Transcription</h4>
              <p className="text-gray-600 text-sm">Accurate speech-to-text conversion that works across multiple speakers and accents.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-purple-500">
              <div className="text-purple-500 mb-4">
                <i className="fas fa-brain text-3xl"></i>
              </div>
              <h4 className="text-lg font-medium mb-2">AI Summarization</h4>
              <p className="text-gray-600 text-sm">Smart algorithms that extract key points, decisions, and context from your meetings.</p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-green-500">
              <div className="text-green-500 mb-4">
                <i className="fas fa-tasks text-3xl"></i>
              </div>
              <h4 className="text-lg font-medium mb-2">Action Item Tracking</h4>
              <p className="text-gray-600 text-sm">Automatically extract action items and assign them to team members with due dates.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MeetingSummarizerHomepage;