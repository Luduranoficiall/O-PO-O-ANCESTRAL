import React, { useState, useEffect, useRef } from 'react';
import {
  GameState,
  BuildingType,
  WorkerType,
  EquipmentSlot,
  PlacedBuilding,
  PotionType,
  DecreeId,
} from './types/game';
import { INITIAL_GAME_STATE, BUILDINGS_INFO, WORKERS_INFO, PIONEER_SPECIALISTS, POTIONS_INFO } from './data/gameData';
import { VillageCanvas } from './components/VillageCanvas';
import { DungeonViewer } from './components/DungeonViewer';
import { ForgeModal } from './components/ForgeModal';
import { WorkforceModal } from './components/WorkforceModal';
import { SkillTreeModal } from './components/SkillTreeModal';
import { RelicsModal } from './components/RelicsModal';
import { StoryModal } from './components/StoryModal';
import { BuildMenuModal } from './components/BuildMenuModal';
import { OfflineModal } from './components/OfflineModal';
import { GeminiChatModal } from './components/GeminiChatModal';
import { GeminiImageModal } from './components/GeminiImageModal';
import { ExecutiveDashboardModal } from './components/ExecutiveDashboardModal';
import { TavernModal } from './components/TavernModal';
import { AlchemyLabModal } from './components/AlchemyLabModal';
import { audio } from './utils/audio';

const STORAGE_KEY = 'ancestral_well_save_v1';

