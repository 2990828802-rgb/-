import React from 'react';

interface PhoneFrameProps {
  children: React.ReactNode;
}

const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  return (
    <div className="relative mx-auto w-[390px] h-[844px] bg-black rounded-[55px] shadow-2xl border-[14px] border-gray-900 overflow-hidden ring-4 ring-gray-300/20 shrink-0">
      {/* Dynamic Island / Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-b-[20px] z-50 flex justify-center items-center">
        <div className="w-20 h-5 bg-gray-800/60 rounded-full flex items-center justify-end px-2 gap-1.5">
             {/* Fake sensors */}
             <div className="w-1.5 h-1.5 rounded-full bg-blue-900/20"></div>
        </div>
      </div>
      
      {/* Screen Content - Ensure rounded corners match the frame */}
      <div className="w-full h-full bg-white relative overflow-hidden flex flex-col rounded-[40px]">
        {children}
      </div>

      {/* Home Indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-[134px] h-[5px] bg-black/90 rounded-full z-50 pointer-events-none"></div>
    </div>
  );
};

export default PhoneFrame;