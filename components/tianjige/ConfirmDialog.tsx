'use client';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] rounded-2xl mx-4 max-w-sm w-full border border-white/10 shadow-2xl p-5">
        <p className="text-white text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm}
            className="flex-1 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-xl font-medium transition-colors text-sm">
            确定
          </button>
          <button onClick={onCancel}
            className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors text-sm">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
