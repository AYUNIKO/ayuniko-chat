
import React, { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, Phone, Info, MessageSquare } from 'lucide-react';
import { Message, ChatState } from './types';
import { createAyunikoChat, sendMessageToGemini } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ResourceButtons from './components/ResourceButtons';

const App: React.FC = () => {
  const [state, setState] = useState<ChatState>({
    messages: [
      {
        id: 'welcome',
        role: 'model',
        text: 'Hola, bienvenido al soporte oficial de AYÚNIKO 😊 ¿En qué puedo ayudarte hoy con tus productos?',
        timestamp: new Date()
      }
    ],
    isLoading: false,
    error: null
  });
  const [input, setInput] = useState('');
  const [chatInstance] = useState(() => createAyunikoChat());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || state.isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
      error: null
    }));
    setInput('');

    try {
      const response = await sendMessageToGemini(chatInstance, textToSend);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: new Date()
      };
      setState(prev => ({ ...prev, messages: [...prev.messages, botMsg], isLoading: false }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Lo sentimos, hubo un error de conexión. Por favor, intenta de nuevo.'
      }));
    }
  };

  const onSabiasQue = () => {
    handleSend("Cuéntame un dato curioso sobre nutrición o los productos Ayuniko.");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="glass-header px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center shadow-md overflow-hidden">
               <img src="https://picsum.photos/seed/ayuniko/100/100" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight">AYÚNIKO</h1>
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Post-Venta Oficial</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
            title="Reiniciar"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto flex flex-col overflow-hidden">
        
        {/* Resource Buttons */}
        <div className="px-4 pt-4 flex-shrink-0">
          <ResourceButtons onSabiasQue={onSabiasQue} />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden px-4 pb-4">
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
              {state.messages.map(m => <ChatMessage key={m.id} message={m} />)}
              {state.isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              {state.error && (
                <div className="text-center p-3 bg-red-50 text-red-500 text-xs rounded-xl border border-red-100">
                  {state.error}
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu duda aquí..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                  disabled={state.isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || state.isLoading}
                  className={`absolute right-2 p-2 rounded-lg transition-all ${
                    !input.trim() || state.isLoading 
                      ? 'text-slate-300' 
                      : 'text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Send size={20} />
                </button>
              </form>
              <div className="flex justify-center mt-2">
                 <p className="text-[9px] text-slate-400 flex items-center">
                  <Info size={10} className="mr-1" />
                  Información basada en la guía oficial de AYÚNIKO
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
            </main>

      {/* Footer */}
      <footer className="flex-shrink-0 pb-6 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">

          <div className="flex items-center justify-center gap-6 text-xs">

            <a
              href="https://es.ayuniko.shop"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:underline"
            >
              <Phone size={16} />
              soporte whatsapp
            </a>

            <a
              href="https://es.ayuniko.shop/filosofia"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-slate-600 font-semibold hover:underline"
            >
              <MessageSquare size={16} />
              filosofía ayúniko
            </a>

          </div>

          <div className="mt-3 text-center text-[10px] text-slate-400 tracking-wide">
            asistente inteligente · no sustituye consejo médico profesional
          </div>

        </div>
      </footer>

    </div>
  );
    </div>
  );
};

export default App;
