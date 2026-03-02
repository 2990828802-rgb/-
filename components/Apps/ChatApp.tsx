import React, { useState, useEffect, useRef } from 'react';
import { AppRoute, Character, ChatSession, Message, MessageRole, ApiSettings, Sticker, UserPersona, VideoCallConfig, Memory, Moment } from '../../types';
import { sendMessageStream } from '../../services/llmService';
import { Plus, Users, MessageCircle, MoreVertical, X, Check } from 'lucide-react';

interface ChatAppProps {
  characters: Character[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  onNavigate: (route: AppRoute) => void;
  settings: ApiSettings;
  stickers: Sticker[];
  setStickers: React.Dispatch<React.SetStateAction<Sticker[]>>;
  initialCharacterId?: string | null;
  onClearTarget?: () => void;
  userPersonas: UserPersona[];
  activePersonaId: string | null;
  characterBindings: Record<string, string>;
  // Persistence Props
  sessions: Record<string, ChatSession>;
  setSessions: React.Dispatch<React.SetStateAction<Record<string, ChatSession>>>;
  moments: Moment[];
}

// Updated Regex to handle PRODUCT and ORDER tags
const CONTENT_REGEX = /(\[STICKER::.*?::.*?\]|\[TRANSFER::.*?::.*?\]|\[IMAGE::.*?\]|\[VOICECALL::.*?::.*?\]|\[VIDEO_LOG::.*?::.*?\]|\[VOICE::.*?::.*?\]|\[EMOTION::.*?\]|\[QUOTE::.*?::.*?\]|\[PRODUCT::.*?::.*?::.*?\]|\[ORDER::.*?::.*?::.*?\])/g;

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Convert CSS string (e.g. "border: 1px red;") to React Style Object
const parseStyleString = (styleString?: string): React.CSSProperties => {
    if (!styleString) return {};
    const style: any = {};
    styleString.split(';').forEach((entry) => {
        let [key, value] = entry.split(':');
        if (!key || !value) return;
        key = key.trim();
        value = value.trim();
        // Convert kebab-case to camelCase
        key = key.replace(/-./g, (x) => x[1].toUpperCase());
        style[key] = value;
    });
    return style;
};

// Unicode-safe Base64 helpers
const utoa = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
    }));
};

const atou = (str: string) => {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
};

// Default Video Scripts (Visuals allowed)
const DEFAULT_VIDEO_SCRIPTS = [
    "*调整了一下镜头，微笑着看着你* 喂？听得到吗？",
    "*眼神有些游离，似乎在想心事* 刚才还在想你，你就打过来了。",
    "*轻轻叹了口气，随即露出笑容* 其实...这种感觉挺奇妙的。",
    "*凑近屏幕，仔细端详着你* 你那边安静吗？我想听听你的声音。",
    "嗯...我在听，你说。 *托着下巴，专注地注视着*"
];

// Default Audio Scripts (Auditory/Tone only)
const DEFAULT_AUDIO_SCRIPTS = [
    "喂？听得到吗？",
    "*听筒里传来轻微的呼吸声* 刚才还在想你，你就打过来了。",
    "*语气变得温柔* 其实...听到你的声音感觉挺好的。",
    "你那边安静吗？我想多听听你的声音。",
    "嗯...我在听，你说。 *沉默片刻*"
];

const EMOTION_LABELS: Record<string, string> = {
    normal: '正常',
    happy: '开心',
    sad: '难过',
    angry: '生气',
    jealous: '吃醋',
    excited: '兴奋',
    shy: '害羞'
};

const PRESET_PRODUCTS = [
    { name: '🍇 喜茶·多肉葡萄', price: '28', img: 'https://img.icons8.com/color/96/bubble-tea.png' },
    { name: '📱 iPhone 16 Pro', price: '9999', img: 'https://img.icons8.com/color/96/mac-os.png' },
    { name: '🎁 神秘盲盒', price: '59', img: 'https://img.icons8.com/color/96/gift.png' },
    { name: '🎮 PS5 Pro', price: '3899', img: 'https://img.icons8.com/color/96/ps-controller.png' },
    { name: '✨ LOEWE 香氛', price: '580', img: 'https://img.icons8.com/color/96/perfume-bottle.png' },
    { name: '🍗 肯德基全家桶', price: '99', img: 'https://img.icons8.com/color/96/fried-chicken.png' }
];

const PRESET_ORDERS: { store: string; item: string; status: string; icon?: string }[] = [
    { store: '麦当劳 McDonald\'s', item: '🍔 巨无霸套餐 + 麦乐鸡', status: '待代付', icon: '🍔' },
    { store: '星巴克 Starbucks', item: '☕ 冰美式 (大杯) x2', status: '待代付', icon: '☕' },
    { store: '海底捞火锅', item: '🍲 外送双人套餐', status: '待代付', icon: '🍲' },
    { store: '一点点', item: '🧋 波霸奶茶 (五分糖)', status: '待代付', icon: '🧋' }
];

type CallStatus = 'IDLE' | 'DIALING' | 'INCOMING' | 'CONNECTED';

interface VideoLogEntry {
    role: 'user' | 'model';
    content: string;
    emotion?: string;
}

