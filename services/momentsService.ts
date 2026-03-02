import { GoogleGenAI } from "@google/genai";
import { Character, Moment, Comment } from "../types";

// Initialize Gemini API
// Note: In a real app, we should probably reuse the instance from a central place, 
// but for now we'll create a new one or pass it in.
// We'll assume the API key is available in process.env
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = "gemini-2.5-flash-latest"; // Using a fast model for background tasks

/**
 * Generates a new moment post for a character based on their persona.
 */
export const generateCharacterMoment = async (character: Character): Promise<{ content: string, images: string[] }> => {
  try {
    const prompt = `
      You are roleplaying as ${character.name}.
      Description: ${character.description}
      
      Write a social media post (like a WeChat Moment or Twitter status) from your perspective.
      It should be short, casual, and reflect your current mood or activity.
      Do not include hashtags unless it fits your character perfectly.
      Max length: 140 characters.
      
      Also, suggest a keyword for an image that would go with this post (e.g., "coffee", "sunset", "coding").
      
      Output format JSON:
      {
        "content": "The post text...",
        "imageKeyword": "keyword"
      }
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const result = JSON.parse(response.text || '{}');
    
    // Map keyword to a placeholder image URL (using Unsplash source or similar)
    const images = result.imageKeyword 
      ? [`https://source.unsplash.com/random/800x800/?${encodeURIComponent(result.imageKeyword)}`] 
      : [];

    // Fallback if unsplash source is deprecated or we want specific ones, 
    // but for now let's use a reliable placeholder service or just the keyword logic.
    // Actually source.unsplash is often slow or deprecated. Let's use picsum with seed.
    const safeImages = result.imageKeyword 
      ? [`https://picsum.photos/seed/${result.imageKeyword}/800/800`] 
      : [];

    return {
      content: result.content,
      images: safeImages
    };
  } catch (error) {
    console.error("Failed to generate moment:", error);
    return { content: "今天天气不错。", images: [] };
  }
};

/**
 * Generates a comment or like action from a character on a user's moment.
 */
export const generateCharacterReaction = async (
  character: Character, 
  userMoment: Moment
): Promise<{ action: 'like' | 'comment' | 'both' | 'none', comment?: string }> => {
  try {
    const prompt = `
      You are roleplaying as ${character.name}.
      Description: ${character.description}
      
      Your friend (the user) just posted this on social media:
      "${userMoment.content}"
      
      Decide how you want to react. You can:
      1. Like it
      2. Comment on it
      3. Both
      4. Do nothing (ignore)
      
      If you comment, keep it short, casual, and in character.
      
      Output format JSON:
      {
        "action": "like" | "comment" | "both" | "none",
        "comment": "Your comment text (optional)"
      }
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text || '{"action": "none"}');
  } catch (error) {
    console.error("Failed to generate reaction:", error);
    return { action: 'none' };
  }
};

/**
 * Generates a reply from a character to a user's comment on the character's post.
 */
export const generateCharacterReply = async (
  character: Character,
  originalPost: Moment,
  userComment: Comment
): Promise<string> => {
  try {
    const prompt = `
      You are roleplaying as ${character.name}.
      Description: ${character.description}
      
      You posted: "${originalPost.content}"
      
      The user commented: "${userComment.content}"
      
      Write a short reply to this comment.
      
      Output format JSON:
      {
        "reply": "Your reply text"
      }
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const result = JSON.parse(response.text || '{}');
    return result.reply || "Haha";
  } catch (error) {
    console.error("Failed to generate reply:", error);
    return "👀";
  }
};
