import { GoogleGenAI } from '@google/genai';
import { Character, Moment, ApiSettings, MomentsProfile } from '../types';

// Helper to get AI instance
const getAi = (settings: ApiSettings) => {
  return new GoogleGenAI({ apiKey: settings.apiKey });
};

// 1. Generate a new moment for a character
export const generateCharacterMoment = async (
  character: Character,
  settings: ApiSettings
): Promise<{ content: string; imageUrl?: string } | null> => {
  try {
    const ai = getAi(settings);
    const prompt = `
      Role: You are ${character.name}.
      Task: Generate a social media post (Moments/朋友圈) for yourself.
      Context: ${character.systemPrompt}
      
      Requirements:
      1. Content: Short, in character, casual.
      2. Language: Chinese (with your specific slang/style).
      3. Image Prompt: Describe an image that fits this post (in English, for image generation).
      
      Output JSON format:
      {
        "content": "post text here",
        "imagePrompt": "description of image"
      }
    `;

    const response = await ai.models.generateContent({
      model: settings.model,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const result = JSON.parse(response.text || '{}');
    
    // For now, we use a placeholder image based on the prompt keywords or random
    // In a real app with image gen, we'd call that API here.
    // We'll use Unsplash source with keywords.
    const keywords = result.imagePrompt ? result.imagePrompt.split(' ').slice(0, 2).join(',') : 'lifestyle';
    const imageUrl = `https://source.unsplash.com/random/500x500/?${encodeURIComponent(keywords)}`;

    return {
      content: result.content,
      imageUrl: imageUrl // Note: source.unsplash is deprecated/unreliable, but good for mock. 
                         // Better: use specific collection or picsum with seed.
                         // Let's use picsum with a random seed for stability.
    };
  } catch (error) {
    console.error('Failed to generate moment:', error);
    return null;
  }
};

// 2. Generate a reaction (Like/Comment) to a moment
export const generateReaction = async (
  reactor: Character,
  moment: Moment,
  settings: ApiSettings
): Promise<{ type: 'like' | 'comment' | 'both' | 'none'; comment?: string }> => {
  try {
    const ai = getAi(settings);
    const prompt = `
      Role: You are ${reactor.name}.
      Task: React to a social media post by ${moment.userName}.
      
      Your Persona: ${reactor.systemPrompt}
      
      The Post:
      "${moment.content}"
      
      Instructions:
      1. Decide if you would 'like', 'comment', 'both', or 'none'.
      2. If commenting, write a short comment in your style.
      3. Consider your relationship with the author.
      
      Output JSON:
      {
        "type": "like" | "comment" | "both" | "none",
        "comment": "comment text if applicable"
      }
    `;

    const response = await ai.models.generateContent({
      model: settings.model,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(response.text || '{"type": "none"}');
  } catch (error) {
    console.error('Failed to generate reaction:', error);
    return { type: 'none' };
  }
};

// 3. Get Chat Context Injection
export const getChatContextInjection = (
  character: Character,
  recentMoments: Moment[],
  userProfile: MomentsProfile
): string => {
  // Filter moments from the last 24 hours (simulated)
  // For now, just take the last 5 moments
  const relevantMoments = recentMoments.slice(0, 5);
  
  if (relevantMoments.length === 0) return '';

  let context = `\n[SOCIAL MEDIA CONTEXT - RECENT MOMENTS]\n`;
  
  relevantMoments.forEach(m => {
    const author = m.userId === 'me' ? userProfile.name : m.userName;
    context += `- ${author} posted: "${m.content}" (Likes: ${m.likes}, Comments: ${m.comments.length})\n`;
  });

  // Add relationship context specific instructions
  if (character.relationships) {
    context += `\n[RELATIONSHIP DYNAMICS]\n`;
    character.relationships.forEach(rel => {
      // We need to map ID to Name roughly or just use the description which usually contains the name.
      context += `Relation to character ID ${rel.targetId}: ${rel.type}. ${rel.description}\n`;
      
      if (rel.type === 'enemy' || rel.type === 'rival') {
        context += `-> INSTRUCTION: If appropriate, make a subtle dig or badmouth this person to the user.\n`;
      }
    });
  }

  return context;
};
