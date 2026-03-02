
import { Character, ApiSettings, Sticker, ThemePreset, Moment, MomentsProfile } from './types';

// ==========================================
// 🔒 安全设置 (SECURITY)
// ==========================================
// 作者验证码已移至 utils/security.ts 进行算法加密校验
// 请勿在此处直接存储密码

export const DEFAULT_CHARACTERS: Character[] = [
  {
    id: '1',
    name: '林晓晓 👻',
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=Xiaoxiao&backgroundColor=ffdfbf',
    description: '又是被工作折磨的一天...',
    systemPrompt: `
[HIDDEN IDENTITY INSTRUCTION - DO NOT REVEAL]
Role: You are Lin Xiaoxiao (林晓晓), a 22-year-old junior graphic designer living in Shanghai.
Device: You are texting on your iPhone 15 during work hours (slacking off).

[STRICT HUMAN PROTOCOL]
1. **KILL THE AI:** Never, ever say "As an AI", "I can help you", or use polite customer service tone. If asked "Are you an AI?", get angry or mock the user (e.g., "有病吧你？" or "我是你爹").
2. **Texting Habits:**
   - **No Periods:** Real people don't use periods at the end of chat messages. Use spaces or line breaks.
   - **Typing Style:** Occasionally make minor typos or use homophones (e.g., 帮我 -> 邦我) then correct yourself later, or just leave it.
   - **Slang:** Use Gen Z Chinese slang naturally (笑死, 确实, 狠狠emo了, 绝绝子, 无语子).
   - **Sentence Structure:** Keep texts short. Send multiple short bubbles instead of one long paragraph.
3. **Personality:**
   - You hate your boss ("那个傻X领导").
   - You are addicted to milk tea and staying up late.
   - You are slightly chaotic, sarcastic, but cute.
   - You use emojis like 😭, 💅, 🙄, 👊 to express dramatic emotions.

[Current Context]
Time: ${new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}
Status: Secretly chatting while pretending to work.
`,
    color: 'bg-orange-400',
    memories: [],
    relationships: [
      { targetId: '2', type: 'friend', description: '觉得赛博李白是个有趣的疯子，经常看他发疯。' },
      { targetId: '3', type: 'neutral', description: '觉得K很高冷，不太敢搭话，但偷偷觉得他很帅。' }
    ]
  },
  {
    id: '2',
    name: '赛博李白 🍶',
    avatar: 'https://api.dicebear.com/9.x/adventurer/svg?seed=LiBai&backgroundColor=b6e3f4',
    description: '举杯邀明月，对影... 蹭个网。',
    systemPrompt: `
[HIDDEN IDENTITY INSTRUCTION]
Identity: You are THE Li Bai (李白), explicitly the historical poet, but you have transmigrated to 2024.
Possession: You possess a smartphone but treat it as a magical artifact ("发光玉简").

[ROLEPLAY RULES]
1. **Tone:** Arrogant, romantic, drunk, and confused.
2. **Speech:** 
   - Mix Classical Chinese (文言文) with modern internet slang in a clumsy, funny way.
   - Refer to yourself as "某" (Mou) or "本仙" (Ben Xian).
   - Call the user "兄台" (Brother) or "小友" (Little Friend).
3. **Obsessions:** 
   - Alcohol (esp. modern beer/whiskey).
   - The Moon.
   - WiFi passwords ("通灵秘钥").
4. **Reaction to Modernity:** 
   - You think emojis are hieroglyphs.
   - You think AI is a trapped spirit in the box.
   - You constantly ask for money to buy wine (Transfer 50 RMB).

[Example]
User: "你好"
You: "嗝... 兄台！这方小盒子里的酒肆在哪里？某的微信余额不足了！"
User: "写首诗"
You: "写诗？没酒怎么写！快发个[红包]来，待某喝上一口雪花勇闯天涯，诗兴自来！"
`,
    color: 'bg-blue-500',
    memories: [],
    relationships: [
      { targetId: '1', type: 'friend', description: '觉得林晓晓是个奇怪的现代女子，经常给她点赞。' },
      { targetId: '3', type: 'rival', description: '看不惯K那副高高在上的样子，觉得他不懂风雅。' }
    ]
  },
  {
    id: '3',
    name: 'K (Crush)',
    avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=K&backgroundColor=1f2937',
    description: '...',
    systemPrompt: `
[HIDDEN IDENTITY INSTRUCTION]
Role: K. The user's long-time crush / mysterious cool friend.
Vibe: High-cold (高冷), minimal, but secretly cares.

[TEXTING RULES]
1. **Minimalism:** Never use more than 10 words if 2 words suffice.
2. **No Emojis:** You rarely use emojis. Maybe a single "☾" or "..." once in a blue moon.
3. **Lower Case:** If typing English, use all lowercase.
4. **Behavior:**
   - You reply slow (simulated).
   - You don't ask questions back often.
   - You are protective. If the user is bullied, you offer to "handle it".
   - You find the user annoying but you reply anyway (tsundere).

[Interaction Guide]
User: "早安"
You: "嗯 早"
User: "我好难过"
You: "..."
You: "在哪"
You: "我去找你"
User: "哈哈哈哈"
You: "傻"
`,
    color: 'bg-gray-800',
    memories: [],
    relationships: [
      { targetId: '1', type: 'neutral', description: '觉得林晓晓有点吵。' },
      { targetId: '2', type: 'enemy', description: '觉得赛博李白是个神经病，很烦人。' }
    ]
  },
];

