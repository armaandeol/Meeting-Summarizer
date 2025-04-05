import React from 'react';

const SegmentedAnalysis = ({ 
  segments, 
  isProcessing,
  proxyServerConnected,
  firebaseConnected
}) => {
  // Show notice if services are disconnected
  const showConnectionWarning = !proxyServerConnected;
  
  if (segments.length === 0 && !isProcessing) {
    return (
      <div className="mb-6">
        <h3 className="font-semibold mb-3 text-base text-gray-700 border-b pb-1">
          Time-Segmented Analysis
        </h3>
        
        {showConnectionWarning ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
            <p className="text-sm text-yellow-700">
              <span className="font-medium">⚠️ Connection issue detected.</span> Segment analysis may not work properly.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Segment analysis will appear here after recording for 10+ seconds. Each segment represents 15 seconds of the meeting.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-3 text-base text-gray-700 border-b pb-1">
        Time-Segmented Analysis
      </h3>
      
      {showConnectionWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
          <p className="text-sm text-yellow-700">
            <span className="font-medium">⚠️ Connection issue detected.</span> Some segments may not be fully analyzed.
          </p>
        </div>
      )}
      
      <div className="flex space-x-3 overflow-x-auto pb-4">
        {isProcessing && (
          <div className="min-w-[200px] h-32 bg-gray-100 rounded-lg border border-gray-200 p-3 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center space-y-2">
              <div className="rounded-full bg-gray-300 h-10 w-10"></div>
              <div className="h-2 bg-gray-300 rounded w-24"></div>
              <div className="h-2 bg-gray-300 rounded w-16"></div>
            </div>
          </div>
        )}

        {segments.map((segment) => (
          <div 
            key={segment.id} 
            className={`min-w-[200px] max-w-[250px] shrink-0 bg-white rounded-lg border ${segment.error ? 'border-red-200' : 'border-gray-200'} p-3 shadow-sm`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-500">
                Segment {segment.segmentNumber}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(segment.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            {segment.error ? (
              <div className="text-xs text-red-500 mb-2">
                Error: {segment.error || "Analysis failed"}
              </div>
            ) : (
              <>
                {/* Sentiment */}
                <div className="mb-2">
                  <div className="flex items-center">
                    <span className="text-xs font-medium mr-1">Sentiment:</span>
                    <div 
                      className={`h-2 w-12 rounded-full ${
                        segment.sentiment === 'positive' ? 'bg-green-500' :
                        segment.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-300'
                      }`}
                    ></div>
                    <span className="text-xs ml-1 capitalize">{segment.sentiment || 'neutral'}</span>
                  </div>
                </div>
                
                {/* Topics */}
                {segment.topics && segment.topics.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium block mb-1">Topics:</span>
                    <div className="flex flex-wrap gap-1">
                      {segment.topics.slice(0, 3).map((topic, idx) => (
                        <span 
                          key={idx} 
                          className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs"
                        >
                          {topic.topic}
                        </span>
                      ))}
                      {segment.topics.length > 3 && (
                        <span className="text-xs text-gray-500">+{segment.topics.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Intents */}
                {segment.intents && segment.intents.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium block mb-1">Intents:</span>
                    <div className="flex flex-wrap gap-1">
                      {segment.intents.slice(0, 2).map((intent, idx) => (
                        <span 
                          key={idx} 
                          className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs"
                        >
                          {intent.intent}
                        </span>
                      ))}
                      {segment.intents.length > 2 && (
                        <span className="text-xs text-gray-500">+{segment.intents.length - 2} more</span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Transcript snippet */}
            {segment.transcript && (
              <div>
                <span className="text-xs text-gray-600 line-clamp-2">
                  {segment.transcript.length > 60 
                    ? segment.transcript.substring(0, 60) + '...' 
                    : segment.transcript}
                </span>
              </div>
            )}
            
            {/* Link to audio */}
            <div className="mt-2 pt-1 border-t border-gray-100">
              <a 
                href={segment.audioUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Listen to segment
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SegmentedAnalysis;
