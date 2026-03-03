
import React from 'react';
import { Message } from '../types';
import { User } from 'lucide-react';
import { BOT_AVATAR_BASE64 } from '../constants';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.role === 'model';

  return (
    <div className={`flex w-full mb-4 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] md:max-w-[80%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-1 overflow-hidden ${isBot ? 'mr-2 border border-slate-200' : 'bg-slate-200 text-slate-600 ml-2'}`}>
          {isBot ? (
            <img src="https://picsum.photos/seed/ayuniko-logo/100/100" alt="AI" className="w-full h-full object-cover" />
          ) : (
            <User size={16} />
          )}
        </div>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isBot 
            ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm' 
            : 'bg-slate-900 text-white rounded-tr-none'
        }`}>
          <div className="whitespace-pre-wrap">{message.text}</div>
          <div className={`text-[9px] mt-1.5 opacity-40 font-medium ${isBot ? 'text-slate-500' : 'text-slate-300'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
