// ── 3D furniture rendering logic ──────────────────────────────────────
import * as THREE from 'three';
import { Scene, Furniture, FurnitureType } from '@/lib/tianjige-db';

// ── Furniture defaults ──────────────────────────────────────────────
export const FURNITURE_DEFAULTS: Record<
  FurnitureType,
  { w: number; h: number; d: number; color: string; name: string; emoji: string }
> = {
  wardrobe:          { w: 1.2, h: 2.0, d: 0.6, color: '#8B6914', name: '衣柜',   emoji: '🗄️' },
  bookshelf:         { w: 1.0, h: 1.8, d: 0.4, color: '#A0522D', name: '书架',   emoji: '📚' },
  'shoe-cabinet':    { w: 1.0, h: 0.8, d: 0.4, color: '#A0522D', name: '鞋柜',   emoji: '👟' },
  nightstand:        { w: 0.5, h: 0.6, d: 0.4, color: '#DEB887', name: '床头柜', emoji: '🛏️' },
  'drawer-cabinet':  { w: 0.8, h: 1.0, d: 0.5, color: '#A0522D', name: '抽屉柜', emoji: '🗄️' },
  desk:              { w: 1.2, h: 0.8, d: 0.6, color: '#DEB887', name: '书桌',   emoji: '🪑' },
  'dining-table':    { w: 1.4, h: 0.8, d: 0.9, color: '#DEB887', name: '餐桌',   emoji: '🍽️' },
  'coffee-table':    { w: 1.0, h: 0.4, d: 0.6, color: '#8B7355', name: '茶几',   emoji: '☕' },
  bed:               { w: 1.8, h: 0.5, d: 2.0, color: '#E8D5B7', name: '床',     emoji: '🛏️' },
  sofa:              { w: 2.0, h: 0.8, d: 0.9, color: '#4A6FA5', name: '沙发',   emoji: '🛋️' },
  'tv-cabinet':      { w: 1.6, h: 0.5, d: 0.4, color: '#333333', name: '电视柜', emoji: '📺' },
  fridge:            { w: 0.7, h: 1.8, d: 0.7, color: '#E8E8E8', name: '冰箱',   emoji: '🧊' },
  'washing-machine': { w: 0.6, h: 0.9, d: 0.6, color: '#D0D0D0', name: '洗衣机', emoji: '🫧' },
  sink:              { w: 0.6, h: 0.8, d: 0.5, color: '#E0E0E0', name: '洗手台', emoji: '🚿' },
  custom:            { w: 0.8, h: 0.8, d: 0.4, color: '#8B7355', name: '自定义', emoji: '🔧' },
};

// ── Shared geometry cache ─────────────────────────────────────────
const sharedBoxGeometry = new THREE.BoxGeometry(1, 1, 1);

// ── Standard material cache (for PBR lighting + shadows) ─────────
const stdMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
function getCachedStdMaterial(color: string, opts?: { roughness?: number; metalness?: number }): THREE.MeshStandardMaterial {
  const key = color + '|' + (opts?.roughness ?? 0.7) + '|' + (opts?.metalness ?? 0);
  if (!stdMaterialCache.has(key)) {
    stdMaterialCache.set(key, new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: opts?.roughness ?? 0.7,
      metalness: opts?.metalness ?? 0,
    }));
  }
  return stdMaterialCache.get(key)!;
}

