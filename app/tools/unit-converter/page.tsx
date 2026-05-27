'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useMemo } from 'react';
import BackButton from '@/components/BackButton';

// ============ 类型定义 ============
type Category = 'length' | 'weight' | 'temperature' | 'area' | 'volume' | 'time';

interface UnitInfo {
  id: string;
  name: string;
  // 每个单位相对于基准单位的转换因子
  // 值 x factor = 基准单位值
  // temperature 需要特殊处理，factor 用 NaN 标记
  factor: number;
}

interface CategoryInfo {
  id: Category;
  name: string;
  icon: string;
  units: UnitInfo[];
  baseUnit: string;
}

// ============ 单位数据 ============
const categories: CategoryInfo[] = [
  {
    id: 'length',
    name: '长度',
    icon: '📐',
    baseUnit: '米',
    units: [
      { id: 'm', name: '米', factor: 1 },
      { id: 'km', name: '千米', factor: 1000 },
      { id: 'cm', name: '厘米', factor: 0.01 },
      { id: 'mm', name: '毫米', factor: 0.001 },
      { id: 'mi', name: '英里', factor: 1609.344 },
      { id: 'yd', name: '码', factor: 0.9144 },
      { id: 'ft', name: '英尺', factor: 0.3048 },
      { id: 'in', name: '英寸', factor: 0.0254 },
    ],
  },
  {
    id: 'weight',
    name: '重量',
    icon: '⚖️',
    baseUnit: '千克',
    units: [
      { id: 'kg', name: '千克', factor: 1 },
      { id: 'g', name: '克', factor: 0.001 },
      { id: 'mg', name: '毫克', factor: 0.000001 },
      { id: 't', name: '吨', factor: 1000 },
      { id: 'lb', name: '磅', factor: 0.45359237 },
      { id: 'oz', name: '盎司', factor: 0.028349523125 },
    ],
  },
  {
    id: 'temperature',
    name: '温度',
    icon: '🌡️',
    baseUnit: '摄氏度',
    units: [
      { id: 'c', name: '摄氏度', factor: NaN },
      { id: 'f', name: '华氏度', factor: NaN },
      { id: 'k', name: '开尔文', factor: NaN },
    ],
  },
  {
    id: 'area',
    name: '面积',
    icon: '📏',
    baseUnit: '平方米',
    units: [
      { id: 'm2', name: '平方米', factor: 1 },
      { id: 'km2', name: '平方千米', factor: 1e6 },
      { id: 'ha', name: '公顷', factor: 10000 },
      { id: 'ft2', name: '平方英尺', factor: 0.09290304 },
      { id: 'ac', name: '英亩', factor: 4046.8564224 },
    ],
  },
  {
    id: 'volume',
    name: '体积',
    icon: '🧪',
    baseUnit: '升',
    units: [
      { id: 'l', name: '升', factor: 1 },
      { id: 'ml', name: '毫升', factor: 0.001 },
      { id: 'm3', name: '立方米', factor: 1000 },
      { id: 'gal', name: '加仑', factor: 3.785411784 },
      { id: 'qt', name: '夸脱', factor: 0.946352946 },
    ],
  },
  {
    id: 'time',
    name: '时间',
    icon: '⏰',
    baseUnit: '秒',
    units: [
      { id: 's', name: '秒', factor: 1 },
      { id: 'ms', name: '毫秒', factor: 0.001 },
      { id: 'min', name: '分钟', factor: 60 },
      { id: 'h', name: '小时', factor: 3600 },
      { id: 'd', name: '天', factor: 86400 },
      { id: 'wk', name: '周', factor: 604800 },
    ],
  },
];

