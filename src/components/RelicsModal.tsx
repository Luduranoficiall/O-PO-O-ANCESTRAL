import React, { useState } from 'react';
import { GameState } from '../types/game';
import { RELICS_DATA, DUNGEONS_DATA } from '../data/gameData';
import { audio } from '../utils/audio';

interface RelicsModalProps {
  gameState: GameState;
  onClose: () => void;
}

export const RelicsModal: React.FC<RelicsModalProps> = ({ gameState, onClose }) => {
  const [selectedDungeonId, setSelectedDungeonId] = useState<number>(1);
  const { discoveredRelicIds, dungeonProgress } = gameState;

  const currentDungeonRelics = RELICS_DATA.filter((r) => r.dungeonId === selectedDungeonId);
  const totalDiscovered = discoveredRelicIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#1a1613] border border-amber-900/50 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/40 bg-[#221c17] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-cinzel text-xl font-bold text-amber-200">Relíquias & Selo do Fundador</span>
            <span className="text-xs text-amber-400 font-mono bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800/40">
              {totalDiscovered}/{RELICS_DATA.length} Relíquias Encontradas
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

        {/* Founder's Seal Centerpiece Showcase */}
        <div className="bg-[#14110e] p-4 border-b border-amber-950/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-amber-500/80 bg-amber-950/40 flex items-center justify-center relative shadow-lg">
              <span className="text-xl">🗝️</span>
              {dungeonProgress.sealShardsCollected >= 6 && (
                <div className="absolute inset-0 rounded-full border border-amber-400 animate-ping opacity-30" />
              )}
            </div>
            <div>
              <span className="font-cinzel text-sm font-bold text-amber-200 block">
                Selo Ancestral do Fundador
              </span>
              <span className="text-xs text-stone-400">
                {dungeonProgress.sealShardsCollected === 6
                  ? 'As seis partes foram unidas! O portão da Cripta dos Fundadores está aberto.'
                  : `${dungeonProgress.sealShardsCollected} de 6 fragmentos recuperados dos chefes de masmorra.`}
              </span>
            </div>
          </div>

          {/* Shards Indicators */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 6 }).map((_, idx) => {
              const hasShard = dungeonProgress.sealShardsCollected > idx;
              return (
                <div
                  key={idx}
                  className={`w-6 h-6 rounded flex items-center justify-center border text-[11px] font-bold ${
                    hasShard
                      ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md'
                      : 'bg-stone-900 text-stone-600 border-stone-800'
                  }`}
                  title={`Fragmento #${idx + 1}`}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grandfather's Medallion Highlight if found */}
        {dungeonProgress.grandfatherMedallionRecovered && (
          <div className="bg-gradient-to-r from-sky-950/80 via-blue-900/60 to-sky-950/80 p-4 border-b border-sky-600/40 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sky-500/20 border-2 border-sky-400 flex items-center justify-center text-2xl shadow-lg animate-pulse">
              💎
            </div>
            <div>
              <span className="font-cinzel text-sm font-bold text-sky-200 block">
                O Medalhão de Pedra Azul de Clara (Recuperado)
              </span>
              <p className="text-xs text-sky-300/90">
                A lembrança mais querida do seu avô voltou para casa. A vila agora brilha com paz duradoura.
              </p>
            </div>
          </div>
        )}

        {/* Dungeon Filter Tabs */}
        <div className="flex border-b border-amber-950/40 bg-[#161310] px-4 overflow-x-auto gap-2">
          {DUNGEONS_DATA.map((dungeon) => (
            <button
              key={dungeon.id}
              onClick={() => {
                audio.playClick();
                setSelectedDungeonId(dungeon.id);
              }}
              className={`py-2.5 px-3.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                selectedDungeonId === dungeon.id
                  ? 'border-amber-500 text-amber-200 bg-amber-950/20'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Masmorra {dungeon.id}: {dungeon.name.replace('As ', '').replace('A ', '').replace('O ', '')}
            </button>
          ))}
        </div>

        {/* Relics Grid */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentDungeonRelics.map((relic) => {
              const isFound = discoveredRelicIds.includes(relic.id);

              return (
                <div
                  key={relic.id}
                  className={`p-4 rounded-lg border transition-all flex flex-col justify-between ${
                    isFound
                      ? 'bg-[#201a15] border-amber-800/40 hover:border-amber-600/60 shadow-sm'
                      : 'bg-[#15120f] border-stone-900 opacity-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm font-semibold ${
                          isFound ? 'text-amber-200 font-cinzel' : 'text-stone-500 font-mono'
                        }`}
                      >
                        {isFound ? relic.name : '??? (Não descoberta)'}
                      </span>
                      {isFound && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/30">
                          {relic.category}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-400 italic mb-3">
                      {isFound ? `"${relic.lore}"` : 'Derrote monstros e explore este andar do poço para encontrá-la.'}
                    </p>
                  </div>

                  {isFound && (
                    <div className="pt-2 border-t border-amber-950/40 text-[11px] font-medium text-emerald-400">
                      Bônus: {relic.effectDescription}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
