import { useEffect, useState } from 'react';

// Define breakpoints for device sizes (in pixels)
export const BREAKPOINTS = {
  mobile: 768, // Anything under this is considered mobile
};

/**
 * Custom hook to detect if the current device is a mobile device based on screen width
 * @returns {boolean} true if the device is a mobile device
 */
export function useIsMobile(): boolean {
  // Default to false on server render
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Initialize based on current window width
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.mobile);
    };
    
    // Check initially
    checkIfMobile();
    
    // Add event listener to track window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  return isMobile;
}

/**
 * Custom hook to detect iOS devices (iPhone, iPad, iPod)
 * @returns {boolean} true if the current device is running iOS
 */
export function useIsIOS(): boolean {
  // Default to false on server render
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator) {
      // Check for iOS devices based on user agent
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || 
        (userAgent.includes('mac') && 'ontouchend' in document);
      
      setIsIOS(isIOSDevice);
    }
  }, []);
  
  return isIOS;
}
