import React from 'react';

const DeepgramAnalysis = ({ analysisData, isLoading }) => (
  <div className="mb-6">
    <h3 className="font-semibold mb-3 text-base text-gray-700 border-b pb-1">Deepgram Analysis</h3>
    
    {isLoading ? (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    ) : analysisData ? (
      <div className="space-y-4">
        {/* Summary Section */}
        {analysisData.summary && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-700 mb-1">AI-Generated Summary</h4>
            <p className="text-sm text-gray-700">{analysisData.summary}</p>
          </div>
        )}
        
        {/* Topics Section */}
        {analysisData.topics && analysisData.topics.length > 0 && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <h4 className="text-sm font-medium text-green-700 mb-2">Detected Topics</h4>
            <div className="flex flex-wrap gap-2">
              {analysisData.topics.map((topic, index) => (
                <span key={index} className="px-2 py-1 bg-white border border-green-200 rounded-full text-xs font-medium">
                  {topic.topic}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Intents Section */}
        {analysisData.intents && analysisData.intents.length > 0 && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <h4 className="text-sm font-medium text-purple-700 mb-2">Detected Intents</h4>
            <div className="flex flex-wrap gap-2">
              {analysisData.intents.map((intent, index) => (
                <span key={index} className="px-2 py-1 bg-white border border-purple-200 rounded-full text-xs font-medium">
                  {intent.intent} ({Math.round(intent.confidence_score * 100)}%)
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Entities Section */}
        {analysisData.entities && analysisData.entities.length > 0 && (
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <h4 className="text-sm font-medium text-indigo-700 mb-2">Detected Entities</h4>
            <div className="flex flex-wrap gap-2">
              {analysisData.entities.slice(0, 10).map((entity, index) => (
                <span key={index} className="px-2 py-1 bg-white border border-indigo-200 rounded-full text-xs font-medium">
                  {entity.value} ({entity.type})
                </span>
              ))}
              {analysisData.entities.length > 10 && (
                <span className="text-xs text-indigo-500">+{analysisData.entities.length - 10} more</span>
              )}
            </div>
          </div>
        )}
        
        {/* Sentiment Section */}
        {analysisData.sentiment && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <h4 className="text-sm font-medium text-yellow-700 mb-1">Overall Sentiment</h4>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-full rounded-full ${
                analysisData.sentiment === 'positive' ? 'bg-green-500' :
                analysisData.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-xs capitalize">{analysisData.sentiment}</span>
            </div>
          </div>
        )}
      </div>
    ) : (
      <p className="text-sm text-gray-500 italic">Analysis will be performed after recording and uploading.</p>
    )}
  </div>
);

export default DeepgramAnalysis;