import React, { useState, useRef } from 'react';
import { AppRoute, Character, Memory } from '../../types';
import { AVATAR_COLORS } from '../../constants';

interface CreateCharacterAppProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  onNavigate: (route: AppRoute) => void;
  onChatStart: (characterId: string) => void;
}

const CreateCharacterApp: React.FC<CreateCharacterAppProps> = ({ characters, setCharacters, onNavigate, onChatStart }) => {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'DETAIL' | 'MEMORY_LANE'>('LIST');
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Memory Management State
  const [showMemoryMenu, setShowMemoryMenu] = useState(false);
  const [showMemoryEditor, setShowMemoryEditor] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null); // Null = creating new
  const [editorContent, setEditorContent] = useState('');

  // Form State
  const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=C&background=e5e7eb&color=374151&size=200&font-size=0.5&rounded=true';
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [prompt, setPrompt] = useState('');
  const [lore, setLore] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setDesc('');
    setPrompt('');
    setLore('');
    setAvatarUrl(DEFAULT_AVATAR);
    setSelectedChar(null);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const newChar: Character = {
      id: Date.now().toString(),
      name: name,
      description: desc || '新创建的智能体',
      systemPrompt: prompt || '你是一个乐于助人的中文 AI 助手。',
      lore: lore,
      avatar: avatarUrl,
      color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      memories: [],
    };

    setCharacters(prev => [...prev, newChar]);
    resetForm();
    setView('LIST');
  };

  // Triggered when clicking the delete button
  const handleDeleteRequest = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // Crucial: prevent opening the detail view
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  // Confirm deletion logic
  const confirmDelete = () => {
    if (deleteTargetId) {
        setCharacters(prev => prev.filter(c => c.id !== deleteTargetId));
        
        // If we deleted the character currently in detail view, go back to list
        if (view === 'DETAIL' && selectedChar?.id === deleteTargetId) {
            setView('LIST');
            setSelectedChar(null);
        }
        
        setShowDeleteModal(false);
        setDeleteTargetId(null);
    }
  };

  // Cancel deletion logic
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTargetId(null);
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

  const openDetail = (char: Character) => {
    setSelectedChar(char);
    setView('DETAIL');
  };

  // --- Memory Functions ---

  const toggleMemoryActive = (memoryId: string) => {
      if (!selectedChar) return;
      
      const updatedMemories = (selectedChar.memories || []).map(m => 
          m.id === memoryId ? { ...m, isActive: !m.isActive } : m
      );

      const updatedChar = { ...selectedChar, memories: updatedMemories };
      setSelectedChar(updatedChar);
      setCharacters(prev => prev.map(c => c.id === selectedChar.id ? updatedChar : c));
  };

  const handleOpenEditor = (memory: Memory | null = null) => {
      setEditingMemory(memory);
      setEditorContent(memory ? memory.content : '');
      setShowMemoryEditor(true);
      setShowMemoryMenu(false); // Close menu if open
  };

  const handleSaveMemory = () => {
      if (!selectedChar || !editorContent.trim()) return;

      let updatedMemories = [...(selectedChar.memories || [])];

      if (editingMemory) {
          // Edit existing
          updatedMemories = updatedMemories.map(m => 
              m.id === editingMemory.id ? { ...m, content: editorContent } : m
          );
      } else {
          // Create new
          const newMemory: Memory = {
              id: Date.now().toString(),
              date: new Date().toLocaleDateString('zh-CN'),
              content: editorContent,
              isActive: true
          };
          updatedMemories = [newMemory, ...updatedMemories];
      }

      const updatedChar = { ...selectedChar, memories: updatedMemories };
      setSelectedChar(updatedChar);
      setCharacters(prev => prev.map(c => c.id === selectedChar.id ? updatedChar : c));
      
      setShowMemoryEditor(false);
      setEditingMemory(null);
      setEditorContent('');
  };

  const handleDeleteMemory = (id: string) => {
      if (!selectedChar) return;
      const updatedMemories = selectedChar.memories.filter(m => m.id !== id);
      const updatedChar = { ...selectedChar, memories: updatedMemories };
      setSelectedChar(updatedChar);
      setCharacters(prev => prev.map(c => c.id === selectedChar.id ? updatedChar : c));
      setShowMemoryEditor(false);
  };

  const handleClearAllMemories = () => {
      if (!selectedChar) return;
      if (confirm("确定要清空所有回忆吗？此操作无法撤销。")) {
          const updatedChar = { ...selectedChar, memories: [] };
          setSelectedChar(updatedChar);
          setCharacters(prev => prev.map(c => c.id === selectedChar.id ? updatedChar : c));
          setShowMemoryMenu(false);
      }
  };

  // --- Views ---

  const renderMemoryLane = () => {
      if (!selectedChar) return null;
      const memories = selectedChar.memories || [];

      return (
        <div className="w-full h-full bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col pt-10 animate-fade-in font-sans relative text-gray-800">
             {/* Header */}
            <div className="px-4 pb-3 flex items-center justify-between border-b border-white/20 bg-white/30 backdrop-blur-md sticky top-0 z-10 h-[44px]">
                <button 
                onClick={() => setView('DETAIL')} 
                className="text-ios-blue text-[17px] hover:opacity-70 transition-opacity flex items-center -ml-1 font-medium"
                >
                <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                返回
                </button>
                <h1 className="text-[17px] font-semibold text-black/90 absolute left-1/2 transform -translate-x-1/2 tracking-wide">我们的回忆</h1>
                <button 
                    onClick={() => setShowMemoryMenu(true)}
                    className="text-ios-blue hover:opacity-70 transition-opacity text-[16px] font-medium"
                >
                    编辑
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
                {memories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 opacity-80 animate-pulse">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                             <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <p className="text-[15px] font-medium tracking-wide">暂无记忆</p>
                        <p className="text-[12px] mt-2 text-gray-400 text-center max-w-[200px]">
                            点击右上角“编辑”可手动添加总结。<br/>或在聊天中让 AI 自动生成。
                        </p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-purple-200/60 ml-3 space-y-8 pb-10 pt-2">
                        {memories.map((memory, idx) => (
                            <div key={memory.id} className="relative pl-8 group animate-slide-up" style={{animationDelay: `${idx * 0.1}s`}}>
                                {/* Dot on timeline */}
                                <div className={`absolute left-[-5px] top-4 w-3 h-3 rounded-full border-2 transition-all duration-500 z-10 ${memory.isActive ? 'bg-red-400 border-red-200 shadow-[0_0_10px_rgba(248,113,113,0.6)] scale-110' : 'bg-gray-100 border-gray-300'}`}></div>
                                
                                <div className="text-[11px] text-gray-500 mb-1.5 font-mono tracking-widest uppercase flex items-center gap-2 font-medium">
                                    {memory.date}
                                </div>
                                
                                <div className={`backdrop-blur-xl rounded-2xl border transition-all duration-300 relative overflow-hidden group-hover:border-purple-200/80 flex flex-col ${memory.isActive ? 'bg-gradient-to-br from-white to-pink-50/50 border-pink-200 shadow-sm' : 'bg-white/40 border-white/50 grayscale-[0.8] opacity-80'}`}>
                                    {/* Quote Icon Background */}
                                    <svg className="absolute -top-2 -left-2 w-12 h-12 text-black/5 pointer-events-none transform -rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" /></svg>

                                    {/* Content Area */}
                                    <div className="p-5 pb-2 relative z-10">
                                        <p className="text-[15px] leading-7 text-gray-800 whitespace-pre-wrap font-normal break-words">
                                            {memory.content}
                                        </p>
                                    </div>
                                    
                                    {/* Actions Footer */}
                                    <div className="px-4 pb-3 pt-2 mt-auto flex items-center justify-between relative z-10 border-t border-transparent">
                                        {/* Edit Link */}
                                        <button 
                                            onClick={() => handleOpenEditor(memory)}
                                            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1.5 rounded hover:bg-black/5 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                            编辑
                                        </button>

                                        {/* Toggle Active Button (Big Pill Style) */}
                                        <button 
                                            onClick={() => toggleMemoryActive(memory.id)}
                                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all active:scale-95 shadow-sm border ${
                                                memory.isActive 
                                                ? 'bg-red-500 border-red-500 text-white shadow-red-200' 
                                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                            }`}
                                        >
                                            <svg className={`w-4 h-4 ${memory.isActive ? 'fill-current' : 'fill-none'}`} stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                            {memory.isActive ? '已铭记' : '铭记'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Menu Modal (Action Sheet) */}
            {showMemoryMenu && (
                <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-end animate-fade-in" onClick={() => setShowMemoryMenu(false)}>
                    <div className="w-full bg-white/90 backdrop-blur-xl rounded-t-[20px] p-4 pb-8 space-y-2 animate-slide-up shadow-2xl border-t border-white/50" onClick={e => e.stopPropagation()}>
                        <div className="text-center text-gray-400 text-xs mb-2">管理回忆</div>
                        <button 
                            onClick={() => handleOpenEditor(null)}
                            className="w-full bg-white py-3.5 rounded-[14px] text-[17px] font-medium text-ios-blue active:bg-gray-50 shadow-sm flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            手动总结
                        </button>
                        <button 
                            onClick={handleClearAllMemories}
                            className="w-full bg-white py-3.5 rounded-[14px] text-[17px] font-medium text-red-500 active:bg-gray-50 shadow-sm flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            清空回忆
                        </button>
                        <button 
                            onClick={() => setShowMemoryMenu(false)}
                            className="w-full bg-white py-3.5 rounded-[14px] text-[17px] font-semibold text-black active:bg-gray-50 shadow-sm mt-2"
                        >
                            取消
                        </button>
                    </div>
                </div>
            )}

            {/* Editor Modal */}
            {showMemoryEditor && (
                <div className="absolute inset-0 z-50 bg-black/30 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <span className="font-bold text-gray-800">{editingMemory ? '编辑回忆' : '手动总结'}</span>
                            {editingMemory && (
                                <button onClick={() => handleDeleteMemory(editingMemory.id)} className="text-red-500 text-sm font-medium px-2 py-1 rounded hover:bg-red-50">删除</button>
                            )}
                        </div>
                        <div className="p-4">
                            <textarea 
                                value={editorContent}
                                onChange={(e) => setEditorContent(e.target.value)}
                                className="w-full h-40 p-3 bg-gray-100 rounded-xl text-[15px] leading-relaxed outline-none resize-none focus:ring-2 focus:ring-purple-200 transition-all"
                                placeholder="输入想要记录的核心回忆内容..."
                                autoFocus
                            />
                        </div>
                        <div className="flex border-t border-gray-100 h-[50px]">
                            <button 
                                onClick={() => setShowMemoryEditor(false)}
                                className="flex-1 text-gray-500 text-[16px] active:bg-gray-50 border-r border-gray-100 transition-colors"
                            >
                                取消
                            </button>
                            <button 
                                onClick={handleSaveMemory}
                                disabled={!editorContent.trim()}
                                className={`flex-1 text-ios-blue text-[16px] font-semibold active:bg-gray-50 transition-colors ${!editorContent.trim() ? 'opacity-50' : ''}`}
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
  }

  const renderList = () => (
    <div className="w-full h-full bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col pt-10 animate-slide-right font-sans relative">
      {/* Header */}
      <div className="px-4 pb-3 flex items-center justify-between border-b border-white/20 bg-white/30 backdrop-blur-md sticky top-0 z-10 h-[44px]">
        <button 
          onClick={() => onNavigate(AppRoute.HOME)} 
          className="text-ios-blue text-[17px] hover:opacity-70 transition-opacity flex items-center -ml-1 font-medium"
        >
          <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          主屏幕
        </button>
        <h1 className="text-[17px] font-semibold text-black/90 absolute left-1/2 transform -translate-x-1/2">角色库</h1>
        <button 
          onClick={() => { resetForm(); setView('CREATE'); }}
          className="text-ios-blue hover:opacity-70 transition-opacity"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
        </button>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto pt-6">
        <div className="border-t border-b border-white/20 bg-white/30 backdrop-blur-sm">
           {characters.map((char) => (
             /* Swipeable Container using CSS Scroll Snap */
             <div 
                key={char.id} 
                className="w-full overflow-x-auto flex snap-x snap-mandatory no-scrollbar relative touch-pan-x"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
             >
                 {/* Content - Snap Start */}
                 <div 
                    className="min-w-full w-full snap-center flex items-center p-3 pl-4 bg-transparent active:bg-white/40 transition-colors border-b border-white/20 last:border-0 cursor-pointer"
                    onClick={() => openDetail(char)}
                 >
                    <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border border-white/50 mr-3 flex-shrink-0 shadow-sm">
                        <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-[17px] font-medium text-black/90 truncate">{char.name}</h3>
                        <p className="text-[14px] text-gray-600 truncate">{char.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                 </div>

                 {/* Delete Button - Snap End */}
                 <div className="snap-center h-auto flex bg-transparent border-b border-white/20 last:border-0">
                    <button
                        className="w-[90px] bg-red-500/90 backdrop-blur-md text-white font-medium h-full flex items-center justify-center active:bg-red-600 transition-colors cursor-pointer select-none"
                        onClick={(e) => handleDeleteRequest(e, char.id)}
                    >
                        删除
                    </button>
                 </div>
             </div>
           ))}
        </div>
        <p className="text-center text-gray-500 text-xs mt-4 px-10">
            向左滑动列表项可删除角色
            <br/>点击右上角 + 创建新角色
        </p>
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedChar) return null;
    return (
        <div className="w-full h-full bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col pt-10 animate-slide-left font-sans relative">
             {/* Header */}
            <div className="px-4 pb-3 flex items-center justify-between border-b border-white/20 bg-white/30 backdrop-blur-md sticky top-0 z-10 h-[44px]">
                <button 
                onClick={() => setView('LIST')} 
                className="text-ios-blue text-[17px] hover:opacity-70 transition-opacity flex items-center -ml-1 font-medium"
                >
                <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                返回
                </button>
                <h1 className="text-[17px] font-semibold text-black/90 absolute left-1/2 transform -translate-x-1/2">详细信息</h1>
                <button 
                onClick={() => onChatStart(selectedChar.id)}
                className="text-ios-blue text-[17px] hover:opacity-70 transition-opacity flex items-center font-medium"
                >
                 去聊天
                 <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-10">
                {/* Hero Profile */}
                <div className="bg-white/30 backdrop-blur-sm pb-6 pt-8 flex flex-col items-center border-b border-white/20 mb-6">
                    <div className="w-24 h-24 rounded-full p-1 border border-white/50 shadow-sm mb-3 bg-white/50">
                         <img src={selectedChar.avatar} className="w-full h-full rounded-full object-cover" />
                    </div>
                    <h2 className="text-2xl font-bold text-black/90 mb-1">{selectedChar.name}</h2>
                    <span className="text-gray-600 text-sm px-8 text-center mb-4 block">{selectedChar.description}</span>
                    
                    {/* MEMORY LANE BUTTON */}
                    <button 
                        onClick={() => setView('MEMORY_LANE')}
                        className="px-5 py-2 bg-indigo-100 text-indigo-600 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-indigo-200 transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        我们的回忆
                    </button>
                </div>

                {/* Settings Block */}
                <div className="space-y-6 px-4">
                    <div>
                        <div className="uppercase text-gray-600 text-[13px] mb-2 pl-3 font-medium">人设提示词</div>
                        <div className="bg-white/40 backdrop-blur-md rounded-[10px] p-4 text-[15px] leading-relaxed text-gray-800 shadow-sm border border-white/30">
                            {selectedChar.systemPrompt}
                        </div>
                    </div>

                    {selectedChar.lore && (
                        <div>
                            <div className="uppercase text-gray-600 text-[13px] mb-2 pl-3 font-medium">世界书 / 背景</div>
                            <div className="bg-white/40 backdrop-blur-md rounded-[10px] p-4 text-[15px] leading-relaxed text-gray-800 shadow-sm border border-white/30 whitespace-pre-wrap">
                                {selectedChar.lore}
                            </div>
                        </div>
                    )}

                    {/* Additional Delete Option in Details for robustness */}
                    <div className="pt-4">
                        <button 
                            onClick={(e) => handleDeleteRequest(e, selectedChar.id)}
                            className="w-full bg-white/60 backdrop-blur-md text-red-500 font-medium text-[17px] py-3 rounded-[12px] shadow-sm active:bg-gray-50/50 transition-colors border border-white/30"
                        >
                            删除角色
                        </button>
                    </div>
                </div>

                <div className="mt-8 px-4">
                     <button 
                        onClick={() => onChatStart(selectedChar.id)}
                        className="w-full bg-ios-blue text-white font-semibold text-[17px] py-3 rounded-[12px] shadow-sm active:scale-95 transition-transform"
                     >
                        发消息
                     </button>
                </div>
            </div>
        </div>
    )
  }

  const renderForm = () => (
    <div className="w-full h-full bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col pt-10 animate-slide-left font-sans">
      {/* Header */}
      <div className="px-4 pb-3 flex items-center justify-between border-b border-white/20 bg-white/30 backdrop-blur-md sticky top-0 z-10 h-[44px]">
        <button 
          onClick={() => {
              resetForm();
              setView('LIST');
          }} 
          className="text-ios-blue text-[17px] hover:opacity-70 transition-opacity font-medium"
        >
          取消
        </button>
        <h1 className="text-[17px] font-semibold text-black/90 absolute left-1/2 transform -translate-x-1/2">新建角色</h1>
        <button 
          onClick={handleSave}
          disabled={!name.trim()}
          className={`font-semibold text-[17px] transition-all ${!name.trim() ? 'text-gray-400' : 'text-ios-blue hover:opacity-70'}`}
        >
          完成
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-20">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center space-y-3">
            <div 
              onClick={handleAvatarClick}
              className="w-28 h-28 rounded-full bg-white/50 shadow-md p-1 cursor-pointer active:scale-95 transition-transform border border-white/50 relative group"
            >
               <img 
                 src={avatarUrl} 
                 className="w-full h-full rounded-full bg-gray-100 object-cover"
                 alt="Avatar Preview"
               />
               <div className="absolute bottom-1 right-1 bg-ios-blue text-white rounded-full p-2 shadow-sm border-2 border-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
               </div>
               <div className="absolute inset-0 bg-black/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-medium text-xs drop-shadow-md">更换</span>
               </div>
            </div>
            <span className="text-ios-blue text-[15px] cursor-pointer font-medium" onClick={handleAvatarClick}>
               {avatarUrl === DEFAULT_AVATAR ? '设置头像' : '更换头像'}
            </span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
        </div>

        {/* Basic Info */}
        <div>
            <div className="uppercase text-gray-600 text-[13px] mb-2 pl-3 font-medium">基本信息</div>
            <div className="bg-white/40 backdrop-blur-md rounded-[10px] overflow-hidden shadow-sm border border-white/30">
                <div className="flex items-center px-4 py-3 border-b border-gray-100/50">
                    <span className="w-20 text-[17px] text-black">名称</span>
                    <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 outline-none text-[17px] text-black placeholder-gray-500 bg-transparent text-right"
                    placeholder="必填"
                    autoFocus
                    />
                </div>
                <div className="flex items-center px-4 py-3">
                    <span className="w-20 text-[17px] text-black">简介</span>
                    <input 
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="flex-1 outline-none text-[17px] text-black placeholder-gray-500 bg-transparent text-right"
                    placeholder="在列表显示的短语"
                    />
                </div>
            </div>
        </div>

        {/* System Prompt */}
        <div>
            <div className="uppercase text-gray-600 text-[13px] mb-2 pl-3 font-medium">人设 / 提示词</div>
            <div className="bg-white/40 backdrop-blur-md rounded-[10px] overflow-hidden shadow-sm border border-white/30 p-4">
                <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full outline-none text-[17px] text-black placeholder-gray-500 h-32 resize-none bg-transparent leading-relaxed"
                placeholder="在这里定义角色的性格、背景故事和说话方式。例如：'你是一个严厉的数学老师...' (默认为通用助手)"
                />
            </div>
        </div>

        {/* World Book / Lore */}
        <div>
            <div className="uppercase text-gray-600 text-[13px] mb-2 pl-3 font-medium">世界书 / 人设背景</div>
            <div className="bg-white/40 backdrop-blur-md rounded-[10px] overflow-hidden shadow-sm border border-white/30 p-4">
                <textarea 
                value={lore}
                onChange={(e) => setLore(e.target.value)}
                className="w-full outline-none text-[17px] text-black placeholder-gray-500 h-32 resize-none bg-transparent leading-relaxed"
                placeholder="添加关于世界的详细设定、人物关系或其他背景知识。这部分内容将作为上下文补充给 AI。"
                />
            </div>
            <p className="text-[13px] text-gray-500 mt-2 px-3 leading-normal">
                世界书用于补充更宏大的背景设定，增强角色沉浸感。
            </p>
        </div>

      </div>
    </div>
  );

  return (
    <div className="w-full h-full relative">
       {view === 'CREATE' && renderForm()}
       {view === 'DETAIL' && renderDetail()}
       {view === 'LIST' && renderList()}
       {view === 'MEMORY_LANE' && renderMemoryLane()}
       
       {/* Global Modal Overlay */}
       {showDeleteModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="w-[270px] bg-white/80 backdrop-blur-2xl rounded-[14px] text-center overflow-hidden shadow-2xl transform scale-100 transition-all border border-white/50">
                <div className="p-5 border-b border-gray-300/50">
                    <h3 className="text-[17px] font-semibold text-black mb-1">删除角色</h3>
                    <p className="text-[13px] text-black leading-snug">
                       你确定要删除该角色吗？<br/>
                       删除后你会丧失和该角色的记忆和连接。
                    </p>
                </div>
                <div className="flex h-[44px]">
                    <button 
                        onClick={cancelDelete} 
                        className="flex-1 text-[17px] text-ios-blue active:bg-gray-100/50 transition-colors border-r border-gray-300/50 font-normal"
                    >
                        取消
                    </button>
                    <button 
                        onClick={confirmDelete} 
                        className="flex-1 text-[17px] text-ios-red font-semibold active:bg-gray-100/50 transition-colors"
                    >
                        删除
                    </button>
                </div>
            </div>
        </div>
       )}
    </div>
  );
};

export default CreateCharacterApp;