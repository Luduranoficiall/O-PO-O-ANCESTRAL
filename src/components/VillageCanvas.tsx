import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PlacedBuilding, BuildingType } from '../types/game';
import { audio } from '../utils/audio';

interface VillageCanvasProps {
  placedBuildings: PlacedBuilding[];
  onPlaceBuilding?: (gridX: number, gridY: number) => void;
  buildingToPlace: BuildingType | null;
  onCancelPlacement?: () => void;
  onSelectBuilding?: (building: PlacedBuilding) => void;
  onHarvestNode?: (type: 'wood' | 'stone' | 'iron' | 'crystal', x: number, y: number) => void;
  workerCount: number;
}

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  swaySpeed: number;
  swayOffset: number;
}

interface WorkerEntity {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  type: 'woodcutter' | 'stonemason' | 'miner' | 'lapidary';
}

const GRID_SIZE = 9;
const TILE_WIDTH = 76;
const TILE_HEIGHT = 38;
const DAY_CYCLE_SECONDS = 180; // 3 minutos reais = 24 horas no jogo

export const VillageCanvas: React.FC<VillageCanvasProps> = ({
  placedBuildings,
  onPlaceBuilding,
  buildingToPlace,
  onCancelPlacement,
  onSelectBuilding,
  onHarvestNode,
  workerCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Weather mode: auto, snow, or rain
  const [weatherMode, setWeatherMode] = useState<'auto' | 'snow' | 'rain'>('auto');
  const [timeInfo, setTimeInfo] = useState({ hour: 21, minute: 30, period: 'Noite' });

  const floatingTextsRef = useRef<FloatingText[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const weatherParticlesRef = useRef<WeatherParticle[]>([]);
  const workersRef = useRef<WorkerEntity[]>([]);
  const lastTimeInfoUpdate = useRef(0);

  // Initialize weather particles (snow flakes or raindrops)
  useEffect(() => {
    const list: WeatherParticle[] = [];
    const count = 160;
    for (let i = 0; i < count; i++) {
      list.push({
        x: (Math.random() - 0.5) * 2200,
        y: (Math.random() - 0.5) * 1600,
        vx: (Math.random() - 0.5) * 14,
        vy: 32 + Math.random() * 42,
        size: 1.2 + Math.random() * 2.6,
        alpha: 0.35 + Math.random() * 0.65,
        swaySpeed: 0.7 + Math.random() * 1.5,
        swayOffset: Math.random() * Math.PI * 2,
      });
    }
    weatherParticlesRef.current = list;
  }, []);

  // Fixed resource nodes around the village perimeter
  const resourceNodes = useRef([
    { type: 'wood' as const, x: 0, y: 2, label: 'Carvalho Antigo' },
    { type: 'wood' as const, x: 1, y: 1, label: 'Bosque de Pinheiros' },
    { type: 'stone' as const, x: 7, y: 1, label: 'Afloramento de Granito' },
    { type: 'stone' as const, x: 8, y: 2, label: 'Pedreira Superficial' },
    { type: 'iron' as const, x: 1, y: 7, label: 'Veio de Ferro Oxidado' },
    { type: 'crystal' as const, x: 7, y: 7, label: 'Geodo de Cristal Noturno' },
  ]).current;

  // Initialize animated little workers walking around
  useEffect(() => {
    const list: WorkerEntity[] = [];
    const count = Math.min(Math.max(workerCount, 2), 12);
    for (let i = 0; i < count; i++) {
      list.push({
        x: 4,
        y: 4,
        targetX: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
        targetY: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
        progress: Math.random(),
        type: ['woodcutter', 'stonemason', 'miner', 'lapidary'][i % 4] as WorkerEntity['type'],
      });
    }
    workersRef.current = list;
  }, [workerCount]);

  const addFloatingText = (text: string, x: number, y: number, color: string) => {
    floatingTextsRef.current.push({
      id: Date.now() + Math.random(),
      text,
      x,
      y,
      color,
      alpha: 1,
    });
  };

  // Convert isometric grid to 2D screen coordinates
  const gridToScreen = useCallback((gx: number, gy: number, originX: number, originY: number) => {
    const sx = originX + (gx - gy) * (TILE_WIDTH / 2);
    const sy = originY + (gx + gy) * (TILE_HEIGHT / 2);
    return { sx, sy };
  }, []);

  // Convert screen coordinates to isometric grid
  const screenToGrid = useCallback((sx: number, sy: number, originX: number, originY: number) => {
    const dx = sx - originX;
    const dy = sy - originY;
    const gx = Math.floor((dy / (TILE_HEIGHT / 2) + dx / (TILE_WIDTH / 2)) / 2);
    const gy = Math.floor((dy / (TILE_HEIGHT / 2) - dx / (TILE_WIDTH / 2)) / 2);
    return { gx, gy };
  }, []);

  // Render loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      // Update canvas resolution
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Camera origin
      const originX = width / 2 + camera.x;
      const originY = height / 3 + camera.y;

      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-originX, -originY);

      // In-game day/night cycle calculation (3 minutos reais = 24 horas no jogo)
      const cycleProgress = ((time / 1000) % DAY_CYCLE_SECONDS) / DAY_CYCLE_SECONDS;
      const currentHourFloat = cycleProgress * 24;
      const currentHour = Math.floor(currentHourFloat);
      const currentMinute = Math.floor((currentHourFloat - currentHour) * 60);

      // Curva suave de dia/noite: 1.0 à meia-noite (00:00), 0.0 ao meio-dia (12:00)
      const nightFactor = (Math.cos((currentHourFloat / 24) * Math.PI * 2) + 1) / 2;
      // Opacidade varia suavemente entre 0.22 (dia) e 0.85 (noite/entardecer)
      const currentWeatherOpacity = 0.22 + 0.63 * nightFactor;

      // Atualizar relógio uma vez por segundo
      if (time - lastTimeInfoUpdate.current > 1000) {
        lastTimeInfoUpdate.current = time;
        let period = 'Noite';
        if (currentHour >= 5 && currentHour < 8) period = 'Alvorada';
        else if (currentHour >= 8 && currentHour < 17) period = 'Dia';
        else if (currentHour >= 17 && currentHour < 21) period = 'Entardecer';
        setTimeInfo({ hour: currentHour, minute: currentMinute, period });
      }

      // Tipo de precipitação ativa
      const activeWeatherType: 'snow' | 'rain' =
        weatherMode === 'auto'
          ? currentHour < 7 || currentHour >= 21
            ? 'snow'
            : 'rain'
          : weatherMode;

      // 1. Draw atmospheric ground backdrop tinted by time of day
      const groundGrad = ctx.createRadialGradient(originX, originY + 120, 40, originX, originY + 120, 520);
      if (currentHour >= 5 && currentHour < 8) {
        // Alvorada: tons suaves de âmbar e rosa matinal
        groundGrad.addColorStop(0, '#241a1a');
        groundGrad.addColorStop(0.7, '#181216');
        groundGrad.addColorStop(1, '#0e0b0e');
      } else if (currentHour >= 8 && currentHour < 17) {
        // Dia: ardósia e terra serena
        groundGrad.addColorStop(0, '#22211d');
        groundGrad.addColorStop(0.7, '#171613');
        groundGrad.addColorStop(1, '#0f0e0c');
      } else if (currentHour >= 17 && currentHour < 21) {
        // Entardecer: calor dourado de pôr do sol
        groundGrad.addColorStop(0, '#2d1b13');
        groundGrad.addColorStop(0.7, '#1c110c');
        groundGrad.addColorStop(1, '#100906');
      } else {
        // Noite: escuro profundo místico com luz de estrelas
        groundGrad.addColorStop(0, '#18141b');
        groundGrad.addColorStop(0.7, '#110e15');
        groundGrad.addColorStop(1, '#0a080d');
      }
      ctx.fillStyle = groundGrad;
      ctx.fillRect(-width * 2, -height * 2, width * 5, height * 5);

      // Partículas climáticas de fundo (camada de profundidade antes das estruturas)
      weatherParticlesRef.current.slice(0, 80).forEach((wp) => {
        if (activeWeatherType === 'snow') {
          wp.y += wp.vy * 0.7 * dt;
          wp.x += Math.sin(time * 0.0014 * wp.swaySpeed + wp.swayOffset) * 12 * dt;
          if (wp.y > originY + 800) wp.y = originY - 500;
          if (wp.x < originX - 900) wp.x = originX + 900;
          if (wp.x > originX + 900) wp.x = originX - 900;

          ctx.save();
          const flakeAlpha = wp.alpha * currentWeatherOpacity * 0.45;
          ctx.globalAlpha = Math.max(Math.min(flakeAlpha, 1), 0);
          ctx.fillStyle = '#e0f2fe';
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, wp.size * 1.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          wp.y += (wp.vy * 4 + 140) * dt;
          wp.x += -40 * dt;
          if (wp.y > originY + 800) wp.y = originY - 500;
          if (wp.x < originX - 900) wp.x = originX + 900;

          ctx.save();
          const dropAlpha = wp.alpha * currentWeatherOpacity * 0.35;
          ctx.globalAlpha = Math.max(Math.min(dropAlpha, 1), 0);
          ctx.strokeStyle = '#93c5fd';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(wp.x, wp.y);
          ctx.lineTo(wp.x - 3, wp.y + 10);
          ctx.stroke();
          ctx.restore();
        }
      });

      // 2. Draw Isometric Grid Tiles
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const { sx, sy } = gridToScreen(x, y, originX, originY);

          // Tile base polygon
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + TILE_WIDTH / 2, sy + TILE_HEIGHT / 2);
          ctx.lineTo(sx, sy + TILE_HEIGHT);
          ctx.lineTo(sx - TILE_WIDTH / 2, sy + TILE_HEIGHT / 2);
          ctx.closePath();

          const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
          const isCenter = x === 4 && y === 4;

          // Tile fill color based on position
          if (isHovered && buildingToPlace) {
            const isOccupied = placedBuildings.some((b) => b.gridX === x && b.gridY === y) || isCenter;
            ctx.fillStyle = isOccupied ? 'rgba(239, 68, 68, 0.35)' : 'rgba(34, 197, 94, 0.35)';
          } else if (isCenter) {
            ctx.fillStyle = '#2a241e';
          } else if ((x + y) % 2 === 0) {
            ctx.fillStyle = '#221d18';
          } else {
            ctx.fillStyle = '#1c1713';
          }
          ctx.fill();

          // Tile borders
          ctx.strokeStyle = isHovered ? 'rgba(217, 119, 6, 0.6)' : 'rgba(70, 55, 45, 0.25)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Subtle grass/stone decorative textures on specific tiles
          if ((x * 7 + y * 13) % 5 === 0 && !isCenter) {
            ctx.fillStyle = 'rgba(74, 95, 60, 0.2)';
            ctx.fillRect(sx - 3, sy + TILE_HEIGHT / 2 - 2, 6, 4);
          }
        }
      }

      // 3. Draw Resource Harvest Nodes
      resourceNodes.forEach((node) => {
        const { sx, sy } = gridToScreen(node.x, node.y, originX, originY);
        const cy = sy + TILE_HEIGHT / 2;

        if (node.type === 'wood') {
          // Lush oak tree with swaying leaves
          const sway = Math.sin(time * 0.002 + node.x) * 2;
          ctx.fillStyle = '#452a1a';
          ctx.fillRect(sx - 3, cy - 22, 6, 22);

          // Foliage
          ctx.beginPath();
          ctx.arc(sx + sway, cy - 28, 14, 0, Math.PI * 2);
          ctx.fillStyle = '#2d4a22';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx - 5 + sway, cy - 24, 10, 0, Math.PI * 2);
          ctx.fillStyle = '#3c642d';
          ctx.fill();
        } else if (node.type === 'stone') {
          // Granite boulder with cracks
          ctx.beginPath();
          ctx.moveTo(sx - 12, cy - 4);
          ctx.lineTo(sx - 4, cy - 18);
          ctx.lineTo(sx + 10, cy - 16);
          ctx.lineTo(sx + 14, cy - 2);
          ctx.lineTo(sx, cy + 4);
          ctx.closePath();
          ctx.fillStyle = '#4b5563';
          ctx.fill();
          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (node.type === 'iron') {
          // Iron outcrop with metallic sheen
          ctx.beginPath();
          ctx.moveTo(sx - 10, cy);
          ctx.lineTo(sx - 2, cy - 16);
          ctx.lineTo(sx + 10, cy - 12);
          ctx.lineTo(sx + 6, cy + 2);
          ctx.closePath();
          ctx.fillStyle = '#6b4629';
          ctx.fill();
          // Rust & metallic flecks
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(sx - 2, cy - 10, 4, 4);
        } else if (node.type === 'crystal') {
          // Luminous blue crystal cluster with pulsating glow
          const glow = Math.sin(time * 0.003) * 0.3 + 0.7;
          ctx.save();
          ctx.shadowColor = '#0ea5e9';
          ctx.shadowBlur = 12 * glow;

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(sx, cy - 22);
          ctx.lineTo(sx + 7, cy - 8);
          ctx.lineTo(sx + 3, cy);
          ctx.lineTo(sx - 3, cy);
          ctx.lineTo(sx - 7, cy - 8);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#7dd3fc';
          ctx.fillRect(sx - 8, cy - 12, 5, 12);
          ctx.restore();
        }
      });

      // 4. Draw Workers Moving Around
      workersRef.current.forEach((worker) => {
        worker.progress += dt * 0.15;
        if (worker.progress >= 1) {
          worker.progress = 0;
          worker.x = worker.targetX;
          worker.y = worker.targetY;
          worker.targetX = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
          worker.targetY = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
        }

        const currentGx = worker.x + (worker.targetX - worker.x) * worker.progress;
        const currentGy = worker.y + (worker.targetY - worker.y) * worker.progress;
        const { sx, sy } = gridToScreen(currentGx, currentGy, originX, originY);
        const bob = Math.sin(worker.progress * Math.PI * 8) * 2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + TILE_HEIGHT / 2, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Worker body (tiny cozy adventurer/villager)
        ctx.fillStyle =
          worker.type === 'woodcutter'
            ? '#15803d'
            : worker.type === 'stonemason'
              ? '#6b7280'
              : worker.type === 'miner'
                ? '#b45309'
                : '#0284c7';
        ctx.fillRect(sx - 2.5, sy + TILE_HEIGHT / 2 - 10 + bob, 5, 7);

        // Head
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(sx, sy + TILE_HEIGHT / 2 - 13 + bob, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw Placed Buildings (Sorted by Y+X for proper isometric depth)
      const sortedBuildings = [...placedBuildings].sort((a, b) => a.gridX + a.gridY - (b.gridX + b.gridY));

      sortedBuildings.forEach((b) => {
        const { sx, sy } = gridToScreen(b.gridX, b.gridY, originX, originY);
        const cy = sy + TILE_HEIGHT / 2;

        if (b.type === 'ancestral_well') {
          // Ancestral Well: Monumental circular stone well with blue celestial pulse
          const wellGlow = Math.sin(time * 0.0025) * 0.4 + 0.6;

          // Base stone rim
          ctx.save();
          ctx.fillStyle = '#3e342b';
          ctx.beginPath();
          ctx.ellipse(sx, cy, 26, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#574839';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Well hole (deep pit)
          ctx.fillStyle = '#08080a';
          ctx.beginPath();
          ctx.ellipse(sx, cy - 2, 20, 10, 0, 0, Math.PI * 2);
          ctx.fill();

          // Mystical glow from the depths (Grandfather's blue light)
          const pitGrad = ctx.createRadialGradient(sx, cy - 2, 2, sx, cy - 2, 18);
          pitGrad.addColorStop(0, `rgba(56, 189, 248, ${0.8 * wellGlow})`);
          pitGrad.addColorStop(0.5, `rgba(14, 165, 233, ${0.4 * wellGlow})`);
          pitGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = pitGrad;
          ctx.beginPath();
          ctx.ellipse(sx, cy - 2, 19, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Wooden beam structure & pulley
          ctx.fillStyle = '#6b4324';
          ctx.fillRect(sx - 18, cy - 28, 4, 28);
          ctx.fillRect(sx + 14, cy - 28, 4, 28);
          ctx.fillRect(sx - 18, cy - 28, 36, 4);

          // Roof over well
          ctx.beginPath();
          ctx.moveTo(sx - 22, cy - 28);
          ctx.lineTo(sx, cy - 38);
          ctx.lineTo(sx + 22, cy - 28);
          ctx.closePath();
          ctx.fillStyle = '#854d0e';
          ctx.fill();

          // Lantern hanging over the well
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(sx, cy - 20, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (b.type === 'sawmill') {
          // Sawmill: Timber walls, roof, sawblade, log stacks
          ctx.fillStyle = '#5c3a21';
          ctx.fillRect(sx - 18, cy - 20, 36, 20);

          // Roof
          ctx.beginPath();
          ctx.moveTo(sx - 22, cy - 20);
          ctx.lineTo(sx, cy - 32);
          ctx.lineTo(sx + 22, cy - 20);
          ctx.closePath();
          ctx.fillStyle = '#9a3412';
          ctx.fill();

          // Wood piles
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sx + 10, cy - 8, 8, 8);

          // Lantern light
          ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
          ctx.beginPath();
          ctx.arc(sx - 8, cy - 8, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.type === 'quarry') {
          // Quarry: Masonry blocks, chisel rack, stone crane
          ctx.fillStyle = '#475569';
          ctx.fillRect(sx - 16, cy - 18, 32, 18);

          ctx.beginPath();
          ctx.moveTo(sx - 18, cy - 18);
          ctx.lineTo(sx, cy - 28);
          ctx.lineTo(sx + 18, cy - 18);
          ctx.closePath();
          ctx.fillStyle = '#334155';
          ctx.fill();

          // Cut blocks
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(sx - 12, cy - 6, 8, 6);
          ctx.fillRect(sx - 2, cy - 6, 8, 6);
        } else if (b.type === 'forge') {
          // Forge: Stone hearth, active smoking chimney, glowing furnace
          ctx.fillStyle = '#374151';
          ctx.fillRect(sx - 16, cy - 22, 32, 22);

          // Roof
          ctx.beginPath();
          ctx.moveTo(sx - 20, cy - 22);
          ctx.lineTo(sx, cy - 34);
          ctx.lineTo(sx + 20, cy - 22);
          ctx.closePath();
          ctx.fillStyle = '#1f2937';
          ctx.fill();

          // Chimney with smoke
          ctx.fillStyle = '#4b5563';
          ctx.fillRect(sx + 6, cy - 40, 6, 16);

          // Spurt particles from chimney
          if (Math.random() < 0.25) {
            particlesRef.current.push({
              x: sx + 9,
              y: cy - 42,
              vx: (Math.random() - 0.5) * 6,
              vy: -15 - Math.random() * 10,
              radius: 2 + Math.random() * 2,
              color: 'rgba(200, 200, 200, 0.4)',
              alpha: 0.6,
              life: 0,
              maxLife: 1.5,
            });
          }

          // Glowing furnace door
          const fireGlow = Math.sin(time * 0.008) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(249, 115, 22, ${fireGlow})`;
          ctx.fillRect(sx - 6, cy - 12, 12, 10);
        } else if (b.type === 'warehouse') {
          // Warehouse: Large barn, wooden door, crates
          ctx.fillStyle = '#653e20';
          ctx.fillRect(sx - 20, cy - 24, 40, 24);

          // Red barn roof
          ctx.beginPath();
          ctx.moveTo(sx - 24, cy - 24);
          ctx.lineTo(sx, cy - 38);
          ctx.lineTo(sx + 24, cy - 24);
          ctx.closePath();
          ctx.fillStyle = '#7c2d12';
          ctx.fill();

          // Door
          ctx.fillStyle = '#291b10';
          ctx.fillRect(sx - 6, cy - 14, 12, 14);
        } else if (b.type === 'arcane_workshop') {
          // Arcane Workshop: Mystical tower with glowing blue crystal spire
          ctx.fillStyle = '#2e1065';
          ctx.fillRect(sx - 14, cy - 26, 28, 26);

          // Conical spire
          ctx.beginPath();
          ctx.moveTo(sx - 16, cy - 26);
          ctx.lineTo(sx, cy - 46);
          ctx.lineTo(sx + 16, cy - 26);
          ctx.closePath();
          ctx.fillStyle = '#4c1d95';
          ctx.fill();

          // Floating crystal above spire
          const orbGlow = Math.sin(time * 0.004) * 3;
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(sx, cy - 50 + orbGlow, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.type === 'workers_hut') {
          // Worker's Hut: Cozy stone and timber cottage with lantern
          ctx.fillStyle = '#523723';
          ctx.fillRect(sx - 14, cy - 18, 28, 18);

          ctx.beginPath();
          ctx.moveTo(sx - 16, cy - 18);
          ctx.lineTo(sx, cy - 28);
          ctx.lineTo(sx + 16, cy - 18);
          ctx.closePath();
          ctx.fillStyle = '#78350f';
          ctx.fill();

          // Cozy glowing window
          ctx.fillStyle = '#fde047';
          ctx.fillRect(sx - 4, cy - 12, 8, 6);
        } else if (b.type === 'tavern') {
          // Tavern: Cozy two-winged inn, hanging ale sign, warm lanterns, chimney smoke
          ctx.fillStyle = '#452b1b';
          ctx.fillRect(sx - 20, cy - 22, 40, 22);

          // Gabled timber roof
          ctx.beginPath();
          ctx.moveTo(sx - 24, cy - 22);
          ctx.lineTo(sx - 2, cy - 36);
          ctx.lineTo(sx + 24, cy - 22);
          ctx.closePath();
          ctx.fillStyle = '#854d0e';
          ctx.fill();

          // Chimney & smoke
          ctx.fillStyle = '#57534e';
          ctx.fillRect(sx - 16, cy - 42, 5, 14);
          if (Math.random() < 0.2) {
            particlesRef.current.push({
              x: sx - 13,
              y: cy - 44,
              vx: (Math.random() - 0.5) * 5,
              vy: -12 - Math.random() * 8,
              radius: 1.5 + Math.random() * 2,
              color: 'rgba(230, 220, 200, 0.45)',
              alpha: 0.5,
              life: 0,
              maxLife: 1.4,
            });
          }

          // Tavern front door & warm lit windows
          ctx.fillStyle = '#291b10';
          ctx.fillRect(sx - 5, cy - 12, 10, 12);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(sx - 16, cy - 12, 6, 6);
          ctx.fillRect(sx + 10, cy - 12, 6, 6);

          // Hanging tavern sign (mug)
          ctx.fillStyle = '#b45309';
          ctx.fillRect(sx + 15, cy - 20, 7, 5);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(sx + 17, cy - 19, 3, 3);

          // Warm lantern glow
          const tavernGlow = Math.sin(time * 0.005) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(251, 191, 36, ${0.4 * tavernGlow})`;
          ctx.beginPath();
          ctx.arc(sx, cy - 6, 12, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.type === 'alchemy_lab') {
          // Alchemy Lab: Stone base, teal dome, glass alembic pipe, magical bubbling particles
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(sx - 16, cy - 22, 32, 22);

          // Domed roof
          ctx.beginPath();
          ctx.arc(sx, cy - 22, 14, Math.PI, 0);
          ctx.fillStyle = '#0f766e';
          ctx.fill();
          ctx.strokeStyle = '#14b8a6';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Spire with bubbling alembic
          ctx.fillStyle = '#065f46';
          ctx.fillRect(sx - 2, cy - 36, 4, 14);

          const flaskGlow = Math.sin(time * 0.006) * 0.3 + 0.7;
          ctx.fillStyle = `rgba(52, 211, 153, ${flaskGlow})`;
          ctx.beginPath();
          ctx.arc(sx, cy - 38, 4, 0, Math.PI * 2);
          ctx.fill();

          // Sparkle emitter
          if (Math.random() < 0.22) {
            particlesRef.current.push({
              x: sx + (Math.random() - 0.5) * 8,
              y: cy - 40,
              vx: (Math.random() - 0.5) * 8,
              vy: -10 - Math.random() * 8,
              radius: 1.5 + Math.random() * 1.5,
              color: 'rgba(52, 211, 153, 0.7)',
              alpha: 0.8,
              life: 0,
              maxLife: 1.2,
            });
          }

          // Glowing emerald laboratory window
          ctx.fillStyle = '#10b981';
          ctx.fillRect(sx - 5, cy - 14, 10, 8);
        } else if (b.type === 'mayors_manor') {
          // Mayor's Executive Manor: Grand double-columned mansion, slate roof, golden banner
          ctx.fillStyle = '#3f3f46';
          ctx.fillRect(sx - 22, cy - 26, 44, 26);

          // Slate mansard roof
          ctx.beginPath();
          ctx.moveTo(sx - 26, cy - 26);
          ctx.lineTo(sx - 12, cy - 42);
          ctx.lineTo(sx + 12, cy - 42);
          ctx.lineTo(sx + 26, cy - 26);
          ctx.closePath();
          ctx.fillStyle = '#1e293b';
          ctx.fill();

          // Gold crest / weathercock on roof
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(sx - 1, cy - 47, 2, 6);
          ctx.beginPath();
          ctx.arc(sx, cy - 48, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Grand double door with golden trim
          ctx.fillStyle = '#78350f';
          ctx.fillRect(sx - 7, cy - 16, 14, 16);
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx - 7, cy - 16, 14, 16);

          // Stately tall windows
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(sx - 18, cy - 20, 6, 10);
          ctx.fillRect(sx + 12, cy - 20, 6, 10);
        }

        // Building Level badge
        if (b.type !== 'ancestral_well' && b.level > 1) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.beginPath();
          ctx.arc(sx + 16, cy - 24, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`+${b.level}`, sx + 16, cy - 21);
        }
      });

      // 6. Draw Foreground Weather Particles (Snow / Rain closer to the camera)
      weatherParticlesRef.current.slice(80).forEach((wp) => {
        if (activeWeatherType === 'snow') {
          wp.y += wp.vy * dt;
          wp.x += Math.sin(time * 0.0016 * wp.swaySpeed + wp.swayOffset) * (wp.vx + 16) * dt;
          if (wp.y > originY + 800) wp.y = originY - 500;
          if (wp.x < originX - 900) wp.x = originX + 900;
          if (wp.x > originX + 900) wp.x = originX - 900;

          ctx.save();
          const flakeAlpha = wp.alpha * currentWeatherOpacity;
          ctx.globalAlpha = Math.max(Math.min(flakeAlpha, 1), 0);

          // Efeito de halo suave
          const grad = ctx.createRadialGradient(wp.x, wp.y, 0, wp.x, wp.y, wp.size * 1.6);
          const distToWell = Math.hypot(wp.x - originX, wp.y - (originY + 120));
          if (distToWell < 160) {
            // Brilho azul próximo ao poço ancestral
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.6)');
            grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
          } else {
            // Floco de neve suave
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.5, 'rgba(224, 242, 254, 0.55)');
            grad.addColorStop(1, 'rgba(186, 230, 253, 0)');
          }
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, wp.size * 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          wp.y += (wp.vy * 5 + 180) * dt;
          wp.x += -52 * dt;
          if (wp.y > originY + 800) wp.y = originY - 500;
          if (wp.x < originX - 900) wp.x = originX + 900;

          ctx.save();
          const dropAlpha = wp.alpha * currentWeatherOpacity * 0.72;
          ctx.globalAlpha = Math.max(Math.min(dropAlpha, 1), 0);
          ctx.strokeStyle = '#93c5fd';
          ctx.lineWidth = Math.max(wp.size * 0.45, 0.9);
          ctx.beginPath();
          ctx.moveTo(wp.x, wp.y);
          ctx.lineTo(wp.x - 4, wp.y + 12 + wp.size * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      // 7. Draw Ambient Particles (Embers & Fireflies)
      particlesRef.current.forEach((p, idx) => {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(idx, 1);
        }
      });

      // Spawn periodic gentle ambient fireflies
      if (Math.random() < 0.08) {
        particlesRef.current.push({
          x: originX + (Math.random() - 0.5) * 400,
          y: originY + (Math.random() - 0.5) * 200,
          vx: (Math.random() - 0.5) * 12,
          vy: -4 - Math.random() * 8,
          radius: 1.5,
          color: '#fef08a',
          alpha: 0.8,
          life: 0,
          maxLife: 3,
        });
      }

      // 7. Draw Floating Numbers
      floatingTextsRef.current.forEach((ft, i) => {
        ft.y -= dt * 25;
        ft.alpha -= dt * 0.9;
        ctx.save();
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(ft.alpha, 0);
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();

        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [camera, gridToScreen, screenToGrid, hoveredTile, buildingToPlace, placedBuildings, resourceNodes]);

  // Mouse & Touch handling
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 5 && e.buttons === 1) {
      isDraggingRef.current = true;
      setCamera((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }

    // Calculate hovered tile
    const rect = canvas.getBoundingClientRect();
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const originX = width / 2 + camera.x;
    const originY = height / 3 + camera.y;

    const mouseX = (e.clientX - rect.left - originX) / camera.zoom + originX;
    const mouseY = (e.clientY - rect.top - originY) / camera.zoom + originY;

    const { gx, gy } = screenToGrid(mouseX, mouseY, originX, originY);
    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      setHoveredTile({ x: gx, y: gy });
    } else {
      setHoveredTile(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const originX = width / 2 + camera.x;
    const originY = height / 3 + camera.y;

    const mouseX = (e.clientX - rect.left - originX) / camera.zoom + originX;
    const mouseY = (e.clientY - rect.top - originY) / camera.zoom + originY;

    const { gx, gy } = screenToGrid(mouseX, mouseY, originX, originY);

    if (buildingToPlace && onPlaceBuilding) {
      if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
        onPlaceBuilding(gx, gy);
      }
      return;
    }

    // Check if clicked on a harvest node
    const clickedNode = resourceNodes.find((n) => n.x === gx && n.y === gy);
    if (clickedNode && onHarvestNode) {
      const { sx, sy } = gridToScreen(gx, gy, originX, originY);
      onHarvestNode(clickedNode.type, sx, sy);
      if (clickedNode.type === 'wood') {
        audio.playChop();
        addFloatingText('+3 Madeira', sx, sy, '#86efac');
      } else if (clickedNode.type === 'stone') {
        audio.playMine();
        addFloatingText('+2 Pedra', sx, sy, '#cbd5e1');
      } else if (clickedNode.type === 'iron') {
        audio.playMine();
        addFloatingText('+1 Ferro', sx, sy, '#fb923c');
      } else if (clickedNode.type === 'crystal') {
        audio.playCrystal();
        addFloatingText('+1 Cristal', sx, sy, '#38bdf8');
      }
      return;
    }

    // Check if clicked on a building
    const clickedBuilding = placedBuildings.find((b) => b.gridX === gx && b.gridY === gy);
    if (clickedBuilding && onSelectBuilding) {
      audio.playClick();
      onSelectBuilding(clickedBuilding);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setCamera((prev) => ({
      ...prev,
      zoom: Math.min(Math.max(prev.zoom + delta, 0.7), 1.8),
    }));
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#12100e]">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Building Placement Overlay Banner */}
      {buildingToPlace && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#221c17]/95 border border-amber-600/40 text-amber-200 px-5 py-2.5 rounded-lg shadow-xl backdrop-blur-sm flex items-center gap-4 text-sm z-30">
          <span>Escolha um lote vazio na grade para posicionar a construção.</span>
          <button
            onClick={onCancelPlacement}
            className="px-3 py-1 bg-amber-900/40 hover:bg-amber-900/70 border border-amber-700/50 text-amber-100 rounded text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Quick Controls Bottom Right */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-[#1c1713]/85 p-1.5 rounded-lg border border-amber-950/50 backdrop-blur-sm z-20">
        <button
          onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 0.15, 1.8) }))}
          className="w-8 h-8 flex items-center justify-center text-amber-200 hover:text-white hover:bg-amber-900/30 rounded text-sm transition-colors cursor-pointer"
          title="Aumentar Zoom"
        >
          +
        </button>
        <button
          onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.max(prev.zoom - 0.15, 0.7) }))}
          className="w-8 h-8 flex items-center justify-center text-amber-200 hover:text-white hover:bg-amber-900/30 rounded text-sm transition-colors cursor-pointer"
          title="Diminuir Zoom"
        >
          -
        </button>
        <button
          onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
          className="px-2.5 h-8 flex items-center justify-center text-xs text-amber-300 hover:bg-amber-900/30 rounded transition-colors cursor-pointer"
          title="Centralizar Câmera"
        >
          Centralizar
        </button>
      </div>

      {/* Weather & Time Indicator (Bottom Left) */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2.5 bg-[#1c1713]/90 px-3 py-1.5 rounded-lg border border-amber-950/60 backdrop-blur-sm z-20 text-xs shadow-lg">
        <span className="text-amber-300 font-mono tabular-nums font-semibold">
          {String(timeInfo.hour).padStart(2, '0')}:{String(timeInfo.minute).padStart(2, '0')}
        </span>
        <span className="text-stone-500" aria-hidden="true">·</span>
        <span className="text-stone-300 font-medium">{timeInfo.period}</span>
        <span className="text-stone-500" aria-hidden="true">·</span>
        <button
          onClick={() => {
            audio.playClick();
            setWeatherMode((prev) => (prev === 'auto' ? 'snow' : prev === 'snow' ? 'rain' : 'auto'));
          }}
          className="text-amber-400 hover:text-amber-200 transition-colors cursor-pointer flex items-center gap-1.5 font-medium hover:underline"
          title="Alternar Clima (Automático, Neve ou Chuva)"
        >
          <span>{weatherMode === 'snow' ? '❄️ Neve Suave' : weatherMode === 'rain' ? '🌧️ Chuva Serena' : '⛅ Clima Cíclico'}</span>
        </button>
      </div>
    </div>
  );
};
