'use client';
import { useToolHistory } from '@/lib/useToolHistory';

import { useState, useMemo } from 'react';
import BackButton from '@/components/BackButton';
import FullscreenButton from '@/components/FullscreenButton';

type Unit = 'metric' | 'imperial';

interface BMIResult {
  value: number;
  category: string;
  color: string;
  description: string;
}

export default function BMICalculator() {
  useToolHistory('bmi');
  const [unit, setUnit] = useState<Unit>('metric');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const bmiResult = useMemo<BMIResult | null>(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);

    if (!h || !w || h <= 0 || w <= 0) return null;

    let bmi: number;
    if (unit === 'metric') {
      // 公制: 身高 cm, 体重 kg
      const heightInMeters = h / 100;
      bmi = w / (heightInMeters * heightInMeters);
    } else {
      // 英制: 身高 inches, 体重 lbs
      bmi = (w / (h * h)) * 703;
    }

    bmi = Math.round(bmi * 10) / 10;

    if (bmi < 18.5) {
      return { value: bmi, category: '偏瘦', color: '#3b82f6', description: '体重过轻，建议适当增加营养摄入' };
    } else if (bmi < 24) {
      return { value: bmi, category: '正常', color: '#22c55e', description: '体重正常，请继续保持健康的生活方式' };
    } else if (bmi < 28) {
      return { value: bmi, category: '偏胖', color: '#f59e0b', description: '体重偏重，建议适当控制饮食并增加运动' };
    } else {
      return { value: bmi, category: '肥胖', color: '#ef4444', description: '肥胖，建议咨询医生并制定健康的减重计划' };
    }
  }, [height, weight, unit]);

  const bmiRanges = [
    { range: '< 18.5', category: '偏瘦', color: '#3b82f6' },
    { range: '18.5 - 23.9', category: '正常', color: '#22c55e' },
    { range: '24 - 27.9', category: '偏胖', color: '#f59e0b' },
    { range: '>= 28', category: '肥胖', color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl safe-area-top border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <BackButton category="life" />
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="9943" className="w-8 h-8 rounded-lg shadow-lg shadow-orange-500/30" />
            <h1 className="text-lg font-semibold text-white">BMI 计算器</h1>
          </div>
          <FullscreenButton className="ml-auto" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-in animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 结果显示 */}
            <div className="md:col-span-1">
              <div className="glass-card p-6 sticky top-28">
                <h2 className="text-base font-semibold text-white mb-5">计算结果</h2>

                {bmiResult ? (
                  <div className="space-y-6 animate-fade-in">
                    {/* BMI 数值 */}
                    <div className="text-center">
                      <div className="text-5xl font-bold mb-2" style={{ color: bmiResult.color }}>
                        {bmiResult.value}
                      </div>
                      <div
                        className="inline-block px-4 py-1.5 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${bmiResult.color}20`,
                          color: bmiResult.color,
                        }}
                      >
                        {bmiResult.category}
                      </div>
                    </div>

                    {/* 说明 */}
                    <p className="text-sm text-white/60 text-center">
                      {bmiResult.description}
                    </p>

                    {/* BMI 进度条 */}
                    <div>
                      <div className="flex justify-between text-xs text-white/40 mb-2">
                        <span>10</span>
                        <span>40</span>
                      </div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(((bmiResult.value - 10) / 30) * 100, 100)}%`,
                            background: `linear-gradient(90deg, #3b82f6, #22c55e, #f59e0b, #ef4444)`,
                          }}
                        />
                      </div>
                      <div className="relative mt-1 h-4">
                        {[18.5, 24, 28].map((mark) => (
                          <div
                            key={mark}
                            className="absolute text-[10px] text-white/30"
                            style={{ left: `${((mark - 10) / 30) * 100}%` }}
                          >
                            |
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-sm text-white/40">
                      输入身高和体重
                      <br />
                      查看 BMI 结果
                    </p>
                  </div>
                )}

                {/* BMI 参考表 */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <h3 className="text-sm font-medium text-white/60 mb-3">BMI 参考范围</h3>
                  <div className="space-y-2">
                    {bmiRanges.map((item) => (
                      <div key={item.category} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm text-white/60">{item.category}</span>
                        </div>
                        <span className="text-sm text-white/40">{item.range}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 输入区域 */}
            <div className="md:col-span-2 space-y-6">
              {/* 单位切换 */}
              <div className="glass-card p-6">
                <h2 className="text-base font-semibold text-white mb-4">计量单位</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setUnit('metric');
                      setHeight('');
                      setWeight('');
                    }}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                      unit === 'metric'
                        ? 'bg-[#fb6400] text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    公制 (cm / kg)
                  </button>
                  <button
                    onClick={() => {
                      setUnit('imperial');
                      setHeight('');
                      setWeight('');
                    }}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                      unit === 'imperial'
                        ? 'bg-[#fb6400] text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    英制 (in / lbs)
                  </button>
                </div>
              </div>

              {/* 身高输入 */}
              <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <h2 className="text-base font-semibold text-white mb-4">
                  身高
                  <span className="text-sm font-normal text-white/40 ml-2">
                    ({unit === 'metric' ? '厘米 cm' : '英寸 in'})
                  </span>
                </h2>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder={unit === 'metric' ? '请输入身高，例如 170' : '请输入身高，例如 67'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
                  min="0"
                  step="0.1"
                />
                {unit === 'imperial' && (
                  <p className="mt-2 text-xs text-white/30">
                    提示: 1 英尺 = 12 英寸，例如 5&apos;7&quot; = 67 英寸
                  </p>
                )}
              </div>

              {/* 体重输入 */}
              <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <h2 className="text-base font-semibold text-white mb-4">
                  体重
                  <span className="text-sm font-normal text-white/40 ml-2">
                    ({unit === 'metric' ? '千克 kg' : '磅 lbs'})
                  </span>
                </h2>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={unit === 'metric' ? '请输入体重，例如 65' : '请输入体重，例如 143'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all"
                  min="0"
                  step="0.1"
                />
              </div>

              {/* 常用数据参考 */}
              <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
                <h2 className="text-base font-semibold text-white mb-4">快速填充</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(unit === 'metric'
                    ? [
                        { label: '标准女性', h: '163', w: '55' },
                        { label: '标准男性', h: '175', w: '70' },
                        { label: '偏瘦女性', h: '165', w: '48' },
                        { label: '偏胖男性', h: '178', w: '90' },
                      ]
                    : [
                        { label: '标准女性', h: '64', w: '121' },
                        { label: '标准男性', h: '69', w: '154' },
                        { label: '偏瘦女性', h: '65', w: '106' },
                        { label: '偏胖男性', h: '70', w: '198' },
                      ]
                  ).map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setHeight(item.h);
                        setWeight(item.w);
                      }}
                      className="py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all"
                    >
                      <div className="text-sm text-white/60">{item.label}</div>
                      <div className="text-xs text-white/30 mt-1">
                        {item.h}{unit === 'metric' ? 'cm' : 'in'} / {item.w}{unit === 'metric' ? 'kg' : 'lbs'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
