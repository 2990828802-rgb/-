
import React, { useState, useEffect } from 'react';
import PhoneFrame from './components/PhoneFrame';
import StatusBar from './components/StatusBar';
import LockScreen from './components/LockScreen';
import HomeScreen from './components/Apps/HomeScreen';
import ChatApp from './components/Apps/ChatApp';
import SettingsApp from './components/Apps/SettingsApp';
import CreateCharacterApp from './components/Apps/CreateCharacterApp';
import PhoneInfoApp from './components/Apps/PhoneInfoApp';
import ProfileApp from './components/Apps/ProfileApp';
import AppearanceApp from './components/Apps/AppearanceApp';
import MomentsApp from './components/Apps/MomentsApp';
import GameApp from './components/Apps/GameApp';
import { AppRoute, Character, ApiSettings, Sticker, UserPersona, ChatSession, Moment, MomentsProfile } from './types';
import { DEFAULT_CHARACTERS, INITIAL_SETTINGS, DEFAULT_STICKERS } from './constants';
import { useMomentsSimulation } from './hooks/useMomentsSimulation';

const INITIAL_MOMENTS_PROFILE: MomentsProfile = {
  name: '我',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  signature: '保持热爱，奔赴山海。',
  coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80'
};

const INITIAL_MOMENTS: Moment[] = [
  {
    id: '1',
    userId: '1', // Lin Xiaoxiao
    userName: '林晓晓 👻',
    userAvatar: 'https://api.dicebear.com/9.x/micah/svg?seed=Xiaoxiao&backgroundColor=ffdfbf',
    content: '烦死了，老板又让改稿，这已经是第8版了！😤 只有奶茶能抚慰我受伤的心灵 🥤 #打工人 #奶茶续命',
    images: ['https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=500&q=60'],
    timestamp: Date.now() - 1800000, // 30 mins ago
    likes: 12,
    comments: [
      {
        id: 'c1',
        userId: '2',
        userName: '赛博李白 🍶',
        content: '姑娘何不饮酒？酒解千愁！',
        timestamp: Date.now() - 900000
      }
    ]
  },
  {
    id: '2',
    userId: '2', // Li Bai
    userName: '赛博李白 🍶',
    userAvatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=LiBai&backgroundColor=b6e3f4',
    content: '举杯邀明月，对影... 蹭个网。兄台，借五块钱买酒，在线等，挺急的。🍶 \n\n(此条由发光玉简发出)',
    images: [
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=500&q=60'
    ],
    timestamp: Date.now() - 7200000, // 2 hours ago
    likes: 5,
    comments: []
  },
  {
    id: '3',
    userId: '3', // K
    userName: 'K (Crush)',
    userAvatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=K&backgroundColor=1f2937',
    content: '下雨了。',
    images: ['https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=500&q=60'],
    timestamp: Date.now() - 18000000, // 5 hours ago
    likes: 2,
    comments: []
  }
];

