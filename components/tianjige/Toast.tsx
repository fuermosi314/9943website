'use client';

interface ToastProps {
  message: string;
  type?: 'info' | 'success';
}

export default function Toast({ message, type = 'info' }: ToastProps) {
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 rounded-xl text-sm font-medium shadow-lg animate-fade-in ${
      type === 'success' ? 'bg-green-500/90 text-white' : 'bg-[#1a1a2e]/95 text-white border border-white/20'
    }`}>
      {message}
    </div>
  );
}
