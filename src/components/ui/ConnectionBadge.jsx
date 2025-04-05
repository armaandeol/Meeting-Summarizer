import React from 'react';

const ConnectionBadge = ({ status }) => (
  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
    status === 'Connected' ? 'bg-green-100 text-green-800' :
    status === 'Connecting...' ? 'bg-yellow-100 text-yellow-800' :
    status.startsWith('Error') ? 'bg-red-100 text-red-800' :
    'bg-gray-100 text-gray-800'
  }`}>
    {status}
  </span>
);

export default ConnectionBadge;
