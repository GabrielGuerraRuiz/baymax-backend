import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquareHeart, AlertTriangle, Sparkles } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

const QUICK_PROMPTS = [
  '¿Cuándo es mi próxima cita?',
  '¿Qué medicamentos tengo pendientes?',
  '¿Qué doctores están disponibles?',
];

export default function BaymaxChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hola, ${user?.nombre || 'usuario'}. Soy Baymax, tu asistente médico virtual. Puedo consultar tus próximas citas, tomas de medicamentos o doctores registrados. ¿En qué puedo ayudarte hoy?`,
      modoRespaldo: false,
    },
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (texto) => {
    const cleanText = texto.trim();
    if (!cleanText || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: cleanText }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axiosClient.post('/asistente/chat', { mensaje: cleanText });
      setFallbackActive(Boolean(data.modo_respaldo));
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.respuesta,
          modoRespaldo: Boolean(data.modo_respaldo),
        },
      ]);
    } catch (err) {
      console.error('Error en BaymaxChatWidget:', err.response || err);
      setFallbackActive(true);
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error ${status || 'de red'}: ${typeof detail === 'string' ? detail : 'Revisa la terminal de FastAPI.'}`,
          modoRespaldo: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 bg-sky-600 hover:bg-sky-700 text-white px-4 py-3.5 rounded-full shadow-lg hover:shadow-xl transition cursor-pointer"
        >
          <MessageSquareHeart className="w-6 h-6" />
          <span className="font-medium text-sm pr-1">Consultar a Baymax</span>
        </button>
      ) : (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-sky-600 text-white px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">Asistente Baymax</h3>
                <p className="text-xs text-sky-100 flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                  {fallbackActive ? 'Modo respaldo activo' : 'Conectado a tu historial'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/15 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Banner RNF-16 si el servicio externo falla */}
          {fallbackActive && (
            <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-2 flex items-center gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Servicio de IA en modo respaldo (RNF-16). Tus módulos manuales operan normal.</span>
            </div>
          )}

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-sky-600 text-white rounded-br-sm'
                      : msg.modoRespaldo
                      ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-bl-sm'
                      : 'bg-white text-slate-700 border border-slate-200 shadow-xs rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 text-xs text-slate-400">
                  Baymax está consultando tu información...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias rápidas */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-xs bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta médica..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 text-white rounded-xl transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}