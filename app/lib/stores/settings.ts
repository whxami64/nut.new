import { atom } from 'nanostores';
import { useStore } from '@nanostores/react';

// Create the atom for arboretum visibility
export const showArboretumStore = atom<boolean>(false);

// Create a hook for easier usage in React components
export function useArboretumVisibility() {
  const isVisible = useStore(showArboretumStore);
  
  return {
    isArboretumVisible: isVisible,
    toggleArboretum: () => showArboretumStore.set(!isVisible)
  };
}
