'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useRef, useEffect, useState, useCallback } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

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
interface Lava { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number; }

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
    ctx.shadowBlur = 10 + crackProgress * 35;
    // 提高基础可见度：低损伤时也清晰可见
    const alpha = Math.min(0.4 + crackProgress * 1.2, 0.95);
    ctx.strokeStyle = `rgba(255,100,10,${alpha})`;
    ctx.lineWidth = 2.5 + crackProgress * 5;
    const crackCount = Math.max(3, Math.floor(crackProgress * 15));
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2 + 0.5;
      const len = r * (0.2 + 0.75 * crackProgress);
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
      // 裂纹内部发光 — 更早出现
      if (crackProgress > 0.15) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,200,50,${(crackProgress - 0.15) * 0.6})`;
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
      // 岩浆渗透 — 沿裂纹渗出熔岩
      if (crackProgress > 0.5) {
        const lavaAlpha = (crackProgress - 0.5) * 2;
        const lavaW = 1.5 + crackProgress * 3;
        // 岩浆主脉
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = 6 + crackProgress * 10;
        ctx.strokeStyle = `rgba(255,80,0,${lavaAlpha * 0.7})`;
        ctx.lineWidth = lavaW;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r * 0.05, cy + Math.sin(angle) * r * 0.05);
        let lx = cx, ly = cy;
        for (let j = 1; j <= steps; j++) {
          const seg = j / steps;
          const jitter = Math.sin(i * 17 + j * 13) * r * 0.06;
          lx = cx + Math.cos(angle) * len * seg * 0.7 + jitter * Math.cos(angle + 1.5);
          ly = cy + Math.sin(angle) * len * seg * 0.7 + jitter * Math.sin(angle + 1.5);
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
        // 岩浆亮芯
        ctx.strokeStyle = `rgba(255,200,50,${lavaAlpha * 0.4})`;
        ctx.lineWidth = lavaW * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r * 0.05, cy + Math.sin(angle) * r * 0.05);
        lx = cx; ly = cy;
        for (let j = 1; j <= steps; j++) {
          const seg = j / steps;
          const jitter = Math.sin(i * 17 + j * 13) * r * 0.06;
          lx = cx + Math.cos(angle) * len * seg * 0.7 + jitter * Math.cos(angle + 1.5);
          ly = cy + Math.sin(angle) * len * seg * 0.7 + jitter * Math.sin(angle + 1.5);
          ctx.lineTo(lx, ly);
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

// ===== 绘制：汪星人（超级 kawaii 风格）=====
function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, phase: Phase, chargeP: number) {
  ctx.save();
  ctx.translate(x, y);

  const breathe = Math.sin(t * 1.8) * 1.2;
  const recoil = phase === 'firing' ? -6 : phase === 'beam' ? -3 : 0;
  const shake = phase === 'charging' ? Math.sin(t * 20) * chargeP * 1.5 : 0;
  ctx.translate(recoil + shake, breathe);

  // === 身体（小巧圆润太空服）===
  const bodyGrad = ctx.createLinearGradient(-16, 8, 16, 32);
  bodyGrad.addColorStop(0, '#f0f4f8');
  bodyGrad.addColorStop(0.4, '#e4e8ee');
  bodyGrad.addColorStop(1, '#c8cdd5');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 18, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // 白色肚皮
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(0, 20, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // 太空服胸口星星徽章
  ctx.fillStyle = '#fb6400';
  drawStar5(ctx, 0, 15, 4, 2);

  // 肩带装饰
  ctx.strokeStyle = '#7EC8E3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, 8); ctx.lineTo(-4, 14);
  ctx.moveTo(6, 8); ctx.lineTo(4, 14);
  ctx.stroke();

  // === 头部（超大头 kawaii 比例 2.5:1）===
  const headR = 24;
  const headY = -5;
  // 毛发基底
  ctx.fillStyle = '#F5C563';
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 白色脸颊/口鼻区域
  ctx.fillStyle = '#FFF5E0';
  ctx.beginPath();
  ctx.ellipse(0, headY + 4, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // 毛发纹理（更细腻）
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.clip();
  const furColors = ['#F0B850', '#E8A840', '#DFA038', '#F8C868', '#E8B048'];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const fr = 8 + Math.abs(Math.sin(i * 2.7)) * 14;
    const fx = Math.cos(angle) * fr;
    const fy = headY + Math.sin(angle) * fr;
    const len = 2 + Math.abs(Math.sin(i * 3.3)) * 2;
    ctx.strokeStyle = furColors[i % furColors.length];
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(angle + 0.3) * len, fy + Math.sin(angle + 0.3) * len);
    ctx.stroke();
  }
  ctx.restore();

  // === 耳朵（柴犬立耳，圆润）===
  for (const side of [-1, 1]) {
    // 外耳
    ctx.fillStyle = '#DFA038';
    ctx.beginPath();
    ctx.ellipse(side * 16, headY - 14, 7, 12, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // 内耳
    ctx.fillStyle = '#FFB5C2';
    ctx.beginPath();
    ctx.ellipse(side * 16, headY - 13, 4, 7, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // === 眼睛（超大 kawaii 大眼）===
  const eyeScale = phase === 'charging' ? 1 + chargeP * 0.1 : 1;
  const blink = Math.sin(t * 0.35) > 0.96 ? 0.05 : 1;

  for (const side of [-1, 1]) {
    const ex = side * 8;
    const ey = headY + 1;
    // 眼白
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 6.5 * eyeScale, 7.5 * eyeScale * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    // 瞳孔（超大）
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(ex + side * 0.2, ey + 0.3, 5 * eyeScale, 0, Math.PI * 2);
    ctx.fill();
    // 高光（大 + 小 — 10 点钟方向）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex + side * 1.5 - 1, ey - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex - side * 0.5 + 1.5, ey + 1.5, 1, 0, Math.PI * 2);
    ctx.fill();
    // 小眼睑线
    if (blink > 0.5) {
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(ex, ey, 6.5 * eyeScale, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();
    }
  }

  // 眉毛（萌态）
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    const browY = phase === 'charging' ? headY - 8 - chargeP * 2 : headY - 7;
    ctx.beginPath();
    ctx.moveTo(side * 3, browY);
    ctx.quadraticCurveTo(side * 7, browY - 2, side * 11, browY + (phase === 'charging' ? -2 : 0.5));
    ctx.stroke();
  }

  // 腮红（kawaii 标志性粉色）
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#FFB5C2';
  ctx.beginPath();
  ctx.ellipse(-13, headY + 5, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(13, headY + 5, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 鼻子（小巧倒三角）
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.moveTo(0, headY + 6);
  ctx.lineTo(-3, headY + 3);
  ctx.lineTo(3, headY + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-0.5, headY + 4, 1.2, 0.6, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 嘴巴
  if (phase === 'firing') {
    ctx.fillStyle = '#4a2020';
    ctx.beginPath();
    ctx.ellipse(0, headY + 10, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFB5C2';
    ctx.beginPath();
    ctx.ellipse(0, headY + 10.5, 2.5, 1.5, 0, 0, Math.PI);
    ctx.fill();
  } else {
    // "w" 形嘴巴（经典 kawaii）
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-3, headY + 8.5);
    ctx.quadraticCurveTo(-1.5, headY + 10.5, 0, headY + 8.5);
    ctx.quadraticCurveTo(1.5, headY + 10.5, 3, headY + 8.5);
    ctx.stroke();
    // 舌头（idle 时吐出）
    if (phase === 'idle') {
      ctx.fillStyle = '#FFB5C2';
      ctx.beginPath();
      ctx.ellipse(0, headY + 10, 2, 3, 0, 0, Math.PI);
      ctx.fill();
    }
  }

  // === 头盔（玻璃质感 — 透明圆形）===
  ctx.save();
  const helmR = headR + 5;
  ctx.beginPath();
  ctx.arc(0, headY, helmR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(150,200,255,0.35)';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(180,220,255,0.04)';
  ctx.fill();
  // 高光弧（左上角）
  ctx.beginPath();
  ctx.arc(0, headY, helmR - 1, -Math.PI * 0.75, -Math.PI * 0.15);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 高光点
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(-8, headY - 20, 2, 0, Math.PI * 2);
  ctx.fill();
  // 天线
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, headY - helmR);
  ctx.lineTo(0, headY - helmR - 8);
  ctx.stroke();
  ctx.fillStyle = '#f44';
  ctx.beginPath();
  ctx.arc(0, headY - helmR - 8, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // === 尾巴（蓬松卷尾）===
  const tailWag = Math.sin(t * 4) * 12;
  ctx.strokeStyle = '#F5C563';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.quadraticCurveTo(-26, 10 + tailWag, -22, -2 + tailWag);
  ctx.stroke();
  // 尾巴尖（白色蓬松）
  ctx.strokeStyle = '#FFF5E0';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(-22, -2 + tailWag, 4, 0, Math.PI * 2);
  ctx.stroke();

  // === 四肢（短胖可爱）===
  // 后腿
  ctx.fillStyle = '#DFA038';
  ctx.beginPath();
  ctx.ellipse(-8, 28, 5, 4, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, 28, 5, 4, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // 前爪
  ctx.fillStyle = '#F5C563';
  ctx.beginPath();
  ctx.ellipse(14, 14, 5, 4, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(14, 20, 4.5, 3.5, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // 爪垫
  ctx.fillStyle = '#FFB5C2';
  ctx.beginPath();
  ctx.ellipse(14, 14, 2, 1.5, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 辅助：五角星绘制
function drawStar5(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const aOuter = (i * 72 - 90) * Math.PI / 180;
    const aInner = ((i * 72 + 36) - 90) * Math.PI / 180;
    ctx.lineTo(cx + Math.cos(aOuter) * outerR, cy + Math.sin(aOuter) * outerR);
    ctx.lineTo(cx + Math.cos(aInner) * innerR, cy + Math.sin(aInner) * innerR);
  }
  ctx.closePath();
  ctx.fill();
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
    if (progress < 0.08) {
      ctx.fillStyle = `rgba(255,255,255,${(1 - progress / 0.08) * 0.3})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }

  // 0.08-0.7: 大气层撕裂效果
  if (progress > 0.08 && progress < 0.7) {
    const atmoP = (progress - 0.08) / 0.62;
    const atmoR = r * (1.18 + atmoP * 1.5);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // 大气层碎片环 — 撕裂的蓝色光环
    for (let i = 0; i < 8; i++) {
      const aStart = (i / 8) * Math.PI * 2 + t * 0.3;
      const aEnd = aStart + (0.3 + Math.sin(i * 2.1) * 0.2) * (1 - atmoP * 0.5);
      const tearAlpha = Math.max(0, 0.4 - atmoP * 0.5) * (0.6 + Math.sin(i * 3.7 + t * 2) * 0.4);
      if (tearAlpha > 0.02) {
        ctx.strokeStyle = `rgba(100,180,255,${tearAlpha})`;
        ctx.lineWidth = 3 + (1 - atmoP) * 4;
        ctx.shadowColor = 'rgba(80,160,255,0.5)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, atmoR, aStart, aEnd);
        ctx.stroke();
      }
    }
    // 撕裂碎片 — 小蓝色粒子向外飞散
    if (atmoP < 0.6) {
      const tearCount = Math.floor((1 - atmoP / 0.6) * 12);
      for (let i = 0; i < tearCount; i++) {
        const a = (i / tearCount) * Math.PI * 2 + t * 0.2;
        const d = atmoR * (0.9 + Math.sin(i * 4.3 + t * 3) * 0.15);
        const tx = cx + Math.cos(a) * d;
        const ty = cy + Math.sin(a) * d;
        const ta = (1 - atmoP / 0.6) * 0.5;
        ctx.fillStyle = `rgba(120,200,255,${ta})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 2 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
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

  // 0.15-0.85: 翻滚火焰团（增强版 — Solar Smash 风格）
  if (progress > 0.12 && progress < 0.85) {
    const fp = (progress - 0.12) / 0.73;
    // 外层火焰（大而暗）
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + t * 0.4 + Math.sin(i * 1.7) * 0.3;
      const dist = fp * r * (2.0 + Math.sin(i * 2.3) * 0.5);
      const fx = cx + Math.cos(angle) * dist;
      const fy = cy + Math.sin(angle) * dist;
      const fSize = r * (0.5 + Math.sin(i * 3.7) * 0.25) * (1 - fp * 0.4);
      const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fSize);
      const fAlpha = (1 - fp) * 0.35;
      fGrad.addColorStop(0, `rgba(255,200,80,${fAlpha})`);
      fGrad.addColorStop(0.3, `rgba(255,100,20,${fAlpha * 0.6})`);
      fGrad.addColorStop(0.7, `rgba(180,30,0,${fAlpha * 0.2})`);
      fGrad.addColorStop(1, 'rgba(100,20,0,0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(fx, fy, fSize, 0, Math.PI * 2);
      ctx.fill();
    }
    // 内层火焰（小而亮）
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + t * 0.8 + 0.5;
      const dist = fp * r * (0.8 + Math.sin(i * 3.1) * 0.3);
      const fx = cx + Math.cos(angle) * dist;
      const fy = cy + Math.sin(angle) * dist;
      const fSize = r * (0.2 + Math.sin(i * 2.7) * 0.1) * (1 - fp * 0.3);
      const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fSize);
      const fAlpha = (1 - fp) * 0.5;
      fGrad.addColorStop(0, `rgba(255,255,200,${fAlpha})`);
      fGrad.addColorStop(0.5, `rgba(255,180,60,${fAlpha * 0.5})`);
      fGrad.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(fx, fy, fSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 0.3-0.9: 岩浆球核心（Solar Smash 风格熔岩核心）
  if (progress > 0.25 && progress < 0.9) {
    const lavaP = (progress - 0.25) / 0.65;
    const lavaR = r * (0.6 + lavaP * 1.2);
    const lavaAlpha = Math.max(0, 0.6 - lavaP * 0.7);
    const lGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, lavaR);
    lGrad.addColorStop(0, `rgba(255,200,50,${lavaAlpha})`);
    lGrad.addColorStop(0.4, `rgba(255,100,20,${lavaAlpha * 0.6})`);
    lGrad.addColorStop(0.7, `rgba(200,40,0,${lavaAlpha * 0.3})`);
    lGrad.addColorStop(1, 'rgba(100,20,0,0)');
    ctx.fillStyle = lGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, lavaR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ===== 主组件 =====
export default function EarthCannonPage() {
  useToolHistory('earth-cannon');
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
    lava: [] as Lava[],
    shotCount: 0,
    damageLevel: 0,
    isCharging: false,
    chargeStartTime: 0,
    fullChargeShot: false,
    isQuickShot: false,
    startTime: 0,
    screenShake: 0,
    lastFrame: 0,
  });
  const [phase, setPhase] = useState<Phase>('idle');
  const [showButton, setShowButton] = useState(true);
  const [chargeLevel, setChargeLevel] = useState(0);
  const [chargeInsufficient, setChargeInsufficient] = useState(false);

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
    const getMuzzle = () => ({ x: w * 0.20 + 18 + 59, y: h * 0.56 });

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

      // 更新岩浆
      for (let i = state.lava.length - 1; i >= 0; i--) {
        const l = state.lava[i];
        l.x += l.vx; l.y += l.vy; l.vy += 0.02;
        l.life -= dt * 0.5;
        if (l.life <= 0) state.lava.splice(i, 1);
      }

      // 蓄力计时（动态蓄力时间）
      if (state.isCharging) {
        const chargeTime = 0.5 + (1 - state.damageLevel) * 2.5;
        const cl = Math.min((now - state.chargeStartTime) / (chargeTime * 1000), 1);
        setChargeLevel(cl);
        // 蓄力完成自动发射
        if (cl >= 1) {
          state.isCharging = false;
          state.fullChargeShot = true;
          state.phase = 'charging';
          state.phaseTime = now;
          setShowButton(false);
          setPhase('charging');
          setChargeLevel(0);
        }
      }

      // === 绘制场景 ===
      // 地球
      if (state.phase !== 'explosion' && state.phase !== 'aftermath') {
        const cracked = state.phase === 'impact' || state.damageLevel > 0;
        const crackP = state.phase === 'impact'
          ? Math.min((now - state.phaseTime) / 500, 1) * (0.8 + state.damageLevel * 0.2)
          : state.damageLevel;
        drawEarth(ctx, earth.x, earth.y, earth.r, t, cracked, crackP);
      }

      // 爆炸
      if (state.phase === 'explosion') {
        const ep = Math.min((now - state.phaseTime) / 3000, 1);
        drawExplosion(ctx, earth.x, earth.y, ep, t, earth.r);
        // 碎片（带冷却效果）
        for (const d of state.debris) {
          ctx.save();
          ctx.globalAlpha = d.life;
          // 碎片冷却：炽热→暗灰
          const heat = Math.max(0, d.life - 0.2) / 0.8;
          const hotR = 255, hotG = 140 + Math.floor(heat * 60), hotB = 40;
          const coolR = 80, coolG = 70, coolB = 65;
          const r2 = Math.floor(hotR * heat + coolR * (1 - heat));
          const g2 = Math.floor(hotG * heat + coolG * (1 - heat));
          const b2 = Math.floor(hotB * heat + coolB * (1 - heat));
          const coolColor = `rgb(${r2},${g2},${b2})`;
          // 火焰拖尾（炽热时发光，冷却后消失）
          for (let ti = d.trail.length - 1; ti >= 0; ti--) {
            const tr = d.trail[ti];
            const ta = (1 - ti / d.trail.length) * 0.3 * heat;
            if (ta > 0.02) {
              ctx.fillStyle = `rgba(255,${140 + ti * 12},40,${ta})`;
              ctx.beginPath();
              ctx.arc(tr.x, tr.y, d.size * 0.35 * (1 - ti / d.trail.length), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.translate(d.x, d.y);
          ctx.rotate(d.rotation);
          ctx.fillStyle = coolColor;
          if (heat > 0.3) {
            ctx.shadowColor = '#f80';
            ctx.shadowBlur = heat * 8;
          }
          ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
          // 碎片内岩浆纹理（炽热时）
          if (heat > 0.5) {
            ctx.fillStyle = `rgba(255,120,20,${(heat - 0.5) * 0.6})`;
            ctx.fillRect(-d.size * 0.3, -d.size * 0.2, d.size * 0.4, d.size * 0.3);
          }
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
        // 岩浆粒子（炽热→暗红冷却）
        for (const l of state.lava) {
          ctx.save();
          const heat = Math.max(0, l.life / l.maxLife);
          const lr = Math.floor(255 * heat + 120 * (1 - heat));
          const lg = Math.floor(80 * heat + 20 * (1 - heat));
          ctx.globalAlpha = heat * 0.8;
          ctx.fillStyle = `rgb(${lr},${lg},0)`;
          ctx.shadowColor = `rgb(${lr},${lg},0)`;
          ctx.shadowBlur = heat * 6;
          ctx.beginPath();
          ctx.arc(l.x, l.y, l.r * (0.5 + heat * 0.5), 0, Math.PI * 2);
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
        for (const l of state.lava) {
          ctx.save();
          const heat = Math.max(0, l.life / l.maxLife);
          ctx.globalAlpha = heat * 0.5 * (1 - ap);
          ctx.fillStyle = `rgb(${Math.floor(200 * heat + 80)},${Math.floor(50 * heat + 10)},0)`;
          ctx.beginPath();
          ctx.arc(l.x, l.y, l.r * (0.5 + heat * 0.5), 0, Math.PI * 2);
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
        drawDog(ctx, w * 0.20, h * 0.56, t, state.phase, chargeProgress);
        drawCannon(ctx, w * 0.20 + 18, h * 0.56, t, state.phase, chargeProgress);
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
        const isFullDestruction = state.fullChargeShot || state.shotCount >= 5;
        if (isFullDestruction) {
          // 全面爆炸
          state.phase = 'explosion'; state.phaseTime = now; state.screenShake = 2.8;
          state.damageLevel = 1;
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
          // 岩浆粒子 — 50
          for (let i = 0; i < 50; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 0.8;
            state.lava.push({
              x: earth.x + Math.cos(a) * earth.r * (0.1 + Math.random() * 0.6),
              y: earth.y + Math.sin(a) * earth.r * (0.1 + Math.random() * 0.6),
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd - Math.random() * 2,
              life: 1.5 + Math.random() * 1.5,
              maxLife: 3,
              r: Math.random() * 3 + 1,
            });
          }
          setPhase('explosion');
        } else {
          // 多击模式 — 小规模爆炸，回到 idle
          state.damageLevel = state.shotCount / 5;
          state.screenShake = 1.2;
          // 小规模碎片 — 20
          const colors = ['#1a5fa8', '#2d7dd2', '#227832', '#c4a862', '#d4a060', '#e8eef2'];
          for (let i = 0; i < 20; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 1;
            state.debris.push({
              x: earth.x + Math.cos(a) * earth.r * 0.3,
              y: earth.y + Math.sin(a) * earth.r * 0.3,
              vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
              size: Math.random() * 6 + 2,
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.2,
              color: colors[Math.floor(Math.random() * colors.length)],
              life: 0.6, trail: [],
            });
          }
          // 小规模粒子 — 30
          for (let i = 0; i < 30; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = Math.random() * 4 + 0.5;
            state.particles.push({
              x: earth.x, y: earth.y,
              vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
              life: 0.6, maxLife: 0.6,
              r: Math.random() * 2 + 0.5,
              color: ['#f80', '#ff0', '#4af'][Math.floor(Math.random() * 3)],
            });
          }
          // 小规模烟雾 — 10
          for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2;
            state.smoke.push({
              x: earth.x + Math.cos(a) * 15,
              y: earth.y + Math.sin(a) * 15,
              vx: Math.cos(a) * 0.8,
              vy: Math.sin(a) * 0.8 - 0.3,
              r: Math.random() * 5 + 3,
              life: 1.5 + Math.random(),
              maxLife: 2.5,
            });
          }
          // 回到 idle
          state.phase = 'idle';
          setShowButton(true);
          setPhase('idle');
        }
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
      state.smoke = []; state.embers = []; state.lava = [];
      state.screenShake = 0; state.shotCount = 0; state.damageLevel = 0; state.fullChargeShot = false; state.isQuickShot = false;
      earthCache = null; nebulaCache = null;
      state.stars = initStars(window.innerWidth, window.innerHeight);
      state.startTime = performance.now();
    }
    state.shotCount++;
    state.phase = 'charging';
    state.phaseTime = performance.now();
    setShowButton(false);
    setPhase('charging');
  }, [initStars]);

  // 按住开始 — 进入蓄力待判断
  const handlePressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const state = stateRef.current;
    if (state.phase !== 'idle' && state.phase !== 'aftermath') return;
    if (state.phase === 'aftermath') {
      state.phase = 'idle';
      state.particles = []; state.debris = []; state.meteors = [];
      state.smoke = []; state.embers = []; state.lava = [];
      state.screenShake = 0; state.shotCount = 0; state.damageLevel = 0; state.fullChargeShot = false; state.isQuickShot = false;
      earthCache = null; nebulaCache = null;
      state.stars = initStars(window.innerWidth, window.innerHeight);
      state.startTime = performance.now();
    }
    state.isCharging = true;
    state.chargeStartTime = performance.now();
    setChargeInsufficient(false);
  }, [initStars]);

  // 松手 — 判断点击 or 蓄力
  const handlePressEnd = useCallback(() => {
    const state = stateRef.current;
    if (!state.isCharging) return;
    const elapsed = performance.now() - state.chargeStartTime;
    state.isCharging = false;
    setChargeLevel(0);

    if (elapsed < 200) {
      // 快速点击 → 直接触发，跳过蓄力
      state.shotCount++;
      state.fullChargeShot = false;
      state.isQuickShot = true;
      state.phase = 'firing';
      state.phaseTime = performance.now();
      state.screenShake = 1.2;
      setShowButton(false);
      setPhase('firing');
    } else {
      const chargeTime = 0.5 + (1 - state.damageLevel) * 2.5;
      if (elapsed >= chargeTime * 1000) {
        // 蓄力完成 → 全力发射
        state.fullChargeShot = true;
        state.isQuickShot = false;
        state.phase = 'charging';
        state.phaseTime = performance.now();
        setShowButton(false);
        setPhase('charging');
      } else {
        // 蓄能不足
        setChargeInsufficient(true);
        setTimeout(() => setChargeInsufficient(false), 1500);
      }
    }
  }, []);

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="entertainment" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">毁灭地球的电磁炮</h1>
          </div>
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="relative w-full h-screen overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 pointer-events-none">
          {/* 蓄力进度条 */}
          {stateRef.current.isCharging && (
            <div className="mb-4 animate-fade-in">
              <p className="text-white/60 text-xs mb-1.5">蓄能中... {Math.floor(chargeLevel * 100)}%</p>
              <div className="w-52 h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${chargeLevel * 100}%`,
                    background: chargeLevel < 0.5
                      ? `linear-gradient(90deg, #4af, #8cf)`
                      : chargeLevel < 0.8
                        ? `linear-gradient(90deg, #4af, #fb6400)`
                        : `linear-gradient(90deg, #fb6400, #f44)`,
                  }}
                />
              </div>
              <p className="text-white/40 text-xs mt-1">松手发射</p>
            </div>
          )}

          {/* 主按钮 */}
          {showButton && (
            <div className="text-center pointer-events-auto animate-fade-in">
              <button
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                className="px-12 py-4 text-xl font-bold text-white rounded-2xl bg-gradient-to-r from-[#fb6400] to-[#ff8c00] hover:scale-105 hover:shadow-[0_0_40px_rgba(251,100,0,0.5)] active:scale-95 transition-all duration-300 shadow-lg shadow-orange-500/30 mb-3 select-none"
              >
                {stateRef.current.phase === 'aftermath' ? '🔥 再来一次' :
                  '🔥 发射'}
              </button>
              <p className="text-white/40 text-sm">
                {stateRef.current.phase === 'aftermath' ? '地球已被毁灭' :
                  chargeInsufficient ? '蓄能不足，充能失败' :
                  '点击发射，或按住蓄力一发毁灭地球'}
              </p>
            </div>
          )}

          {/* 动画中状态提示 */}
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
