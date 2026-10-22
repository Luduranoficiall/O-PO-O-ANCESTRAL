import React, { useState } from 'react';
import { GameState, WorkerType, Expedition } from '../types/game';
import { WORKERS_INFO } from '../data/gameData';
import { audio } from '../utils/audio';

interface WorkforceModalProps {
  gameState: GameState;
  onClose: () => void;
  onHireWorker: (type: WorkerType) => void;
  onAssignWorker: (type: WorkerType, count: number) => void;
  onStartExpedition: (workerType: WorkerType, count: number, durationMinutes: number) => void;
  onClaimExpedition: (expeditionId: string) => void;
  maxWorkerCapacity: number;
}

export const WorkforceModal: React.FC<WorkforceModalProps> = ({
  gameState,
  onClose,
  onHireWorker,
  onStartExpedition,
  onClaimExpedition,
  maxWorkerCapacity,
}) => {
  const [activeTab, setActiveTab] = useState<'hire' | 'expeditions'>('hire');
  const [selectedExpeditionWorker, setSelectedExpeditionWorker] = useState<WorkerType>('woodcutter');
  const [expeditionDuration, setExpeditionDuration] = useState<number>(10); // in minutes
  const [expeditionCount, setExpeditionCount] = useState<number>(1);

  const { workers, resources, activeExpeditions } = gameState;
  const totalHired = Object.values(workers).reduce((a, b) => a + b, 0);

  // Available unassigned workers for expeditions
  const availableWorkers = Math.max((workers[selectedExpeditionWorker] || 0), 1);

  // Estimate yield for expedition
  const getEstimatedYield = (type: WorkerType, count: number, durationMins: number) => {
    const ratePerMin = type === 'woodcutter' ? 8 : type === 'stonemason' ? 6 : type === 'miner' ? 4 : 2;
    return Math.round(ratePerMin * durationMins * count * 1.25);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#1a1613] border border-amber-900/50 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/40 bg-[#221c17] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-cinzel text-xl font-bold text-amber-200">Trabalhadores & Expedições</span>
              <span className="text-xs text-amber-500/80 font-mono">
                {totalHired}/{maxWorkerCapacity} Alojados
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Automatize a produção da vila e despache expedições com ganhos offline de 10 min a 12 horas.
            </p>
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
              setActiveTab('hire');
            }}
            className={`py-3 px-4 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'hire'
                ? 'border-amber-500 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Contratar Trabalhadores ({totalHired})
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('expeditions');
            }}
            className={`py-3 px-4 text-xs font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'expeditions'
                ? 'border-amber-500 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Expedições Cronometradas ({activeExpeditions.filter((e) => !e.claimed).length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'hire' && (
            <div className="space-y-4">
              <div className="text-xs text-stone-300 bg-amber-950/20 p-3 rounded-lg border border-amber-900/30 flex items-center justify-between">
                <span>Construa mais Alojamentos na vila para aumentar o limite máximo de trabalhadores.</span>
                <span className="text-amber-400 font-semibold">{maxWorkerCapacity - totalHired} Vagas Livres</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['woodcutter', 'stonemason', 'miner', 'lapidary'] as WorkerType[]).map((type) => {
                  const info = WORKERS_INFO[type];
                  const count = workers[type] || 0;
                  const canAfford =
                    (!info.baseCost.wood_raw || resources.wood_raw >= info.baseCost.wood_raw) &&
                    (!info.baseCost.stone_raw || resources.stone_raw >= info.baseCost.stone_raw) &&
                    (!info.baseCost.iron_raw || resources.iron_raw >= info.baseCost.iron_raw);
                  const hasCapacity = totalHired < maxWorkerCapacity;

                  return (
                    <div
                      key={type}
                      className="bg-[#201a15] p-4 rounded-lg border border-amber-900/30 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-amber-200 text-sm">{info.name}</span>
                          <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                            {count} Contratados
                          </span>
                        </div>
                        <span className="text-[11px] text-amber-500/80 block mb-2">{info.role}</span>
                        <p className="text-xs text-stone-400 mb-3">{info.description}</p>

                        <div className="text-[11px] text-stone-400">
                          <span className="text-amber-500/80 block mb-1">Custo de Contratação:</span>
                          <div className="flex gap-2">
                            {info.baseCost.wood_raw && (
                              <span className={resources.wood_raw >= info.baseCost.wood_raw ? 'text-stone-300' : 'text-red-400'}>
                                {info.baseCost.wood_raw} Madeira
                              </span>
                            )}
                            {info.baseCost.stone_raw && (
                              <span className={resources.stone_raw >= info.baseCost.stone_raw ? 'text-stone-300' : 'text-red-400'}>
                                {info.baseCost.stone_raw} Pedra
                              </span>
                            )}
                            {info.baseCost.iron_raw && (
                              <span className={resources.iron_raw >= info.baseCost.iron_raw ? 'text-stone-300' : 'text-red-400'}>
                                {info.baseCost.iron_raw} Ferro
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          audio.playClick();
                          onHireWorker(type);
                        }}
                        disabled={!canAfford || !hasCapacity}
                        className="mt-4 py-2 px-4 bg-amber-800 hover:bg-amber-700 disabled:opacity-30 disabled:cursor-not-allowed text-amber-100 rounded text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {!hasCapacity ? 'Sem Vagas na Vila' : 'Contratar +1'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'expeditions' && (
            <div className="space-y-6">
              {/* Dispatch New Expedition */}
              <div className="bg-[#201a15] p-5 rounded-lg border border-amber-900/40 space-y-4">
                <span className="font-cinzel text-base font-semibold text-amber-200 block">
                  Despachar Nova Expedição
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Worker Selection */}
                  <div>
                    <label className="block text-xs text-stone-400 mb-1.5">Especialista:</label>
                    <select
                      value={selectedExpeditionWorker}
                      onChange={(e) => setSelectedExpeditionWorker(e.target.value as WorkerType)}
                      className="w-full bg-[#161310] border border-amber-900/40 text-amber-200 text-xs rounded p-2 focus:outline-none"
                    >
                      <option value="woodcutter">Lenhadores (Madeira)</option>
                      <option value="stonemason">Pedreiros (Pedra)</option>
                      <option value="miner">Mineiros (Ferro)</option>
                      <option value="lapidary">Lapidários (Cristal)</option>
                    </select>
                  </div>

                  {/* Duration Selection (10m to 12h) */}
                  <div>
                    <label className="block text-xs text-stone-400 mb-1.5">Duração da Expedição:</label>
                    <select
                      value={expeditionDuration}
                      onChange={(e) => setExpeditionDuration(Number(e.target.value))}
                      className="w-full bg-[#161310] border border-amber-900/40 text-amber-200 text-xs rounded p-2 focus:outline-none"
                    >
                      <option value={10}>10 Minutos (Exploração Rápida)</option>
                      <option value={30}>30 Minutos (Trilha das Colinas)</option>
                      <option value={60}>1 Hora (Escavação Padrão)</option>
                      <option value={240}>4 Horas (Jornada Noturna)</option>
                      <option value={480}>8 Horas (Trabalho Completo)</option>
                      <option value={720}>12 Horas (Grande Expedição)</option>
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs text-stone-400 mb-1.5">
                      Quantidade ({availableWorkers} disponíveis):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(workers[selectedExpeditionWorker] || 1, 1)}
                      value={expeditionCount}
                      onChange={(e) => setExpeditionCount(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-[#161310] border border-amber-900/40 text-amber-200 text-xs rounded p-2 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-950/40">
                  <span className="text-xs text-stone-300">
                    Rendimento Estimado:{' '}
                    <strong className="text-emerald-400">
                      +{getEstimatedYield(selectedExpeditionWorker, expeditionCount, expeditionDuration)} Recursos
                    </strong>
                  </span>
                  <button
                    onClick={() => {
                      audio.playClick();
                      onStartExpedition(selectedExpeditionWorker, expeditionCount, expeditionDuration);
                    }}
                    className="py-2 px-5 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Enviar Expedição
                  </button>
                </div>
              </div>

              {/* Active Expeditions List */}
              <div className="space-y-3">
                <span className="font-cinzel text-sm font-semibold text-amber-200 block">
                  Expedições em Andamento ({activeExpeditions.length})
                </span>

                {activeExpeditions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500 bg-[#161310] rounded-lg border border-amber-950/30">
                    Nenhuma expedição em andamento. Envie trabalhadores para explorar trilhas e veios enquanto você cuida da vila.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeExpeditions.map((exp) => {
                      const elapsedMs = Date.now() - exp.startedAt;
                      const targetMs = exp.durationMinutes * 60 * 1000;
                      const isComplete = elapsedMs >= targetMs;
                      const progressPct = Math.min((elapsedMs / targetMs) * 100, 100);
                      const remainingSecs = Math.max(Math.ceil((targetMs - elapsedMs) / 1000), 0);
                      const remMin = Math.floor(remainingSecs / 60);
                      const remSec = remainingSecs % 60;

                      return (
                        <div
                          key={exp.id}
                          className="bg-[#201a15] p-3.5 rounded-lg border border-amber-900/30 flex items-center justify-between"
                        >
                          <div className="space-y-1 flex-1 pr-4">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-amber-200">
                                {exp.count}x {WORKERS_INFO[exp.workerType].name} ({exp.durationMinutes}m)
                              </span>
                              <span className="text-stone-400 font-mono text-[11px]">
                                {isComplete ? (
                                  <span className="text-emerald-400 font-bold">Concluída!</span>
                                ) : (
                                  `${remMin}m ${remSec}s restantes`
                                )}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              audio.playCollect();
                              onClaimExpedition(exp.id);
                            }}
                            disabled={!isComplete}
                            className={`py-1.5 px-4 rounded text-xs font-semibold transition-colors cursor-pointer ${
                              isComplete
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                            }`}
                          >
                            {isComplete ? `Resgatar (+${exp.collectedCount})` : 'Em Trilha'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
