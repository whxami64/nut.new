import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 py-3">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold">Your App Name</h1>
        </div>
        {/* Add navigation items here as needed */}
      </nav>
    </header>
  );
};
