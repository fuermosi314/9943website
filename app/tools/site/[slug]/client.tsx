'use client';

import { useParams, useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { tools } from '@/lib/tools';
import { useToolHistory } from '@/lib/useToolHistory';

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
  imagesplitter: [
    '在线图片分割，无需安装任何软件',
    '支持网格切割、自由切割、等分切割',
    '可自定义行列数，精确控制切割区域',
    '一键导出所有切片，支持 PNG/JPG 格式',
    '完全免费，支持拖拽上传',
  ],
  qinight: [
    '精心收录各类黑科技实用网站',
    '分类清晰：工具、设计、学习、娱乐等',
    '持续更新，人工筛选高质量资源',
    '界面简洁美观，快速找到所需网站',
    '免费开放，无需注册登录',
  ],
  phwalls: [
    '海量高质量手机壁纸免费下载',
    '分类丰富：风景、动漫、极简、抽象等',
    '支持多种分辨率，适配各型号手机',
    '每日更新，紧跟潮流趋势',
    '无需注册，直接下载原图',
  ],
  paperme: [
    '自定义生成各类打印纸模板',
    '支持方格纸、横线纸、五线谱、田字格等',
    '可调整间距、颜色、边距等参数',
    '生成 PDF 直接打印，排版精确',
    '完全免费，开源项目',
  ],
  virustotal: [
    '70+ 杀毒引擎同时扫描文件',
    '支持文件上传和 URL 在线检测',
    '查看详细检测报告和引擎识别结果',
    '社区评论和安全情报参考',
    '免费使用，Google 旗下安全产品',
  ],
  learngitbranching: [
    '交互式游戏化学 Git，告别枯燥教程',
    '可视化分支操作，直观理解 merge/rebase',
    '从入门到高级，循序渐进的关卡设计',
    '支持中文界面，降低学习门槛',
    '开源免费，浏览器直接运行',
  ],
  steampp: [
    'Steam 商店/社区加速，解决国内访问慢的问题',
    '本地令牌管理，多账号切换一键完成',
    '游戏库存管理，本地存档自动备份',
    '支持 Windows/macOS/Linux 多平台',
    '开源免费，无广告无捆绑，持续更新',
  ],
  aishort: [
    '精选 ChatGPT/Claude 高效提示词，一键复制',
    '分类清晰：写作、编程、翻译、营销等场景',
    '支持中英文切换，持续更新提示词库',
    '免费开源，无需注册即可使用',
    '社区贡献模式，人人可提交优质提示词',
  ],
  cook: [
    '程序员友好的简洁菜谱，步骤清晰易懂',
    '支持按食材、菜系、难度筛选',
    '每道菜配有详细用料和时间说明',
    '开源项目，支持暗黑模式',
    '适合新手的家常菜做法，简单易学',
  ],
  runoob: [
    '涵盖 HTML/CSS/JavaScript/Python/Java 等主流技术栈',
    '每篇教程配有在线实例，边学边练',
    '提供完整的参考手册和速查表',
    '支持在线代码运行工具，即时验证',
    '中文友好，适合编程入门和日常查阅',
  ],
};

export default function SiteDetailClient() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  useToolHistory(slug);

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 safe-area-top">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <BackButton category="website" />
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
