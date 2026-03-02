
import React, { useState, useRef } from 'react';
import { AppRoute, ThemePreset } from '../../types';
import { THEME_PRESETS } from '../../constants';

interface AppearanceAppProps {
  onNavigate: (route: AppRoute) => void;
  currentThemeId: string;
  onSetTheme: (themeId: string) => void;
  wallpaper: string | null;
  onSetWallpaper: (data: string | null) => void;
  customIcons: Record<string, string>;
  onSetCustomIcon: (appId: string, iconUrl: string | null) => void;
}

// App IDs matching keys in HomeScreen
const APP_IDS = [
  { id: 'chat', label: '信息' },
  { id: 'create', label: '创建角色' },
  { id: 'diary', label: '日记' },
  { id: 'photos', label: '相册' },
  { id: 'appearance', label: '外观' },
  { id: 'settings', label: '设置' },
  { id: 'phone', label: '本机' },
  { id: 'music', label: '音乐' },
  { id: 'live', label: '直播' },
  { id: 'meet', label: '见面' },
  { id: 'profile', label: '个人档案' },
  { id: 'files', label: '文件' },
  { id: 'dock_phone', label: '电话 (底栏)' },
  { id: 'dock_browser', label: '发现 (底栏)' },
];

const AppearanceApp: React.FC<AppearanceAppProps> = ({
  onNavigate,
  currentThemeId,
  onSetTheme,
  wallpaper,
  onSetWallpaper,
  customIcons,
  onSetCustomIcon
}) => {
  const [activeTab, setActiveTab] = useState<'THEME' | 'WALLPAPER' | 'ICONS'>('THEME');
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [selectedAppIdForIcon, setSelectedAppIdForIcon] = useState<string | null>(null);

  const handleWallpaperSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSetWallpaper(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAppIdForIcon) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSetCustomIcon(selectedAppIdForIcon, reader.result as string);
        setSelectedAppIdForIcon(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerIconUpload = (appId: string) => {
    setSelectedAppIdForIcon(appId);
    // Short delay to ensure state is set before click
    setTimeout(() => iconInputRef.current?.click(), 0);
  };

  const renderThemeTab = () => (
    <div className="grid grid-cols-2 gap-4 p-4">
      {THEME_PRESETS.map(theme => (
        <button
          key={theme.id}
          onClick={() => onSetTheme(theme.id)}
          className={`relative rounded-xl p-1 transition-all ${currentThemeId === theme.id ? 'ring-2 ring-ios-blue scale-[1.02]' : 'ring-1 ring-gray-200 hover:scale-[1.01]'}`}
        >
          <div className={`h-24 rounded-lg w-full ${theme.bgClass} flex items-center justify-center relative overflow-hidden shadow-sm`}>
             <div className="absolute inset-x-4 top-4 h-2 bg-white/40 rounded-full"></div>
             <div className="flex gap-2 mt-4">
                <div className={`w-8 h-8 rounded-lg ${theme.iconBgClass} shadow-sm`}></div>
                <div className={`w-8 h-8 rounded-lg ${theme.iconBgClass} shadow-sm opacity-80`}></div>
             </div>
          </div>
          <div className="mt-2 text-center">
             <span className={`text-[13px] font-medium ${currentThemeId === theme.id ? 'text-ios-blue' : 'text-gray-600'}`}>{theme.name}</span>
          </div>
          {currentThemeId === theme.id && (
            <div className="absolute top-2 right-2 bg-ios-blue text-white rounded-full p-0.5">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );

  const renderWallpaperTab = () => (
    <div className="p-4 space-y-6">
       <div 
         onClick={() => wallpaperInputRef.current?.click()}
         className="aspect-[9/16] w-full rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 active:scale-95 transition-all relative overflow-hidden group"
       >
          {wallpaper ? (
             <img src={wallpaper} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
             <div className={`absolute inset-0 ${THEME_PRESETS.find(t => t.id === currentThemeId)?.bgClass || 'bg-gray-100'} opacity-50`}></div>
          )}
          
          <div className="relative z-10 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg flex items-center gap-2 group-hover:scale-105 transition-transform">
             <svg className="w-5 h-5 text-ios-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
             <span className="text-[14px] font-medium text-gray-800">上传壁纸</span>
          </div>
       </div>
       <input type="file" ref={wallpaperInputRef} className="hidden" accept="image/*" onChange={handleWallpaperSelect} />
       
       {wallpaper && (
         <button 
           onClick={() => onSetWallpaper(null)}
           className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-[15px] font-medium active:bg-red-100 transition-colors"
         >
           移除壁纸 (恢复主题色)
         </button>
       )}
       
       <p className="text-center text-gray-400 text-xs px-6">
         选择主题颜色会自动更改壁纸基调。上传自定义图片将覆盖主题背景。
       </p>
    </div>
  );

  const renderIconsTab = () => (
    <div className="p-4 pb-20">
       <input type="file" ref={iconInputRef} className="hidden" accept="image/*" onChange={handleIconSelect} />
       <div className="space-y-3">
          {APP_IDS.map(app => {
             const hasCustom = !!customIcons[app.id];
             return (
               <div key={app.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-[10px] bg-gray-100 overflow-hidden border border-gray-200 relative">
                        {hasCustom ? (
                           <img src={customIcons[app.id]} className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">默认</div>
                        )}
                     </div>
                     <span className="text-[15px] font-medium text-gray-800">{app.label}</span>
                  </div>
                  
                  <div className="flex gap-2">
                     {hasCustom && (
                        <button 
                          onClick={() => onSetCustomIcon(app.id, null)}
                          className="px-3 py-1.5 bg-red-50 text-red-500 text-xs rounded-lg active:bg-red-100"
                        >
                          还原
                        </button>
                     )}
                     <button 
                       onClick={() => triggerIconUpload(app.id)}
                       className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg active:bg-gray-200"
                     >
                       {hasCustom ? '更换' : '替换'}
                     </button>
                  </div>
               </div>
             );
          })}
       </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-white flex flex-col pt-10 animate-slide-up font-sans relative">
      {/* Header */}
      <div className="px-4 pb-3 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10 h-[44px]">
        <button 
          onClick={() => onNavigate(AppRoute.HOME)} 
          className="text-ios-blue flex items-center text-[17px] hover:opacity-70 transition-opacity font-medium"
        >
          <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
          主屏幕
        </button>
        <h1 className="text-[17px] font-semibold text-black/90 absolute left-1/2 transform -translate-x-1/2">外观设置</h1>
        <div className="w-10"></div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2">
         <div className="flex bg-gray-100 p-1 rounded-xl">
            {(['THEME', 'WALLPAPER', 'ICONS'] as const).map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`flex-1 py-1.5 text-[13px] font-medium rounded-[9px] transition-all ${activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 {tab === 'THEME' ? '主题色' : tab === 'WALLPAPER' ? '壁纸' : '图标'}
               </button>
            ))}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
         {activeTab === 'THEME' && renderThemeTab()}
         {activeTab === 'WALLPAPER' && renderWallpaperTab()}
         {activeTab === 'ICONS' && renderIconsTab()}
      </div>
    </div>
  );
};

export default AppearanceApp;
