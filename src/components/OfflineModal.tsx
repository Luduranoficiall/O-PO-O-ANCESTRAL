import React from 'react';
import { audio } from '../utils/audio';

interface OfflineModalProps {
  elapsedMinutes: number;
  gathered: {
    wood: number;
    stone: number;
    iron: number;
    crystal: number;
  };
  expeditionsCount: number;
  onClaim: () => void;
}

export const OfflineModal: React.FC<OfflineModalProps> = ({
  elapsedMinutes,
  gathered,
  expeditionsCount,
  onClaim,
}) => {
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = Math.floor(elapsedMinutes % 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#1c1713] border border-amber-600/50 w-full max-w-md rounded-xl shadow-2xl p-6 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-amber-950/60 border-2 border-amber-500/80 mx-auto flex items-center justify-center text-3xl shadow-inner">
          🏡
        </div>

        <div>
          <span className="font-cinzel text-xl font-bold text-amber-200 block">
            Bem-vindo de Volta à Vila!
          </span>
          <p className="text-xs text-stone-400 mt-1">
            Enquanto você esteve fora por{' '}
            <strong className="text-amber-300">
              {hours > 0 ? `${hours}h ` : ''}
              {minutes}min
            </strong>
            , seus trabalhadores continuaram operando os veios e serras.
          </p>
        </div>

        {/* Resources Gained */}
        <div className="bg-[#14110e] p-4 rounded-lg border border-amber-950/60 grid grid-cols-2 gap-3 text-left">
          <div className="flex items-center justify-between text-xs p-1">
            <span className="text-stone-400">🌲 Madeira:</span>
            <span className="text-emerald-400 font-mono font-bold">+{gathered.wood}</span>
          </div>
          <div className="flex items-center justify-between text-xs p-1">
            <span className="text-stone-400">🪨 Pedra:</span>
            <span className="text-slate-300 font-mono font-bold">+{gathered.stone}</span>
          </div>
          <div className="flex items-center justify-between text-xs p-1">
            <span className="text-stone-400">⛏️ Ferro:</span>
            <span className="text-amber-400 font-mono font-bold">+{gathered.iron}</span>
          </div>
          <div className="flex items-center justify-between text-xs p-1">
            <span className="text-stone-400">✨ Cristal:</span>
            <span className="text-cyan-300 font-mono font-bold">+{gathered.crystal}</span>
          </div>
        </div>

        {expeditionsCount > 0 && (
          <div className="text-xs text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-800/40">
            ⭐ {expeditionsCount} expedição(ões) retornaram prontas para resgate!
          </div>
        )}

        <button
          onClick={() => {
            audio.playCollect();
            onClaim();
          }}
          className="w-full py-2.5 bg-amber-700 hover:bg-amber-600 text-amber-100 font-semibold rounded-lg shadow-lg text-sm transition-colors cursor-pointer"
        >
          Coletar e Entrar na Vila
        </button>
      </div>
    </div>
  );
};
