
import React, { useState, useRef } from 'react';
import { AppRoute, UserPersona, Character } from '../../types';

interface ProfileAppProps {
  onNavigate: (route: AppRoute) => void;
  userPersonas: UserPersona[];
  setUserPersonas: React.Dispatch<React.SetStateAction<UserPersona[]>>;
  activePersonaId: string | null;
  setActivePersonaId: React.Dispatch<React.SetStateAction<string | null>>;
  characters: Character[];
  characterBindings: Record<string, string>; // CharID -> PersonaID
  setCharacterBindings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const ProfileApp: React.FC<ProfileAppProps> = ({
  onNavigate,
  userPersonas,
  setUserPersonas,
  activePersonaId,
  setActivePersonaId,
  characters,
  characterBindings,
  setCharacterBindings
}) => {
  const [view, setView] = useState<'LIST' | 'CREATE'>('LIST');
  const [showBindModal, setShowBindModal] = useState<string | null>(null); // Persona ID being bound
  const [editingId, setEditingId] = useState<string | null>(null); // ID of persona being edited

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('https://ui-avatars.com/api/?name=U&background=random');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setAvatarUrl('https://ui-avatars.com/api/?name=U&background=random');
    setEditingId(null);
  };

  const handleEdit = (persona: UserPersona) => {
      setName(persona.name);
      setDescription(persona.description);
      setAvatarUrl(persona.avatar);
      setEditingId(persona.id);
      setView('CREATE');
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingId) {
        // Update existing
        setUserPersonas(prev => prev.map(p => 
            p.id === editingId 
            ? { ...p, name, description, avatar: avatarUrl }
            : p
        ));
    } else {
        // Create new
        const newPersona: UserPersona = {
            id: Date.now().toString(),
            name,
            description,
            avatar: avatarUrl
        };
        setUserPersonas(prev => [...prev, newPersona]);
        
        // Set as active if it's the first one
        if (userPersonas.length === 0) {
            setActivePersonaId(newPersona.id);
        }
    }
    
