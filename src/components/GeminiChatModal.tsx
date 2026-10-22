import React, { useState, useRef, useEffect } from 'react';
import { audio } from '../utils/audio';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

interface GeminiChatModalProps {
  onClose: () => void;
  villageContextSummary?: string;
}

const ROLES = [
  {
    id: 'engineer',
    name: 'Engenheiro Chefe & CEO Estrategista',
    systemInstruction:
      'Você é o Engenheiro Chefe e Diretor de Estratégia de "O Poço Ancestral". Seu tom é executivo, analítico e de alto nível (nível Engenheiro CEO). Você analisa gargalos de produção de recursos (madeira, pedra, ferro, cristal), sugere a melhor ordem de construções (Serraria, Pedreira, Forja, Armazém), calcula rendimento de trabalhadores e otimiza a progressão do jogador até o 70º andar.',
  },
  {
    id: 'sage',
    name: 'Sábio Arcano do Poço',
    systemInstruction:
      'Você é o Guardião Arcano dos segredos subterrâneos de "O Poço Ancestral". Você domina a lore das 7 masmorras, fraquezas dos chefes (como o Golem de Ardósia e a Fera da Fornalha), sinergia das 42 relíquias e os mistérios do Selo do Fundador.',
  },
  {
    id: 'grandfather',
    name: 'Avô Tomás (Memórias da Família)',
    systemInstruction:
      'Você é o Avô Tomás, o antigo minerador que perdeu o medalhão de pedra azul da sua falecida esposa Clara nas galerias do poço. Você fala com amor fraternal, carinho e nostalgia com seu neto(a), relembrando os dias antigos da vila e encorajando a nunca desistir.',
  },
  {
    id: 'custom',
    name: 'Instrução Personalizada',
    systemInstruction: '',
  },
];

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({ onClose, villageContextSummary }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'model',
      text: 'Saudações, governante do vale! Sou o assistente inteligente de O Poço Ancestral. Como posso auxiliar na sua estratégia de engenharia da vila ou nas expedições do poço hoje?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.8-flash',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES[0].id);
  const [customInstruction, setCustomInstruction] = useState('');
  const [selectedModel, setSelectedModel] = useState<'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite'>('gemini-4-argon');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    audio.playClick();
    setErrorMsg(null);

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsLoading(true);

    try {
      const activeRoleConfig = ROLES.find((r) => r.id === selectedRole);
      let sysInstruction = activeRoleConfig?.systemInstruction || '';
      if (selectedRole === 'custom') {
        sysInstruction = customInstruction || 'Você é um assistente útil de RPG e simulação.';
      }

      if (villageContextSummary) {
        sysInstruction += `\n[Contexto Atual da Vila: ${villageContextSummary}]`;
      }

      // Format history for API
      const apiMessages = newHistory.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          systemInstruction: sysInstruction,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao comunicar com o modelo Gemini.');
      }

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'model',
        text: data.reply || 'Sem resposta recebida.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao se conectar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#181410] border border-amber-800/50 w-full max-w-4xl h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/60 bg-[#221a14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-900/40 border border-amber-600/50 flex items-center justify-center text-lg shadow">
              🧙‍♂️
            </div>
            <div>
              <span className="font-cinzel text-base font-bold text-amber-200 block">
                Conselho Estratégico Gemini
              </span>
              <span className="text-[11px] text-stone-400">
                Assistente inteligente multi-turn com papéis e raciocínio avançado
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="text-stone-400 hover:text-white px-2.5 py-1 text-sm rounded transition-colors cursor-pointer"
          >
            ✕ Fechar
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="bg-[#14100c] px-4 py-3 border-b border-amber-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Role selector */}
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-medium">Papel do Assistente:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-[#201812] border border-amber-900/40 text-amber-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
            >
              {ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Model selection */}
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-medium">Modelo:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="bg-[#201812] border border-amber-900/40 text-amber-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
            >
              <option value="gemini-4-argon">gemini-4-argon (Tarefas Complexas & Raciocínio)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Geral & Narrativa)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Rápido)</option>
            </select>
          </div>

          {/* Clear History */}
          <button
            onClick={() => {
              setMessages([]);
            }}
            className="text-[11px] text-stone-500 hover:text-amber-300 transition-colors cursor-pointer"
            title="Limpar histórico da conversa"
          >
            Limpar Conversa
          </button>
        </div>

        {/* Custom Role Field if selected */}
        {selectedRole === 'custom' && (
          <div className="p-3 bg-[#1d1611] border-b border-amber-950/40">
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="Digite uma instrução de sistema personalizada para o assistente..."
              className="w-full bg-[#14100c] border border-amber-900/30 text-amber-100 text-xs rounded px-3 py-1.5 focus:outline-none"
            />
          </div>
        )}

        {/* Message Thread (Scrollable) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 font-sans select-text">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 space-y-2">
              <span className="text-3xl">📜</span>
              <p className="text-xs">
                Inicie uma conversa para receber conselhos executivos, análises de gargalos de produção e dicas do poço.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-2xl ${
                    isUser ? 'ml-auto' : 'mr-auto'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-stone-400">
                    <span className="font-semibold text-amber-400">
                      {isUser ? 'Você' : 'Conselheiro Gemini'}
                    </span>
                    {m.modelUsed && (
                      <span className="font-mono text-[10px] text-stone-500">
                        [{m.modelUsed}]
                      </span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{m.timestamp}</span>
                  </div>

                  <div
                    className={`p-4 rounded-xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-amber-900/50 text-amber-100 border border-amber-700/50 rounded-tr-none'
                        : 'bg-[#221b15] text-[#e5dfd8] border border-amber-900/30 rounded-tl-none shadow-md'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-amber-400 text-xs p-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>O modelo Gemini está raciocinando...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 bg-[#1e1712] border-t border-amber-950/60 flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Pergunte sobre estratégia da vila, otimização de mineração ou segredos do poço..."
            className="flex-1 bg-[#14100c] border border-amber-900/40 text-amber-100 text-xs sm:text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-600/80"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="px-5 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-amber-100 font-semibold rounded-lg text-xs sm:text-sm transition-colors cursor-pointer shadow"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};