export default function App() {
  const [appState, setAppState] = useState<'TITLE' | 'PLAYING' | 'PAUSED' | 'VICTORY'>('TITLE');
  const [activeTab, setActiveTab] = useState<'village' | 'dungeon'>('village');

  // Modals state
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showForge, setShowForge] = useState(false);
  const [showWorkforce, setShowWorkforce] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showRelics, setShowRelics] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showImageStudio, setShowImageStudio] = useState(false);
  const [showExecutiveDashboard, setShowExecutiveDashboard] = useState(false);
  const [showTavern, setShowTavern] = useState(false);
  const [showAlchemyLab, setShowAlchemyLab] = useState(false);

  // Building placement on canvas
  const [buildingToPlace, setBuildingToPlace] = useState<BuildingType | null>(null);

  // Offline modal state
  const [offlineData, setOfflineData] = useState<{
    minutes: number;
    gathered: { wood: number; stone: number; iron: number; crystal: number };
    expeditionsCount: number;
  } | null>(null);

  // Core Game State
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_GAME_STATE, ...parsed };
      }
    } catch {
      // Fallback
    }
    return INITIAL_GAME_STATE;
  });

  const [isMuted, setIsMuted] = useState(false);

  // Save to localStorage whenever critical state changes
  useEffect(() => {
    const stateToSave = {
      ...gameState,
      lastSavedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {
      // storage unavailable
    }
  }, [gameState]);

  // Check offline progress on mount
  useEffect(() => {
    const lastSaved = gameState.lastSavedAt;
    if (lastSaved) {
      const now = Date.now();
      const diffMs = now - lastSaved;
      const diffMins = diffMs / (1000 * 60);

      // If away for more than 1 minute (capped at 12 hours = 720 minutes)
      if (diffMins >= 1) {
        const cappedMins = Math.min(diffMins, 720);
        const { workers } = gameState;

        const woodGained = Math.round((workers.woodcutter || 0) * cappedMins * 1.5);
        const stoneGained = Math.round((workers.stonemason || 0) * cappedMins * 1.2);
        const ironGained = Math.round((workers.miner || 0) * cappedMins * 0.8);
        const crystalGained = Math.round((workers.lapidary || 0) * cappedMins * 0.4);

        // Count finished expeditions
        const finishedExpeditions = gameState.activeExpeditions.filter(
          (e) => !e.claimed && now - e.startedAt >= e.durationMinutes * 60 * 1000
        ).length;

        if (woodGained + stoneGained + ironGained + crystalGained > 0 || finishedExpeditions > 0) {
          setOfflineData({
            minutes: Math.round(cappedMins),
            gathered: {
              wood: woodGained,
              stone: stoneGained,
              iron: ironGained,
              crystal: crystalGained,
            },
            expeditionsCount: finishedExpeditions,
          });

          // Apply gains
          setGameState((prev) => ({
            ...prev,
            resources: {
              ...prev.resources,
              wood_raw: Math.min(prev.resources.wood_raw + woodGained, prev.warehouseCapacity),
              stone_raw: Math.min(prev.resources.stone_raw + stoneGained, prev.warehouseCapacity),
              iron_raw: Math.min(prev.resources.iron_raw + ironGained, prev.warehouseCapacity),
              crystal_raw: Math.min(prev.resources.crystal_raw + crystalGained, prev.warehouseCapacity),
            },
          }));
        }
      }
    }
  }, []);

  // Keyboard shortcuts (Enter/Space to start, Esc to pause, M to dungeon, V to village)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appState === 'TITLE') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setAppState('PLAYING');
          audio.startMusic();
        }
      } else if (appState === 'PLAYING') {
        if (e.key === 'Escape') {
          setAppState('PAUSED');
        } else if (e.key.toLowerCase() === 'v') {
          setActiveTab('village');
        } else if (e.key.toLowerCase() === 'm') {
          setActiveTab('dungeon');
        }
      } else if (appState === 'PAUSED') {
        if (e.key === 'Escape' || e.key === ' ') {
          setAppState('PLAYING');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState]);

  // Village passive workers simulation tick (every 2.5 seconds)
  useEffect(() => {
    if (appState !== 'PLAYING') return;

    const interval = setInterval(() => {
      setGameState((prev) => {
        const { workers, tools, unlockedSkills, warehouseCapacity, activeDecrees = [], hiredSpecialistIds = [] } = prev;

        const isNightShift = activeDecrees.includes('night_shift');
        const isHeavyRations = activeDecrees.includes('heavy_rations');
        const decreeMultiplier = (isNightShift ? 1.3 : 1.0) * (isHeavyRations ? 1.25 : 1.0);

        const specWood = hiredSpecialistIds.includes('specialist_olaf') ? 1.25 : 1.0;
        const specStone = hiredSpecialistIds.includes('specialist_brenna') ? 1.25 : 1.0;
        const specIron = hiredSpecialistIds.includes('specialist_kaz') ? 1.25 : 1.0;
        const specCrystal = hiredSpecialistIds.includes('specialist_sari') ? 1.25 : 1.0;

        const woodBonus = (tools.axeTier === 2 ? 1.45 : tools.axeTier === 3 ? 1.8 : 1.2) * decreeMultiplier * specWood;
        const stoneBonus = (tools.pickaxeTier === 2 ? 1.45 : tools.pickaxeTier === 3 ? 1.8 : 1.2) * decreeMultiplier * specStone;
        const ironBonus = (tools.pickaxeTier === 2 ? 1.45 : tools.pickaxeTier === 3 ? 1.8 : 1.2) * (isNightShift ? 1.3 : 1.0) * specIron;
        const crystalBonus = (isNightShift ? 1.3 : 1.0) * specCrystal;
        const skillBonus = unlockedSkills.includes('worker_morale') ? 1.3 : 1.0;

        const woodRate = (workers.woodcutter || 0) * 1.5 * woodBonus * skillBonus;
        const stoneRate = (workers.stonemason || 0) * 1.2 * stoneBonus * skillBonus;
        const ironRate = (workers.miner || 0) * 0.8 * ironBonus * skillBonus;
        const crystalRate = (workers.lapidary || 0) * 0.4 * crystalBonus * skillBonus;

        return {
          ...prev,
          resources: {
            ...prev.resources,
            wood_raw: Math.min(Math.round(prev.resources.wood_raw + woodRate), warehouseCapacity),
            stone_raw: Math.min(Math.round(prev.resources.stone_raw + stoneRate), warehouseCapacity),
            iron_raw: Math.min(Math.round(prev.resources.iron_raw + ironRate), warehouseCapacity),
            crystal_raw: Math.min(Math.round(prev.resources.crystal_raw + crystalRate), warehouseCapacity),
          },
          stats: {
            ...prev.stats,
            resourcesGathered: prev.stats.resourcesGathered + Math.round(woodRate + stoneRate + ironRate + crystalRate),
            timePlayedSeconds: prev.stats.timePlayedSeconds + 2.5,
          },
        };
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [appState]);

  // Manual Node Harvest handler from isometric canvas
  const handleHarvestNode = (type: 'wood' | 'stone' | 'iron' | 'crystal') => {
    setGameState((prev) => {
      const key = `${type}_raw` as keyof typeof prev.resources;
      const amount = type === 'wood' ? 3 : type === 'stone' ? 2 : 1;
      return {
        ...prev,
        resources: {
          ...prev.resources,
          [key]: Math.min(prev.resources[key] + amount, prev.warehouseCapacity),
        },
        stats: {
          ...prev.stats,
          resourcesGathered: prev.stats.resourcesGathered + amount,
        },
      };
    });
  };

  // Place building on isometric grid
  const handlePlaceBuilding = (gridX: number, gridY: number) => {
    if (!buildingToPlace) return;

    // Check if cell is occupied or is central well
    const isOccupied =
      gameState.placedBuildings.some((b) => b.gridX === gridX && b.gridY === gridY) ||
      (gridX === 4 && gridY === 4);

    if (isOccupied) return;

    const info = BUILDINGS_INFO[buildingToPlace];
    if (!info) return;

    // Deduct cost
    const cost = info.baseCost;
    setGameState((prev) => {
      const updatedRes = { ...prev.resources };
      if (cost.wood_raw) updatedRes.wood_raw -= cost.wood_raw;
      if (cost.wood_refined) updatedRes.wood_refined -= cost.wood_refined;
      if (cost.stone_raw) updatedRes.stone_raw -= cost.stone_raw;
      if (cost.stone_refined) updatedRes.stone_refined -= cost.stone_refined;
      if (cost.iron_raw) updatedRes.iron_raw -= cost.iron_raw;
      if (cost.iron_refined) updatedRes.iron_refined -= cost.iron_refined;
      if (cost.crystal_raw) updatedRes.crystal_raw -= cost.crystal_raw;
      if (cost.crystal_refined) updatedRes.crystal_refined -= cost.crystal_refined;

      const newBuilding: PlacedBuilding = {
        id: `building_${Date.now()}`,
        type: buildingToPlace,
        gridX,
        gridY,
        level: 1,
      };

      // Warehouse capacity expansion
      const capAdd = buildingToPlace === 'warehouse' ? 500 : 0;

      return {
        ...prev,
        resources: updatedRes,
        placedBuildings: [...prev.placedBuildings, newBuilding],
        warehouseCapacity: prev.warehouseCapacity + capAdd,
      };
    });

    audio.playForge();
    setBuildingToPlace(null);
  };

  // Refining resources
  const handleRefineResource = (category: 'wood' | 'stone' | 'iron' | 'crystal', count: number) => {
    setGameState((prev) => {
      const res = { ...prev.resources };
      if (category === 'wood' && res.wood_raw >= count * 10) {
        res.wood_raw -= count * 10;
        res.wood_refined += count;
      } else if (category === 'stone' && res.stone_raw >= count * 10) {
        res.stone_raw -= count * 10;
        res.stone_refined += count;
      } else if (category === 'iron' && res.iron_raw >= count * 8) {
        res.iron_raw -= count * 8;
        res.iron_refined += count;
      } else if (category === 'crystal' && res.crystal_raw >= count * 5) {
        res.crystal_raw -= count * 5;
        res.crystal_refined += count;
      }

      return {
        ...prev,
        resources: res,
        stats: { ...prev.stats, itemsCrafted: prev.stats.itemsCrafted + count },
      };
    });
    audio.playForge();
  };

  // Upgrade Adventurer Equipment (+1 to +10)
  const handleUpgradeEquipment = (slot: EquipmentSlot) => {
    setGameState((prev) => {
      const item = prev.hero.equipment[slot];
      if (item.level >= 10) return prev;

      const lvl = item.level;
      const discount = prev.unlockedSkills.includes('master_crafting') ? 0.75 : 1.0;
      const costPlanks = Math.round((20 + lvl * 18) * discount);
      const costBlocks = Math.round((20 + lvl * 18) * discount);
      const costIngots = Math.round((12 + lvl * 14) * discount);
      const costCatalysts = lvl >= 5 ? Math.round((2 + (lvl - 5) * 3) * discount) : 0;

      if (
        prev.resources.wood_refined < costPlanks ||
        prev.resources.stone_refined < costBlocks ||
        prev.resources.iron_refined < costIngots ||
        prev.resources.crystal_refined < costCatalysts
      ) {
        return prev;
      }

      const newEquipment = {
        ...prev.hero.equipment,
        [slot]: {
          ...item,
          level: item.level + 1,
        },
      };

      // Recalculate hero stats
      let newAtk = 16 + (newEquipment.weapon.level * newEquipment.weapon.statPerLevel);
      let newMaxHp = 120 + (newEquipment.armor.level * newEquipment.armor.statPerLevel);
      let newDef = 8 + (newEquipment.shield.level * newEquipment.shield.statPerLevel);
      let newCrit = 6 + (newEquipment.charm.level * newEquipment.charm.statPerLevel);

      // Skill bonuses
      if (prev.unlockedSkills.includes('combat_atk1')) newAtk += 10;
      if (prev.unlockedSkills.includes('combat_hp1')) newMaxHp += 60;
      if (prev.unlockedSkills.includes('combat_def1')) newDef += 8;
      if (prev.unlockedSkills.includes('combat_crit')) newCrit += 10;
      if (prev.unlockedSkills.includes('combat_master')) {
        newAtk += 25;
        newMaxHp += 120;
        newDef += 15;
      }

      return {
        ...prev,
        resources: {
          ...prev.resources,
          wood_refined: prev.resources.wood_refined - costPlanks,
          stone_refined: prev.resources.stone_refined - costBlocks,
          iron_refined: prev.resources.iron_refined - costIngots,
          crystal_refined: prev.resources.crystal_refined - costCatalysts,
        },
        hero: {
          ...prev.hero,
          attack: newAtk,
          defense: newDef,
          maxHp: newMaxHp,
          hp: Math.min(prev.hero.hp + 35, newMaxHp),
          critChance: newCrit,
          equipment: newEquipment,
        },
        stats: {
          ...prev.stats,
          itemsCrafted: prev.stats.itemsCrafted + 1,
        },
      };
    });
  };

  // Upgrade Village Tools (tiers 1-3)
  const handleUpgradeTool = (toolType: 'axe' | 'pickaxe' | 'chisel' | 'bellows') => {
    setGameState((prev) => {
      const currentTier = prev.tools[`${toolType}Tier` as keyof typeof prev.tools];
      if (currentTier >= 3) return prev;

      return {
        ...prev,
        tools: {
          ...prev.tools,
          [`${toolType}Tier`]: (currentTier + 1) as 1 | 2 | 3,
        },
      };
    });
    audio.playLevelUp();
  };

  // Hire workers
  const handleHireWorker = (type: WorkerType) => {
    const info = WORKERS_INFO[type];
    setGameState((prev) => {
      const res = { ...prev.resources };
      if (info.baseCost.wood_raw) res.wood_raw -= info.baseCost.wood_raw;
      if (info.baseCost.stone_raw) res.stone_raw -= info.baseCost.stone_raw;
      if (info.baseCost.iron_raw) res.iron_raw -= info.baseCost.iron_raw;

      return {
        ...prev,
        resources: res,
        workers: {
          ...prev.workers,
          [type]: (prev.workers[type] || 0) + 1,
        },
      };
    });
  };

  // Start Expedition
  const handleStartExpedition = (workerType: WorkerType, count: number, durationMinutes: number) => {
    const ratePerMin = workerType === 'woodcutter' ? 8 : workerType === 'stonemason' ? 6 : workerType === 'miner' ? 4 : 2;
    const est = Math.round(ratePerMin * durationMinutes * count * 1.25);

    const newExp = {
      id: `exp_${Date.now()}`,
      workerType,
      count,
      durationMinutes,
      startedAt: Date.now(),
      collectedCount: est,
      claimed: false,
    };

    setGameState((prev) => ({
      ...prev,
      activeExpeditions: [...prev.activeExpeditions, newExp],
    }));
  };

  // Claim Expedition
  const handleClaimExpedition = (id: string) => {
    setGameState((prev) => {
      const exp = prev.activeExpeditions.find((e) => e.id === id);
      if (!exp) return prev;

      const category = WORKERS_INFO[exp.workerType].targetCategory;
      const key = `${category}_raw` as keyof typeof prev.resources;

      return {
        ...prev,
        resources: {
          ...prev.resources,
          [key]: Math.min(prev.resources[key] + exp.collectedCount, prev.warehouseCapacity),
        },
        activeExpeditions: prev.activeExpeditions.filter((e) => e.id !== id),
        stats: {
          ...prev.stats,
          expeditionsCompleted: prev.stats.expeditionsCompleted + 1,
        },
      };
    });
  };

  // Unlock Skill
  const handleUnlockSkill = (skillId: string) => {
    setGameState((prev) => {
      if (prev.unlockedSkills.includes(skillId) || prev.skillPoints <= 0) return prev;
      return {
        ...prev,
        skillPoints: prev.skillPoints - 1,
        unlockedSkills: [...prev.unlockedSkills, skillId],
      };
    });
  };

  // Dungeon events
  const handleUpdateHeroHp = (newHp: number) => {
    setGameState((prev) => ({
      ...prev,
      hero: { ...prev.hero, hp: newHp },
    }));
  };

  const handleMonsterDefeated = (exp: number) => {
    setGameState((prev) => {
      const newExp = prev.hero.exp + exp;
      let newLevel = prev.hero.level;
      let reqExp = prev.hero.expToNext;
      let extraPoints = 0;

      if (newExp >= reqExp) {
        newLevel += 1;
        reqExp = Math.round(reqExp * 1.5);
        extraPoints += 1;
      }

      return {
        ...prev,
        hero: {
          ...prev.hero,
          level: newLevel,
          exp: newExp >= reqExp ? newExp - reqExp : newExp,
          expToNext: reqExp,
        },
        skillPoints: prev.skillPoints + extraPoints,
        stats: {
          ...prev.stats,
          monstersDefeated: prev.stats.monstersDefeated + 1,
        },
      };
    });
  };

  const handleFloorCleared = (dungeonId: number, floor: number) => {
    setGameState((prev) => {
      let nextFloor = floor + 1;
      let nextDungeon = dungeonId;

      if (floor >= 10) {
        // Advanced past dungeon boss
        if (dungeonId < 10) {
          nextDungeon = dungeonId + 1;
          nextFloor = 1;
        } else {
          nextFloor = 10;
        }
      }

      const globalFloor = (dungeonId - 1) * 10 + floor;
      const highestCleared = Math.max(prev.dungeonProgress.highestFloorCleared, globalFloor);

      // Unlock story chapters at milestones (10, 20, 30, 40, 50, 60, 70, 80, 90, 100)
      const unlockStories = [...prev.unlockedStoryIds];
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((f, idx) => {
        if (globalFloor >= f && !unlockStories.includes(idx + 2)) {
          unlockStories.push(idx + 2);
        }
      });

      return {
        ...prev,
        dungeonProgress: {
          ...prev.dungeonProgress,
          activeDungeonId: nextDungeon,
          activeFloor: nextFloor,
          highestFloorCleared: highestCleared,
          highestDungeonUnlocked: Math.max(prev.dungeonProgress.highestDungeonUnlocked, nextDungeon),
        },
        unlockedStoryIds: unlockStories,
        stats: {
          ...prev.stats,
          floorsCleared: prev.stats.floorsCleared + 1,
        },
      };
    });
  };

  // Toggle Executive Decree
  const handleToggleDecree = (decreeId: DecreeId) => {
    setGameState((prev) => {
      const current = prev.activeDecrees || [];
      const exists = current.includes(decreeId);
      const updated = exists ? current.filter((id) => id !== decreeId) : [...current, decreeId];
      audio.playClick();
      return {
        ...prev,
        activeDecrees: updated,
      };
    });
  };

  // Hire Named Specialist at the Tavern
  const handleHireSpecialist = (specialistId: string) => {
    setGameState((prev) => {
      const currentHired = prev.hiredSpecialistIds || [];
      if (currentHired.includes(specialistId)) return prev;
      const spec = PIONEER_SPECIALISTS.find((s) => s.id === specialistId);
      if (!spec) return prev;
      if (
        prev.resources.wood_refined < spec.cost.wood_refined ||
        prev.resources.stone_refined < spec.cost.stone_refined ||
        prev.resources.iron_refined < spec.cost.iron_refined
      ) {
        return prev;
      }
      audio.playLevelUp();
      return {
        ...prev,
        resources: {
          ...prev.resources,
          wood_refined: prev.resources.wood_refined - spec.cost.wood_refined,
          stone_refined: prev.resources.stone_refined - spec.cost.stone_refined,
          iron_refined: prev.resources.iron_refined - spec.cost.iron_refined,
        },
        hiredSpecialistIds: [...currentHired, specialistId],
      };
    });
  };

  // Brew Potion in Alchemy Lab
  const handleBrewPotion = (potionType: PotionType, count: number) => {
    setGameState((prev) => {
      const info = POTIONS_INFO[potionType];
      if (!info) return prev;
      const cost = info.cost;
      const res = { ...prev.resources };
      const totalWood = (cost.wood_raw || 0) * count;
      const totalStone = (cost.stone_raw || 0) * count;
      const totalIron = (cost.iron_raw || 0) * count;
      const totalCrystal = (cost.crystal_raw || 0) * count;
      const totalWoodRefined = (cost.wood_refined || 0) * count;

      if (
        res.wood_raw < totalWood ||
        res.stone_raw < totalStone ||
        res.iron_raw < totalIron ||
        res.crystal_raw < totalCrystal ||
        res.wood_refined < totalWoodRefined
      ) {
        return prev;
      }

      res.wood_raw -= totalWood;
      res.stone_raw -= totalStone;
      res.iron_raw -= totalIron;
      res.crystal_raw -= totalCrystal;
      res.wood_refined -= totalWoodRefined;

      audio.playCrystal();
      return {
        ...prev,
        resources: res,
        potions: {
          ...prev.potions,
          [potionType]: (prev.potions[potionType] || 0) + count,
        },
        stats: {
          ...prev.stats,
          potionsBrewed: (prev.stats.potionsBrewed || 0) + count,
        },
      };
    });
  };

  // Toggle Auto-Consume Potions
  const handleToggleAutoConsume = () => {
    audio.playClick();
    setGameState((prev) => ({
      ...prev,
      autoConsumePotion: !prev.autoConsumePotion,
    }));
  };

  // Tactical Potion Consumption (manual or auto in combat)
  const handleUsePotion = (potionType: PotionType) => {
    setGameState((prev) => {
      const current = prev.potions[potionType] || 0;
      if (current <= 0) return prev;
      let newHp = prev.hero.hp;
      if (potionType === 'healing_herb') {
        newHp = Math.min(prev.hero.maxHp, prev.hero.hp + Math.round(prev.hero.maxHp * 0.45));
        audio.playCollect();
      } else if (potionType === 'crystal_focus') {
        newHp = Math.min(prev.hero.maxHp, prev.hero.hp + Math.round(prev.hero.maxHp * 0.3));
        audio.playCrystal();
      } else if (potionType === 'stone_skin') {
        audio.playMine();
      } else if (potionType === 'flame_oil') {
        audio.playForge();
      }
      return {
        ...prev,
        potions: {
          ...prev.potions,
          [potionType]: current - 1,
        },
        hero: {
          ...prev.hero,
          hp: newHp,
        },
      };
    });
  };

  const handleRelicFound = (relicId: number) => {
    setGameState((prev) => {
      if (prev.discoveredRelicIds.includes(relicId)) return prev;
      return {
        ...prev,
        discoveredRelicIds: [...prev.discoveredRelicIds, relicId],
        stats: {
          ...prev.stats,
          relicsFound: prev.stats.relicsFound + 1,
        },
      };
    });
  };

  const handleSealShardFound = (shardIndex: number) => {
    setGameState((prev) => ({
      ...prev,
      dungeonProgress: {
        ...prev.dungeonProgress,
        sealShardsCollected: Math.max(prev.dungeonProgress.sealShardsCollected, shardIndex),
      },
    }));
  };

  const handleRecoverMedallion = () => {
    setGameState((prev) => ({
      ...prev,
      dungeonProgress: {
        ...prev.dungeonProgress,
        grandfatherMedallionRecovered: true,
      },
    }));
    setAppState('VICTORY');
  };

  // Calculate worker housing capacity
  const hutCount = gameState.placedBuildings.filter((b) => b.type === 'workers_hut').length;
  const maxWorkerCapacity = 4 + hutCount * 4;

  // Toggle Audio Mute
  const handleToggleMute = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  // -------------------------------------------------------------
  // TITLE SCREEN VIEW
  // -------------------------------------------------------------
  if (appState === 'TITLE') {
    return (
      <div className="relative w-screen h-screen bg-[#12100e] text-[#e5dfd8] flex flex-col items-center justify-between p-8 overflow-hidden select-none">
        {/* Atmospheric Live Canvas Pan or Background Ember Glow */}
        <div className="absolute inset-0 bg-radial from-amber-950/20 via-[#181410] to-[#0c0a09] pointer-events-none" />

        {/* Live Village Preview in Background (dimmed) */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <VillageCanvas
            placedBuildings={gameState.placedBuildings}
            buildingToPlace={null}
            workerCount={Object.values(gameState.workers).reduce((a, b) => a + b, 0)}
          />
        </div>

        {/* Top bar with audio controls */}
        <div className="relative z-10 w-full flex justify-end">
          <button
            onClick={handleToggleMute}
            className="px-3 py-1.5 rounded-lg bg-stone-900/80 border border-amber-950/60 text-xs text-amber-300 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? '🔇 Áudio Desativado' : '🔊 Trilha & Efeitos Ativos'}
          </button>
        </div>

        {/* Center Hero Lockup & Story Intro */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl my-auto space-y-6">
          {/* Bespoke Inline SVG Title Lockup */}
          <div className="w-20 h-20 mb-2 text-amber-500 animate-pulse">
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-lg">
              <circle cx="50" cy="50" r="44" stroke="#f59e0b" strokeWidth="3" opacity="0.6" />
              <circle cx="50" cy="50" r="32" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 4" />
              <path d="M50 20 L50 80 M20 50 L80 50" stroke="#f59e0b" strokeWidth="2" opacity="0.4" />
              <circle cx="50" cy="50" r="14" fill="#1e1814" stroke="#38bdf8" strokeWidth="3" />
              <path d="M50 42 L56 54 L44 54 Z" fill="#38bdf8" />
            </svg>
          </div>

          <h1 className="font-cinzel text-4xl sm:text-5xl font-black text-amber-100 tracking-wider drop-shadow-md">
            O POÇO ANCESTRAL
          </h1>
          <p className="font-cinzel text-sm sm:text-base text-amber-500/90 tracking-widest uppercase">
            Memória · Perda · A Volta para Casa
          </p>

          <p className="text-xs sm:text-sm text-stone-300/90 font-serif leading-relaxed max-w-lg">
            Sob as fundações da antiga vila de mineração, galerias esquecidas guardam a única lembrança que restava da
            mulher que seu avô amou: um medalhão de pedra azul. Reconstrua as casas, acenda as lanternas e apoie a
            descida às sete masmorras do poço.
          </p>

          {/* Start CTA Button */}
          <button
            onClick={() => {
              setAppState('PLAYING');
              audio.startMusic();
            }}
            className="px-8 py-3.5 bg-amber-700 hover:bg-amber-600 text-amber-100 font-cinzel font-bold text-sm sm:text-base rounded-lg shadow-xl border border-amber-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Iniciar Jornada
          </button>
        </div>

        {/* Flat Control-Hint Line */}
        <div className="relative z-10 text-xs text-amber-600/70 font-mono tracking-wide">
          Enter / Espaço Iniciar · V Vila · M Masmorra · Esc Pausar
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN GAME SHELL (PLAYING / PAUSED / VICTORY)
  // -------------------------------------------------------------
  const { resources, warehouseCapacity, dungeonProgress, hero } = gameState;

  return (
    <div className="relative w-screen h-screen bg-[#12100e] text-[#e5dfd8] flex flex-col overflow-hidden select-none">
      {/* 1. TOP STATUS BAR (Low-Occlusion Perimeter Status Cluster) */}
      <header className="h-14 bg-[#181410]/95 border-b border-amber-950/60 px-4 flex items-center justify-between z-20 gap-4">
        {/* Left: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <span className="font-cinzel font-bold text-amber-200 tracking-wide text-sm whitespace-nowrap">
            O Poço Ancestral
          </span>
          <span className="text-stone-500 text-xs hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-stone-400 hidden sm:inline">
            Andar {dungeonProgress.highestFloorCleared}/100
          </span>
        </div>

        {/* Center: Live Resource Counters (Tabular Numerals) */}
        <div className="flex items-center gap-4 text-xs overflow-x-auto py-1">
          {/* Wood */}
          <div className="flex items-center gap-1.5" title="Madeira Bruta e Tábuas">
            <span className="text-emerald-500 font-bold">🌲</span>
            <span className="font-mono tabular-nums text-emerald-300 font-medium">
              {resources.wood_raw}
            </span>
            {resources.wood_refined > 0 && (
              <span className="text-[10px] text-emerald-500/80 font-mono">
                (+{resources.wood_refined} tábuas)
              </span>
            )}
          </div>

          {/* Stone */}
          <div className="flex items-center gap-1.5" title="Pedra Bruta e Blocos">
            <span className="text-stone-400 font-bold">🪨</span>
            <span className="font-mono tabular-nums text-stone-300 font-medium">
              {resources.stone_raw}
            </span>
            {resources.stone_refined > 0 && (
              <span className="text-[10px] text-stone-400 font-mono">
                (+{resources.stone_refined} blocos)
              </span>
            )}
          </div>

          {/* Iron */}
          <div className="flex items-center gap-1.5" title="Minério e Lingotes de Ferro">
            <span className="text-amber-500 font-bold">⛏️</span>
            <span className="font-mono tabular-nums text-amber-300 font-medium">
              {resources.iron_raw}
            </span>
            {resources.iron_refined > 0 && (
              <span className="text-[10px] text-amber-500/80 font-mono">
                (+{resources.iron_refined} lingotes)
              </span>
            )}
          </div>

          {/* Crystal */}
          <div className="flex items-center gap-1.5" title="Cristal Bruto e Fragmentos">
            <span className="text-cyan-400 font-bold">✨</span>
            <span className="font-mono tabular-nums text-cyan-200 font-medium">
              {resources.crystal_raw}
            </span>
            {resources.crystal_refined > 0 && (
              <span className="text-[10px] text-cyan-400/80 font-mono">
                (+{resources.crystal_refined} lapidados)
              </span>
            )}
          </div>

          {/* Warehouse Limit */}
          <div className="text-[11px] text-stone-500 font-mono hidden md:block">
            Cap: {warehouseCapacity}
          </div>
        </div>

        {/* Right: Sound & View Mode Switches */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle (Village vs Dungeon) */}
          <div className="flex bg-[#12100e] p-0.5 rounded-lg border border-amber-950/60">
            <button
              onClick={() => {
                audio.playClick();
                setActiveTab('village');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'village'
                  ? 'bg-amber-800 text-amber-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Vila
            </button>
            <button
              onClick={() => {
                audio.playClick();
                setActiveTab('dungeon');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'dungeon'
                  ? 'bg-amber-800 text-amber-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>Poço</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleMute}
            className="w-8 h-8 rounded-lg bg-[#12100e] border border-amber-950/60 flex items-center justify-center text-xs text-amber-300 hover:text-white transition-colors cursor-pointer"
            title="Alternar Áudio"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* 2. MAIN PLAYFIELD VIEWPORT */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Village Isometric Canvas */}
        <div className={`w-full h-full ${activeTab === 'village' ? 'block' : 'hidden'}`}>
          <VillageCanvas
            placedBuildings={gameState.placedBuildings}
            buildingToPlace={buildingToPlace}
            onPlaceBuilding={handlePlaceBuilding}
            onCancelPlacement={() => setBuildingToPlace(null)}
            onSelectBuilding={(building) => {
              if (building.type === 'forge') setShowForge(true);
              else if (building.type === 'sawmill' || building.type === 'quarry') setShowForge(true);
              else if (building.type === 'workers_hut') setShowWorkforce(true);
              else if (building.type === 'tavern') setShowTavern(true);
              else if (building.type === 'alchemy_lab') setShowAlchemyLab(true);
              else if (building.type === 'mayors_manor') setShowExecutiveDashboard(true);
              else if (building.type === 'ancestral_well') setActiveTab('dungeon');
            }}
            onHarvestNode={handleHarvestNode}
            workerCount={Object.values(gameState.workers).reduce((a, b) => a + b, 0)}
          />
        </div>

        {/* Real-time Dungeon Side-View Viewer */}
        <div className={`w-full h-full ${activeTab === 'dungeon' ? 'block' : 'hidden'}`}>
          <DungeonViewer
            gameState={gameState}
            onUpdateHeroHp={handleUpdateHeroHp}
            onHeroLevelUp={() => {}}
            onFloorCleared={handleFloorCleared}
            onMonsterDefeated={handleMonsterDefeated}
            onRelicFound={handleRelicFound}
            onSealShardFound={handleSealShardFound}
            onRecoverMedallion={handleRecoverMedallion}
            onUsePotion={handleUsePotion}
          />
        </div>
      </main>

      {/* 3. BOTTOM WORKSPACE TOOLBAR (Actions & Management Windows) */}
      <footer className="h-14 bg-[#181410]/95 border-t border-amber-950/60 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {/* Executive Dashboard (CEO) */}
          <button
            onClick={() => {
              audio.playClick();
              setShowExecutiveDashboard(true);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-950/60 to-yellow-950/60 hover:from-amber-900/80 hover:to-yellow-900/80 border border-yellow-600/50 text-yellow-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
          >
            <span>🏛️</span>
            <span>Gabinete CEO</span>
          </button>

          {/* Build Menu */}
          <button
            onClick={() => {
              audio.playClick();
              setShowBuildMenu(true);
            }}
            className="px-3.5 py-1.5 bg-amber-900/30 hover:bg-amber-900/60 border border-amber-700/40 text-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>🔨</span>
            <span>Construir</span>
          </button>

          {/* Forge & Refine */}
          <button
            onClick={() => {
              audio.playClick();
              setShowForge(true);
            }}
            className="px-3.5 py-1.5 bg-amber-900/30 hover:bg-amber-900/60 border border-amber-700/40 text-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>🔥</span>
            <span>Forja & Refino</span>
          </button>

          {/* Tavern Specialists */}
          <button
            onClick={() => {
              audio.playClick();
              setShowTavern(true);
            }}
            className="px-3.5 py-1.5 bg-amber-900/30 hover:bg-amber-900/60 border border-amber-700/40 text-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>🍺</span>
            <span>Taverna</span>
          </button>

          {/* Alchemy Lab */}
          <button
            onClick={() => {
              audio.playClick();
              setShowAlchemyLab(true);
            }}
            className="px-3.5 py-1.5 bg-amber-900/30 hover:bg-amber-900/60 border border-amber-700/40 text-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>🧪</span>
            <span>Alquimia</span>
          </button>

          {/* Workers & Expeditions */}
          <button
            onClick={() => {
              audio.playClick();
              setShowWorkforce(true);
            }}
            className="px-3.5 py-1.5 bg-amber-900/30 hover:bg-amber-900/60 border border-amber-700/40 text-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>👥</span>
            <span>Trabalhadores</span>
          </button>

          {/* Skills Tree */}
          <button
            onClick={() => {
              audio.playClick();
              setShowSkills(true);
            }}
            className="px-3.5 py-1.5 bg-amber-900/30 hover:bg-amber-900/60 border border-amber-700/40 text-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>📜</span>
            <span>Habilidades ({gameState.skillPoints})</span>
          </button>

          {/* Relics */}
          <button
            onClick={() => {
              audio.playClick();
              setShowRelics(true);
            }}
            className="px-3.5 py-1.5 bg-amber-900/30 hover:bg-amber-900/60 border border-amber-700/40 text-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>✨</span>
            <span>Relíquias ({gameState.discoveredRelicIds.length}/60)</span>
          </button>

          {/* Grandfather's Story */}
          <button
            onClick={() => {
              audio.playClick();
              setShowStory(true);
            }}
            className="px-3.5 py-1.5 bg-amber-900/30 hover:bg-amber-900/60 border border-amber-700/40 text-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>📖</span>
            <span>Memórias do Avô</span>
          </button>

          {/* Gemini Strategic Chatbot */}
          <button
            onClick={() => {
              audio.playClick();
              setShowChat(true);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-950/50 to-amber-950/50 hover:from-purple-900/70 hover:to-amber-900/70 border border-purple-500/50 text-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
          >
            <span>🧙‍♂️</span>
            <span>Conselho Gemini (CEO)</span>
          </button>

          {/* Gemini Image Studio */}
          <button
            onClick={() => {
              audio.playClick();
              setShowImageStudio(true);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-950/50 to-blue-950/50 hover:from-cyan-900/70 hover:to-blue-900/70 border border-cyan-500/50 text-cyan-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
          >
            <span>🎨</span>
            <span>Ateliê de Imagens (2.1)</span>
          </button>
        </div>

        {/* Hero Quick Badge */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-stone-400">
          <span className="text-amber-200 font-medium">{hero.name}</span>
          <span aria-hidden="true">·</span>
          <span>Atq: <strong className="text-amber-400 font-mono">{hero.attack}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Def: <strong className="text-stone-300 font-mono">{hero.defense}</strong></span>
          <span aria-hidden="true">·</span>
          <span>HP: <strong className="text-emerald-400 font-mono">{hero.hp}/{hero.maxHp}</strong></span>
        </div>
      </footer>

      {/* 4. MODALS */}
      {showExecutiveDashboard && (
        <ExecutiveDashboardModal
          gameState={gameState}
          onClose={() => setShowExecutiveDashboard(false)}
          onToggleDecree={handleToggleDecree}
        />
      )}

      {showTavern && (
        <TavernModal
          gameState={gameState}
          onClose={() => setShowTavern(false)}
          onHireSpecialist={handleHireSpecialist}
        />
      )}

      {showAlchemyLab && (
        <AlchemyLabModal
          gameState={gameState}
          onClose={() => setShowAlchemyLab(false)}
          onBrewPotion={handleBrewPotion}
          onToggleAutoConsume={handleToggleAutoConsume}
        />
      )}

      {showBuildMenu && (
        <BuildMenuModal
          gameState={gameState}
          onClose={() => setShowBuildMenu(false)}
          onSelectBuildingToPlace={(type) => {
            setShowBuildMenu(false);
            setBuildingToPlace(type);
            setActiveTab('village');
          }}
        />
      )}

      {showForge && (
        <ForgeModal
          gameState={gameState}
          onClose={() => setShowForge(false)}
          onRefineResource={handleRefineResource}
          onUpgradeEquipment={handleUpgradeEquipment}
          onUpgradeTool={handleUpgradeTool}
        />
      )}

      {showWorkforce && (
        <WorkforceModal
          gameState={gameState}
          onClose={() => setShowWorkforce(false)}
          onHireWorker={handleHireWorker}
          onAssignWorker={() => {}}
          onStartExpedition={handleStartExpedition}
          onClaimExpedition={handleClaimExpedition}
          maxWorkerCapacity={maxWorkerCapacity}
        />
      )}

      {showSkills && (
        <SkillTreeModal
          gameState={gameState}
          onClose={() => setShowSkills(false)}
          onUnlockSkill={handleUnlockSkill}
        />
      )}

      {showRelics && (
        <RelicsModal
          gameState={gameState}
          onClose={() => setShowRelics(false)}
        />
      )}

      {showStory && (
        <StoryModal
          gameState={gameState}
          onClose={() => setShowStory(false)}
        />
      )}

      {showChat && (
        <GeminiChatModal
          onClose={() => setShowChat(false)}
          villageContextSummary={`Andar Atual: ${dungeonProgress.activeFloor} de ${dungeonProgress.activeDungeonId}. Recursos: Madeira ${resources.wood_raw}, Pedra ${resources.stone_raw}, Ferro ${resources.iron_raw}, Cristal ${resources.crystal_raw}. Trabalhadores ativos: ${Object.values(gameState.workers).reduce((a, b) => a + b, 0)}. Relíquias: ${gameState.discoveredRelicIds.length}/60.`}
        />
      )}

      {showImageStudio && (
        <GeminiImageModal
          onClose={() => setShowImageStudio(false)}
        />
      )}

      {offlineData && (
        <OfflineModal
          elapsedMinutes={offlineData.minutes}
          gathered={offlineData.gathered}
          expeditionsCount={offlineData.expeditionsCount}
          onClaim={() => setOfflineData(null)}
        />
      )}

      {/* 5. VICTORY / COMPLETION SCREEN */}
      {appState === 'VICTORY' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
          <div className="bg-[#1c1814] border-2 border-sky-400 w-full max-w-lg rounded-2xl shadow-2xl p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-sky-950/80 border-2 border-sky-400 mx-auto flex items-center justify-center text-4xl shadow-inner animate-bounce">
              💎
            </div>

            <div className="space-y-2">
              <h2 className="font-cinzel text-2xl font-bold text-sky-200">
                O Medalhão de Pedra Azul Retornou
              </h2>
              <p className="font-cinzel text-xs text-amber-400 tracking-wider uppercase">
                A Volta para Casa
              </p>
            </div>

            <p className="text-xs text-stone-300 font-serif leading-relaxed italic">
              "Você trouxe a única coisa que o tempo parecia ter roubado de mim. Mas ao olhar para cima, vejo que você fez
              mais do que isso: você trouxe vida, lareiras acesas e esperança de volta para esta terra. O poço agora é um
              monumento, e não uma ferida." — Avô Tomás
            </p>

            <div className="bg-[#14110e] p-4 rounded-lg border border-amber-950/60 text-xs text-amber-300">
              Você completou a narrativa principal! Pode continuar jogando, expandindo a vila, desbravando relíquias e
              aprimorando cada canto deste vale acolhedor.
            </div>

            <button
              onClick={() => {
                audio.playClick();
                setAppState('PLAYING');
              }}
              className="w-full py-3 bg-amber-700 hover:bg-amber-600 text-amber-100 font-cinzel font-bold rounded-lg shadow-xl text-sm transition-colors cursor-pointer"
            >
              Continuar Cuidando da Vila
            </button>
          </div>
        </div>
      )}

      {/* 6. PAUSE MODAL */}
      {appState === 'PAUSED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
          <div className="bg-[#1c1713] border border-amber-900/60 w-full max-w-sm rounded-xl p-6 text-center space-y-4">
            <h3 className="font-cinzel text-xl font-bold text-amber-200">Jogo Pausado</h3>
            <p className="text-xs text-stone-400">
              A vila e as profundezas aguardam seu comando sereno.
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => setAppState('PLAYING')}
                className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Retomar Jogo (Esc)
              </button>
              <button
                onClick={() => setAppState('TITLE')}
                className="w-full py-2 bg-[#14110e] hover:bg-stone-900 border border-amber-950/60 text-stone-300 rounded text-xs transition-colors cursor-pointer"
              >
                Voltar à Tela Inicial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
