import { SYSTEM_INSTRUCTION } from '../constants';

// url del backend su vercel (es: https://ayuniko-chat-backend.vercel.app)
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

type Chat = { id: string };

export const createAyunikoChat = (): Chat => {
  // manteniamo la stessa interfaccia usata da App.tsx
  return { id: 'ayuniko-chat' };
};

export const sendMessageToGemini = async (_chat: Chat, message: string) => {
  if (!BASE_URL) {
    throw new Error('Missing VITE_API_BASE_URL');
  }

  const r = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      // opzionale: se vuoi che il backend riceva anche il system prompt
      // altrimenti il system sta fisso nel backend
      system: SYSTEM_INSTRUCTION,
    }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`Backend error ${r.status}: ${txt}`);
  }

  const data = await r.json();
  // compatibilità: backend può rispondere {reply} oppure {text}
  return data.reply ?? data.text ?? '';
};