// ============ 换算逻辑 ============
function temperatureConvert(value: number, from: string, to: string): number {
  if (from === to) return value;

  // 先转为摄氏度
  let celsius: number;
  switch (from) {
    case 'c': celsius = value; break;
    case 'f': celsius = (value - 32) * 5 / 9; break;
    case 'k': celsius = value - 273.15; break;
    default: return NaN;
  }

  // 再从摄氏度转为目标
  switch (to) {
    case 'c': return celsius;
    case 'f': return celsius * 9 / 5 + 32;
    case 'k': return celsius + 273.15;
    default: return NaN;
  }
}

function convert(value: number, fromUnit: UnitInfo, toUnit: UnitInfo, categoryId: Category): number {
  if (categoryId === 'temperature') {
    return temperatureConvert(value, fromUnit.id, toUnit.id);
  }
  // 通用公式：value * fromFactor / toFactor
  return (value * fromUnit.factor) / toUnit.factor;
}

// ============ 格式化结果 ============
function formatResult(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '—';

  // 对于非常大或非常小的数字使用科学计数法
  if (Math.abs(value) >= 1e12 || (Math.abs(value) < 1e-6 && value !== 0)) {
    return value.toExponential(6);
  }

  // 最多保留 8 位小数，去掉末尾零
  const str = value.toFixed(8);
  // 去掉末尾多余的零
  const trimmed = str.replace(/\.?0+$/, '');
  return trimmed;
}

