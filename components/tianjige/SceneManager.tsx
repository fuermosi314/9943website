'use client';

import { useState, useRef } from 'react';
import { Scene } from '@/lib/tianjige-db';

interface SceneManagerProps {
  show: boolean;
  scenes: Scene[];
  newSceneName: string;
  newSceneEmoji: string;
  newSceneRoomSize: number;
  editSceneName: string;
  editSceneEmoji: string;
  editSceneRoomSize: number;
  editingSceneId: string | null;
  showSceneEditor: boolean;
  onClose: () => void;
  onAddScene: () => Promise<void>;
  onDeleteScene: (sceneId: string) => Promise<void>;
  onCopyScene: (scene: Scene) => void;
  onSaveSceneEdit: () => Promise<void>;
  onOpenSceneEditor: (scene: Scene) => void;
  onCloseSceneEditor: () => void;
  onExport: () => Promise<void>;
  onImport: (file: File, mode: 'merge' | 'replace') => Promise<void>;
  setNewSceneName: (name: string) => void;
  setNewSceneEmoji: (emoji: string) => void;
  setNewSceneRoomSize: (size: number) => void;
  setEditSceneName: (name: string) => void;
  setEditSceneEmoji: (emoji: string) => void;
  setEditSceneRoomSize: (size: number) => void;
}

