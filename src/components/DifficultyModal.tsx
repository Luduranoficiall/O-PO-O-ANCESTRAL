import React from 'react';
import { DifficultyLevel } from '../types/game';
import { DIFFICULTY_CONFIGS } from '../data/gameData';
import { audio } from '../utils/audio';

interface DifficultyModalProps {
  currentDifficulty: DifficultyLevel;
  onSelectDifficulty: (difficulty: DifficultyLevel) => void;
  onClose: () => void;
}

export const DifficultyModal: React.FC<DifficultyModalProps> = ({
  currentDifficulty,
  onSelectDifficulty,
  onClose,
}) => {
  const levels: DifficultyLevel[] = ['easy', 'medium', 'hard', 'hard_core', 'hard_master'];

  const handleChoose = (level: DifficultyLevel) => {
    if (level === 'hard_master') {
      audio.playLevelUp();
    } else {
      audio.playClick();
    }
    onSelectDifficulty(level);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#181410] border border-amber-800/60 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/60 bg-[#221a14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-600/50 flex items-center justify-center text-xl shadow">
              ⚔️
            </div>
            <div>
              <span className="font-cinzel text-lg font-bold text-amber-200 block">
                Nível de Dificuldade do Poço Ancestral
              </span>
              <span className="text-xs text-stone-400">
                Ajuste a intensidade do combate, bônus de EXP, vazão de recursos e perigos das profundezas
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

        {/* Current Active Banner */}
        <div className="px-6 py-3 bg-[#13100e] border-b border-amber-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-400">Dificuldade Ativa:</span>
            <span
              className="font-bold px-2 py-0.5 rounded border text-[11px]"
              style={{
                color: DIFFICULTY_CONFIGS[currentDifficulty].color,
                borderColor: `${DIFFICULTY_CONFIGS[currentDifficulty].color}66`,
                backgroundColor: `${DIFFICULTY_CONFIGS[currentDifficulty].color}18`,
              }}
            >
              {DIFFICULTY_CONFIGS[currentDifficulty].badge}
            </span>
          </div>
          <span className="text-stone-500 italic">
            Pode ser alterada a qualquer momento sem perder seu progresso ou construções.
          </span>
        </div>

        {/* Difficulty Cards Grid */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3.5">
          {levels.map((level) => {
            const cfg = DIFFICULTY_CONFIGS[level];
            const isSelected = currentDifficulty === level;

            return (
              <div
                key={level}
                onClick={() => handleChoose(level)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#221b16] border-amber-500/80 shadow-lg ring-1 ring-amber-500/40'
                    : 'bg-[#1a1511] border-amber-950/50 hover:border-amber-700/60 hover:bg-[#1f1914]'
                }`}
              >
                {/* Visual Active Strip */}
                {isSelected && (
                  <div
                    className="absolute top-0 left-0 bottom-0 w-1.5"
                    style={{ backgroundColor: cfg.color }}
                  />
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-cinzel text-base font-bold text-amber-100 flex items-center gap-1.5">
                        <span style={{ color: cfg.color }}>●</span> {cfg.name}
                      </span>
                      <span
                        className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded border"
                        style={{
                          color: cfg.color,
                          borderColor: `${cfg.color}55`,
                          backgroundColor: `${cfg.color}15`,
                        }}
                      >
                        {cfg.tagline}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                          ✓ Selecionado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed max-w-2xl">
                      {cfg.description}
                    </p>
                    {cfg.hazardEffect && (
                      <div className="text-[11px] font-mono text-red-400/90 flex items-center gap-1 pt-0.5">
                        <span>⚠️ Modificador Especial:</span>
                        <span className="italic">{cfg.hazardEffect}</span>
                      </div>
                    )}
                  </div>

                  {/* Multipliers Badges */}
                  <div className="flex flex-wrap sm:flex-col items-end gap-1.5 min-w-[150px] shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-stone-400">Vida Inimiga:</span>
                      <strong className={cfg.monsterHpMult > 1 ? 'text-red-400' : cfg.monsterHpMult < 1 ? 'text-emerald-400' : 'text-stone-300'}>
                        {Math.round(cfg.monsterHpMult * 100)}%
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-stone-400">Dano Inimigo:</span>
                      <strong className={cfg.monsterDmgMult > 1 ? 'text-red-400' : cfg.monsterDmgMult < 1 ? 'text-emerald-400' : 'text-stone-300'}>
                        {Math.round(cfg.monsterDmgMult * 100)}%
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-stone-400">Bônus EXP:</span>
                      <strong className={cfg.expBonusMult > 1 ? 'text-amber-400' : 'text-stone-400'}>
                        +{Math.round((cfg.expBonusMult - 1) * 100)}%
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-stone-400">Relíquias:</span>
                      <strong className={cfg.relicChanceBonus > 0 ? 'text-cyan-400' : 'text-stone-400'}>
                        {cfg.relicChanceBonus > 0 ? `+${Math.round(cfg.relicChanceBonus * 100)}%` : 'Padrão'}
                      </strong>
                    </div>

                    {cfg.resourceYieldMult !== 1.0 && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        <span className="text-stone-400">Vila Coleta:</span>
                        <strong className={cfg.resourceYieldMult > 1 ? 'text-emerald-400' : 'text-amber-300'}>
                          {Math.round(cfg.resourceYieldMult * 100)}%
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info & CTA */}
        <div className="p-4 border-t border-amber-950/60 bg-[#16120e] flex items-center justify-between text-xs">
          <span className="text-stone-400">
            Dica do Engenheiro: Para descer rápido até o andar 100 com segurança, treine no <strong className="text-amber-300">Médio</strong> ou colete na calmaria do <strong className="text-emerald-400">Fácil</strong>, e ative <strong className="text-purple-400">Hard Master</strong> para caçar relíquias raras com EXP acelerado!
          </span>
          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="px-5 py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ml-4"
          >
            Confirmar & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
