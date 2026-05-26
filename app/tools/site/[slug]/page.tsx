'use client';

import { useParams, useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { tools } from '@/lib/tools';

const siteFeatures: Record<string, string[]> = {
  excalidraw: [
    '手绘风格白板，画图如手写般自然',
    '无限画布，自由缩放与拖拽',
    '支持多人实时协作编辑',
    '导出 PNG/SVG，可嵌入网页',
    '完全开源免费，无需注册',
  ],
  carbon: [
    '粘贴代码一键生成精美截图',
    '支持 30+ 编程语言语法高亮',
    '多种主题和窗口样式可选',
    '导出 PNG/SVG，社交分享利器',
    '开源免费，支持 URL 参数配置',
  ],
  jsonformatter: [
    'JSON 在线格式化与压缩',
    '树形结构查看，一目了然',
    '语法校验，错误定位精确',
    '支持 JSON ↔ XML/CSV 互转',
    '完全免费，无需安装',
  ],
  codesandbox: [
    '浏览器内秒级搭建前端项目',
    '支持 React/Vue/Angular/Svelte 等',
    '实时预览 + 热更新',
    '一键分享项目链接供他人查看',
    '免费个人使用，团队协作友好',
  ],
  photopea: [
    '浏览器内运行的类 Photoshop 工具',
    '支持 PSD/Sketch/XD/AI 文件编辑',
    '图层、滤镜、蒙版应有尽有',
    '无需安装，打开即用',
    '广告支持免费使用',
  ],
  kms: [
    '一键激活 Windows 和 Office，无需下载软件',
    '免费、安全、稳定，绿色无病毒',
    '支持 Windows 10/11 各版本系统激活',
    '支持 Office 2016/2019/2021 等版本激活',
    '提供 Office 软件安装指导',
  ],
  pdf24: [
    '20+ 种 PDF 工具，功能齐全',
    '合并、压缩、编辑、转换 PDF 文件',
    '完全免费，无任何限制，无水印',
    '无需安装软件或注册账号',
    '支持 PDF 与 Word/图片等格式互转',
  ],
  s7zy: [
    '公益免费的专业软件下载站',
    '涵盖 Adobe、Autodesk、Office 等热门软件',
    '支持 Windows / Mac / Android 多平台',
    '提供详细的安装教程和使用指南',
    '资源持续更新，安全无捆绑',
  ],
  fmhy: [
    '互联网上最大的免费资源导航集合',
    '覆盖影视、游戏、阅读、动漫、音乐等领域',
    '社区维护，持续更新有效链接',
    '分类清晰，快速找到所需资源',
    '完全开源，无广告无追踪',
  ],
  bmcx: [
    '老牌便民查询网站，功能丰富',
    '身份证归属地、IP 地址、手机号归属查询',
    '邮编、区号、车牌等生活信息查询',
    '支持各类实用在线计算工具',
    '纯网页操作，无需下载注册',
  ],
  aikanbot: [
    '利用爬虫技术聚合全网免费影视资源',
    '一键搜索电影、电视剧、综艺、动漫',
    '自动匹配可用在线播放源',
    '支持多线路切换，播放稳定',
    '无需注册，打开即搜即看',
  ],
  tbtool: [
    '图拉丁吧出品，DIY 爱好者必备工具合集',
    '集成 CPU/GPU/硬盘/内存等硬件检测工具',
    '开源免费，绿色无捆绑，无广告',
    '支持 Windows 7-11 全系列系统',
    '装机验机、性能测试一键启动',
  ],
};

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const tool = tools.find((t) => t.id === slug);
  const features = tool ? (siteFeatures[tool.id] || []) : [];

  if (!tool) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🔍</div>
          <h1 className="text-2xl font-bold text-[#fb6400] mb-4">未找到该工具</h1>
          <p className="text-gray-400 mb-8">抱歉，您访问的工具不存在或已被移除</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gradient-to-r from-[#fb6400] to-[#ff8c00] rounded-xl font-semibold hover:scale-105 transition-transform"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <BackButton toolId={slug} />
          <div className="ml-auto flex items-center gap-2">
            <img src="/logo.png" alt="9943" className="w-5 h-5 rounded" />
            <span className="text-xs text-[#fb6400] font-semibold">9943小工具大全</span>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-16 px-4 animate-fade-in">
        <div className="max-w-2xl mx-auto">
          {/* Icon */}
          <div className="text-center mb-8">
            <div className={`inline-block p-8 rounded-3xl mb-6 ${tool.icon.startsWith('/') ? 'border border-white/5' : 'glass-card border border-white/10'}`}>
              {tool.icon.startsWith('/') ? (
                <img src={tool.icon} alt={tool.name} className="w-20 h-20 object-contain" />
              ) : (
                <span className="text-7xl block">{tool.icon}</span>
              )}
            </div>
          </div>

          {/* Name with glow */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            <span
              className="text-[#fb6400]"
              style={{ textShadow: '0 0 20px rgba(251, 100, 0, 0.5), 0 0 40px rgba(251, 100, 0, 0.3)' }}
            >
              {tool.name}
            </span>
          </h1>

          {/* Description */}
          <p className="text-white/50 text-lg text-center mb-12">{tool.description}</p>

          {/* Features list */}
          <div className="glass-card rounded-2xl p-8 mb-12 border border-white/10">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-3">
              <span className="w-1.5 h-5 bg-gradient-to-b from-[#fb6400] to-[#ff8c00] rounded-full" />
              功能特点
            </h2>
            <div className="space-y-3">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 group"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-gradient-to-r from-[#fb6400]/20 to-[#ff8c00]/20 text-[#fb6400] text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-white/70 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <a
              href={tool.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-12 py-4 text-lg font-bold text-white rounded-2xl bg-gradient-to-r from-[#fb6400] to-[#ff8c00] hover:scale-105 hover:shadow-[0_0_30px_rgba(251,100,0,0.4)] active:scale-95 transition-all duration-300"
            >
              点击前往
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <p className="text-white/20 text-xs mt-4">将在新标签页中打开外部链接</p>
          </div>

          {/* Decor */}
          <div className="flex justify-center items-center gap-4 mt-16 opacity-30">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#fb6400]" />
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-[#fb6400]" />
              <div className="w-2 h-2 rounded-full bg-[#ff8c00]" />
              <div className="w-2 h-2 rounded-full bg-[#fb6400]" />
            </div>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#ff8c00]" />
          </div>

          <div className="text-center mt-8 pb-8">
            <p className="text-white/10 text-xs">9943小工具大全 · 更多工具等你探索</p>
          </div>
        </div>
      </main>

      {/* BG effects */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(251,100,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251,100,0,0.5) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#fb6400]/[0.03] rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
