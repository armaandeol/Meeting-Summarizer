import React from 'react';

const ConnectionStatus = ({ 
  firebaseConnected, 
  proxyServerConnected, 
  connectionChecked,
  connectionErrorMessage,
  wsState = 'closed',
  usingSdk = false
}) => {
  // Don't show anything until connection check is complete
  if (!connectionChecked) {
    return (
      <div className="mb-4 px-4 py-2 bg-gray-100 rounded-md animate-pulse">
        <p className="text-sm text-gray-500">Checking connections...</p>
      </div>
    );
  }
  
  // If all connections are good, show minimal UI
  if (firebaseConnected && (proxyServerConnected || usingSdk) && (wsState === 'open' || usingSdk)) {
    return (
      <div className="mb-4 px-4 py-2 bg-green-50 rounded-md border border-green-100 flex items-center">
        <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
        <p className="text-sm text-green-700">
          All services connected
          {usingSdk && <span className="text-xs ml-2 bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Using Deepgram SDK</span>}
        </p>
      </div>
    );
  }
  
  // Show status for each service
  return (
    <div className="mb-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
      <h3 className="text-sm font-medium text-yellow-800 mb-2">Connection Issues Detected</h3>
      
      <div className="space-y-2">
        <div className="flex items-center">
          <div className={`h-3 w-3 rounded-full mr-2 ${firebaseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <p className="text-sm text-gray-700">
            Firebase Storage: {firebaseConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
        
        <div className="flex items-center">
          <div className={`h-3 w-3 rounded-full mr-2 ${(proxyServerConnected || usingSdk) ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <p className="text-sm text-gray-700">
            Analysis Service: {
              usingSdk ? 'Using Direct SDK' :
              proxyServerConnected ? 'Connected to Proxy' : 'Disconnected'
            }
          </p>
        </div>
        
        {!usingSdk && (
          <div className="flex items-center">
            <div className={`h-3 w-3 rounded-full mr-2 ${
              wsState === 'open' ? 'bg-green-500' : 
              wsState === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <p className="text-sm text-gray-700">
              WebSocket: {
                wsState === 'open' ? 'Connected' : 
                wsState === 'connecting' ? 'Connecting...' : 'Disconnected'
              }
            </p>
          </div>
        )}
        
        {connectionErrorMessage && (
          <div className="mt-2 px-3 py-2 bg-red-50 rounded border border-red-100">
            <p className="text-xs text-red-700">{connectionErrorMessage}</p>
            <p className="text-xs text-gray-500 mt-1">
              {!proxyServerConnected && !usingSdk && (
                "Make sure the analysis server is running at http://localhost:3001"
              )}
              {!firebaseConnected && (
                "Check your Firebase configuration and internet connection"
              )}
              {wsState !== 'open' && !usingSdk && (
                "Check your internet connection and Deepgram API key"
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
