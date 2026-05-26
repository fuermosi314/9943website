'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from '@/components/BackButton';

// ===== 轻量级 Simplex Noise =====
class SimplexNoise {
  private perm: Uint8Array;
  constructor(seed = 42) {
    const p = new Uint8Array(512);
    const base = new Uint8Array(256);
    for (let i = 0; i < 256; i++) base[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      [base[i], base[j]] = [base[j], base[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    this.perm = p;
  }
  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = x - X0, y0 = y - Y0;
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    const grad = (hash: number, gx: number, gy: number) => {
      const h = hash & 7;
      const u = h < 4 ? gx : gy;
      const v = h < 4 ? gy : gx;
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    };
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * grad(this.perm[ii + this.perm[jj]], x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * grad(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * grad(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2); }
    return 70 * (n0 + n1 + n2);
  }
  fbm(x: number, y: number, octaves = 6): number {
    let val = 0, amp = 1, freq = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      val += this.noise2D(x * freq, y * freq) * amp;
      max += amp;
      freq *= 2.0;
      amp *= 0.5;
    }
    return val / max;
  }
}

// ===== 类型 =====
type Phase = 'idle' | 'charging' | 'firing' | 'beam' | 'impact' | 'explosion' | 'aftermath';

interface Star { x: number; y: number; r: number; brightness: number; twinkleSpeed: number; twinklePhase: number; layer: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; color: string; }
interface Debris { x: number; y: number; vx: number; vy: number; size: number; rotation: number; rotSpeed: number; color: string; life: number; trail: { x: number; y: number }[]; }
interface Meteor { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; len: number; }
interface Smoke { x: number; y: number; vx: number; vy: number; r: number; life: number; maxLife: number; }
interface Ember { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; }

// ===== 缓存 =====
let earthCache: HTMLCanvasElement | null = null;
let earthCacheSize = 0;
let nebulaCache: HTMLCanvasElement | null = null;
let nebulaCacheSize = 0;

// ===== 地球纹理（NASA Blue Marble 配色）=====
function renderEarthTexture(r: number, t: number): HTMLCanvasElement {
  const size = Math.ceil(r * 2.4);
  if (earthCache && earthCacheSize === size) return earthCache;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2, cy = size / 2;
  const noise = new SimplexNoise(12345);

  // 海洋基底 — NASA Blue Marble 深海色
  const oceanGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  oceanGrad.addColorStop(0, '#1a5fa8');   // 浅海
  oceanGrad.addColorStop(0.3, '#0d3a6e'); // 中等深度
  oceanGrad.addColorStop(0.7, '#0a1e4a'); // 深海
  oceanGrad.addColorStop(1, '#060e28');   // 极深海
  ctx.fillStyle = oceanGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 大陆 — 用 noise 生成
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  const offset = (t * 0.012) % (r * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = px - cx, dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r) continue;

      const nx = (dx + offset) / r;
      const ny = dy / r;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

      // 多层 noise 生成大陆
      const continent = noise.fbm(nx * 2.2, ny * 2.2, 5);
      const detail = noise.fbm(nx * 6, ny * 6, 3) * 0.3;
      const mountain = noise.fbm(nx * 12, ny * 12, 2) * 0.15;
      const val = continent + detail + mountain;
      const lat = Math.abs(ny); // 纬度（用于冰盖和颜色分区）

      const idx = (py * size + px) * 4;

      // NASA Blue Marble 颜色分层
      if (val > 0.18) {
        // 陆地
        if (lat > 0.7) {
          // 极地冰盖 — 白色
          data[idx] = 230; data[idx + 1] = 238; data[idx + 2] = 242;
        } else if (lat > 0.5) {
          // 高纬度苔原 — 灰绿
          const g = val > 0.35 ? '#6b8a6b' : '#5a7a5a';
          data[idx] = parseInt(g.slice(1, 3), 16);
          data[idx + 1] = parseInt(g.slice(3, 5), 16);
          data[idx + 2] = parseInt(g.slice(5, 7), 16);
        } else if (val > 0.38) {
          // 沙漠/戈壁 — 黄褐色
          const d = val > 0.5 ? '#c4a862' : '#b89850';
          data[idx] = parseInt(d.slice(1, 3), 16);
          data[idx + 1] = parseInt(d.slice(3, 5), 16);
          data[idx + 2] = parseInt(d.slice(5, 7), 16);
        } else if (val > 0.3) {
          // 温带森林 — 中绿
          data[idx] = 61; data[idx + 1] = 122; data[idx + 2] = 58;
        } else {
          // 热带森林 — 深绿
          data[idx] = 29; data[idx + 1] = 74; data[idx + 2] = 29;
        }
      } else if (val > 0.08) {
        // 浅海/大陆架 — 亮蓝
        data[idx] = 30; data[idx + 1] = 90; data[idx + 2] = 138;
      }
      // 深海保持原渐变

      // 光照 — 左上方光源
      const lightDir = { x: -0.4, y: -0.35, z: 0.85 };
      const light = Math.max(0, nx * lightDir.x + ny * lightDir.y + nz * lightDir.z);
      const shade = 0.25 + light * 0.75;
      data[idx] = Math.floor(data[idx] * shade);
      data[idx + 1] = Math.floor(data[idx + 1] * shade);
      data[idx + 2] = Math.floor(data[idx + 2] * shade);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  ctx.restore();

  // 云层
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.22;
  ctx.globalCompositeOperation = 'screen';
  for (let py = 0; py < size; py += 2) {
    for (let px = 0; px < size; px += 2) {
      const ddx = px - cx, ddy = py - cy;
      if (Math.sqrt(ddx * ddx + ddy * ddy) > r) continue;
      const cloud = noise.fbm((ddx + offset) / r * 4 + 100, ddy / r * 4 + 100, 4);
      if (cloud > 0.18) {
        const a = (cloud - 0.18) * 1.0;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(px, py, 2, 2);
      }
    }
  }
  ctx.restore();

  earthCache = c;
  earthCacheSize = size;
  return c;
}

// ===== 星云缓存 =====
function renderNebula(w: number, h: number): HTMLCanvasElement {
  if (nebulaCache && nebulaCacheSize === w) return nebulaCache;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const noise = new SimplexNoise(99);
  const nebulae = [
    { x: w * 0.2, y: h * 0.3, color: [120, 60, 200], scale: 0.002 },
    { x: w * 0.7, y: h * 0.6, color: [40, 100, 200], scale: 0.003 },
    { x: w * 0.5, y: h * 0.15, color: [180, 80, 60], scale: 0.0015 },
  ];
  for (const neb of nebulae) {
    for (let px = 0; px < w; px += 4) {
      for (let py = 0; py < h; py += 4) {
        const dx = px - neb.x, dy = py - neb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.min(w, h) * 0.4;
        if (dist > maxDist) continue;
        const falloff = 1 - dist / maxDist;
        const n = noise.fbm(px * neb.scale, py * neb.scale, 4);
        if (n > 0.1) {
          const alpha = (n - 0.1) * falloff * 0.15;
          ctx.fillStyle = `rgba(${neb.color[0]},${neb.color[1]},${neb.color[2]},${alpha})`;
          ctx.fillRect(px, py, 4, 4);
        }
      }
    }
  }
  nebulaCache = c;
  nebulaCacheSize = w;
  return c;
}

// ===== 绘制：星空 =====
function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], t: number) {
  for (const s of stars) {
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * s.twinkleSpeed + s.twinklePhase));
    const alpha = s.brightness * twinkle;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
    if (s.layer === 2 && s.r > 1.2) {
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.35})`;
      ctx.lineWidth = 0.5;
      const len = s.r * 4;
      ctx.beginPath();
      ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x + len, s.y);
      ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y + len);
      ctx.stroke();
    }
  }
}

// ===== 绘制：地球 =====
function drawEarth(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, cracked: boolean, crackProgress: number) {
  ctx.save();

  // 大气层
  const atmoGrad = ctx.createRadialGradient(cx, cy, r * 0.88, cx, cy, r * 1.18);
  atmoGrad.addColorStop(0, 'rgba(80,150,255,0)');
  atmoGrad.addColorStop(0.5, 'rgba(80,150,255,0.1)');
  atmoGrad.addColorStop(0.8, 'rgba(100,180,255,0.06)');
  atmoGrad.addColorStop(1, 'rgba(100,180,255,0)');
  ctx.fillStyle = atmoGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2);
  ctx.fill();

  // 纹理
  const tex = renderEarthTexture(r, t);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(tex, cx - tex.width / 2, cy - tex.height / 2);
  ctx.restore();

  // 裂纹
  if (cracked && crackProgress > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 15 + crackProgress * 30;
    ctx.strokeStyle = `rgba(255,100,10,${Math.min(crackProgress * 1.5, 0.95)})`;
    ctx.lineWidth = 2 + crackProgress * 5;
    const crackCount = Math.floor(crackProgress * 15);
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / 15) * Math.PI * 2 + 0.5;
      const len = r * (0.15 + 0.8 * crackProgress);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r * 0.03, cy + Math.sin(angle) * r * 0.03);
      let px2 = cx, py2 = cy;
      const steps = 5 + Math.floor(crackProgress * 8);
      for (let j = 1; j <= steps; j++) {
        const seg = j / steps;
        const jitter = Math.sin(i * 17 + j * 13) * r * 0.06;
        px2 = cx + Math.cos(angle) * len * seg + jitter * Math.cos(angle + 1.5);
        py2 = cy + Math.sin(angle) * len * seg + jitter * Math.sin(angle + 1.5);
        ctx.lineTo(px2, py2);
      }
      ctx.stroke();
      // 裂纹内部发光
      if (crackProgress > 0.3) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,200,50,${(crackProgress - 0.3) * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r * 0.03, cy + Math.sin(angle) * r * 0.03);
        let px3 = cx, py3 = cy;
        for (let j = 1; j <= steps; j++) {
          const seg = j / steps;
          const jitter = Math.sin(i * 17 + j * 13) * r * 0.06;
          px3 = cx + Math.cos(angle) * len * seg + jitter * Math.cos(angle + 1.5);
          py3 = cy + Math.sin(angle) * len * seg + jitter * Math.sin(angle + 1.5);
          ctx.lineTo(px3, py3);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // 高光
  const hlGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 0, cx - r * 0.35, cy - r * 0.35, r * 0.5);
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
  hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();

  ctx.restore();
}

// ===== 绘制：汪星人（kawaii 风格）=====
function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, phase: Phase, chargeP: number) {
  ctx.save();
  ctx.translate(x, y);

  const breathe = Math.sin(t * 1.8) * 1.5;
  const recoil = phase === 'firing' ? -8 : phase === 'beam' ? -4 : 0;
  const shake = phase === 'charging' ? Math.sin(t * 20) * chargeP * 1.5 : 0;
  ctx.translate(recoil + shake, breathe);

  // === 身体（圆润太空服）===
  const bodyGrad = ctx.createLinearGradient(-22, 5, 22, 42);
  bodyGrad.addColorStop(0, '#f0f0f5');
  bodyGrad.addColorStop(0.3, '#e0e0e8');
  bodyGrad.addColorStop(0.7, '#d0d0da');
  bodyGrad.addColorStop(1, '#b8b8c5');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 20, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 太空服胸口面板
  ctx.fillStyle = '#3a3a4a';
  ctx.beginPath();
  ctx.roundRect(-10, 12, 20, 12, 3);
  ctx.fill();
  // 指示灯
  const blinkLight = Math.sin(t * 3) > 0 ? '#4f4' : '#222';
  ctx.fillStyle = blinkLight;
  ctx.beginPath(); ctx.arc(-4, 18, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f44';
  ctx.beginPath(); ctx.arc(4, 18, 2, 0, Math.PI * 2); ctx.fill();

  // === 头部（大头 kawaii 比例）===
  ctx.fillStyle = '#d4a060';
  ctx.beginPath();
  ctx.arc(0, -8, 26, 0, Math.PI * 2);
  ctx.fill();

  // 毛发纹理
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -8, 26, 0, Math.PI * 2);
  ctx.clip();
  const furColors = ['#daa870', '#c89050', '#b88040', '#e0b080', '#cc9858'];
  for (let i = 0; i < 80; i++) {
    const angle = (i / 80) * Math.PI * 2 + Math.sin(i * 5) * 0.2;
    const r2 = 6 + Math.abs(Math.sin(i * 3.3)) * 18;
    const fx = Math.cos(angle) * r2;
    const fy = -8 + Math.sin(angle) * r2;
    const len = 2 + Math.abs(Math.sin(i * 4.7)) * 3;
    ctx.strokeStyle = furColors[i % furColors.length];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(angle + 0.4) * len, fy + Math.sin(angle + 0.4) * len);
    ctx.stroke();
  }
  ctx.restore();

  // === 耳朵（圆润下垂）===
  ctx.fillStyle = '#b08040';
  ctx.beginPath();
  ctx.ellipse(-18, -22, 8, 13, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b8a0';
  ctx.beginPath();
  ctx.ellipse(-18, -21, 4.5, 8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b08040';
  ctx.beginPath();
  ctx.ellipse(18, -22, 8, 13, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b8a0';
  ctx.beginPath();
  ctx.ellipse(18, -21, 4.5, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // === 眼睛（大眼 kawaii）===
  const eyeScale = phase === 'charging' ? 1 + chargeP * 0.12 : 1;
  const blink = Math.sin(t * 0.35) > 0.96 ? 0.1 : 1;

  for (const side of [-1, 1]) {
    const ex = side * 9;
    const ey = -10;
    // 眼白
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 7 * eyeScale, 8 * eyeScale * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    // 瞳孔（大）
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(ex + side * 0.3, ey + 0.5, 5 * eyeScale, 0, Math.PI * 2);
    ctx.fill();
    // 虹膜
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.arc(ex + side * 0.3, ey + 0.5, 4 * eyeScale, 0, Math.PI * 2);
    ctx.fill();
    // 高光（大 + 小）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex + side * 2, ey - 2.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex - side * 1, ey + 2, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // 眉毛
  ctx.strokeStyle = '#6a4a20';
  ctx.lineWidth = 1.8;
  for (const side of [-1, 1]) {
    const browY = phase === 'charging' ? -19 - chargeP * 2 : -18;
    ctx.beginPath();
    ctx.moveTo(side * 4, browY);
    ctx.quadraticCurveTo(side * 9, browY - 1.5, side * 13, browY + (phase === 'charging' ? -1.5 : 1));
    ctx.stroke();
  }

  // 腮红（kawaii 标志）
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ff8888';
  ctx.beginPath();
  ctx.ellipse(-14, -3, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(14, -3, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 鼻子
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.ellipse(0, -3, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-0.8, -4, 1.8, 1, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 嘴巴
  if (phase === 'firing') {
    ctx.fillStyle = '#4a2020';
    ctx.beginPath();
    ctx.ellipse(0, 2, 4.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e88080';
    ctx.beginPath();
    ctx.ellipse(0, 3, 2.5, 2, 0, 0, Math.PI);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#6a4a20';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3.5, -0.5);
    ctx.quadraticCurveTo(0, 2, 3.5, -0.5);
    ctx.stroke();
    // 舌头
    if (phase === 'idle') {
      ctx.fillStyle = '#e88080';
      ctx.beginPath();
      ctx.ellipse(0, 1.5, 2.5, 3.5, 0, 0, Math.PI);
      ctx.fill();
    }
  }

  // === 头盔（玻璃质感）===
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -10, 30, 30, 0, -Math.PI * 0.85, Math.PI * 0.85);
  ctx.strokeStyle = 'rgba(150,200,255,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(180,220,255,0.05)';
  ctx.fill();
  // 高光弧
  ctx.beginPath();
  ctx.ellipse(-8, -28, 18, 14, -0.3, -Math.PI * 0.55, Math.PI * 0.3);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(-10, -30, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // === 尾巴 ===
  const tailWag = Math.sin(t * 4) * 15;
  ctx.strokeStyle = '#d4a060';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-20, 25);
  ctx.quadraticCurveTo(-32, 12 + tailWag, -28, -2 + tailWag);
  ctx.stroke();
  ctx.strokeStyle = '#b08040';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-30, 6 + tailWag);
  ctx.quadraticCurveTo(-35, -1 + tailWag, -30, -6 + tailWag);
  ctx.stroke();

  // === 前爪 ===
  ctx.fillStyle = '#d4a060';
  ctx.beginPath();
  ctx.ellipse(18, 10, 7, 5.5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(18, 18, 6, 5, 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ===== 绘制：电磁炮（小而精致）=====
function drawCannon(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, phase: Phase, chargeP: number) {
  ctx.save();
  ctx.translate(x, y);

  const recoil = phase === 'firing' ? -12 : phase === 'beam' ? -5 : 0;
  ctx.translate(recoil, 0);

  // === 支架 ===
  ctx.fillStyle = '#2a2a3a';
  ctx.beginPath();
  ctx.moveTo(-6, 16);
  ctx.lineTo(48, 16);
  ctx.lineTo(42, 30);
  ctx.lineTo(-2, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(200,200,220,0.08)';
  ctx.beginPath();
  ctx.moveTo(-4, 18);
  ctx.lineTo(44, 18);
  ctx.lineTo(40, 24);
  ctx.fill();

  // === 炮身（紧凑型）===
  const bodyGrad = ctx.createLinearGradient(0, -14, 0, 14);
  bodyGrad.addColorStop(0, '#7a8a9a');
  bodyGrad.addColorStop(0.3, '#a0aab5');
  bodyGrad.addColorStop(0.5, '#c0c8d0');
  bodyGrad.addColorStop(0.7, '#8a9aaa');
  bodyGrad.addColorStop(1, '#3a4a5a');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-8, -14, 62, 28, 4);
  ctx.fill();

  // 炮身刻线
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 5; i++) {
    const lx = -2 + i * 10;
    ctx.beginPath(); ctx.moveTo(lx, -12); ctx.lineTo(lx, 12); ctx.stroke();
  }

  // === 导轨（上下）===
  const railGrad = ctx.createLinearGradient(0, -16, 0, -11);
  railGrad.addColorStop(0, '#5a6a7a');
  railGrad.addColorStop(0.5, '#9aaabe');
  railGrad.addColorStop(1, '#4a5a6a');
  ctx.fillStyle = railGrad;
  ctx.beginPath(); ctx.roundRect(-5, -17, 58, 4, 1.5); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-5, 13, 58, 4, 1.5); ctx.fill();

  // === 能量线圈（5个，更紧凑）===
  const coilCount = 5;
  for (let i = 0; i < coilCount; i++) {
    const cxp = 6 + i * 9;
    const glow = chargeP * (1 - i * 0.1);
    const pulse = Math.sin(t * 8 + i * 1.2) * 0.3 + 0.7;

    ctx.strokeStyle = glow > 0.1
      ? `rgba(40,${140 + glow * 115},255,${0.5 + glow * 0.5 * pulse})`
      : 'rgba(70,80,90,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cxp, 0, 11, -Math.PI * 0.55, Math.PI * 0.55);
    ctx.stroke();

    if (glow > 0.1) {
      ctx.save();
      ctx.shadowColor = `rgba(60,180,255,${glow * pulse})`;
      ctx.shadowBlur = 8 + glow * 15;
      ctx.strokeStyle = `rgba(80,200,255,${glow * 0.5 * pulse})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cxp, 0, 11, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();
      ctx.restore();
    }
  }

  // === 电弧效果 ===
  if (chargeP > 0.2) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < coilCount - 1; i++) {
      if (Math.random() > chargeP * 0.5) continue;
      const x1 = 6 + i * 9;
      const x2 = 6 + (i + 1) * 9;
      drawArc(ctx, x1, 0, x2, 0, 6, 4, chargeP);
    }
    ctx.restore();
  }

  // === 散热片 ===
  for (let i = 0; i < 2; i++) {
    const fx = -4 + i * 6;
    ctx.fillStyle = '#4a5a6a';
    ctx.beginPath();
    ctx.moveTo(fx, -16); ctx.lineTo(fx + 3, -21); ctx.lineTo(fx + 6, -21); ctx.lineTo(fx + 3, -16);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fx, 16); ctx.lineTo(fx + 3, 21); ctx.lineTo(fx + 6, 21); ctx.lineTo(fx + 3, 16);
    ctx.closePath(); ctx.fill();
  }

  // === 炮口 ===
  const muzzleGrad = ctx.createLinearGradient(52, -18, 52, 18);
  muzzleGrad.addColorStop(0, '#4a5a6a');
  muzzleGrad.addColorStop(0.3, '#7a8a9a');
  muzzleGrad.addColorStop(0.7, '#5a6a7a');
  muzzleGrad.addColorStop(1, '#3a4a5a');
  ctx.fillStyle = muzzleGrad;
  ctx.beginPath();
  ctx.roundRect(52, -19, 14, 38, [0, 4, 4, 0]);
  ctx.fill();

  // 炮口内壁
  const innerGrad = ctx.createRadialGradient(59, 0, 2, 59, 0, 15);
  innerGrad.addColorStop(0, `rgba(40,150,255,${chargeP * 0.8})`);
  innerGrad.addColorStop(0.4, `rgba(20,80,180,${chargeP * 0.4})`);
  innerGrad.addColorStop(1, '#1a2030');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(59, 0, 15, 0, Math.PI * 2);
  ctx.fill();

  // 能量漩涡（蓄能时）
  if (chargeP > 0.1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const angle = t * 3 + i * Math.PI * 2 / 5;
      const vr = 6 + chargeP * 4;
      const vx = 59 + Math.cos(angle) * vr;
      const vy = Math.sin(angle) * vr * 0.5;
      const grad = ctx.createRadialGradient(vx, vy, 0, vx, vy, 3 + chargeP * 2);
      grad.addColorStop(0, `rgba(100,200,255,${chargeP * 0.35})`);
      grad.addColorStop(1, 'rgba(50,150,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(vx, vy, 3 + chargeP * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 炮口辉光
  if (chargeP > 0.05) {
    ctx.save();
    ctx.shadowColor = '#4af';
    ctx.shadowBlur = 18 + chargeP * 28;
    ctx.beginPath();
    ctx.arc(59, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(60,160,255,${chargeP * 0.18})`;
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// 电弧
function drawArc(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, displace: number, depth: number, intensity: number) {
  if (depth <= 0 || displace < 0.5) return;
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * displace;
  const my = (y1 + y2) / 2 + (Math.random() - 0.5) * displace * 0.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.lineTo(x2, y2);
  ctx.strokeStyle = `rgba(160,200,255,${depth * 0.07 * intensity})`;
  ctx.lineWidth = depth * 0.45;
  ctx.stroke();
  drawArc(ctx, x1, y1, mx, my, displace / 2, depth - 1, intensity);
  drawArc(ctx, mx, my, x2, y2, displace / 2, depth - 1, intensity);
}

// ===== 绘制：光束 =====
function drawBeam(ctx: CanvasRenderingContext2D, sx: number, sy: number, ex: number, ey: number, progress: number, t: number) {
  const cx = sx + (ex - sx) * progress;
  const cy = sy + (ey - sy) * progress;
  ctx.save();
  ctx.lineCap = 'round';

  // 外层光晕
  ctx.strokeStyle = `rgba(80,160,255,0.18)`;
  ctx.lineWidth = 24 + Math.sin(t * 18) * 3;
  ctx.shadowColor = '#4af';
  ctx.shadowBlur = 35;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, cy); ctx.stroke();

  // 中层
  const beamGrad = ctx.createLinearGradient(sx, sy, cx, cy);
  beamGrad.addColorStop(0, 'rgba(100,200,255,0.75)');
  beamGrad.addColorStop(1, 'rgba(200,230,255,0.85)');
  ctx.strokeStyle = beamGrad;
  ctx.lineWidth = 8 + Math.sin(t * 22) * 1.5;
  ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, cy); ctx.stroke();

  // 内核
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, cy); ctx.stroke();

  ctx.restore();
}

// ===== 绘制：爆炸（多阶段震撼效果）=====
function drawExplosion(ctx: CanvasRenderingContext2D, cx: number, cy: number, progress: number, t: number, r: number) {
  ctx.save();

  // 0-0.15: 中心巨大闪光
  if (progress < 0.2) {
    const flashP = 1 - progress / 0.2;
    const flashR = r * 0.5 + progress * r * 5;
    // 白色核心
    const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
    flashGrad.addColorStop(0, `rgba(255,255,255,${flashP * 0.95})`);
    flashGrad.addColorStop(0.15, `rgba(255,240,200,${flashP * 0.8})`);
    flashGrad.addColorStop(0.35, `rgba(255,180,80,${flashP * 0.5})`);
    flashGrad.addColorStop(0.6, `rgba(255,80,20,${flashP * 0.2})`);
    flashGrad.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, flashR, 0, Math.PI * 2);
    ctx.fill();
    // 额外白屏闪光
    if (progress < 0.08) {
      ctx.fillStyle = `rgba(255,255,255,${(1 - progress / 0.08) * 0.3})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }

  // 0.1-0.6: 冲击波环（4层）
  for (let ring = 0; ring < 4; ring++) {
    const ringDelay = ring * 0.06;
    const rp = Math.max(0, Math.min(1, (progress - ringDelay) / 0.5));
    if (rp <= 0 || rp >= 1) continue;
    const ringR = rp * (r * 2.5 - ring * r * 0.4);
    const alpha = (1 - rp) * (0.55 - ring * 0.12);

    ctx.strokeStyle = ring === 0
      ? `rgba(200,220,255,${alpha})`
      : ring === 1
        ? `rgba(255,200,100,${alpha})`
        : ring === 2
          ? `rgba(255,120,40,${alpha * 0.7})`
          : `rgba(255,60,20,${alpha * 0.4})`;
    ctx.lineWidth = (3.5 - ring * 0.5) * (1 - rp);
    ctx.shadowColor = ring < 2 ? '#4af' : '#f80';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 0.05-0.5: 光柱
  if (progress > 0.05 && progress < 0.55) {
    const lp = (progress - 0.05) / 0.5;
    const lAlpha = (1 - lp) * 0.35;
    const lH = lp * 180;
    const lGrad = ctx.createLinearGradient(cx, cy, cx, cy - lH);
    lGrad.addColorStop(0, `rgba(255,200,100,${lAlpha})`);
    lGrad.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = lGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy); ctx.lineTo(cx - 2, cy - lH); ctx.lineTo(cx + 2, cy - lH); ctx.lineTo(cx + 6, cy);
    ctx.closePath(); ctx.fill();
  }

  // 0.15-0.8: 翻滚火焰团
  if (progress > 0.12 && progress < 0.85) {
    const fp = (progress - 0.12) / 0.73;
    const fireCount = 6;
    for (let i = 0; i < fireCount; i++) {
      const angle = (i / fireCount) * Math.PI * 2 + t * 0.5;
      const dist = fp * r * 1.8 * (0.5 + Math.sin(i * 2.3) * 0.3);
      const fx = cx + Math.cos(angle) * dist;
      const fy = cy + Math.sin(angle) * dist;
      const fSize = r * (0.4 + Math.sin(i * 3.7) * 0.2) * (1 - fp * 0.5);
      const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fSize);
      const fAlpha = (1 - fp) * 0.4;
      fGrad.addColorStop(0, `rgba(255,220,100,${fAlpha})`);
      fGrad.addColorStop(0.4, `rgba(255,120,30,${fAlpha * 0.6})`);
      fGrad.addColorStop(1, 'rgba(200,40,0,0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(fx, fy, fSize, 0, Math.PI * 2);
      ctx.fill();
    }
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
    meteors: [] as Meteor[],
    smoke: [] as Smoke[],
    embers: [] as Ember[],
    startTime: 0,
    screenShake: 0,
    lastFrame: 0,
  });
  const [phase, setPhase] = useState<Phase>('idle');
  const [showButton, setShowButton] = useState(true);

  const initStars = useCallback((w: number, h: number): Star[] => {
    const stars: Star[] = [];
    const layers = [
      { count: 200, maxR: 0.7, brightness: 0.45, speed: 0.3, layer: 0 },
      { count: 100, maxR: 1.1, brightness: 0.65, speed: 0.6, layer: 1 },
      { count: 25, maxR: 1.8, brightness: 1.0, speed: 1.0, layer: 2 },
    ];
    for (const l of layers) {
      for (let i = 0; i < l.count; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * l.maxR + 0.2,
          brightness: l.brightness * (0.5 + Math.random() * 0.5),
          twinkleSpeed: Math.random() * 1.5 + 0.3,
          twinklePhase: Math.random() * Math.PI * 2,
          layer: l.layer,
        });
      }
    }
    return stars;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    state.stars = initStars(window.innerWidth, window.innerHeight);
    earthCache = null;
    nebulaCache = null;

    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w; canvas.height = h;
      earthCache = null; nebulaCache = null;
      state.stars = initStars(w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    const getEarth = () => ({ x: w * 0.72, y: h * 0.38, r: Math.min(w, h) * 0.15 });
    const getMuzzle = () => ({ x: w * 0.22 + 12 + 59, y: h * 0.58 });

    state.startTime = performance.now();
    state.lastFrame = state.startTime;

    const render = (now: number) => {
      const dt = Math.min((now - state.lastFrame) / 1000, 0.05);
      state.lastFrame = now;
      const t = (now - state.startTime) / 1000;

      ctx.clearRect(0, 0, w, h);

      // 深空背景
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.7);
      bgGrad.addColorStop(0, '#0c0c2a');
      bgGrad.addColorStop(0.4, '#060618');
      bgGrad.addColorStop(1, '#010108');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 星云
      ctx.drawImage(renderNebula(w, h), 0, 0);

      // 星星
      drawStars(ctx, state.stars, t);

      // 流星
      if (Math.random() < 0.003 && state.phase === 'idle') {
        state.meteors.push({
          x: Math.random() * w, y: Math.random() * h * 0.3,
          vx: (Math.random() * 3 + 2) * (Math.random() > 0.5 ? 1 : -1),
          vy: Math.random() * 2 + 1,
          life: 1, maxLife: 1, len: Math.random() * 30 + 20,
        });
      }
      for (let i = state.meteors.length - 1; i >= 0; i--) {
        const m = state.meteors[i];
        m.x += m.vx * 2; m.y += m.vy * 2; m.life -= dt * 1.5;
        if (m.life <= 0) { state.meteors.splice(i, 1); continue; }
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,255,${m.life * 0.7})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * m.len * 0.3, m.y - m.vy * m.len * 0.3);
        ctx.stroke();
        ctx.restore();
      }

      // 屏幕震动
      if (state.screenShake > 0.01) {
        ctx.save();
        ctx.translate(
          (Math.random() - 0.5) * state.screenShake * 12,
          (Math.random() - 0.5) * state.screenShake * 12
        );
        state.screenShake *= 0.88;
      }

      const earth = getEarth();
      const muzzle = getMuzzle();
      const chargeProgress = state.phase === 'charging'
        ? Math.min((now - state.phaseTime) / 1500, 1)
        : (state.phase === 'firing' || state.phase === 'beam') ? 1 : 0;

      // 蓄能粒子
      if (state.phase === 'charging') {
        const cp = Math.min((now - state.phaseTime) / 1500, 1);
        if (Math.random() < cp * 0.5) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 40 + Math.random() * 60;
          state.particles.push({
            x: muzzle.x + Math.cos(angle) * dist,
            y: muzzle.y + Math.sin(angle) * dist,
            vx: -Math.cos(angle) * dist * 0.04,
            vy: -Math.sin(angle) * dist * 0.04,
            life: 0.4, maxLife: 0.4,
            r: 1.2 + Math.random() * 1.2,
            color: Math.random() > 0.5 ? '#4af' : '#8cf',
          });
        }
      }

      // 更新粒子
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= dt;
        if (p.life <= 0) state.particles.splice(i, 1);
      }

      // 更新碎片
      for (let i = state.debris.length - 1; i >= 0; i--) {
        const d = state.debris[i];
        d.trail.unshift({ x: d.x, y: d.y });
        if (d.trail.length > 8) d.trail.pop();
        d.x += d.vx; d.y += d.vy;
        d.vy += 0.012;
        d.rotation += d.rotSpeed;
        d.life -= dt * 0.2;
        if (d.life <= 0) state.debris.splice(i, 1);
      }

      // 更新烟雾
      for (let i = state.smoke.length - 1; i >= 0; i--) {
        const s = state.smoke[i];
        s.x += s.vx; s.y += s.vy; s.r += 0.3; s.life -= dt;
        if (s.life <= 0) state.smoke.splice(i, 1);
      }

      // 更新余烬
      for (let i = state.embers.length - 1; i >= 0; i--) {
        const e = state.embers[i];
        e.x += e.vx; e.y += e.vy; e.vy -= 0.02; e.life -= dt * 0.6;
        if (e.life <= 0) state.embers.splice(i, 1);
      }

      // === 绘制场景 ===
      // 地球
      if (state.phase !== 'explosion' && state.phase !== 'aftermath') {
        const cracked = state.phase === 'impact';
        const crackP = state.phase === 'impact' ? Math.min((now - state.phaseTime) / 500, 1) : 0;
        drawEarth(ctx, earth.x, earth.y, earth.r, t, cracked, crackP);
      }

      // 爆炸
      if (state.phase === 'explosion') {
        const ep = Math.min((now - state.phaseTime) / 3000, 1);
        drawExplosion(ctx, earth.x, earth.y, ep, t, earth.r);
        // 碎片
        for (const d of state.debris) {
          ctx.save();
          ctx.globalAlpha = d.life;
          for (let ti = d.trail.length - 1; ti >= 0; ti--) {
            const tr = d.trail[ti];
            const ta = (1 - ti / d.trail.length) * 0.3;
            ctx.fillStyle = `rgba(255,${140 + ti * 12},40,${ta})`;
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, d.size * 0.35 * (1 - ti / d.trail.length), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.translate(d.x, d.y);
          ctx.rotate(d.rotation);
          ctx.fillStyle = d.color;
          ctx.shadowColor = '#f80';
          ctx.shadowBlur = 4;
          ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
          ctx.restore();
        }
        // 烟雾
        for (const s of state.smoke) {
          ctx.save();
          ctx.globalAlpha = (s.life / s.maxLife) * 0.2;
          const sGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
          sGrad.addColorStop(0, 'rgba(80,80,80,0.3)');
          sGrad.addColorStop(1, 'rgba(40,40,40,0)');
          ctx.fillStyle = sGrad;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 余波
      if (state.phase === 'aftermath') {
        const ap = Math.min((now - state.phaseTime) / 4000, 1);
        for (const d of state.debris) {
          ctx.save();
          ctx.globalAlpha = d.life * (1 - ap);
          ctx.fillStyle = d.color;
          ctx.fillRect(d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
          ctx.restore();
        }
        for (const e of state.embers) {
          ctx.save();
          ctx.globalAlpha = (e.life / e.maxLife) * (1 - ap);
          ctx.fillStyle = '#ff8833';
          ctx.shadowColor = '#f80';
          ctx.shadowBlur = 3;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        if (ap < 0.5) {
          const remGrad = ctx.createRadialGradient(earth.x, earth.y, 0, earth.x, earth.y, 60);
          remGrad.addColorStop(0, `rgba(255,120,30,${(1 - ap * 2) * 0.2})`);
          remGrad.addColorStop(1, 'rgba(255,60,0,0)');
          ctx.fillStyle = remGrad;
          ctx.beginPath();
          ctx.arc(earth.x, earth.y, 60, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 汪星人 + 电磁炮
      if (state.phase !== 'aftermath') {
        drawDog(ctx, w * 0.22, h * 0.58, t, state.phase, chargeProgress);
        drawCannon(ctx, w * 0.22 + 12, h * 0.58, t, state.phase, chargeProgress);
      }

      // 光束
      if (state.phase === 'beam') {
        const bp = Math.min((now - state.phaseTime) / 800, 1);
        drawBeam(ctx, muzzle.x, muzzle.y, earth.x, earth.y, bp, t);
      }

      // 粒子（additive blend）
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of state.particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.restore();

      if (state.screenShake > 0.01) ctx.restore();

      // === 状态转换 ===
      if (state.phase === 'charging' && now - state.phaseTime > 1500) {
        state.phase = 'firing'; state.phaseTime = now; state.screenShake = 1.2;
        for (let i = 0; i < 30; i++) {
          const a = Math.random() * Math.PI * 2;
          state.particles.push({
            x: muzzle.x, y: muzzle.y,
            vx: Math.cos(a) * (Math.random() * 4 + 1),
            vy: Math.sin(a) * (Math.random() * 4 + 1),
            life: 0.5, maxLife: 0.5, r: 1.8, color: '#4cf',
          });
        }
        setPhase('firing');
      } else if (state.phase === 'firing' && now - state.phaseTime > 300) {
        state.phase = 'beam'; state.phaseTime = now;
        setPhase('beam');
      } else if (state.phase === 'beam' && now - state.phaseTime > 800) {
        state.phase = 'impact'; state.phaseTime = now; state.screenShake = 1.8;
        setPhase('impact');
      } else if (state.phase === 'impact' && now - state.phaseTime > 500) {
        state.phase = 'explosion'; state.phaseTime = now; state.screenShake = 2.8;
        // 碎片 — 80块
        const colors = ['#1a5fa8', '#2d7dd2', '#227832', '#c4a862', '#d4a060', '#ff6600', '#ff4400', '#e8eef2'];
        for (let i = 0; i < 80; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = Math.random() * 5 + 1.5;
          state.debris.push({
            x: earth.x + (Math.random() - 0.5) * 15,
            y: earth.y + (Math.random() - 0.5) * 15,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            size: Math.random() * 10 + 3,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.25,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1, trail: [],
          });
        }
        // 爆炸粒子 — 120
        for (let i = 0; i < 120; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = Math.random() * 6 + 1;
          state.particles.push({
            x: earth.x, y: earth.y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            life: 1.2, maxLife: 1.2,
            r: Math.random() * 3 + 1,
            color: ['#f80', '#ff0', '#f44', '#fff'][Math.floor(Math.random() * 4)],
          });
        }
        // 烟雾 — 30
        for (let i = 0; i < 30; i++) {
          const a = Math.random() * Math.PI * 2;
          state.smoke.push({
            x: earth.x + Math.cos(a) * Math.random() * 20,
            y: earth.y + Math.sin(a) * Math.random() * 20,
            vx: Math.cos(a) * (Math.random() * 1.5 + 0.3),
            vy: Math.sin(a) * (Math.random() * 1.5 + 0.3) - 0.5,
            r: Math.random() * 8 + 5,
            life: 2 + Math.random() * 2,
            maxLife: 4,
          });
        }
        // 余烬 — 40
        for (let i = 0; i < 40; i++) {
          const a = Math.random() * Math.PI * 2;
          state.embers.push({
            x: earth.x + Math.cos(a) * Math.random() * 30,
            y: earth.y + Math.sin(a) * Math.random() * 30,
            vx: Math.cos(a) * (Math.random() * 2 + 0.5),
            vy: -(Math.random() * 3 + 1),
            life: 1.5 + Math.random() * 2,
            maxLife: 3.5,
            r: Math.random() * 1.5 + 0.5,
          });
        }
        setPhase('explosion');
      } else if (state.phase === 'explosion' && now - state.phaseTime > 3000) {
        state.phase = 'aftermath'; state.phaseTime = now;
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
  }, [initStars]);

  const handleFire = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== 'idle' && state.phase !== 'aftermath') return;
    if (state.phase === 'aftermath') {
      state.phase = 'idle';
      state.particles = []; state.debris = []; state.meteors = [];
      state.smoke = []; state.embers = [];
      state.screenShake = 0;
      earthCache = null; nebulaCache = null;
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