// ── Procedural wood texture ─────────────────────────────────────────
function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#C9A96E';
  ctx.fillRect(0, 0, 256, 256);
  // 确定性伪随机，确保每次生成相同纹理
  let seed = 42;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 2147483647; };
  for (let i = 0; i < 20; i++) {
    ctx.strokeStyle = `rgba(139, 105, 20, ${0.1 + rand() * 0.1})`;
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(0, i * 13 + rand() * 5);
    ctx.lineTo(256, i * 13 + rand() * 5);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

// ── Room builder ────────────────────────────────────────────────────
export function createRoom(width: number = 5, depth?: number): THREE.Group {
  const room = new THREE.Group();
  const W = width;
  const D = depth ?? width; // 如果没有提供 depth，使用 width（正方形）
  const WALL_H = 2.8;

  const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.4);
  hemiLight.position.set(0, WALL_H, 0);
  room.add(hemiLight);

  const woodTex = createWoodTexture();
  const floorMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.8,
    metalness: 0.0,
  });
  const floorBase = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.12, D),
    floorMat,
  );
  floorBase.position.set(0, -0.06, 0);
  floorBase.receiveShadow = true;
  room.add(floorBase);

  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xF8F5F0, roughness: 0.9, metalness: 0.0 });
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.08, D),
    ceilingMat,
  );
  ceiling.position.set(0, WALL_H + 0.04, 0);
  ceiling.receiveShadow = true;
  ceiling.userData.isCeiling = true;
  room.add(ceiling);

  const wallUpper = new THREE.MeshStandardMaterial({ color: 0xF0EDE5, roughness: 0.85, metalness: 0.0 });
  const wallLower = new THREE.MeshStandardMaterial({ color: 0xE8E4DA, roughness: 0.85, metalness: 0.0 });

  const backUpper = new THREE.Mesh(new THREE.BoxGeometry(W, WALL_H * 0.6, 0.12), wallUpper);
  backUpper.position.set(0, WALL_H * 0.3 + 0.8, -D / 2);
  backUpper.receiveShadow = true;
  room.add(backUpper);
  const backLower = new THREE.Mesh(new THREE.BoxGeometry(W, 0.8, 0.14), wallLower);
  backLower.position.set(0, 0.4, -D / 2);
  backLower.receiveShadow = true;
  room.add(backLower);

  const leftUpper = new THREE.Mesh(new THREE.BoxGeometry(0.12, WALL_H * 0.6, D), wallUpper);
  leftUpper.position.set(-W / 2, WALL_H * 0.3 + 0.8, 0);
  leftUpper.receiveShadow = true;
  room.add(leftUpper);
  const leftLower = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, D), wallLower);
  leftLower.position.set(-W / 2, 0.4, 0);
  leftLower.receiveShadow = true;
  room.add(leftLower);

  const rightUpper = new THREE.Mesh(new THREE.BoxGeometry(0.12, WALL_H * 0.6, D), wallUpper);
  rightUpper.position.set(W / 2, WALL_H * 0.3 + 0.8, 0);
  rightUpper.receiveShadow = true;
  room.add(rightUpper);
  const rightLower = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, D), wallLower);
  rightLower.position.set(W / 2, 0.4, 0);
  rightLower.receiveShadow = true;
  room.add(rightLower);

  const baseMat = new THREE.MeshStandardMaterial({ color: 0xF5F0E8, roughness: 0.7, metalness: 0.0 });
  const bh = 0.12;
  const bb = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, bh, 0.06), baseMat);
  bb.position.set(0, bh / 2, -D / 2 + 0.09);
  room.add(bb);
  const bl = new THREE.Mesh(new THREE.BoxGeometry(0.06, bh, D + 0.04), baseMat);
  bl.position.set(-W / 2 + 0.09, bh / 2, 0);
  room.add(bl);
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.06, bh, D + 0.04), baseMat);
  br.position.set(W / 2 - 0.09, bh / 2, 0);
  room.add(br);

  const railMat = new THREE.MeshStandardMaterial({ color: 0xEDE8DD, roughness: 0.8, metalness: 0.0 });
  const rb = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.04, 0.04), railMat);
  rb.position.set(0, 0.82, -D / 2 + 0.09);
  room.add(rb);
  const rl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, D + 0.04), railMat);
  rl.position.set(-W / 2 + 0.09, 0.82, 0);
  room.add(rl);
  const rr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, D + 0.04), railMat);
  rr.position.set(W / 2 - 0.09, 0.82, 0);
  room.add(rr);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xF5F0E8, roughness: 0.6, metalness: 0.0 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xB0D4F1,
    transparent: true,
    opacity: 0.35,
    emissive: 0x87CEEB,
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 0.0,
  });
  const ww = 1.6, wh = 1.2;
  const wy = 1.6;
  const wz = -D / 2 + 0.08;
  const ft = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.12, 0.08, 0.08), frameMat);
  ft.position.set(0, wy + wh / 2, wz); room.add(ft);
  const fb = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.12, 0.08, 0.08), frameMat);
  fb.position.set(0, wy - wh / 2, wz); room.add(fb);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.08, wh + 0.08, 0.08), frameMat);
  fl.position.set(-ww / 2, wy, wz); room.add(fl);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(0.08, wh + 0.08, 0.08), frameMat);
  fr.position.set(ww / 2, wy, wz); room.add(fr);
  const fcv = new THREE.Mesh(new THREE.BoxGeometry(0.05, wh, 0.06), frameMat);
  fcv.position.set(0, wy, wz); room.add(fcv);
  const fch = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.05, 0.06), frameMat);
  fch.position.set(0, wy, wz); room.add(fch);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(ww - 0.1, wh - 0.1, 0.02), glassMat);
  glass.position.set(0, wy, wz); room.add(glass);

  const sill = new THREE.Mesh(
    new THREE.BoxGeometry(ww + 0.2, 0.06, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xEDE8DD, roughness: 0.7, metalness: 0.0 }),
  );
  sill.position.set(0, wy - wh / 2 - 0.03, wz + 0.09);
  room.add(sill);

  const crownMat = new THREE.MeshStandardMaterial({ color: 0xF8F5F0, roughness: 0.8, metalness: 0.0 });
  const ch = 0.1;
  const cmb = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, ch, 0.08), crownMat);
  cmb.position.set(0, WALL_H - ch / 2, -D / 2 + 0.06); room.add(cmb);
  const cml = new THREE.Mesh(new THREE.BoxGeometry(0.08, ch, D + 0.08), crownMat);
  cml.position.set(-W / 2 + 0.06, WALL_H - ch / 2, 0); room.add(cml);
  const cmr = new THREE.Mesh(new THREE.BoxGeometry(0.08, ch, D + 0.08), crownMat);
  cmr.position.set(W / 2 - 0.06, WALL_H - ch / 2, 0); room.add(cmr);

  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.015, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xC4956A, roughness: 0.9, metalness: 0.0 }),
  );
  rug.position.set(0, 0.008, 0);
  rug.receiveShadow = true;
  room.add(rug);
  const rugBorder = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.012, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xA67B52, roughness: 0.9, metalness: 0.0 }),
  );
  rugBorder.position.set(0, 0.005, 0);
  rugBorder.receiveShadow = true;
  room.add(rugBorder);

  return room;
}

