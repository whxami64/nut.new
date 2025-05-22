import React from 'react';

export const IntroSection: React.FC = () => {
  return (
    <div id="intro" className="mt-[16vh] max-w-chat mx-auto text-center px-4 lg:px-0">
      <h1 className="text-3xl lg:text-6xl font-bold text-bolt-elements-textPrimary mb-4 animate-fade-in">
        Get what you want
      </h1>
      <p className="text-md lg:text-xl mb-8 text-bolt-elements-textSecondary animate-fade-in animation-delay-200">
        Write, test, and fix your app all from one prompt
      </p>
    </div>
  );
}; 