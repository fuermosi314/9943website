'use client';

import { useState, useEffect } from 'react';

const STEPS = [
  { title: '欢迎使用天机阁', desc: '3D 家居物品整理工具，帮你记录所有物品的存放位置' },
  { title: '添加家具', desc: '点击底部「+ 添加家具」按钮，选择家具类型放入房间' },
  { title: '管理物品', desc: '点击家具查看物品列表，长按（手机）或右键（电脑）编辑家具' },
  { title: '搜索 & 统计', desc: '左上角搜索物品快速定位，📊 查看资产统计' },
];

export default function FirstGuide() {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('tianjige-guide-seen')) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] rounded-2xl mx-4 max-w-sm w-full border border-white/10 shadow-2xl p-6 text-center">
        <div className="text-3xl mb-3">{['🏠', '🛋️', '📦', '🔍'][step]}</div>
        <h3 className="text-white text-lg font-bold mb-2">{STEPS[step].title}</h3>
        <p className="text-white/60 text-sm mb-6">{STEPS[step].desc}</p>
        <div className="flex gap-1 justify-center mb-4">
          {STEPS.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-[#fb6400]' : 'bg-white/20'}`} />
          ))}
        </div>
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors">
              上一步
            </button>
          )}
          <button onClick={() => {
            if (isLast) {
              localStorage.setItem('tianjige-guide-seen', '1');
              setShow(false);
            } else {
              setStep(s => s + 1);
            }
          }}
            className="flex-1 py-2 bg-[#fb6400] hover:bg-[#e55a00] text-white rounded-xl text-sm font-medium transition-colors">
            {isLast ? '开始使用' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}
