
export enum AppRoute {
  HOME = 'HOME',
  CHAT_LIST = 'CHAT_LIST',
  CHAT_CONVERSATION = 'CHAT_CONVERSATION',
  SETTINGS = 'SETTINGS',
  CREATE_CHARACTER = 'CREATE_CHARACTER',
  PHONE_INFO = 'PHONE_INFO',
  PROFILE = 'PROFILE',
  APPEARANCE = 'APPEARANCE',
  MOMENTS = 'MOMENTS',
  GAME = 'GAME',
}

export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string; // Can contain [STICKER::name::url] tag
  timestamp: number;
  senderId?: string; // For group chats
}

export interface Memory {
  id: string;
  date: string; // YYYY-MM-DD
  content: string; // The YAML summary
  isActive: boolean; // "Lit up" status
}

export interface Character {
  id: string;
  name: string;
  avatar: string; // URL or emoji
  description: string;
  systemPrompt: string;
  lore?: string; // World book / Background info
  color: string;
  memories: Memory[]; // New: Memory Lane
}

export interface UserPersona {
  id: string;
  name: string;
  avatar: string;
  description: string; // The user's specific persona/settings
}

export interface VideoCallConfig {
  background?: string | null;
  scale: number; // 0.5 to 2.0
  emotions: {
    normal?: string;
    happy?: string;
    sad?: string;
    angry?: string;
    jealous?: string;
    excited?: string;
    shy?: string;
  }
}

export interface ChatSession {
  id?: string; // Group ID
  type?: 'direct' | 'group';
  name?: string; // Group Name
  members?: string[]; // Member IDs
  characterId?: string;
  messages: Message[];
  lastMessageAt: number;
  background?: string | null; // Custom background for this specific chat
  userBubbleColor?: string; // Custom color for User bubble
  botBubbleColor?: string; // Custom color for Bot bubble
  customBubbleCss?: string; // CSS string for bubbles
  customAvatarFrameCss?: string; // CSS string for avatar frames
  videoConfig?: VideoCallConfig; // New: Video Call Configuration
}

export interface ApiSettings {
  provider: 'gemini' | 'custom';
  apiKey: string;
  baseUrl: string; // Used for custom OpenAI-compatible endpoints
  model: string;
}

export interface Sticker {
  name: string;
  url: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  bgClass: string; // Background gradient
  iconBgClass: string; // Icon container gradient
  dockClass: string; // Dock background style
  accentColor: string; // Text accent color
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export interface Moment {
  id: string;
  userId: string; // 'me' or other user IDs
  userName: string;
  userAvatar: string;
  content: string;
  images: string[]; // Array of image URLs
  timestamp: number;
  likes: number;
  comments: Comment[];
}

export interface MomentsProfile {
  name: string;
  avatar: string;
  signature: string;
  coverImage: string;
}
