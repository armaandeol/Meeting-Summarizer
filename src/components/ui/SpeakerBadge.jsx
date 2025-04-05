import React from 'react';

const SpeakerBadge = ({ speaker }) => (
  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 shadow-sm ${
    (typeof speaker === 'number' ? speaker : 0) % 3 === 0 ? 'bg-purple-100 text-purple-800' :
    (typeof speaker === 'number' ? speaker : 0) % 3 === 1 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }`}>
    <span className="font-medium text-sm">{typeof speaker === 'number' ? speaker : '?'}</span>
  </div>
);

export default SpeakerBadge;
