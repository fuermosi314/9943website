'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Scene,
  Furniture,
  FurnitureType,
  Item,
  PhotoRef,
  generateThumbnail,
  getAllScenes,
  saveScene,
  deleteScene,
  exportData,
  importData,
} from '@/lib/tianjige-db';

// ── Furniture defaults ──────────────────────────────────────────────
const FURNITURE_DEFAULTS: Record<
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
};

// ── Room builder ────────────────────────────────────────────────────
function createRoom(): THREE.Group {
  const room = new THREE.Group();
  const ROOM = 5;
  const WALL_H = 2.8;

  // ── Floor with wood plank texture ──
  const floorBase = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM, 0.12, ROOM),
    new THREE.MeshLambertMaterial({ color: 0xC9A96E }),
  );
  floorBase.position.set(0, -0.06, 0);
  room.add(floorBase);

  // Wood plank lines (subtle darker strips)
  const plankMat = new THREE.MeshLambertMaterial({ color: 0xB8944F });
  for (let i = -2; i <= 2; i++) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(ROOM, 0.005, 0.02),
      plankMat,
    );
    plank.position.set(0, 0.001, i * 1.0);
    room.add(plank);
  }

  // ── Walls with two-tone paint (lower wainscoting) ──
  const wallUpper = new THREE.MeshLambertMaterial({ color: 0xF0EDE5 });
  const wallLower = new THREE.MeshLambertMaterial({ color: 0xE8E4DA });

  // Back wall — upper
  const backUpper = new THREE.Mesh(new THREE.BoxGeometry(ROOM, WALL_H * 0.6, 0.12), wallUpper);
  backUpper.position.set(0, WALL_H * 0.3 + 0.8, -ROOM / 2);
  room.add(backUpper);
  // Back wall — lower (wainscoting)
  const backLower = new THREE.Mesh(new THREE.BoxGeometry(ROOM, 0.8, 0.14), wallLower);
  backLower.position.set(0, 0.4, -ROOM / 2);
  room.add(backLower);

  // Left wall — upper
  const leftUpper = new THREE.Mesh(new THREE.BoxGeometry(0.12, WALL_H * 0.6, ROOM), wallUpper);
  leftUpper.position.set(-ROOM / 2, WALL_H * 0.3 + 0.8, 0);
  room.add(leftUpper);
  // Left wall — lower
  const leftLower = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, ROOM), wallLower);
  leftLower.position.set(-ROOM / 2, 0.4, 0);
  room.add(leftLower);

  // Right wall — upper
  const rightUpper = new THREE.Mesh(new THREE.BoxGeometry(0.12, WALL_H * 0.6, ROOM), wallUpper);
  rightUpper.position.set(ROOM / 2, WALL_H * 0.3 + 0.8, 0);
  room.add(rightUpper);
  // Right wall — lower
  const rightLower = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.8, ROOM), wallLower);
  rightLower.position.set(ROOM / 2, 0.4, 0);
  room.add(rightLower);

  // ── Baseboards (踢脚线) ──
  const baseMat = new THREE.MeshLambertMaterial({ color: 0xF5F0E8 });
  const bh = 0.12;
  // Back
  const bb = new THREE.Mesh(new THREE.BoxGeometry(ROOM + 0.04, bh, 0.06), baseMat);
  bb.position.set(0, bh / 2, -ROOM / 2 + 0.09);
  room.add(bb);
  // Left
  const bl = new THREE.Mesh(new THREE.BoxGeometry(0.06, bh, ROOM + 0.04), baseMat);
  bl.position.set(-ROOM / 2 + 0.09, bh / 2, 0);
  room.add(bl);
  // Right
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.06, bh, ROOM + 0.04), baseMat);
  br.position.set(ROOM / 2 - 0.09, bh / 2, 0);
  room.add(br);

  // ── Chair rail / wainscoting cap (腰线) ──
  const railMat = new THREE.MeshLambertMaterial({ color: 0xEDE8DD });
  // Back
  const rb = new THREE.Mesh(new THREE.BoxGeometry(ROOM + 0.04, 0.04, 0.04), railMat);
  rb.position.set(0, 0.82, -ROOM / 2 + 0.09);
  room.add(rb);
  // Left
  const rl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, ROOM + 0.04), railMat);
  rl.position.set(-ROOM / 2 + 0.09, 0.82, 0);
  room.add(rl);
  // Right
  const rr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, ROOM + 0.04), railMat);
  rr.position.set(ROOM / 2 - 0.09, 0.82, 0);
  room.add(rr);

  // ── Window on back wall (窗框 + 玻璃) ──
  const frameMat = new THREE.MeshLambertMaterial({ color: 0xF5F0E8 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0xB0D4F1, transparent: true, opacity: 0.4 });
  const ww = 1.6, wh = 1.2;
  const wy = 1.6; // window center height
  const wz = -ROOM / 2 + 0.08;
  // Frame — top
  room.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(ww + 0.12, 0.08, 0.08), frameMat), { position: new THREE.Vector3(0, wy + wh / 2, wz) }));
  // Frame — bottom
  room.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(ww + 0.12, 0.08, 0.08), frameMat), { position: new THREE.Vector3(0, wy - wh / 2, wz) }));
  // Frame — left
  room.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.08, wh + 0.08, 0.08), frameMat), { position: new THREE.Vector3(-ww / 2, wy, wz) }));
  // Frame — right
  room.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.08, wh + 0.08, 0.08), frameMat), { position: new THREE.Vector3(ww / 2, wy, wz) }));
  // Frame — center vertical
  room.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.05, wh, 0.06), frameMat), { position: new THREE.Vector3(0, wy, wz) }));
  // Frame — center horizontal
  room.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(ww, 0.05, 0.06), frameMat), { position: new THREE.Vector3(0, wy, wz) }));
  // Glass pane
  room.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(ww - 0.1, wh - 0.1, 0.02), glassMat), { position: new THREE.Vector3(0, wy, wz) }));

  // ── Window sill (窗台) ──
  const sill = new THREE.Mesh(
    new THREE.BoxGeometry(ww + 0.2, 0.06, 0.18),
    new THREE.MeshLambertMaterial({ color: 0xEDE8DD }),
  );
  sill.position.set(0, wy - wh / 2 - 0.03, wz + 0.09);
  room.add(sill);

  // ── Crown molding (天花板石膏线) ──
  const crownMat = new THREE.MeshLambertMaterial({ color: 0xF8F5F0 });
  const ch = 0.1;
  // Back
  room.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(ROOM + 0.08, ch, 0.08), crownMat), { position: new THREE.Vector3(0, WALL_H - ch / 2, -ROOM / 2 + 0.06) }));
  // Left
  room.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.08, ch, ROOM + 0.08), crownMat), { position: new THREE.Vector3(-ROOM / 2 + 0.06, WALL_H - ch / 2, 0) }));
  // Right
  room.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.08, ch, ROOM + 0.08), crownMat), { position: new THREE.Vector3(ROOM / 2 - 0.06, WALL_H - ch / 2, 0) }));

  // ── Ceiling edge (visible from isometric view) ──
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM, 0.08, ROOM),
    new THREE.MeshLambertMaterial({ color: 0xFAFAFA }),
  );
  ceiling.position.set(0, WALL_H, 0);
  room.add(ceiling);

  // ── Subtle area rug (地毯) ──
  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.015, 1.6),
    new THREE.MeshLambertMaterial({ color: 0xC4956A }),
  );
  rug.position.set(0, 0.008, 0);
  room.add(rug);
  // Rug border
  const rugBorder = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.012, 1.8),
    new THREE.MeshLambertMaterial({ color: 0xA67B52 }),
  );
  rugBorder.position.set(0, 0.005, 0);
  room.add(rugBorder);

  return room;
}

