import React from 'react';
import { GameState } from '../types/game';
import { STORY_CHAPTERS } from '../data/gameData';
import { audio } from '../utils/audio';

interface StoryModalProps {
  gameState: GameState;
  onClose: () => void;
}

export const StoryModal: React.FC<StoryModalProps> = ({ gameState, onClose }) => {
  const { unlockedStoryIds } = gameState;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#1a1613] border border-amber-900/50 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/40 bg-[#221c17] flex items-center justify-between">
          <div>
            <span className="font-cinzel text-xl font-bold text-amber-200 block">
              Diário do Poço & Memórias do Avô
            </span>
            <span className="text-xs text-stone-400">
              Uma história sobre perda, recomeço e a volta para casa.
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

        {/* Stories List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {STORY_CHAPTERS.map((chap) => {
            const isUnlocked = unlockedStoryIds.includes(chap.id);

            return (
              <div
                key={chap.id}
                className={`p-5 rounded-lg border transition-all ${
                  isUnlocked
                    ? 'bg-[#201a15] border-amber-900/40'
                    : 'bg-[#15120f] border-stone-900 opacity-40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-cinzel text-sm font-bold ${
                      isUnlocked ? 'text-amber-200' : 'text-stone-500'
                    }`}
                  >
                    Capítulo {chap.id}: {isUnlocked ? chap.title : 'Capítulo Bloqueado'}
                  </span>
                  <span className="text-[11px] text-amber-500/70 font-mono">
                    {isUnlocked ? chap.speaker : `Desbloqueia no Andar ${chap.triggerFloor}`}
                  </span>
                </div>

                <p
                  className={`text-xs leading-relaxed ${
                    isUnlocked ? 'text-stone-300 font-serif' : 'text-stone-600 italic'
                  }`}
                >
                  {isUnlocked
                    ? `"${chap.text}"`
                    : 'Alcance os andares mais profundos do poço ancestral para desvendar este fragmento de memória.'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
