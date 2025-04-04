import { useState } from 'react'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navbar */}
      <nav className="bg-white shadow-sm fixed w-full z-10">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">MeetingSummarizer</span>
            </div>
            <div className="flex items-center">
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="py-12 mt-16 w-full">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Hello!</span>
              <span className="block text-blue-600">Welcome to Meeting Summarizer</span>
            </h1>
            <p className="mt-3 mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl">
              The smart way to summarize and organize your meeting notes
            </p>
            <div className="mt-5 mx-auto flex flex-col sm:flex-row justify-center md:mt-8">
              <div className="rounded-md shadow">
                <a href="#" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10">
                  Get started
                </a>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <a href="#" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10">
                  Learn more
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">© 2025 Meeting Summarizer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App