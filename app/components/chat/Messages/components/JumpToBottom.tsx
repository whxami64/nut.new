import React from 'react';
import { classNames } from '~/utils/classNames';

interface JumpToBottomProps {
  visible: boolean;
  onClick: () => void;
}

export const JumpToBottom: React.FC<JumpToBottomProps> = ({ visible, onClick }) => {
  if (!visible) return null;

  return (
    <div className="absolute left-0 right-0 bottom-5 flex justify-center pointer-events-none">
      <button
        onClick={onClick}
        className={classNames(
          'group flex items-center justify-center',
          'w-10 h-10 rounded-full',
          'bg-bolt-elements-background-depth-2 border border-gray-500',
          'text-bolt-elements-textPrimary hover:text-white',
          'hover:border-white hover:border-1',
          'transition-all duration-200 shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-gray-700',
          'pointer-events-auto'
        )}
        aria-label="Jump to bottom"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      </button>
    </div>
  );
}; 