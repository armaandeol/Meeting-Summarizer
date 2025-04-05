import React from 'react';
import { ArrowRight, Sparkles, Clock, CheckCircle, PlayCircle } from 'lucide-react';

const MeetBuddyPromo = () => {
  return (
    <div className="md:w-2/3 mb-8 md:mb-0 md:pr-8 relative overflow-hidden">
      {/* Fun animated background elements */}
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-500 opacity-20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute -left-8 bottom-4 w-16 h-16 bg-purple-500 opacity-20 rounded-full blur-lg animate-pulse"></div>
      
      {/* Fun heading with emoji and animated text */}
      <div className="relative mb-6">
        <h1 className="text-3xl font-bold text-white mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300">
          <span className="inline-block transform hover:scale-105 transition-transform duration-300">T</span>
          <span className="inline-block transform hover:scale-105 transition-transform duration-300">r</span>
          <span className="inline-block transform hover:scale-105 transition-transform duration-300">a</span>
          <span className="inline-block transform hover:scale-105 transition-transform duration-300">n</span>
          <span className="inline-block transform hover:scale-105 transition-transform duration-300">s</span>
          <span className="inline-block transform hover:scale-105 transition-transform duration-300">f</span>
          <span className="inline-block transform hover:scale-105 transition-transform duration-300">o</span>
          <span className="inline-block transform hover:scale-105 transition-transform duration-300">r</span>
          <span className="inline-block transform hover:scale-105 transition-transform duration-300">m</span>
          <span className="inline-block"> </span>
          <span className="inline-block transform hover:rotate-6 transition-transform duration-300">Y</span>
          <span className="inline-block transform hover:rotate-6 transition-transform duration-300">o</span>
          <span className="inline-block transform hover:rotate-6 transition-transform duration-300">u</span>
          <span className="inline-block transform hover:rotate-6 transition-transform duration-300">r</span>
          <span className="inline-block"> </span>
          <span className="inline-block">Meetings!</span>
        </h1>
        <Sparkles className="absolute -right-2 top-0 text-yellow-300 w-6 h-6" />
      </div>
      
      {/* Tagline with fun icons */}
      <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-4 rounded-lg mb-8 shadow-inner border border-blue-800/50">
        <p className="text-gray-200 text-lg flex items-start space-x-2">
          <span className="flex-1">MeetBuddy magically transforms your boring meetings into:</span>
        </p>
        <ul className="mt-3 space-y-2">
          <li className="flex items-center text-blue-200">
            <CheckCircle className="mr-2 text-green-400 w-5 h-5" />
            <span>Perfect transcripts <span className="text-yellow-300 font-medium">without typing a word</span></span>
          </li>
          <li className="flex items-center text-blue-200">
            <CheckCircle className="mr-2 text-green-400 w-5 h-5" />
            <span>Smart summaries that <span className="text-pink-300 font-medium">capture what matters</span></span>
          </li>
          <li className="flex items-center text-blue-200">
            <CheckCircle className="mr-2 text-green-400 w-5 h-5" />
            <span>Action items that <span className="text-purple-300 font-medium">actually get done</span></span>
          </li>
        </ul>
      </div>
      
      {/* Fun call to action buttons */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <button className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 px-8 rounded-lg shadow-lg transition-all duration-300 font-medium flex items-center justify-center">
          Try Now For Free
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
        </button>
        <button className="group border border-blue-500 text-blue-300 hover:bg-blue-900/30 py-3 px-8 rounded-lg transition-all duration-300 font-medium flex items-center justify-center">
          <PlayCircle className="mr-2 w-5 h-5" />
          Watch 2-Min Demo
        </button>
      </div>
      
      {/* Fun time-saving indicator */}
      <div className="mt-6 flex items-center text-blue-200 text-sm">
        <Clock className="w-4 h-4 mr-2 text-yellow-300" />
        <span>Saves an average of <span className="text-green-300 font-bold">4.5 hours</span> per week!</span>
      </div>
    </div>
  );
};

export default MeetBuddyPromo;
