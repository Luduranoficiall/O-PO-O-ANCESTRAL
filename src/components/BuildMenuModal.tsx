import React from 'react';
import { GameState, BuildingType } from '../types/game';
import { BUILDINGS_INFO } from '../data/gameData';
import { audio } from '../utils/audio';

interface BuildMenuModalProps {
  gameState: GameState;
  onClose: () => void;
  onSelectBuildingToPlace: (type: BuildingType) => void;
}

export const BuildMenuModal: React.FC<BuildMenuModalProps> = ({
  gameState,
  onClose,
  onSelectBuildingToPlace,
}) => {
  const { resources, placedBuildings } = gameState;

  const countBuildingType = (type: BuildingType) => {
    return placedBuildings.filter((b) => b.type === type).length;
  };

  const canAfford = (type: BuildingType) => {
    const info = BUILDINGS_INFO[type];
    if (!info) return false;
    const cost = info.baseCost;

    if (cost.wood_raw && resources.wood_raw < cost.wood_raw) return false;
    if (cost.wood_refined && resources.wood_refined < cost.wood_refined) return false;
    if (cost.stone_raw && resources.stone_raw < cost.stone_raw) return false;
    if (cost.stone_refined && resources.stone_refined < cost.stone_refined) return false;
    if (cost.iron_raw && resources.iron_raw < cost.iron_raw) return false;
    if (cost.iron_refined && resources.iron_refined < cost.iron_refined) return false;
    if (cost.crystal_raw && resources.crystal_raw < cost.crystal_raw) return false;
    if (cost.crystal_refined && resources.crystal_refined < cost.crystal_refined) return false;

    return true;
  };

  const buildingTypes: BuildingType[] = [
    'sawmill',
    'quarry',
    'forge',
    'warehouse',
    'arcane_workshop',
    'workers_hut',
    'tavern',
    'alchemy_lab',
    'mayors_manor',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#1a1613] border border-amber-900/50 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/40 bg-[#221c17] flex items-center justify-between">
          <div>
            <span className="font-cinzel text-xl font-bold text-amber-200 block">
              Construções da Vila
            </span>
            <span className="text-xs text-stone-400">
              Escolha uma estrutura para posicionar livremente na grade ao redor do poço.
            </span>
          </div>
          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="text-stone-400 hover:text-white px-2 py-1 text-sm rounded transition-colors cursor-pointer"
          >
            ✕ Fechar
          </button>
        </div>

        {/* Buildings Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildingTypes.map((type) => {
            const info = BUILDINGS_INFO[type];
            if (!info) return null;
            const count = countBuildingType(type);
            const isMax = count >= info.maxCount;
            const affordable = canAfford(type);
            const cost = info.baseCost;

            return (
              <div
                key={type}
                className="bg-[#201a15] p-4 rounded-lg border border-amber-900/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-amber-200 text-sm">{info.name}</span>
                    <span className="text-xs text-stone-400 font-mono">
                      {count}/{info.maxCount} Construídos
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-500/80 block mb-2">{info.tagline}</span>
                  <p className="text-xs text-stone-400 mb-3 leading-relaxed">{info.description}</p>

                  <div className="text-[11px] text-stone-400">
                    <span className="text-amber-500/80 block mb-1">Custo de Construção:</span>
                    <div className="flex flex-wrap gap-2">
                      {cost.wood_raw && (
                        <span className={resources.wood_raw >= cost.wood_raw ? 'text-stone-300' : 'text-red-400'}>
                          {cost.wood_raw} Madeira
                        </span>
                      )}
                      {cost.wood_refined && (
                        <span
                          className={resources.wood_refined >= cost.wood_refined ? 'text-emerald-400' : 'text-red-400'}
                        >
                          {cost.wood_refined} Tábuas
                        </span>
                      )}
                      {cost.stone_raw && (
                        <span className={resources.stone_raw >= cost.stone_raw ? 'text-stone-300' : 'text-red-400'}>
                          {cost.stone_raw} Pedra
                        </span>
                      )}
                      {cost.stone_refined && (
                        <span
                          className={resources.stone_refined >= cost.stone_refined ? 'text-stone-300' : 'text-red-400'}
                        >
                          {cost.stone_refined} Blocos
                        </span>
                      )}
                      {cost.iron_raw && (
                        <span className={resources.iron_raw >= cost.iron_raw ? 'text-amber-300' : 'text-red-400'}>
                          {cost.iron_raw} Ferro
                        </span>
                      )}
                      {cost.iron_refined && (
                        <span
                          className={resources.iron_refined >= cost.iron_refined ? 'text-amber-300' : 'text-red-400'}
                        >
                          {cost.iron_refined} Lingotes
                        </span>
                      )}
                      {cost.crystal_raw && (
                        <span
                          className={resources.crystal_raw >= cost.crystal_raw ? 'text-cyan-300' : 'text-red-400'}
                        >
                          {cost.crystal_raw} Cristal
                        </span>
                      )}
                      {cost.crystal_refined && (
                        <span
                          className={resources.crystal_refined >= cost.crystal_refined ? 'text-cyan-300' : 'text-red-400'}
                        >
                          {cost.crystal_refined} Catalisador
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    audio.playClick();
                    onSelectBuildingToPlace(type);
                  }}
                  disabled={!affordable || isMax}
                  className={`mt-4 py-2 px-4 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    isMax
                      ? 'bg-stone-900 text-stone-600 cursor-not-allowed'
                      : affordable
                        ? 'bg-amber-700 hover:bg-amber-600 text-amber-100 shadow'
                        : 'bg-stone-900 text-stone-500 cursor-not-allowed border border-stone-800'
                  }`}
                >
                  {isMax ? 'Limite de Construção Atingido' : 'Posicionar no Mapa'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