const ChatApp: React.FC<ChatAppProps> = ({ 
  characters, 
  setCharacters,
  onNavigate, 
  settings, 
  stickers,
  setStickers,
  initialCharacterId, 
  onClearTarget,
  userPersonas,
  activePersonaId,
  characterBindings,
  sessions,
  setSessions,
  moments
}) => {
  const [view, setView] = useState<'LIST' | 'CONVERSATION'>('LIST');
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  
  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // Customization State
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false); 
  const [styleTab, setStyleTab] = useState<'BASIC' | 'CODE'>('BASIC');
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Settings Modal Specific State
  const [contextLimit, setContextLimit] = useState(500);
  const [hideSystemLogs, setHideSystemLogs] = useState(false);
  const [keepLastMessages, setKeepLastMessages] = useState(true);

  // New Features State
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [showTakeoutModal, setShowTakeoutModal] = useState(false);
  // Custom Inputs
  const [customProdName, setCustomProdName] = useState('');
  const [customProdPrice, setCustomProdPrice] = useState('');
  const [customOrderStore, setCustomOrderStore] = useState('');
  const [customOrderItem, setCustomOrderItem] = useState('');

  // Group Chat State
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<Set<string>>(new Set());

  // Conversation State
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI State
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showRegenerateToast, setShowRegenerateToast] = useState(false);
  const [isGeneratingMemory, setIsGeneratingMemory] = useState(false);
  
  // --- Message Interaction State ---
  const [contextMenuMsgId, setContextMenuMsgId] = useState<string | null>(null); 
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [replyTarget, setReplyTarget] = useState<{id: string, content: string, name: string} | null>(null);
  const [editingMsg, setEditingMsg] = useState<{id: string, content: string} | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  // Transfer Modal State
  const [showTransferInput, setShowTransferInput] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');

  // Transfer Interaction State
  const [showTransferAction, setShowTransferAction] = useState(false);
  const [activeTransferMsgId, setActiveTransferMsgId] = useState<string | null>(null);

  // --- Voice Call State ---
  const [callStatus, setCallStatus] = useState<CallStatus>('IDLE');
  const [scriptIndex, setScriptIndex] = useState(0);
  const [voiceScripts, setVoiceScripts] = useState<string[]>(DEFAULT_AUDIO_SCRIPTS); 
  const [callDuration, setCallDuration] = useState(0);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [voiceInputText, setVoiceInputText] = useState('');
  const [isVoiceStreamActive, setIsVoiceStreamActive] = useState(false);
  
  const voiceLogRef = useRef<VideoLogEntry[]>([]);

  // --- Voice Message State ---
  const [showVoiceMsgInput, setShowVoiceMsgInput] = useState(false);
  const [voiceMsgText, setVoiceMsgText] = useState('');
  const [transcribedMsgIds, setTranscribedMsgIds] = useState<Set<string>>(new Set());

  // --- Video Call State ---
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [videoAssetTarget, setVideoAssetTarget] = useState<keyof VideoCallConfig['emotions'] | 'background'>('normal');
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const [videoCallDuration, setVideoCallDuration] = useState(0); 
  const [showVideoInput, setShowVideoInput] = useState(false); 
  const [videoInputMsg, setVideoInputMsg] = useState('');
  const [showVideoRegenToast, setShowVideoRegenToast] = useState(false);
  const [videoEmotion, setVideoEmotion] = useState<keyof VideoCallConfig['emotions']>('normal'); 
  
  const videoLogRef = useRef<VideoLogEntry[]>([]);

  const activeCharacter = characters.find(c => c.id === activeCharacterId);
  const currentSession = activeCharacterId ? sessions[activeCharacterId] : null;

  // Handle direct navigation
  useEffect(() => {
    if (initialCharacterId) {
      const charExists = characters.find(c => c.id === initialCharacterId);
      if (charExists) {
        handleCreateSession(initialCharacterId);
        if (onClearTarget) onClearTarget();
      }
    }
  }, [initialCharacterId, characters]);

  useEffect(() => {
    if (view === 'CONVERSATION' && callStatus === 'IDLE' && !isVideoCallActive && !isMultiSelectMode) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessions, view, isTyping, showStickerPicker, callStatus, isVideoCallActive, isMultiSelectMode]);

  // Voice Call Timer & Init
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (callStatus === 'DIALING') {
        timer = setTimeout(() => {
            setCallStatus('CONNECTED');
            setScriptIndex(0);
            setCallDuration(0);
            setVoiceScripts(DEFAULT_AUDIO_SCRIPTS); 
            voiceLogRef.current = []; // Reset log on connect
        }, 3500);
    }
    return () => clearTimeout(timer);
  }, [callStatus]);

  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (callStatus === 'CONNECTED') {
          interval = setInterval(() => {
              setCallDuration(prev => prev + 1);
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [callStatus]);

  // Video Call Timer & Init
  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (isVideoCallActive) {
          interval = setInterval(() => {
              setVideoCallDuration(prev => prev + 1);
          }, 1000);
          // Initialize Video Call with Video Scripts
          if (videoCallDuration === 0) {
              setVoiceScripts(DEFAULT_VIDEO_SCRIPTS);
              setScriptIndex(0);
          }
          setVideoEmotion('normal'); 
          videoLogRef.current = []; 
      } else {
          setVideoCallDuration(0);
          setVideoInputMsg('');
          setShowVideoInput(false);
          setVideoEmotion('normal');
      }
      return () => clearInterval(interval);
  }, [isVideoCallActive]);

  const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateSession = (charId: string) => {
    if (!sessions[charId]) {
      setSessions(prev => ({
        ...prev,
        [charId]: {
          id: charId,
          type: 'direct',
          characterId: charId,
          messages: [],
          lastMessageAt: Date.now(),
          background: null,
          userBubbleColor: '#d1eafe',
          botBubbleColor: '#ffffff',
          customBubbleCss: '',
          customAvatarFrameCss: '',
          videoConfig: {
              scale: 1.0,
              emotions: {}
          }
        }
      }));
    }
    setActiveCharacterId(charId);
    setView('CONVERSATION');
  };

  const handleCreateGroupSession = () => {
      if (!newGroupName.trim() || selectedGroupMembers.size < 2) {
          alert("请输入群聊名称并至少选择两个角色");
          return;
      }
      const groupId = `group_${Date.now()}`;
      const newSession: ChatSession = {
          id: groupId,
          type: 'group',
          members: Array.from(selectedGroupMembers),
          name: newGroupName,
          messages: [],
          lastMessageAt: Date.now(),
          userBubbleColor: '#d1eafe',
          botBubbleColor: '#ffffff',
          videoConfig: { scale: 1.0, emotions: {} }
      };
      setSessions(prev => ({ ...prev, [groupId]: newSession }));
      setActiveCharacterId(groupId);
      setView('CONVERSATION');
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setSelectedGroupMembers(new Set());
  };

  const handleSendMessage = async (contentOverride?: string, isVoiceSimulation: boolean = false) => {
    const textToSend = contentOverride || inputMessage;
    if (!textToSend.trim() || !activeCharacterId) return;

    if (!isVoiceSimulation) {
        setInputMessage('');
        setShowStickerPicker(false);
        setShowActionMenu(false);
        setShowTransferInput(false);
        setTransferAmount('');
        
        // Handle Reply
        let finalContent = textToSend;
        if (replyTarget) {
            const shortQuote = replyTarget.content.length > 20 ? replyTarget.content.substring(0, 20) + '...' : replyTarget.content;
            finalContent = `[QUOTE::${replyTarget.name}::${shortQuote}]\n${textToSend}`;
            setReplyTarget(null);
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: MessageRole.USER,
            content: finalContent,
            timestamp: Date.now()
        };

        // Construct new message list explicitly to avoid state update lag when calling API
        const currentSessionMessages = sessions[activeCharacterId]?.messages || [];
        const newMessages = [...currentSessionMessages, userMsg];

        setSessions(prev => {
            const session = prev[activeCharacterId] || { 
                characterId: activeCharacterId, 
                messages: [], 
                lastMessageAt: Date.now(),
                userBubbleColor: '#d1eafe',
                botBubbleColor: '#ffffff'
            };
            return {
                ...prev,
                [activeCharacterId]: {
                ...session,
                messages: [...session.messages, userMsg],
                lastMessageAt: Date.now(),
                }
            };
        });
        
        // DO NOT Auto Reply. User must click Heart to trigger.
        // handleTriggerAiReply(newMessages); 
    } else {
        if (isVideoCallActive) {
             videoLogRef.current.push({ role: 'user', content: textToSend });
        } else if (callStatus === 'CONNECTED') {
             voiceLogRef.current.push({ role: 'user', content: textToSend });
        }
        handleTriggerVoiceAiReply(textToSend);
        setVoiceInputText('');
        setShowVoiceInput(false);
    }
  };

  // ... (Touch/Mouse/Menu handlers kept the same)
  const handleTouchStart = (msgId: string) => {
      if (isMultiSelectMode) return;
      longPressTimerRef.current = setTimeout(() => {
          setContextMenuMsgId(msgId);
          if (navigator.vibrate) navigator.vibrate(50);
      }, 600); // 600ms for long press
  };

  const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };
  
  const handleMouseDown = (msgId: string) => {
      if (isMultiSelectMode) return;
      longPressTimerRef.current = setTimeout(() => {
          setContextMenuMsgId(msgId);
      }, 600);
  };
  
  const handleMouseUp = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };

  const handleContextMenuAction = (action: 'copy' | 'reply' | 'edit' | 'delete' | 'multi_select') => {
      if (!activeCharacterId || !contextMenuMsgId) return;
      const session = sessions[activeCharacterId];
      const msg = session.messages.find(m => m.id === contextMenuMsgId);
      if (!msg) return;

      switch(action) {
          case 'copy':
              const cleanText = msg.content.replace(/\[.*?\]/g, '').trim() || msg.content;
              navigator.clipboard.writeText(cleanText);
              break;
          case 'reply':
              const isUser = msg.role === MessageRole.USER;
              const name = isUser ? "我" : (activeCharacter?.name || "TA");
              const simpleContent = msg.content.replace(/\[.*?\]/g, '[媒体/特殊消息]').trim();
              setReplyTarget({ id: msg.id, content: simpleContent, name });
              break;
          case 'edit':
              setEditingMsg({ id: msg.id, content: msg.content });
              break;
          case 'delete':
              setSessions(prev => ({
                  ...prev,
                  [activeCharacterId]: {
                      ...session,
                      messages: session.messages.filter(m => m.id !== contextMenuMsgId)
                  }
              }));
              break;
          case 'multi_select':
              setIsMultiSelectMode(true);
              setSelectedMsgIds(new Set([contextMenuMsgId]));
              break;
      }
      setContextMenuMsgId(null);
  };

  const handleMultiSelectToggle = (msgId: string) => {
      setSelectedMsgIds(prev => {
          const next = { ...prev };
          if (next.has(msgId)) next.delete(msgId);
          else next.add(msgId);
          return next;
      });
  };

  const handleMultiDelete = () => {
      if (!activeCharacterId) return;
      if (confirm(`确定删除选中的 ${selectedMsgIds.size} 条消息吗？`)) {
          setSessions(prev => ({
              ...prev,
              [activeCharacterId]: {
                  ...prev[activeCharacterId],
                  messages: prev[activeCharacterId].messages.filter(m => !selectedMsgIds.has(m.id))
              }
          }));
          setIsMultiSelectMode(false);
          setSelectedMsgIds(new Set());
      }
  };

  const handleClearChatHistory = () => {
      if (!activeCharacterId) return;
      
      setSessions(prev => {
          const session = prev[activeCharacterId];
          let newMessages: Message[] = [];
          
          if (keepLastMessages && session.messages.length > 0) {
              newMessages = session.messages.slice(-10);
          }
          
          return {
              ...prev,
              [activeCharacterId]: {
                  ...prev[activeCharacterId],
                  messages: newMessages
              }
          };
      });
      setShowChatSettings(false);
  };

  const handleSaveEditedMessage = () => {
      if (!activeCharacterId || !editingMsg) return;
      setSessions(prev => ({
          ...prev,
          [activeCharacterId]: {
              ...prev[activeCharacterId],
              messages: prev[activeCharacterId].messages.map(m => 
                  m.id === editingMsg.id ? { ...m, content: editingMsg.content } : m
              )
          }
      }));
      setEditingMsg(null);
  };

  const updateSessionStyle = (key: keyof ChatSession, value: string) => {
      if (!activeCharacterId) return;
      setSessions(prev => ({
          ...prev,
          [activeCharacterId]: {
              ...prev[activeCharacterId],
              [key]: value
          }
      }));
  };

  // Dedicated Handler for Video Input
  const handleSendVideoMessage = () => {
      if (!videoInputMsg.trim()) return;
      videoLogRef.current.push({ role: 'user', content: videoInputMsg });
      handleTriggerVoiceAiReply(videoInputMsg);
      setVideoInputMsg('');
      setShowVideoInput(false);
  };

  const handleVideoRegenerate = () => {
      setShowVideoRegenToast(true);
      setTimeout(() => setShowVideoRegenToast(false), 2500);
      handleTriggerVoiceAiReply("请换个方式再说一遍，或者说点别的。");
  };

  const handleSendVoiceMsg = () => {
      if (!voiceMsgText.trim()) return;
      const duration = Math.max(1, Math.ceil(voiceMsgText.length / 3));
      const content = `[VOICE::${duration}"::${voiceMsgText}]`;
      handleSendMessage(content);
      setVoiceMsgText('');
      setShowVoiceMsgInput(false);
  };

  const toggleTranscription = (msgId: string) => {
      setTranscribedMsgIds(prev => {
          const next = new Set(prev);
          if (next.has(msgId)) {
              next.delete(msgId);
          } else {
              next.add(msgId);
          }
          return next;
      });
  };
  
  const handleHangUp = () => {
      if (callStatus === 'CONNECTED') {
          const durationStr = formatDuration(callDuration);
          const logData = JSON.stringify(voiceLogRef.current);
          const encodedLog = utoa(logData);

          const callMsg: Message = {
            id: Date.now().toString(),
            role: MessageRole.MODEL, 
            content: `[VOICECALL::${durationStr}::${encodedLog}]`,
            timestamp: Date.now()
          };
          
          setSessions(prev => {
            const session = prev[activeCharacterId!];
            return {
                ...prev,
                [activeCharacterId!]: {
                    ...session,
                    messages: [...session.messages, callMsg],
                    lastMessageAt: Date.now()
                }
            }
          });
      }
      setCallStatus('IDLE');
      setCallDuration(0);
      voiceLogRef.current = [];
  };

  const handleVideoHangUp = () => {
      if (isVideoCallActive && activeCharacterId) {
          const durationStr = formatDuration(videoCallDuration);
          const logData = JSON.stringify(videoLogRef.current);
          const encodedLog = utoa(logData);
          
          const callMsg: Message = {
            id: Date.now().toString(),
            role: MessageRole.MODEL,
            content: `[VIDEO_LOG::${durationStr}::${encodedLog}]`, 
            timestamp: Date.now()
          };
          
          setSessions(prev => {
            const session = prev[activeCharacterId];
            return {
                ...prev,
                [activeCharacterId]: {
                    ...session,
                    messages: [...session.messages, callMsg],
                    lastMessageAt: Date.now()
                }
            }
          });
      }
      setIsVideoCallActive(false);
      setVideoCallDuration(0);
      setVideoEmotion('normal');
      videoLogRef.current = [];
  };

  const handleAcceptCall = () => {
      setCallStatus('CONNECTED');
      setScriptIndex(0);
      setCallDuration(0);
      setVoiceScripts(DEFAULT_AUDIO_SCRIPTS);
      voiceLogRef.current = []; // Reset Log
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeCharacterId) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            handleSendMessage(`[IMAGE::${base64}]`);
        };
        reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };
  
  const handleBackgroundSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeCharacterId) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setSessions(prev => ({
                ...prev,
                [activeCharacterId]: {
                    ...prev[activeCharacterId],
                    background: reader.result as string
                }
            }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleVideoAssetSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeCharacterId) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setSessions(prev => {
                const session = prev[activeCharacterId];
                const currentConfig = session.videoConfig || { scale: 1.0, emotions: {} };
                
                if (videoAssetTarget === 'background') {
                    return {
                        ...prev,
                        [activeCharacterId]: {
                            ...session,
                            videoConfig: { ...currentConfig, background: result }
                        }
                    };
                } else {
                    return {
                        ...prev,
                        [activeCharacterId]: {
                            ...session,
                            videoConfig: {
                                ...currentConfig,
                                emotions: {
                                    ...currentConfig.emotions,
                                    [videoAssetTarget]: result
                                }
                            }
                        }
                    };
                }
            });
        };
        reader.readAsDataURL(file);
    }
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
  };

  const updateVideoConfigScale = (scale: number) => {
      if (!activeCharacterId) return;
      setSessions(prev => {
          const session = prev[activeCharacterId];
          const currentConfig = session.videoConfig || { scale: 1.0, emotions: {} };
          return {
              ...prev,
              [activeCharacterId]: {
                  ...session,
                  videoConfig: { ...currentConfig, scale }
              }
          };
      });
  };
  
  const handleClearBackground = () => {
      if (!activeCharacterId) return;
      setSessions(prev => ({
          ...prev,
          [activeCharacterId]: {
              ...prev[activeCharacterId],
              background: null
          }
      }));
  };

  const handleSendTransfer = () => {
      if (!transferAmount || isNaN(Number(transferAmount))) {
          alert("请输入有效金额");
          return;
      }
      handleSendMessage(`[TRANSFER::${transferAmount}::SENT]`);
  };

  const handleInteractTransfer = (action: 'RECEIVED' | 'RETURNED') => {
      if (!activeCharacterId || !activeTransferMsgId) return;
      setSessions(prev => {
          const session = prev[activeCharacterId];
          const updatedMessages = session.messages.map(msg => {
              if (msg.id === activeTransferMsgId) {
                  const newContent = msg.content.replace(/::PENDING\]/, `::${action}]`);
                  return { ...msg, content: newContent };
              }
              return msg;
          });
          return {
              ...prev,
              [activeCharacterId]: { ...session, messages: updatedMessages }
          };
      });
      setShowTransferAction(false);
      setActiveTransferMsgId(null);
  };

  const getUserContext = (charId: string): string => {
      const boundPersonaId = characterBindings[charId];
      if (boundPersonaId) {
          const persona = userPersonas.find(p => p.id === boundPersonaId);
          if (persona) {
              return `\n\n[USER INFO / PERSONA]\nName: ${persona.name}\nContext: ${persona.description}`;
          }
      }
      if (activePersonaId) {
          const persona = userPersonas.find(p => p.id === activePersonaId);
          if (persona) {
               return `\n\n[USER INFO / PERSONA]\nName: ${persona.name}\nContext: ${persona.description}`;
          }
      }
      return "";
  };

  const getUserName = (charId: string): string => {
      const boundPersonaId = characterBindings[charId];
      if (boundPersonaId) {
          const persona = userPersonas.find(p => p.id === boundPersonaId);
          if (persona) return persona.name;
      }
      if (activePersonaId) {
          const persona = userPersonas.find(p => p.id === activePersonaId);
          if (persona) return persona.name;
      }
      return "我";
  };

  const getUserAvatar = (charId: string): string | null => {
      const boundPersonaId = characterBindings[charId];
      if (boundPersonaId) {
          const persona = userPersonas.find(p => p.id === boundPersonaId);
          if (persona) return persona.avatar;
      }
      if (activePersonaId) {
          const persona = userPersonas.find(p => p.id === activePersonaId);
          if (persona) return persona.avatar;
      }
      return null;
  };

  const getDetailedTimeContext = () => {
      const now = new Date();
      const hour = now.getHours();
      const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
      let desc = "白天";
      
      if (hour >= 0 && hour < 5) desc = "凌晨 (深夜)";
      else if (hour >= 5 && hour < 9) desc = "早上";
      else if (hour >= 9 && hour < 11) desc = "上午";
      else if (hour >= 11 && hour < 13) desc = "中午";
      else if (hour >= 13 && hour < 18) desc = "下午";
      else if (hour >= 18 && hour < 24) desc = "晚上";
      
      return `【当前现实时间】: ${timeStr} (${desc})。\n【时间逻辑强制指令】: AI必须根据上述时间点调整语气。如果是深夜(0-5点)，请表现出惊讶、困倦或询问用户为什么熬夜；如果是下午，请聊下午相关的话题。严禁在深夜说“下午好”。`;
  };

  const handleGenerateSummary = async () => {
      if (!activeCharacterId || isTyping) return;
      const character = characters.find(c => c.id === activeCharacterId);
      const session = sessions[activeCharacterId];
      if (!character || !session || session.messages.length === 0) return;

      setIsGeneratingMemory(true);
      let summaryContent = '';
      const userName = getUserName(activeCharacterId);
      
      const summaryPrompt = `
      【思维链指令】
      你现在的任务是生成“长期记忆”。请回顾聊天历史，提取“我”（角色）和“${userName}”（用户）之间最值得铭记的互动。

      【格式约束】
      1. 必须严格输出 YAML 格式。
      2. 不要包含 Markdown 代码块标记（如 \`\`\`yaml）。
      3. 格式如下：
      summary: "这里写简短深刻的回忆总结（第一人称'我'指代你自己，第三人称称呼用户）。"

      【内容要求】
      1. 必须使用第一人称“我”指代自己（${character.name}）。
      2. 必须提及用户的名字（${userName}）。
      3. 只记录核心情感或事件，不要流水账。
      `;

      const tempMessages = [
          ...session.messages,
          { id: 'system-summary', role: MessageRole.USER, content: summaryPrompt, timestamp: Date.now() }
      ];

      await sendMessageStream(tempMessages, character.systemPrompt, settings, {
          onChunk: (text) => {
              summaryContent += text;
          },
          onComplete: () => {
              let extractedSummary = summaryContent;
              const match = summaryContent.match(/summary:\s*"(.*?)"/s) || summaryContent.match(/summary:\s*(.*)/s);
              if (match && match[1]) {
                  extractedSummary = match[1].trim();
              }
              extractedSummary = extractedSummary.replace(/^summary:\s*/i, '').replace(/^"|"$/g, '');

              if (extractedSummary) {
                  const newMemory: Memory = {
                      id: Date.now().toString(),
                      date: new Date().toLocaleDateString('zh-CN'),
                      content: extractedSummary,
                      isActive: false
                  };

                  setCharacters(prev => prev.map(c => 
                      c.id === activeCharacterId 
                      ? { ...c, memories: [newMemory, ...(c.memories || [])] }
                      : c
                  ));
              }

              setIsGeneratingMemory(false);
          },
          onError: () => {
              setIsGeneratingMemory(false);
              alert('记忆提取失败，请稍后再试。');
          }
      });
  };

  const handleTriggerAiReply = async (messagesOverride?: Message[]) => {
    if (!activeCharacterId || isTyping) return;
    const character = characters.find(c => c.id === activeCharacterId);
    if (!character) return;

    // Use passed messages if available, otherwise fall back to state
    // IMPORTANT: When called from handleSendMessage, messagesOverride contains the latest message which is crucial.
    let currentMessages = messagesOverride;
    if (!currentMessages) {
        const currentSession = sessionsRef.current[activeCharacterId];
        if (!currentSession) return;
        currentMessages = currentSession.messages;
    }

    setIsTyping(true);

    let streamedResponse = '';
    const stickerListString = stickers.map(s => s.name).join(', ');
    const timeContext = getDetailedTimeContext(); 

    const extraInstructions = `
    【高级交互能力已启用】
    1. **表情包**: 你的表情包库: [${stickerListString}]。使用格式: [STICKER::name::url]。
    2. **转账**: 使用格式: [TRANSFER::金额::PENDING]
    3. **发语音消息 (重要)**: 你现在拥有发送语音消息的能力！请经常使用它来表达情感、拉近关系或只是因为懒得打字。
       - **格式**: [VOICE::时长秒数::语音内容文本]
       - **时长规则**: 根据文本长度估算，大约 3 个字 = 1 秒。最少 1 秒。
    4. **商品分享 (双向)**:
       - **用户发给你**: 收到 [PRODUCT::...] 时，根据关系/性格决定是否发送 [TRANSFER::价格::SENT] 帮TA买单。
       - **你发给用户**: 你可以发送 [PRODUCT::物品名::价格::图片URL] 分享好物。如果是依赖/撒娇/霸道性格，请要求用户买给你！(图片URL尽量使用真实链接，或者忽略图片只发文本描述)。
    5. **外卖代付 (双向)**:
       - **用户让你代付**: 收到 [ORDER::...] 时，根据关系决定是否发送 [TRANSFER::金额::SENT] 帮TA买单。
       - **你让用户代付**: 如果你饿了，**请积极**发送 [ORDER::店铺名::餐品名::待代付] 让用户去付钱！根据你的性格（如傲娇大小姐、软饭男、没钱的学生等）来表现这一行为。
    6. **聊天气泡控制 (关键)**:
       - **默认风格**: 请务必将你的回复拆分成多个短句，并使用换行符分隔。每个换行符都会在界面上显示为一个独立的气泡。这能模拟真实的打字节奏，让对方觉得你是在一句一句地发。
       - **多说一点**: 尽量多发几个气泡（3-5个），不要只发一句话。
       - **情绪爆发**: 只有当你非常激动、愤怒、或者在进行长篇大论的解释时，才可以在同一行内写很多字（不换行），形成一个长气泡。
    `;

    const userContext = getUserContext(activeCharacterId);
    
    const activeMemoriesList = (character.memories || [])
        .filter(m => m.isActive)
        .map(m => `  - date: "${m.date}"\n    memory: "${m.content}"`)
        .join('\n');
    
    const memoryContext = activeMemoriesList 
        ? `\n\n【长期记忆库 (YAML)】\nmemories:\n${activeMemoriesList}\n\n[指令]: 以上是你们之间的核心回忆，请在对话中自然地体现这些共同经历，增强对话的连贯性和情感深度。` 
        : '';

    const recentUserMoments = moments
        .filter(m => m.userId === 'me')
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
        .map(m => `  - [${new Date(m.timestamp).toLocaleString('zh-CN')}] ${m.content} ${m.images?.length ? '(含图片)' : ''}`)
        .join('\n');

    const momentsContext = recentUserMoments 
        ? `\n\n【用户最近的朋友圈动态】\n${recentUserMoments}\n\n[指令]: 你可以偶尔提及用户最近的朋友圈动态，表现出你关注TA的生活。` 
        : '';

    const systemInstruction = character.lore 
      ? `${character.systemPrompt}\n\n=== 世界书 / 背景设定 ===\n${character.lore}\n\n${extraInstructions}${userContext}${memoryContext}${momentsContext}\n\n${timeContext}`
      : `${character.systemPrompt}\n\n${extraInstructions}${userContext}${memoryContext}${momentsContext}\n\n${timeContext}`;

    await sendMessageStream(currentMessages, systemInstruction, settings, {
        onChunk: (text) => {
          streamedResponse += text;
          setSessions(prev => {
            const session = prev[activeCharacterId];
            const messages = [...session.messages];
            const lastSessionMsg = messages[messages.length - 1];
            if (lastSessionMsg && lastSessionMsg.role === MessageRole.MODEL && lastSessionMsg.id.startsWith('gen-')) {
               lastSessionMsg.content = streamedResponse;
            } else {
               messages.push({
                id: `gen-${Date.now()}`,
                role: MessageRole.MODEL,
                content: streamedResponse,
                timestamp: Date.now()
              });
            }
            return {
              ...prev,
              [activeCharacterId]: {
                ...session,
                messages: messages,
                lastMessageAt: Date.now(),
              }
            };
          });
        },
        onComplete: () => setIsTyping(false),
        onError: (err) => {
           setIsTyping(false);
        }
      }
    );
  };

  const handleTriggerVoiceAiReply = async (userVoiceInput: string) => {
      if (!activeCharacterId) return;
      const character = characters.find(c => c.id === activeCharacterId);
      if (!character) return;

      setVoiceScripts(["..."]);
      setScriptIndex(0);
      setIsVoiceStreamActive(true);

      let fullResponse = "";
      const userContext = getUserContext(activeCharacterId);
      const timeContext = getDetailedTimeContext(); 
      
      const isVideo = isVideoCallActive;

      let systemInstruction = "";
      
      if (isVideo) {
          systemInstruction = `
          你现在正在和用户进行视频通话。
          用户的输入是：${userVoiceInput}
          请用【小说式】的描写风格来回复。
          【重要】立绘/表情控制规则：
          回复的【最开头】必须指定你的心情标签，格式为：[EMOTION::key]
          可选的 key: normal(正常), happy(开心), sad(难过), angry(生气), jealous(吃醋), excited(兴奋), shy(害羞)。
          请根据你回复的内容动态选择最合适的情绪。
          回复格式示例：
          [EMOTION::happy] *开心地笑了起来，眼睛弯成月牙* 真的吗？你今天嘴真甜！
          回复内容规则：
          1. 必须包含动作、神态、外貌的描写，描写部分用 *星号* 包裹。
          2. 语言要口语化，像在实时视频通话一样。
          3. 描写和对话要穿插进行，像视觉小说一样。
          `;
      } else {
          systemInstruction = `
          你现在正在和用户进行语音通话（电话）。用户看不到你的脸。
          用户的输入是：${userVoiceInput}
          请用【剧本/小说】风格回复。
          【重要】表情控制：
          虽然用户看不到，但为了记录心情，回复开头仍需指定心情标签：[EMOTION::key] (normal, happy, sad, angry, jealous, excited, shy)。
          【回复内容规则】：
          1. 仅描写【声音】相关的细节，如语气、呼吸声、停顿、笑声。
          2. 严禁描写视觉动作（如“看着你”、“眨眼”、“挥手”）。
          3. 描写部分用 *星号* 包裹。
          正确示例：
          [EMOTION::happy] *电话那头传来轻笑声* 真的吗？听你这么说我好开心。
          [EMOTION::sad] *沉默了片刻，呼吸变得沉重* 我不知道该说什么...
          `;
      }

      const activeMemoriesList = (character.memories || [])
        .filter(m => m.isActive)
        .map(m => `  - date: "${m.date}"\n    memory: "${m.content}"`)
        .join('\n');
      
      const memoryContext = activeMemoriesList 
        ? `\n\n【长期记忆库 (YAML)】\nmemories:\n${activeMemoriesList}\n` 
        : '';

      systemInstruction += `
      你的设定：${character.systemPrompt}
      ${userContext}
      ${memoryContext}
      ${timeContext}
      `;
      
      const tempMessages = [
          ...sessions[activeCharacterId].messages,
          { id: 'temp-user', role: MessageRole.USER, content: userVoiceInput, timestamp: Date.now() }
      ];

      await sendMessageStream(tempMessages, systemInstruction, settings, {
          onChunk: (text) => {
              fullResponse += text;
              const emotionMatch = fullResponse.match(/\[EMOTION::(.*?)\]/);
              if (emotionMatch && emotionMatch[1]) {
                  const emoKey = emotionMatch[1] as keyof VideoCallConfig['emotions'];
                  if (EMOTION_LABELS[emoKey]) {
                      setVideoEmotion(emoKey);
                  }
              }

              const displayContent = fullResponse.replace(/\[EMOTION::.*?\]/g, '').trim();

              const rawSentences = displayContent
                .replace(/([。！？.!?\n]+)/g, "$1|")
                .split("|")
                .map(s => s.trim())
                .filter(s => s.length > 0);
              
              if (rawSentences.length > 0) {
                  setVoiceScripts(rawSentences);
              }
          },
          onComplete: () => {
              setIsVoiceStreamActive(false);
              const finalEmotionMatch = fullResponse.match(/\[EMOTION::(.*?)\]/);
              const emotion = finalEmotionMatch ? finalEmotionMatch[1] : 'normal';
              const cleanContent = fullResponse.replace(/\[EMOTION::.*?\]/g, '').trim();
              
              const entry: VideoLogEntry = {
                  role: 'model',
                  content: cleanContent,
                  emotion: emotion
              };

              if (isVideoCallActive) {
                  videoLogRef.current.push(entry);
              } else if (callStatus === 'CONNECTED') {
                  voiceLogRef.current.push(entry);
              }
          },
          onError: () => {
              setVoiceScripts(["(信号断断续续...)"]);
              setIsVoiceStreamActive(false);
          }
      });
  };

  const handleImportStickers = () => {
    const lines = importText.split('\n');
    const newStickers: Sticker[] = [];
    lines.forEach(line => {
      const parts = line.split('-');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const url = parts.slice(1).join('-').trim();
        if (name && url) newStickers.push({ name, url });
      }
    });
    if (newStickers.length > 0) {
      setStickers(prev => [...prev, ...newStickers]);
      setImportText('');
      setShowImportModal(false);
      alert(`成功导入 ${newStickers.length} 个表情包！`);
    } else {
      alert('格式错误。请使用: 名称-URL');
    }
  };

  const handleAction = (type: string) => {
      setShowActionMenu(false);
      switch(type) {
        case 'style':
            setShowStyleModal(true);
            break;
        case 'chat_settings':
            setShowChatSettings(true);
            break;
        case 'regenerate':
            if (isTyping || !activeCharacterId) return;
            const session = sessions[activeCharacterId];
            if (!session || session.messages.length === 0) return;
            const lastMsg = session.messages[session.messages.length - 1];
            if (lastMsg.role !== MessageRole.MODEL) return;
            setShowRegenerateToast(true);
            setTimeout(() => setShowRegenerateToast(false), 2500);
            setSessions(prev => {
                const s = prev[activeCharacterId];
                const newMsgs = s.messages.slice(0, -1);
                return { ...prev, [activeCharacterId]: { ...s, messages: newMsgs } };
            });
            setTimeout(() => handleTriggerAiReply(), 300);
            break;
        case 'summary':
            handleGenerateSummary();
            break;
        case 'transfer':
            setShowTransferInput(true);
            break;
        case 'photo':
            fileInputRef.current?.click();
            break;
        case 'voice_call':
            setCallStatus('DIALING');
            break;
        case 'simulate_call':
            setCallStatus('INCOMING');
            break;
        case 'video_call':
            setIsVideoCallActive(true);
            break;
        case 'voice_msg':
            setShowVoiceMsgInput(true);
            break;
        case 'shopping':
            setShowShoppingModal(true);
            break;
        case 'takeout':
            setShowTakeoutModal(true);
            break;
        default:
            break;
      }
  };

  const handleSendCustomProduct = () => {
      const name = customProdName.trim() || '未知商品';
      const price = customProdPrice.trim() || '0';
      const img = 'https://img.icons8.com/color/96/shopping-bag--v1.png'; // Default
      if (!customProdName.trim()) return;
      handleSendMessage(`[PRODUCT::${name}::${price}::${img}]`);
      setShowShoppingModal(false);
      setCustomProdName('');
      setCustomProdPrice('');
  };

  const handleSendCustomOrder = () => {
      const store = customOrderStore.trim() || '外卖商家';
      const item = customOrderItem.trim();
      const status = '待代付';
      if (!item) return;
      handleSendMessage(`[ORDER::${store}::${item}::${status}]`);
      setShowTakeoutModal(false);
      setCustomOrderStore('');
      setCustomOrderItem('');
  };

  const canRegenerate = (() => {
      if (!activeCharacterId || isTyping) return false;
      const msgs = sessions[activeCharacterId]?.messages;
      if (!msgs || msgs.length === 0) return false;
      return msgs[msgs.length - 1].role === MessageRole.MODEL;
  })();

  const renderContextMenu = () => {
      if (!contextMenuMsgId) return null;
      return (
          <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center animate-fade-in" onClick={() => setContextMenuMsgId(null)}>
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-2xl p-2 min-w-[200px] flex flex-col gap-1 border border-white/50 transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleContextMenuAction('copy')} className="px-4 py-2.5 text-[15px] text-black text-left hover:bg-black/5 rounded-lg active:scale-95 transition-transform flex justify-between items-center">
                      复制
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                  </button>
                  <button onClick={() => handleContextMenuAction('reply')} className="px-4 py-2.5 text-[15px] text-black text-left hover:bg-black/5 rounded-lg active:scale-95 transition-transform flex justify-between items-center">
                      回复
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                  </button>
                  <button onClick={() => handleContextMenuAction('edit')} className="px-4 py-2.5 text-[15px] text-black text-left hover:bg-black/5 rounded-lg active:scale-95 transition-transform flex justify-between items-center">
                      编辑
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button onClick={() => handleContextMenuAction('multi_select')} className="px-4 py-2.5 text-[15px] text-black text-left hover:bg-black/5 rounded-lg active:scale-95 transition-transform flex justify-between items-center">
                      多选
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </button>
                  <div className="h-[1px] bg-gray-300/50 my-1"></div>
                  <button onClick={() => handleContextMenuAction('delete')} className="px-4 py-2.5 text-[15px] text-red-500 text-left hover:bg-red-50 rounded-lg active:scale-95 transition-transform flex justify-between items-center">
                      删除
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
              </div>
          </div>
      );
  };

  const renderEditModal = () => {
      if (!editingMsg) return null;
      return (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onClick={() => setEditingMsg(null)}>
              <div className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <span className="font-bold text-gray-800">编辑消息</span>
                  </div>
                  <div className="p-4">
                      <textarea 
                          value={editingMsg.content}
                          onChange={(e) => setEditingMsg({ ...editingMsg, content: e.target.value })}
                          className="w-full h-32 p-3 bg-gray-100 rounded-xl text-[15px] leading-relaxed outline-none resize-none focus:ring-2 focus:ring-ios-blue/50 transition-all"
                          autoFocus
                      />
                  </div>
                  <div className="flex border-t border-gray-100 h-[50px]">
                      <button 
                          onClick={() => setEditingMsg(null)}
                          className="flex-1 text-gray-500 text-[16px] active:bg-gray-50 border-r border-gray-100 transition-colors"
                      >
                          取消
                      </button>
                      <button 
                          onClick={handleSaveEditedMessage}
                          disabled={!editingMsg.content.trim()}
                          className="flex-1 text-ios-blue text-[16px] font-semibold active:bg-gray-50 transition-colors"
                      >
                          完成
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  // --- Rendering Content ---
  const renderMessageContent = (msg: Message, isLastInGroup: boolean, timeStr: string) => {
    const isUser = msg.role === MessageRole.USER;
    const parts = msg.content.split(CONTENT_REGEX).filter(p => p);
    const session = activeCharacterId ? sessions[activeCharacterId] : null;
    const userColor = session?.userBubbleColor || '#d1eafe';
    const botColor = session?.botBubbleColor || '#ffffff';
    const customCss = session?.customBubbleCss || '';
    const customStyle = parseStyleString(customCss);

    const userName = activeCharacterId ? getUserName(activeCharacterId) : "我";
    const charName = activeCharacter?.name || "TA";

    return (
        <div 
            className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} max-w-[85%] relative`}
            onContextMenu={(e) => {
                e.preventDefault();
                setContextMenuMsgId(msg.id);
            }}
            onTouchStart={() => handleTouchStart(msg.id)}
            onTouchEnd={handleTouchEnd}
            onMouseDown={() => handleMouseDown(msg.id)}
            onMouseUp={handleMouseUp}
        >
            {parts.map((part, index) => {
                const stickerMatch = part.match(/^\[STICKER::(.*?)::(.*?)\]$/);
                const transferMatch = part.match(/^\[TRANSFER::(.*?)::(.*?)\]$/);
                const productMatch = part.match(/^\[PRODUCT::(.*?)::(.*?)::(.*?)\]$/);
                const orderMatch = part.match(/^\[ORDER::(.*?)::(.*?)::(.*?)\]$/);
                const imageMatch = part.match(/^\[IMAGE::(.*?)\]$/);
                const callMatch = part.match(/^\[VOICECALL::(.*?)::(.*?)\]$/);
                const videoLogMatch = part.match(/^\[VIDEO_LOG::(.*?)::(.*?)\]$/);
                const voiceMsgMatch = part.match(/^\[VOICE::(.*?)::(.*?)\]$/);
                const emotionMatch = part.match(/^\[EMOTION::(.*?)\]$/);
                const quoteMatch = part.match(/^\[QUOTE::(.*?)::(.*?)\]$/);
                
                if (emotionMatch) return null;

                // Handle Quote Block
                if (quoteMatch) {
                    const qName = quoteMatch[1];
                    const qContent = quoteMatch[2];
                    return (
                        <div key={index} className="bg-black/5 rounded-lg border-l-2 border-gray-400 p-2 mb-1 text-[11px] text-gray-500 max-w-full truncate opacity-80 select-none">
                            <span className="font-bold mr-1">{qName}:</span>{qContent}
                        </div>
                    )
                }

                if (stickerMatch) {
                    const url = stickerMatch[2];
                    return (
                        <div key={index} className="bg-transparent mb-1 flex flex-col items-end">
                             {url && <img src={url} alt="sticker" className="w-32 h-32 object-contain rounded-lg" />}
                        </div>
                    );
                } else if (imageMatch) {
                    const url = imageMatch[1];
                    return (
                         <div key={index} className="mb-1 rounded-lg overflow-hidden border border-white/40 shadow-sm relative">
                             {url && <img src={url} alt="user upload" className="max-w-[200px] max-h-[300px] object-cover" />}
                         </div>
                    );
                } else if (callMatch) {
                    const duration = callMatch[1];
                    const encodedContent = callMatch[2];
                    let logEntries: VideoLogEntry[] = [];
                    try {
                        if (encodedContent) {
                            const jsonStr = atou(encodedContent);
                            logEntries = JSON.parse(jsonStr);
                        }
                    } catch (e) {
                        logEntries = [];
                    }

                    return (
                        <div key={index} className="w-[300px] max-w-[85vw] mx-auto bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-lg my-2 font-sans">
                             <div className="bg-white/10 px-4 py-3 flex items-center justify-between border-b border-white/10">
                                 <div className="flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                                     <span className="text-white font-bold text-[15px] tracking-wide">语音通话记录</span>
                                 </div>
                                 <span className="text-white/60 text-xs font-mono">{duration}</span>
                             </div>
                             
                             <div className="p-5 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                                 {logEntries.length === 0 ? (
                                     <div className="text-white/40 text-center text-xs italic">通话未产生对话</div>
                                 ) : (
                                     logEntries.map((entry, i) => {
                                         const isUserEntry = entry.role === 'user';
                                         const name = isUserEntry ? userName : charName;
                                         const emotionLabel = !isUserEntry && entry.emotion && EMOTION_LABELS[entry.emotion] 
                                            ? ` (${EMOTION_LABELS[entry.emotion]})` 
                                            : '';
                                         
                                         return (
                                             <div key={i} className="text-[14px] leading-relaxed">
                                                 <div className={`font-bold mb-1 ${isUserEntry ? 'text-blue-300' : 'text-orange-300'}`}>
                                                     {name}{emotionLabel}：
                                                 </div>
                                                 <div className="text-white/90 whitespace-pre-wrap pl-1">{entry.content}</div>
                                             </div>
                                         );
                                     })
                                 )}
                             </div>
                        </div>
                    );
                } else if (videoLogMatch) {
                    const duration = videoLogMatch[1];
                    const encodedContent = videoLogMatch[2];
                    let logEntries: VideoLogEntry[] = [];
                    try {
                        const jsonStr = atou(encodedContent);
                        logEntries = JSON.parse(jsonStr);
                    } catch (e) {
                        logEntries = [];
                    }

                    return (
                        <div key={index} className="w-[300px] max-w-[85vw] mx-auto bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-lg my-2 font-sans">
                             <div className="bg-white/10 px-4 py-3 flex items-center justify-between border-b border-white/10">
                                 <div className="flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                     <span className="text-white font-bold text-[15px] tracking-wide">视频通话记录</span>
                                 </div>
                                 <span className="text-white/60 text-xs font-mono">{duration}</span>
                             </div>
                             
                             <div className="p-5 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                                 {logEntries.length === 0 ? (
                                     <div className="text-white/40 text-center text-xs italic">通话未产生对话</div>
                                 ) : (
                                     logEntries.map((entry, i) => {
                                         const isUserEntry = entry.role === 'user';
                                         const name = isUserEntry ? userName : charName;
                                         const emotionLabel = !isUserEntry && entry.emotion && EMOTION_LABELS[entry.emotion] 
                                            ? ` (${EMOTION_LABELS[entry.emotion]})` 
                                            : '';
                                         
                                         return (
                                             <div key={i} className="text-[14px] leading-relaxed">
                                                 <div className={`font-bold mb-1 ${isUserEntry ? 'text-blue-300' : 'text-pink-300'}`}>
                                                     {name}{emotionLabel}：
                                                 </div>
                                                 <div className="text-white/90 whitespace-pre-wrap pl-1">{entry.content}</div>
                                             </div>
                                         );
                                     })
                                 )}
                             </div>
                        </div>
                    );
                } else if (voiceMsgMatch) {
                    const duration = voiceMsgMatch[1];
                    const content = voiceMsgMatch[2];
                    const isTranscribed = transcribedMsgIds.has(msg.id);
                    const durNum = parseInt(duration) || 1;
                    const widthClass = Math.min(60 + durNum * 10, 200); 

                    return (
                        <div key={index} className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => toggleTranscription(msg.id)}
                                    className={`w-6 h-6 rounded-full border border-gray-300 bg-white/80 flex items-center justify-center text-[10px] text-gray-500 hover:bg-gray-100 transition-colors shadow-sm ${isUser ? 'order-first' : 'order-last'}`}
                                >
                                    转
                                </button>
                                <div 
                                    style={{ 
                                        backgroundColor: isUser ? userColor : botColor,
                                        width: `${widthClass}px`,
                                        ...customStyle
                                    }}
                                    className={`h-[40px] px-3 flex items-center shadow-sm border border-white/20 backdrop-blur-sm cursor-pointer active:opacity-70 transition-opacity relative
                                    ${isUser 
                                        ? `text-black rounded-[18px] ${isLastInGroup ? 'rounded-br-sm' : ''} justify-end` 
                                        : `text-black/90 rounded-[18px] ${isLastInGroup ? 'rounded-bl-sm' : ''} justify-start`
                                    }`}
                                >
                                    {isUser ? (
                                        <>
                                            <span className="text-xs font-medium mr-2 opacity-60">{duration}</span>
                                            <svg className="w-5 h-5 text-black/70 rotate-180" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 12c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5-1 2.5-2.5 2.5-2.5-1-2.5-2.5zm5 0c0-2.5 1.5-4.5 4-4.5s4 2 4 4.5-1.5 4.5-4 4.5-4-2-4-4.5zm5 0c0-3.5 2-6.5 5.5-6.5s5.5 3 5.5 6.5-2 6.5-5.5 6.5-5.5-3-5.5-6.5z"/></svg>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 text-black/70" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 12c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5-1 2.5-2.5 2.5-2.5-1-2.5-2.5zm5 0c0-2.5 1.5-4.5 4-4.5s4 2 4 4.5-1.5 4.5-4 4.5-4-2-4-4.5zm5 0c0-3.5 2-6.5 5.5-6.5s5.5 3 5.5 6.5-2 6.5-5.5 6.5-5.5-3-5.5-6.5z"/></svg>
                                            <span className="text-xs font-medium ml-2 opacity-60">{duration}"</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            {isTranscribed && (
                                <div className={`max-w-[200px] bg-white/90 p-2 rounded-lg text-xs text-gray-700 shadow-inner border border-gray-100 animate-fade-in ${isUser ? 'self-end mr-8' : 'self-start ml-8'}`}>
                                    {content}
                                </div>
                            )}
                        </div>
                    );
                } else if (transferMatch) {
                    const amount = transferMatch[1];
                    const status = transferMatch[2];
                    const canInteract = !isUser && status === 'PENDING';
                    let statusText = '';
                    if (status === 'SENT') statusText = '转账给朋友'; 
                    if (status === 'PENDING') statusText = '请收款'; 
                    if (status === 'RECEIVED') statusText = '已收款';
                    if (status === 'RETURNED') statusText = '已退回';
                    return (
                        <div 
                            key={index} 
                            onClick={() => {
                                if (canInteract) {
                                    setActiveTransferMsgId(msg.id);
                                    setShowTransferAction(true);
                                }
                            }}
                            className={`relative w-[220px] h-[90px] rounded-xl overflow-hidden flex flex-col justify-between p-3.5 shadow-md transition-transform ${canInteract ? 'active:scale-95 cursor-pointer' : ''} ${status === 'RECEIVED' || status === 'RETURNED' ? 'opacity-80' : ''}`}
                            style={{ background: 'linear-gradient(135deg, #F2994A 0%, #F2C94C 100%)' }}
                        >
                             <div className="flex items-start gap-3">
                                 <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                                 </div>
                                 <div className="flex flex-col text-white">
                                     <span className="text-[15px] font-medium leading-tight">¥ {amount}</span>
                                     <span className="text-[12px] opacity-80">{statusText}</span>
                                 </div>
                             </div>
                             <div className="border-t border-white/20 pt-1 mt-1 flex justify-between items-center">
                                <span className="text-[10px] text-white/70">微信转账</span>
                             </div>
                        </div>
                    );
                } else if (productMatch) {
                    const name = productMatch[1];
                    const price = productMatch[2];
                    const img = productMatch[3];
                    return (
                        <div key={index} className="relative w-[220px] bg-white rounded-xl overflow-hidden shadow-md p-3 flex gap-3 border border-gray-100">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {img && <img src={img} className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                                <span className="text-[14px] font-medium text-black leading-tight line-clamp-2">{name}</span>
                                <span className="text-[15px] font-bold text-red-500">¥ {price}</span>
                            </div>
                        </div>
                    );
                } else if (orderMatch) {
                    const store = orderMatch[1];
                    const item = orderMatch[2];
                    const status = orderMatch[3];
                    return (
                        <div key={index} className="relative w-[240px] bg-white rounded-xl overflow-hidden shadow-md border border-gray-100">
                            <div className="bg-yellow-400 h-1 w-full"></div>
                            <div className="p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[14px] font-bold text-black">{store}</span>
                                    <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">{status}</span>
                                </div>
                                <div className="text-[13px] text-gray-600 mb-3 border-b border-gray-100 pb-2">
                                    {item}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] text-gray-400">美团外卖</span>
                                    <button className="text-[11px] font-medium text-white bg-yellow-500 border border-yellow-500 px-3 py-0.5 rounded-full shadow-sm active:scale-95 transition-transform">为我代付</button>
                                </div>
                            </div>
                        </div>
                    );
                } else if (part.trim()) {
                    const lines = part.split('\n').filter(line => line.trim());
                    return (
                        <React.Fragment key={index}>
                            {lines.map((line, lineIdx) => (
                                <div 
                                    key={`${index}-${lineIdx}`}
                                    style={{ 
                                        backgroundColor: isUser ? userColor : botColor,
                                        ...customStyle
                                    }}
                                    className={`px-4 py-2 text-[16px] leading-snug whitespace-pre-wrap shadow-sm break-words border border-white/20 backdrop-blur-sm relative min-w-[60px]
                                    ${isUser 
                                        ? `text-black rounded-[18px] ${isLastInGroup && lineIdx === lines.length -1 ? 'rounded-br-sm' : ''}` 
                                        : `text-black/90 rounded-[18px] ${isLastInGroup && lineIdx === lines.length -1 ? 'rounded-bl-sm' : ''}`
                                    }`}
                                >
                                    <span>{line}</span>
                                </div>
                            ))}
                        </React.Fragment>
                    );
                }
                return null;
            })}
            
            <span className="text-[9px] text-gray-400 opacity-80 select-none mt-0.5">
                {timeStr}
            </span>
        </div>
    );
  };

  const renderList = () => {
    const directChats = characters;
    const groupSessions = (Object.values(sessions) as ChatSession[]).filter(s => s.type === 'group');

    return (
      <div className="w-full h-full bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col pt-10 animate-slide-right font-sans relative">
         {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 h-[44px]">
          <button 
            onClick={() => onNavigate(AppRoute.HOME)} 
            className="text-ios-blue text-[17px] hover:opacity-70 transition-opacity flex items-center -ml-1 font-medium"
          >
            <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            主屏幕
          </button>
          <h1 className="text-[17px] font-semibold text-black/90 absolute left-1/2 transform -translate-x-1/2">信息</h1>
          <button 
             onClick={() => setShowCreateGroupModal(true)}
             className="text-ios-blue hover:opacity-70 transition-opacity"
          >
            <span className="text-[17px] font-medium">创建群聊</span>
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
           {/* Group Chats Section */}
           {groupSessions.length > 0 && (
               <div className="mb-4">
                   <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 backdrop-blur-sm sticky top-0 z-10">群聊</div>
                   {groupSessions.map(session => {
                       const lastMsg = session.messages[session.messages.length - 1];
                       const timeStr = lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}) : '';
                       
                       return (
                           <div 
                              key={session.id}
                              onClick={() => {
                                  setActiveCharacterId(session.id);
                                  setView('CONVERSATION');
                              }}
                              className="flex items-center px-4 py-3 active:bg-gray-100 transition-colors cursor-pointer border-b border-gray-100/50 bg-white/50 backdrop-blur-sm"
                           >
                               <div className="w-[50px] h-[50px] rounded-lg bg-gray-200 overflow-hidden mr-3 border border-gray-100 flex-shrink-0 grid grid-cols-2 gap-0.5 p-0.5">
                                   {/* Group Avatar Grid */}
                                   {(session.members || []).slice(0, 4).map(memId => {
                                       const char = characters.find(c => c.id === memId);
                                       return (
                                           <div key={memId} className="w-full h-full bg-gray-300 overflow-hidden rounded-[2px]">
                                               {char?.avatar && <img src={char.avatar} className="w-full h-full object-cover" />}
                                           </div>
                                       );
                                   })}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <div className="flex justify-between items-baseline mb-0.5">
                                       <h3 className="text-[16px] font-semibold text-black truncate pr-2">{session.name || '群聊'}</h3>
                                       <span className="text-[12px] text-gray-400 font-normal flex-shrink-0">{timeStr}</span>
                                   </div>
                                   <p className="text-[14px] text-gray-500 truncate leading-snug">
                                       {lastMsg ? (
                                           <span>
                                               {lastMsg.senderId && characters.find(c => c.id === lastMsg.senderId)?.name ? `${characters.find(c => c.id === lastMsg.senderId)?.name}: ` : ''}
                                               {lastMsg.content.replace(/\[.*?\]/g, '[媒体]')}
                                           </span>
                                       ) : '暂无消息'}
                                    </p>
                               </div>
                           </div>
                       );
                   })}
               </div>
           )}

           {/* Direct Messages Section */}
           <div>
               <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 backdrop-blur-sm sticky top-0 z-10">私信</div>
               {directChats.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-[20vh] text-gray-400">
                       <p className="text-[15px]">暂无私信</p>
                   </div>
               ) : (
                   directChats.map(char => {
                       const session = sessions[char.id];
                       const lastMsg = session?.messages[session.messages.length - 1];
                       const timeStr = lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}) : '';
                       
                       return (
                           <div 
                              key={char.id}
                              onClick={() => handleCreateSession(char.id)}
                              className="flex items-center px-4 py-3 active:bg-gray-100 transition-colors cursor-pointer border-b border-gray-100/50 bg-white/50 backdrop-blur-sm"
                           >
                               <div className="w-[50px] h-[50px] rounded-full bg-gray-200 overflow-hidden mr-3 border border-gray-100 flex-shrink-0">
                                   {char.avatar && <img src={char.avatar} className="w-full h-full object-cover" alt={char.name} />}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <div className="flex justify-between items-baseline mb-0.5">
                                       <h3 className="text-[16px] font-semibold text-black truncate pr-2">{char.name}</h3>
                                       <span className="text-[12px] text-gray-400 font-normal flex-shrink-0">{timeStr}</span>
                                   </div>
                                   <p className="text-[14px] text-gray-500 truncate leading-snug">
                                       {lastMsg ? lastMsg.content.replace(/\[.*?\]/g, '[媒体]') : char.description}
                                    </p>
                               </div>
                           </div>
                       );
                   })
               )}
           </div>
        </div>

        {/* Create Group Modal */}
        {showCreateGroupModal && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={() => setShowCreateGroupModal(false)}>
                <div className="w-full bg-white/95 backdrop-blur-2xl rounded-t-[20px] shadow-2xl overflow-hidden animate-slide-up flex flex-col h-[80%]" onClick={e => e.stopPropagation()}>
                    <div className="px-4 py-3 border-b border-gray-200/50 flex justify-between items-center bg-white/50">
                        <button onClick={() => setShowCreateGroupModal(false)} className="text-[16px] text-gray-500">取消</button>
                        <span className="font-bold text-[16px] text-gray-800">创建群聊</span>
                        <button 
                            onClick={handleCreateGroupSession}
                            disabled={!newGroupName.trim() || selectedGroupMembers.size < 2}
                            className="text-[16px] font-bold text-ios-blue disabled:opacity-30"
                        >
                            创建
                        </button>
                    </div>
                    
                    <div className="p-4 border-b border-gray-100">
                        <input 
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            placeholder="群聊名称"
                            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-[16px] outline-none focus:ring-2 focus:ring-ios-blue/50 transition-all"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-2">选择成员</div>
                        <div className="space-y-2">
                            {characters.map(char => {
                                const isSelected = selectedGroupMembers.has(char.id);
                                return (
                                    <div 
                                        key={char.id}
                                        onClick={() => {
                                            setSelectedGroupMembers(prev => {
                                                const next = new Set(prev);
                                                if (next.has(char.id)) next.delete(char.id);
                                                else next.add(char.id);
                                                return next;
                                            });
                                        }}
                                        className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-blue-50 border-ios-blue' : 'bg-white border-gray-100'}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden mr-3 flex-shrink-0">
                                            {char.avatar && <img src={char.avatar} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1 font-medium text-gray-800">{char.name}</div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-ios-blue border-ios-blue' : 'border-gray-300'}`}>
                                            {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  };

  const handleNextScript = () => {
      if (scriptIndex < voiceScripts.length - 1) {
          setScriptIndex(prev => prev + 1);
      }
  };

  const renderCallOverlay = () => {
    if (callStatus === 'IDLE') return null;

    // Incoming Call UI
    if (callStatus === 'INCOMING') {
        return (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center pt-20 animate-fade-in text-white">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-6 shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/20">
                    {activeCharacter?.avatar && <img src={activeCharacter?.avatar} className="w-full h-full object-cover" />}
                </div>
                <h2 className="text-3xl font-light mb-2">{activeCharacter?.name}</h2>
                <p className="text-gray-400 mb-auto">FaceTime 音频</p>
                
                <div className="w-full pb-20 px-10 flex justify-between items-center">
                    <div className="flex flex-col items-center gap-2">
                         <button onClick={handleHangUp} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6 12 6s8.66 2.36 11.71 5.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                         </button>
                         <span className="text-xs">拒绝</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                         <button onClick={handleAcceptCall} className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform animate-pulse">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 1.23 0 2.44.2 3.57.57.35.13.74.04 1.02-.24l-2.2-2.2z"/></svg>
                         </button>
                         <span className="text-xs">接听</span>
                    </div>
                </div>
            </div>
        );
    }

    // Dialing UI
    if (callStatus === 'DIALING') {
        return (
            <div className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-xl flex flex-col items-center pt-24 animate-fade-in text-white">
                 <div className="w-24 h-24 rounded-full overflow-hidden mb-6 shadow-xl border border-white/10">
                    {activeCharacter?.avatar && <img src={activeCharacter?.avatar} className="w-full h-full object-cover opacity-80" />}
                </div>
                <h2 className="text-3xl font-light mb-2">{activeCharacter?.name}</h2>
                <p className="text-gray-400 mb-auto animate-pulse">正在呼叫...</p>
                <div className="pb-20">
                     <button onClick={handleHangUp} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6 12 6s8.66 2.36 11.71 5.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                     </button>
                </div>
            </div>
        );
    }

    // Connected UI (Audio)
    if (callStatus === 'CONNECTED') {
        const currentScript = voiceScripts[scriptIndex] || "...";
        // Remove emotion tags from display
        const displayScript = currentScript.replace(/\[EMOTION::.*?\]/g, '').trim();

        return (
            <div 
                className="absolute inset-0 z-50 bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col items-center pt-16 text-white animate-fade-in cursor-pointer"
                onClick={handleNextScript}
            >
                {/* Header Info */}
                <div className="flex flex-col items-center mb-8 pointer-events-none">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
                            {activeCharacter?.avatar && <img src={activeCharacter?.avatar} className="w-full h-full object-cover" />}
                        </div>
                    </div>
                    <h2 className="text-2xl font-semibold">{activeCharacter?.name}</h2>
                    <p className="text-gray-400 text-sm font-mono mt-1">{formatDuration(callDuration)}</p>
                </div>

                {/* Visualizer / Waveform Simulation */}
                <div className="flex-1 w-full flex items-center justify-center mb-8 relative px-8 pointer-events-none">
                     {/* Script Display */}
                    <div className="absolute inset-0 flex items-center justify-center px-6">
                        <p className={`text-center text-lg leading-relaxed font-light transition-all duration-500 ${isVoiceStreamActive ? 'text-white opacity-100' : 'text-gray-400 opacity-80'}`}>
                            "{displayScript}"
                        </p>
                    </div>

                    {/* Fake Waveform */}
                    <div className="flex gap-1 items-center h-20 opacity-30">
                        {[...Array(20)].map((_, i) => (
                             <div 
                                key={i} 
                                className="w-1.5 bg-white rounded-full animate-wave"
                                style={{ 
                                    height: `${Math.random() * 100}%`,
                                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                                    animationDelay: `${Math.random() * 0.5}s`
                                }}
                             ></div>
                        ))}
                    </div>
                </div>

                {/* Controls - Stop propagation here */}
                <div 
                    className="w-full bg-gray-800/80 backdrop-blur-md rounded-t-3xl p-6 pb-12 animate-slide-up cursor-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-around items-center mb-6">
                        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
                            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                            </div>
                            <span className="text-[10px]">静音</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
                             <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
                             </div>
                             <span className="text-[10px]">添加</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
                             <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                             </div>
                             <span className="text-[10px]">免提</span>
                        </button>
                    </div>

                    <div className="flex justify-center gap-6 items-center">
                        <button 
                            onClick={() => setShowVoiceInput(!showVoiceInput)}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${showVoiceInput ? 'bg-white text-black' : 'bg-gray-700 text-white'}`}
                        >
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                        </button>

                         <button onClick={handleHangUp} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6 12 6s8.66 2.36 11.71 5.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                         </button>
                    </div>

                    {showVoiceInput && (
                         <div className="mt-4 animate-slide-up">
                            <div className="flex gap-2">
                                <input 
                                    value={voiceInputText}
                                    onChange={(e) => setVoiceInputText(e.target.value)}
                                    placeholder="输入你想说的话..."
                                    className="flex-1 bg-gray-700/50 rounded-full px-4 text-sm outline-none border border-gray-600 focus:border-white/50 h-10"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(voiceInputText, true)}
                                    autoFocus
                                />
                                <button 
                                    onClick={() => handleSendMessage(voiceInputText, true)}
                                    className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                                </button>
                            </div>
                         </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
  };

  const renderVideoCallOverlay = () => {
      if (!isVideoCallActive) return null;
      
      const session = sessions[activeCharacterId!];
      const config = session?.videoConfig || { scale: 1.0, emotions: {} };
      
      const emotionImage = config.emotions[videoEmotion];
      const displayImage = emotionImage || activeCharacter?.avatar; 
      
      const bgImage = config.background;
      const currentScript = voiceScripts[scriptIndex] || "";
      const displayScript = currentScript.replace(/\[EMOTION::.*?\]/g, '').trim();

      const userAvatar = activeCharacterId ? getUserAvatar(activeCharacterId) : null;

      return (
          <div className="absolute inset-0 z-50 bg-black flex flex-col overflow-hidden animate-fade-in">
              {/* Main Video Feed (Character) - CLICKABLE TO ADVANCE */}
              <div 
                  className="absolute inset-0 z-0 cursor-pointer"
                  onClick={handleNextScript}
              >
                  {/* Background Layer */}
                  {bgImage ? (
                      <div 
                          className="absolute inset-0 bg-cover bg-center transition-all duration-500" 
                          style={{ backgroundImage: `url(${bgImage})` }} 
                      />
                  ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
                  )}

                  {/* Character Layer */}
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                      {displayImage && <img 
                          src={displayImage} 
                          className="object-cover transition-transform duration-500 ease-out"
                          style={{ 
                              transform: `scale(${config.scale})`,
                              height: '100%',
                              width: '100%',
                              objectPosition: 'center'
                          }}
                          alt="character video"
                      />}
                  </div>
              </div>

              {/* UI Overlays Wrapper - Pointer events none so clicks pass through to bg */}
              <div className="relative z-10 flex-1 flex flex-col justify-between pt-12 pb-8 px-4 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none">
                  
                  {/* Top Bar - Enable pointer events for buttons */}
                  <div className="flex justify-between items-start pointer-events-auto">
                      <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                           <span className="text-white text-xs font-mono">{formatDuration(videoCallDuration)}</span>
                      </div>
                      <button 
                         onClick={() => setShowVideoSettings(true)}
                         className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 text-white active:bg-white/20"
                      >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      </button>
                  </div>

                  {/* Self View (PIP) - Enable pointer events */}
                  <div className="absolute top-20 right-4 w-28 h-36 bg-black rounded-xl overflow-hidden border border-white/20 shadow-2xl pointer-events-auto">
                      {userAvatar ? (
                           <img src={userAvatar} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                             <span className="text-white/30 text-xs">NO CAM</span>
                          </div>
                      )}
                  </div>

                  {/* Bottom Section Wrapper: Subtitles + Controls */}
                  <div className="flex flex-col items-center gap-4 mt-auto w-full pointer-events-auto">
                      
                      {/* Subtitle Area - Moved to Bottom */}
                      {displayScript && (
                          <div className="w-full px-4 mb-2 pointer-events-none">
                              <div className="bg-black/60 backdrop-blur-xl px-5 py-3 rounded-2xl text-center border border-white/10 shadow-lg pointer-events-auto" onClick={(e) => { e.stopPropagation(); handleNextScript(); }}>
                                   <p className="text-white text-[16px] font-medium leading-relaxed drop-shadow-md">
                                       {displayScript}
                                    </p>
                              </div>
                          </div>
                      )}
                      
                      {/* Loading Toast */}
                      {showVideoRegenToast && (
                         <div className="bg-black/70 px-4 py-2 rounded-full text-white text-xs flex items-center gap-2 animate-fade-in pointer-events-none mb-2">
                             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                             重试中...
                         </div>
                      )}

                      {/* Input Trigger */}
                      <button 
                          onClick={() => setShowVideoInput(!showVideoInput)}
                          className={`px-6 py-2 rounded-full backdrop-blur-md border border-white/20 text-sm font-medium transition-all ${showVideoInput ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                      >
                          {showVideoInput ? '收起输入' : '说点什么...'}
                      </button>
                      
                      {showVideoInput && (
                          <div className="w-full flex gap-2 animate-slide-up">
                              <input 
                                  value={videoInputMsg}
                                  onChange={(e) => setVideoInputMsg(e.target.value)}
                                  placeholder="输入对话内容..."
                                  className="flex-1 bg-black/50 backdrop-blur-xl border border-white/20 rounded-full px-4 text-white text-sm outline-none focus:border-white/50 h-10"
                                  onKeyDown={(e) => e.key === 'Enter' && handleSendVideoMessage()}
                                  autoFocus
                              />
                              <button onClick={handleSendVideoMessage} className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-white">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                              </button>
                          </div>
                      )}

                      <div className="flex items-center gap-8 mt-2">
                           {/* Mute */}
                           <button className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                           </button>

                           {/* Hang Up */}
                           <button onClick={handleVideoHangUp} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-transform">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.36 7.46 6 12 6s8.66 2.36 11.71 5.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                           </button>

                           {/* Regenerate */}
                           <button onClick={handleVideoRegenerate} className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                           </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderVideoSettingsModal = () => {
      if (!showVideoSettings || !activeCharacterId) return null;
      const session = sessions[activeCharacterId];
      const config = session.videoConfig || { scale: 1.0, emotions: {} };

      return (
          <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center px-6 animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
                  <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <span className="font-bold text-gray-800">视频通话配置</span>
                      <button onClick={() => setShowVideoSettings(false)} className="text-gray-500 hover:text-black">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                  </div>
                  
                  <div className="p-4 space-y-5 h-[350px] overflow-y-auto">
                      
                      {/* Scale Slider */}
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">画面缩放 ({config.scale.toFixed(1)}x)</label>
                          <input 
                              type="range" 
                              min="0.5" 
                              max="2.0" 
                              step="0.1" 
                              value={config.scale}
                              onChange={(e) => updateVideoConfigScale(parseFloat(e.target.value))}
                              className="w-full accent-ios-blue h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                      </div>

                      {/* Background Uploader */}
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">背景图片</label>
                          <div 
                              onClick={() => {
                                  setVideoAssetTarget('background');
                                  videoFileInputRef.current?.click();
                              }}
                              className="h-16 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-ios-blue hover:bg-blue-50 transition-colors relative overflow-hidden"
                          >
                              {config.background ? (
                                  <img src={config.background} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                              ) : null}
                              <span className="relative z-10 text-sm font-medium text-gray-600">点击上传背景</span>
                          </div>
                      </div>

                      {/* Emotion Uploaders */}
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">立绘 / 情绪差分 (点击上传)</label>
                          <div className="grid grid-cols-3 gap-2">
                              {Object.keys(EMOTION_LABELS).map((key) => {
                                  const emotionKey = key as keyof VideoCallConfig['emotions'];
                                  const hasImage = !!config.emotions[emotionKey];
                                  
                                  return (
                                      <div 
                                          key={key}
                                          onClick={() => {
                                              setVideoAssetTarget(emotionKey);
                                              videoFileInputRef.current?.click();
                                          }}
                                          className={`aspect-square rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden ${hasImage ? 'border-ios-blue bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                                      >
                                          {hasImage && (
                                              <img src={config.emotions[emotionKey]} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                          )}
                                          <span className="relative z-10 text-[10px] font-bold text-gray-700">{EMOTION_LABELS[emotionKey]}</span>
                                          <span className="relative z-10 text-[9px] text-gray-400">{hasImage ? '已设置' : '未设置'}</span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                      
                      <input 
                          type="file" 
                          ref={videoFileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleVideoAssetSelect} 
                      />

                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-[11px] text-blue-600">
                          提示：AI回复时会根据情绪自动切换对应的立绘。若未设置则默认显示头像。
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderConversation = () => {
    if (!activeCharacter) return null;
    
    // Fix: Ensure session exists before rendering. 
    // This prevents a crash if activeCharacterId is set but session state hasn't updated yet.
    const session = sessions[activeCharacterId!];
    if (!session) return null; 

    const bgImage = session.background;
    const userColor = session.userBubbleColor || '#d1eafe';
    const botColor = session.botBubbleColor || '#ffffff';
    const customCss = session.customBubbleCss || '';
    const customStyle = parseStyleString(customCss);
    const customAvatarCss = session.customAvatarFrameCss || '';
    const avatarStyle = parseStyleString(customAvatarCss);

    const userName = activeCharacterId ? getUserName(activeCharacterId) : "我";
    const charName = activeCharacter?.name || "TA";

    // Define userAvatar here to be used in message loop
    const userAvatar = activeCharacterId ? getUserAvatar(activeCharacterId) : null;
    
    // Calculate simple token count (char length sum)
    const tokenCount = (session.messages || []).reduce((acc, m) => acc + (m.content?.length || 0), 0);

    return (
      <div 
        className={`flex flex-col h-full animate-slide-left relative transition-all duration-300 pt-12 ${bgImage ? 'bg-cover bg-center' : 'bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50'}`}
        style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}
      >
        {renderCallOverlay()}
        {renderVideoCallOverlay()}
        {renderVideoSettingsModal()}
        
        {/* === RESTORED CONTEXT MENU UI === */}
        {renderContextMenu()}
        
        {/* === RESTORED EDIT MODAL UI === */}
        {renderEditModal()}

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
        <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBackgroundSelect} />

        {/* --- TRANSFER MODAL (New) --- */}
        {showTransferInput && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in" onClick={() => setShowTransferInput(false)}>
                <div className="w-[300px] bg-white rounded-2xl p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[16px] font-medium text-gray-900">转账金额</span>
                        <button onClick={() => setShowTransferInput(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-8 px-2">
                        <span className="text-3xl font-bold text-black">¥</span>
                        <input 
                            type="number" 
                            value={transferAmount} 
                            onChange={(e) => setTransferAmount(e.target.value)} 
                            className="flex-1 text-4xl font-bold text-black outline-none bg-transparent placeholder-gray-200 caret-green-500"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>
                    
                    <button 
                        onClick={handleSendTransfer}
                        disabled={!transferAmount}
                        className="w-full bg-[#1AAD19] text-white font-bold py-3.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50 text-[16px] shadow-sm"
                    >
                        转账
                    </button>
                </div>
            </div>
        )}

        {/* --- VOICE MESSAGE MODAL (Refactored from bottom bar) --- */}
        {showVoiceMsgInput && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in" onClick={() => setShowVoiceMsgInput(false)}>
                <div className="w-[300px] bg-white rounded-2xl p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[16px] font-medium text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                            发送语音
                        </span>
                        <button onClick={() => setShowVoiceMsgInput(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    
                    <textarea 
                        value={voiceMsgText} 
                        onChange={(e) => setVoiceMsgText(e.target.value)} 
                        className="w-full h-32 bg-gray-100 rounded-xl p-3 text-[16px] outline-none focus:ring-2 focus:ring-green-500/50 transition-all resize-none mb-6 leading-relaxed"
                        placeholder="输入想说的话..."
                        autoFocus
                    />
                    
                    <button 
                        onClick={handleSendVoiceMsg}
                        disabled={!voiceMsgText.trim()}
                        className="w-full bg-green-500 text-white font-bold py-3.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50 text-[16px] shadow-sm flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                        发送
                    </button>
                </div>
            </div>
        )}

        {/* --- SHOPPING MODAL --- */}
        {showShoppingModal && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={() => setShowShoppingModal(false)}>
                <div className="w-full bg-white/95 backdrop-blur-2xl rounded-t-[20px] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[70%]" onClick={e => e.stopPropagation()}>
                    <div className="px-4 py-3 border-b border-gray-200/50 flex justify-between items-center bg-white/50">
                        <span className="font-bold text-[16px] text-gray-800">分享宝贝</span>
                        <button onClick={() => setShowShoppingModal(false)} className="bg-gray-200 rounded-full p-1">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <h4 className="text-[12px] font-bold text-gray-400 mb-3 uppercase tracking-wider">热门推荐</h4>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {PRESET_PRODUCTS.map((p, i) => (
                                <button 
                                    key={i}
                                    onClick={() => {
                                        handleSendMessage(`[PRODUCT::${p.name}::${p.price}::${p.img}]`);
                                        setShowShoppingModal(false);
                                    }}
                                    className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-transform text-left"
                                >
                                    {p.img && <img src={p.img} className="w-10 h-10 object-contain" />}
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-medium truncate text-gray-800">{p.name}</div>
                                        <div className="text-[12px] text-red-500 font-bold">¥{p.price}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        
                        <div className="border-t border-gray-200/50 pt-4">
                            <h4 className="text-[12px] font-bold text-gray-400 mb-3 uppercase tracking-wider">自定义商品</h4>
                            <div className="space-y-3">
                                <input 
                                    value={customProdName}
                                    onChange={e => setCustomProdName(e.target.value)}
                                    placeholder="商品名称 (必填)"
                                    className="w-full bg-gray-100 rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                                />
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                                        <input 
                                            value={customProdPrice}
                                            onChange={e => setCustomProdPrice(e.target.value)}
                                            placeholder="价格 (选填)"
                                            type="number"
                                            className="w-full bg-gray-100 rounded-xl pl-7 pr-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleSendCustomProduct}
                                        disabled={!customProdName.trim()}
                                        className="bg-orange-500 text-white px-6 rounded-xl font-bold text-[15px] disabled:opacity-50 active:scale-95 transition-all shadow-orange-200 shadow-md"
                                    >
                                        发送
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- TAKEOUT MODAL --- */}
        {showTakeoutModal && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={() => setShowTakeoutModal(false)}>
                <div className="w-full bg-white/95 backdrop-blur-2xl rounded-t-[20px] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[70%]" onClick={e => e.stopPropagation()}>
                    <div className="px-4 py-3 border-b border-gray-200/50 flex justify-between items-center bg-white/50">
                        <span className="font-bold text-[16px] text-gray-800">发送外卖订单</span>
                        <button onClick={() => setShowTakeoutModal(false)} className="bg-gray-200 rounded-full p-1">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <h4 className="text-[12px] font-bold text-gray-400 mb-3 uppercase tracking-wider">历史订单</h4>
                        <div className="space-y-2 mb-6">
                            {PRESET_ORDERS.map((o, i) => (
                                <button 
                                    key={i}
                                    onClick={() => {
                                        handleSendMessage(`[ORDER::${o.store}::${o.item}::${o.status}]`);
                                        setShowTakeoutModal(false);
                                    }}
                                    className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-transform"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600 font-bold text-lg flex-shrink-0">
                                            {o.icon || o.store.charAt(0)}
                                        </div>
                                        <div className="text-left min-w-0">
                                            <div className="text-[14px] font-bold text-gray-800 truncate">{o.store}</div>
                                            <div className="text-[12px] text-gray-500 truncate">{o.item}</div>
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded">{o.status}</div>
                                </button>
                            ))}
                        </div>
                        
                        <div className="border-t border-gray-200/50 pt-4">
                            <h4 className="text-[12px] font-bold text-gray-400 mb-3 uppercase tracking-wider">自定义订单</h4>
                            <div className="space-y-3">
                                <input 
                                    value={customOrderStore}
                                    onChange={e => setCustomOrderStore(e.target.value)}
                                    placeholder="店铺名称 (选填)"
                                    className="w-full bg-gray-100 rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-yellow-200 transition-all"
                                />
                                <div className="flex gap-3">
                                    <input 
                                        value={customOrderItem}
                                        onChange={e => setCustomOrderItem(e.target.value)}
                                        placeholder="餐品详情 (必填)"
                                        className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-yellow-200 transition-all"
                                    />
                                    <button 
                                        onClick={handleSendCustomOrder}
                                        disabled={!customOrderItem.trim()}
                                        className="bg-yellow-400 text-black px-6 rounded-xl font-bold text-[15px] disabled:opacity-50 active:scale-95 transition-all shadow-sm"
                                    >
                                        发送
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- IMPORT STICKERS MODAL --- */}
        {showImportModal && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-6" onClick={() => setShowImportModal(false)}>
                <div className="w-full max-w-[320px] bg-white rounded-2xl p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[17px] font-bold text-gray-900">批量导入表情包</span>
                        <button onClick={() => setShowImportModal(false)} className="bg-gray-100 p-1.5 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
                        <p className="text-xs text-blue-600 leading-relaxed">
                            每行一个表情包，格式为：<br/>
                            <span className="font-mono font-bold">名称-图片链接</span>
                        </p>
                    </div>

                    <textarea 
                        value={importText} 
                        onChange={(e) => setImportText(e.target.value)} 
                        className="w-full h-40 bg-gray-50 border border-gray-200 rounded-xl p-3 text-[13px] outline-none focus:ring-2 focus:ring-ios-blue/50 focus:border-ios-blue transition-all resize-none mb-4 leading-relaxed font-mono placeholder-gray-400"
                        placeholder={`开心-https://example.com/1.png\n难过-https://example.com/2.png`}
                        autoFocus
                    />
                    
                    <button 
                        onClick={handleImportStickers}
                        disabled={!importText.trim()}
                        className="w-full bg-ios-blue text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50 text-[16px] shadow-lg shadow-blue-200"
                    >
                        确认导入
                    </button>
                </div>
            </div>
        )}

        {/* --- CHAT SETTINGS MODAL (Redesigned) --- */}
        {showChatSettings && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-6" onClick={() => setShowChatSettings(false)}>
                <div className="w-full max-w-[340px] bg-white rounded-[24px] p-6 shadow-2xl animate-scale-in border border-white/50" onClick={e => e.stopPropagation()}>
                    
                    {/* Context Count Slider */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[15px] font-bold text-gray-700/80">上下文条数 <span className="text-gray-400 font-normal">({contextLimit})</span></span>
                        </div>
                        <input 
                            type="range" 
                            min="20" 
                            max="5000" 
                            step="10"
                            value={contextLimit}
                            onChange={(e) => setContextLimit(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-medium">
                            <span>20 (省流)</span>
                            <span>5000 (超长记忆)</span>
                        </div>
                    </div>

                    {/* Hide System Logs Toggle */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[15px] font-bold text-gray-700/80">隐藏系统日志</span>
                            <div 
                                onClick={() => setHideSystemLogs(!hideSystemLogs)}
                                className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 ${hideSystemLogs ? 'bg-indigo-400' : 'bg-gray-200'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${hideSystemLogs ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                            开启后，将不再显示 Date/App 产生的上下文提示文本（转账、截图、图片发送提示除外）。
                        </p>
                    </div>

                    {/* Manage Context Button */}
                    <button className="w-full bg-gray-50 border border-gray-100 py-3 rounded-xl text-[15px] font-bold text-gray-700 mb-6 active:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                        管理上下文 / 隐藏历史
                    </button>
                    <p className="text-[10px] text-gray-400 text-center -mt-4 mb-6">可选择从某条消息开始显示，隐藏之前的记录（不被 AI 读取）。</p>

                    {/* Danger Zone */}
                    <div className="mb-6">
                        <div className="text-[13px] font-bold text-red-400 mb-3 uppercase tracking-wider">危险区域 (DANGER ZONE)</div>
                        <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => setKeepLastMessages(!keepLastMessages)}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${keepLastMessages ? 'bg-indigo-400 border-indigo-400' : 'border-gray-300'}`}>
                                {keepLastMessages && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                            </div>
                            <span className="text-[14px] text-gray-700">清空时保留最后10条记录 (维持语境)</span>
                        </div>
                        
                        <button 
                            onClick={handleClearChatHistory}
                            className="w-full bg-[#FFF0F0] text-[#FF5E5E] py-3 rounded-xl text-[15px] font-bold active:bg-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            执行清空
                        </button>
                    </div>

                    {/* Save Button */}
                    <button 
                        onClick={() => setShowChatSettings(false)}
                        className="w-full bg-[#9694CD] text-white py-3.5 rounded-xl text-[16px] font-bold shadow-md active:opacity-90 transition-opacity"
                    >
                        保存设置
                    </button>

                </div>
            </div>
        )}

        {/* --- STYLE MODAL --- */}
        {showStyleModal && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <div className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <span className="font-bold text-gray-800">外观设置</span>
                        <button onClick={() => setShowStyleModal(false)} className="text-gray-500 hover:text-black">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    
                    <div className="flex border-b border-gray-200">
                        <button onClick={() => setStyleTab('BASIC')} className={`flex-1 py-3 text-[14px] font-medium transition-colors ${styleTab === 'BASIC' ? 'text-ios-blue border-b-2 border-ios-blue' : 'text-gray-500'}`}>基础样式</button>
                        <button onClick={() => setStyleTab('CODE')} className={`flex-1 py-3 text-[14px] font-medium transition-colors ${styleTab === 'CODE' ? 'text-ios-blue border-b-2 border-ios-blue' : 'text-gray-500'}`}>CSS 代码</button>
                    </div>

                    <div className="p-4 space-y-4 h-[300px] overflow-y-auto">
                        {styleTab === 'BASIC' ? (
                            <>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">气泡颜色</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 space-y-1">
                                            <span className="text-[10px] text-gray-400">对方</span>
                                            <input type="color" value={sessions[activeCharacterId]?.botBubbleColor || '#ffffff'} onChange={(e) => updateSessionStyle('botBubbleColor', e.target.value)} className="w-full h-8 rounded cursor-pointer" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <span className="text-[10px] text-gray-400">我</span>
                                            <input type="color" value={sessions[activeCharacterId]?.userBubbleColor || '#d1eafe'} onChange={(e) => updateSessionStyle('userBubbleColor', e.target.value)} className="w-full h-8 rounded cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">聊天背景</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => bgInputRef.current?.click()} className="flex-1 py-2 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">上传图片</button>
                                        <button onClick={handleClearBackground} className="px-4 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">清除</button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">自定义气泡 CSS</label>
                                    <textarea 
                                        value={sessions[activeCharacterId]?.customBubbleCss || ''} 
                                        onChange={(e) => updateSessionStyle('customBubbleCss', e.target.value)}
                                        className="w-full h-20 bg-gray-100 rounded-lg p-2 text-xs font-mono border border-gray-200 focus:border-ios-blue outline-none resize-none"
                                        placeholder="border-radius: 10px; box-shadow: ..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">自定义头像框 CSS</label>
                                    <textarea 
                                        value={sessions[activeCharacterId]?.customAvatarFrameCss || ''} 
                                        onChange={(e) => updateSessionStyle('customAvatarFrameCss', e.target.value)}
                                        className="w-full h-20 bg-gray-100 rounded-lg p-2 text-xs font-mono border border-gray-200 focus:border-ios-blue outline-none resize-none"
                                        placeholder="border: 2px solid gold; border-radius: 5px;"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}

        <div className="pt-10 px-2 pb-2 border-b border-white/20 flex items-center sticky top-0 bg-white/30 backdrop-blur-xl z-20 shadow-sm min-h-[82px]">
          <button onClick={() => setView('LIST')} className="text-ios-blue flex items-center pr-2 hover:opacity-60 z-30 transition-opacity">
            <svg className="w-8 h-8 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
            <span className="text-[17px] font-medium -ml-1">列表</span>
          </button>
          
          <div className="absolute left-0 right-0 top-5 bottom-0 flex flex-col items-center justify-center pointer-events-none">
             {/* HEADER AVATAR with Custom Style */}
             <div className="w-12 h-12 rounded-full overflow-hidden mb-0.5 shadow-sm border border-white/50 bg-gray-100" style={avatarStyle}>
               {activeCharacter.avatar && <img src={activeCharacter.avatar} alt="avatar" className="w-full h-full object-cover" />}
             </div>
             {/* HEADER NAME + HEART + TOKEN COUNT */}
             <div className="flex items-center gap-1.5 -mt-0.5">
                <span className="text-[12px] font-bold text-black">
                    {activeCharacter.name}
                </span>
                <div className="flex items-center gap-0.5 bg-pink-100/50 px-1.5 py-0.5 rounded-full border border-pink-100/50">
                    <svg className="w-2.5 h-2.5 text-pink-500 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    <span className="text-[9px] text-pink-600 font-medium font-mono leading-none">{tokenCount}</span>
                </div>
             </div>
          </div>
          
          <div className="ml-auto w-10 flex justify-end pr-3">
             {isMultiSelectMode ? (
                 <button onClick={() => { setIsMultiSelectMode(false); setSelectedMsgIds(new Set()); }} className="text-[15px] font-bold text-ios-blue transition-opacity">
                     取消
                 </button>
             ) : (
                 <button onClick={() => handleTriggerAiReply()} disabled={isTyping} className="transition-transform active:scale-90">
                     {isTyping ? (
                         <div className="relative w-7 h-7">
                            <svg className="w-full h-full animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#ff9a9e" />
                                        <stop offset="100%" stopColor="#fad0c4" />
                                    </linearGradient>
                                </defs>
                                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" fill="url(#heartGradient)" stroke="url(#heartGradient)" strokeWidth="1"/>
                            </svg>
                         </div>
                     ) : (
                         <svg className="w-7 h-7 text-ios-blue hover:opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                         </svg>
                     )}
                 </button>
             )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth" onClick={() => setShowStickerPicker(false)}>
          {/* Use session.messages with safe access */}
          {session.messages && session.messages.map((msg, idx, arr) => {
            const isUser = msg.role === MessageRole.USER;
            const nextMsg = arr[idx + 1];
            
            // Determine sender for group chat
            let senderChar = activeCharacter;
            if (session.type === 'group' && !isUser && msg.senderId) {
                const found = characters.find(c => c.id === msg.senderId);
                if (found) senderChar = found;
            }

            // Determine if this is the last message in a consecutive group
            // For group chat, we also need to check if the sender changed
            const isLastInGroup = !nextMsg || nextMsg.role !== msg.role || (session.type === 'group' && !isUser && nextMsg.senderId !== msg.senderId);
            
            const showTime = idx === 0 || (msg.timestamp - (arr[idx-1]?.timestamp || 0) > 300000); 
            const timeStr = new Date(msg.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit', hour12: false});
            const isSelected = selectedMsgIds.has(msg.id);
            
            return (
              <React.Fragment key={msg.id}>
                {showTime && (
                  <div className="text-center py-4 w-full">
                     <span className="text-[11px] text-gray-500/80 font-medium bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full inline-block shadow-sm">
                        {timeStr}
                     </span>
                  </div>
                )}
                <div 
                    className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} group mb-1 items-end relative transition-transform duration-300 ${isMultiSelectMode ? (isUser ? 'pr-8' : 'pl-8') : ''}`}
                    onClick={() => {
                        if (isMultiSelectMode) handleMultiSelectToggle(msg.id);
                    }}
                >
                  {/* Checkbox for Multi Select */}
                  {isMultiSelectMode && (
                      <div className={`absolute top-1/2 -translate-y-1/2 ${isUser ? 'right-0' : 'left-0'} p-2 z-10`}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-ios-blue border-ios-blue' : 'border-gray-400 bg-white/50'}`}>
                              {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                          </div>
                      </div>
                  )}

                  {!isUser ? (
                    <div className="flex flex-col items-start max-w-[85%]">
                        {/* Name above bubble for group chat */}
                        {session.type === 'group' && (idx === 0 || arr[idx-1].senderId !== msg.senderId || arr[idx-1].role === MessageRole.USER) && (
                            <span className="text-[10px] text-gray-500 ml-11 mb-0.5">{senderChar.name}</span>
                        )}
                        <div className="flex items-end">
                            {/* CHAT LIST AVATAR */}
                            <div className={`w-9 h-9 rounded-full overflow-hidden mr-2 flex-shrink-0 shadow-sm border border-white/60 bg-white/50 ${isLastInGroup ? '' : 'invisible'}`} style={avatarStyle}>
                                {senderChar.avatar && <img src={senderChar.avatar} className="w-full h-full object-cover" alt="bot" />}
                            </div>
                            {renderMessageContent(msg, isLastInGroup, timeStr)}
                        </div>
                    </div>
                  ) : (
                    <>
                        {renderMessageContent(msg, isLastInGroup, timeStr)}
                        {/* USER AVATAR */}
                        <div className={`w-9 h-9 rounded-full bg-gray-300 ml-2 flex-shrink-0 flex items-center justify-center text-white text-[14px] font-bold shadow-sm border border-white/40 self-end overflow-hidden ${isLastInGroup ? '' : 'invisible'}`}>
                            {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover" alt="U" /> : "U"}
                        </div>
                    </>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          
          {isTyping && (
             <div className="flex w-full justify-start mb-3">
                <div className="w-9 h-9 rounded-full overflow-hidden mr-2 flex-shrink-0 bg-white/50 border border-white/60 self-end" style={avatarStyle}>
                     {activeCharacter.avatar && <img src={activeCharacter.avatar} className="w-full h-full object-cover" alt="bot" />}
                </div>
                <div className="bg-white/60 backdrop-blur-md px-4 py-3 rounded-[18px] rounded-bl-sm flex space-x-1 items-center h-[36px] w-16 justify-center ml-0 shadow-sm border border-white/30">
                   <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                   <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* ... (Keep Sticker Picker and Input Area) ... */}
        <div className={`bg-white/40 backdrop-blur-xl w-full border-t border-white/30 transition-all duration-300 overflow-hidden ${showStickerPicker ? 'h-[200px]' : 'h-0'}`}>
           <div className="p-2 h-full overflow-y-auto grid grid-cols-4 gap-2 content-start">
               <div onClick={() => setShowImportModal(true)} className="aspect-square bg-white/40 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white/60 active:scale-95 transition-all border border-gray-300 border-dashed">
                  <svg className="w-6 h-6 text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  <span className="text-[10px] text-gray-500">添加</span>
               </div>
               {stickers.map((sticker, idx) => (
                   <div key={idx} onClick={() => handleSendMessage(`[STICKER::${sticker.name}::${sticker.url}]`)} className="aspect-square bg-white/60 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white active:scale-95 transition-all shadow-sm border border-white/50 p-1">
                       {sticker.url && <img src={sticker.url} alt={sticker.name} className="w-full h-full object-contain" />}
                   </div>
               ))}
           </div>
        </div>

        {/* ... Input / Multi-select Toolbar ... */}
        {isMultiSelectMode ? (
             <div className="bg-white/80 backdrop-blur-xl px-4 py-4 flex items-center justify-between border-t border-white/30 sticky bottom-0 z-20 shadow-lg">
                 <span className="text-[14px] text-gray-500 ml-2">已选择 {selectedMsgIds.size} 条</span>
                 <button 
                    onClick={handleMultiDelete}
                    disabled={selectedMsgIds.size === 0}
                    className={`px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all ${selectedMsgIds.size > 0 ? 'bg-red-500 text-white shadow-red-200 shadow-lg active:scale-95' : 'bg-gray-200 text-gray-400'}`}
                 >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                     删除
                 </button>
             </div>
        ) : (
            <div className="bg-white/40 backdrop-blur-xl px-4 py-2 flex items-end gap-2 border-t border-white/30 pb-6 sticky bottom-0 z-20">
                <button onClick={() => setShowActionMenu(!showActionMenu)} className={`pb-2 hover:text-gray-600 transition-all duration-200 flex-shrink-0 ${showActionMenu ? 'rotate-45 text-gray-600' : 'text-gray-400'}`}>
                    <div className="bg-white/60 rounded-full w-8 h-8 flex items-center justify-center shadow-sm">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                    </div>
                </button>
                
                <div className="flex-1 flex flex-col gap-1">
                    {/* Reply Preview */}
                    {replyTarget && (
                        <div className="bg-gray-100/80 backdrop-blur-sm rounded-lg p-2 flex justify-between items-center text-xs text-gray-500 mb-1 border border-white/40 shadow-sm animate-fade-in mx-1">
                            <span className="truncate max-w-[200px]">回复 <b>{replyTarget.name}</b>: {replyTarget.content}</span>
                            <button onClick={() => setReplyTarget(null)} className="p-1 hover:bg-gray-200 rounded-full">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                    )}
                    <div className="bg-white/60 rounded-full border border-white/50 px-3 py-1 min-h-[36px] flex items-center focus-within:bg-white/80 transition-colors shadow-sm gap-2">
                        <input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} onFocus={() => { setShowStickerPicker(false); setShowActionMenu(false); }} placeholder="发送信息" className="flex-1 bg-transparent outline-none text-[16px] py-0.5 placeholder-gray-500 min-w-0" disabled={isTyping} />
                        <button onClick={() => { setShowStickerPicker(!showStickerPicker); setShowActionMenu(false); }} className="text-gray-400 hover:text-ios-blue transition-colors flex-shrink-0">
                            <svg className={`w-6 h-6 ${showStickerPicker ? 'text-ios-blue' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </div>
                </div>
                
                <button onClick={() => handleSendMessage()} disabled={!inputMessage.trim() || isTyping} className={`pb-2 rounded-full transition-all duration-200 flex-shrink-0 ${inputMessage.trim() ? 'text-white scale-100' : 'text-gray-400 scale-90'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ${inputMessage.trim() ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-400/50'}`}>
                        <svg className="w-4 h-4 text-white font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                    </div>
                </button>
            </div>
        )}

        {showActionMenu && (
            <>
                <div className="absolute inset-0 z-20 bg-black/5 backdrop-blur-[1px]" onClick={() => setShowActionMenu(false)}></div>
                <div className="absolute bottom-[72px] left-4 z-30 bg-white/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/50 w-[220px] max-h-[50vh] overflow-y-auto no-scrollbar animate-slide-up origin-bottom-left flex flex-col p-2 space-y-1">
                    <button onClick={() => handleAction('style')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 rounded-xl transition-colors active:scale-95 text-left group">
                        <div className="w-8 h-8 bg-gradient-to-tr from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">外观自定义</span>
                    </button>
                    
                    <button onClick={() => handleAction('voice_call')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 rounded-xl transition-colors active:scale-95 text-left group">
                         <div className="w-8 h-8 bg-[#34C759] rounded-full flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">语音通话</span>
                    </button>
                    <button onClick={() => handleAction('simulate_call')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 rounded-xl transition-colors active:scale-95 text-left group">
                         <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">模拟来电</span>
                    </button>
                    <button onClick={() => handleAction('transfer')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 rounded-xl transition-colors active:scale-95 text-left group">
                        <div className="w-8 h-8 bg-[#FF9500] rounded-full flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">转账功能</span>
                    </button>
                    <button onClick={() => handleAction('photo')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 rounded-xl transition-colors active:scale-95 text-left group">
                         <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black shadow-sm group-hover:shadow-md transition-shadow relative overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-tr from-yellow-200 via-pink-300 to-purple-400 opacity-80"></div>
                             <svg className="w-4 h-4 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">发送图片</span>
                    </button>
                    <button onClick={() => handleAction('video_call')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 rounded-xl transition-colors active:scale-95 text-left group">
                         <div className="w-8 h-8 bg-[#5856D6] rounded-full flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">视频通话</span>
                    </button>
                     <button onClick={() => handleAction('voice_msg')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 rounded-xl transition-colors active:scale-95 text-left group">
                         <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">发语音消息</span>
                    </button>
                    {/* NEW FEATURES */}
                    <button onClick={() => handleAction('shopping')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 rounded-xl transition-colors active:scale-95 text-left group">
                         <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">商品分享</span>
                    </button>
                    <button onClick={() => handleAction('takeout')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 rounded-xl transition-colors active:scale-95 text-left group">
                         <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">外卖订单</span>
                    </button>
                    
                    <div className="w-full h-[1px] bg-gray-400/20 my-1"></div>
                    <button onClick={() => handleAction('chat_settings')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 rounded-xl transition-colors active:scale-95 text-left group">
                         <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">设置</span>
                    </button>
                     <button onClick={() => handleAction('summary')} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/50 rounded-xl transition-colors active:scale-95 text-left group">
                         <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">总结记忆</span>
                    </button>
                    <button 
                        onClick={() => canRegenerate && handleAction('regenerate')} 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left group ${canRegenerate ? 'hover:bg-white/50 active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'}`}
                    >
                         <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        </div>
                        <span className="text-[15px] font-medium text-black/80">重新生成</span>
                    </button>
                </div>
            </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full relative">
       {view === 'LIST' ? renderList() : renderConversation()}
    </div>
  );
};

export default ChatApp;