import React from 'react';

const SummarySection = ({ summary, isLoading }) => (
  <div className="mb-6">
    <h4 className="font-semibold mb-3 text-base text-gray-700">AI Summary (Final)</h4>
    {isLoading ? (
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-3 py-1">
          <div className="h-2 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="h-2 bg-gray-200 rounded col-span-2"></div>
              <div className="h-2 bg-gray-200 rounded col-span-1"></div>
            </div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    ) : (
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {summary || 'Final summary will appear after recording stops.'}
      </p>
    )}
  </div>
);

export default SummarySection;