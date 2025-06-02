import { useState } from 'react';
import { SearchInput } from '~/components/chat/SearchInput/SearchInput';
import { ExampleLibraryApps } from '~/components/app-library/ExampleLibraryApps';

interface ArboretumProps {
  onHide: () => void;
}

export const Arboretum: React.FC<ArboretumProps> = ({ onHide }) => {
  const [filterText, setFilterText] = useState('');

  return (
    <div className='relative flex flex-col items-center'>
      <button
        onClick={onHide}
        className='absolute right-4 top-30 p-2 rounded-lg bg-transparent border border-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-2 transition-colors duration-200 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
        aria-label='Hide Arboretum'
      >
        <svg
          width='20'
          height='20'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <line x1='18' y1='6' x2='6' y2='18' />
          <line x1='6' y1='6' x2='18' y2='18' />
        </svg>
      </button>
      <div className='text-2xl lg:text-4xl font-bold text-bolt-elements-textPrimary mt-8 mb-4 animate-fade-in text-center max-w-chat mx-auto'>
        Arboretum
      </div>
      <div className='text-bolt-elements-textSecondary text-center max-w-chat mx-auto'>
        Browse these auto-generated apps for a place to start
      </div>
      <SearchInput onSearch={setFilterText} />
      <ExampleLibraryApps filterText={filterText} />
    </div>
  );
};
