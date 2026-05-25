'use client';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function TopicInput({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        输入主题
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例：早起、减肥、副业、AI工具推荐…"
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-lg"
        maxLength={50}
      />
      <p className="mt-1 text-xs text-gray-500 text-right">{value.length}/50</p>
    </div>
  );
}
