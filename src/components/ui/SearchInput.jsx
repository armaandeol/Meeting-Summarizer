import React from 'react';

const SearchInput = ({ value, onChange }) => (
  <input
    type="text"
    placeholder="Search transcript..."
    className="w-full md:w-48 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

export default SearchInput;