    resetForm();
    setView('LIST');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setUserPersonas(prev => prev.filter(p => p.id !== id));
      if (activePersonaId === id) {
          setActivePersonaId(null);
      }
      // Remove bindings
      const newBindings = { ...characterBindings };
      Object.keys(newBindings).forEach(charId => {
          if (newBindings[charId] === id) delete newBindings[charId];
      });
      setCharacterBindings(newBindings);
  };

  const handleSetDefault = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setActivePersonaId(id);
  };

  const toggleBinding = (charId: string, personaId: string) => {
      setCharacterBindings(prev => {
          const next = { ...prev };
          if (next[charId] === personaId) {
              delete next[charId]; // Unbind
          } else {
              next[charId] = personaId; // Bind (overwrites existing)
          }
          return next;
      });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderList = () => (
    <div className="w-full h-full bg-gray-50 flex flex-col pt-10 animate-slide-right font-sans relative">
       {/* Header */}
      <div className="px-4 pb-3 flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 h-[44px]">
        <button 
          onClick={() => onNavigate(AppRoute.HOME)} 
          className="text-ios-blue text-[17px] hover:opacity-70 transition-opacity flex items-center -ml-1 font-medium"
        >
          <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          主屏幕
        </button>
        <h1 className="text-[17px] font-semibold text-black/90 absolute left-1/2 transform -translate-x-1/2">个人档案</h1>
        <button 
          onClick={() => { resetForm(); setView('CREATE'); }}
          className="text-ios-blue hover:opacity-70 transition-opacity"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {userPersonas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-300">
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </div>
                <p className="text-[15px] font-medium">空空如也哦</p>
                <p className="text-[13px] mt-1">点击右上角 + 创建你的人设</p>
            </div>
        ) : (
            userPersonas.map(persona => {
                const isActive = activePersonaId === persona.id;
                const boundCount = Object.values(characterBindings).filter(id => id === persona.id).length;

                return (
                    <div 
                        key={persona.id} 
                        onClick={() => handleEdit(persona)}
                        className={`relative bg-white rounded-2xl p-4 shadow-sm border-2 transition-all cursor-pointer overflow-hidden ${isActive ? 'border-ios-blue shadow-md' : 'border-transparent'}`}
                    >
                        {/* Default Indicator / Toggle */}
                        <button 
                            onClick={(e) => handleSetDefault(persona.id, e)}
                            className={`absolute top-3 right-3 p-1.5 rounded-full transition-colors z-10 flex items-center gap-1 ${isActive ? 'bg-ios-blue text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                        >
                            <svg className="w-4 h-4" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                            {isActive && <span className="text-[10px] font-bold pr-1">默认</span>}
                        </button>
                        
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                                <img src={persona.avatar} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0 pt-1 pr-10">
                                <h3 className="text-[17px] font-bold text-black truncate">{persona.name}</h3>
                                <p className="text-[13px] text-gray-500 line-clamp-2 leading-snug mt-1">{persona.description}</p>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
                             <div className="text-[12px] text-gray-400 flex items-center gap-1">
                                {boundCount > 0 ? (
                                    <span className="text-ios-blue font-medium">已绑定 {boundCount} 个角色</span>
                                ) : (
                                    <span>未绑定</span>
                                )}
                             </div>
                             
                             <div className="flex gap-2">
                                <button 
                                    onClick={(e) => handleDelete(persona.id, e)}
                                    className="px-3 py-1.5 bg-red-50 text-red-500 text-[12px] font-medium rounded-lg active:bg-red-100"
                                >
                                    删除
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowBindModal(persona.id); }}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-[12px] font-medium rounded-lg active:bg-gray-200 flex items-center gap-1"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                                    绑定
                                </button>
                             </div>
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* Binding Modal */}
      {showBindModal && (
          <div className="absolute inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end animate-fade-in" onClick={() => setShowBindModal(null)}>
              <div className="w-full h-[70%] bg-white rounded-t-[20px] shadow-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-md">
                      <span className="text-[16px] font-bold text-gray-800">选择要绑定的角色</span>
                      <button onClick={() => setShowBindModal(null)} className="p-1 bg-gray-200 rounded-full">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                       {characters.length === 0 ? (
                           <p className="text-center text-gray-400 mt-10">暂无角色</p>
                       ) : (
                           characters.map(char => {
                               const isBound = characterBindings[char.id] === showBindModal;
                               const boundToOther = characterBindings[char.id] && characterBindings[char.id] !== showBindModal;
                               
                               return (
                                   <div 
                                      key={char.id}
                                      onClick={() => toggleBinding(char.id, showBindModal!)}
                                      className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${isBound ? 'border-ios-blue bg-blue-50' : 'border-gray-100 bg-white'}`}
                                   >
                                       <img src={char.avatar} className="w-10 h-10 rounded-full bg-gray-200 object-cover mr-3" />
                                       <div className="flex-1">
                                           <h4 className="font-medium text-black">{char.name}</h4>
                                           {boundToOther && <p className="text-[10px] text-orange-500">已绑定其他用户人设，点击将覆盖</p>}
                                       </div>
                                       <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isBound ? 'border-ios-blue bg-ios-blue' : 'border-gray-300'}`}>
                                            {isBound && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                                       </div>
                                   </div>
                               )
                           })
                       )}
                  </div>
                  <div className="p-4 border-t border-gray-100 bg-white">
                      <p className="text-[11px] text-gray-400 text-center">
                          绑定后，该角色将只读取当前人设的信息。
                      </p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );

  const renderCreate = () => (
    <div className="w-full h-full bg-white flex flex-col pt-10 animate-slide-left font-sans">
      <div className="px-4 pb-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-10 h-[44px]">
        <button onClick={() => { resetForm(); setView('LIST'); }} className="text-ios-blue text-[17px] hover:opacity-70 transition-opacity font-medium">取消</button>
        <h1 className="text-[17px] font-semibold text-black absolute left-1/2 transform -translate-x-1/2">
            {editingId ? '编辑用户档案' : '新建用户档案'}
        </h1>
        <button onClick={handleSave} disabled={!name.trim()} className={`font-semibold text-[17px] transition-all ${!name.trim() ? 'text-gray-400' : 'text-ios-blue hover:opacity-70'}`}>保存</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col items-center mb-6">
             <div onClick={handleAvatarClick} className="w-24 h-24 rounded-full bg-gray-100 relative cursor-pointer active:scale-95 transition-transform">
                 <img src={avatarUrl} className="w-full h-full rounded-full object-cover" />
                 <div className="absolute bottom-0 right-0 bg-ios-blue rounded-full p-1.5 border-2 border-white">
                     <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                 </div>
             </div>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
             <span className="text-ios-blue text-sm mt-2 font-medium" onClick={handleAvatarClick}>设置头像</span>
          </div>

          <div className="space-y-4">
              <div>
                  <label className="block text-[13px] font-medium text-gray-500 mb-1 ml-2 uppercase">你的名字</label>
                  <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-100 rounded-xl px-4 py-3 text-[17px] outline-none focus:ring-2 focus:ring-ios-blue/50 transition-all"
                    placeholder="例如：小明"
                    autoFocus
                  />
              </div>

              <div>
                  <label className="block text-[13px] font-medium text-gray-500 mb-1 ml-2 uppercase">人设 / 备注</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-100 rounded-xl px-4 py-3 text-[17px] outline-none focus:ring-2 focus:ring-ios-blue/50 transition-all h-40 resize-none leading-relaxed"
                    placeholder="描述你在这个世界中的身份。例如：'我是一个富有但孤独的侦探'，或者'我是角色的青梅竹马'。这些信息将发送给AI。"
                  />
              </div>
          </div>
      </div>
    </div>
  );

  return view === 'LIST' ? renderList() : renderCreate();
};

export default ProfileApp;
