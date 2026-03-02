
import React, { useState, useEffect } from 'react';
import { AppRoute, ThemePreset } from '../../types';
import { THEME_PRESETS } from '../../constants';

interface HomeScreenProps {
  onOpenApp: (app: AppRoute) => void;
  themeId: string;
  wallpaper: string | null;
  customIcons: Record<string, string>;
}

interface AppIconProps { 
  children: React.ReactNode; 
  label?: string; 
  onClick?: () => void;
  notification?: number;
  theme: ThemePreset;
  customIcon?: string; // URL if replaced
}

// Reusable Icon Component
const AppIcon: React.FC<AppIconProps> = ({ 
  children, 
  label, 
  onClick, 
  notification,
  theme,
  customIcon
}) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 group active:scale-90 transition-transform duration-200"
  >
    <div className={`w-[62px] h-[62px] rounded-[18px] flex items-center justify-center shadow-lg relative overflow-hidden border border-white/40 backdrop-blur-md transition-all duration-500 ${theme.iconBgClass}`}>
      {/* Main Icon Content - If custom, show image, else show children */}
      {customIcon ? (
          <img src={customIcon} alt={label} className="w-full h-full object-cover" />
      ) : (
          <>
            <div className="text-white drop-shadow-md relative z-10">
                {children}
            </div>
            {/* Hollow Heart Decoration (Only on default icons) */}
            <svg className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-white/70 drop-shadow-sm pointer-events-none z-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </>
      )}

      {/* Notification Badge */}
      {notification && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-[2px] border-white text-[10px] flex items-center justify-center text-white font-bold z-20 shadow-sm">
          {notification}
        </div>
      )}
    </div>
    {label && <span className="text-gray-700 text-[12px] font-medium drop-shadow-sm tracking-tight">{label}</span>}
  </button>
);

