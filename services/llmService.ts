
import { GoogleGenAI, Chat, GenerateContentResponse, Part } from "@google/genai";
import { Message, MessageRole, ApiSettings } from "../types";

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Parses a message content string into an array of Parts for Gemini.
 * Handles [IMAGE::base64] tags and regular text.
 * Also parses [VOICE::duration::content] to extract just the content for the AI.
 */
function parseContentToParts(content: string): Part[] {
  const parts: Part[] = [];
  
  // 1. First, handle VOICE tags by converting them to plain text for the AI to understand
  // Format: [VOICE::duration::content] -> "content"
  // We do this replacement first so the AI just sees the text.
  let processedContent = content.replace(/\[VOICE::.*?::(.*?)\]/g, "$1");

  // 2. Now handle Images
  // Regex matches [IMAGE::data:mime;base64,rawBase64]
  // Capture groups: 1=full data url, 2=mime type, 3=base64 data
  const imageRegex = /\[IMAGE::(data:(.*?);base64,(.*?))\]/g;
  
  let lastIndex = 0;
  let match;

  while ((match = imageRegex.exec(processedContent)) !== null) {
      // Text before the image
      if (match.index > lastIndex) {
          const text = processedContent.substring(lastIndex, match.index);
          if (text.trim()) parts.push({ text: text });
      }

      // The Image Part
      const mimeType = match[2];
      const data = match[3];
      
      if (mimeType && data) {
        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: data
            }
        });
      }

      lastIndex = imageRegex.lastIndex;
  }

  // Remaining text after the last image
  if (lastIndex < processedContent.length) {
      const text = processedContent.substring(lastIndex);
      if (text.trim()) parts.push({ text: text });
  }
  
  // If the content is purely text with no images or if parsing resulted in nothing
  // (e.g. empty string), ensure we have at least one text part unless it was just whitespace.
  if (parts.length === 0 && processedContent.trim()) {
       parts.push({ text: processedContent });
  }

  return parts;
}

/**
 * Handles communication with Gemini API
 */
async function streamGeminiResponse(
  messages: Message[],
  systemPrompt: string,
  settings: ApiSettings,
  callbacks: StreamCallbacks
) {
  try {
    const apiKey = settings.apiKey || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please configure it in settings.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Create chat history for Gemini
    // Convert previous messages to history format, excluding the very last user message which is sent in sendMessage
    const history = messages.slice(0, -1).map(m => ({
      role: m.role,
      parts: parseContentToParts(m.content),
    }));

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== MessageRole.USER) {
      throw new Error("Invalid message history state");
    }

    // Parse the new message content to support text + image
    const lastMessageParts = parseContentToParts(lastMessage.content);

    const chat: Chat = ai.chats.create({
      model: settings.model.includes('gemini') ? settings.model : 'gemini-3-flash-preview',
      config: {
        systemInstruction: systemPrompt,
      },
      history: history,
    });

    // Send message. If it's just text, pass string. If mixed/image, pass parts array.
    const messagePayload = lastMessageParts.length === 1 && lastMessageParts[0].text 
        ? lastMessageParts[0].text 
        : lastMessageParts;

    const result = await chat.sendMessageStream({ message: messagePayload as string | Part[] });

    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        callbacks.onChunk(c.text);
      }
    }
    callbacks.onComplete();

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Handles communication with Custom OpenAI-compatible API
 */
async function streamCustomResponse(
  messages: Message[],
  systemPrompt: string,
  settings: ApiSettings,
  callbacks: StreamCallbacks
) {
  try {
    if (!settings.apiKey) {
      throw new Error("API Key is required for custom connection.");
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    };

    const payloadMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => {
        // Strip custom tags for text models
        let cleanContent = m.content.replace(/\[IMAGE::.*?\]/g, '[图片]'); // Simplify images
        cleanContent = cleanContent.replace(/\[VOICE::.*?::(.*?)\]/g, '$1'); // Extract voice text
        return { role: m.role, content: cleanContent };
      })
    ];

    // Ensure no double slashes if user adds trailing slash to baseUrl
    const baseUrl = settings.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: settings.model || 'gpt-3.5-turbo',
        messages: payloadMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Custom API Error (${response.status}): ${errText}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const dataStr = trimmed.slice(6);
          if (dataStr === "[DONE]") {
            continue;
          }
          try {
            const json = JSON.parse(dataStr);
            const content = json.choices?.[0]?.delta?.content || "";
            if (content) {
              callbacks.onChunk(content);
            }
          } catch (e) {
            console.warn("Failed to parse custom stream chunk", e);
          }
        }
      }
    }
    callbacks.onComplete();

  } catch (error: any) {
    console.error("Custom API Error:", error);
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function sendMessageStream(
  messages: Message[],
  systemPrompt: string,
  settings: ApiSettings,
  callbacks: StreamCallbacks
) {
  if (settings.provider === 'gemini') {
    return streamGeminiResponse(messages, systemPrompt, settings, callbacks);
  } else {
    return streamCustomResponse(messages, systemPrompt, settings, callbacks);
  }
}