// ── Furniture mesh factory ──────────────────────────────────────────
function createFurnitureMesh(furniture: Furniture): THREE.Group {
  const defaults = FURNITURE_DEFAULTS[furniture.type];
  const scale = furniture.scale;
  const w = defaults.w * scale;
  const h = defaults.h * scale;
  const d = defaults.d * scale;
  const color = furniture.color || defaults.color;

  const group = new THREE.Group();
  group.userData = { furnitureId: furniture.id };

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(color) }),
  );
  body.position.y = h / 2;
  group.add(body);

  // Type-specific details
  if (furniture.type === 'bed') {
    // Mattress
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.95, h * 0.4, d * 0.95),
      new THREE.MeshLambertMaterial({ color: 0xFFF8F0 }),
    );
    mattress.position.y = h + h * 0.4 * 0.5;
    group.add(mattress);
  }

  if (furniture.type === 'sofa') {
    // Backrest
    const backH = h * 0.6;
    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(w, backH, 0.15 * scale),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(0.75) }),
    );
    backrest.position.set(0, h + backH / 2, -d / 2 + 0.075 * scale);
    group.add(backrest);
  }

  if (furniture.type === 'bookshelf') {
    // 3 shelf dividers
    const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(0.9) });
    for (let i = 1; i <= 3; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.98, 0.03 * scale, d * 0.95),
        mat,
      );
      shelf.position.y = (h / 4) * i;
      group.add(shelf);
    }
  }

  if (furniture.type === 'fridge') {
    // Door line on front face
    const doorLine = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.98, 0.02 * scale, 0.01),
      new THREE.MeshLambertMaterial({ color: 0x999999 }),
    );
    doorLine.position.set(0, h * 0.45, d / 2 + 0.005);
    group.add(doorLine);
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

