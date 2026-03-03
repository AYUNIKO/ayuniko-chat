
import { GoogleGenAI, Chat } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../constants';

const apiKey = (process.env as any).API_KEY;
const ai = new GoogleGenAI({ apiKey, vertexai: true });

export const createAyunikoChat = (): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.4,
      topP: 0.95,
    },
  });
};

export const sendMessageToGemini = async (chat: Chat, message: string) => {
  try {
    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};