export default function SceneManager({
  show, scenes, newSceneName, newSceneEmoji, newSceneRoomSize,
  editSceneName, editSceneEmoji, editSceneRoomSize, editingSceneId, showSceneEditor,
  onClose, onAddScene, onDeleteScene, onCopyScene, onSaveSceneEdit,
  onOpenSceneEditor, onCloseSceneEditor, onExport, onImport,
  setNewSceneName, setNewSceneEmoji, setNewSceneRoomSize,
  setEditSceneName, setEditSceneEmoji, setEditSceneRoomSize,
}: SceneManagerProps) {
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showImportMode, setShowImportMode] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!show) return null;

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleExportConfirm = async () => {
    setShowExportConfirm(false);
    await onExport();
    showFeedback('success', '已下载到本地');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingImportFile(file);
      setShowImportMode(true);
    }
    // 重置 input 以便重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportConfirm = async (mode: 'merge' | 'replace') => {
    if (!pendingImportFile) return;
    setShowImportMode(false);
    try {
      await onImport(pendingImportFile, mode);
      showFeedback('success', '导入成功');
    } catch {
      showFeedback('error', '导入失败');
    }
    setPendingImportFile(null);
  };

  return (
    <>
      {/* Scene Manager Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl border border-white/10 w-full max-w-lg max-h-[70vh] overflow-y-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold">场景管理</h3>
            <button onClick={onClose}
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
                  <button onClick={() => onOpenSceneEditor(scene)}
                    className="px-2 py-1 text-white/50 hover:text-white hover:bg-white/10 rounded text-xs">
                    编辑
                  </button>
                  <button onClick={() => onCopyScene(scene)}
                    className="px-2 py-1 text-white/50 hover:text-white hover:bg-white/10 rounded text-xs">
                    复制
                  </button>
                  <button onClick={() => onDeleteScene(scene.id)}
                    className="px-2 py-1 text-red-400 hover:bg-red-500/10 rounded text-xs">
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add new scene */}
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-white/50 text-xs mb-2">添加新场景</h4>
            <div className="flex gap-2 mb-2">
              <input type="text" placeholder="场景名称" value={newSceneName}
                onChange={e => setNewSceneName(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/30 focus:border-[#fb6400] outline-none" />
              <input type="text" placeholder="🏠" value={newSceneEmoji} maxLength={2}
                onChange={e => setNewSceneEmoji(e.target.value)}
                className="w-14 bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-white text-sm text-center focus:border-[#fb6400] outline-none" />
              <button onClick={onAddScene}
                className="px-4 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
                添加
              </button>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-white/50 text-xs">房间:</span>
              {[
                { value: 3, label: '小 (3x3)' },
                { value: 5, label: '中 (5x5)' },
                { value: 7, label: '大 (7x7)' },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => setNewSceneRoomSize(opt.value)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    newSceneRoomSize === opt.value
                      ? 'bg-[#fb6400] text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                  }`}>
                  {opt.label}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <input type="number" min={2} max={20} step={1}
                  value={newSceneRoomSize}
                  onChange={e => {
                    const v = Math.max(2, Math.min(20, Number(e.target.value) || 2));
                    setNewSceneRoomSize(v);
                  }}
                  className="w-14 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs text-center focus:border-[#fb6400] outline-none" />
                <span className="text-white/30 text-xs">米</span>
              </div>
            </div>
          </div>

          {/* Import/Export */}
          <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
            <button onClick={() => setShowExportConfirm(true)}
              className="w-full py-3 bg-[#fb6400]/20 hover:bg-[#fb6400]/30 border border-[#fb6400]/30 text-[#fb6400] rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
              <span>📤</span> 导出全部数据
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
              <span>📥</span> 导入数据
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
          </div>

          {/* Help section */}
          <div className="border-t border-white/10 pt-4 mt-4">
            <button onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-between text-white/50 hover:text-white/70 text-sm transition-colors">
              <span>📖 使用帮助</span>
              <span className="text-xs">{showHelp ? '收起' : '展开'}</span>
            </button>
            {showHelp && (
              <div className="mt-3 space-y-4 text-white/60 text-xs leading-relaxed">
                <div>
                  <h5 className="text-white/80 font-medium mb-1">快速上手</h5>
                  <ol className="list-decimal list-inside space-y-1 pl-1">
                    <li>点击底部"+ 添加家具"按钮，选择家具类型</li>
                    <li>点击家具查看物品，点头部按钮编辑/移动/删除</li>
                    <li>使用搜索栏查找跨场景物品</li>
                    <li>右上角切换上帝视角（2.5D模式）</li>
                  </ol>
                </div>
                <div>
                  <h5 className="text-white/80 font-medium mb-1">视角操作</h5>
                  <ul className="space-y-1 pl-1">
                    <li>自由视角：鼠标拖拽旋转，滚轮缩放</li>
                    <li>上帝视角：拖拽/方向键平移，滚轮/双指缩放</li>
                    <li>上帝视角：右下角按钮旋转视角方向</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-white/80 font-medium mb-1">数据管理</h5>
                  <ul className="space-y-1 pl-1">
                    <li>导出：下载 JSON 备份文件到手机/电脑</li>
                    <li>导入：选择之前导出的 JSON 文件恢复数据</li>
                    <li>建议定期导出备份，防止数据丢失</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-white/80 font-medium mb-1">手机端操作</h5>
                  <ul className="space-y-1 pl-1">
                    <li>自由视角：单指拖拽旋转，双指缩放</li>
                    <li>上帝视角：拖拽平移，双指缩放</li>
                    <li>点击家具查看物品和操作按钮</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export confirmation */}
      {showExportConfirm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm mx-0 sm:mx-4 border border-white/10 shadow-2xl">
            <div className="p-5">
              <h3 className="text-white text-lg font-bold mb-2">导出全部数据</h3>
              <p className="text-white/60 text-sm mb-1">将导出一个 JSON 文件，包含所有场景和物品数据。</p>
              <p className="text-white/60 text-sm mb-4">文件名格式：<span className="text-white/80">天机阁-备份-YYYY-MM-DD.json</span></p>
            </div>
            <div className="p-5 border-t border-white/10 flex gap-3">
              <button onClick={handleExportConfirm}
                className="flex-1 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl text-sm font-medium transition-colors">
                确认导出
              </button>
              <button onClick={() => setShowExportConfirm(false)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import mode selection */}
      {showImportMode && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm mx-0 sm:mx-4 border border-white/10 shadow-2xl">
            <div className="p-5">
              <h3 className="text-white text-lg font-bold mb-2">选择导入模式</h3>
              <p className="text-white/60 text-sm mb-4">请选择如何导入数据：</p>
              <div className="space-y-2">
                <button onClick={() => handleImportConfirm('merge')}
                  className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors">
                  <div className="text-white font-medium text-sm">合并模式</div>
                  <div className="text-white/50 text-xs mt-1">保留现有数据，同名场景会被覆盖</div>
                </button>
                <button onClick={() => handleImportConfirm('replace')}
                  className="w-full p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-left transition-colors">
                  <div className="text-red-400 font-medium text-sm">⚠️ 替换模式</div>
                  <div className="text-red-400/60 text-xs mt-1">清空所有现有数据，只保留导入的数据</div>
                </button>
              </div>
            </div>
            <div className="p-5 border-t border-white/10">
              <button onClick={() => { setShowImportMode(false); setPendingImportFile(null); }}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback toast */}
      {feedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70]">
          <div className={`px-4 py-2 rounded-xl text-sm font-medium shadow-lg ${
            feedback.type === 'success'
              ? 'bg-green-500/90 text-white'
              : 'bg-red-500/90 text-white'
          }`}>
            {feedback.text}
          </div>
        </div>
      )}

      {/* Scene Editor Modal */}
      {showSceneEditor && editingSceneId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm mx-0 sm:mx-4 border border-white/10 shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white text-lg font-bold">编辑场景</h3>
              <button onClick={onCloseSceneEditor}
                className="text-white/50 hover:text-white text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-1 block">场景名称</label>
                <input type="text" value={editSceneName}
                  onChange={e => setEditSceneName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-1 block">图标</label>
                <input type="text" value={editSceneEmoji} maxLength={2}
                  onChange={e => setEditSceneEmoji(e.target.value)}
                  className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#fb6400]" />
              </div>
              <div>
                <label className="text-white/70 text-sm mb-2 block">房间大小</label>
                <div className="flex gap-2 items-center flex-wrap">
                  {[
                    { value: 3, label: '小 (3x3)' },
                    { value: 5, label: '中 (5x5)' },
                    { value: 7, label: '大 (7x7)' },
                  ].map(opt => (
                    <button key={opt.value}
                      onClick={() => setEditSceneRoomSize(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        editSceneRoomSize === opt.value
                          ? 'bg-[#fb6400] text-white'
                          : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <input type="number" min={2} max={20} step={1}
                      value={editSceneRoomSize}
                      onChange={e => {
                        const v = Math.max(2, Math.min(20, Number(e.target.value) || 2));
                        setEditSceneRoomSize(v);
                      }}
                      className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:border-[#fb6400] outline-none" />
                    <span className="text-white/40 text-sm">米</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-white/10 flex gap-3">
              <button onClick={onSaveSceneEdit}
                className="flex-1 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl text-sm font-medium transition-colors">
                保存
              </button>
              <button onClick={onCloseSceneEditor}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
