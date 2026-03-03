import React, { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, Info } from 'lucide-react';
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
        text: 'Hola 😊 Bienvenido al soporte oficial de AYÚNIKO. ¿En qué puedo ayudarte?',
        timestamp: new Date(),
      },
    ],
    isLoading: false,
    error: null,
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
      timestamp: new Date(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
      error: null,
    }));
    setInput('');

    try {
      const response = await sendMessageToGemini(chatInstance, textToSend);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: new Date(),
      };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, botMsg],
        isLoading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Lo sentimos, hubo un error de conexión. Por favor, intenta de nuevo.',
      }));
    }
  };

  const onSabiasQue = () => {
    handleSend('Cuéntame un dato curioso sobre nutrición o los productos AYÚNIKO.');
  };

  // mostra i pulsanti solo all'inizio (solo welcome, o welcome + 1 msg)
  const showQuickReplies = state.messages.length <= 1 && !state.isLoading;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="glass-header px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center shadow-md overflow-hidden">
              <img
                src="https://picsum.photos/seed/ayuniko/100/100"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight">AYÚNIKO</h1>
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">
                Post-Venta Oficial
              </p>
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
        {/* Resource Buttons (top cards) */}
        <div className="px-4 pt-4 flex-shrink-0">
          <ResourceButtons onSabiasQue={onSabiasQue} />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden px-4 pb-4">
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
              {state.messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}

              {/* quick replies sotto al welcome */}
              {showQuickReplies && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                   onClick={() =>
  handleSend(
    'He comprado las pastillas AYÚNIKO COME y ESPERA. ¿Cuál es el protocolo correcto de toma y en qué momentos del día debo tomarlas?')}
                    className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  >
                    ¿Cómo se toman las pastillas?
                  </button>

                  <button
                    type="button"
                    onClick={() =>  handleSend('He comprado AYÚNIKO BEBE. ¿Cómo se prepara correctamente y cómo debo tomarlo durante el día?')}
                    className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  >
                    ¿Cómo se prepara AYUNIKO BEBÉ?

                  </button>

                  <button
                    type="button"
                   onClick={() =>
  handleSend(
    'Por la tarde siento mucha hambre. ¿Qué recomendaciones de AYÚNIKO pueden ayudarme a controlarla?'
  )
}
                    className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  >
                    ¿Cómo vencer el hambre?

                  </button>
                </div>
              )}

              {state.isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div
                        className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      ></div>
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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="relative flex items-center"
              >
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
      {/* Footer Supporto Umano */}
<footer className="flex-shrink-0 px-4 pb-8 pt-6 bg-slate-50 border-t border-slate-200">
  <div className="max-w-3xl mx-auto text-center">

    <p className="text-xs font-semibold text-slate-700 mb-3">
      ¿Necesitas ayuda de una persona real?
    </p>

    <a
      href="https://wa.me/34621364947"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
    >
      Soporte humano por WhatsApp
    </a>

    <p className="mt-3 text-[10px] text-slate-400">
      Respuesta directa de nuestro equipo
    </p>

  </div>
</footer>
    </div>
  );
};

export default App;
