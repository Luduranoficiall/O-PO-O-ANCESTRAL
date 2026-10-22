export type ResourceCategory = 'wood' | 'stone' | 'iron' | 'crystal';
export type ResourceQuality = 'raw' | 'refined' | 'pure';

export interface ResourceItem {
  id: string;
  name: string;
  category: ResourceCategory;
  quality: ResourceQuality;
  description: string;
  count: number;
}

export type BuildingType =
  | 'sawmill'
  | 'quarry'
  | 'forge'
  | 'warehouse'
  | 'arcane_workshop'
  | 'workers_hut'
  | 'ancestral_well'
  | 'tavern'
  | 'alchemy_lab'
  | 'mayors_manor';

export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  gridX: number;
  gridY: number;
  level: number;
}

export interface BuildingCost {
  wood_raw?: number;
  wood_refined?: number;
  wood_pure?: number;
  stone_raw?: number;
  stone_refined?: number;
  stone_pure?: number;
  iron_raw?: number;
  iron_refined?: number;
  iron_pure?: number;
  crystal_raw?: number;
  crystal_refined?: number;
  crystal_pure?: number;
}

export interface BuildingInfo {
  type: BuildingType;
  name: string;
  tagline: string;
  description: string;
  maxCount: number;
  baseCost: BuildingCost;
}

export type WorkerType = 'woodcutter' | 'stonemason' | 'miner' | 'lapidary';

export interface WorkerInfo {
  type: WorkerType;
  name: string;
  role: string;
  description: string;
  targetCategory: ResourceCategory;
  baseCost: {
    wood_raw?: number;
    wood_refined?: number;
    stone_raw?: number;
    stone_refined?: number;
    iron_raw?: number;
    iron_refined?: number;
  };
}

export interface Expedition {
  id: string;
  workerType: WorkerType;
  count: number;
  durationMinutes: number; // 10, 30, 60, 240, 480, 720 (12h)
  startedAt: number; // timestamp
  collectedCount: number;
  claimed: boolean;
}

export interface ToolTier {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  type: 'axe' | 'pickaxe' | 'chisel' | 'bellows';
  bonusYield: number;
  cost: BuildingCost;
}

export type EquipmentSlot = 'weapon' | 'armor' | 'shield' | 'charm';

export interface HeroEquipment {
  slot: EquipmentSlot;
  name: string;
  level: number; // 0 to 10
  baseStat: number; // attack or hp or defense or crit
  statPerLevel: number;
}

export interface DungeonMonster {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  isBoss: boolean;
  color: string;
  dropExp: number;
}

export interface DungeonFloor {
  floorNumber: number; // 1 to 10 inside dungeon
  globalFloor: number; // 1 to 100
  name: string;
  monsters: DungeonMonster[];
  hasSealShard?: boolean;
}

export interface DungeonDef {
  id: number; // 1 to 10
  name: string;
  subtitle: string;
  description: string;
  themeColor: string;
  floorsCount: number; // 10
  requiredSealShards: number;
}

export interface Relic {
  id: number; // 1 to 60
  dungeonId: number;
  name: string;
  category: 'memoria' | 'poder' | 'ancestral';
  lore: string;
  effectDescription: string;
  effect: {
    heroHpBonus?: number;
    heroAtkBonus?: number;
    heroDefBonus?: number;
    miningYieldBonus?: number;
    refineSpeedBonus?: number;
    offlineBonus?: number;
  };
  discovered: boolean;
}

export interface SkillNode {
  id: string;
  tree: 'village' | 'combat';
  name: string;
  description: string;
  cost: number;
  tier: number;
  prerequisiteId?: string;
  unlocked: boolean;
}

export interface StoryChapter {
  id: number;
  title: string;
  speaker: string;
  text: string;
  triggerFloor: number;
  unlocked: boolean;
}

export interface GameStats {
  resourcesGathered: number;
  monstersDefeated: number;
  floorsCleared: number;
  relicsFound: number;
  expeditionsCompleted: number;
  itemsCrafted: number;
  timePlayedSeconds: number;
  potionsBrewed: number;
}

// Alchemical Potions & Consumables
export type PotionType = 'healing_herb' | 'flame_oil' | 'stone_skin' | 'crystal_focus';

export interface PotionItem {
  id: PotionType;
  name: string;
  description: string;
  count: number;
  cost: {
    wood_raw?: number;
    stone_raw?: number;
    iron_raw?: number;
    crystal_raw?: number;
    wood_refined?: number;
    crystal_refined?: number;
  };
}

// Village Decrees / Policies (Executive Management)
export type DecreeId = 'night_shift' | 'heavy_rations' | 'caravan_trade' | 'ancient_blessing';

export interface VillageDecree {
  id: DecreeId;
  name: string;
  tagline: string;
  description: string;
  active: boolean;
  costPerMinute: { wood?: number; stone?: number };
}

// Named Humanized Specialists in the Tavern
export interface PioneerSpecialist {
  id: string;
  name: string;
  title: string;
  quote: string;
  trait: string;
  bonusCategory: ResourceCategory | 'combat' | 'speed';
  multiplier: number;
  hired: boolean;
  cost: { wood_refined: number; stone_refined: number; iron_refined: number };
}

export interface GameState {
  version: number;
  lastSavedAt: number;
  gameStarted: boolean;

  // Resources
  resources: {
    wood_raw: number;
    wood_refined: number;
    wood_pure: number;
    stone_raw: number;
    stone_refined: number;
    stone_pure: number;
    iron_raw: number;
    iron_refined: number;
    iron_pure: number;
    crystal_raw: number;
    crystal_refined: number;
    crystal_pure: number;
  };

  // Village
  placedBuildings: PlacedBuilding[];
  warehouseCapacity: number;

  // Workers
  workers: Record<WorkerType, number>;
  workerAssignments: Record<WorkerType, number>;
  activeExpeditions: Expedition[];

  // Executive Management Policies & Decrees
  activeDecrees: DecreeId[];
  hiredSpecialistIds: string[];

  // Potions & Consumables
  potions: Record<PotionType, number>;
  autoConsumePotion: boolean;

  // Tools & Crafting
  tools: {
    axeTier: 1 | 2 | 3;
    pickaxeTier: 1 | 2 | 3;
    chiselTier: 1 | 2 | 3;
    bellowsTier: 1 | 2 | 3;
  };

  // Adventurer
  hero: {
    name: string;
    level: number;
    exp: number;
    expToNext: number;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    critChance: number;
    equipment: Record<EquipmentSlot, HeroEquipment>;
  };

  // Dungeon Progress (1 to 10 Dungeons, 100 Floors total!)
  dungeonProgress: {
    activeDungeonId: number; // 1 to 10
    activeFloor: number; // 1 to 10
    highestDungeonUnlocked: number;
    highestFloorCleared: number; // 1 to 100
    inCombat: boolean;
    autoAdvance: boolean;
    sealShardsCollected: number; // 0 to 6
    grandfatherMedallionRecovered: boolean;
    abyssRiftUnlocked: boolean;
  };

  // Skills
  skillPoints: number;
  unlockedSkills: string[];

  // Relics & Story
  discoveredRelicIds: number[];
  unlockedStoryIds: number[];

  stats: GameStats;
}