// ── Furniture mesh factory ──────────────────────────────────────────
export function createFurnitureMesh(furniture: Furniture): THREE.Group {
  const group = new THREE.Group();
  group.userData = { furnitureId: furniture.id };

  // ── Custom furniture (user-defined shape & size) ──
  if (furniture.type === 'custom') {
    const color = furniture.color || '#8B7355';
    const shape = furniture.customShape || 'box';
    const cw = (furniture.customW || 0.8) * furniture.scale;
    const ch = (furniture.customH || 0.8) * furniture.scale;
    const cd = (furniture.customD || 0.4) * furniture.scale;

    if (shape === 'cylinder') {
      const radius = Math.min(cw, cd) / 2;
      const cylinderGeo = new THREE.CylinderGeometry(radius, radius, ch, 16);
      const mesh = new THREE.Mesh(cylinderGeo, getCachedStdMaterial(color, { roughness: 0.7 }));
      mesh.position.y = ch / 2;
      mesh.castShadow = true;
      group.add(mesh);
    } else if (shape === 'l-shape') {
      const vertical = new THREE.Mesh(sharedBoxGeometry.clone(), getCachedStdMaterial(color, { roughness: 0.7 }));
      vertical.scale.set(cw * 0.4, ch, cd);
      vertical.position.set(-cw * 0.3, ch / 2, 0);
      vertical.castShadow = true;
      group.add(vertical);
      const horizontal = new THREE.Mesh(sharedBoxGeometry.clone(), getCachedStdMaterial(color, { roughness: 0.7 }));
      horizontal.scale.set(cw, ch * 0.4, cd);
      horizontal.position.set(0, ch * 0.2, 0);
      horizontal.castShadow = true;
      group.add(horizontal);
    } else {
      const box = new THREE.Mesh(sharedBoxGeometry.clone(), getCachedStdMaterial(color, { roughness: 0.7 }));
      box.scale.set(cw, ch, cd);
      box.position.y = ch / 2;
      box.castShadow = true;
      group.add(box);
    }

    group.position.set(furniture.position.x, 0, furniture.position.z);
    group.rotation.y = (furniture.rotation * Math.PI) / 180;
    return group;
  }

  // ── Built-in furniture types ──
  const defaults = FURNITURE_DEFAULTS[furniture.type];
  const scale = furniture.scale;
  const w = defaults.w * scale;
  const h = defaults.h * scale;
  const d = defaults.d * scale;
  const color = furniture.color || defaults.color;

  const darkHex = '#' + new THREE.Color(color).multiplyScalar(0.7).getHexString();

  // ── Body elevated to sit on legs (2-3cm off ground) ──
  const legH = furniture.type === 'dining-table' || furniture.type === 'desk' || furniture.type === 'sink'
    ? 0.03 * scale
    : 0.025 * scale;
  const body = new THREE.Mesh(sharedBoxGeometry.clone(), getCachedStdMaterial(color));
  body.scale.set(w, h, d);
  body.position.y = legH + h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // ── Type-specific details ──

  if (furniture.type === 'shoe-cabinet') {
    const bodyY = legH;
    const shelfMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    for (let i = 1; i <= 2; i++) {
      const shelf = new THREE.Mesh(sharedBoxGeometry.clone(), shelfMat);
      shelf.scale.set(w * 0.95, 0.015 * scale, d * 0.9);
      shelf.position.y = bodyY + h * (i / 3);
      shelf.castShadow = true;
      group.add(shelf);
    }
    const lineMat = getCachedStdMaterial('#5A4010', { roughness: 0.6 });
    for (let i = -1; i <= 1; i += 2) {
      const line = new THREE.Mesh(sharedBoxGeometry.clone(), lineMat);
      line.scale.set(0.015 * scale, h * 0.88, 0.01);
      line.position.set(i * w / 3, bodyY + h / 2, d / 2 + 0.005);
      line.castShadow = true;
      group.add(line);
    }
    const legGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, legH, 8);
    const legMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    const corners: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [cx, cz] of corners) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(cx * (w / 2 - 0.03), legH / 2, cz * (d / 2 - 0.03));
      leg.castShadow = true;
      group.add(leg);
    }
  }

  if (furniture.type === 'nightstand') {
    const bodyY = legH;
    const lineMat = getCachedStdMaterial(darkHex, { roughness: 0.6 });
    const drawerLine = new THREE.Mesh(sharedBoxGeometry.clone(), lineMat);
    drawerLine.scale.set(w * 0.9, 0.015 * scale, 0.01);
    drawerLine.position.set(0, bodyY + h * 0.5, d / 2 + 0.005);
    drawerLine.castShadow = true;
    group.add(drawerLine);
    const handleGeo = new THREE.CylinderGeometry(0.01 * scale, 0.01 * scale, 0.06 * scale, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xB0B0B0, roughness: 0.3, metalness: 0.5 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, bodyY + h * 0.5 + 0.03 * scale, d / 2 + 0.015);
    handle.castShadow = true;
    group.add(handle);
    const legGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, legH, 8);
    const legMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    const corners: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [cx, cz] of corners) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(cx * (w / 2 - 0.025), legH / 2, cz * (d / 2 - 0.025));
      leg.castShadow = true;
      group.add(leg);
    }
  }

  if (furniture.type === 'drawer-cabinet') {
    const bodyY = legH;
    const lineMat = getCachedStdMaterial(darkHex, { roughness: 0.6 });
    for (let i = 1; i <= 3; i++) {
      const drawerLine = new THREE.Mesh(sharedBoxGeometry.clone(), lineMat);
      drawerLine.scale.set(w * 0.92, 0.015 * scale, 0.01);
      drawerLine.position.set(0, bodyY + h * (i / 4), d / 2 + 0.005);
      drawerLine.castShadow = true;
      group.add(drawerLine);
    }
    const handleGeo = new THREE.CylinderGeometry(0.01 * scale, 0.01 * scale, 0.05 * scale, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xB0B0B0, roughness: 0.3, metalness: 0.5 });
    for (let i = 1; i <= 3; i++) {
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(0, bodyY + h * (i / 4) + 0.025 * scale, d / 2 + 0.015);
      handle.castShadow = true;
      group.add(handle);
    }
    const barMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    for (const cz of [-1, 1]) {
      const bar = new THREE.Mesh(sharedBoxGeometry.clone(), barMat);
      bar.scale.set(w * 0.9, 0.03 * scale, 0.03 * scale);
      bar.position.set(0, 0.015 * scale, cz * (d / 2 - 0.04));
      bar.castShadow = true;
      group.add(bar);
    }
  }

  if (furniture.type === 'dining-table') {
    const legGeo = new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, legH, 12);
    const legMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    const insetX = 0.1 * scale;
    const insetZ = 0.1 * scale;
    const legPositions: [number, number, number][] = [
      [-w / 2 + insetX, legH / 2, -d / 2 + insetZ],
      [-w / 2 + insetX, legH / 2,  d / 2 - insetZ],
      [ w / 2 - insetX, legH / 2, -d / 2 + insetZ],
      [ w / 2 - insetX, legH / 2,  d / 2 - insetZ],
    ];
    for (const [lx, ly, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      group.add(leg);
    }
  }

  if (furniture.type === 'coffee-table') {
    body.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.5,
    });
    body.position.y = legH + h / 2;
    const legGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, legH, 8);
    const legMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    const corners: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [cx, cz] of corners) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(cx * (w / 2 - 0.05), legH / 2, cz * (d / 2 - 0.05));
      leg.castShadow = true;
      group.add(leg);
    }
    const shelfMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    const shelf = new THREE.Mesh(sharedBoxGeometry.clone(), shelfMat);
    shelf.scale.set(w * 0.92, 0.015 * scale, d * 0.85);
    shelf.position.y = legH * 0.45;
    shelf.castShadow = true;
    group.add(shelf);
  }

  if (furniture.type === 'desk') {
    const bodyY = legH;
    const drawerMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    const drawerPanel = new THREE.Mesh(sharedBoxGeometry.clone(), drawerMat);
    drawerPanel.scale.set(w * 0.4, h * 0.9, d * 0.95);
    drawerPanel.position.set(-w * 0.25, bodyY + h * 0.45, 0);
    drawerPanel.castShadow = true;
    group.add(drawerPanel);
    const lineMat = getCachedStdMaterial('#4A3008', { roughness: 0.6 });
    for (let i = 1; i <= 2; i++) {
      const drawerLine = new THREE.Mesh(sharedBoxGeometry.clone(), lineMat);
      drawerLine.scale.set(w * 0.35, 0.015 * scale, 0.01);
      drawerLine.position.set(-w * 0.25, bodyY + h * (0.2 * i + 0.1), d / 2 + 0.005);
      drawerLine.castShadow = true;
      group.add(drawerLine);
    }
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xB0B0B0, roughness: 0.3, metalness: 0.5 });
    for (let i = 1; i <= 2; i++) {
      const handle = new THREE.Mesh(sharedBoxGeometry.clone(), handleMat);
      handle.scale.set(0.07 * scale, 0.015 * scale, 0.02 * scale);
      handle.position.set(-w * 0.25, bodyY + h * (0.2 * i + 0.1) + 0.02 * scale, d / 2 + 0.015);
      handle.castShadow = true;
      group.add(handle);
    }
    const legGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, legH, 8);
    const legMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    for (const cz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(w * 0.35, legH / 2, cz * (d / 2 - 0.06));
      leg.castShadow = true;
      group.add(leg);
    }
  }

  if (furniture.type === 'wardrobe') {
    const bodyY = legH;
    const doorLine = new THREE.Mesh(
      sharedBoxGeometry.clone(),
      getCachedStdMaterial('#5A4010', { roughness: 0.6 }),
    );
    doorLine.scale.set(0.02 * scale, h * 0.9, 0.01);
    doorLine.position.set(0, bodyY + h / 2, d / 2 + 0.005);
    doorLine.castShadow = true;
    group.add(doorLine);
    const handleGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.08 * scale, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.3, metalness: 0.6 });
    const handleL = new THREE.Mesh(handleGeo, handleMat);
    handleL.rotation.x = Math.PI / 2;
    handleL.position.set(-0.08 * scale, bodyY + h * 0.55, d / 2 + 0.02);
    handleL.castShadow = true;
    group.add(handleL);
    const handleR = new THREE.Mesh(handleGeo, handleMat);
    handleR.rotation.x = Math.PI / 2;
    handleR.position.set(0.08 * scale, bodyY + h * 0.55, d / 2 + 0.02);
    handleR.castShadow = true;
    group.add(handleR);
    // Top decorative molding
    const moldMat = getCachedStdMaterial(darkHex, { roughness: 0.6 });
    const molding = new THREE.Mesh(sharedBoxGeometry.clone(), moldMat);
    molding.scale.set(w * 1.02, 0.03 * scale, 0.04 * scale);
    molding.position.set(0, bodyY + h + 0.015 * scale, d / 2 - 0.01);
    molding.castShadow = true;
    group.add(molding);
    // Bottom support bars
    const barMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    for (const cz of [-1, 1]) {
      const bar = new THREE.Mesh(sharedBoxGeometry.clone(), barMat);
      bar.scale.set(w * 0.9, 0.04 * scale, 0.04 * scale);
      bar.position.set(0, 0.02 * scale, cz * (d / 2 - 0.06));
      bar.castShadow = true;
      group.add(bar);
    }
    // Internal hanging rod
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0xAAAAAA,
      transparent: true,
      opacity: 0.3,
      roughness: 0.4,
      metalness: 0.3,
    });
    const rodGeo = new THREE.CylinderGeometry(0.01 * scale, 0.01 * scale, w * 0.8, 8);
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, bodyY + h * 0.82, 0);
    group.add(rod);
  }

  if (furniture.type === 'bookshelf') {
    const bodyY = legH;
    const sideMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(sharedBoxGeometry.clone(), sideMat);
      side.scale.set(0.025 * scale, h * 1.02, d * 1.02);
      side.position.set(sx * (w / 2 + 0.01 * scale), bodyY + h / 2, 0);
      side.castShadow = true;
      group.add(side);
    }
    const topBoard = new THREE.Mesh(sharedBoxGeometry.clone(), sideMat);
    topBoard.scale.set(w * 1.04, 0.025 * scale, d * 1.04);
    topBoard.position.y = bodyY + h + 0.012 * scale;
    topBoard.castShadow = true;
    group.add(topBoard);
    const shelfMat = getCachedStdMaterial(color, { roughness: 0.7 });
    for (let i = 1; i <= 3; i++) {
      const shelf = new THREE.Mesh(sharedBoxGeometry.clone(), shelfMat);
      shelf.scale.set(w * 0.98, 0.03 * scale, d * 0.95);
      shelf.position.y = bodyY + (h / 4) * i;
      shelf.castShadow = true;
      group.add(shelf);
    }
    const bookColors = ['#CC3333', '#336699', '#339933', '#996633', '#663399'];
    // 确定性伪随机，基于家具ID
    let seed = 0;
    for (let i = 0; i < furniture.id.length; i++) seed = (seed * 31 + furniture.id.charCodeAt(i)) & 0x7fffffff;
    const seededRandom = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 2147483647; };
    for (let shelf = 0; shelf < 3; shelf++) {
      const shelfY = bodyY + (h / 4) * (shelf + 1) + 0.03 * scale;
      const bookCount = 3 + Math.floor(seededRandom() * 3);
      let bx = -w * 0.4;
      for (let b = 0; b < bookCount; b++) {
        const bw = (0.04 + seededRandom() * 0.04) * scale;
        const bh2 = (0.15 + seededRandom() * 0.1) * scale;
        const bd = d * 0.7;
        const book = new THREE.Mesh(
          sharedBoxGeometry.clone(),
          getCachedStdMaterial(bookColors[b % bookColors.length], { roughness: 0.8 }),
        );
        book.scale.set(bw, bh2, bd);
        book.position.set(bx + bw / 2, shelfY + bh2 / 2, 0);
        book.castShadow = true;
        group.add(book);
        bx += bw + 0.005 * scale;
        if (bx > w * 0.4) break;
      }
    }
    const legGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, legH, 8);
    const corners: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [cx, cz] of corners) {
      const leg = new THREE.Mesh(legGeo, sideMat);
      leg.position.set(cx * (w / 2 - 0.03), legH / 2, cz * (d / 2 - 0.03));
      leg.castShadow = true;
      group.add(leg);
    }
  }

  if (furniture.type === 'bed') {
    const bodyY = legH;
    const mattress = new THREE.Mesh(
      sharedBoxGeometry.clone(),
      getCachedStdMaterial('#FFF8F0', { roughness: 0.9 }),
    );
    mattress.scale.set(w * 0.95, h * 0.4, d * 0.95);
    mattress.position.y = bodyY + h + h * 0.4 * 0.5;
    mattress.castShadow = true;
    group.add(mattress);
    const pillowMat = getCachedStdMaterial('#FFFFF0', { roughness: 0.9 });
    const pillowL = new THREE.Mesh(sharedBoxGeometry.clone(), pillowMat);
    pillowL.scale.set(w * 0.28, 0.08 * scale, 0.2 * scale);
    pillowL.position.set(-w * 0.2, bodyY + h + h * 0.4 + 0.04 * scale, -d * 0.35);
    pillowL.castShadow = true;
    group.add(pillowL);
    const pillowR = new THREE.Mesh(sharedBoxGeometry.clone(), pillowMat);
    pillowR.scale.set(w * 0.28, 0.08 * scale, 0.2 * scale);
    pillowR.position.set(w * 0.2, bodyY + h + h * 0.4 + 0.04 * scale, -d * 0.35);
    pillowR.castShadow = true;
    group.add(pillowR);
    const headboard = new THREE.Mesh(
      sharedBoxGeometry.clone(),
      getCachedStdMaterial(darkHex),
    );
    headboard.scale.set(w, h * 0.8, 0.06 * scale);
    headboard.position.set(0, bodyY + h * 0.9, -d / 2 - 0.03 * scale);
    headboard.castShadow = true;
    group.add(headboard);
    // Headboard top arc effect
    const arcMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    for (let i = 0; i < 4; i++) {
      const arcPanel = new THREE.Mesh(sharedBoxGeometry.clone(), arcMat);
      const aw = w * (1.0 - i * 0.08);
      const at = 0.025 * scale;
      arcPanel.scale.set(aw, at, 0.04 * scale);
      arcPanel.position.set(0, bodyY + h * 1.3 + i * at, -d / 2 - 0.03 * scale);
      arcPanel.castShadow = true;
      group.add(arcPanel);
    }
    // Footboard
    const footboard = new THREE.Mesh(
      sharedBoxGeometry.clone(),
      getCachedStdMaterial(darkHex),
    );
    footboard.scale.set(w, h * 0.3, 0.04 * scale);
    footboard.position.set(0, bodyY + h * 0.65, d / 2 + 0.02 * scale);
    footboard.castShadow = true;
    group.add(footboard);
    // Duvet
    const duvetMat = getCachedStdMaterial('#D4C4A8', { roughness: 0.9 });
    const duvet = new THREE.Mesh(sharedBoxGeometry.clone(), duvetMat);
    duvet.scale.set(w * 0.92, h * 0.15, d * 0.5);
    duvet.position.set(0, bodyY + h + h * 0.4 + h * 0.075, d * 0.15);
    duvet.castShadow = true;
    group.add(duvet);
  }

  if (furniture.type === 'sofa') {
    const bodyY = legH;
    const backH = h * 0.6;
    const backrest = new THREE.Mesh(
      sharedBoxGeometry.clone(),
      getCachedStdMaterial(darkHex, { roughness: 0.8 }),
    );
    backrest.scale.set(w, backH, 0.15 * scale);
    backrest.position.set(0, bodyY + h + backH / 2, -d / 2 + 0.075 * scale);
    backrest.castShadow = true;
    group.add(backrest);
    // Backrest top tilt
    const tiltMat = getCachedStdMaterial(darkHex, { roughness: 0.8 });
    const tiltPanel = new THREE.Mesh(sharedBoxGeometry.clone(), tiltMat);
    tiltPanel.scale.set(w * 0.98, 0.04 * scale, 0.12 * scale);
    tiltPanel.rotation.x = -0.15;
    tiltPanel.position.set(0, bodyY + h + backH + 0.02 * scale, -d / 2 + 0.07 * scale);
    tiltPanel.castShadow = true;
    group.add(tiltPanel);
    const armH = h * 0.4;
    const armMat = getCachedStdMaterial(darkHex, { roughness: 0.8 });
    const armL = new THREE.Mesh(sharedBoxGeometry.clone(), armMat);
    armL.scale.set(0.12 * scale, armH, d);
    armL.position.set(-w / 2 + 0.06 * scale, bodyY + h + armH / 2, 0);
    armL.castShadow = true;
    group.add(armL);
    const armR = new THREE.Mesh(sharedBoxGeometry.clone(), armMat);
    armR.scale.set(0.12 * scale, armH, d);
    armR.position.set(w / 2 - 0.06 * scale, bodyY + h + armH / 2, 0);
    armR.castShadow = true;
    group.add(armR);
    // Seat cushions (3 blocks)
    const cushionMat = getCachedStdMaterial(color, { roughness: 0.85 });
    const cushionCount = 3;
    const cushionW = (w * 0.9) / cushionCount;
    const cushionH = h * 0.25;
    for (let i = 0; i < cushionCount; i++) {
      const cushion = new THREE.Mesh(sharedBoxGeometry.clone(), cushionMat);
      cushion.scale.set(cushionW * 0.95, cushionH, d * 0.75);
      const cx = -w * 0.45 + cushionW * (i + 0.5);
      cushion.position.set(cx, bodyY + h + cushionH / 2, d * 0.05);
      cushion.castShadow = true;
      group.add(cushion);
    }
    // 4 small legs
    const legGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, legH, 8);
    const legMat = getCachedStdMaterial(darkHex, { roughness: 0.7 });
    const corners: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [cx, cz] of corners) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(cx * (w / 2 - 0.04), legH / 2, cz * (d / 2 - 0.04));
      leg.castShadow = true;
      group.add(leg);
    }
  }

  if (furniture.type === 'tv-cabinet') {
    const bodyY = legH;
    const tvMat = getCachedStdMaterial('#1A1A1A', { roughness: 0.2, metalness: 0.1 });
    const tv = new THREE.Mesh(sharedBoxGeometry.clone(), tvMat);
    tv.scale.set(w * 0.85, 0.04 * scale, d * 0.08);
    tv.position.set(0, bodyY + h + 0.5 * scale, -d * 0.1);
    tv.castShadow = true;
    group.add(tv);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x222244,
      emissive: 0x111133,
      emissiveIntensity: 0.3,
      roughness: 0.1,
    });
    const screen = new THREE.Mesh(sharedBoxGeometry.clone(), screenMat);
    screen.scale.set(w * 0.78, 0.005, d * 0.06);
    screen.position.set(0, bodyY + h + 0.5 * scale, -d * 0.1 + d * 0.01);
    group.add(screen);
    const standMat = getCachedStdMaterial('#222222', { roughness: 0.4, metalness: 0.3 });
    const stand = new THREE.Mesh(sharedBoxGeometry.clone(), standMat);
    stand.scale.set(0.08 * scale, 0.02 * scale, d * 0.15);
    stand.position.set(0, bodyY + h + 0.01 * scale, -d * 0.1);
    group.add(stand);
    // Drawer lines
    const lineMat = getCachedStdMaterial('#222222', { roughness: 0.5 });
    for (let i = 0; i < 2; i++) {
      const drawerLine = new THREE.Mesh(sharedBoxGeometry.clone(), lineMat);
      drawerLine.scale.set(w * 0.4, 0.012 * scale, 0.01);
      drawerLine.position.set((i === 0 ? -1 : 1) * w * 0.25, bodyY + h * 0.5, d / 2 + 0.005);
      drawerLine.castShadow = true;
      group.add(drawerLine);
    }
    // Bottom support bars
    const barMat = getCachedStdMaterial('#222222', { roughness: 0.6 });
    for (const cz of [-1, 1]) {
      const bar = new THREE.Mesh(sharedBoxGeometry.clone(), barMat);
      bar.scale.set(w * 0.95, 0.03 * scale, 0.03 * scale);
      bar.position.set(0, 0.015 * scale, cz * (d / 2 - 0.04));
      bar.castShadow = true;
      group.add(bar);
    }
    // Side speakers
    const speakerMat = getCachedStdMaterial('#1A1A1A', { roughness: 0.5 });
    for (const sx of [-1, 1]) {
      const speaker = new THREE.Mesh(sharedBoxGeometry.clone(), speakerMat);
      speaker.scale.set(0.08 * scale, 0.2 * scale, 0.1 * scale);
      speaker.position.set(sx * (w / 2 + 0.04 * scale), bodyY + h * 0.5, 0);
      speaker.castShadow = true;
      group.add(speaker);
    }
  }

  if (furniture.type === 'fridge') {
    const bodyY = legH;
    const doorLine = new THREE.Mesh(
      sharedBoxGeometry.clone(),
      getCachedStdMaterial('#999999', { roughness: 0.4, metalness: 0.3 }),
    );
    doorLine.scale.set(w * 0.98, 0.02 * scale, 0.01);
    doorLine.position.set(0, bodyY + h * 0.45, d / 2 + 0.005);
    doorLine.castShadow = true;
    group.add(doorLine);
    // Top panel
    const topPanelMat = getCachedStdMaterial('#D8D8D8', { roughness: 0.4, metalness: 0.2 });
    const topPanel = new THREE.Mesh(sharedBoxGeometry.clone(), topPanelMat);
    topPanel.scale.set(w * 1.01, 0.02 * scale, d * 1.01);
    topPanel.position.y = bodyY + h + 0.01 * scale;
    topPanel.castShadow = true;
    group.add(topPanel);
    // Door handles with rounded caps
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.2, metalness: 0.7 });
    for (const hy of [0.7, 0.25]) {
      const handleBar = new THREE.Mesh(sharedBoxGeometry.clone(), handleMat);
      handleBar.scale.set(0.02 * scale, 0.2 * scale, 0.03 * scale);
      handleBar.position.set(w / 2 - 0.06 * scale, bodyY + h * hy, d / 2 + 0.02);
      handleBar.castShadow = true;
      group.add(handleBar);
      const capGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.03 * scale, 8);
      const capTop = new THREE.Mesh(capGeo, handleMat);
      capTop.rotation.x = Math.PI / 2;
      capTop.position.set(w / 2 - 0.06 * scale, bodyY + h * hy + 0.1 * scale + 0.015 * scale, d / 2 + 0.02);
      capTop.castShadow = true;
      group.add(capTop);
      const capBot = new THREE.Mesh(capGeo, handleMat);
      capBot.rotation.x = Math.PI / 2;
      capBot.position.set(w / 2 - 0.06 * scale, bodyY + h * hy - 0.1 * scale - 0.015 * scale, d / 2 + 0.02);
      capBot.castShadow = true;
      group.add(capBot);
    }
    // Bottom support bars
    const barMat = getCachedStdMaterial('#AAAAAA', { roughness: 0.5, metalness: 0.2 });
    for (const cz of [-1, 1]) {
      const bar = new THREE.Mesh(sharedBoxGeometry.clone(), barMat);
      bar.scale.set(w * 0.85, 0.03 * scale, 0.03 * scale);
      bar.position.set(0, 0.015 * scale, cz * (d / 2 - 0.06));
      bar.castShadow = true;
      group.add(bar);
    }
  }

  if (furniture.type === 'washing-machine') {
    const bodyY = legH;
    const doorRingGeo = new THREE.TorusGeometry(0.18 * scale, 0.02 * scale, 8, 24);
    const doorRingMat = getCachedStdMaterial('#888888', { roughness: 0.3, metalness: 0.4 });
    const doorRing = new THREE.Mesh(doorRingGeo, doorRingMat);
    doorRing.position.set(0, bodyY + h * 0.55, d / 2 + 0.01);
    doorRing.castShadow = true;
    group.add(doorRing);
    const glassDoorMat = new THREE.MeshStandardMaterial({
      color: 0x666688,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
    });
    const glassDoor = new THREE.Mesh(new THREE.CircleGeometry(0.16 * scale, 24), glassDoorMat);
    glassDoor.position.set(0, bodyY + h * 0.55, d / 2 + 0.012);
    group.add(glassDoor);
    const panelMat = getCachedStdMaterial('#D8D8D8', { roughness: 0.5 });
    const panel = new THREE.Mesh(sharedBoxGeometry.clone(), panelMat);
    panel.scale.set(w * 0.8, 0.08 * scale, 0.01);
    panel.position.set(0, bodyY + h * 0.85, d / 2 + 0.005);
    group.add(panel);
    const knobGeo = new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 0.015 * scale, 12);
    const knobMat = getCachedStdMaterial('#BBBBBB', { roughness: 0.3, metalness: 0.4 });
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(w * 0.25, bodyY + h * 0.85, d / 2 + 0.015);
    knob.castShadow = true;
    group.add(knob);
    // Top panel
    const topPanelMat = getCachedStdMaterial('#C8C8C8', { roughness: 0.4, metalness: 0.1 });
    const topPanel = new THREE.Mesh(sharedBoxGeometry.clone(), topPanelMat);
    topPanel.scale.set(w * 1.02, 0.015 * scale, d * 1.02);
    topPanel.position.y = bodyY + h + 0.0075 * scale;
    topPanel.castShadow = true;
    group.add(topPanel);
    // 4 small legs
    const legGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, legH, 8);
    const legMat = getCachedStdMaterial('#888888', { roughness: 0.5, metalness: 0.3 });
    const corners: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [cx, cz] of corners) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(cx * (w / 2 - 0.04), legH / 2, cz * (d / 2 - 0.04));
      leg.castShadow = true;
      group.add(leg);
    }
  }

  if (furniture.type === 'sink') {
    const bodyY = legH;
    const basinMat = getCachedStdMaterial('#F0F0F0', { roughness: 0.3, metalness: 0.1 });
    const basin = new THREE.Mesh(sharedBoxGeometry.clone(), basinMat);
    basin.scale.set(w * 0.7, 0.06 * scale, d * 0.6);
    basin.position.set(0, bodyY + h + 0.01, 0);
    group.add(basin);
    // Countertop edge
    const counterMat = getCachedStdMaterial('#E8E8E8', { roughness: 0.5, metalness: 0.1 });
    const counterFront = new THREE.Mesh(sharedBoxGeometry.clone(), counterMat);
    counterFront.scale.set(w, 0.03 * scale, 0.04 * scale);
    counterFront.position.set(0, bodyY + h + 0.015 * scale, d / 2 - 0.02);
    counterFront.castShadow = true;
    group.add(counterFront);
    const counterBack = new THREE.Mesh(sharedBoxGeometry.clone(), counterMat);
    counterBack.scale.set(w, 0.03 * scale, 0.04 * scale);
    counterBack.position.set(0, bodyY + h + 0.015 * scale, -d / 2 + 0.02);
    counterBack.castShadow = true;
    group.add(counterBack);
    const faucetMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, roughness: 0.2, metalness: 0.7 });
    const pipeGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.25 * scale, 8);
    const pipe = new THREE.Mesh(pipeGeo, faucetMat);
    pipe.position.set(0, bodyY + h + 0.125 * scale, -d * 0.2);
    pipe.castShadow = true;
    group.add(pipe);
    const spoutGeo = new THREE.CylinderGeometry(0.01 * scale, 0.01 * scale, 0.15 * scale, 8);
    const spout = new THREE.Mesh(spoutGeo, faucetMat);
    spout.rotation.x = Math.PI / 2;
    spout.position.set(0, bodyY + h + 0.25 * scale, -d * 0.12);
    spout.castShadow = true;
    group.add(spout);
    // Cabinet door lines
    const lineMat = getCachedStdMaterial('#AAAAAA', { roughness: 0.5 });
    for (const sx of [-1, 1]) {
      const line = new THREE.Mesh(sharedBoxGeometry.clone(), lineMat);
      line.scale.set(0.012 * scale, h * 0.7, 0.01);
      line.position.set(sx * w / 4, bodyY + h * 0.45, d / 2 + 0.005);
      line.castShadow = true;
      group.add(line);
    }
    // Mirror
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0xCCDDEE,
      transparent: true,
      opacity: 0.6,
      roughness: 0.05,
      metalness: 0.3,
    });
    const mirror = new THREE.Mesh(sharedBoxGeometry.clone(), mirrorMat);
    mirror.scale.set(w * 0.9, 0.5 * scale, 0.015 * scale);
    mirror.position.set(0, bodyY + h + 0.35 * scale, -d / 2 - 0.01 * scale);
    mirror.castShadow = true;
    group.add(mirror);
    // 4 legs
    const legGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, legH, 8);
    const legMat = getCachedStdMaterial('#AAAAAA', { roughness: 0.5, metalness: 0.2 });
    const corners: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [cx, cz] of corners) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(cx * (w / 2 - 0.03), legH / 2, cz * (d / 2 - 0.03));
      leg.castShadow = true;
      group.add(leg);
    }
  }

  // Position and rotation
  group.position.set(furniture.position.x, 0, furniture.position.z);
  group.rotation.y = (furniture.rotation * Math.PI) / 180;

  return group;
}

