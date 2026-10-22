import React, { useState } from 'react';
import { GameState, SkillNode } from '../types/game';
import { SKILL_NODES } from '../data/gameData';
import { audio } from '../utils/audio';

interface SkillTreeModalProps {
  gameState: GameState;
  onClose: () => void;
  onUnlockSkill: (skillId: string) => void;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  gameState,
  onClose,
  onUnlockSkill,
}) => {
  const [activeTree, setActiveTree] = useState<'village' | 'combat'>('village');
  const { skillPoints, unlockedSkills } = gameState;

  const currentNodes = SKILL_NODES.filter((n) => n.tree === activeTree);

  // Group by tier
  const tiers = [1, 2, 3, 4];

  const canUnlock = (node: SkillNode) => {
    if (unlockedSkills.includes(node.id)) return false;
    if (skillPoints < node.cost) return false;
    if (node.prerequisiteId && !unlockedSkills.includes(node.prerequisiteId)) return false;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#1a1613] border border-amber-900/50 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/40 bg-[#221c17] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-cinzel text-xl font-bold text-amber-200">Árvore de Conhecimento</span>
            <span className="text-xs text-amber-400 font-mono bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800/40">
              {skillPoints} Pontos de Sabedoria Disponíveis
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

        {/* Tab Navigation */}
        <div className="flex border-b border-amber-950/40 bg-[#161310] px-4 gap-2">
          <button
            onClick={() => {
              audio.playClick();
              setActiveTree('village');
            }}
            className={`py-3 px-4 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTree === 'village'
                ? 'border-amber-500 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Vila & Engenharia de Mineração
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setActiveTree('combat');
            }}
            className={`py-3 px-4 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTree === 'combat'
                ? 'border-amber-500 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Combate & Bênçãos do Poço
          </button>
        </div>

        {/* Tree Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <p className="text-xs text-stone-400">
            {activeTree === 'village'
              ? 'Aprimore o rendimento da madeira, extração de veios de ferro e capacidade de armazenamento da vila.'
              : 'Conceda resistências antigas, roubo de vida e ampliação de dano para o herói nas profundezas.'}
          </p>

          <div className="space-y-6">
            {tiers.map((tier) => {
              const nodesInTier = currentNodes.filter((n) => n.tier === tier);
              if (nodesInTier.length === 0) return null;

              return (
                <div key={tier} className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-500/70 block">
                    Nível de Domínio {tier}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {nodesInTier.map((node) => {
                      const isUnlocked = unlockedSkills.includes(node.id);
                      const isReady = canUnlock(node);
                      const prereq = node.prerequisiteId
                        ? SKILL_NODES.find((s) => s.id === node.prerequisiteId)
                        : null;

                      return (
                        <div
                          key={node.id}
                          className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                            isUnlocked
                              ? 'bg-amber-950/30 border-amber-600/60 shadow-sm'
                              : isReady
                                ? 'bg-[#201a15] border-amber-800/40 hover:border-amber-600/80'
                                : 'bg-[#15120f] border-stone-800/40 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span
                                className={`text-sm font-semibold ${
                                  isUnlocked ? 'text-amber-300' : 'text-stone-200'
                                }`}
                              >
                                {node.name}
                              </span>
                              <span
                                className={`text-[11px] font-mono font-bold ${
                                  isUnlocked ? 'text-emerald-400' : 'text-amber-500'
                                }`}
                              >
                                {isUnlocked ? 'Ativo' : `${node.cost} Pts`}
                              </span>
                            </div>

                            <p className="text-xs text-stone-400 mb-2">{node.description}</p>

                            {prereq && !unlockedSkills.includes(prereq.id) && (
                              <span className="text-[10px] text-red-400 block mb-2">
                                Requer: {prereq.name}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              audio.playLevelUp();
                              onUnlockSkill(node.id);
                            }}
                            disabled={!isReady}
                            className={`mt-2 py-1.5 px-3 rounded text-xs font-semibold transition-colors cursor-pointer ${
                              isUnlocked
                                ? 'bg-transparent text-emerald-400 cursor-default'
                                : isReady
                                  ? 'bg-amber-700 hover:bg-amber-600 text-amber-100 shadow'
                                  : 'bg-stone-900 text-stone-600 cursor-not-allowed'
                            }`}
                          >
                            {isUnlocked ? '✓ Habilidade Desbloqueada' : 'Aprender Habilidade'}
                          </button>
                        </div>
                      );
                    })}
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