// ============ 组件 ============
export default function UnitConverter() {
  useToolHistory('unit-converter');
  const [activeCategory, setActiveCategory] = useState<Category>('length');
  const [fromUnit, setFromUnit] = useState<string>('m');
  const [toUnit, setToUnit] = useState<string>('km');
  const [inputValue, setInputValue] = useState<string>('');

  const currentCategory = categories.find((c) => c.id === activeCategory)!;
  const fromUnitInfo = currentCategory.units.find((u) => u.id === fromUnit)!;
  const toUnitInfo = currentCategory.units.find((u) => u.id === toUnit)!;

  const result = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num)) return null;
    return convert(num, fromUnitInfo, toUnitInfo, activeCategory);
  }, [inputValue, fromUnitInfo, toUnitInfo, activeCategory]);

  // 切换类别时重置单位选择
  const handleCategoryChange = (cat: Category) => {
    setActiveCategory(cat);
    const info = categories.find((c) => c.id === cat)!;
    setFromUnit(info.units[0].id);
    setToUnit(info.units.length > 1 ? info.units[1].id : info.units[0].id);
    setInputValue('');
  };

  // 交换从/到单位
  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  // 常用换算快捷项
  const quickPairs: Record<Category, [string, string][]> = {
    length: [['m', 'ft'], ['km', 'mi'], ['cm', 'in']],
    weight: [['kg', 'lb'], ['g', 'oz'], ['t', 'lb']],
    temperature: [['c', 'f'], ['c', 'k'], ['f', 'k']],
    area: [['m2', 'ft2'], ['ha', 'ac'], ['km2', 'm2']],
    volume: [['l', 'gal'], ['ml', 'l'], ['m3', 'gal']],
    time: [['h', 'min'], ['d', 'h'], ['wk', 'd']],
  };

  return (
    <div className="min-h-screen relative z-10">
      {/* 顶部导航 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton toolId="unit-converter" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">单位换算</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-in animate-slide-up">
          {/* 类别选择 */}
          <div className="glass-card p-4 mb-6">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-[#fb6400] text-white shadow-lg shadow-orange-500/30'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className="block text-lg mb-1">{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* 换算区域 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
            {/* 左侧：输入 & 换算 */}
            <div className="md:col-span-3 space-y-6">
              {/* 从 / 到 单位选择 */}
              <div className="glass-card p-6 animate-slide-up">
                <div className="flex items-center gap-3">
                  {/* 从 */}
                  <div className="flex-1">
                    <label className="block text-xs text-white/40 mb-2">从</label>
                    <select
                      value={fromUnit}
                      onChange={(e) => setFromUnit(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#fb6400] transition-all appearance-none cursor-pointer"
                    >
                      {currentCategory.units.map((u) => (
                        <option key={u.id} value={u.id} className="bg-[#1a1a2e] text-white">
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 交换按钮 */}
                  <button
                    onClick={handleSwap}
                    className="mt-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-[#fb6400]/20 border border-white/10 hover:border-[#fb6400]/40 transition-all group"
                    title="交换单位"
                  >
                    <svg
                      className="w-5 h-5 text-white/50 group-hover:text-[#fb6400] transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                    </svg>
                  </button>

                  {/* 到 */}
                  <div className="flex-1">
                    <label className="block text-xs text-white/40 mb-2">到</label>
                    <select
                      value={toUnit}
                      onChange={(e) => setToUnit(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#fb6400] transition-all appearance-none cursor-pointer"
                    >
                      {currentCategory.units.map((u) => (
                        <option key={u.id} value={u.id} className="bg-[#1a1a2e] text-white">
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 输入框 */}
              <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <label className="block text-sm font-medium text-white mb-3">
                  输入数值
                  <span className="text-white/40 ml-2">({fromUnitInfo.name})</span>
                </label>
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`请输入 ${fromUnitInfo.name} 数值`}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
                />
              </div>

              {/* 常用换算快捷 */}
              <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <h2 className="text-base font-semibold text-white mb-4">常用换算</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {quickPairs[activeCategory].map(([f, t]) => {
                    const fInfo = currentCategory.units.find((u) => u.id === f);
                    const tInfo = currentCategory.units.find((u) => u.id === t);
                    if (!fInfo || !tInfo) return null;
                    return (
                      <button
                        key={`${f}-${t}`}
                        onClick={() => {
                          setFromUnit(f);
                          setToUnit(t);
                        }}
                        className="py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all"
                      >
                        <div className="text-sm text-white/80">
                          {fInfo.name} → {tInfo.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 右侧：结果 */}
            <div className="md:col-span-2">
              <div className="glass-card p-6 sticky top-28 animate-slide-up" style={{ animationDelay: '150ms' }}>
                <h2 className="text-base font-semibold text-white mb-5">换算结果</h2>

                {result !== null ? (
                  <div className="space-y-6 animate-fade-in">
                    {/* 输入值 */}
                    <div className="text-center">
                      <div className="text-sm text-white/40 mb-1">{fromUnitInfo.name}</div>
                      <div className="text-2xl font-bold text-white/80">
                        {formatResult(parseFloat(inputValue))}
                      </div>
                    </div>

                    {/* 箭头 */}
                    <div className="text-center text-[#fb6400] text-xl">↓</div>

                    {/* 结果值 */}
                    <div className="text-center">
                      <div className="text-sm text-white/40 mb-1">{toUnitInfo.name}</div>
                      <div className="text-4xl font-bold text-[#fb6400]">
                        {formatResult(result)}
                      </div>
                    </div>

                    {/* 换算公式 */}
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-xs text-white/30 text-center">
                        1 {fromUnitInfo.name} = {formatResult(convert(1, fromUnitInfo, toUnitInfo, activeCategory))} {toUnitInfo.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">🔢</div>
                    <p className="text-sm text-white/40">
                      输入数值查看
                      <br />
                      换算结果
                    </p>
                  </div>
                )}

                {/* 类别所有单位速查 */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <h3 className="text-sm font-medium text-white/60 mb-3">
                    {currentCategory.name}单位参考
                  </h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {currentCategory.units.map((u) => {
                      // 显示每个单位相对基准的换算
                      let ratio: string;
                      if (activeCategory === 'temperature') {
                        ratio = '—';
                      } else {
                        const baseValue = convert(1, u, currentCategory.units[0], activeCategory);
                        ratio = `1 ${u.name} = ${formatResult(baseValue)} ${currentCategory.units[0].name}`;
                      }
                      return (
                        <div key={u.id} className="flex items-center justify-between text-xs">
                          <span className="text-white/50">{u.name}</span>
                          <span className="text-white/30">{ratio}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