// ── Preset scenes ───────────────────────────────────────────────────
function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createFurnitureItem(
  type: FurnitureType,
  x: number,
  z: number,
  rotation: number = 0,
  scale: number = 1,
): Furniture {
  const defaults = FURNITURE_DEFAULTS[type];
  return {
    id: makeId(),
    type,
    name: defaults.name,
    color: '',
    position: { x, z },
    rotation,
    scale,
    addedAt: Date.now(),
    items: [],
  };
}

export function createPresetScenes(): Scene[] {
  return [
    {
      id: makeId(),
      name: '客厅',
      emoji: '🛋️',
      isCustom: false,
      sortOrder: 0,
      thumbnail: '',
      roomSize: 5,
      roomWidth: 5,
      roomDepth: 5,
      furniture: [
        createFurnitureItem('sofa', 0, -1.5, 0),
        createFurnitureItem('coffee-table', 0, -0.3, 0),
        createFurnitureItem('tv-cabinet', 0, 1.5, 180),
      ],
    },
    {
      id: makeId(),
      name: '卧室',
      emoji: '🛏️',
      isCustom: false,
      sortOrder: 1,
      thumbnail: '',
      roomSize: 5,
      roomWidth: 5,
      roomDepth: 5,
      furniture: [
        createFurnitureItem('bed', 0, -0.5, 0),
        createFurnitureItem('nightstand', -1.4, -1.5, 0),
        createFurnitureItem('nightstand', 1.4, -1.5, 0),
        createFurnitureItem('wardrobe', -1.8, 1.5, 180),
      ],
    },
    {
      id: makeId(),
      name: '厨房',
      emoji: '🍳',
      isCustom: false,
      sortOrder: 2,
      thumbnail: '',
      roomSize: 5,
      roomWidth: 5,
      roomDepth: 5,
      furniture: [
        createFurnitureItem('dining-table', 0, 0, 0),
        createFurnitureItem('fridge', -2.0, 1.5, 90),
        createFurnitureItem('sink', 1.8, 1.8, 180),
      ],
    },
    {
      id: makeId(),
      name: '卫生间',
      emoji: '🚿',
      isCustom: false,
      sortOrder: 3,
      thumbnail: '',
      roomSize: 3,
      roomWidth: 3,
      roomDepth: 3,
      furniture: [
        createFurnitureItem('sink', -0.8, 0.8, 180),
        createFurnitureItem('washing-machine', 0.8, 0.8, 180),
      ],
    },
    {
      id: makeId(),
      name: '大学宿舍',
      emoji: '🏫',
      isCustom: false,
      sortOrder: 4,
      thumbnail: '',
      roomSize: 5,
      roomWidth: 5,
      roomDepth: 5,
      furniture: [
        createFurnitureItem('bed', -1.2, -1.0, 0, 0.8),
        createFurnitureItem('bed', 1.2, -1.0, 0, 0.8),
        createFurnitureItem('desk', -1.2, 1.0, 180, 0.8),
        createFurnitureItem('desk', 1.2, 1.0, 180, 0.8),
        createFurnitureItem('bookshelf', 0, 1.8, 180, 0.7),
      ],
    },
  ];
}
