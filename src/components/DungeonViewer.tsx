import React, { useState, useEffect, useRef } from 'react';
import { GameState, DungeonMonster, PotionType } from '../types/game';
import { DUNGEONS_DATA, RELICS_DATA, DIFFICULTY_CONFIGS } from '../data/gameData';
import { audio } from '../utils/audio';

interface DungeonViewerProps {
  gameState: GameState;
  onUpdateHeroHp: (hp: number) => void;
  onHeroLevelUp: (newLevel: number, newExp: number) => void;
  onFloorCleared: (dungeonId: number, floor: number) => void;
  onMonsterDefeated: (exp: number) => void;
  onRelicFound: (relicId: number) => void;
  onSealShardFound: (shardIndex: number) => void;
  onRecoverMedallion: () => void;
  onUsePotion: (potionType: PotionType) => void;
  onOpenDifficultyModal?: () => void;
}

export const DungeonViewer: React.FC<DungeonViewerProps> = ({
  gameState,
  onUpdateHeroHp,
  onFloorCleared,
  onMonsterDefeated,
  onRelicFound,
  onSealShardFound,
  onRecoverMedallion,
  onUsePotion,
  onOpenDifficultyModal,
}) => {
  const { dungeonProgress, hero, potions, autoConsumePotion } = gameState;
  const currentDungeon = DUNGEONS_DATA.find((d) => d.id === dungeonProgress.activeDungeonId) || DUNGEONS_DATA[0];

  // Current monster state in combat
  const [monster, setMonster] = useState<DungeonMonster | null>(null);
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  const [heroAttackAnim, setHeroAttackAnim] = useState(false);
  const [monsterAttackAnim, setMonsterAttackAnim] = useState(false);
  const [damageNumber, setDamageNumber] = useState<{ text: string; isCrit?: boolean; isHero?: boolean; isHeal?: boolean } | null>(null);

  // Active combat buffs & skill cooldowns
  const [flameBuffHits, setFlameBuffHits] = useState(0);
  const [stoneBuffHits, setStoneBuffHits] = useState(0);
  const [medallionCd, setMedallionCd] = useState(0);
  const [bossTelegraph, setBossTelegraph] = useState(false);

  const heroHpRef = useRef(hero.hp);
  heroHpRef.current = hero.hp;

  const currentFloor = dungeonProgress.activeFloor;
  const globalFloor = (dungeonProgress.activeDungeonId - 1) * 10 + currentFloor;

  // Medallion Cooldown ticker
  useEffect(() => {
    if (medallionCd <= 0) return;
    const timer = setInterval(() => {
      setMedallionCd((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [medallionCd]);

  // Generate monster for current dungeon & floor (1 to 100)
  const spawnMonster = (dungeonId: number, floor: number): DungeonMonster => {
    const isBoss = floor === 10;
    const baseMult = (dungeonId - 1) * 10 + floor;

    const monsterNamesByDungeon: Record<number, { normal: string[]; boss: string }> = {
      1: {
        normal: ['Rato-Toupeira Cego', 'Morcego das Galerias', 'Escorpião de Cascalho'],
        boss: 'Rato-Toupeira Titânico',
      },
      2: {
        normal: ['Golias de Ardósia Menor', 'Serpente de Casca de Pedra', 'Mineiro Esquelético'],
        boss: 'Golem de Granito Rachado',
      },
      3: {
        normal: ['Centelha de Escória', 'Salamandra Vulcânica', 'Elemental de Fuligem'],
        boss: 'Fera da Fornalha Primordial',
      },
      4: {
        normal: ['Aracnídeo Cristalino', 'Reflexo Ilusório', 'Cobra de Safira'],
        boss: 'Colosso de Prisma Azul',
      },
      5: {
        normal: ['Sentinela das Águas', 'Gárgula dos Fundadores', 'Sacerdote da Chuva'],
        boss: 'Guardião Silencioso do Poço',
      },
      6: {
        normal: ['Espectro da Fenda', 'Olho Flutuante do Abismo', 'Eco Rúnico'],
        boss: 'Aparição do Vazio Subterrâneo',
      },
      7: {
        normal: ['Guarda de Honra Ancestral', 'Autômato de Prata e Ferro', 'Espírito da Primeira Era'],
        boss: 'O Construtor Ancestral',
      },
      8: {
        normal: ['Sentinela das Estrelas', 'Golem de Obsidiana', 'Vagalume do Vácuo'],
        boss: 'O Astrônomo Esquecido',
      },
      9: {
        normal: ['Espectro das Eras', 'Ampulheta Viva', 'Cavaleiro do Eco'],
        boss: 'Cronosfero das Memórias',
      },
      10: {
        normal: ['Guardião da Primeira Chama', 'Autômato Imortal', 'Sombra do Fundador'],
        boss: 'O Construtor Primordial & Guardião Eterno',
      },
    };

    const names = monsterNamesByDungeon[dungeonId] || monsterNamesByDungeon[1];
    const name = isBoss ? names.boss : names.normal[Math.floor(Math.random() * names.normal.length)];

    const diffConfig = DIFFICULTY_CONFIGS[gameState.difficulty || 'medium'];

    const maxHp = Math.round((75 + baseMult * 45 + (isBoss ? baseMult * 85 : 0)) * diffConfig.monsterHpMult);
    const attack = Math.round((10 + baseMult * 5.2 + (isBoss ? 22 : 0)) * diffConfig.monsterDmgMult);
    const defense = Math.round(4 + baseMult * 2.8);
    const dropExp = Math.round(25 + baseMult * 14 * (isBoss ? 4 : 1) * diffConfig.expBonusMult);

    return {
      name,
      hp: maxHp,
      maxHp,
      attack,
      defense,
      speed: 1,
      isBoss,
      color: currentDungeon.themeColor,
      dropExp,
    };
  };

  // Initialize or respawn monster when floor or difficulty changes
  useEffect(() => {
    const newMonster = spawnMonster(dungeonProgress.activeDungeonId, dungeonProgress.activeFloor);
    setMonster(newMonster);
    const diffCfg = DIFFICULTY_CONFIGS[gameState.difficulty || 'medium'];
    setCombatLogs((prev) => [
      `Entrando no Andar ${dungeonProgress.activeFloor} (${globalFloor}/100) de "${currentDungeon.name}" [${diffCfg.name}].`,
      `Um perigoso ${newMonster.name}${newMonster.isBoss ? ' [CHEFE DE ANDAR]' : ''} surge das sombras!`,
      ...prev.slice(0, 15),
    ]);
  }, [dungeonProgress.activeDungeonId, dungeonProgress.activeFloor, gameState.difficulty]);

  // Player clicks "Luz de Clara" active skill
  const handleUseMedallionSkill = () => {
    if (medallionCd > 0 || !monster) return;
    audio.playCrystal();

    const burstDamage = Math.round(hero.attack * 2.5 + 40);
    const healAmount = 50;

    const newMonsterHp = Math.max(monster.hp - burstDamage, 0);
    setMonster((prev) => (prev ? { ...prev, hp: newMonsterHp } : null));

    const newHeroHp = Math.min(heroHpRef.current + healAmount, hero.maxHp);
    onUpdateHeroHp(newHeroHp);

    setDamageNumber({ text: `🌟 -${burstDamage}`, isCrit: true, isHero: false });
    setTimeout(() => setDamageNumber(null), 700);

    setMedallionCd(12);

    setCombatLogs((prev) => [
      `✨ ${hero.name} canaliza a LUZ DE CLARA! Causou ${burstDamage} de dano estelar e curou +${healAmount} HP!`,
      ...prev.slice(0, 15),
    ]);
  };

  // Real-time automated combat tick
  useEffect(() => {
    if (!gameState.dungeonProgress.inCombat || !monster) return;

    const interval = setInterval(() => {
      if (!monster || heroHpRef.current <= 0) return;

      // Check auto-consume potion if below 35% HP
      if (
        autoConsumePotion &&
        heroHpRef.current < hero.maxHp * 0.35 &&
        potions.healing_herb > 0
      ) {
        onUsePotion('healing_herb');
        audio.playCollect();
        const healedHp = Math.min(heroHpRef.current + 120, hero.maxHp);
        onUpdateHeroHp(healedHp);
        setCombatLogs((prev) => [
          `🌿 [Auto-Cura] ${hero.name} bebeu Salvia do Bosque no calor da batalha! (+120 HP)`,
          ...prev.slice(0, 15),
        ]);
        setDamageNumber({ text: '+120 HP', isHeal: true, isHero: true });
        setTimeout(() => setDamageNumber(null), 600);
      }

      // 1. Hero attacks monster
      setHeroAttackAnim(true);
      setTimeout(() => setHeroAttackAnim(false), 200);

      const isCrit = Math.random() * 100 < hero.critChance;
      const flameMult = flameBuffHits > 0 ? 1.4 : 1.0;
      if (flameBuffHits > 0) setFlameBuffHits((prev) => Math.max(prev - 1, 0));

      const baseDmg = Math.max(hero.attack * flameMult - monster.defense * 0.4, 4);
      const heroDmg = Math.round((baseDmg + Math.random() * 6) * (isCrit ? 2.0 : 1.0));

      const updatedMonsterHp = Math.max(monster.hp - heroDmg, 0);

      setDamageNumber({ text: `-${heroDmg}`, isCrit, isHero: false });
      setTimeout(() => setDamageNumber(null), 600);

      audio.playHit();

      // Check life leech skill
      const hasLeech = gameState.unlockedSkills.includes('combat_leech');
      if (hasLeech && heroHpRef.current < hero.maxHp) {
        const heal = Math.round(heroDmg * 0.08);
        const newHp = Math.min(heroHpRef.current + heal, hero.maxHp);
        onUpdateHeroHp(newHp);
      }

      if (updatedMonsterHp <= 0) {
        // Monster Defeated!
        audio.playLevelUp();
        onMonsterDefeated(monster.dropExp);

        setCombatLogs((prev) => [
          `⚔️ ${hero.name} derrotou ${monster.name}! (+${monster.dropExp} EXP)`,
          ...prev.slice(0, 15),
        ]);

        // Check relic discovery chance
        const dungeonRelics = RELICS_DATA.filter((r) => r.dungeonId === dungeonProgress.activeDungeonId);
        const undiscovered = dungeonRelics.filter((r) => !gameState.discoveredRelicIds.includes(r.id));
        const diffCfg = DIFFICULTY_CONFIGS[gameState.difficulty || 'medium'];
        const relicChance = Math.min(0.5 + diffCfg.relicChanceBonus, 0.95);

        if (undiscovered.length > 0 && Math.random() < relicChance) {
          const found = undiscovered[0];
          onRelicFound(found.id);
          audio.playRelicFound();
          setCombatLogs((prev) => [
            `✨ RELÍQUIA ENCONTRADA: "${found.name}"!`,
            ...prev.slice(0, 15),
          ]);
        }

        // Check if boss floor
        if (monster.isBoss) {
          // Grant seal shard
          if (dungeonProgress.activeDungeonId <= 6) {
            onSealShardFound(dungeonProgress.activeDungeonId);
            setCombatLogs((prev) => [
              `💎 O Fragmento do Selo #${dungeonProgress.activeDungeonId} foi resgatado do chefe!`,
              ...prev.slice(0, 15),
            ]);
          } else if (dungeonProgress.activeDungeonId === 7) {
            // Recover Grandfather's Blue Stone Medallion!
            onRecoverMedallion();
            setCombatLogs((prev) => [
              `🌟 O MEDALHÃO DE PEDRA AZUL DE CLARA FOI RECUPERADO! A PROMESSA FOI CUMPRIDA!`,
              ...prev.slice(0, 15),
            ]);
          } else if (dungeonProgress.activeDungeonId === 10) {
            setCombatLogs((prev) => [
              `👑 VOCÊ DERROTOU O GUARDIÃO ETERNO! O POÇO ANCESTRAL ESTÁ TOTALMENTE PACIFICADO!`,
              ...prev.slice(0, 15),
            ]);
          }
        }

        // Advance to next floor
        onFloorCleared(dungeonProgress.activeDungeonId, dungeonProgress.activeFloor);
        return;
      }

      setMonster((prev) => (prev ? { ...prev, hp: updatedMonsterHp } : null));

      // Telegraph warning if boss is about to strike
      if (monster.isBoss && Math.random() < 0.4) {
        setBossTelegraph(true);
        setTimeout(() => setBossTelegraph(false), 800);
      }

      // 2. Monster counter-attacks Hero
      setTimeout(() => {
        setMonsterAttackAnim(true);
        setTimeout(() => setMonsterAttackAnim(false), 200);

        const defenseBonus = stoneBuffHits > 0 ? 25 : 0;
        if (stoneBuffHits > 0) setStoneBuffHits((prev) => Math.max(prev - 1, 0));

        const effectiveDef = hero.defense + defenseBonus;
        // Check monster crit on hard modes
        const isMonsterCrit =
          (gameState.difficulty === 'hard' && Math.random() < 0.1) ||
          (gameState.difficulty === 'hard_core' && Math.random() < 0.18) ||
          (gameState.difficulty === 'hard_master' && Math.random() < 0.28);
        const critMult = isMonsterCrit ? 1.5 : 1.0;

        const mDmg = Math.max(Math.round((monster.attack * critMult) - effectiveDef * 0.45 + Math.random() * 4), 2);
        const newHeroHp = Math.max(heroHpRef.current - mDmg, 0);
        onUpdateHeroHp(newHeroHp);

        setDamageNumber({ text: isMonsterCrit ? `💥 -${mDmg} CRÍTICO!` : `-${mDmg}`, isHero: true, isCrit: isMonsterCrit });
        setTimeout(() => setDamageNumber(null), 600);

        if (newHeroHp <= 0) {
          // Hero defeated: retreat to floor 1 of this dungeon with restored vitality
          setCombatLogs((prev) => [
            `💀 ${hero.name} recuou para recuperar o fôlego e curar as feridas.`,
            ...prev.slice(0, 15),
          ]);
          onUpdateHeroHp(Math.round(hero.maxHp * 0.75));
          // Reset floor to 1
          setMonster(spawnMonster(dungeonProgress.activeDungeonId, 1));
        }
      }, 500);
    }, 1700);

    return () => clearInterval(interval);
  }, [monster, gameState.dungeonProgress.inCombat, hero.attack, hero.defense, hero.critChance, hero.maxHp, flameBuffHits, stoneBuffHits, autoConsumePotion, potions.healing_herb, gameState.difficulty]);

  const activeDiffConfig = DIFFICULTY_CONFIGS[gameState.difficulty || 'medium'];

  return (
    <div className="flex flex-col h-full bg-[#161310] text-[#e5dfd8] select-none border-l border-amber-950/40">
      {/* Top Header of Dungeon */}
      <div className="p-4 border-b border-amber-950/40 bg-[#1c1814]/90 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-cinzel text-lg font-bold text-amber-200">{currentDungeon.name}</span>
            <span className="text-xs text-amber-500/80">· Andar {currentFloor}/10 (Global {globalFloor}/100)</span>
            {activeDiffConfig.hazardEffect && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-950/70 border border-red-700/50 text-red-300 animate-pulse">
                {activeDiffConfig.hazardEffect}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{currentDungeon.description}</p>
        </div>

        {/* Difficulty Badge & Global Progress */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audio.playClick();
              onOpenDifficultyModal?.();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:brightness-125 transition-all cursor-pointer shadow-sm"
            style={{
              borderColor: `${activeDiffConfig.color}66`,
              backgroundColor: `${activeDiffConfig.color}15`,
              color: activeDiffConfig.color,
            }}
            title="Alterar Nível de Dificuldade do Jogo"
          >
            <span>{activeDiffConfig.badge}</span>
            <span className="text-[10px] text-stone-400">⚙️</span>
          </button>

          <div className="text-right hidden sm:block">
            <span className="text-[11px] uppercase tracking-wider text-amber-500/70 block">Profundidade</span>
            <span className="text-sm font-semibold text-amber-300 tabular-nums">
              Masmorra {dungeonProgress.activeDungeonId}/10
            </span>
          </div>
        </div>
      </div>

      {/* Side-view Combat Arena */}
      <div className="relative flex-1 min-h-[220px] bg-gradient-to-b from-[#1b1713] to-[#0e0c0a] p-5 flex flex-col justify-between overflow-hidden">
        {/* Background Dungeon Atmosphere */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 30%, ${currentDungeon.themeColor} 0%, transparent 70%)`,
          }}
        />

        {/* Boss Telegraph Banner */}
        {bossTelegraph && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500 text-red-200 text-xs px-4 py-1 rounded-full z-20 animate-pulse font-bold tracking-wide">
            ⚠️ O CHEFE ESTÁ CONCENTRANDO UM GOLPE DEVASTADOR!
          </div>
        )}

        {/* Top Lifebars */}
        <div className="grid grid-cols-2 gap-6 relative z-10">
          {/* Hero Bar */}
          <div className="bg-[#14110e]/90 p-3 rounded-lg border border-amber-900/30">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-medium text-amber-200 flex items-center gap-1.5">
                <span>{hero.name} (Nv. {hero.level})</span>
                {flameBuffHits > 0 && <span className="text-[10px] text-amber-400">🔥 +40%</span>}
                {stoneBuffHits > 0 && <span className="text-[10px] text-stone-300">🛡️ +25 Def</span>}
              </span>
              <span className="text-stone-400 tabular-nums font-mono text-[11px]">
                {hero.hp}/{hero.maxHp} HP
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.max((hero.hp / hero.maxHp) * 100, 0)}%` }}
              />
            </div>
          </div>

          {/* Monster Bar */}
          <div className="bg-[#14110e]/90 p-3 rounded-lg border border-amber-900/30">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-medium text-amber-200 flex items-center gap-1.5">
                {monster?.name || 'Monstro'}
                {monster?.isBoss && (
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Chefe</span>
                )}
              </span>
              <span className="text-stone-400 tabular-nums font-mono text-[11px]">
                {monster ? `${monster.hp}/${monster.maxHp} HP` : '0/0'}
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
              <div
                className="h-full bg-red-600 transition-all duration-300"
                style={{
                  width: `${monster ? Math.max((monster.hp / monster.maxHp) * 100, 0) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Center Combat View (Hero vs Monster) */}
        <div className="relative flex items-center justify-around my-4 z-10 px-8">
          {/* Floating Damage Popup */}
          {damageNumber && (
            <div
              className={`absolute top-0 text-base font-bold animate-bounce transition-all ${
                damageNumber.isHeal
                  ? 'text-emerald-300 left-20 text-lg'
                  : damageNumber.isHero
                    ? 'text-red-400 left-20'
                    : 'text-amber-300 right-20'
              } ${damageNumber.isCrit ? 'text-lg font-extrabold text-yellow-300 scale-125' : ''}`}
            >
              {damageNumber.text} {damageNumber.isCrit && '★'}
            </div>
          )}

          {/* Hero Figure */}
          <div
            className={`flex flex-col items-center transition-transform duration-200 ${
              heroAttackAnim ? 'translate-x-6 scale-105' : ''
            }`}
          >
            <div className="relative w-16 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-md pointer-events-none" />
              <div className="w-12 h-18 bg-amber-950 border-2 border-amber-500 rounded-t-lg rounded-b-md relative flex flex-col items-center justify-center shadow-lg">
                <div className="w-6 h-5 bg-amber-700 rounded-t-sm mb-1 border-b border-amber-400" />
                <div className="absolute -right-3 top-4 w-2 h-12 bg-amber-300 border border-amber-600 rotate-12 rounded-sm" />
                <div className="w-8 h-8 bg-amber-900/80 rounded-b" />
              </div>
            </div>
            <span className="text-xs text-amber-200/90 font-medium mt-1.5">{hero.name}</span>
            <div className="text-[11px] text-stone-400 flex items-center gap-2">
              <span>Atq: {hero.attack}</span>
              <span aria-hidden="true">·</span>
              <span>Def: {hero.defense}</span>
            </div>
          </div>

          {/* Center Clashing Indicator */}
          <div className="text-amber-500/60 font-cinzel text-xl font-bold">VS</div>

          {/* Monster Figure */}
          <div
            className={`flex flex-col items-center transition-transform duration-200 ${
              monsterAttackAnim ? '-translate-x-6 scale-105' : ''
            }`}
          >
            <div className="relative w-16 h-24 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full blur-md pointer-events-none opacity-40"
                style={{ backgroundColor: currentDungeon.themeColor }}
              />
              <div
                className={`w-14 h-20 rounded-lg flex items-center justify-center border-2 shadow-xl ${
                  monster?.isBoss ? 'scale-120 border-red-500 bg-red-950/80' : 'border-stone-600 bg-stone-900/90'
                }`}
              >
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                </div>
              </div>
            </div>
            <span className="text-xs text-stone-200 font-medium mt-1.5">{monster?.name}</span>
            <div className="text-[11px] text-stone-400 flex items-center gap-2">
              <span>Atq: {monster?.attack}</span>
              <span aria-hidden="true">·</span>
              <span>Def: {monster?.defense}</span>
            </div>
          </div>
        </div>

        {/* ACTIVE COMBAT TACTICAL SKILLS & POTIONS STRIP */}
        <div className="relative z-10 py-2 border-t border-amber-950/40 flex flex-wrap items-center justify-center gap-2">
          {/* Healing Herb Potion */}
          <button
            onClick={() => {
              if (potions.healing_herb > 0 && heroHpRef.current < hero.maxHp) {
                onUsePotion('healing_herb');
                audio.playCollect();
                const newHp = Math.min(heroHpRef.current + 120, hero.maxHp);
                onUpdateHeroHp(newHp);
                setDamageNumber({ text: '+120 HP', isHeal: true, isHero: true });
                setTimeout(() => setDamageNumber(null), 600);
              }
            }}
            disabled={potions.healing_herb <= 0 || hero.hp >= hero.maxHp}
            className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 disabled:opacity-40 border border-emerald-600/40 text-emerald-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <span>🌿</span>
            <span>Salvia ({potions.healing_herb})</span>
          </button>

          {/* Flame Oil Potion */}
          <button
            onClick={() => {
              if (potions.flame_oil > 0) {
                onUsePotion('flame_oil');
                audio.playForge();
                setFlameBuffHits(4);
              }
            }}
            disabled={potions.flame_oil <= 0 || flameBuffHits > 0}
            className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 disabled:opacity-40 border border-red-600/40 text-red-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <span>🔥</span>
            <span>Óleo Ígneo ({potions.flame_oil})</span>
          </button>

          {/* Stone Skin Potion */}
          <button
            onClick={() => {
              if (potions.stone_skin > 0) {
                onUsePotion('stone_skin');
                audio.playMine();
                setStoneBuffHits(4);
              }
            }}
            disabled={potions.stone_skin <= 0 || stoneBuffHits > 0}
            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 border border-stone-600/40 text-stone-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <span>🛡️</span>
            <span>Pele Granito ({potions.stone_skin})</span>
          </button>

          {/* Medallion Light Active Skill */}
          <button
            onClick={handleUseMedallionSkill}
            disabled={medallionCd > 0 || !monster}
            className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 disabled:opacity-40 border border-cyan-500/40 text-cyan-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <span>💎</span>
            <span>{medallionCd > 0 ? `Luz (${medallionCd}s)` : 'Luz de Clara'}</span>
          </button>
        </div>

        {/* Floor Progress Stepper */}
        <div className="relative z-10 pt-2 border-t border-amber-950/40">
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1.5">
            <span>Progresso desta Masmorra</span>
            <span className="text-amber-300 font-medium">{currentFloor}/10 Andares</span>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: 10 }).map((_, i) => {
              const floorNum = i + 1;
              const isPast = floorNum < currentFloor;
              const isCurrent = floorNum === currentFloor;
              const isBoss = floorNum === 10;
              return (
                <div
                  key={i}
                  className={`h-2 rounded-sm transition-all ${
                    isCurrent
                      ? 'bg-amber-400 ring-2 ring-amber-400/50 scale-105'
                      : isPast
                        ? 'bg-amber-700/80'
                        : isBoss
                          ? 'bg-red-950 border border-red-700/40'
                          : 'bg-stone-800'
                  }`}
                  title={`Andar ${floorNum}${isBoss ? ' (Chefe)' : ''}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Combat Log Strip */}
      <div className="h-28 bg-[#12100e] border-t border-amber-950/40 p-3 overflow-y-auto font-mono text-[11px] text-stone-400 space-y-1">
        {combatLogs.map((log, index) => (
          <div
            key={index}
            className={`leading-relaxed ${
              index === 0
                ? 'text-amber-200 font-medium'
                : log.includes('derrotou')
                  ? 'text-emerald-400'
                  : log.includes('RELÍQUIA') || log.includes('MEDALHÃO') || log.includes('LUZ DE CLARA')
                    ? 'text-cyan-300 font-semibold'
                    : 'text-stone-400'
            }`}
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};
