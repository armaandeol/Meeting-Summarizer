import React from 'react';
import SpeakerBadge from '../ui/SpeakerBadge';

const TranscriptViewer = ({ entries }) => (
  <div className="h-96 overflow-y-auto p-4 bg-gray-50 rounded-md border border-gray-200 pretty-scrollbar">
    {entries.length === 0 ? (
        <p className="text-center text-gray-400 italic mt-4">Transcript will appear here...</p>
    ) : (
        entries.map((entry, index) => (
         <div key={`${entry.timestamp}-${index}`} className="mb-3 last:mb-0">
           <div className="flex items-start mb-1">
             <SpeakerBadge speaker={entry.speaker} />
             <div className="flex-1">
               <span className="font-medium text-gray-700 text-sm">
                 Speaker {typeof entry.speaker === 'number' ? entry.speaker : '?'}
               </span>
               <p className="text-gray-800 text-sm leading-relaxed">{entry.text}</p>
             </div>
           </div>
         </div>
        ))
    )}
     <style>{`
      .pretty-scrollbar::-webkit-scrollbar { width: 6px; height: 6px;}
      .pretty-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px;}
      .pretty-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px;}
      .pretty-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }
    `}</style>
  </div>
);

export default TranscriptViewer;
