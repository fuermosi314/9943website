'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
import { FURNITURE_DEFAULTS, createRoom, createFurnitureMesh, createPresetScenes } from './FurnitureRenderer';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';

// crypto.randomUUID is unavailable on non-HTTPS LAN IPs
function genId(): string {
  try { return crypto.randomUUID(); } catch { /* fallback below */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface SearchResult {
  scene: Scene;
  furniture: Furniture;
  item: Item;
}

export function useTianjigeState() {
  // ── Three.js refs ────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number>(0);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const highlightedRef = useRef<THREE.Object3D | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const furnitureMeshesRef = useRef<THREE.Object3D[]>([]);
  const cameraModeRef = useRef<'orbit' | 'topdown'>('orbit');
  const topDownKeysRef = useRef({ w: false, a: false, s: false, d: false });
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneRotationRef = useRef(0);

  // Topdown camera: force straight-down rotation (never changes angle)
  const topdownEuler = useMemo(() => new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ'), []);
  const setTopdownPosition = useCallback((camera: THREE.PerspectiveCamera, x: number, y: number, z: number) => {
    camera.position.set(x, y, z);
    camera.rotation.copy(topdownEuler);
  }, [topdownEuler]);

  // ── Drag / move refs ─────────────────────────────────────────────
  const movingFurnitureRef = useRef<Furniture | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const previousPointerPos = useRef<{ x: number; y: number } | null>(null);
  const pointerMoved = useRef(false);
  const draggingFurniture = useRef<Furniture | null>(null);
  const dragOffset = useRef<THREE.Vector3>(new THREE.Vector3());
  const dragPlane = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragFinalPosRef = useRef<{ id: string; x: number; z: number } | null>(null);
  // Pinch-to-zoom refs (topdown mode)
  const pinchStartDist = useRef<number>(0);
  const pinchStartHeight = useRef<number>(0);

  // ── Undo / Redo refs ──────────────────────────────────────────────
  const historyRef = useRef<Scene[][]>([]);
  const historyIndexRef = useRef<number>(-1);
  const skipHistoryRef = useRef(false);
  const roomSizeRef = useRef(5);
  const roomWidthRef = useRef(5);
  const roomDepthRef = useRef(5);

  // ── State ────────────────────────────────────────────────────────
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string>('');
  const activeSceneIdRef = useRef(activeSceneId);
  useEffect(() => { activeSceneIdRef.current = activeSceneId; }, [activeSceneId]);
  const [loading, setLoading] = useState(true);
  const [selectedFurniture, setSelectedFurniture] = useState<Furniture | null>(null);
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [showFurniturePicker, setShowFurniturePicker] = useState(false);
  const [showSceneManager, setShowSceneManager] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneEmoji, setNewSceneEmoji] = useState('🏠');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const nowMinute = new Date().toISOString().slice(0, 16);
  const [itemForm, setItemForm] = useState({
    name: '', category: '日用', quantity: 1, price: 0,
    storageDate: nowMinute, purchaseDate: '', note: '', photos: [] as PhotoRef[],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [pendingHighlight, setPendingHighlight] = useState<string | null>(null);
  const [showFurnitureEditor, setShowFurnitureEditor] = useState(false);
  const [editingFurniture, setEditingFurniture] = useState<Furniture | null>(null);
  const [editForm, setEditForm] = useState({ name: '', color: '', x: 0, z: 0, rotation: 0, scale: 1 });
  const [showStats, setShowStats] = useState(false);
  const [showSceneEditor, setShowSceneEditor] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editSceneName, setEditSceneName] = useState('');
  const [editSceneEmoji, setEditSceneEmoji] = useState('🏠');
  const [isMovingFurniture, setIsMovingFurniture] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [editSceneRoomSize, setEditSceneRoomSize] = useState(5);
  const [editSceneRoomWidth, setEditSceneRoomWidth] = useState(5);
  const [editSceneRoomDepth, setEditSceneRoomDepth] = useState(5);
  const [newSceneRoomSize, setNewSceneRoomSize] = useState(5);
  const [newSceneRoomWidth, setNewSceneRoomWidth] = useState(5);
  const [newSceneRoomDepth, setNewSceneRoomDepth] = useState(5);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'topdown'>('orbit');
  const [confirmState, setConfirmState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' } | null>(null);

  const customConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise(resolve => setConfirmState({ message, resolve }));
  }, []);

  const showToast = useCallback((message: string, type: 'info' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

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
        } else {
          // Deduplicate scenes by name (keep first occurrence)
          const seen = new Set<string>();
          const deduped: typeof data = [];
          for (const s of data) {
            if (!seen.has(s.name)) {
              seen.add(s.name);
              deduped.push(s);
            }
          }
          if (deduped.length < data.length) {
            for (const s of data) {
              if (!deduped.find(d => d.id === s.id)) {
                await deleteScene(s.id);
              }
            }
            data = deduped;
          }
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
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.sortObjects = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls — orbit, zoom, pan
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.update();
    controlsRef.current = controls;

    // Lighting — warm, soft
    scene.add(new THREE.AmbientLight(0xFFF5E6, 0.5));
    const dirLight = new THREE.DirectionalLight(0xFFF8F0, 0.9);
    dirLight.position.set(4, 8, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    dirLight.shadow.camera.left = -6;
    dirLight.shadow.camera.right = 6;
    dirLight.shadow.camera.top = 6;
    dirLight.shadow.camera.bottom = -6;
    dirLight.shadow.bias = -0.001;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xE8F0FF, 0.3);
    fillLight.position.set(-3, 5, -2);
    scene.add(fillLight);

    // Room (tagged for dynamic replacement)
    const room = createRoom();
    room.userData.isRoom = true;
    scene.add(room);

    // Keyboard listeners for top-down movement
    const handleKeyDown = (e: KeyboardEvent) => {
      if (cameraModeRef.current !== 'topdown') return;
      // Don't capture keys when typing in input fields
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') topDownKeysRef.current.w = true;
      if (key === 'a' || key === 'arrowleft') topDownKeysRef.current.a = true;
      if (key === 's' || key === 'arrowdown') topDownKeysRef.current.s = true;
      if (key === 'd' || key === 'arrowright') topDownKeysRef.current.d = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') topDownKeysRef.current.w = false;
      if (key === 'a' || key === 'arrowleft') topDownKeysRef.current.a = false;
      if (key === 's' || key === 'arrowdown') topDownKeysRef.current.s = false;
      if (key === 'd' || key === 'arrowright') topDownKeysRef.current.d = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Render loop
    const moveSpeed = 0.1;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (cameraModeRef.current === 'topdown') {
        const keys = topDownKeysRef.current;
        let dx = 0, dz = 0;
        if (keys.a || keys.d) dx += (keys.d ? 1 : -1) * moveSpeed;
        if (keys.w || keys.s) dz += (keys.w ? -1 : 1) * moveSpeed;

        if (dx !== 0 || dz !== 0) {
          const halfBound = roomSizeRef.current * 0.8;
          const newX = Math.max(-halfBound, Math.min(halfBound, camera.position.x + dx));
          const newZ = Math.max(-halfBound, Math.min(halfBound, camera.position.z + dz));
          setTopdownPosition(camera, newX, camera.position.y, newZ);
        }
      }

      controls.update();
      // In topdown mode, force camera to stay straight down after controls.update()
      if (cameraModeRef.current === 'topdown') {
        camera.rotation.set(-Math.PI / 2, 0, 0);
      }
      // Apply scene rotation (set by rotation buttons)
      scene.rotation.y = sceneRotationRef.current;
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Furniture rendering (diff update) ───────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !activeSceneId) return;

    const activeScene = scenes.find((s) => s.id === activeSceneId);
    if (!activeScene) return;

    // Build map of existing furniture meshes by id
    const existingMeshes = new Map<string, THREE.Group>();
    for (const obj of furnitureMeshesRef.current) {
      if (obj.userData?.furnitureId) {
        existingMeshes.set(obj.userData.furnitureId, obj as THREE.Group);
      }
    }

    const newFurnitureIds = new Set(activeScene.furniture.map((f) => f.id));

    // Remove furniture that no longer exists
    existingMeshes.forEach((mesh, id) => {
      if (!newFurnitureIds.has(id)) {
        scene.remove(mesh);
        mesh.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.geometry.dispose();
          }
        });
      }
    });

    // Add new, update existing
    const newMeshList: THREE.Object3D[] = [];
    for (const furniture of activeScene.furniture) {
      const existing = existingMeshes.get(furniture.id);
      if (!existing) {
        const mesh = createFurnitureMesh(furniture);
        mesh.userData._lastScale = furniture.scale;
        mesh.userData._lastColor = furniture.color || FURNITURE_DEFAULTS[furniture.type].color;
        scene.add(mesh);
        newMeshList.push(mesh);
      } else {
        // Check if position/rotation changed — if so, update in place
        const defaults = FURNITURE_DEFAULTS[furniture.type];
        const color = furniture.color || defaults.color;
        const needsRebuild =
          existing.position.x !== furniture.position.x ||
          existing.position.z !== furniture.position.z ||
          existing.rotation.y !== (furniture.rotation * Math.PI) / 180 ||
          existing.userData._lastScale !== furniture.scale ||
          existing.userData._lastColor !== color;

        if (needsRebuild) {
          // Remove old mesh
          scene.remove(existing);
          existing.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).geometry.dispose();
            }
          });
          // Create fresh mesh
          const mesh = createFurnitureMesh(furniture);
          mesh.userData._lastScale = furniture.scale;
          mesh.userData._lastColor = color;
          scene.add(mesh);
          newMeshList.push(mesh);
        } else {
          existing.userData._lastScale = furniture.scale;
          existing.userData._lastColor = color;
          newMeshList.push(existing);
        }
      }
    }

    furnitureMeshesRef.current = newMeshList;
  }, [scenes, activeSceneId]);

  // ── Active room size ───────────────────────────────────────────
  const activeScene = scenes.find(s => s.id === activeSceneId);
  const activeRoomSize = activeScene?.roomSize ?? 5;
  const activeRoomWidth = activeScene?.roomWidth ?? activeRoomSize;
  const activeRoomDepth = activeScene?.roomDepth ?? activeRoomSize;

  useEffect(() => {
    roomSizeRef.current = activeRoomSize;
    roomWidthRef.current = activeRoomWidth;
    roomDepthRef.current = activeRoomDepth;
  }, [activeRoomSize, activeRoomWidth, activeRoomDepth]);

  // ── Rebuild room when size changes ─────────────────────────────
  useEffect(() => {
    const threeScene = sceneRef.current;
    if (!threeScene) return;
    const toRemove: THREE.Object3D[] = [];
    threeScene.traverse(obj => { if (obj.userData.isRoom) toRemove.push(obj); });
    for (const obj of toRemove) threeScene.remove(obj);
    const room = createRoom(activeRoomWidth, activeRoomDepth);
    room.userData.isRoom = true;
    threeScene.add(room);
  }, [activeRoomWidth, activeRoomDepth]);

  // ── Grid helper for move mode ──────────────────────────────────
  useEffect(() => {
    const threeScene = sceneRef.current;
    if (!threeScene) return;
    const toRemove: THREE.Object3D[] = [];
    threeScene.traverse(obj => { if (obj.userData.isGrid) toRemove.push(obj); });
    for (const obj of toRemove) threeScene.remove(obj);
    if (isMovingFurniture) {
      // 使用较大的尺寸创建网格，覆盖整个房间
      const maxSize = Math.max(activeRoomWidth, activeRoomDepth);
      const grid = new THREE.GridHelper(maxSize, maxSize * 2, 0x888888, 0xcccccc);
      grid.userData.isGrid = true;
      grid.position.y = 0.01;
      const mats = Array.isArray(grid.material) ? grid.material : [grid.material];
      mats.forEach((m: THREE.Material) => { m.transparent = true; m.opacity = 0.3; });
      threeScene.add(grid);
    }
  }, [isMovingFurniture, activeRoomWidth, activeRoomDepth]);

  // ── Undo / Redo ───────────────────────────────────────────────
  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    if (scenes.length === 0) return;
    const snapshot = JSON.parse(JSON.stringify(scenes));
    const history = historyRef.current;
    const idx = historyIndexRef.current;
    historyRef.current = [...history.slice(0, idx + 1), snapshot];
    historyIndexRef.current = historyRef.current.length - 1;
    if (historyRef.current.length > 50) {
      historyRef.current = historyRef.current.slice(-50);
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, [scenes]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        const targetScenes = e.shiftKey
          ? (historyIndexRef.current < historyRef.current.length - 1 ? historyRef.current[++historyIndexRef.current] : null)
          : (historyIndexRef.current > 0 ? historyRef.current[--historyIndexRef.current] : null);
        if (targetScenes) {
          skipHistoryRef.current = true;
          const restored = JSON.parse(JSON.stringify(targetScenes));
          setScenes(restored);
          // 保存到 IndexedDB
          const active = restored.find((s: Scene) => s.id === activeSceneIdRef.current);
          if (active) {
            setSaveStatus('saving');
            saveScene(active).then(() => setSaveStatus('saved'));
          }
          showToast(e.shiftKey ? '已重做' : '已撤销');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Pending highlight effect ────────────────────────────────────
  useEffect(() => {
    if (!pendingHighlight) return;
    const timer = setTimeout(() => {
      const target = furnitureMeshesRef.current.find(
        obj => obj.userData?.furnitureId === pendingHighlight,
      );
      if (target) {
        target.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.userData._origMaterial = child.material;
            child.material = new THREE.MeshBasicMaterial({
              color: new THREE.Color('#fb6400'),
              transparent: true,
              opacity: 0.3,
            });
          }
        });
        highlightedRef.current = target;
        highlightTimeoutRef.current = setTimeout(() => {
          target.traverse(child => {
            if (child instanceof THREE.Mesh && child.userData._origMaterial) {
              child.material = child.userData._origMaterial;
              delete child.userData._origMaterial;
            }
          });
          highlightedRef.current = null;
          highlightTimeoutRef.current = null;
        }, 5000);
      }
      setPendingHighlight(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [pendingHighlight, activeSceneId]);

  // ── Backup reminder ────────────────────────────────────────────
  useEffect(() => {
    const checkBackup = () => {
      const lastBackup = localStorage.getItem('tianjige-last-backup');
      if (!lastBackup || Date.now() - Number(lastBackup) > 24 * 60 * 60 * 1000) {
        setShowBackupReminder(true);
      }
    };
    checkBackup();
    const interval = setInterval(checkBackup, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Scene switcher ──────────────────────────────────────────────
  const handleSceneChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveSceneId(e.target.value);
    // 重置相机到默认视角
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (camera && controls) {
      camera.position.set(10, 10, 10);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, []);

  // ── Raycast helper ──────────────────────────────────────────────
  const raycastFurniture = useCallback((clientX: number, clientY: number): Furniture | null => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!container || !camera || !scene) return null;

    const rect = container.getBoundingClientRect();
    pointer.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(pointer.current, camera);

    const intersects = raycaster.current.intersectObjects(furnitureMeshesRef.current, true);

    if (intersects.length > 0) {
      let target = intersects[0].object as THREE.Object3D;
      while (target && !target.userData?.furnitureId) target = target.parent!;
      if (target?.userData?.furnitureId) {
        const fid = target.userData.furnitureId as string;
        const activeScene = scenes.find(s => s.id === activeSceneId);
        return activeScene?.furniture.find(f => f.id === fid) || null;
      }
    }
    return null;
  }, [scenes, activeSceneId]);

  // ── Remove highlight helper ─────────────────────────────────────
  const removeHighlight = useCallback(() => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    if (highlightedRef.current) {
      highlightedRef.current.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.userData._origMaterial) {
          obj.material = obj.userData._origMaterial;
          delete obj.userData._origMaterial;
        }
      });
      highlightedRef.current = null;
    }
  }, []);

  // ── Add highlight to furniture ──────────────────────────────────
  const addHighlight = useCallback((target: THREE.Object3D) => {
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
  }, []);

  // ── Click handler ───────────────────────────────────────────────
  const handleClick = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!container || !camera || !scene) return;

    const rect = container.getBoundingClientRect();
    pointer.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(pointer.current, camera);

    const intersects = raycaster.current.intersectObjects(furnitureMeshesRef.current, true);

    removeHighlight();

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
          addHighlight(target);
        }
      }
    } else if (showItemPanel) {
      // Clicked empty space while panel is open → close panel
      setShowItemPanel(false);
      setSelectedFurniture(null);
    }
  }, [scenes, activeSceneId, showItemPanel, removeHighlight, addHighlight]);

  // ── Camera focus helper ──────────────────────────────────────────
  const focusOnPosition = useCallback((x: number, z: number) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const start = { x: controls.target.x, z: controls.target.z };
    const startTime = Date.now();
    const duration = 500;
    const animate = () => {
      const t = Math.min(1, (Date.now() - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      controls.target.set(
        start.x + (x - start.x) * ease,
        0,
        start.z + (z - start.z) * ease,
      );
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }, []);

  // ── Add custom furniture ────────────────────────────────────────
  const handleAddCustomFurniture = useCallback((name: string, shape: 'box' | 'cylinder' | 'l-shape', w: number, h: number, d: number, color: string) => {
    w = Math.max(0.1, Math.min(3, w));
    h = Math.max(0.1, Math.min(3, h));
    d = Math.max(0.1, Math.min(3, d));
    const id = genId();
    const gridSize = 0.5;
    const halfRoom = roomSizeRef.current / 2 - 0.5;

    let posX = 0, posZ = 0;
    setScenes(prev => {
      const activeScene = prev.find(s => s.id === activeSceneId);
      const existingPositions = activeScene?.furniture.map(f => f.position) || [];
      for (let attempt = 0; attempt < 20; attempt++) {
        const testX = Math.round((Math.random() * halfRoom * 2 - halfRoom) / gridSize) * gridSize;
        const testZ = Math.round((Math.random() * halfRoom * 2 - halfRoom) / gridSize) * gridSize;
        const overlaps = existingPositions.some(p =>
          Math.abs(p.x - testX) < 1 && Math.abs(p.z - testZ) < 1
        );
        if (!overlaps) { posX = testX; posZ = testZ; break; }
      }
      const newFurniture: Furniture = {
        id, type: 'custom', name, color,
        position: { x: posX, z: posZ },
        rotation: 0, scale: 1, addedAt: Date.now(), items: [],
        customShape: shape, customW: w, customH: h, customD: d,
      };
      const updated = prev.map(s => {
        if (s.id !== activeSceneId) return s;
        return { ...s, furniture: [...s.furniture, newFurniture] };
      });
      const active = updated.find(s => s.id === activeSceneId);
      if (active) {
        setSaveStatus('saving');
        saveScene(active).then(() => setSaveStatus('saved'));
      }
      return updated;
    });
    setShowFurniturePicker(false);
    setPendingHighlight(id);
    focusOnPosition(posX, posZ);
  }, [activeSceneId, focusOnPosition]);

  // ── Add furniture ───────────────────────────────────────────────
  const handleAddFurniture = useCallback((type: FurnitureType) => {
    const def = FURNITURE_DEFAULTS[type];
    const id = genId();
    const gridSize = 0.5;
    const halfRoom = roomSizeRef.current / 2 - 0.5;

    let posX = 0, posZ = 0;
    setScenes(prev => {
      const activeScene = prev.find(s => s.id === activeSceneId);
      const existingPositions = activeScene?.furniture.map(f => f.position) || [];
      for (let attempt = 0; attempt < 20; attempt++) {
        const testX = Math.round((Math.random() * halfRoom * 2 - halfRoom) / gridSize) * gridSize;
        const testZ = Math.round((Math.random() * halfRoom * 2 - halfRoom) / gridSize) * gridSize;
        const overlaps = existingPositions.some(p =>
          Math.abs(p.x - testX) < 1 && Math.abs(p.z - testZ) < 1
        );
        if (!overlaps) { posX = testX; posZ = testZ; break; }
      }
      const newFurniture: Furniture = {
        id, type, name: def.name, color: '',
        position: { x: posX, z: posZ },
        rotation: 0, scale: 1, addedAt: Date.now(), items: [],
      };
      const updated = prev.map(s => {
        if (s.id !== activeSceneId) return s;
        return { ...s, furniture: [...s.furniture, newFurniture] };
      });
      const active = updated.find(s => s.id === activeSceneId);
      if (active) {
        setSaveStatus('saving');
        saveScene(active).then(() => setSaveStatus('saved'));
      }
      return updated;
    });
    setShowFurniturePicker(false);
    setPendingHighlight(id);
    focusOnPosition(posX, posZ);
  }, [activeSceneId, focusOnPosition]);

  // ── Save current scene helper ───────────────────────────────────
  const persistScene = useCallback(async (updatedScenes: Scene[]) => {
    const active = updatedScenes.find(s => s.id === activeSceneId);
    if (active) {
      setSaveStatus('saving');
      await saveScene(active);
      setSaveStatus('saved');
    }
  }, [activeSceneId]);

  // ── Delete furniture ────────────────────────────────────────────
  const handleDeleteFurniture = useCallback((furnitureId: string) => {
    setScenes(prev => {
      const updated = prev.map(s => {
        if (s.id !== activeSceneId) return s;
        return { ...s, furniture: s.furniture.filter(f => f.id !== furnitureId) };
      });
      persistScene(updated);
      return updated;
    });
  }, [activeSceneId, persistScene]);

  // ── Delete furniture (with confirmation) ───────────────────────
  const handleDeleteFurnitureConfirm = useCallback(async (furniture: Furniture) => {
    if (!await customConfirm(`确定删除「${furniture.name}」？`)) return;
    handleDeleteFurniture(furniture.id);
    setShowItemPanel(false);
    setSelectedFurniture(null);
  }, [handleDeleteFurniture, customConfirm]);

  // ── Save furniture editor ───────────────────────────────────────
  const handleSaveFurniture = useCallback(() => {
    if (!editingFurniture) return;
    const updatedFurniture: Furniture = {
      ...editingFurniture,
      name: editForm.name,
      color: editForm.color,
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
      persistScene(updated);
      return updated;
    });
    setShowFurnitureEditor(false);
    setEditingFurniture(null);
  }, [editingFurniture, editForm, activeSceneId, persistScene]);

  // ── Delete from furniture editor ────────────────────────────────
  const handleDeleteFromEditor = useCallback(async () => {
    if (!editingFurniture) return;
    if (!await customConfirm(`确定删除「${editingFurniture.name}」？此操作不可撤销。`)) return;
    handleDeleteFurniture(editingFurniture.id);
    setShowFurnitureEditor(false);
    setEditingFurniture(null);
  }, [editingFurniture, handleDeleteFurniture, customConfirm]);

  // ── Save item ───────────────────────────────────────────────────
  const handleSaveItem = useCallback(() => {
    const now = Date.now();
    const formData = {
      ...itemForm,
      purchaseDate: itemForm.purchaseDate || undefined,
    };
    const newItem: Item = editingItem
      ? { ...editingItem, ...formData, updatedAt: now }
      : { id: genId(), ...formData, createdAt: now, updatedAt: now };

    let savedScene: Scene | undefined;
    setScenes(prev => prev.map(scene => {
      if (scene.id !== activeSceneId) return scene;
      const updated = {
        ...scene,
        furniture: scene.furniture.map(f => {
          if (f.id !== selectedFurniture?.id) return f;
          const items = editingItem
            ? f.items.map(i => i.id === editingItem.id ? newItem : i)
            : [...f.items, newItem];
          const updatedFurniture = { ...f, items };
          setSelectedFurniture(updatedFurniture);
          return updatedFurniture;
        }),
      };
      savedScene = updated;
      return updated;
    }));
    if (savedScene) {
      setSaveStatus('saving');
      saveScene(savedScene).then(() => setSaveStatus('saved'));
    }
    setShowItemEditor(false);
    setEditingItem(null);
  }, [editingItem, itemForm, selectedFurniture, activeSceneId]);

  // ── Delete item ─────────────────────────────────────────────────
  const handleDeleteItem = useCallback(() => {
    if (!editingItem) return;
    let savedScene: Scene | undefined;
    setScenes(prev => prev.map(scene => {
      if (scene.id !== activeSceneId) return scene;
      const updated = {
        ...scene,
        furniture: scene.furniture.map(f => {
          if (f.id !== selectedFurniture?.id) return f;
          const updatedFurniture = { ...f, items: f.items.filter(i => i.id !== editingItem.id) };
          setSelectedFurniture(updatedFurniture);
          return updatedFurniture;
        }),
      };
      savedScene = updated;
      return updated;
    }));
    if (savedScene) {
      setSaveStatus('saving');
      saveScene(savedScene).then(() => setSaveStatus('saved'));
    }
    setShowItemEditor(false);
    setEditingItem(null);
  }, [editingItem, selectedFurniture, activeSceneId]);

  // ── Scene management ────────────────────────────────────────────
  const handleAddScene = useCallback(async () => {
    if (!newSceneName.trim()) return;
    const newScene: Scene = {
      id: genId(),
      name: newSceneName.trim(),
      emoji: newSceneEmoji || '🏠',
      isCustom: true,
      sortOrder: scenes.length,
      thumbnail: '',
      furniture: [],
      roomSize: newSceneRoomSize,
      roomWidth: newSceneRoomWidth,
      roomDepth: newSceneRoomDepth,
    };
    setSaveStatus('saving');
    await saveScene(newScene);
    setSaveStatus('saved');
    setScenes(prev => [...prev, newScene]);
    setActiveSceneId(newScene.id);
    setNewSceneName('');
    setNewSceneEmoji('🏠');
    setShowSceneManager(false);
  }, [newSceneName, newSceneEmoji, newSceneRoomSize, newSceneRoomWidth, newSceneRoomDepth, scenes.length]);

  const handleSaveSceneEdit = useCallback(async () => {
    if (!editSceneName.trim()) return;
    setScenes(prev => {
      const updated = prev.map(s => {
        if (s.id !== editingSceneId) return s;
        return { ...s, name: editSceneName.trim(), emoji: editSceneEmoji || '🏠', roomSize: editSceneRoomSize, roomWidth: editSceneRoomWidth, roomDepth: editSceneRoomDepth };
      });
      const scene = updated.find(s => s.id === editingSceneId);
      if (scene) {
        setSaveStatus('saving');
        saveScene(scene).then(() => setSaveStatus('saved'));
      }
      return updated;
    });
    setShowSceneEditor(false);
  }, [editSceneName, editSceneEmoji, editSceneRoomSize, editSceneRoomWidth, editSceneRoomDepth, editingSceneId]);

  const handleDeleteScene = useCallback(async (sceneId: string) => {
    if (!await customConfirm(`确定删除场景「${scenes.find(s => s.id === sceneId)?.name}」？`)) return;
    await deleteScene(sceneId);
    setScenes(prev => {
      const updated = prev.filter(s => s.id !== sceneId);
      if (activeSceneId === sceneId && updated.length > 0) {
        setActiveSceneId(updated[0].id);
      }
      return updated;
    });
  }, [scenes, activeSceneId]);

  // ── Copy scene ─────────────────────────────────────────────────
  const handleCopyScene = useCallback((scene: Scene) => {
    const copy: Scene = {
      ...scene,
      id: genId(),
      name: scene.name + ' (副本)',
      isCustom: true,
      sortOrder: scenes.length,
      roomSize: scene.roomSize ?? 5,
      furniture: scene.furniture.map(f => ({
        ...f,
        id: genId(),
        items: f.items.map(i => ({ ...i, id: genId() })),
      })),
    };
    saveScene(copy);
    setScenes(prev => [...prev, copy]);
  }, [scenes.length]);

  // ── Batch delete items ─────────────────────────────────────────
  const handleDeleteItems = useCallback((itemIds: string[]) => {
    let savedScene: Scene | undefined;
    setScenes(prev => prev.map(scene => {
      if (scene.id !== activeSceneId) return scene;
      const updated = {
        ...scene,
        furniture: scene.furniture.map(f => {
          if (f.id !== selectedFurniture?.id) return f;
          const updatedFurniture = { ...f, items: f.items.filter(i => !itemIds.includes(i.id)) };
          setSelectedFurniture(updatedFurniture);
          return updatedFurniture;
        }),
      };
      savedScene = updated;
      return updated;
    }));
    if (savedScene) {
      setSaveStatus('saving');
      saveScene(savedScene).then(() => setSaveStatus('saved'));
    }
  }, [selectedFurniture, activeSceneId]);

  // ── Export / Import ─────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    const json = await exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `天机阁-备份-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    localStorage.setItem('tianjige-last-backup', String(Date.now()));
    setShowBackupReminder(false);
  }, []);

  const handleImport = useCallback(async (file: File, mode: 'merge' | 'replace' = 'merge') => {
    const text = await file.text();
    await importData(text, mode);
    const updated = await getAllScenes();
    setScenes(updated);
    if (updated.length > 0) setActiveSceneId(updated[0].id);
  }, []);

  // ── Search (with debounce) ──────────────────────────────────────
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(() => {
      const results: SearchResult[] = [];
      const lower = q.toLowerCase();
      for (const scene of scenes) {
        for (const furniture of scene.furniture) {
          for (const item of furniture.items) {
            if (item.name.toLowerCase().includes(lower)) {
              results.push({ scene, furniture, item });
            }
          }
        }
      }
      setSearchResults(results);
    }, 150);
  }, [scenes]);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    setActiveSceneId(result.scene.id);
    setSearchQuery('');
    setSearchResults([]);
    setPendingHighlight(result.furniture.id);
    focusOnPosition(result.furniture.position.x, result.furniture.position.z);
  }, [focusOnPosition]);

  // ── Open item editor ────────────────────────────────────────────
  const openItemEditor = useCallback((item: Item | null) => {
    setEditingItem(item);
    if (item) {
      // 兼容旧数据：没有 storageDate 时用 purchaseDate 兜底
      const storageDate = item.storageDate || item.purchaseDate || new Date().toISOString().slice(0, 16);
      setItemForm({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        storageDate: storageDate.length > 10 ? storageDate : storageDate + 'T00:00',
        purchaseDate: item.purchaseDate || '',
        note: item.note,
        photos: item.photos,
      });
    } else {
      const nowMinute = new Date().toISOString().slice(0, 16);
      setItemForm({ name: '', category: '日用', quantity: 1, price: 0, storageDate: nowMinute, purchaseDate: '', note: '', photos: [] });
    }
    setShowItemEditor(true);
  }, []);

  // ── Open furniture editor ───────────────────────────────────────
  const openFurnitureEditor = useCallback((furniture: Furniture) => {
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
  }, []);

  // ── Open scene editor ───────────────────────────────────────────
  const openSceneEditor = useCallback((scene: Scene) => {
    setEditingSceneId(scene.id);
    setEditSceneName(scene.name);
    setEditSceneEmoji(scene.emoji);
    setEditSceneRoomSize(scene.roomSize ?? 5);
    setEditSceneRoomWidth(scene.roomWidth ?? scene.roomSize ?? 5);
    setEditSceneRoomDepth(scene.roomDepth ?? scene.roomSize ?? 5);
    setShowSceneEditor(true);
  }, []);

  // ── Start move mode ─────────────────────────────────────────────
  const startMoveMode = useCallback((furniture: Furniture) => {
    movingFurnitureRef.current = furniture;
    setIsMovingFurniture(true);
    setShowItemPanel(false);
    // Don't disable controls — allow camera movement when not dragging furniture
  }, []);

  const stopMoveMode = useCallback(() => {
    setIsMovingFurniture(false);
    movingFurnitureRef.current = null;
    draggingFurniture.current = null;
  }, []);

  // ── Camera mode toggle ─────────────────────────────────────────
  const toggleCameraMode = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const threeScene = sceneRef.current;
    if (!camera || !controls || !threeScene) return;

    setCameraMode(prev => {
      const next = prev === 'orbit' ? 'topdown' : 'orbit';
      cameraModeRef.current = next;

      // Toggle ceiling visibility
      threeScene.traverse(obj => {
        if (obj.userData.isCeiling) obj.visible = next !== 'topdown';
      });

      if (next === 'topdown') {
        const height = roomSizeRef.current * 2.5;
        setTopdownPosition(camera, 0, height, 0.01);
        controls.enabled = false;
      } else {
        sceneRotationRef.current = 0;
        threeScene.rotation.y = 0;
        camera.position.set(10, 10, 10);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.enabled = true;
      }

      // Reset keys
      topDownKeysRef.current = { w: false, a: false, s: false, d: false };

      return next;
    });
  }, []);

  // ── Photo paste handler ─────────────────────────────────────────
  const handlePhotoPaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const { blob: _blob, ...photoData } = await generateThumbnail(file);
          setItemForm(f => ({
            ...f, photos: [...f.photos, { id: genId(), ...photoData }]
          }));
        }
      }
    }
  }, []);

  const handlePhotoUpload = useCallback(async (file: File) => {
    const { blob: _blob, ...photoData } = await generateThumbnail(file);
    setItemForm(f => ({ ...f, photos: [...f.photos, { id: genId(), ...photoData }] }));
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    setItemForm(f => ({ ...f, photos: f.photos.filter(p => p.id !== photoId) }));
  }, []);

  // ── Pointer event handlers for canvas ───────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (showFurniturePicker || showFurnitureEditor || showItemEditor || showSceneManager || showStats) return;

    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    previousPointerPos.current = { x: e.clientX, y: e.clientY };
    pointerMoved.current = false;
    draggingFurniture.current = null;

    // Move mode: check if clicking on the moving furniture to start drag
    if (isMovingFurniture && movingFurnitureRef.current) {
      const container = containerRef.current;
      const camera = cameraRef.current;
      if (container && camera) {
        const rect = container.getBoundingClientRect();
        pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.current.setFromCamera(pointer.current, camera);

        // Check if clicking on the moving furniture
        const intersects = raycaster.current.intersectObjects(furnitureMeshesRef.current, true);
        let clickedOnMovingFurniture = false;
        if (intersects.length > 0) {
          let target = intersects[0].object as THREE.Object3D;
          while (target && !target.userData?.furnitureId) target = target.parent!;
          if (target?.userData?.furnitureId === movingFurnitureRef.current.id) {
            clickedOnMovingFurniture = true;
          }
        }

        if (clickedOnMovingFurniture) {
          // Start furniture drag
          const intersectPoint = new THREE.Vector3();
          raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint);
          const furniture = movingFurnitureRef.current;
          dragOffset.current.set(
            furniture.position.x - intersectPoint.x,
            0,
            furniture.position.z - intersectPoint.z,
          );
          draggingFurniture.current = furniture;
          // Disable controls during furniture drag
          if (controlsRef.current) controlsRef.current.enabled = false;
        }
        // If not clicking on furniture, let controls handle the pointer for camera movement
      }
    }
  }, [isMovingFurniture, showFurniturePicker, showFurnitureEditor, showItemEditor, showSceneManager, showStats]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Movement threshold detection
    if (pointerDownPos.current && !pointerMoved.current) {
      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 8) {
        pointerMoved.current = true;
      }
    }

    // Furniture drag (works in both camera modes)
    if (draggingFurniture.current && pointerMoved.current) {
      const container = containerRef.current;
      const camera = cameraRef.current;
      if (container && camera) {
        const rect = container.getBoundingClientRect();
        pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.current.setFromCamera(pointer.current, camera);

        const intersectPoint = new THREE.Vector3();
        raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint);

        const newX = Math.round((intersectPoint.x + dragOffset.current.x) * 2) / 2;
        const newZ = Math.round((intersectPoint.z + dragOffset.current.z) * 2) / 2;
        const clampBound = roomSizeRef.current / 2 - 0.5;
        const clampedX = Math.max(-clampBound, Math.min(clampBound, newX));
        const clampedZ = Math.max(-clampBound, Math.min(clampBound, newZ));

        const furniture = draggingFurniture.current;
        const mesh = furnitureMeshesRef.current.find(
          obj => obj.userData?.furnitureId === furniture.id,
        );
        if (mesh) {
          mesh.position.set(clampedX, 0, clampedZ);
        }
        dragFinalPosRef.current = { id: furniture.id, x: clampedX, z: clampedZ };
      }
      previousPointerPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Top-down camera panning via pointer drag (only when not dragging furniture)
    if (cameraModeRef.current === 'topdown' && pointerDownPos.current && previousPointerPos.current && pointerMoved.current) {
      const camera = cameraRef.current;
      if (camera) {
        const dx = e.clientX - previousPointerPos.current.x;
        const dy = e.clientY - previousPointerPos.current.y;
        // Use stable scale based on room size, not camera height
        const scale = roomSizeRef.current * 0.004;
        const halfBound = roomSizeRef.current * 0.8;
        const newX = Math.max(-halfBound, Math.min(halfBound, camera.position.x - dx * scale));
        const newZ = Math.max(-halfBound, Math.min(halfBound, camera.position.z - dy * scale));
        setTopdownPosition(camera, newX, camera.position.y, newZ);
      }
      previousPointerPos.current = { x: e.clientX, y: e.clientY };
      return;
    }
  }, []);

  const commitDragPosition = useCallback(() => {
    const pos = dragFinalPosRef.current;
    if (pos) {
      // Update movingFurnitureRef position so next drag starts from current position
      if (movingFurnitureRef.current && movingFurnitureRef.current.id === pos.id) {
        movingFurnitureRef.current = { ...movingFurnitureRef.current, position: { x: pos.x, z: pos.z } };
      }
      setScenes(prev => {
        const updated = prev.map(s => {
          if (s.id !== activeSceneId) return s;
          return {
            ...s,
            furniture: s.furniture.map(f =>
              f.id === pos.id ? { ...f, position: { x: pos.x, z: pos.z } } : f,
            ),
          };
        });
        const active = updated.find(s => s.id === activeSceneId);
        if (active) {
          setSaveStatus('saving');
          saveScene(active).then(() => setSaveStatus('saved'));
        }
        return updated;
      });
    }
    dragFinalPosRef.current = null;
    draggingFurniture.current = null;
  }, [activeSceneId]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (showFurniturePicker || showFurnitureEditor || showItemEditor || showSceneManager || showStats) return;

    if (draggingFurniture.current) {
      commitDragPosition();
      // Re-enable controls after furniture drag
      if (controlsRef.current && isMovingFurniture) controlsRef.current.enabled = true;
    } else if (!pointerMoved.current && !isMovingFurniture) {
      handleClick(e);
    }

    pointerDownPos.current = null;
    previousPointerPos.current = null;
    pointerMoved.current = false;
  }, [isMovingFurniture, handleClick, commitDragPosition, showFurniturePicker, showFurnitureEditor, showItemEditor, showSceneManager, showStats]);

  const handlePointerLeave = useCallback(() => {
    if (showFurniturePicker || showFurnitureEditor || showItemEditor || showSceneManager || showStats) return;
    if (draggingFurniture.current) {
      commitDragPosition();
    }
    pointerDownPos.current = null;
    previousPointerPos.current = null;
    pointerMoved.current = false;
  }, [commitDragPosition, showFurniturePicker, showFurnitureEditor, showItemEditor, showSceneManager, showStats]);

  // ── Scroll zoom (topdown mode, desktop) ──────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (cameraModeRef.current !== 'topdown') return;
      e.preventDefault();
      const camera = cameraRef.current;
      if (!camera) return;
      const minH = roomSizeRef.current * 0.8;
      const maxH = roomSizeRef.current * 5;
      const newY = Math.max(minH, Math.min(maxH, camera.position.y * (1 + e.deltaY * 0.001)));
      setTopdownPosition(camera, camera.position.x, newY, camera.position.z);
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // ── Pinch-to-zoom (topdown mode, mobile) ─────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const getTouchDist = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (cameraModeRef.current !== 'topdown' || e.touches.length < 2) return;
      pinchStartDist.current = getTouchDist(e.touches);
      pinchStartHeight.current = cameraRef.current?.position.y ?? 10;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (cameraModeRef.current !== 'topdown' || e.touches.length < 2) return;
      e.preventDefault();
      const camera = cameraRef.current;
      if (!camera) return;
      const dist = getTouchDist(e.touches);
      const ratio = pinchStartDist.current > 0 ? pinchStartDist.current / dist : 1;
      const minH = roomSizeRef.current * 0.8;
      const maxH = roomSizeRef.current * 5;
      const newY = Math.max(minH, Math.min(maxH, pinchStartHeight.current * ratio));
      setTopdownPosition(camera, camera.position.x, newY, camera.position.z);
    };
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  // ── Rotate camera (topdown mode) ────────────────────────────────
  const rotateCamera = useCallback((direction: 1 | -1, angleDeg = 90) => {
    sceneRotationRef.current += direction * angleDeg * (Math.PI / 180);
  }, []);

  // ── Rotate moving furniture ─────────────────────────────────────
  const rotateMovingFurniture = useCallback((direction: 1 | -1, angleDeg = 90) => {
    const furniture = movingFurnitureRef.current;
    if (!furniture) return;
    furniture.rotation = (furniture.rotation + direction * angleDeg + 360) % 360;
    const mesh = furnitureMeshesRef.current.find(
      obj => obj.userData?.furnitureId === furniture.id,
    );
    if (mesh) {
      mesh.rotation.y = (furniture.rotation * Math.PI) / 180;
    }
    setScenes(prev => {
      const updated = prev.map(s => {
        if (s.id !== activeSceneId) return s;
        return {
          ...s,
          furniture: s.furniture.map(f =>
            f.id === furniture.id ? { ...f, rotation: furniture.rotation } : f,
          ),
        };
      });
      const active = updated.find(s => s.id === activeSceneId);
      if (active) {
        setSaveStatus('saving');
        saveScene(active).then(() => setSaveStatus('saved'));
      }
      return updated;
    });
  }, [activeSceneId]);

  return {
    // Refs
    containerRef,
    sceneRef,
    controlsRef,
    // State
    scenes,
    activeSceneId,
    loading,
    selectedFurniture,
    showItemPanel,
    showItemEditor,
    showFurniturePicker,
    showSceneManager,
    newSceneName,
    newSceneEmoji,
    editingItem,
    itemForm,
    searchQuery,
    searchResults,
    showFurnitureEditor,
    editingFurniture,
    editForm,
    showStats,
    showSceneEditor,
    editingSceneId,
    editSceneName,
    editSceneEmoji,
    isMovingFurniture,
    saveStatus,
    cameraMode,
    showBackupReminder,
    confirmState,
    setConfirmState,
    toast,
    customConfirm,
    showToast,
    handleDeleteFurnitureConfirm,
    editSceneRoomSize,
    editSceneRoomWidth,
    editSceneRoomDepth,
    newSceneRoomSize,
    newSceneRoomWidth,
    newSceneRoomDepth,
    // Setters (for simple state changes)
    setShowItemPanel,
    setShowItemEditor,
    setShowFurniturePicker,
    setShowFurnitureEditor,
    setShowSceneManager,
    setNewSceneName,
    setNewSceneEmoji,
    setItemForm,
    setSearchQuery,
    setEditForm,
    setShowStats,
    setShowSceneEditor,
    setEditSceneName,
    setEditSceneEmoji,
    setShowBackupReminder,
    setSelectedFurniture,
    setEditingItem,
    setEditingFurniture,
    setEditSceneRoomSize,
    setEditSceneRoomWidth,
    setEditSceneRoomDepth,
    setNewSceneRoomSize,
    setNewSceneRoomWidth,
    setNewSceneRoomDepth,
    setCameraMode,
    // Handlers
    handleSceneChange,
    handleClick,
    handleAddFurniture,
    handleAddCustomFurniture,
    handleSaveFurniture,
    handleDeleteFromEditor,
    handleSaveItem,
    handleDeleteItem,
    handleAddScene,
    handleSaveSceneEdit,
    handleDeleteScene,
    handleCopyScene,
    handleDeleteItems,
    handleExport,
    handleImport,
    handleSearch,
    handleSearchSelect,
    openItemEditor,
    openFurnitureEditor,
    openSceneEditor,
    startMoveMode,
    stopMoveMode,
    toggleCameraMode,
    handlePhotoPaste,
    handlePhotoUpload,
    removePhoto,
    handleDeleteFurniture,
    // Pointer handlers
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    // Rotation
    rotateCamera,
    rotateMovingFurniture,
  };
}