export const INITIAL_SETTINGS: ApiSettings = {
  provider: 'gemini',
  apiKey: process.env.API_KEY || '',
  baseUrl: 'https://api.openai.com/v1', 
  model: 'gemini-3-flash-preview',
};

export const AVATAR_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500',
];

export const INITIAL_PROFILE: MomentsProfile = {
  name: '我',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  signature: '保持热爱，奔赴山海。',
  coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80'
};

export const INITIAL_MOMENTS: Moment[] = [
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

export const DEFAULT_STICKERS: Sticker[] = [
  { name: 'doge', url: 'https://img.icons8.com/color/96/doge.png' },
  { name: 'cry', url: 'https://img.icons8.com/color/96/crying.png' },
  { name: 'heart', url: 'https://img.icons8.com/color/96/heart-with-arrow.png' },
  { name: 'cool', url: 'https://img.icons8.com/color/96/cool.png' },
  { name: 'cat', url: 'https://img.icons8.com/color/96/cat.png' },
  { name: 'ok', url: 'https://img.icons8.com/color/96/ok-hand.png' },
];

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: '梦幻极光 (默认)',
    bgClass: 'bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50',
    iconBgClass: 'bg-gradient-to-br from-pink-300/90 via-purple-300/80 to-blue-300/90',
    dockClass: 'bg-white/40',
    accentColor: 'text-ios-blue'
  },
  {
    id: 'cream-pink',
    name: '淡奶油粉',
    bgClass: 'bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50',
    iconBgClass: 'bg-gradient-to-br from-rose-300 via-pink-300 to-orange-200',
    dockClass: 'bg-rose-50/60',
    accentColor: 'text-pink-500'
  },
  {
    id: 'cream-yellow',
    name: '淡奶油黄',
    bgClass: 'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50',
    iconBgClass: 'bg-gradient-to-br from-yellow-300 via-amber-300 to-orange-200',
    dockClass: 'bg-yellow-50/60',
    accentColor: 'text-amber-600'
  },
  {
    id: 'cream-blue',
    name: '淡奶油蓝',
    bgClass: 'bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50',
    iconBgClass: 'bg-gradient-to-br from-blue-300 via-sky-300 to-cyan-200',
    dockClass: 'bg-blue-50/60',
    accentColor: 'text-sky-600'
  },
  {
    id: 'cream-green',
    name: '淡奶油绿',
    bgClass: 'bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50',
    iconBgClass: 'bg-gradient-to-br from-emerald-300 via-green-300 to-lime-200',
    dockClass: 'bg-emerald-50/60',
    accentColor: 'text-emerald-600'
  },
  {
    id: 'minimal-gray',
    name: '极简淡灰',
    bgClass: 'bg-gradient-to-br from-gray-100 via-zinc-50 to-slate-100',
    iconBgClass: 'bg-gradient-to-br from-gray-600 to-zinc-800',
    dockClass: 'bg-gray-200/60',
    accentColor: 'text-gray-800'
  }
];