function createPresetScenes(): Scene[] {
  return [
    {
      id: makeId(),
      name: '客厅',
      emoji: '🛋️',
      isCustom: false,
      sortOrder: 0,
      thumbnail: '',
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
      furniture: [
        createFurnitureItem('sink', -1.5, 1.8, 180),
        createFurnitureItem('washing-machine', 1.5, 1.8, 180),
      ],
    },
    {
      id: makeId(),
      name: '大学宿舍',
      emoji: '🏫',
      isCustom: false,
      sortOrder: 4,
      thumbnail: '',
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

// ── Component ───────────────────────────────────────────────────────
export default function Scene3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number>(0);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const highlightedRef = useRef<THREE.Object3D | null>(null);

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedFurniture, setSelectedFurniture] = useState<Furniture | null>(null);
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [showFurniturePicker, setShowFurniturePicker] = useState(false);
  const [showSceneManager, setShowSceneManager] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneEmoji, setNewSceneEmoji] = useState('🏠');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '', category: '日用', quantity: 1, price: 0,
    purchaseDate: '', note: '', photos: [] as PhotoRef[],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    scene: Scene; furniture: Furniture; item: Item;
  }>>([]);
  const [pendingHighlight, setPendingHighlight] = useState<string | null>(null);
  const [showFurnitureEditor, setShowFurnitureEditor] = useState(false);
  const [editingFurniture, setEditingFurniture] = useState<Furniture | null>(null);
  const [editForm, setEditForm] = useState({ name: '', color: '', x: 0, z: 0, rotation: 0, scale: 1 });
  const [showStats, setShowStats] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load / init scenes ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let data = await getAllScenes();
        if (data.length === 0) {
          const presets = createPresetScenes();
          for (const s of presets) await saveScene(s);
          data = presets;
        }
        if (cancelled) return;
        setScenes(data);
        setActiveSceneId(data[0].id);
      } catch (e) {
        console.error('Failed to load scenes', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Three.js init ───────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xE8E4DC);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      35,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(6, 6, 6);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.sortObjects = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting — warm, soft
    scene.add(new THREE.AmbientLight(0xFFF5E6, 0.5));
    const dirLight = new THREE.DirectionalLight(0xFFF8F0, 0.9);
    dirLight.position.set(4, 8, 4);
    scene.add(dirLight);
    // Fill light from the side for depth
    const fillLight = new THREE.DirectionalLight(0xE8F0FF, 0.3);
    fillLight.position.set(-3, 5, -2);
    scene.add(fillLight);

    // Room
    scene.add(createRoom());

    // Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Furniture rendering ─────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !activeSceneId) return;

    // Remove old furniture meshes
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.userData.furnitureId) {
        toRemove.push(obj);
      }
    });
    for (const obj of toRemove) {
      scene.remove(obj);
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    }

    // Add new furniture
    const activeScene = scenes.find((s) => s.id === activeSceneId);
    if (!activeScene) return;

    for (const furniture of activeScene.furniture) {
      scene.add(createFurnitureMesh(furniture));
    }
  }, [scenes, activeSceneId]);

  // ── Pending highlight effect (after scene switch from search) ────
  useEffect(() => {
    if (!pendingHighlight) return;
    const timer = setTimeout(() => {
      const scene = sceneRef.current;
      if (!scene) return;
      scene.traverse(obj => {
        if (obj.userData?.furnitureId === pendingHighlight) {
          obj.traverse(child => {
            if (child instanceof THREE.Mesh) {
              child.userData._origMaterial = child.material;
              child.material = new THREE.MeshBasicMaterial({
                color: new THREE.Color('#fb6400'),
                transparent: true,
                opacity: 0.3,
              });
            }
          });
          highlightedRef.current = obj;
          setTimeout(() => {
            obj.traverse(child => {
              if (child instanceof THREE.Mesh && child.userData._origMaterial) {
                child.material = child.userData._origMaterial;
                delete child.userData._origMaterial;
              }
            });
            highlightedRef.current = null;
          }, 3000);
        }
      });
      setPendingHighlight(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [pendingHighlight, activeSceneId]);

  // ── Click handler for furniture detection ───────────────────────
  const handleClick = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!container || !camera || !scene) return;

    const rect = container.getBoundingClientRect();
    pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(pointer.current, camera);

    const meshes: THREE.Object3D[] = [];
    scene.traverse(obj => { if (obj.userData?.furnitureId) meshes.push(obj); });
    const intersects = raycaster.current.intersectObjects(meshes, true);

    // Remove previous highlight
    if (highlightedRef.current) {
      highlightedRef.current.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.userData._origMaterial) {
          obj.material = obj.userData._origMaterial;
          delete obj.userData._origMaterial;
        }
      });
      highlightedRef.current = null;
    }

    if (intersects.length > 0) {
      let target = intersects[0].object as THREE.Object3D;
      while (target && !target.userData?.furnitureId) target = target.parent!;
      if (target?.userData?.furnitureId) {
        const fid = target.userData.furnitureId as string;
        const activeScene = scenes.find(s => s.id === activeSceneId);
        const furniture = activeScene?.furniture.find(f => f.id === fid);
        if (furniture) {
          setSelectedFurniture(furniture);
          setShowItemPanel(true);
          // Highlight with orange tint
          target.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
              obj.userData._origMaterial = obj.material;
              obj.material = new THREE.MeshBasicMaterial({
                color: new THREE.Color('#fb6400'),
                transparent: true,
                opacity: 0.3,
              });
            }
          });
          highlightedRef.current = target;
        }
      }
    }
  }, [scenes, activeSceneId]);

  // ── Scene switcher ──────────────────────────────────────────────
  const handleSceneChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveSceneId(e.target.value);
  }, []);

  // ── Furniture context menu handler ──────────────────────────────────
  const handleFurnitureContext = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!container || !camera || !scene) return;

    const rect = container.getBoundingClientRect();
    pointer.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(pointer.current, camera);

    const meshes: THREE.Object3D[] = [];
    scene.traverse(obj => { if (obj.userData?.furnitureId) meshes.push(obj); });
    const intersects = raycaster.current.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let target = intersects[0].object as THREE.Object3D;
      while (target && !target.userData?.furnitureId) target = target.parent!;
      if (target?.userData?.furnitureId) {
        const fid = target.userData.furnitureId as string;
        const activeScene = scenes.find(s => s.id === activeSceneId);
        const furniture = activeScene?.furniture.find(f => f.id === fid);
        if (furniture) {
          setEditingFurniture(furniture);
          setEditForm({
            name: furniture.name,
            color: furniture.color,
            x: furniture.position.x,
            z: furniture.position.z,
            rotation: furniture.rotation,
            scale: furniture.scale,
          });
          setShowFurnitureEditor(true);
        }
      }
    }
  }, [scenes, activeSceneId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 140px)' }}>
        <p className="text-gray-500 text-lg">加载中...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 140px)' }}>
      <div ref={containerRef} className="w-full h-full"
        onPointerDown={(e) => {
          handleClick(e);
          longPressTimer.current = setTimeout(() => {
            handleFurnitureContext(e.clientX, e.clientY);
          }, 500);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          handleFurnitureContext(e.clientX, e.clientY);
        }}
        onPointerUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
        onPointerLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
      />
      {/* Scene switcher dropdown */}
      <div className="absolute top-4 right-4 z-10">
        <select
          value={activeSceneId}
          onChange={handleSceneChange}
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji} {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Search bar */}
      <div className="absolute top-4 left-4 z-10 max-w-xs w-64">
        <input type="text" placeholder="🔍 搜索物品..."
          value={searchQuery} onChange={e => {
            const q = e.target.value;
            setSearchQuery(q);
            if (!q.trim()) { setSearchResults([]); return; }
            const results: Array<{ scene: Scene; furniture: Furniture; item: Item }> = [];
            for (const scene of scenes) {
              for (const furniture of scene.furniture) {
                for (const item of furniture.items) {
                  if (item.name.toLowerCase().includes(q.toLowerCase())) {
                    results.push({ scene, furniture, item });
                  }
                }
              }
            }
            setSearchResults(results);
          }}
          className="w-full bg-black/50 backdrop-blur text-white px-3 py-2 rounded-lg border border-white/20 text-sm placeholder-white/40 focus:border-[#fb6400] outline-none" />

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-1 bg-[#1a1a2e] border border-white/10 rounded-xl max-h-60 overflow-y-auto">
            {searchResults.map((r, i) => (
              <button key={i} onClick={() => {
                setActiveSceneId(r.scene.id);
                setSearchQuery('');
                setSearchResults([]);
                setPendingHighlight(r.furniture.id);
              }}
                className="w-full px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors">
                <div className="text-white text-sm">{r.item.name} ×{r.item.quantity}</div>
                <div className="text-white/30 text-xs">{r.scene.emoji} {r.scene.name} › {r.furniture.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        <button onClick={() => setShowFurniturePicker(true)}
          className="px-4 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl text-sm font-medium transition-colors shadow-lg">
          + 添加家具
        </button>
        <button onClick={() => setShowSceneManager(true)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors backdrop-blur">
          管理场景
        </button>
        <button onClick={() => setShowStats(true)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors backdrop-blur">
          📊 统计
        </button>
      </div>

      {/* Furniture Picker Modal */}
      {showFurniturePicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl border border-white/10 w-full max-w-lg max-h-[70vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">添加家具</h3>
              <button onClick={() => setShowFurniturePicker(false)}
                className="text-white/50 hover:text-white text-xl">&times;</button>
            </div>

            {([
              { group: '收纳类', types: ['wardrobe', 'bookshelf', 'shoe-cabinet', 'drawer-cabinet', 'nightstand'] as FurnitureType[] },
              { group: '桌类', types: ['desk', 'dining-table', 'coffee-table'] as FurnitureType[] },
              { group: '其他', types: ['bed', 'sofa', 'tv-cabinet', 'fridge', 'washing-machine', 'sink'] as FurnitureType[] },
            ]).map(({ group, types }) => (
              <div key={group} className="mb-4">
                <h4 className="text-white/50 text-xs mb-2 uppercase tracking-wider">{group}</h4>
                <div className="grid grid-cols-3 gap-2">
                  {types.map(type => {
                    const def = FURNITURE_DEFAULTS[type];
                    return (
                      <button key={type} onClick={() => {
                        const newFurniture: Furniture = {
                          id: crypto.randomUUID(),
                          type,
                          name: def.name,
                          color: '',
                          position: { x: 0, z: 0 },
                          rotation: 0,
                          scale: 1,
                          addedAt: Date.now(),
                          items: [],
                        };
                        setScenes(prev => {
                          const updated = prev.map(s => {
                            if (s.id !== activeSceneId) return s;
                            return { ...s, furniture: [...s.furniture, newFurniture] };
                          });
                          const active = updated.find(s => s.id === activeSceneId);
                          if (active) saveScene(active);
                          return updated;
                        });
                        setShowFurniturePicker(false);
                      }}
                        className="glass-card p-3 rounded-xl text-center hover:border-[#fb6400]/30 transition-colors">
                        <div className="text-2xl mb-1">{def.emoji}</div>
                        <div className="text-white text-xs">{def.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scene Manager Modal */}
      {showSceneManager && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl border border-white/10 w-full max-w-lg max-h-[70vh] overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">场景管理</h3>
              <button onClick={() => setShowSceneManager(false)}
                className="text-white/50 hover:text-white text-xl">&times;</button>
            </div>

            {/* Scene list */}
            <div className="space-y-2 mb-4">
              {[...scenes].sort((a, b) => a.sortOrder - b.sortOrder).map(scene => (
                <div key={scene.id} className="glass-card p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{scene.emoji}</span>
                    <span className="text-white">{scene.name}</span>
                    {!scene.isCustom && <span className="text-white/30 text-xs">(预设)</span>}
                  </div>
                  <div className="flex gap-1">
                    {scene.isCustom && (
                      <button onClick={async () => {
                        if (!confirm(`确定删除场景「${scene.name}」？`)) return;
                        await deleteScene(scene.id);
                        setScenes(prev => {
                          const updated = prev.filter(s => s.id !== scene.id);
                          if (activeSceneId === scene.id && updated.length > 0) {
                            setActiveSceneId(updated[0].id);
                          }
                          return updated;
                        });
                      }}
                        className="px-2 py-1 text-red-400 hover:bg-red-500/10 rounded text-xs">
                        删除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add new scene */}
            <div className="border-t border-white/10 pt-4">
              <h4 className="text-white/50 text-xs mb-2">添加新场景</h4>
              <div className="flex gap-2">
                <input type="text" placeholder="场景名称" value={newSceneName}
                  onChange={e => setNewSceneName(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/30 focus:border-[#fb6400] outline-none" />
                <input type="text" placeholder="🏠" value={newSceneEmoji} maxLength={2}
                  onChange={e => setNewSceneEmoji(e.target.value)}
                  className="w-14 bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-sm text-center focus:border-[#fb6400] outline-none" />
                <button onClick={async () => {
                  if (!newSceneName.trim()) return;
                  const newScene: Scene = {
                    id: crypto.randomUUID(),
                    name: newSceneName.trim(),
                    emoji: newSceneEmoji || '🏠',
                    isCustom: true,
                    sortOrder: scenes.length,
                    thumbnail: '',
                    furniture: [],
                  };
                  await saveScene(newScene);
                  setScenes(prev => [...prev, newScene]);
                  setActiveSceneId(newScene.id);
                  setNewSceneName('');
                  setNewSceneEmoji('🏠');
                  setShowSceneManager(false);
                }}
                  className="px-4 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
                  添加
                </button>
              </div>
            </div>

            {/* Import/Export */}
            <div className="border-t border-white/10 pt-4 mt-4 flex gap-2">
              <button onClick={async () => {
                const json = await exportData();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tianjige-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors">
                📤 导出数据
              </button>
              <label className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors text-center cursor-pointer">
                📥 导入数据
                <input type="file" accept=".json" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  try {
                    await importData(text, 'merge');
                    const updated = await getAllScenes();
                    setScenes(updated);
                    if (updated.length > 0) setActiveSceneId(updated[0].id);
                    alert('导入成功！');
                  } catch { alert('导入失败，数据格式不正确'); }
                }} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Furniture Editor Modal */}
      {showFurnitureEditor && editingFurniture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] rounded-2xl w-full max-w-md mx-4 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white text-lg font-bold">编辑家具</h3>
              <button onClick={() => setShowFurnitureEditor(false)}
                className="text-white/50 hover:text-white text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-white/70 text-sm mb-1 block">名称</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
              </div>
              {/* Color */}
              <div>
                <label className="text-white/70 text-sm mb-1 block">颜色</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={editForm.color || FURNITURE_DEFAULTS[editingFurniture.type].color}
                    onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
                  <span className="text-white/50 text-sm">{editForm.color || '默认'}</span>
                  <button onClick={() => setEditForm(f => ({ ...f, color: '' }))}
                    className="ml-auto px-3 py-1 text-xs text-white/70 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors">
                    恢复默认
                  </button>
                </div>
              </div>
              {/* Position */}
              <div>
                <label className="text-white/70 text-sm mb-1 block">位置</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-white/50 text-xs mb-1 block">X</label>
                    <input type="number" step={0.5} value={editForm.x}
                      onChange={e => setEditForm(f => ({ ...f, x: Number(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
                  </div>
                  <div className="flex-1">
                    <label className="text-white/50 text-xs mb-1 block">Z</label>
                    <input type="number" step={0.5} value={editForm.z}
                      onChange={e => setEditForm(f => ({ ...f, z: Number(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
                  </div>
                </div>
              </div>
              {/* Rotation */}
              <div>
                <label className="text-white/70 text-sm mb-1 block">旋转 ({editForm.rotation}°)</label>
                <div className="flex gap-2">
                  <button onClick={() => setEditForm(f => ({ ...f, rotation: (f.rotation - 90 + 360) % 360 }))}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm border border-white/10 transition-colors">
                    ↺ 左旋
                  </button>
                  <button onClick={() => setEditForm(f => ({ ...f, rotation: (f.rotation + 90) % 360 }))}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm border border-white/10 transition-colors">
                    ↻ 右旋
                  </button>
                </div>
              </div>
              {/* Scale */}
              <div>
                <label className="text-white/70 text-sm mb-1 block">缩放 ({editForm.scale.toFixed(1)}x)</label>
                <input type="range" min={0.5} max={2} step={0.1} value={editForm.scale}
                  onChange={e => setEditForm(f => ({ ...f, scale: Number(e.target.value) }))}
                  className="w-full accent-[#fb6400]" />
              </div>
            </div>
            <div className="p-5 border-t border-white/10 flex gap-3">
              <button onClick={() => {
                if (!editingFurniture) return;
                const updatedFurniture: Furniture = {
                  ...editingFurniture,
                  name: editForm.name,
                  color: editForm.color,
                  position: { x: editForm.x, z: editForm.z },
                  rotation: editForm.rotation,
                  scale: editForm.scale,
                };
                setScenes(prev => {
                  const updated = prev.map(s => {
                    if (s.id !== activeSceneId) return s;
                    return {
                      ...s,
                      furniture: s.furniture.map(f => f.id === editingFurniture.id ? updatedFurniture : f),
                    };
                  });
                  const active = updated.find(s => s.id === activeSceneId);
                  if (active) saveScene(active);
                  return updated;
                });
                setShowFurnitureEditor(false);
                setEditingFurniture(null);
              }} className="flex-1 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl font-medium transition-colors">
                保存
              </button>
              <button onClick={() => {
                if (!editingFurniture) return;
                if (!confirm(`确定删除「${editingFurniture.name}」？此操作不可撤销。`)) return;
                setScenes(prev => {
                  const updated = prev.map(s => {
                    if (s.id !== activeSceneId) return s;
                    return {
                      ...s,
                      furniture: s.furniture.filter(f => f.id !== editingFurniture.id),
                    };
                  });
                  const active = updated.find(s => s.id === activeSceneId);
                  if (active) saveScene(active);
                  return updated;
                });
                setShowFurnitureEditor(false);
                setEditingFurniture(null);
              }} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors border border-red-500/30">
                删除
              </button>
              <button onClick={() => { setShowFurnitureEditor(false); setEditingFurniture(null); }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl font-medium transition-colors border border-white/10">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Panel */}
      {showItemPanel && selectedFurniture && (
        <div className="absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-[#0a0a1a]/95 backdrop-blur-md border-l border-white/10 z-20 flex flex-col animate-slide-in-right">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-white font-bold">{FURNITURE_DEFAULTS[selectedFurniture.type].emoji} {selectedFurniture.name}</h2>
            <button onClick={() => { setShowItemPanel(false); setSelectedFurniture(null); }}
              className="text-white/50 hover:text-white text-xl">&times;</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {selectedFurniture.items.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-8">还没有物品，点击下方添加</p>
            ) : (
              selectedFurniture.items.map(item => (
                <div key={item.id} className="glass-card p-3 rounded-xl cursor-pointer hover:ring-1 hover:ring-[#fb6400]/50 transition-all"
                  onClick={() => {
                    setEditingItem(item);
                    setItemForm({
                      name: item.name,
                      category: item.category,
                      quantity: item.quantity,
                      price: item.price,
                      purchaseDate: item.purchaseDate,
                      note: item.note,
                      photos: item.photos,
                    });
                    setShowItemEditor(true);
                  }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-white font-medium">{item.name}</span>
                      <span className="text-white/50 text-sm ml-2">×{item.quantity}</span>
                    </div>
                    {item.price > 0 && <span className="text-[#fb6400] text-sm">¥{item.price}</span>}
                  </div>
                  {item.category && <span className="text-white/30 text-xs">{item.category}</span>}
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-white/10">
            <button onClick={() => {
              setEditingItem(null);
              setItemForm({ name: '', category: '日用', quantity: 1, price: 0, purchaseDate: '', note: '', photos: [] });
              setShowItemEditor(true);
            }} className="w-full py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl font-medium transition-colors">
              + 添加物品
            </button>
          </div>
        </div>
      )}

      {/* Item Editor Modal */}
      {showItemEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onPaste={async (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                  const { blob: _blob, ...photoData } = await generateThumbnail(file);
                  setItemForm(f => ({
                    ...f, photos: [...f.photos, { id: crypto.randomUUID(), ...photoData }]
                  }));
                }
              }
            }
          }}>
          <div className="bg-[#1a1a2e] rounded-2xl w-full max-w-md mx-4 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-white/10">
              <h3 className="text-white text-lg font-bold">{editingItem ? '编辑物品' : '添加物品'}</h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-white/70 text-sm mb-1 block">名称</label>
                <input type="text" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" placeholder="物品名称" />
              </div>
              {/* Category */}
              <div>
                <label className="text-white/70 text-sm mb-1 block">分类</label>
                <select value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]">
                  {['衣物', '书籍', '电子', '食品', '日用', '其他'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {/* Quantity + Price */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-white/70 text-sm mb-1 block">数量</label>
                  <input type="number" min={1} value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
                </div>
                <div className="flex-1">
                  <label className="text-white/70 text-sm mb-1 block">价格 (¥)</label>
                  <input type="number" min={0} step={0.01} value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: Math.max(0, Number(e.target.value)) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
                </div>
              </div>
              {/* Date */}
              <div>
                <label className="text-white/70 text-sm mb-1 block">购买日期</label>
                <input type="date" value={itemForm.purchaseDate} onChange={e => setItemForm(f => ({ ...f, purchaseDate: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
              </div>
              {/* Note */}
              <div>
                <label className="text-white/70 text-sm mb-1 block">备注</label>
                <textarea value={itemForm.note} onChange={e => setItemForm(f => ({ ...f, note: e.target.value }))} rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400] resize-none" placeholder="备注信息..." />
              </div>
              {/* Photos */}
              <div>
                <label className="text-white/70 text-sm mb-1 block">照片</label>
                <p className="text-white/40 text-xs mb-2">在输入框中可直接 Ctrl+V 粘贴图片</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {itemForm.photos.map(photo => (
                    <div key={photo.id} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                      <img src={photo.thumbnail} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setItemForm(f => ({ ...f, photos: f.photos.filter(p => p.id !== photo.id) }))}
                        className="absolute top-0 right-0 w-5 h-5 bg-red-500/80 text-white text-xs rounded-bl-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[#fb6400]/50 transition-colors">
                    <span className="text-xl">📷</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const { blob: _blob, ...photoData } = await generateThumbnail(file);
                        setItemForm(f => ({ ...f, photos: [...f.photos, { id: crypto.randomUUID(), ...photoData }] }));
                      }
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-white/10 flex gap-3">
              <button onClick={() => {
                // Save logic
                const now = Date.now();
                const newItem: Item = editingItem
                  ? { ...editingItem, ...itemForm, updatedAt: now }
                  : { id: crypto.randomUUID(), ...itemForm, createdAt: now, updatedAt: now };

                setScenes(prev => prev.map(scene => {
                  if (scene.id !== activeSceneId) return scene;
                  return {
                    ...scene,
                    furniture: scene.furniture.map(f => {
                      if (f.id !== selectedFurniture?.id) return f;
                      const items = editingItem
                        ? f.items.map(i => i.id === editingItem.id ? newItem : i)
                        : [...f.items, newItem];
                      return { ...f, items };
                    }),
                  };
                }));
                if (selectedFurniture) {
                  const items = editingItem
                    ? selectedFurniture.items.map(i => i.id === editingItem.id ? newItem : i)
                    : [...selectedFurniture.items, newItem];
                  const updated = { ...selectedFurniture, items };
                  setSelectedFurniture(updated);
                  // Persist
                  const scene = scenes.find(s => s.id === activeSceneId);
                  if (scene) {
                    saveScene({
                      ...scene,
                      furniture: scene.furniture.map(f => f.id === updated.id ? updated : f),
                    });
                  }
                }
                setShowItemEditor(false);
                setEditingItem(null);
              }} className="flex-1 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl font-medium transition-colors">
                保存
              </button>
              {editingItem && (
                <button onClick={() => {
                  // Delete logic
                  setScenes(prev => prev.map(scene => {
                    if (scene.id !== activeSceneId) return scene;
                    return {
                      ...scene,
                      furniture: scene.furniture.map(f => {
                        if (f.id !== selectedFurniture?.id) return f;
                        return { ...f, items: f.items.filter(i => i.id !== editingItem.id) };
                      }),
                    };
                  }));
                  if (selectedFurniture) {
                    const updated = { ...selectedFurniture, items: selectedFurniture.items.filter(i => i.id !== editingItem.id) };
                    setSelectedFurniture(updated);
                    const scene = scenes.find(s => s.id === activeSceneId);
                    if (scene) {
                      saveScene({
                        ...scene,
                        furniture: scene.furniture.map(f => f.id === updated.id ? updated : f),
                      });
                    }
                  }
                  setShowItemEditor(false);
                  setEditingItem(null);
                }} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors border border-red-500/30">
                  删除
                </button>
              )}
              <button onClick={() => { setShowItemEditor(false); setEditingItem(null); }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl font-medium transition-colors border border-white/10">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Stats Panel */}
      {showStats && (() => {
        const allItems = scenes.flatMap(s => s.furniture.flatMap(f => f.items));
        const totalItems = allItems.reduce((sum, i) => sum + i.quantity, 0);
        const totalValue = allItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

        const byScene = [...scenes].map(s => ({
          name: `${s.emoji} ${s.name}`,
          count: s.furniture.reduce((sum, f) => sum + f.items.reduce((s2, i) => s2 + i.quantity, 0), 0),
          value: s.furniture.reduce((sum, f) => sum + f.items.reduce((s2, i) => s2 + i.price * i.quantity, 0), 0),
        })).filter(s => s.count > 0);

        const categoryMap = new Map<string, { count: number; value: number }>();
        for (const item of allItems) {
          const existing = categoryMap.get(item.category) || { count: 0, value: 0 };
          existing.count += item.quantity;
          existing.value += item.price * item.quantity;
          categoryMap.set(item.category, existing);
        }
        const byCategory = Array.from(categoryMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.count - a.count);

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl border border-white/10 w-full max-w-md max-h-[70vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold">📊 资产统计</h3>
                <button onClick={() => setShowStats(false)}
                  className="text-white/50 hover:text-white text-xl">&times;</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="glass-card p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#fb6400]">{totalItems}</div>
                  <div className="text-white/50 text-xs">总物品数</div>
                </div>
                <div className="glass-card p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-[#fb6400]">¥{totalValue.toLocaleString()}</div>
                  <div className="text-white/50 text-xs">总价值</div>
                </div>
              </div>

              {byScene.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-white/50 text-xs mb-2 uppercase tracking-wider">按场景</h4>
                  {byScene.map(s => (
                    <div key={s.name} className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-white text-sm">{s.name}</span>
                      <span className="text-white/50 text-sm">{s.count}件 ¥{s.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {byCategory.length > 0 && (
                <div>
                  <h4 className="text-white/50 text-xs mb-2 uppercase tracking-wider">按分类</h4>
                  {byCategory.map(c => (
                    <div key={c.name} className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-white text-sm">{c.name}</span>
                      <span className="text-white/50 text-sm">{c.count}件 ¥{c.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {allItems.length === 0 && (
                <p className="text-white/30 text-sm text-center py-8">还没有添加任何物品</p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
