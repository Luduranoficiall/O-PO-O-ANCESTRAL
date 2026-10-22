import React from 'react';
import { GameState, PioneerSpecialist } from '../types/game';
import { PIONEER_SPECIALISTS } from '../data/gameData';
import { audio } from '../utils/audio';

interface TavernModalProps {
  gameState: GameState;
  onClose: () => void;
  onHireSpecialist: (specialistId: string) => void;
}

export const TavernModal: React.FC<TavernModalProps> = ({
  gameState,
  onClose,
  onHireSpecialist,
}) => {
  const { resources, hiredSpecialistIds } = gameState;

  const canAfford = (spec: PioneerSpecialist) => {
    return (
      resources.wood_refined >= spec.cost.wood_refined &&
      resources.stone_refined >= spec.cost.stone_refined &&
      resources.iron_refined >= spec.cost.iron_refined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#181410] border border-amber-800/60 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/60 bg-[#221a14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-900/40 border border-amber-600/50 flex items-center justify-center text-xl shadow">
              🍺
            </div>
            <div>
              <span className="font-cinzel text-lg font-bold text-amber-200 block">
                Taverna dos Pioneiros
              </span>
              <span className="text-xs text-stone-400">
                Acolha artesãos e aventureiros com histórias de vida e dons comunitários únicos
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <p className="text-xs text-stone-400 font-serif leading-relaxed">
            Ao redor da lareira da taverna, pioneiros que já percorreram caminhos difíceis compartilham seus saberes.
            Contratar um especialista concede bônus permanentes e aquece a convivência no vilarejo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PIONEER_SPECIALISTS.map((spec) => {
              const isHired = hiredSpecialistIds.includes(spec.id);
              const affordable = canAfford(spec);

              return (
                <div
                  key={spec.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isHired
                      ? 'bg-amber-950/30 border-amber-500/70 shadow-sm'
                      : 'bg-[#201812] border-amber-900/30 hover:border-amber-700/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="font-medium text-amber-200 text-sm">{spec.name}</span>
                        <span className="text-[11px] text-amber-500/80 block">{spec.title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isHired
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                            : 'bg-stone-900 text-stone-400'
                        }`}
                      >
                        {isHired ? 'INTEGRADO À VILA' : 'NA TAVERNA'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-300 italic font-serif my-2.5 pl-2 border-l border-amber-600/40">
                      "{spec.quote}"
                    </p>

                    <div className="text-xs text-emerald-400 font-medium mb-3">
                      Habilidade:{' '}
                      <strong className="text-emerald-300">
                        {spec.trait} (+{Math.round((spec.multiplier - 1) * 100)}% em {spec.bonusCategory})
                      </strong>
                    </div>

                    {!isHired && (
                      <div className="text-[11px] text-stone-400 pt-2 border-t border-amber-950/40">
                        <span className="text-amber-500/80 block mb-1">Custo para Convidar:</span>
                        <div className="flex gap-2">
                          <span className={resources.wood_refined >= spec.cost.wood_refined ? 'text-stone-300' : 'text-red-400'}>
                            {spec.cost.wood_refined} Tábuas
                          </span>
                          <span>·</span>
                          <span className={resources.stone_refined >= spec.cost.stone_refined ? 'text-stone-300' : 'text-red-400'}>
                            {spec.cost.stone_refined} Blocos
                          </span>
                          <span>·</span>
                          <span className={resources.iron_refined >= spec.cost.iron_refined ? 'text-stone-300' : 'text-red-400'}>
                            {spec.cost.iron_refined} Lingotes
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      audio.playLevelUp();
                      onHireSpecialist(spec.id);
                    }}
                    disabled={isHired || !affordable}
                    className={`mt-4 py-2 px-4 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      isHired
                        ? 'bg-transparent text-emerald-400 border border-emerald-800/40 cursor-default'
                        : affordable
                          ? 'bg-amber-700 hover:bg-amber-600 text-amber-100 shadow'
                          : 'bg-stone-900 text-stone-500 cursor-not-allowed border border-stone-800'
                    }`}
                  >
                    {isHired ? '✓ Especialista na Comunidade' : 'Convidar para a Vila'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
