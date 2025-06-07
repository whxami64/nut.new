import React from 'react';

interface StarfieldProps {
  className?: string;
  children?: React.ReactNode;
}

export const Starfield: React.FC<StarfieldProps> = ({ className = '', children }) => {
  return (
    <div className={`starfield ${className} relative pointer-events-auto`} style={{zIndex: 1}}>
      {/* CSS-generated stars will be the furthest back */}
      <div className="stars absolute inset-0 z-0 pointer-events-none"></div>

      {/* Left hand - Top Left */}
      <div 
        className="absolute top-0 left-0 pointer-events-none z-10 w-[880px] h-[880px] max-w-[100vw] max-h-[100vh] md:max-w-none md:max-h-none origin-top-left scale-[0.6] md:scale-100" 
        style={{
          transform: 'translate(-20%, -15%)',
        }}
      >
        <img src="/left_hand.svg" alt="" className="w-full h-full object-contain opacity-70 pointer-events-auto" />
      </div>

      {/* Right hand - Bottom Right */}
      <div 
        className="absolute bottom-0 right-0 pointer-events-none z-10 w-[880px] h-[880px] max-w-[100vw] max-h-[100vh] md:max-w-none md:max-h-none origin-bottom-right scale-[0.6] md:scale-100" 
        style={{
          transform: 'translate(10%, -5%)',
        }}
      >
        <img src="/right_hand.svg" alt="" className="w-full h-full object-contain opacity-70 pointer-events-auto" />
      </div>
      
      {/* Increase z-index and ensure pointer events work for ALL children */}
      <div className="relative z-50 h-full flex flex-col pointer-events-auto" style={{position: 'relative', zIndex: 50}}>
        {children}
      </div>
    </div>
  );
};
