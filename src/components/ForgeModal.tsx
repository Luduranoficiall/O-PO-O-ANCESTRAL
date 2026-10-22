import React, { useState } from 'react';
import { GameState, EquipmentSlot } from '../types/game';
import { audio } from '../utils/audio';

interface ForgeModalProps {
  gameState: GameState;
  onClose: () => void;
  onRefineResource: (category: 'wood' | 'stone' | 'iron' | 'crystal', count: number) => void;
  onUpgradeEquipment: (slot: EquipmentSlot) => void;
  onUpgradeTool: (toolType: 'axe' | 'pickaxe' | 'chisel' | 'bellows') => void;
}

export const ForgeModal: React.FC<ForgeModalProps> = ({
  gameState,
  onClose,
  onRefineResource,
  onUpgradeEquipment,
  onUpgradeTool,
}) => {
  const [activeTab, setActiveTab] = useState<'refine' | 'equip' | 'tools'>('refine');
  const { resources, hero, tools, unlockedSkills } = gameState;

  // Equipment upgrade calculation
  const getUpgradeCost = (slot: EquipmentSlot) => {
    const item = hero.equipment[slot];
    const lvl = item.level;
    const discount = unlockedSkills.includes('master_crafting') ? 0.75 : 1.0;

    return {
      planks: Math.round((20 + lvl * 18) * discount),
      blocks: Math.round((20 + lvl * 18) * discount),
      ingots: Math.round((12 + lvl * 14) * discount),
      catalysts: lvl >= 5 ? Math.round((2 + (lvl - 5) * 3) * discount) : 0,
    };
  };

  const canUpgradeEquip = (slot: EquipmentSlot) => {
    const item = hero.equipment[slot];
    if (item.level >= 10) return false;
    const cost = getUpgradeCost(slot);
    return (
      resources.wood_refined >= cost.planks &&
      resources.stone_refined >= cost.blocks &&
      resources.iron_refined >= cost.ingots &&
      resources.crystal_refined >= cost.catalysts
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#1a1613] border border-amber-900/50 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/40 bg-[#221c17] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-cinzel text-xl font-bold text-amber-200">A Forja & Oficina</span>
            <span className="text-xs text-stone-400">Transforme minério bruto em poder duradouro</span>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-amber-950/40 bg-[#161310] px-4 gap-2">
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('refine');
            }}
            className={`py-3 px-4 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'refine'
                ? 'border-amber-500 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Refino de Recursos
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('equip');
            }}
            className={`py-3 px-4 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'equip'
                ? 'border-amber-500 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Equipamentos do Aventureiro (1 a 10)
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('tools');
            }}
            className={`py-3 px-4 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'tools'
                ? 'border-amber-500 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Ferramentas da Vila (Tiers 1 a 3)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'refine' && (
            <div className="space-y-4">
              <p className="text-xs text-stone-400">
                Aqueça os fornos e acione as serras para transformar matéria bruta em insumos de alta qualidade.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Wood Refine */}
                <div className="bg-[#201a15] p-4 rounded-lg border border-amber-900/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-amber-200 text-sm">Tábuas de Carvalho</span>
                      <span className="text-xs text-emerald-400 font-mono tabular-nums">
                        {resources.wood_refined} no estoque
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mb-3">
                      Corte troncos brutos em tábuas nobres usadas em obras e melhorias.
                    </p>
                    <div className="text-[11px] text-amber-500/90 mb-3">
                      Custo: 10 Madeira Bruta ➔ 1 Tábua de Carvalho
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRefineResource('wood', 1)}
                      disabled={resources.wood_raw < 10}
                      className="flex-1 py-1.5 px-3 bg-amber-900/40 hover:bg-amber-900/70 disabled:opacity-30 disabled:cursor-not-allowed border border-amber-700/40 text-amber-100 rounded text-xs transition-colors cursor-pointer"
                    >
                      Refinar 1
                    </button>
                    <button
                      onClick={() => onRefineResource('wood', 10)}
                      disabled={resources.wood_raw < 100}
                      className="py-1.5 px-3 bg-amber-950 hover:bg-amber-900/50 disabled:opacity-30 disabled:cursor-not-allowed border border-amber-800/30 text-amber-200 rounded text-xs transition-colors cursor-pointer"
                    >
                      Refinar 10
                    </button>
                  </div>
                </div>

                {/* Stone Refine */}
                <div className="bg-[#201a15] p-4 rounded-lg border border-amber-900/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-amber-200 text-sm">Blocos de Pedra Talhada</span>
                      <span className="text-xs text-emerald-400 font-mono tabular-nums">
                        {resources.stone_refined} no estoque
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mb-3">
                      Talha rocha bruta em alvenaria pesada para suportar abalos sísmicos.
                    </p>
                    <div className="text-[11px] text-amber-500/90 mb-3">
                      Custo: 10 Pedra Bruta ➔ 1 Bloco Talhado
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRefineResource('stone', 1)}
                      disabled={resources.stone_raw < 10}
                      className="flex-1 py-1.5 px-3 bg-amber-900/40 hover:bg-amber-900/70 disabled:opacity-30 disabled:cursor-not-allowed border border-amber-700/40 text-amber-100 rounded text-xs transition-colors cursor-pointer"
                    >
                      Refinar 1
                    </button>
                    <button
                      onClick={() => onRefineResource('stone', 10)}
                      disabled={resources.stone_raw < 100}
                      className="py-1.5 px-3 bg-amber-950 hover:bg-amber-900/50 disabled:opacity-30 disabled:cursor-not-allowed border border-amber-800/30 text-amber-200 rounded text-xs transition-colors cursor-pointer"
                    >
                      Refinar 10
                    </button>
                  </div>
                </div>

                {/* Iron Refine */}
                <div className="bg-[#201a15] p-4 rounded-lg border border-amber-900/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-amber-200 text-sm">Lingotes de Ferro Fundido</span>
                      <span className="text-xs text-emerald-400 font-mono tabular-nums">
                        {resources.iron_refined} no estoque
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mb-3">
                      Purifica minério bruto na forja para criar barras de ferro temperado.
                    </p>
                    <div className="text-[11px] text-amber-500/90 mb-3">
                      Custo: 8 Minério de Ferro ➔ 1 Lingote de Ferro
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRefineResource('iron', 1)}
                      disabled={resources.iron_raw < 8}
                      className="flex-1 py-1.5 px-3 bg-amber-900/40 hover:bg-amber-900/70 disabled:opacity-30 disabled:cursor-not-allowed border border-amber-700/40 text-amber-100 rounded text-xs transition-colors cursor-pointer"
                    >
                      Refinar 1
                    </button>
                    <button
                      onClick={() => onRefineResource('iron', 10)}
                      disabled={resources.iron_raw < 80}
                      className="py-1.5 px-3 bg-amber-950 hover:bg-amber-900/50 disabled:opacity-30 disabled:cursor-not-allowed border border-amber-800/30 text-amber-200 rounded text-xs transition-colors cursor-pointer"
                    >
                      Refinar 10
                    </button>
                  </div>
                </div>

                {/* Crystal Refine */}
                <div className="bg-[#201a15] p-4 rounded-lg border border-amber-900/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-amber-200 text-sm">Fragmentos Lapidados</span>
                      <span className="text-xs text-emerald-400 font-mono tabular-nums">
                        {resources.crystal_refined} no estoque
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mb-3">
                      Lapidação facetada de cristais que canalizam magia pura nas armas.
                    </p>
                    <div className="text-[11px] text-amber-500/90 mb-3">
                      Custo: 5 Cristal Bruto ➔ 1 Fragmento Lapidado
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRefineResource('crystal', 1)}
                      disabled={resources.crystal_raw < 5}
                      className="flex-1 py-1.5 px-3 bg-amber-900/40 hover:bg-amber-900/70 disabled:opacity-30 disabled:cursor-not-allowed border border-amber-700/40 text-amber-100 rounded text-xs transition-colors cursor-pointer"
                    >
                      Refinar 1
                    </button>
                    <button
                      onClick={() => onRefineResource('crystal', 10)}
                      disabled={resources.crystal_raw < 50}
                      className="py-1.5 px-3 bg-amber-950 hover:bg-amber-900/50 disabled:opacity-30 disabled:cursor-not-allowed border border-amber-800/30 text-amber-200 rounded text-xs transition-colors cursor-pointer"
                    >
                      Refinar 10
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'equip' && (
            <div className="space-y-4">
              <p className="text-xs text-stone-400">
                Aprimore as 4 peças de combate de Elian até o nível 10 para enfrentar os monstros mais profundos.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['weapon', 'armor', 'shield', 'charm'] as EquipmentSlot[]).map((slot) => {
                  const item = hero.equipment[slot];
                  const cost = getUpgradeCost(slot);
                  const canUp = canUpgradeEquip(slot);
                  const isMax = item.level >= 10;

                  return (
                    <div
                      key={slot}
                      className="bg-[#201a15] p-4 rounded-lg border border-amber-900/30 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-amber-200 text-sm">{item.name}</span>
                          <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                            Nível {item.level}/10
                          </span>
                        </div>

                        <div className="text-xs text-stone-300 mt-2 flex items-center justify-between">
                          <span>Bônus Atual:</span>
                          <span className="text-emerald-400 font-semibold tabular-nums">
                            +{item.baseStat + item.level * item.statPerLevel}{' '}
                            {slot === 'weapon'
                              ? 'Ataque'
                              : slot === 'armor'
                                ? 'Vida Máx'
                                : slot === 'shield'
                                  ? 'Defesa'
                                  : '% Crítico'}
                          </span>
                        </div>

                        {!isMax && (
                          <div className="text-xs text-amber-400/80 mt-1 flex items-center justify-between">
                            <span>Próximo Nível (+1):</span>
                            <span className="font-semibold tabular-nums">
                              +{item.baseStat + (item.level + 1) * item.statPerLevel}
                            </span>
                          </div>
                        )}

                        {!isMax && (
                          <div className="text-[11px] text-stone-400 mt-3 pt-2 border-t border-amber-950/40">
                            <span className="block text-amber-500/80 mb-1">Materiais Necessários:</span>
                            <div className="flex flex-wrap gap-2">
                              <span className={resources.wood_refined >= cost.planks ? 'text-stone-300' : 'text-red-400'}>
                                {cost.planks} Tábuas
                              </span>
                              <span>·</span>
                              <span className={resources.stone_refined >= cost.blocks ? 'text-stone-300' : 'text-red-400'}>
                                {cost.blocks} Blocos
                              </span>
                              <span>·</span>
                              <span className={resources.iron_refined >= cost.ingots ? 'text-stone-300' : 'text-red-400'}>
                                {cost.ingots} Lingotes
                              </span>
                              {cost.catalysts > 0 && (
                                <>
                                  <span>·</span>
                                  <span
                                    className={
                                      resources.crystal_refined >= cost.catalysts ? 'text-cyan-300' : 'text-red-400'
                                    }
                                  >
                                    {cost.catalysts} Fragmentos
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          audio.playForge();
                          onUpgradeEquipment(slot);
                        }}
                        disabled={!canUp || isMax}
                        className={`mt-4 py-2 px-4 rounded text-xs font-semibold transition-colors cursor-pointer ${
                          isMax
                            ? 'bg-amber-900/20 text-amber-500/50 border border-amber-900/30 cursor-default'
                            : canUp
                              ? 'bg-amber-700 hover:bg-amber-600 text-amber-100 shadow-md'
                              : 'bg-stone-900 text-stone-500 border border-stone-800 cursor-not-allowed'
                        }`}
                      >
                        {isMax ? 'Aprimoramento Máximo' : `Forjar Nível ${item.level + 1}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-4">
              <p className="text-xs text-stone-400">
                Aumente o rendimento da extração manual e automatizada na vila em três tiers de qualidade.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Axe */}
                <div className="bg-[#201a15] p-4 rounded-lg border border-amber-900/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-amber-200 text-sm">Machado de Lenhador</span>
                      <span className="text-xs text-amber-400 font-bold">Tier {tools.axeTier}/3</span>
                    </div>
                    <p className="text-xs text-stone-400 mb-3">
                      {tools.axeTier === 1
                        ? 'Machado Rústico de Ferro (+20% madeira).'
                        : tools.axeTier === 2
                          ? 'Machado Temperado de Aço (+45% madeira).'
                          : 'Machado Ancestral Rúnico (+80% madeira e chance de madeira pura).'}
                    </p>
                  </div>
                  {tools.axeTier < 3 ? (
                    <button
                      onClick={() => onUpgradeTool('axe')}
                      disabled={resources.wood_refined < 30 || resources.iron_refined < 15}
                      className="py-1.5 px-3 bg-amber-800 hover:bg-amber-700 disabled:opacity-40 text-amber-100 rounded text-xs transition-colors cursor-pointer"
                    >
                      Forjar Próximo Tier (30 Tábuas, 15 Lingotes)
                    </button>
                  ) : (
                    <div className="text-xs text-amber-500/70 text-center py-1">Tier Máximo Atingido</div>
                  )}
                </div>

                {/* Pickaxe */}
                <div className="bg-[#201a15] p-4 rounded-lg border border-amber-900/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-amber-200 text-sm">Picareta de Minerador</span>
                      <span className="text-xs text-amber-400 font-bold">Tier {tools.pickaxeTier}/3</span>
                    </div>
                    <p className="text-xs text-stone-400 mb-3">
                      {tools.pickaxeTier === 1
                        ? 'Picareta Rústica (+20% pedra e ferro).'
                        : tools.pickaxeTier === 2
                          ? 'Picareta de Ponta Temperada (+45% extração).'
                          : 'Picareta Meteórica (+80% e chance de minérios puros).'}
                    </p>
                  </div>
                  {tools.pickaxeTier < 3 ? (
                    <button
                      onClick={() => onUpgradeTool('pickaxe')}
                      disabled={resources.stone_refined < 30 || resources.iron_refined < 20}
                      className="py-1.5 px-3 bg-amber-800 hover:bg-amber-700 disabled:opacity-40 text-amber-100 rounded text-xs transition-colors cursor-pointer"
                    >
                      Forjar Próximo Tier (30 Blocos, 20 Lingotes)
                    </button>
                  ) : (
                    <div className="text-xs text-amber-500/70 text-center py-1">Tier Máximo Atingido</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
