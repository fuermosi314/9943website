'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from '@/components/BackButton';

// ===== 类型 =====
type Phase = 'idle' | 'charging' | 'firing' | 'beam' | 'impact' | 'explosion' | 'aftermath';

interface Star {
  x: number; y: number; r: number; speed: number; twinkle: number; phase: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number;
  r: number; color: string; decay?: number;
}

interface Debris {
  x: number; y: number; vx: number; vy: number; size: number; rotation: number;
  rotSpeed: number; color: string; life: number; maxLife: number;
}

// ===== 绘制函数 =====

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], t: number) {
  for (const s of stars) {
    const alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * s.speed + s.phase));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }
}

function drawEarth(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, cracked: boolean, crackProgress: number) {
  ctx.save();

  // 大气层光晕
  const atmoGrad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.3);
  atmoGrad.addColorStop(0, 'rgba(100,180,255,0.15)');
  atmoGrad.addColorStop(0.5, 'rgba(100,180,255,0.05)');
  atmoGrad.addColorStop(1, 'rgba(100,180,255,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
  ctx.fillStyle = atmoGrad;
  ctx.fill();

  // 球体基底
  const baseGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  baseGrad.addColorStop(0, '#4a9eff');
  baseGrad.addColorStop(0.3, '#2d7dd2');
  baseGrad.addColorStop(0.7, '#1a5fa8');
  baseGrad.addColorStop(1, '#0d3a6e');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = baseGrad;
  ctx.fill();

  // 大陆板块（简化椭圆）
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const offset = (t * 0.02) % (r * 2);
  const continents = [
    { x: -0.2, y: -0.3, w: 0.4, h: 0.25 },
    { x: 0.15, y: 0.1, w: 0.35, h: 0.3 },
    { x: -0.1, y: 0.35, w: 0.3, h: 0.2 },
    { x: 0.3, y: -0.25, w: 0.25, h: 0.2 },
  ];
  ctx.fillStyle = 'rgba(34,120,50,0.6)';
  for (const c of continents) {
    const px = cx + (c.x * r) + offset - r;
    const py = cy + c.y * r;
    ctx.beginPath();
    ctx.ellipse(px, py, c.w * r, c.h * r, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // 绘制 wrap-around 部分
    ctx.beginPath();
    ctx.ellipse(px + r * 2, py, c.w * r, c.h * r, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 裂纹效果
  if (cracked && crackProgress > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = `rgba(255,100,0,${Math.min(crackProgress, 0.8)})`;
    ctx.lineWidth = 2 + crackProgress * 3;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 10 + crackProgress * 20;

    const crackCount = Math.floor(crackProgress * 8);
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.3;
      const len = r * 0.3 + r * 0.6 * crackProgress;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r * 0.1, cy + Math.sin(angle) * r * 0.1);
      let px = cx, py = cy;
      const steps = 5 + Math.floor(crackProgress * 5);
      for (let j = 0; j < steps; j++) {
        const seg = (j + 1) / steps;
        const jitter = (Math.sin(i * 17 + j * 7) * 0.3) * r * 0.1;
        px = cx + Math.cos(angle + jitter * 0.01) * len * seg;
        py = cy + Math.sin(angle + jitter * 0.01) * len * seg;
        ctx.lineTo(px + jitter, py + jitter);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // 高光
  const highlightGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 0, cx - r * 0.35, cy - r * 0.35, r * 0.6);
  highlightGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
  highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = highlightGrad;
  ctx.fill();

  ctx.restore();
}

function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, phase: Phase) {
  ctx.save();
  ctx.translate(x, y);

  // 呼吸微动
  const breathe = Math.sin(t * 2) * 2;
  const recoil = phase === 'firing' ? -8 : phase === 'beam' ? -4 : 0;
  ctx.translate(recoil, breathe);

  // 身体
  ctx.fillStyle = '#c8956a';
  ctx.beginPath();
  ctx.ellipse(0, 20, 28, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // 头
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.arc(0, -15, 22, 0, Math.PI * 2);
  ctx.fill();

  // 太空头盔
  ctx.strokeStyle = 'rgba(150,200,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -15, 25, -Math.PI * 0.8, Math.PI * 0.8);
  ctx.stroke();

  // 头盔反光
  ctx.fillStyle = 'rgba(200,230,255,0.15)';
  ctx.beginPath();
  ctx.arc(-5, -22, 10, 0, Math.PI * 2);
  ctx.fill();

  // 耳朵
  ctx.fillStyle = '#b08050';
  ctx.beginPath();
  ctx.ellipse(-16, -28, 8, 14, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(16, -28, 8, 14, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 耳朵内侧
  ctx.fillStyle = '#e8b8a0';
  ctx.beginPath();
  ctx.ellipse(-16, -27, 5, 9, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(16, -27, 5, 9, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛
  const blink = Math.sin(t * 0.5) > 0.97 ? 0.1 : 1;
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(-8, -16, 3.5, 3.5 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, -16, 3.5, 3.5 * blink, 0, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛高光
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-6.5, -17.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9.5, -17.5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // 鼻子
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.ellipse(0, -10, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // 嘴巴
  ctx.strokeStyle = '#6a4a30';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, -7);
  ctx.quadraticCurveTo(0, -4, 4, -7);
  ctx.stroke();

  // 舌头（开心）
  if (phase === 'idle') {
    ctx.fillStyle = '#e88080';
    ctx.beginPath();
    ctx.ellipse(0, -5, 3, 4, 0, 0, Math.PI);
    ctx.fill();
  }

  // 前爪（抱着炮）
  ctx.fillStyle = '#c8956a';
  ctx.beginPath();
  ctx.ellipse(22, 10, 8, 6, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(22, 20, 7, 5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 尾巴
  const tailWag = Math.sin(t * 4) * 15;
  ctx.strokeStyle = '#c8956a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-25, 25);
  ctx.quadraticCurveTo(-40, 10 + tailWag, -35, -5 + tailWag);
  ctx.stroke();

  ctx.restore();
}

function drawCannon(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, phase: Phase, chargeProgress: number) {
  ctx.save();
  ctx.translate(x, y);

  const recoil = phase === 'firing' ? -12 : phase === 'beam' ? -6 : 0;
  ctx.translate(recoil, 0);

  // 炮身主体
  const bodyGrad = ctx.createLinearGradient(0, -15, 0, 15);
  bodyGrad.addColorStop(0, '#5a6a7a');
  bodyGrad.addColorStop(0.5, '#3a4a5a');
  bodyGrad.addColorStop(1, '#2a3a4a');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-10, -18, 80, 36, 6);
  ctx.fill();

  // 炮身金属高光
  ctx.fillStyle = 'rgba(200,220,240,0.15)';
  ctx.beginPath();
  ctx.roundRect(-5, -16, 70, 12, 4);
  ctx.fill();

  // 能量线圈
  const coilCount = 5;
  for (let i = 0; i < coilCount; i++) {
    const cx = 10 + i * 12;
    const glow = chargeProgress > 0 ? chargeProgress * (1 - i * 0.12) : 0;
    const coilColor = glow > 0
      ? `rgba(50,${150 + glow * 105},255,${0.6 + glow * 0.4})`
      : 'rgba(80,100,120,0.5)';

    ctx.strokeStyle = coilColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, 0, 14, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();

    // 线圈辉光
    if (glow > 0.1) {
      ctx.shadowColor = '#3af';
      ctx.shadowBlur = 8 + glow * 15;
      ctx.beginPath();
      ctx.arc(cx, 0, 14, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // 炮口
  const muzzleGlow = chargeProgress;
  ctx.fillStyle = '#2a3a4a';
  ctx.beginPath();
  ctx.roundRect(68, -22, 16, 44, [0, 4, 4, 0]);
  ctx.fill();

  // 炮口内壁
  const muzzleGrad = ctx.createRadialGradient(76, 0, 2, 76, 0, 18);
  muzzleGrad.addColorStop(0, `rgba(50,150,255,${muzzleGlow})`);
  muzzleGrad.addColorStop(0.5, `rgba(30,100,200,${muzzleGlow * 0.5})`);
  muzzleGrad.addColorStop(1, '#1a2a3a');
  ctx.fillStyle = muzzleGrad;
  ctx.beginPath();
  ctx.arc(76, 0, 18, 0, Math.PI * 2);
  ctx.fill();

  // 炮口辉光
  if (muzzleGlow > 0.1) {
    ctx.shadowColor = '#4af';
    ctx.shadowBlur = 20 + muzzleGlow * 30;
    ctx.beginPath();
    ctx.arc(76, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80,180,255,${muzzleGlow * 0.3})`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 支架
  ctx.fillStyle = '#3a4a5a';
  ctx.beginPath();
  ctx.moveTo(-5, 18);
  ctx.lineTo(60, 18);
  ctx.lineTo(55, 35);
  ctx.lineTo(0, 35);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawBeam(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, progress: number, t: number) {
  const currentX = startX + (endX - startX) * progress;
  const currentY = startY + (endY - startY) * progress;

  ctx.save();

  // 主光束
  const beamGrad = ctx.createLinearGradient(startX, startY, currentX, currentY);
  beamGrad.addColorStop(0, 'rgba(100,200,255,0.9)');
  beamGrad.addColorStop(0.5, 'rgba(50,150,255,0.8)');
  beamGrad.addColorStop(1, 'rgba(200,230,255,1)');

  ctx.strokeStyle = beamGrad;
  ctx.lineWidth = 8 + Math.sin(t * 20) * 2;
  ctx.shadowColor = '#4af';
  ctx.shadowBlur = 25;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();

  // 外层光晕
  ctx.strokeStyle = 'rgba(100,180,255,0.3)';
  ctx.lineWidth = 20 + Math.sin(t * 15) * 5;
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();

  // 内核白光
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();

  ctx.restore();
}

function drawExplosion(ctx: CanvasRenderingContext2D, cx: number, cy: number, progress: number, t: number) {
  ctx.save();

  // 中心闪光
  if (progress < 0.3) {
    const flashAlpha = (1 - progress / 0.3) * 0.8;
    const flashR = 50 + progress * 300;
    const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
    flashGrad.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
    flashGrad.addColorStop(0.3, `rgba(255,200,100,${flashAlpha * 0.6})`);
    flashGrad.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 冲击波环
  if (progress > 0.05 && progress < 0.6) {
    const ringProgress = (progress - 0.05) / 0.55;
    const ringR = ringProgress * 250;
    const ringAlpha = (1 - ringProgress) * 0.5;
    ctx.strokeStyle = `rgba(100,200,255,${ringAlpha})`;
    ctx.lineWidth = 3 + (1 - ringProgress) * 5;
    ctx.shadowColor = '#4af';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 第二环
  if (progress > 0.1 && progress < 0.7) {
    const ringProgress = (progress - 0.1) / 0.6;
    const ringR = ringProgress * 200;
    const ringAlpha = (1 - ringProgress) * 0.3;
    ctx.strokeStyle = `rgba(255,150,50,${ringAlpha})`;
    ctx.lineWidth = 2 + (1 - ringProgress) * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ===== 主组件 =====
export default function EarthCannonPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef({
    phase: 'idle' as Phase,
    phaseTime: 0,
    stars: [] as Star[],
    particles: [] as Particle[],
    debris: [] as Debris[],
    startTime: 0,
    screenShake: 0,
    earthScale: 1,
  });
  const [phase, setPhase] = useState<Phase>('idle');
  const [showButton, setShowButton] = useState(true);

  // 初始化星星
  const initStars = useCallback((w: number, h: number) => {
    const stars: Star[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.5 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return stars;
  }, []);

  // 添加粒子
  const addParticles = useCallback((arr: Particle[], count: number, x: number, y: number, color: string, speed: number, life: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed;
      arr.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life, maxLife: life,
        r: Math.random() * 3 + 1,
        color,
      });
    }
  }, []);

  // 添加碎片
  const addDebris = useCallback((arr: Debris[], count: number, cx: number, cy: number) => {
    const colors = ['#4a9eff', '#2d7dd2', '#227832', '#1a5fa8', '#d4a574', '#ff6600'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 4 + 1;
      arr.push({
        x: cx + (Math.random() - 0.5) * 30,
        y: cy + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * 12 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        maxLife: 1,
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    state.stars = initStars(window.innerWidth, window.innerHeight);

    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener('resize', resize);

    // 地球位置（右侧偏上）
    const getEarth = () => ({ x: w * 0.72, y: h * 0.38, r: Math.min(w, h) * 0.15 });
    // 炮口位置（左侧汪星人处）
    const getCannonMuzzle = () => ({ x: w * 0.22 + 76, y: h * 0.58 });

    state.startTime = performance.now();

    const render = (now: number) => {
      const t = (now - state.startTime) / 1000;
      const dt = 1 / 60;

      ctx.clearRect(0, 0, w, h);

      // 深空背景
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.7);
      bgGrad.addColorStop(0, '#0a0a2a');
      bgGrad.addColorStop(0.5, '#050515');
      bgGrad.addColorStop(1, '#000005');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 星星
      drawStars(ctx, state.stars, t);

      // 屏幕震动
      if (state.screenShake > 0) {
        ctx.save();
        const shakeX = (Math.random() - 0.5) * state.screenShake * 10;
        const shakeY = (Math.random() - 0.5) * state.screenShake * 10;
        ctx.translate(shakeX, shakeY);
        state.screenShake *= 0.92;
        if (state.screenShake < 0.01) state.screenShake = 0;
      }

      const earth = getEarth();
      const muzzle = getCannonMuzzle();
      const chargeProgress = state.phase === 'charging'
        ? Math.min((now - state.phaseTime) / 1500, 1)
        : state.phase === 'firing' || state.phase === 'beam' ? 1 : 0;

      // 蓄能粒子
      if (state.phase === 'charging') {
        const cp = Math.min((now - state.phaseTime) / 1500, 1);
        if (Math.random() < cp * 0.4) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 80 + Math.random() * 60;
          state.particles.push({
            x: muzzle.x + Math.cos(angle) * dist,
            y: muzzle.y + Math.sin(angle) * dist,
            vx: (muzzle.x - muzzle.x - Math.cos(angle) * dist) * 0.05,
            vy: (muzzle.y - muzzle.y - Math.sin(angle) * dist) * 0.05,
            life: 0.5, maxLife: 0.5,
            r: 2, color: '#4af',
          });
        }
      }

      // 更新粒子
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;
        if (p.life <= 0) state.particles.splice(i, 1);
      }

      // 更新碎片
      for (let i = state.debris.length - 1; i >= 0; i--) {
        const d = state.debris[i];
        d.x += d.vx;
        d.y += d.vy;
        d.vy += 0.02; // 微重力
        d.rotation += d.rotSpeed;
        d.life -= dt * 0.3;
        if (d.life <= 0) state.debris.splice(i, 1);
      }

      // ===== 绘制场景 =====
      // 地球（爆炸前）
      if (state.phase !== 'explosion' && state.phase !== 'aftermath') {
        const cracked = state.phase === 'impact';
        const crackP = state.phase === 'impact'
          ? Math.min((now - state.phaseTime) / 500, 1)
          : 0;
        drawEarth(ctx, earth.x, earth.y, earth.r, t, cracked, crackP);
      }

      // 爆炸效果
      if (state.phase === 'explosion') {
        const ep = Math.min((now - state.phaseTime) / 2000, 1);
        drawExplosion(ctx, earth.x, earth.y, ep, t);
        // 碎片绘制
        for (const d of state.debris) {
          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(d.rotation);
          ctx.globalAlpha = d.life;
          ctx.fillStyle = d.color;
          ctx.shadowColor = d.color;
          ctx.shadowBlur = 5;
          ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
          ctx.restore();
        }
      }

      // 余波
      if (state.phase === 'aftermath') {
        const ap = Math.min((now - state.phaseTime) / 3000, 1);
        // 残留碎片
        for (const d of state.debris) {
          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(d.rotation);
          ctx.globalAlpha = d.life * (1 - ap);
          ctx.fillStyle = d.color;
          ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
          ctx.restore();
        }
        // 暗淡余光
        if (ap < 0.5) {
          const fadeAlpha = (1 - ap * 2) * 0.3;
          const remnantGrad = ctx.createRadialGradient(earth.x, earth.y, 0, earth.x, earth.y, 100);
          remnantGrad.addColorStop(0, `rgba(255,150,50,${fadeAlpha})`);
          remnantGrad.addColorStop(1, 'rgba(255,100,0,0)');
          ctx.fillStyle = remnantGrad;
          ctx.beginPath();
          ctx.arc(earth.x, earth.y, 100, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 汪星人 + 电磁炮
      if (state.phase !== 'aftermath') {
        drawDog(ctx, w * 0.22, h * 0.58, t, state.phase);
        drawCannon(ctx, w * 0.22 + 15, h * 0.58, t, state.phase, chargeProgress);
      }

      // 光束
      if (state.phase === 'beam') {
        const bp = Math.min((now - state.phaseTime) / 800, 1);
        drawBeam(ctx, muzzle.x, muzzle.y, earth.x, earth.y, bp, t);
      }

      // 绘制粒子
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of state.particles) {
        const alpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
        if (!p.color.startsWith('rgba')) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
        }
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      if (state.phase !== 'explosion' && state.phase !== 'aftermath' && state.screenShake > 0) {
        ctx.restore();
      }

      // ===== 状态转换 =====
      if (state.phase === 'charging' && now - state.phaseTime > 1500) {
        state.phase = 'firing';
        state.phaseTime = now;
        state.screenShake = 1;
        addParticles(state.particles, 30, muzzle.x, muzzle.y, '#4af', 3, 0.8);
        setPhase('firing');
      } else if (state.phase === 'firing' && now - state.phaseTime > 300) {
        state.phase = 'beam';
        state.phaseTime = now;
        setPhase('beam');
      } else if (state.phase === 'beam' && now - state.phaseTime > 800) {
        state.phase = 'impact';
        state.phaseTime = now;
        state.screenShake = 1.5;
        setPhase('impact');
      } else if (state.phase === 'impact' && now - state.phaseTime > 500) {
        state.phase = 'explosion';
        state.phaseTime = now;
        state.screenShake = 2;
        addDebris(state.debris, 40, earth.x, earth.y);
        addParticles(state.particles, 80, earth.x, earth.y, '#f80', 5, 1.5);
        addParticles(state.particles, 40, earth.x, earth.y, '#ff0', 4, 1);
        setPhase('explosion');
      } else if (state.phase === 'explosion' && now - state.phaseTime > 2000) {
        state.phase = 'aftermath';
        state.phaseTime = now;
        setShowButton(true);
        setPhase('aftermath');
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [initStars, addParticles, addDebris]);

  const handleFire = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== 'idle' && state.phase !== 'aftermath') return;

    if (state.phase === 'aftermath') {
      // 重置
      state.phase = 'idle';
      state.phaseTime = 0;
      state.particles = [];
      state.debris = [];
      state.screenShake = 0;
      state.earthScale = 1;
      state.stars = initStars(window.innerWidth, window.innerHeight);
      state.startTime = performance.now();
    }

    state.phase = 'charging';
    state.phaseTime = performance.now();
    setShowButton(false);
    setPhase('charging');
  }, [initStars]);

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="earth-cannon" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">毁灭地球的电磁炮</h1>
          </div>
        </div>
      </header>

      <main className="relative w-full h-screen overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* UI 覆盖层 */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 pointer-events-none">
          {showButton && (
            <div className="text-center pointer-events-auto animate-fade-in">
              <button
                onClick={handleFire}
                className="px-12 py-4 text-xl font-bold text-white rounded-2xl bg-gradient-to-r from-[#fb6400] to-[#ff8c00] hover:scale-105 hover:shadow-[0_0_40px_rgba(251,100,0,0.5)] active:scale-95 transition-all duration-300 shadow-lg shadow-orange-500/30 mb-4"
              >
                {phase === 'aftermath' ? '再来一次' : '🔥 发射'}
              </button>
              <p className="text-white/40 text-sm">
                {phase === 'aftermath' ? '地球已被毁灭' : '点击发射电磁炮，毁灭地球'}
              </p>
            </div>
          )}

          {!showButton && phase !== 'idle' && (
            <div className="text-center animate-fade-in">
              <p className="text-white/50 text-sm">
                {phase === 'charging' && '⚡ 蓄能中...'}
                {phase === 'firing' && '💥 发射！'}
                {phase === 'beam' && '🔵 光束飞行中...'}
                {phase === 'impact' && '💫 命中！'}
                {phase === 'explosion' && '☄️ 地球爆炸中...'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
