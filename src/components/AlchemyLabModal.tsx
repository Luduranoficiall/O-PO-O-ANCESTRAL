import React from 'react';
import { GameState, PotionType } from '../types/game';
import { POTIONS_INFO } from '../data/gameData';
import { audio } from '../utils/audio';

interface AlchemyLabModalProps {
  gameState: GameState;
  onClose: () => void;
  onBrewPotion: (potionType: PotionType, count: number) => void;
  onToggleAutoConsume: () => void;
}

export const AlchemyLabModal: React.FC<AlchemyLabModalProps> = ({
  gameState,
  onClose,
  onBrewPotion,
  onToggleAutoConsume,
}) => {
  const { resources, potions, autoConsumePotion } = gameState;

  const canBrew = (potionType: PotionType, mult = 1) => {
    const info = POTIONS_INFO[potionType];
    const cost = info.cost;

    if (cost.wood_raw && resources.wood_raw < cost.wood_raw * mult) return false;
    if (cost.stone_raw && resources.stone_raw < cost.stone_raw * mult) return false;
    if (cost.iron_raw && resources.iron_raw < cost.iron_raw * mult) return false;
    if (cost.crystal_raw && resources.crystal_raw < cost.crystal_raw * mult) return false;
    if (cost.wood_refined && resources.wood_refined < cost.wood_refined * mult) return false;

    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#181410] border border-amber-800/60 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/60 bg-[#221a14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-600/50 flex items-center justify-center text-xl shadow">
              🧪
            </div>
            <div>
              <span className="font-cinzel text-lg font-bold text-amber-200 block">
                Laboratório Alquímico & Cervejaria de Poções
              </span>
              <span className="text-xs text-stone-400">
                Destile bálsamos curativos e elixires elementais para fortalecer o aventureiro no poço
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
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Auto consume toggle banner */}
          <div className="bg-[#201812] p-4 rounded-xl border border-amber-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="font-cinzel text-sm font-semibold text-amber-200 block">
                Protocolo de Emergência do Aventureiro
              </span>
              <p className="text-xs text-stone-400">
                Beber Salvia do Bosque automaticamente sempre que a vida cair abaixo de 35% durante o combate.
              </p>
            </div>
            <button
              onClick={() => {
                audio.playClick();
                onToggleAutoConsume();
              }}
              className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                autoConsumePotion
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-400'
              }`}
            >
              {autoConsumePotion ? '✓ Auto-Cura Ativa' : 'Auto-Cura Desativada'}
            </button>
          </div>

          {/* Potions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['healing_herb', 'flame_oil', 'stone_skin', 'crystal_focus'] as PotionType[]).map((type) => {
              const info = POTIONS_INFO[type];
              const count = potions[type] || 0;
              const cost = info.cost;
              const canBrew1 = canBrew(type, 1);
              const canBrew5 = canBrew(type, 5);

              return (
                <div
                  key={type}
                  className="bg-[#201812] p-4 rounded-xl border border-amber-900/30 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-amber-200 text-sm">{info.name}</span>
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/40">
                        {count} no cinto
                      </span>
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed mb-3">{info.description}</p>

                    <div className="text-[11px] text-stone-400 pt-2 border-t border-amber-950/40">
                      <span className="text-amber-500/80 block mb-1">Ingredientes Necessários:</span>
                      <div className="flex flex-wrap gap-2">
                        {cost.wood_raw && (
                          <span className={resources.wood_raw >= cost.wood_raw ? 'text-stone-300' : 'text-red-400'}>
                            {cost.wood_raw} Madeira
                          </span>
                        )}
                        {cost.stone_raw && (
                          <span className={resources.stone_raw >= cost.stone_raw ? 'text-stone-300' : 'text-red-400'}>
                            {cost.stone_raw} Pedra
                          </span>
                        )}
                        {cost.iron_raw && (
                          <span className={resources.iron_raw >= cost.iron_raw ? 'text-stone-300' : 'text-red-400'}>
                            {cost.iron_raw} Ferro
                          </span>
                        )}
                        {cost.crystal_raw && (
                          <span className={resources.crystal_raw >= cost.crystal_raw ? 'text-cyan-300' : 'text-red-400'}>
                            {cost.crystal_raw} Cristal
                          </span>
                        )}
                        {cost.wood_refined && (
                          <span
                            className={resources.wood_refined >= cost.wood_refined ? 'text-stone-300' : 'text-red-400'}
                          >
                            {cost.wood_refined} Tábuas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => {
                        audio.playCollect();
                        onBrewPotion(type, 1);
                      }}
                      disabled={!canBrew1}
                      className="flex-1 py-1.5 px-3 bg-amber-800 hover:bg-amber-700 disabled:opacity-40 text-amber-100 rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Destilar 1
                    </button>
                    <button
                      onClick={() => {
                        audio.playCollect();
                        onBrewPotion(type, 5);
                      }}
                      disabled={!canBrew5}
                      className="py-1.5 px-3.5 bg-amber-950 hover:bg-amber-900/60 disabled:opacity-40 text-amber-300 border border-amber-800/40 rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Destilar 5
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
