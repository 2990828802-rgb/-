import React, { useState, useEffect } from 'react';

interface LockScreenProps {
  onUnlock: () => void;
  savedPin: string;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, savedPin }) => {
  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState(false);
  const [ripples, setRipples] = useState<{x: number, y: number, id: number}[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Ripple Effect Handler
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only trigger ripple if clicking the background, not buttons
    // However, for the "water" feel, let's allow it everywhere but underneath z-index
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { x, y, id: Date.now() };
    setRipples(prev => [...prev, newRipple]);

    // Clean up ripple after animation
    setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  };

  const handleNumClick = (num: string) => {
    if (navigator.vibrate) navigator.vibrate(10); // Haptic feedback
    if (inputPin.length < 6) {
      const newPin = inputPin + num;
      setInputPin(newPin);
      
      // Auto check when length is 6
      if (newPin.length === 6) {
        if (newPin === savedPin) {
          setTimeout(onUnlock, 100);
        } else {
          // Error shake
          setTimeout(() => {
            setError(true);
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            setTimeout(() => {
                setInputPin('');
                setError(false);
            }, 400);
          }, 200);
        }
      }
    }
  };

  const handleDelete = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    setInputPin(prev => prev.slice(0, -1));
  };

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div 
        className="absolute inset-0 z-[60] flex flex-col items-center justify-between pb-10 text-white overflow-hidden select-none"
        onClick={handleScreenClick}
    >
      {/* Background with Blur - Overlaying the Home Screen */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-xl z-[-1]"></div>
      
      {/* Dynamic Water Ripples */}
      {ripples.map(r => (
          <div 
            key={r.id}
            className="absolute rounded-full bg-white/20 pointer-events-none animate-ripple"
            style={{
                left: r.x,
                top: r.y,
                width: '100px',
                height: '100px',
                marginLeft: '-50px',
                marginTop: '-50px'
            }}
          />
      ))}

      {/* Top Lock Icon */}
      <div className="pt-14 flex flex-col items-center animate-fade-in">
         <div className="mb-4">
            <svg className="w-8 h-8 text-white/80" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
         </div>
         <div className="text-[64px] font-thin leading-none tracking-tight">
             {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
         </div>
         <div className="text-[19px] font-medium mt-2 opacity-90">
             {weekDays[currentTime.getDay()]}, {months[currentTime.getMonth()]} {currentTime.getDate()}
         </div>
      </div>

      {/* PIN Input Dots */}
      <div className={`flex gap-4 mb-8 transition-transform ${error ? 'animate-shake' : ''}`}>
          {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className={`w-3.5 h-3.5 rounded-full border border-white/50 transition-all duration-200 ${i < inputPin.length ? 'bg-white' : 'bg-transparent'}`}
              ></div>
          ))}
      </div>

      {/* Numpad */}
      <div className="w-full px-8 max-w-[320px] grid grid-cols-3 gap-x-6 gap-y-5 z-10">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button 
                key={num}
                onClick={(e) => { e.stopPropagation(); handleNumClick(num.toString()); }}
                className="w-[72px] h-[72px] rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:bg-white/30 transition-colors flex flex-col items-center justify-center border border-white/10 shadow-lg"
              >
                  <span className="text-[32px] font-normal leading-none mb-1">{num}</span>
              </button>
          ))}
          
          {/* Empty Space / FaceID */}
          <div className="flex items-center justify-center">
             <span className="text-[12px] font-bold tracking-widest opacity-60">EMERGENCY</span>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); handleNumClick('0'); }}
            className="w-[72px] h-[72px] rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 active:bg-white/30 transition-colors flex flex-col items-center justify-center border border-white/10 shadow-lg"
          >
              <span className="text-[32px] font-normal leading-none mb-1">0</span>
          </button>

          {/* Delete Button */}
          <button 
             onClick={(e) => { e.stopPropagation(); handleDelete(); }}
             className="flex items-center justify-center w-[72px] h-[72px] active:opacity-60 transition-opacity"
          >
             {inputPin.length > 0 ? (
                 <span className="text-[18px] font-medium">Delete</span>
             ) : (
                 <span className="text-[18px] font-medium opacity-60">Cancel</span>
             )}
          </button>
      </div>

      {/* Bottom Hint */}
      <div className="mt-6 text-[13px] opacity-60 font-medium">
          Swipe up to unlock
      </div>
    </div>
  );
};

export default LockScreen;