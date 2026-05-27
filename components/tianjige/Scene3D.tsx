'use client';

import { useEffect, useMemo } from 'react';
import { useTianjigeState } from './useTianjigeState';
import SearchBar from './SearchBar';
import SceneManager from './SceneManager';
import FurniturePicker from './FurniturePicker';
import FurnitureEditor from './FurnitureEditor';
import ItemPanel from './ItemPanel';
import ItemEditor from './ItemEditor';
import StatsPanel from './StatsPanel';
import RotationButtons from './RotationButtons';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';
import FirstGuide from './FirstGuide';

export default function Scene3D() {
  const state = useTianjigeState();
  const isTouchDevice = useMemo(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0), []);

  // ── 键盘快捷键 ─────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc: 按优先级关闭弹窗
      if (e.key === 'Escape') {
        if (state.showFurnitureEditor) {
          state.setShowFurnitureEditor(false);
          state.setEditingFurniture(null);
        } else if (state.showItemEditor) {
          state.setShowItemEditor(false);
          state.setEditingItem(null);
        } else if (state.showItemPanel) {
          state.setShowItemPanel(false);
        } else if (state.showFurniturePicker) {
          state.setShowFurniturePicker(false);
        } else if (state.showSceneManager) {
          state.setShowSceneManager(false);
        } else if (state.showStats) {
          state.setShowStats(false);
        }
        return;
      }

      // Delete: 删除选中的家具
      if (e.key === 'Delete' && state.selectedFurniture && !state.showFurnitureEditor && !state.showItemEditor) {
        state.handleDeleteFurnitureConfirm(state.selectedFurniture);
        state.setShowItemPanel(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Loading overlay */}
      {state.loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#0a0a1a]">
          <div className="w-8 h-8 border-2 border-white/20 border-t-[#fb6400] rounded-full animate-spin" />
          <p className="text-white/50 text-sm">加载中...</p>
        </div>
      )}

      {/* Backup reminder */}
      {state.showBackupReminder && (
        <div className="absolute top-14 left-0 right-0 z-30 bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2 flex items-center justify-between">
          <span className="text-yellow-300 text-sm">建议导出备份数据，防止数据丢失</span>
          <div className="flex gap-2">
            <button onClick={state.handleExport} className="text-yellow-300 text-sm underline">立即备份</button>
            <button onClick={() => state.setShowBackupReminder(false)} className="text-yellow-300/50 text-sm">忽略</button>
          </div>
        </div>
      )}

      {/* Three.js canvas container */}
      <div ref={state.containerRef} className="w-full h-full"
        onPointerDown={state.handlePointerDown}
        onPointerMove={state.handlePointerMove}
        onContextMenu={(e) => e.preventDefault()}
        onPointerUp={state.handlePointerUp}
        onPointerLeave={state.handlePointerLeave}
      />

      {/* Move mode indicator */}
      {state.isMovingFurniture && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#fb6400] text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg flex items-center gap-3">
          <span>拖拽移动家具中</span>
          <RotationButtons onRotate={state.rotateMovingFurniture} size="sm" />
          <button onClick={state.stopMoveMode}
            className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition-colors">
            完成
          </button>
        </div>
      )}

      {/* Top-down rotation buttons */}
      {state.cameraMode === 'topdown' && !state.isMovingFurniture && (
        <div className="absolute bottom-20 right-4 z-10">
          <RotationButtons onRotate={state.rotateCamera} />
        </div>
      )}

      {/* Scene switcher dropdown + save status */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {state.saveStatus === 'saving' && <span className="text-white/60 text-sm">保存中...</span>}
        {state.saveStatus === 'saved' && <span className="text-green-400/80 text-sm">已保存</span>}
        {state.saveStatus === 'unsaved' && <span className="text-yellow-400 text-sm font-medium">未保存</span>}
        <select
          value={state.activeSceneId}
          onChange={state.handleSceneChange}
          className="bg-[#1a1a2e] border border-white/20 rounded-lg px-3 py-2 text-sm shadow-md text-white focus:outline-none focus:ring-2 focus:ring-[#fb6400]"
        >
          {state.scenes.map((s) => (
            <option key={s.id} value={s.id} className="bg-[#1a1a2e] text-white">
              {s.emoji} {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Search bar + camera toggle */}
      <div className="absolute top-4 left-4 z-10 flex items-start gap-2">
        <SearchBar
          searchQuery={state.searchQuery}
          searchResults={state.searchResults}
          onSearch={state.handleSearch}
          onSelect={state.handleSearchSelect}
        />
        <button onClick={state.toggleCameraMode}
          className="p-2 bg-[#1a1a2e]/90 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-[#fb6400]/30 transition-colors shrink-0"
          title={state.cameraMode === 'orbit' ? '切换到上帝视角' : '切换到自由视角'}>
          {state.cameraMode === 'orbit' ? '🔭' : '⬇️'}
        </button>
      </div>

      {/* Bottom toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-wrap gap-2 justify-center max-w-[90vw]">
        <button onClick={() => state.setShowFurniturePicker(true)}
          className="px-3 sm:px-4 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-lg">
          <span className="sm:hidden">🛋️+</span>
          <span className="hidden sm:inline">+ 添加家具</span>
        </button>
        <button onClick={() => state.setShowSceneManager(true)}
          className="px-3 sm:px-4 py-2 bg-[#1a1a2e]/90 hover:bg-[#1a1a2e] text-white rounded-xl text-xs sm:text-sm font-medium transition-colors backdrop-blur border border-white/20">
          <span className="sm:hidden">📁<br/><span className="text-[10px] text-white/50">场景</span></span>
          <span className="hidden sm:inline">管理场景</span>
        </button>
        <button onClick={() => state.setShowStats(true)}
          className="px-3 sm:px-4 py-2 bg-[#1a1a2e]/90 hover:bg-[#1a1a2e] text-white rounded-xl text-xs sm:text-sm font-medium transition-colors backdrop-blur border border-white/20">
          <span className="sm:hidden">📊<br/><span className="text-[10px] text-white/50">统计</span></span>
          <span className="hidden sm:inline">📊</span>
        </button>
      </div>

      {/* Mobile hint */}
      {isTouchDevice && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 text-white/30 text-xs text-center pointer-events-none">
          {state.cameraMode === 'topdown' ? '拖动屏幕平移视角 · 双指缩放' : '点击家具查看物品和编辑'}
        </div>
      )}

      {/* Furniture Picker Modal */}
      <FurniturePicker
        show={state.showFurniturePicker}
        currentSceneName={state.scenes.find(s => s.id === state.activeSceneId)?.name ?? ''}
        onClose={() => state.setShowFurniturePicker(false)}
        onAdd={state.handleAddFurniture}
        onAddCustom={state.handleAddCustomFurniture}
      />

      {/* Scene Manager Modal */}
      <SceneManager
        show={state.showSceneManager}
        scenes={state.scenes}
        newSceneName={state.newSceneName}
        newSceneEmoji={state.newSceneEmoji}
        newSceneRoomSize={state.newSceneRoomSize}
        editSceneName={state.editSceneName}
        editSceneEmoji={state.editSceneEmoji}
        editSceneRoomSize={state.editSceneRoomSize}
        editingSceneId={state.editingSceneId}
        showSceneEditor={state.showSceneEditor}
        onClose={() => state.setShowSceneManager(false)}
        onAddScene={state.handleAddScene}
        onDeleteScene={state.handleDeleteScene}
        onCopyScene={state.handleCopyScene}
        onSaveSceneEdit={state.handleSaveSceneEdit}
        onOpenSceneEditor={state.openSceneEditor}
        onCloseSceneEditor={() => state.setShowSceneEditor(false)}
        onExport={state.handleExport}
        onImport={state.handleImport}
        setNewSceneName={state.setNewSceneName}
        setNewSceneEmoji={state.setNewSceneEmoji}
        setNewSceneRoomSize={state.setNewSceneRoomSize}
        setEditSceneName={state.setEditSceneName}
        setEditSceneEmoji={state.setEditSceneEmoji}
        setEditSceneRoomSize={state.setEditSceneRoomSize}
      />

      {/* Furniture Editor Modal */}
      <FurnitureEditor
        show={state.showFurnitureEditor}
        editingFurniture={state.editingFurniture}
        editForm={state.editForm}
        onClose={() => { state.setShowFurnitureEditor(false); state.setEditingFurniture(null); }}
        onSave={state.handleSaveFurniture}
        onDelete={state.handleDeleteFromEditor}
        onMove={() => { state.setShowFurnitureEditor(false); state.setEditingFurniture(null); if (state.editingFurniture) state.startMoveMode(state.editingFurniture); }}
        setEditForm={state.setEditForm}
      />

      {/* Item Panel */}
      <ItemPanel
        show={state.showItemPanel}
        selectedFurniture={state.selectedFurniture}
        onClose={() => state.setShowItemPanel(false)}
        onOpenItemEditor={state.openItemEditor}
        onDeleteItems={state.handleDeleteItems}
        onDeleteConfirm={async (count) => state.customConfirm(`确定删除选中的 ${count} 个物品？`)}
        onEditFurniture={state.openFurnitureEditor}
        onMoveFurniture={state.startMoveMode}
        onDeleteFurniture={state.handleDeleteFurnitureConfirm}
      />

      {/* Item Editor Modal */}
      <ItemEditor
        show={state.showItemEditor}
        editingItem={state.editingItem}
        itemForm={state.itemForm}
        onClose={() => { state.setShowItemEditor(false); state.setEditingItem(null); }}
        onSave={state.handleSaveItem}
        onDelete={state.handleDeleteItem}
        setItemForm={state.setItemForm}
        onPaste={state.handlePhotoPaste}
        onPhotoUpload={state.handlePhotoUpload}
        onRemovePhoto={state.removePhoto}
      />

      {/* Stats Panel */}
      <StatsPanel
        show={state.showStats}
        scenes={state.scenes}
        onClose={() => state.setShowStats(false)}
      />

      {/* Confirm Dialog */}
      {state.confirmState && (
        <ConfirmDialog
          message={state.confirmState.message}
          onConfirm={() => { const s = state.confirmState!; state.setConfirmState(null); s.resolve(true); }}
          onCancel={() => { const s = state.confirmState!; state.setConfirmState(null); s.resolve(false); }}
        />
      )}

      {/* Toast */}
      {state.toast && <Toast message={state.toast.message} type={state.toast.type} />}

      {/* First-time Guide */}
      <FirstGuide />
    </div>
  );
}
