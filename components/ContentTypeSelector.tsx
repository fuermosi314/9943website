'use client';

import { ContentType, CONTENT_TYPES } from '@/lib/types';

interface Props {
  value: ContentType;
  onChange: (value: ContentType) => void;
}

export default function ContentTypeSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        内容类型
      </label>
      <div className="grid grid-cols-5 gap-2">
        {CONTENT_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all ${
              value === t.value
                ? 'bg-blue-500/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'
            }`}
          >
            <span className="text-2xl">{t.icon}</span>
            <span className="text-xs font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
