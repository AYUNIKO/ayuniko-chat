import type { Chat } from '@google/genai';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const createAyunikoChat = (): Chat => {
  // stub per non toccare App.tsx
  return {} as Chat;
};

export const sendMessageToGemini = async (_chat: Chat, message: string) => {
  if (!BASE_URL) throw new Error('Missing VITE_API_BASE_URL');

  const r = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`Backend error ${r.status}: ${txt}`);
  }

  const data = await r.json();
  return data.reply ?? '';
};
