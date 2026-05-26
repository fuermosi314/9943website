'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Scene,
  Furniture,
  FurnitureType,
  getAllScenes,
  saveScene,
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

  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.1, 5),
    new THREE.MeshLambertMaterial({ color: 0xDEB887 }),
  );
  floor.position.set(0, -0.05, 0);
  room.add(floor);

  // Grid
  const grid = new THREE.GridHelper(5, 10, 0xcccccc, 0xe0e0e0);
  grid.position.y = 0.01;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.15;
  room.add(grid);

  // Back wall
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(5, 2.5, 0.1),
    new THREE.MeshLambertMaterial({ color: 0xF5F5F5 }),
  );
  backWall.position.set(0, 1.25, -2.5);
  room.add(backWall);

  // Left wall
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 2.5, 5),
    new THREE.MeshLambertMaterial({ color: 0xF5F5F5 }),
  );
  leftWall.position.set(-2.5, 1.25, 0);
  room.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 2.5, 5),
    new THREE.MeshLambertMaterial({ color: 0xF5F5F5 }),
  );
  rightWall.position.set(2.5, 1.25, 0);
  room.add(rightWall);

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
    scene.background = new THREE.Color(0xF0EDE8);
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

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 140px)' }}>
        <p className="text-gray-500 text-lg">加载中...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 140px)' }}>
      <div ref={containerRef} className="w-full h-full" onPointerDown={handleClick} />
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
                <div key={item.id} className="glass-card p-3 rounded-xl">
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
            <button className="w-full py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl font-medium transition-colors">
              + 添加物品
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
