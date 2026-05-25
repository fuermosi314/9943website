'use client';

import { Platform, PLATFORMS } from '@/lib/types';

interface Props {
  value: Platform;
  onChange: (value: Platform) => void;
}

export default function PlatformSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        选择平台
      </label>
      <div className="grid grid-cols-5 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all ${
              value === p.value
                ? 'bg-purple-500/20 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
            }`}
          >
            <span className="text-2xl">{p.icon}</span>
            <span className="text-xs font-medium">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
