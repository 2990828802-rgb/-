import React, { useState, useEffect } from 'react';

// Define types for the Battery API
interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

const StatusBar: React.FC<{ isLight?: boolean }> = ({ isLight = true }) => {
  const [time, setTime] = useState(new Date());
  const [batteryLevel, setBatteryLevel] = useState(1); // 0 to 1
  const [isCharging, setIsCharging] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 10000); // Update every 10s
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;
    if (nav.getBattery) {
      nav.getBattery().then((battery) => {
        const updateBattery = () => {
          setBatteryLevel(battery.level);
          setIsCharging(battery.charging);
        };
        
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
        
        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      });
    } else {
        // Fallback simulation if API not supported
        // setTimeout(() => setIsCharging(true), 2000);
    }
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // If charging, ignore the isLight prop for the battery icon specifically to show colors, 
  // but keep text readable. Use a softer gray for text/icons instead of pure black.
  const textColor = isLight ? 'text-zinc-900' : 'text-white';
  
  // Charging gradient style
  const chargingGradientClass = "bg-gradient-to-r from-pink-400 to-blue-400";
  const batteryFillColor = isCharging ? chargingGradientClass : "bg-current";
  const batteryBorderColor = isCharging ? "border-pink-400" : "border-gray-500/50";

  return (
    <div className={`w-full h-[48px] px-7 flex justify-between items-center text-[15px] font-semibold z-40 select-none transition-colors duration-300 ${textColor}`}>
      <div className="flex-1 flex justify-start">
        <span>{formatTime(time)}</span>
      </div>
      <div className="flex-1 flex justify-end items-center gap-1.5">
         
         {/* Wifi - Updated to cleaner shape */}
         <svg className="w-[18px] h-[13px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c4.6 0 8.9 1.8 12 4.7l-12 13-12-13C3.1 4.8 7.4 3 12 3z"/>
         </svg>
         
         {/* Battery Percentage */}
         <span className="text-[13px] font-medium mr-0.5 ml-1 tracking-tight">
             {Math.round(batteryLevel * 100)}%
         </span>

         {/* Battery Icon */}
         <div className={`w-[26px] h-[12px] border-[1.5px] rounded-[3.5px] relative opacity-90 ${batteryBorderColor} p-[1.5px]`}>
            <div 
                className={`h-full ${batteryFillColor} rounded-[1px] transition-all duration-500`} 
                style={{ width: `${batteryLevel * 100}%` }}
            ></div>
            
            {/* Battery Cap */}
            <div className={`absolute top-1/2 -right-[4.5px] transform -translate-y-1/2 w-[2px] h-[4px] rounded-r-[1.5px] ${isCharging ? 'bg-pink-400' : 'bg-gray-500/50'}`}></div>
            
            {/* Charging Bolt Overlay */}
            {isCharging && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                   <svg className="w-3 h-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                   </svg>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default StatusBar;