const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenApp, themeId, wallpaper, customIcons }) => {
  const [date, setDate] = useState(new Date());
  
  // Resolve Theme
  const theme = THEME_PRESETS.find(t => t.id === themeId) || THEME_PRESETS[0];

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Chinese Date Format
  const dayName = date.toLocaleDateString('zh-CN', { weekday: 'long' }); // e.g., 星期一
  const monthDay = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }); // e.g., 10月24日
  const dayNumber = date.getDate();

  return (
    <div className={`w-full h-full flex flex-col p-6 pt-14 gap-6 animate-fade-in relative overflow-hidden transition-colors duration-500 ${!wallpaper ? theme.bgClass : ''}`}>
      
      {/* Wallpaper Layer */}
      {wallpaper && (
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${wallpaper})` }}
          ></div>
      )}

      {/* Background Overlay if wallpaper is present to ensure text readability if needed? Optional. Keeping clean for now. */}

      {/* Decorative Orbs (Only if no wallpaper, to match theme) */}
      {!wallpaper && (
        <>
            <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-white/20 rounded-full blur-3xl opacity-60 pointer-events-none mix-blend-overlay"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-white/20 rounded-full blur-3xl opacity-60 pointer-events-none mix-blend-overlay"></div>
        </>
      )}

      {/* Top Widget Area */}
      <div className="w-full flex justify-between items-start mb-2 px-1 gap-4 z-10 flex-shrink-0">
         {/* Calendar Widget */}
         <div className="flex-1 h-[150px] bg-white/40 backdrop-blur-xl rounded-[22px] shadow-sm flex flex-col items-center justify-center text-black p-4 relative overflow-hidden border border-white/50">
            <div className="absolute top-0 w-full h-1 bg-current opacity-50" style={{ color: theme.accentColor.replace('text-', 'bg-') }}></div>
            <span className={`font-bold text-[14px] uppercase tracking-widest mb-1 ${theme.accentColor}`}>{dayName}</span>
            <span className="text-[52px] font-thin leading-none tracking-tighter text-black/80">{dayNumber}</span>
            <span className="text-gray-600 text-[12px] font-medium mt-1">农历九月廿二</span>
         </div>
         
         {/* Weather/Clock Widget */}
         <div className="flex-1 h-[150px] bg-gradient-to-br from-blue-400/20 to-purple-400/20 backdrop-blur-xl rounded-[22px] shadow-sm flex flex-col p-4 text-gray-800 justify-between relative overflow-hidden border border-white/30">
            <div className="flex flex-col z-10 text-gray-800">
               <span className="text-[14px] font-medium">北京市</span>
               <span className="text-[36px] font-light tracking-tight">26°</span>
            </div>
            <div className="text-[12px] font-medium opacity-90 z-10 text-gray-700">
               晴朗
               <br />
               最高: 28° 最低: 19°
            </div>
         </div>
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-4 gap-x-4 gap-y-6 px-1 z-10 content-start flex-1 overflow-y-auto no-scrollbar pb-4">
        
        {/* 1. Chat App */}
        <AppIcon label="信息" onClick={() => onOpenApp(AppRoute.CHAT_LIST)} theme={theme} customIcon={customIcons['chat']}>
           <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
               <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
        </AppIcon>

        {/* 2. Create Character */}
        <AppIcon label="创建角色" onClick={() => onOpenApp(AppRoute.CREATE_CHARACTER)} theme={theme} customIcon={customIcons['create']}>
             <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
             </svg>
        </AppIcon>

        {/* 3. Diary */}
        <AppIcon label="日记" theme={theme} customIcon={customIcons['diary']}>
             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
             </svg>
        </AppIcon>

         {/* 4. Photos */}
        <AppIcon label="相册" theme={theme} customIcon={customIcons['photos']}>
            <div className="w-8 h-8 bg-white/30 rounded-full border-2 border-white/60"></div>
        </AppIcon>
        
        {/* 5. Appearance - OPEN NEW APP */}
        <AppIcon label="外观" onClick={() => onOpenApp(AppRoute.APPEARANCE)} theme={theme} customIcon={customIcons['appearance']}>
             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
             </svg>
        </AppIcon>

        {/* 6. Settings */}
        <AppIcon label="设置" onClick={() => onOpenApp(AppRoute.SETTINGS)} theme={theme} customIcon={customIcons['settings']}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </AppIcon>

        {/* 7. Phone Info (本机) */}
        <AppIcon label="本机" onClick={() => onOpenApp(AppRoute.PHONE_INFO)} theme={theme} customIcon={customIcons['phone']}>
             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/>
             </svg>
        </AppIcon>

        {/* 8. Game (Replaces Music) */}
        <AppIcon label="游戏" onClick={() => onOpenApp(AppRoute.GAME)} theme={theme} customIcon={customIcons['game']}>
             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
             </svg>
        </AppIcon>

        {/* 9. Live (直播) */}
        <AppIcon label="直播" theme={theme} customIcon={customIcons['live']}>
             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
             </svg>
        </AppIcon>

        {/* 10. Meet (见面) */}
        <AppIcon label="见面" theme={theme} customIcon={customIcons['meet']}>
             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
             </svg>
        </AppIcon>

        {/* 11. Profile (个人档案) */}
        <AppIcon label="个人档案" onClick={() => onOpenApp(AppRoute.PROFILE)} theme={theme} customIcon={customIcons['profile']}>
             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
             </svg>
        </AppIcon>

        {/* 12. Files */}
        <AppIcon label="文件" theme={theme} customIcon={customIcons['files']}>
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
        </AppIcon>

      </div>

      {/* Dock - Pushed to absolute bottom margin */}
      <div className={`flex-shrink-0 w-full h-[96px] backdrop-blur-xl rounded-[32px] flex items-center justify-evenly px-4 pb-1 border border-white/40 shadow-2xl z-20 mb-1 transition-colors duration-500 ${theme.dockClass}`}>
        
        {/* Dock 1: Phone -> Contacts */}
        <AppIcon theme={theme} customIcon={customIcons['dock_phone']}>
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.068 15.068 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1.01A11.36 11.36 0 018.5 4c.55 0 1-.45 1-1s-.45-1-1-1C4.48 2 2 4.48 2 9s7 15.5 15.5 15.5c.55 0 1-.45 1-1s-.45-1-1-1z"/></svg>
        </AppIcon>
        
        {/* Dock 2: Moments */}
        <AppIcon onClick={() => onOpenApp(AppRoute.MOMENTS)} theme={theme} customIcon={customIcons['dock_moments']}>
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                <circle cx="18" cy="6" r="3" fill="currentColor" stroke="none"/>
            </svg>
        </AppIcon>
        
        <AppIcon onClick={() => onOpenApp(AppRoute.CHAT_LIST)} theme={theme} customIcon={customIcons['chat']}>
           <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </AppIcon>
        
        <AppIcon theme={theme} customIcon={customIcons['music']}>
             <span className="text-3xl font-bold -mt-1">♫</span>
        </AppIcon>
      </div>
    </div>
  );
};

export default HomeScreen;
