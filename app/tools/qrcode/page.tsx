'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

export default function QRCodeGenerator() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [size, setSize] = useState(200);
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const generateQRCode = async () => {
    if (!text.trim()) return;

    try {
      const url = await QRCode.toDataURL(text, {
        width: size,
        margin: 2,
        color: {
          dark: color,
          light: bgColor,
        },
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error('生成二维码失败:', err);
    }
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'qrcode.png';
    link.click();
  };

  return (
    <div className="min-h-screen relative z-10">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center">
          <button onClick={() => router.back()} className="flex items-center text-white/60 hover:text-[#fb6400] transition-colors mr-6">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#fb6400] to-[#ff8c00] rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-white text-sm">📱</span>
            </div>
            <h1 className="text-lg font-semibold text-white">二维码生成</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Settings */}
            <div className="glass-card p-6">
              <h2 className="text-base font-semibold text-white mb-6">设置</h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">内容</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="输入网址或文本..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#fb6400] transition-all resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    尺寸: {size}px
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="400"
                    step="10"
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#fb6400]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">前景色</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-10 bg-white/5 border border-white/10 rounded-xl cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">背景色</label>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-full h-10 bg-white/5 border border-white/10 rounded-xl cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={generateQRCode}
                  className="w-full bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium"
                >
                  生成二维码
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="glass-card p-6 flex flex-col">
              <h2 className="text-base font-semibold text-white mb-6">预览</h2>

              <div className="flex-1 flex items-center justify-center">
                {qrCodeUrl ? (
                  <div className="text-center animate-fade-in">
                    <div className="bg-white p-4 rounded-2xl shadow-2xl mb-6 inline-block">
                      <img src={qrCodeUrl} alt="二维码" className="mx-auto" />
                    </div>
                    <button
                      onClick={handleDownload}
                      className="bg-gradient-to-r from-[#fb6400] to-[#ff8c00] text-white px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-medium"
                    >
                      下载二维码
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                      <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <p className="text-white/30 text-sm">输入内容后点击生成</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
