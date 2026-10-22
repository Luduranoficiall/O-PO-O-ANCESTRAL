import React from 'react';
import { GameState, DecreeId } from '../types/game';
import { VILLAGE_DECREES } from '../data/gameData';
import { audio } from '../utils/audio';

interface ExecutiveDashboardModalProps {
  gameState: GameState;
  onClose: () => void;
  onToggleDecree: (decreeId: DecreeId) => void;
}

export const ExecutiveDashboardModal: React.FC<ExecutiveDashboardModalProps> = ({
  gameState,
  onClose,
  onToggleDecree,
}) => {
  const { resources, workers, tools, activeDecrees, warehouseCapacity, stats } = gameState;

  // Calculate real throughput (per minute)
  const isNightShift = activeDecrees.includes('night_shift');
  const isHeavyRations = activeDecrees.includes('heavy_rations');

  const woodBonus = (tools.axeTier === 2 ? 1.45 : tools.axeTier === 3 ? 1.8 : 1.2) * (isNightShift ? 1.3 : 1.0) * (isHeavyRations ? 1.25 : 1.0);
  const stoneBonus = (tools.pickaxeTier === 2 ? 1.45 : tools.pickaxeTier === 3 ? 1.8 : 1.2) * (isNightShift ? 1.3 : 1.0) * (isHeavyRations ? 1.25 : 1.0);
  const ironBonus = (tools.pickaxeTier === 2 ? 1.45 : tools.pickaxeTier === 3 ? 1.8 : 1.2) * (isNightShift ? 1.3 : 1.0);
  const crystalBonus = (isNightShift ? 1.3 : 1.0);

  // Per minute rates (each 2.5s tick runs 24 times/minute)
  const woodPerMin = Math.round((workers.woodcutter || 0) * 1.5 * woodBonus * 24);
  const stonePerMin = Math.round((workers.stonemason || 0) * 1.2 * stoneBonus * 24);
  const ironPerMin = Math.round((workers.miner || 0) * 0.8 * ironBonus * 24);
  const crystalPerMin = Math.round((workers.lapidary || 0) * 0.4 * crystalBonus * 24);

  // Estimated minutes until warehouse full
  const lowestCapacityRemaining = Math.max(
    warehouseCapacity - Math.max(resources.wood_raw, resources.stone_raw, resources.iron_raw),
    0
  );
  const maxVelocity = Math.max(woodPerMin, stonePerMin, ironPerMin, 1);
  const minutesToFull = Math.round(lowestCapacityRemaining / maxVelocity);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="bg-[#181410] border border-amber-800/60 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/60 bg-[#221a14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-900/40 border border-amber-600/50 flex items-center justify-center text-xl shadow">
              🏛️
            </div>
            <div>
              <span className="font-cinzel text-lg font-bold text-amber-200 block">
                Gabinete Executivo & Métricas da Vila
              </span>
              <span className="text-xs text-stone-400">
                Painel analítico de engenharia, eficiência de vazão e decretos comunitários
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
          {/* 1. Production Throughput Metrics (KPI Strip) */}
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-amber-500/80 block mb-3">
              Taxa de Produção em Tempo Real (Vazão da Mão de Obra)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Wood KPI */}
              <div className="bg-[#201812] p-3.5 rounded-xl border border-amber-900/30">
                <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                  <span>🌲 Madeira</span>
                  <span className="text-[10px] text-emerald-400">+{woodBonus.toFixed(1)}x mult</span>
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-emerald-300">
                  +{woodPerMin} <span className="text-xs text-stone-400 font-normal">/min</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  {((woodPerMin / 60) || 0).toFixed(1)} un/segundo
                </div>
              </div>

              {/* Stone KPI */}
              <div className="bg-[#201812] p-3.5 rounded-xl border border-amber-900/30">
                <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                  <span>🪨 Pedra</span>
                  <span className="text-[10px] text-stone-400">+{stoneBonus.toFixed(1)}x mult</span>
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-stone-200">
                  +{stonePerMin} <span className="text-xs text-stone-400 font-normal">/min</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  {((stonePerMin / 60) || 0).toFixed(1)} un/segundo
                </div>
              </div>

              {/* Iron KPI */}
              <div className="bg-[#201812] p-3.5 rounded-xl border border-amber-900/30">
                <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                  <span>⛏️ Ferro</span>
                  <span className="text-[10px] text-amber-400">+{ironBonus.toFixed(1)}x mult</span>
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-amber-300">
                  +{ironPerMin} <span className="text-xs text-stone-400 font-normal">/min</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  {((ironPerMin / 60) || 0).toFixed(1)} un/segundo
                </div>
              </div>

              {/* Crystal KPI */}
              <div className="bg-[#201812] p-3.5 rounded-xl border border-amber-900/30">
                <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                  <span>✨ Cristal</span>
                  <span className="text-[10px] text-cyan-400">+{crystalBonus.toFixed(1)}x mult</span>
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-cyan-300">
                  +{crystalPerMin} <span className="text-xs text-stone-400 font-normal">/min</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-1">
                  {((crystalPerMin / 60) || 0).toFixed(1)} un/segundo
                </div>
              </div>
            </div>
          </div>

          {/* 2. Warehouse Saturation & Global Capacity */}
          <div className="bg-[#201812] p-4 rounded-xl border border-amber-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-cinzel text-sm font-semibold text-amber-200 block">
                Capacidade do Armazém Central ({warehouseCapacity} unidades)
              </span>
              <p className="text-xs text-stone-400">
                Tempo estimado para saturação de estoque no ritmo atual:{' '}
                <strong className="text-amber-300">
                  {minutesToFull > 0 ? `~${minutesToFull} minutos` : 'Estoque Próximo do Limite'}
                </strong>
                . Erga novos Armazéns para expandir.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-400 font-mono">
              <span>Total Coletado: <strong className="text-amber-400">{stats.resourcesGathered}</strong></span>
              <span>·</span>
              <span>Monstros Vencidos: <strong className="text-red-400">{stats.monstersDefeated}</strong></span>
            </div>
          </div>

          {/* 3. Community Decrees & Management Policies */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-cinzel text-sm font-semibold text-amber-200">
                Decretos Municipais & Políticas de Turno
              </span>
              <span className="text-xs text-amber-400">
                {activeDecrees.length} de {VILLAGE_DECREES.length} Ativos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {VILLAGE_DECREES.map((decree) => {
                const isActive = activeDecrees.includes(decree.id);

                return (
                  <div
                    key={decree.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-amber-950/30 border-amber-500/70 shadow-md'
                        : 'bg-[#201812] border-amber-900/30 hover:border-amber-700/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-amber-200 text-sm">{decree.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isActive
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                              : 'bg-stone-900 text-stone-500'
                          }`}
                        >
                          {isActive ? 'EM VIGOR' : 'INATIVO'}
                        </span>
                      </div>

                      <span className="text-[11px] text-amber-500/90 block mb-2">{decree.tagline}</span>
                      <p className="text-xs text-stone-400 mb-3">{decree.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-amber-950/40">
                      <span className="text-[11px] text-stone-500 font-mono">
                        Manutenção: {decree.costPerMinute.wood ? `${decree.costPerMinute.wood} mad/min` : ''}{' '}
                        {decree.costPerMinute.stone ? `${decree.costPerMinute.stone} ped/min` : ''}
                      </span>
                      <button
                        onClick={() => {
                          audio.playClick();
                          onToggleDecree(decree.id);
                        }}
                        className={`py-1.5 px-3.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-amber-900/60 hover:bg-amber-900 text-amber-200 border border-amber-700/50'
                            : 'bg-amber-700 hover:bg-amber-600 text-amber-100 shadow'
                        }`}
                      >
                        {isActive ? 'Suspender Decreto' : 'Promulgar Decreto'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