const App: React.FC = () => {
  // Security State
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState(() => localStorage.getItem('app_pin') || '123456');

  // App State - ALL INITIALIZED FROM LOCALSTORAGE
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.HOME);
  
  const [characters, setCharacters] = useState<Character[]>(() => {
    const saved = localStorage.getItem('app_characters');
    return saved ? JSON.parse(saved) : DEFAULT_CHARACTERS;
  });

  const [stickers, setStickers] = useState<Sticker[]>(() => {
    const saved = localStorage.getItem('app_stickers');
    return saved ? JSON.parse(saved) : DEFAULT_STICKERS;
  });

  const [settings, setSettings] = useState<ApiSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  // Sessions lifted to App level for persistence
  const [sessions, setSessions] = useState<Record<string, ChatSession>>(() => {
    const saved = localStorage.getItem('app_sessions');
    return saved ? JSON.parse(saved) : {};
  });

  const [targetCharId, setTargetCharId] = useState<string | null>(null);

  // User Personas State
  const [userPersonas, setUserPersonas] = useState<UserPersona[]>(() => {
    const saved = localStorage.getItem('app_personas');
    return saved ? JSON.parse(saved) : [];
  });

  const [activePersonaId, setActivePersonaId] = useState<string | null>(() => {
    return localStorage.getItem('app_active_persona');
  });

  const [characterBindings, setCharacterBindings] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('app_bindings');
    return saved ? JSON.parse(saved) : {};
  });

  // --- MOMENTS STATE (Lifted) ---
  const [momentsProfile, setMomentsProfile] = useState<MomentsProfile>(() => {
    const saved = localStorage.getItem('moments_profile');
    return saved ? JSON.parse(saved) : INITIAL_MOMENTS_PROFILE;
  });

  const [moments, setMoments] = useState<Moment[]>(() => {
    const saved = localStorage.getItem('moments_list');
    return saved ? JSON.parse(saved) : INITIAL_MOMENTS;
  });

  // --- APPEARANCE STATE ---
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    return localStorage.getItem('app_theme_id') || 'default';
  });

  const [wallpaper, setWallpaper] = useState<string | null>(() => {
    return localStorage.getItem('app_wallpaper');
  });

  const [customIcons, setCustomIcons] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('app_custom_icons');
    return saved ? JSON.parse(saved) : {};
  });

  // --- SIMULATION HOOKS ---
  const { triggerRandomCharacterPost } = useMomentsSimulation(moments, setMoments, characters, momentsProfile);

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => { localStorage.setItem('app_pin', pin); }, [pin]);
  useEffect(() => { localStorage.setItem('app_characters', JSON.stringify(characters)); }, [characters]);
  useEffect(() => { localStorage.setItem('app_stickers', JSON.stringify(stickers)); }, [stickers]);
  useEffect(() => { localStorage.setItem('app_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('app_sessions', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem('app_personas', JSON.stringify(userPersonas)); }, [userPersonas]);
  useEffect(() => { 
    if(activePersonaId) localStorage.setItem('app_active_persona', activePersonaId); 
    else localStorage.removeItem('app_active_persona');
  }, [activePersonaId]);
  useEffect(() => { localStorage.setItem('app_bindings', JSON.stringify(characterBindings)); }, [characterBindings]);
  
  // Moments Persistence
  useEffect(() => { localStorage.setItem('moments_profile', JSON.stringify(momentsProfile)); }, [momentsProfile]);
  useEffect(() => { localStorage.setItem('moments_list', JSON.stringify(moments)); }, [moments]);

  // Appearance Persistence
  useEffect(() => { localStorage.setItem('app_theme_id', currentThemeId); }, [currentThemeId]);
  useEffect(() => { 
    if (wallpaper) localStorage.setItem('app_wallpaper', wallpaper);
    else localStorage.removeItem('app_wallpaper');
  }, [wallpaper]);
  useEffect(() => { localStorage.setItem('app_custom_icons', JSON.stringify(customIcons)); }, [customIcons]);


  const handleOpenChat = (characterId: string) => {
    setTargetCharId(characterId);
    setCurrentRoute(AppRoute.CHAT_CONVERSATION);
  };

  const handleUpdatePin = (newPin: string) => {
      setPin(newPin);
  };

  const handleSetCustomIcon = (appId: string, iconUrl: string | null) => {
      setCustomIcons(prev => {
          const next = { ...prev };
          if (iconUrl) {
              next[appId] = iconUrl;
          } else {
              delete next[appId];
          }
          return next;
      });
  };

  const renderContent = () => {
    switch (currentRoute) {
      case AppRoute.HOME:
        return (
          <HomeScreen 
            onOpenApp={setCurrentRoute} 
            themeId={currentThemeId}
            wallpaper={wallpaper}
            customIcons={customIcons}
          />
        );
      
      case AppRoute.CHAT_LIST:
      case AppRoute.CHAT_CONVERSATION:
        return (
          <ChatApp 
            characters={characters} 
            setCharacters={setCharacters}
            onNavigate={setCurrentRoute}
            settings={settings}
            stickers={stickers}
            setStickers={setStickers}
            initialCharacterId={targetCharId}
            onClearTarget={() => setTargetCharId(null)}
            userPersonas={userPersonas}
            activePersonaId={activePersonaId}
            characterBindings={characterBindings}
            // Pass persistence props
            sessions={sessions}
            setSessions={setSessions}
            // Pass moments for context
            moments={moments}
          />
        );
      
      case AppRoute.CREATE_CHARACTER:
        return (
          <CreateCharacterApp 
            characters={characters}
            setCharacters={setCharacters}
            onNavigate={setCurrentRoute}
            onChatStart={handleOpenChat}
          />
        );

      case AppRoute.SETTINGS:
        return (
          <SettingsApp 
            settings={settings}
            onSave={setSettings}
            onNavigate={setCurrentRoute}
          />
        );

      case AppRoute.PHONE_INFO:
        return (
          <PhoneInfoApp 
            onNavigate={setCurrentRoute}
            currentPin={pin}
            onUpdatePin={handleUpdatePin}
          />
        );

      case AppRoute.PROFILE:
        return (
          <ProfileApp 
            onNavigate={setCurrentRoute}
            userPersonas={userPersonas}
            setUserPersonas={setUserPersonas}
            activePersonaId={activePersonaId}
            setActivePersonaId={setActivePersonaId}
            characters={characters}
            characterBindings={characterBindings}
            setCharacterBindings={setCharacterBindings}
          />
        );

      case AppRoute.APPEARANCE:
        return (
          <AppearanceApp 
            onNavigate={setCurrentRoute}
            currentThemeId={currentThemeId}
            onSetTheme={setCurrentThemeId}
            wallpaper={wallpaper}
            onSetWallpaper={setWallpaper}
            customIcons={customIcons}
            onSetCustomIcon={handleSetCustomIcon}
          />
        );

      case AppRoute.MOMENTS:
        return (
          <MomentsApp 
            onNavigate={setCurrentRoute}
            moments={moments}
            setMoments={setMoments}
            profile={momentsProfile}
            setProfile={setMomentsProfile}
            onTriggerSimulation={triggerRandomCharacterPost}
          />
        );

      case AppRoute.GAME:
        return (
          <GameApp 
            onNavigate={setCurrentRoute} 
            characters={characters}
          />
        );
        
      default:
        return <HomeScreen 
            onOpenApp={setCurrentRoute} 
            themeId={currentThemeId}
            wallpaper={wallpaper}
            customIcons={customIcons}
        />;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-2 bg-gray-100">
      <PhoneFrame>
        {/* Status Bar sits on top of everything */}
        <div className="absolute top-0 w-full z-50 pointer-events-none">
          <StatusBar isLight={!isLocked} />
        </div>

        {/* Lock Screen Overlay */}
        {isLocked && (
            <LockScreen 
                onUnlock={() => setIsLocked(false)} 
                savedPin={pin}
            />
        )}
        
        {/* Main Content */}
        <div className={`w-full h-full ${isLocked ? 'scale-[0.98] blur-[2px]' : ''} transition-all duration-500`}>
          {renderContent()}
        </div>
      </PhoneFrame>
    </div>
  );
};

export default App;
