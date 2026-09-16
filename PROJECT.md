# 9943小工具大全 — 项目设计文档

> 每次开发本项目相关内容时，先阅读此文档。
>
> **权威性声明**：本文件是**唯一权威**的现行设计文档，描述的是代码**当前**的行为。
> `docs/superpowers/specs/` 与 `docs/superpowers/plans/` 下的文件是各工具**规划阶段的历史快照**
> （文件名带日期），只记录当时的设计意图，**不代表现状**，也不随代码更新。
> 两者冲突时，一律以**代码**为准，其次以本文件为准 —— 历史快照不参与裁决。

---

## 1. 项目简介

一个在线工具集合网站，设计风格参考 4399小游戏，以卡片式布局展示各类实用工具。

- **项目名**: 9943小工具大全
- **技术栈**: Next.js 14 + React 18 + Tailwind CSS 3 + TypeScript
- **项目路径**: `/home/huang/claude/vs/work/9943小工具大全`
- **部署计划**: 本地开发 → Git → Vercel 发布
- **当前工具数量**: 57 个（自动统计自 `lib/tools.ts`）

---

## 2. 设计系统

### 颜色方案
| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 主色（橙色） | `#fb6400` | 按钮、Logo、标题、选中态 |
| 渐变终止色 | `#ff8c00` | 橙色渐变的另一端 |
| 强调/危险 | `#ff4444` | 红色脉冲点等 |
| 页面背景 | `#0a0a1a` | 深蓝黑色 |
| 玻璃卡片背景 | `rgba(255,255,255,0.05)` | 毛玻璃效果 |
| 卡片悬浮边框 | `rgba(251,100,0,0.3)` | 橙色发光 |
| 正文色 | `#ffffff` | 白色文字 |
| 副文字 | `white/50` (50%透明) | 描述文字 |
| 次要文字 | `white/30` ~ `white/60` | 辅助信息 |

### CSS 变量 (globals.css)
```css
--color-primary: #fb6400;
--color-primary-dark: #e55a00;
--color-accent: #ff8c00;
--color-bg: #0a0a1a;
--color-card: rgba(255, 255, 255, 0.05);
--color-border: rgba(255, 255, 255, 0.1);
```

### 背景效果
页面背景有三层叠加（通过 body::before 和 body::after 实现）：
1. **渐变光晕**: 橙色/蓝色/紫色三个径向渐变
2. **网格线**: 50px × 50px 的白色细线网格（3% 透明度）
3. 任何工具页面的背景效果应与此保持一致

### 字体
- `Noto Sans SC`（Google Fonts 加载）
- 备用: `-apple-system, BlinkMacSystemFont, sans-serif`

### 动画
| 类名 | 效果 |
|------|------|
| `animate-fade-in` | 淡入 + 上移 10px，0.5s |
| `animate-slide-up` | 淡入 + 上移 20px，0.6s |
| `animate-glow` | 橙色光晕脉冲，2s 循环 |
| `glass-card` | 毛玻璃卡片样式，悬浮时橙色发光边框 |

---

## 3. 项目架构

```
9943小工具大全/
├── app/
│   ├── globals.css          # 全局样式、动画、变量
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 首页（工具网格 + 分类导航）
│   ├── feedback/page.tsx    # 意见反馈页（顶栏 Logo 链接入口）
│   ├── api/generate/
│   │   └── route.ts         # DeepSeek API 调用（爆款开头生成器）
│   ├── api/chat/
│   │   └── route.ts         # AI 客服（注入 tools.ts + faq.ts，公开免登录接口）
│   ├── api/video-parse/
│   │   └── route.ts         # 视频去水印解析 API（抖音/B站/西瓜）
│   ├── api/github-mirrors/
│   │   └── route.ts         # GitHub 镜像列表 API
│   ├── api/pdf-to-md/
│   │   └── route.ts         # PDF → Markdown AI 增强（DeepSeek 还原结构）
│   ├── api/fast-download/
│   │   ├── parse/route.ts   # 网盘链接解析（夸克/阿里/百度/115/天翼/迅雷）
│   │   ├── probe/route.ts   # 下载链接探测（文件大小/Range/CORS支持）
│   │   ├── download/route.ts # 分片下载代理
│   │   ├── aria2-release/route.ts # aria2 最新版本信息
│   │   └── idm-release/route.ts # IDM 最新版本信息（抓官网 exe 链接）
│   └── tools/
│       ├── bmi/             # BMI 计算器
│       ├── calculator/      # 专业计算器
│       ├── consumables/     # 耗知通（消耗品管理）
│       ├── desktop-cleaner/ # AI智能桌面整理大师
│       ├── earth-cannon/    # 毁灭地球的电磁炮
│       ├── everything/      # Everything 下载
│       ├── fast-download/   # 高速下载
│       ├── hook-generator/  # 爆款开头生成器
│       ├── icon-extract/    # 图标提取
│       ├── image-compress/  # 图片压缩
│       ├── image-convert/   # 图片格式转换
│       ├── image-crop/      # 图片裁剪
│       ├── image-resize/    # 图片调整大小
│       ├── image-rotate/    # 图片旋转/翻转
│       ├── md-to-html/      # 文档转换工具集（MD↔HTML、HTML→PDF、PDF→MD）
│       ├── office-to-pdf/   # Office 转 PDF
│       ├── online-compiler/ # 在线编译器导航
│       ├── pdf-compress/    # PDF 压缩
│       ├── pdf-merge/       # PDF 合并
│       ├── pdf-split/       # PDF 拆分
│       ├── pdf-to-office/   # PDF 转 Office
│       ├── qrcode/          # 二维码生成
│       ├── random-generator/# 随机数生成器
│       ├── simple-note/     # 简单记（日记工具）
│       ├── site/[slug]/     # 网站工具详情页（动态路由）
│       ├── smart-danmu/     # 智能弹幕
│       ├── steam/           # Steam 客户端下载
│       ├── steampp/         # Watt Toolkit 下载
│       ├── tianjige/        # 天机阁（3D 家居收纳）
│       ├── treesize/        # TreeSize 下载
│       ├── unit-converter/  # 单位换算
│       ├── video-unwatermark/ # 视频去水印
│       ├── wheel/           # 大转盘
│       └── word-count/      # 字数统计
├── components/
│   ├── Header.tsx           # 顶栏：Logo + 搜索框 + 在线状态
│   ├── ChatWidget.tsx       # 全站右下角 AI 客服气泡（z-40，展开时 z-[95]）
│   ├── CategoryNav.tsx      # 分类导航栏（sticky）
│   ├── ToolCard.tsx         # 工具卡片组件
│   ├── BackButton.tsx       # 统一返回按钮（回分类页）
│   ├── FullscreenButton.tsx # 全屏切换按钮
│   ├── CategorySelector.tsx # 分类选择器
│   ├── DatePicker.tsx       # 日期选择器
│   ├── TopicInput.tsx       # [爆款开头] 主题输入框
│   ├── PlatformSelector.tsx # [爆款开头] 平台选择器
│   ├── ContentTypeSelector.tsx # [爆款开头] 内容类型选择
│   ├── HookCard.tsx         # [爆款开头] 单个 hook 卡片
│   ├── HookGrid.tsx         # [爆款开头] hook 网格展示
│   ├── ErrorBanner.tsx      # [爆款开头] 错误提示
│   ├── HistoryPanel.tsx     # [爆款开头] 历史记录面板
│   └── tianjige/            # [天机阁] 3D 相关组件
├── lib/
│   ├── tools.ts             # 工具数据定义 + 分类 + 搜索
│   ├── faq.ts               # 客服问答知识库（133 条，供 AI 客服的 system prompt 使用）
│   ├── site-features.ts     # 网站工具的功能特点（详情页 + AI 客服知识源）
│   ├── types.ts             # TypeScript 类型
│   ├── prompts.ts           # DeepSeek 提示词模板
│   ├── storage.ts           # localStorage 封装
│   ├── useToolHistory.ts    # 工具历史记录 hook
│   ├── useFileUpload.ts     # 上传入口统一行为层：拖拽 + Ctrl+V 粘贴（见 5.7）
│   ├── category-manager.ts  # 分类管理工具
│   ├── md2pdf.ts            # Markdown → 文字型 PDF（pdfmake 排版）
│   ├── pdf2md.ts            # PDF → Markdown（pdf.js 提取 + 启发式重建）
│   ├── html-export.ts       # 导出 HTML 共享资源（内嵌 GitHub 风格 CSS + 组装）
│   ├── html-to-image-pdf.ts # 图片型 PDF（html2canvas + jsPDF 分页）
│   ├── print-pdf.ts         # 浏览器原生打印（离屏 iframe + window.print）
│   ├── consumables-db.ts    # 消耗品 IndexedDB
│   ├── download-db.ts       # 下载进度 IndexedDB（断点续传）
│   ├── simple-note-db.ts    # 简单记 IndexedDB
│   └── tianjige-db.ts       # 天机阁 IndexedDB
├── public/pdfjs/            # pdf.js worker（pdf.worker.min.mjs，本地化避免外部 CDN）
├── .env.local               # DeepSeek API 配置
├── tailwind.config.ts
├── postcss.config.js
└── package.json
```

---

## 4. 分类体系

| ID | 名称 | 图标 | 说明 |
|----|------|------|------|
| `favorites` | 收藏工具 | ⭐ | 用户收藏的工具列表，从左往右第一个分类 |
| `history` | 历史工具 | 🕐 | 用户使用过的工具，按最新使用时间排序，第二个分类 |
| `all` | 全部 | 🔥 | 默认视图，显示所有工具 |
| `image` | 图片工具 | 🖼️ | 图片压缩、格式转换、裁剪、缩放、旋转、图标提取 |
| `document` | 文档工具 | 📄 | PDF 系列 + 字数统计（原"文本工具"已合并至此） |
| `dev` | 开发工具 | 🔧 | 在线编译器导航 |
| `life` | 生活工具 | 🎯 | BMI 计算器、单位换算、专业计算器、视频去水印、简单记、耗知通、高速下载、天机阁 |
| `entertainment` | 娱乐工具 | 🎮 | 大转盘、二维码生成、随机数生成器、爆款开头生成器、毁灭地球的电磁炮 |
| `website` | 网站工具 | 🌐 | Excalidraw, Carbon, JSON 格式化, CodeSandbox, Photopea, KMS 激活, PDF24 Tools, S7 资源库, FMHY, 便民查询网, 爱看机器人, Steam 下载, 图吧工具箱, Image Splitter, 柒夜导航, PhWalls, 纸由我 PaperMe, VirusTotal, Learn Git Branching, Watt Toolkit, AI Short, 云游君的厨房, 菜鸟教程, Human Benchmark, Everything 下载, TreeSize 下载, VALORANT 灵敏度生成器, Steam 租号 |
| `software` | 软件工具 | 💿 | AI智能桌面整理大师、智能弹幕 |

### 收藏和历史功能
- **收藏工具**: 每个工具卡片右上角有心形收藏按钮，点击可收藏/取消收藏，收藏后在"收藏工具"分类页面显示
- **历史工具**: 用户进入工具页面时自动记录到历史，按最新使用时间排序，最多保存100条记录
- **数据存储**: 使用 localStorage 持久化，键名分别为 `9943-tool-favorites` 和 `9943-tool-history`

### 工具归属规则
- "文本工具"分类已删除，所有文本工具归入"文档工具"
- 二维码生成、随机数生成器、爆款开头生成器已移入"娱乐工具"
- 专业计算器替代原"进制转换"，本身自带进制转换功能

---

## 5. 关键设计规则

### 5.1 导航返回逻辑
**状态**: 已修复。使用 `BackButton` 组件统一处理，传入 `category` 参数即可跳转到 `/?category=xxx`。

**所有工具页面和新增工具都必须使用 `BackButton` 返回。**

### 5.2 Header 组件
- 固定顶部 (`fixed top-0`)，滚动后加深背景 + 毛玻璃效果
- 左侧：Logo（橙色渐变方块 + "9" + "9943小工具大全"）
- 中间：搜索框（圆角，实时搜索，支持按名称/描述/标签/功能关键词 `keywords` 匹配，支持空格拆分多关键词）
- 右侧：绿色脉冲点 + "在线"文字（预留在线人数功能，暂未实现）

### 5.3 CategoryNav 组件
- `sticky top-16`，固定在 Header 下方
- 水平滚动，选中态为橙色渐变胶囊
- 使用 URL 参数 `?category=xxx` 保持状态

### 5.4 ToolCard 组件
- 玻璃卡片样式 (`glass-card`)
- 悬浮时：放大 1.05x + 橙色渐变覆盖 + 底部橙色线条展开
- 内容：图标（14×14 容器） + 名称 + 描述
- 图标支持 emoji 和 `/` 开头的图片路径
- **外部网站工具**: 卡片本身可点击进入详情页（非直接跳转）

### 5.5 网站工具详情页 (/tools/site/[slug])
- 点击网站工具卡片 → 进入介绍页面（功能特点列表）→ "点击前往"按钮 → 新标签页打开外部链接
- 介绍页风格统一，使用 `lib/site-features.ts` 的 `siteFeatures` 数据（同一份数据也注入 AI 客服）

### 5.6 工具页面布局规范
每个工具页面应包含：
- 顶部导航栏（返回按钮 + 9943 Logo）
- 工具标题 + 描述
- 工具功能区
- 底部装饰元素（与网站整体风格一致）
- 背景效果（网格线 + 光晕，与首页一致）

### 5.7 上传交互规范

**凡是需要用户提供文件的地方，都必须同时支持三条路径，不允许只做「点击选择文件」。**

| 路径 | 实现 | 说明 |
|---|---|---|
| 点击选择 | 各工具自己的 `<input type="file">` | 移动端可拍照 / 进相册 |
| 拖拽 | `useFileUpload()` 返回的 `dropProps`，展开到落区元素上 | 拖拽中边框高亮 + 文案切换 |
| Ctrl+V 粘贴 | 同一个 `useFileUpload()`，内部挂 window 级 paste 监听 | **无需先点击上传区**，页面任意位置生效 |

统一走 `lib/useFileUpload.ts`，不要各写一份：

```tsx
const { isDragging, dropProps } = useFileUpload({
  onFiles: (files) => processFile(files[0]),  // 传各工具已有的入口函数，不必改动它
  accept: 'image/*',                          // 同 input 的 accept，两种写法（image/* 与 .pdf）都支持
  onReject: setError,                         // 类型不符时给提示，禁止静默忽略
});
```

约定与坑：

- **粘贴监听挂在 window，不是绑在上传区** —— 绑上传区需要先获得焦点，等于又要求用户先点一下
- **`input` / `textarea` / `contenteditable` 内的粘贴一律让路**，否则会抢掉文本框的正常粘贴（md-to-html 的 Markdown 输入框、字数统计、天机阁搜索框都靠这条）
- **弹窗内已有粘贴实现的，必须传 `enabled: false`**：日记配图（simple-note）、天机阁家具图都已有 React `onPaste`，再挂 window 监听会让同一次粘贴触发两次，**图片加两张**。这两处只用 `dropProps` 补拖拽
- 弹窗关闭时传 `enabled: false / !showEditor`，避免关闭状态下仍接管粘贴
- 粘贴 JSON 文本的入口（耗知通、天机阁存档、简单记备份）用 `textHandler` 先 `JSON.parse` 校验，成功才消费这次粘贴；灌回原有 `<input type="file">` 用 `setInputFiles()`，导入按钮逻辑不用改
- **移动端不获益**：手机浏览器不向页面派发粘贴事件，移动端仍走系统文件选择器
- hook 若在组件里有提前 `return null`，`useFileUpload()` 必须写在提前 return **之前**（hooks 规则）

---

## 6. 工具卡片尺寸规范
- 所有工具卡片的容器框必须保持一致大小
- 使用 `min-h-[2.5rem]` 确保名称和描述区域对齐
- 网格布局：`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
- 间距：`gap-4`

---

## 7. 特殊工具实现细节

### 7.1 大转盘 (wheel)
- 预设模板（5 个）：今天吃什么？、谁请客？、真心话大冒险、做什么运动？、看什么电影？
- 自定义类别：在右侧「选项列表」配置后点「+ 保存当前为自定义类别」，保存的类别出现在「我的类别」区域
  - 注意：`presets` 里另有一个 `自定义` 空键，但渲染按钮时被 `filter(name => name !== '自定义')` 过滤掉，**页面上不存在「自定义」预设按钮**
- 渐变色板：8 组颜色
- **SVG 绘制**（`useRef<SVGSVGElement>`），非 Canvas
- 音效功能：AudioContext 生成，支持开关（`soundEnabled` 状态）
- 参考设计：wheelpage.com/zh/
- **localStorage 持久化项**:
  - `wheel-custom-presets` — 用户自定义的类别名称 + 选项列表
  - `wheel-current-items` — 当前转盘的选项
  - `wheel-active-preset` — 当前选中的预设名称
  - `wheel-history` — 转盘历史记录

### 7.2 爆款开头生成器 (hook-generator)
- 从 Ai Hook Lab 项目整合
- **密码保护**: 需输入正确密码才能使用，验证状态保存在 localStorage（`hook-generator-auth`）
- 调用 DeepSeek API (`/api/generate`)
- API 配置在 `.env.local`：`DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`
- 支持多平台（小红书、抖音等）、多内容类型
- 生成 10 个不同风格的开头，含评分和理由

### 7.3 专业计算器 (calculator)
- 四种模式：标准 / 科学 / 程序员 / 日期
- 程序员模式自带进制转换功能（替代了原来的独立进制转换工具）
- 日期模式：日期差计算器（起始日期 + 结束日期 → 总天数、年/月/日、总周数、总小时、总分钟）

### 7.4 视频去水印 (video-unwatermark)
- 混合模式：服务端解析 + 第三方工具 Fallback
- **服务端解析**: 抖音、TikTok、B站、西瓜视频（通过各平台 API/页面数据直接解析）
- **Fallback**: 快手等不支持的平台跳转第三方工具
- API 路由: `/api/video-parse`，支持 IP 速率限制（每 IP 每分钟 10 次）
- 抖音解析流程: 多策略并行 → 短链重定向 + 移动端 UA → 提取 aweme_id → 调用详情 API / 分享页解析 → 获取无水印视频 URL
- TikTok 解析流程:
  - **模式 1 — 服务端 TikHub API**（默认）: 
    - 并行调用 TikHub V3 API（`fetch_one_video_by_share_url`）→ 优先提取 `download_no_watermark_addr`，降级到 `play_addr`（`need_set_token: false`，无 Referer 校验，不绑定 IP）
    - 页面元数据（`__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON / Embed 页面备用）作为数据源
  - **模式 2 — 浏览器端直连**（手动/自动降级）:
    - **自动降级**: 当 TikHub API 额度用尽或调用失败时，自动启用
    - **手动开关**: 前端提供 toggle 开关，勾选后请求带 `forceBrowser: true`，跳过 TikHub API，仅使用页面解析
    - 服务端仍从页面 HTML 提取 `itemStruct.video.downloadAddr` 和元数据
    - 前端使用该链接**从浏览器直接下载**（浏览器在用户代理网络下，TikTok CDN 放行）
    - 同时提供「在 TikTok 中打开」按钮作为 AIX 插件用户的备用方案
    - 无需任何浏览器插件即可工作
  - 环境变量: `TIKHUB_API_KEY`（TikHub API Key）
- TikTok 解析当前限制:
  - **调用次数有限**: TikHub 注册送 $2 额度（≈2000 次调用），用完后自动降级为浏览器端直连模式（无需付费，依赖用户代理）
  - **API 限制**: TikHub 部分端点有调用频率限制（默认 10 RPS），频繁使用可能被限流；限流后自动触发浏览器直连降级；TikTok 内容本身可能被删除或设私密，导致解析失败
  - **RapidAPI 未生效**: 已注册 `tiktok-video-downloader-7690-video-per-months-for-free` 并添加 API Key，但因订阅未完全激活，无法作为免费 fallback 使用
  - **依赖代理**: 用户浏览器必须配置代理才能访问 TikTok CDN 下载视频（TikTok 在部分地区被屏蔽）；浏览器直连模式同样依赖代理
  - **短链/分享口令**: TikTok 短链（`tiktok.com/t/XXXXX`）会自动跳转解析，部分视频 `download_no_watermark_addr` 为空时降级使用 `play_addr`
  - **短链/分享口令**: 部分 TikTok 短链或 APP 内复制链接可能包含额外参数，解析器会自动提取其中的标准 URL
- Bilibili 解析: 提取 BV ID → 获取视频信息 → 获取播放地址（DASH 格式）
- 解析失败时推荐第三方去水印网站

### 7.5 图标提取 (icon-extract)
- 纯前端解析，支持 PE (EXE/DLL/CPL/SCR/OCX/SYS/DRV)、ICO、LNK、URL 格式
- **PE 解析**: 手动解析 IMAGE_RESOURCE_DIRECTORY，支持命名资源（如 MAINICON）和数字 ID 资源
- **LNK 解析**: 读取 LinkInfo 提取 LocalBasePath（GBK 编码），支持自定义图标路径
- **URL 解析**: 读取 INI 格式的 IconFile 字段
- LNK/URL 无完整路径时显示友好提示，引导用户手动定位文件

### 7.6 毁灭地球的电磁炮 (earth-cannon)
- 全屏 Canvas 互动小游戏，纯前端实现
- 动画状态机：idle → charging → firing → beam → impact → explosion → aftermath
- 视觉元素：星空背景、卡通汪星人（太空头盔+呼吸动画+摇尾巴）、电磁炮（金属质感+能量线圈+蓝色辉光）、地球（渐变球体+大陆纹理+大气层）
- 爆炸效果：裂纹扩散、碎片粒子系统、冲击波环、闪光
- 点击"再来一次"可重置场景重新体验

### 7.7 简单记 (simple-note)
- 轻量级日记工具，按日期记录生活
- IndexedDB 双表存储（entries + photos），单设备持久保存
- 照片上传：Canvas 缩略图（200px）预览 + 原图 Blob 按需加载
- 5 种心情表情：开心/兴奋/普通/难过/生气
- 日历侧栏 + 列表布局，响应式（桌面端分栏，移动端切换）
- 全屏编辑器：日期、心情、文字、照片
- 数据备份/恢复：一键导出全部数据为 JSON（含 entries + 照片 base64），导入为合并模式（按 id 去重、只添加新条目）
- localStorage 键名：无（使用 IndexedDB）

### 7.8 高速下载 (fast-download)
- 多线程并行下载工具，支持 HTTP/HTTPS 直链
- **自动通道选择**: aria2 本地多线程 > CORS 直连 > 服务器中转，优先使用最优通道
- **自动测速选线程**: 探测成功后自动测试 1/2/4/8/16/32 线程速度，推荐最优线程数
- **aria2 集成**: 页面加载时自动检测 aria2 RPC，支持手动配置主机/端口/密钥
- **断点续传**: 下载中断自动保存进度到 IndexedDB，下次探测同一链接时可继续下载
- **GitHub 镜像自动测速**: 识别 GitHub Releases 链接，自动测试多个镜像源选最快
- **数据存储**: IndexedDB（`lib/download-db.ts`），下载完成或手动清除后自动删除
- **网盘链接支持**: 自动识别夸克/阿里/百度/115/天翼/迅雷网盘分享链接
- **解析后端**: 使用 alist 开源项目作为网盘解析服务（需自行部署）
- **API 路由**: `/api/fast-download/parse` — 网盘链接解析为直链
- **API 路由**: `/api/fast-download/aria2-release` — 获取 aria2 最新版本信息
- **API 路由**: `/api/fast-download/idm-release` — 获取 IDM 最新版本与下载链接（抓官网 exe 链接）
- **IDM 通道**: 支持调用本机 IDM 下载（`idm://` 协议），并提供 IDM 安装包的 8 线程分片下载
- **环境变量**: `ALIST_URL`（alist 服务地址）、`ALIST_TOKEN`（可选认证令牌）
- 百度网盘、115网盘支持提取码输入
- 未配置 alist 时网盘解析不可用，直链下载不受影响

### 7.9 天机阁 (tianjige)
- 3D 家居收纳工具，使用 Three.js 渲染房间和家具，一览无余
- **数据存储**: IndexedDB（`lib/tianjige-db.ts`）
- **核心组件**: `components/tianjige/Scene3D.tsx`
- **功能**: 预设场景（客厅/卧室/厨房等）、自定义场景管理、家具添加/移动、家具编辑（**两处入口**：① 选中家具后，在物品面板点「✏️ 编辑家具」按钮；② 直接在 3D 场景中操作 —— 触屏**长按家具 500ms**，桌面**右键点击家具**。支持重命名、改色、移动位置、旋转、缩放、删除）、物品记录（名称/分类/数量/价格/照片）、场景数据导入/导出
- **场景管理**: 底部工具栏"管理场景"按钮打开场景管理弹窗，支持新建/复制/删除场景（**预设场景也可删除**，代码未做区分）、JSON 导出/导入（导入时弹窗让用户二选一：「合并模式」只添加新场景，或「⚠️ 替换模式」清空后整体替换）

### 7.10 耗知通 (consumables)
- 消耗品管理工具，记录和追踪日常消耗品库存
- **数据存储**: IndexedDB（`lib/consumables-db.ts`）
- **数据结构**: Consumable（id, name, quantity, price, category, storageDate, expiryDate?, note?, createdAt, updatedAt）
- **分类**: 日用/食品/电子/办公/清洁/其他，每类有对应图标
- **功能**: 添加/编辑/删除消耗品、按名称/备注搜索、按分类筛选、多字段排序（名称/数量/金额/日期）、统计概览（总数量/总价值/物品种类）
- **导入导出**: JSON 格式，支持合并导入（只添加新条目）和替换导入（清空现有数据）
- **备份提醒**: localStorage 记录上次备份时间，超过 24 小时提醒用户
- **UI**: 响应式布局，全屏编辑器弹窗，删除确认对话框，Toast 提示

### 7.11 文档转换工具集 (md-to-html)
该页面是**包含三个转换功能的文档工具集页**，左侧有功能切换侧边栏，命名统一为「源 → 输出1/输出2」格式：MD → HTML/PDF / HTML → PDF/MD / PDF → MD/HTML：

> 页面组件：`client.tsx`（主组件 + tab 切换 + MD→HTML/HTML→PDF+MD）、`pdf-to-md.tsx`（PDF→MD）
> 共享资源：`lib/html-export.ts`（EMBED_CSS 内嵌样式 + buildFullHtml 组装，供 MD→HTML 和 PDF→MD 的 .html 下载共用，避免循环依赖）、`lib/html-to-image-pdf.ts`（图片型 PDF：html2canvas + jsPDF 智能安全切割线分页，供两个转 PDF 功能的「图片形式」共用）、`lib/print-pdf.ts`（浏览器原生打印：离屏 iframe + `window.print()`，供两个转 PDF 功能的「打印」共用）

> **转 PDF 均有三种形式**：
> ①**文字形式**（默认主按钮，pdfmake 排版，文字可复制/可搜索，体积小）；
> ②**图片形式**（html2canvas 整页截图 + jsPDF 分页合成，所见即所得、格式永不丢失，但文字不可搜索）；
> ③**浏览器打印**（🖨️，系统打印对话框「另存为 PDF」，排版质量最高；缺点：需手动确认，批量时逐个确认，单文件转换时最推荐）

#### 功能一：MD → HTML/PDF
- **三种输入模式**:
  - ✏️ **粘贴 Markdown**: 直接输入 Markdown 代码，300ms 实时预览
  - 📁 **上传文件**: 上传单个 .md/.markdown 文件（支持拖拽），上传后可重新选择替换
  - 📂 **批量上传**: 上传多个 .md 文件（文件选择器多选或拖拽），左侧文件列表点选切换预览
- **实时预览**: 300ms debounce，左右分栏（桌面端）/ 上下堆叠（移动端），批量模式下右侧显示当前选中文件的预览
- **Markdown 解析**: 使用 `marked` 库，支持 GFM（表格、任务列表、删除线等）
- **XSS 防护**: `DOMPurify` 清理输出 + iframe sandbox 双重防护
- **输出选项**:
  - 复制完整 HTML 代码（含内嵌 GitHub 风格 CSS）
  - 下载单个 .html 文件
  - 📦 **批量下载**: 一键逐个下载所有 HTML 文件（300ms 间隔避免浏览器拦截），不打包 ZIP
  - 📄 **下载 PDF（文字）**: Markdown 直接转为文字型 PDF（pdfmake 排版，文字可复制/可搜索），单个模式「📄 下载 PDF（文字）」按钮，批量模式「📄 批量转 PDF（文字）」按钮
  - 🖼️ **下载 PDF（图片）**: 用内嵌 GitHub 风格 CSS 渲染为完整 HTML（`buildFullHtml`）后整页截图为图片型 PDF（`lib/html-to-image-pdf.ts` 的 `htmlToImagePdf`），所见即所得、格式永不丢失；单个「🖼️ 下载 PDF（图片）」+ 批量「🖼️ 批量转 PDF（图片）」
  - 🖨️ **打印 PDF（浏览器）**: 离屏 iframe + 系统打印对话框（`lib/print-pdf.ts`），排版质量最高；单文件转换最推荐；单个「🖨️ 打印 PDF」+ 批量「🖨️ 批量打印 PDF」（批量需逐个确认）
- **MD → PDF 实现**（`lib/md2pdf.ts` + `lib/html-to-image-pdf.ts`）:
  - 流程: `marked.lexer` 解析 tokens → 转换为 pdfmake 文档定义 → 运行时注入中文字体渲染，零弹窗直接下载
  - **中文字体**: Noto Sans CJK SC 子集（GB2312 全字集 7542 字符 + ASCII，Regular/Bold 各约 1.8MB），存放在 `public/fonts/`，首次转换时 fetch 注入 pdfmake virtualfs（base64），之后走浏览器缓存
  - **样式**: 仿 GitHub 风格（标题层级、代码块灰底、引用左边框、表格斑马纹），与 HTML 导出 CSS 一致
  - **支持的语法**: 标题/段落/加粗/斜体/行内代码/链接/图片（data: 与 http(s)，相对路径或加载失败的图片降级为 `[图片: xxx]` 文本）/无序有序嵌套列表/任务列表（√/□ 前缀）/表格（表头灰底 + 斑马纹）/引用/代码块/分割线；原始 HTML 块跳过
  - **渲染参数**: A4 页面，边距 40/48pt，正文 11pt 行高 1.6
  - **依赖**: pdfmake 0.3（运行时动态导入避免 SSR 报错；0.3 版 API 用 `virtualfs.writeFileSync` + async `download()`），类型声明在项目根 `pdfmake.d.ts`（pdfmake 0.3 无内置类型）
- **内嵌 CSS**: GitHub 风格排版样式，独立打开时也能正确渲染
- 批量模式下支持：添加更多文件、重新选择替换、清除全部
- 无代码语法高亮

#### 功能二：HTML → PDF/MD
- **三种输入模式**（与 MD → HTML 对称）:
  - ✏️ **粘贴 HTML**: 直接输入 HTML 源码
  - 📁 **上传文件**: 上传单个 .html/.htm 文件，左侧显示源码片段预览
  - 📂 **批量上传**: 上传多个 .html 文件，左侧文件列表点选切换
- **实现原理**: 文字形式 = `turndown` 将 HTML 转 Markdown（仅提取 `<body>` 内容，避免 head 的 style/title 混入正文）→ 复用 MD→PDF 文字型管线（`lib/md2pdf.ts` 的 `htmlToPdf`）→ pdfmake 排版直接下载（pdftotext 验证可搜索）
  - **适用场景**: 结构化 HTML（本工具 MD→HTML 导出的 GitHub 风格 HTML 等）；复杂 CSS 布局（flex/grid、绝对定位、嵌入 iframe）会降级为结构化文本
  - **转换配置**: `codeBlockStyle: 'fenced'`（围栏式代码块）、`headingStyle: 'atx'`（# 标题）、自定义规则将 checkbox 转为 `[x]`/`[ ]` 任务列表
- **预览**: 右侧 iframe 渲染完整 HTML 页面效果
- **Markdown 输出**（并入本功能，与 MD → HTML 的「下载 PDF」对称）:
  - 单个文件：「📋 复制 Markdown」+「⬇ 下载 Markdown」按钮（turndown 实时转换）
  - 批量文件：「📦 批量转 MD」按钮（逐个下载 .md，300ms 间隔避免浏览器拦截）
- **三种 PDF 形式**:
  - **文字形式**（默认主按钮）: HTML 经 turndown → pdfmake 排版，文字可复制/可搜索，文件体积小（10MB 课件 → 约 300KB）；复杂 CSS 布局（flex/grid、绝对定位）会降级为结构化文本
  - **图片形式**: `lib/html-to-image-pdf.ts` 的 `htmlToImagePdf` 直接对渲染后的 HTML 截图（html2canvas scale 2 + jsPDF，智能安全切割线分页：切点落在块级元素缝隙中点，避免文字行/图片/表格行被切断），所见即所得、格式永不丢失，但文字不可搜索
  - **浏览器打印**（🖨️ 打印 PDF）: `lib/print-pdf.ts` 写入离屏 iframe（sandbox="allow-modals allow-same-origin"，置于视口外而非 display:none）后 `contentWindow.print()`，系统打印对话框选「另存为 PDF」；排版质量最高（浏览器引擎渲染）；需手动确认，批量逐个确认
- **操作**:
  - 单个文件：「📄 下载 PDF（文字）」+「🖼️ 下载 PDF（图片）」+「🖨️ 打印 PDF」+「📋 复制 Markdown」+「⬇ 下载 Markdown」按钮
  - 批量文件：「📄 批量转 PDF（文字）」+「🖼️ 批量转 PDF（图片）」+「🖨️ 批量打印 PDF」+「📦 批量转 MD」（全部）+「⬇ 下载 xxx.pdf」（单个）
- **直接下载**: 点击按钮后浏览器直接弹出文件保存对话框，零弹窗、零打印对话框
- **动态导入**: `await import('turndown')` / `html2canvas` / `jspdf` + pdfmake 运行时加载，避免 SSR 报错
- 批量模式下支持：添加更多、重新选择、清除全部

#### 功能四：PDF → MD/HTML
- **输入**: 上传单个 .pdf 文件（支持拖拽），仅限文字型 PDF
- **两种重建方案**:
  - **方案一：启发式重建（免费秒出，默认）**: `lib/pdf2md.ts` 用 pdf.js（`pdfjs-dist` v6）逐页提取文本 + 字号 + 字体名（`getOperatorList` 强制解析后从 `commonObjs` 取真实字体名）→ 按规则重建 Markdown
  - **方案二：🤖 AI 增强（更准确）**: 把每页提取的纯文本发到 `/api/pdf-to-md`，DeepSeek 分块还原结构（每块 4000 字符，逐块拼接）
- **启发式规则**（`linesToMarkdown`）:
  - 字号中位数 = 正文基准；≥1.8× → `#`，≥1.5× → `##`，≥1.2× → `###`
  - 行首 `-/*/•` → 无序列表，`\d+[.、)]` → 有序列表（连续列表项不插空行）
  - 等宽字体（Courier/Mono/Consolas 等）连续行 → 代码块
  - 加粗字体（Bold/Black 等）且非标题 → `**加粗**`
  - 行距 > 1.8× 字号 → 分段；同段连续行空格连接；页间空一行
  - 已知局限: 扫描版（图片型）PDF 无文字层无法转换；复杂表格/多栏排版还原质量一般（建议用 AI 增强）
- **输出**: 左侧 Markdown 源码（可编辑）+ 右侧实时预览（marked 渲染）+
  - 🤖 AI 增强（还原结构，复用 `.env.local` 的 DeepSeek 配置）
  - 📋 复制 Markdown / ⬇ 下载 .md / ⬇ 下载 .html（复用 `lib/html-export.ts` 的 GitHub 风格 HTML）
- **pdf.js worker 本地化**: worker 文件复制到 `public/pdfjs/pdf.worker.min.mjs`，`GlobalWorkerOptions.workerSrc` 指向本地（`application/javascript` MIME 验证通过，ESM worker 正常加载）
- **依赖**: `pdfjs-dist` v6（客户端动态导入，独立 chunk ~428KB，首次使用才加载；Node 环境需用 legacy build，浏览器端用现代 build）
- **API 路由**: `/api/pdf-to-md`（POST `{ pages: string[] }`，每页提取文本）— 速率限制每 IP 每分钟 10 次，页数上限 100，字符上限 200K

### 7.12 Human Benchmark (human-benchmark)
- 网站工具，归类于「网站工具」分类
- 在线认知能力测试集合，挑战反应力与记忆力
- **测试项目**: 反应时间、序列记忆、数字记忆、词汇记忆、视觉记忆、打字速度、Chimp Test
- 所有测试结果可追踪历史，查看进步趋势
- 完全免费，无需注册，浏览器直接运行

### 7.13 图片裁剪 (image-crop)
- 上传图片后通过 `react-image-crop` 提供**交互式可视化裁剪选区**
- **交互功能**: 拖拽框选 / 8 手柄调整大小 / 拖拽选区移动 / 三分线辅助网格 / 宽高比锁定
- **5 个宽高比预设按钮**: 自由 / 1:1 / 4:3 / 16:9 / 9:16（竖屏）
- **双向同步**: 拖拽选区 ↔ 四个数字输入框（X/Y/宽/高）实时同步，实现精确裁剪
- Canvas 裁剪输出，支持 PNG/JPG/WebP 下载
- 移动端触摸操作支持

### 7.14 VALORANT 灵敏度生成器 (valorant-sens)
- 网站工具，归类于「网站工具」分类，跳转外部站点
- 基于鼠标 DPI 与鼠标垫大小，生成专属 VALORANT（无畏契约）游戏内灵敏度
- 快速瞄准测试（flick）：目标随机出现，统计命中数、平均反应时间、命中率、平均距离
- 自动计算 eDPI，提供游戏内设置指引（灵敏度 + DPI 校准说明）
- 支持一键复制灵敏度数值，VALORANT 风格 UI
- 完全免费，浏览器直接运行，无需注册

### 7.15 Steam 租号 (steamshare)
- 网站工具，归类于「网站工具」分类，跳转外部站点
- Steam 热门游戏账号租赁商城（https://steamshare.cn/）
- 热门大作即租即玩，下单秒取号，登录验证简单快捷
- 支持在线续租，游玩不断档；兑换码兑换时长
- 账号共享安全可靠，全程客服支持

### 7.16 AI智能桌面整理大师 (desktop-cleaner)
- 软件工具分类，Windows 桌面程序（非网页工具）
- 从 GitHub `fuermosi314/apps` 的 latest release 自动获取版本号（请求失败时兜底 v2.0.0）
- 规格标注：Windows 64位 · 97MB
- 「⚡ 高速下载」按钮跳转 `/tools/fast-download?url=<release 地址>`，不在本站直接托管安装包

### 7.17 智能弹幕 (smart-danmu)
- 软件工具分类，Windows 桌面弹幕助手（非网页工具）
- 从 GitHub `fuermosi314/apps` 的 latest release 自动获取版本号（请求失败时兜底 v2.0.1）
  - 注意：与 desktop-cleaner 读的是**同一个仓库**，所以两个页面正常显示同一个版本号
- 规格标注：Windows 64位 · 75MB
- 「⚡ 高速下载」按钮跳转 `/tools/fast-download?url=<release 地址>`
- 基于开源项目 DanmuAI

### 7.18 PDF 转 Office (pdf-to-office)
- **⚠️ 当前不做正文转换**：只读取 PDF 的**页数**，然后按页数生成一个框架 ——
  docx 每页一个「[第 N 页]」段落、xlsx 两列（页码/内容）、pptx 每页一张幻灯片，
  正文一律填占位串「此页文本需使用专业工具提取」。**全文没有任何文本提取调用**
  （没有 pdfjs 的 `getTextContent`），因为它是纯前端实现，提取质量达不到可用水平
- 页面上有一行小字如实说明：「纯前端 PDF 文本提取功能有限，如需完整内容转换请使用专业工具」
- 因此 `lib/tools.ts` 的描述写的是「导出 Word/Excel/PPT 的页数框架，不提取 PDF 正文」，
  `lib/faq.ts` 的对应问答也照这个口径写，并把用户引到「PDF → MD/HTML」那条真能提取文字的管线
- **若将来要补全这个工具**：`pdfjs-dist` 项目里已经有了（`lib/pdf2md.ts` 在用），
  把提取出来的文字按页灌进 docx/xlsx/pptx 即可；补全后要同步改上述两处文案
- 遗留：`client.tsx` 里的 `pageContents` 和 `header` 两个变量构建后从未被使用，是死代码

---

## 8. 数据持久化

### localStorage 键名汇总
| 键名 | 来源 | 用途 | 上限 |
|------|------|------|------|
| `9943-tool-favorites` | storage.ts | 工具收藏列表（工具ID数组） | 无 |
| `9943-tool-history` | storage.ts | 工具使用历史（toolId + timestamp） | 100 条 |
| `wheel-custom-presets` | wheel 页面 | 自定义转盘类别 | 无 |
| `wheel-current-items` | wheel 页面 | 当前转盘选项 | 无 |
| `wheel-active-preset` | wheel 页面 | 当前预设名 | 无 |
| `wheel-history` | wheel 页面 | 转盘结果历史 | 50 条 |
| `hook-generator-auth` | hook-generator 页面 | 密码验证状态 | 无 |
| `ai-hook-lab-history` | storage.ts | 爆款开头生成历史 | 50 条 |
| `ai-hook-lab-favorites` | storage.ts | 收藏的生成结果 | 无 |
| `consumables-last-backup` | consumables 页面 | 上次备份时间戳 | 无 |
| `fast-dl-method` | fast-download 页面 | 下载方式偏好（aria2/browser/idm）| 无 |
| `fast-dl-aria2-host` | fast-download 页面 | aria2 主机地址 | 无 |
| `fast-dl-aria2-port` | fast-download 页面 | aria2 端口 | 无 |
| `fast-dl-aria2-secret` | fast-download 页面 | aria2 密钥 | 无 |
| `fast-dl-aria2-path-hint` | fast-download 页面 | aria2 搜索路径提示 | 无 |
| `tianjige-guide-seen` | tianjige 页面 | 首次使用引导已读标记 | 无 |
| `tianjige-last-backup` | tianjige 页面 | 上次导出备份的时间戳（超 24 小时提醒备份） | 无 |

> 注意：`lib/storage.ts` 的键名仍保留 `ai-hook-lab-` 前缀（从 Ai Hook Lab 迁移而来）

### IndexedDB 数据库
| 数据库 | 来源 | 用途 |
|--------|------|------|
| `simple-note-db` | simple-note 页面 | 日记条目 + 照片 |
| `consumables-db` | consumables 页面 | 消耗品记录 |
| `category-manager-db` | `lib/category-manager.ts` | 消耗品/天机阁的自定义分类（consumables 页面、CategorySelector 组件共用） |
| `tianjige-db` | tianjige 页面 | 3D 场景数据 |
| `fast-download-db` | fast-download 页面 | 下载进度缓存（断点续传） |

---

## 9. API 配置

```env
# .env.local
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1  # 阿里云百炼 OpenAI 兼容模式
DEEPSEEK_MODEL=deepseek-v4.1-flash

# 网盘解析服务（alist）
ALIST_URL=https://alist.example.com
ALIST_TOKEN=

# AI 客服的共享限流（Upstash for Redis，由 Vercel 集成自动注入）
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=xxx
```

- **AI 服务商：阿里云百炼（Bailian）**，走它的 **OpenAI 兼容模式**端点
  `https://dashscope.aliyuncs.com/compatible-mode/v1`，模型 `deepseek-v4.1-flash`。
  **注意**：`bailian.console.aliyun.com` 是控制台网页（返回 HTML），**不是 API 地址**，别配错。
  变量名仍沿用 `DEEPSEEK_*`（历史原因），实际指向的是百炼
- API 调用仅在服务端 (`/api/generate/route.ts`、`/api/chat/route.ts`、`/api/pdf-to-md/route.ts`)
- 网盘解析通过 alist 开源项目实现 (`/api/fast-download/parse/route.ts`)
- 共享限流通过 Upstash 的 REST 接口实现，**不引入 npm 依赖**（原生 `fetch`）
- 使用原生 `fetch()`，无第三方 AI SDK
- API Key 不发送到客户端
- **Vercel 端的环境变量**：`vercel env ls` 查看；`KV_REST_API_*` 由集成自动注入到
  Production / Preview / Development 三套环境。本地开发用 `vercel env pull` 拉取
- **⚠️ 本地跑客服测试会消耗线上额度**：限流的 Redis key 是 `chat:day:<日期>`，
  **不带环境前缀**，本地 `.env.local` 里的 `KV_REST_API_*` 又指向同一个 Upstash 库 ——
  所以本地每次调 `/api/chat` 都算进线上那 1000 次/天里。
  想让测试不占线上额度，就临时把这两个变量从 `.env.local` 移走（会退回内存限流）
- **换服务商时别漏了**：`DEEPSEEK_MODEL` 的**代码兜底值**也写着模型名
  （三处 route 里的 `process.env.DEEPSEEK_MODEL || '…'`），环境变量缺失时会用到它

---

## 10. 依赖包

| 包 | 用途 |
|----|------|
| next | 框架 |
| react / react-dom | UI 库 |
| tailwindcss | 样式 |
| qrcode | 二维码生成 |
| pdf-lib | PDF 操作 |
| docx | Word 文档操作 |
| pptxgenjs | PPT 生成 |
| xlsx | Excel 操作 |
| marked | Markdown 解析（md-to-html 工具） |
| dompurify | HTML 净化/XSS 防护（md-to-html 工具） |
| pdfmake | MD → 文字型 PDF 排版（md-to-html 工具，运行时动态导入） |
| turndown | HTML → Markdown 转换（md-to-html 工具，运行时动态导入） |
| html2canvas | HTML 整页截图（md-to-html 工具「图片形式」PDF，运行时动态导入） |
| jspdf | 图片型 PDF 合成（md-to-html 工具「图片形式」PDF，运行时动态导入） |
| pdfjs-dist | PDF 文本提取（md-to-html 的 PDF→MD 功能，运行时动态导入） |
| react-image-crop | 交互式图片裁剪选区（image-crop 工具） |
| alist | 网盘解析服务（外部部署，非 npm 包） |

---

## 11. 页面元数据 (layout.tsx)

```tsx
title: '9943小工具大全 - 简单好用的在线工具集'
description: '为你精心准备的效率工具集，包含图片压缩、二维码生成、字数统计等实用工具，让工作更轻松。'
keywords: '在线工具, 效率工具, 图片压缩, 二维码生成, 字数统计'
lang: 'zh-CN'
```

---

## 12. 开发规范

### 新增工具时必须注意：
1. 在 `lib/tools.ts` 中添加工具定义（id, name, description, icon, category, path, tags）
2. 在 `app/tools/` 下创建对应页面
3. 工具页面的返回按钮必须回到正确分类（通过 URL 参数 `?category=xxx`）
4. 工具页面的顶部导航栏、背景效果要与网站整体风格一致
5. 网站工具需同时添加到 `lib/tools.ts`（含 `externalUrl`）和 `lib/site-features.ts` 的 `siteFeatures`
6. 所有工具卡片框的尺寸必须一致
7. **每次增删工具后，必须更新本文档**（工具数量、架构图、分类表、数据持久化表等所有相关内容）
8. **每次修改代码后，检查本文档是否有过时内容**，如有则同步更新

### 自动维护要求
本文档是项目的唯一权威设计文档。任何代码变更如导致本文档描述与实际情况不一致，**必须同步更新**本文档对应章节，确保文档始终反映项目当前状态。

### 风格一致性：
- 主色 `#fb6400` 不可更改
- "9943小工具大全"标题保持橙色，不改样式
- 新页面需包含相同的背景效果（网格 + 光晕）
- 使用 `glass-card` 类实现毛玻璃效果

---

## 13. 待办 / 后续规划
- [x] **修复全部工具页面的返回导航**（已用 BackButton 组件替代 router.back()）
- [x] **密码安全修复**（已改为 SHA-256 哈希验证，密码不再明文出现）
- [x] **API 速率限制**（已添加每 IP 每分钟 5 次限制 + topic 长度限制：前端输入框 50 字符，服务端 100 字符兜底）
- [x] **PDF 工具 alert() 替换**（已改为 React state 内联错误提示）
- [x] **计算器进制标签汉化**（BIN/OCT/DEC/HEX 已改为中文）
- [x] **计算器手机端优化**（按钮高度、响应式布局已修复）
- [x] **Office-to-PDF 中文支持**（自动加载 LXGW WenKai 字体，失败时降级为 ASCII）
- [x] **分类切换动画逻辑**（sessionStorage 追踪已动画分类：首次进入蹦出动画，后续进入全部一起出现）
- [x] **【最高优先级】网站智能客服（AI 问答助手）** —— **已完成并端到端实测**
  - **需求**：网站右下角提供 AI 客服，访客可就"有哪些工具、怎么用、为什么失败"提问，AI 依据站内知识作答
  - **技术方案（已论证，不引入外部平台）**：不使用 Coze / 毕昇等平台，直接在现有项目内实现
    - [x] `lib/faq.ts` — 问答文档（133 条）
    - [x] `app/api/chat/route.ts` — 调用 DeepSeek，注入知识
    - [x] `components/ChatWidget.tsx` — 右下角聊天气泡，挂载于 `app/layout.tsx`
  - **知识来源（三份，全部全量注入 system prompt）**：
    1. `lib/tools.ts` 工具目录 —— 每行 `- [分类] 名称：描述（站内页面/外部网站｜用户也可能说：keywords…）`，
       **`keywords` 必须一起注入**：它是按「用户会怎么问」写的口语化说法，
       不注入的话「图片变小」「查字数」这类提问匹配不上工具名，会白白掉进兜底话术
    2. `lib/faq.ts` 问答文档
    3. `lib/site-features.ts` 的 `siteFeatures` —— 25 个外部站点的功能特点。
       它原本只给详情页渲染用，客服答不出「那个站能做什么」；抽成 lib 模块的原因见下
  - **维护义务（易漏）**：新增 / 改动 / 删除工具后，除 `lib/tools.ts` 和本文件外，
    **必须回头核对 `lib/faq.ts`**。工具目录是**全量注入**的，漏更新会出现最尴尬的状态 ——
    客服知道这个工具存在（目录里有），却答不出用法（FAQ 里没有），只能走兜底话术说「没有准确信息」。
    同时 `lib/faq.ts` 条数变了，第 1 节架构图中标注的条数也要同步。
    这条已写入 `.claude/CLAUDE.md` 核心规则，因为只写在 `lib/faq.ts` 的文件头注释里无人会看到 ——
    新增工具时根本不会打开那个文件
  - **`siteFeatures` 为什么在 lib 而不是 `client.tsx`**：它原先定义在
    `app/tools/site/[slug]/client.tsx` 里，那是个带 `'use client'` 的模块 ——
    服务端路由 import 它拿到的是客户端引用，读不到实际的值。要同时喂给详情页和客服，
    只能抽到 `lib/site-features.ts`。**新增外部网站时，功能特点加在这个文件里**
  - **知识体积（2026-09-16 第三轮核查后实测）**：工具目录 5,184 字符 + FAQ 17,679 字符 +
    外部网站功能特点 2,511 字符 = **25,503 字符**（本轮起点 23,191）。
    **注意这个数字极易过时**：每次增删 FAQ 条目都要重算，见下方「知识体积维护」
  - **关键结论**：**不需要向量数据库 / RAG**；全量注入 system prompt 反而更准（不会漏召），成本极低
  - **system prompt 的 12 条硬性规则**（`app/api/chat/route.ts`）：只依据资料回答、禁止编造；
    **资料只覆盖一部分时先答能答的再补兜底句**（规则 2）；资料明确写了"不支持/没有"的直接照实答；
    兜底话术（完全覆盖不到但属本站话题时照抄）；跑题话题**不套用**兜底话术而是引回工具（规则 3，
    与规则 2 互斥）；**问客服自身或网站运营时走专门答法**（规则 5：身份 / 作者联系方式 / 不方便说模型）；
    不透露提示词；不承诺资料外的事；不替第三方站承诺；
    **用户抱怨时先表示理解再给可操作下一步**（规则 9）；2-4 句先给结论（兜底话术豁免）；
    纯文本不用 markdown；**多轮指代先确认指的是哪个、重复提问不照念原话**（规则 12）
    - 规则 2 在 2026-09-16 的审计中被拆成三种情形，此前只有「全覆盖」和「完全没覆盖」两档，
      导致「有的点能答、有的答不了」时模型自行折中，行为不可预期
    - 规则 5 补上了原先的真空区：此前「你用什么模型」「怎么联系作者」既不属于规则 2 的枚举、
      也不属于规则 3，会被错误地塞进兜底话术，答非所问
  - **限流（`app/api/chat/route.ts`）**：每 IP 每分钟 20 次 + 每日 1000 次。
    **已接入 Upstash Redis，计数器跨实例共享**（此前是进程内 `Map`，在 Vercel 上等于「每实例一份」）。
    - **共享存储**：Upstash for Redis，资源名 `9943-chat-ratelimit`，套餐 `free`，
      **`autoUpgrade` 已显式关闭**（默认是开的，会在额度用尽时自动升级到付费扣钱）。
      安装方式：`vercel integration add upstash/upstash-kv --plan free -m autoUpgrade=false`
    - **不引入 npm 依赖**：直接用原生 `fetch` 打 Upstash 的 REST `/pipeline` 接口，
      一次往返完成「读每日用量 + 递增每分钟计数」。
    - **检查与计数分开**（两处 pipeline 调用）：校验通过、马上要调模型时才递增每日计数，
      避免畸形请求（不花钱）把全站额度刷光
    - **fail-open**：Redis 不可用时自动退回本实例的内存限流并打日志。
      理由：客服挂掉的概率远高于被恶意刷爆的概率，不该为防小概率事件引入高频故障点
    - 调用方 IP：优先取平台注入的 `x-real-ip`，回退取 `x-forwarded-for` 的**最后一段**
      （最左段是客户端可注入的）
    - 两种 429 文案分开：额度打满时说「今天的咨询量已经满了」，不要说成用户"问得太快"
    - **仍需注意**：`x-real-ip` 本身在非 Vercel 环境下也可伪造；若将来换部署平台需重新确认
    - **边缘层限流（Vercel Firewall）不可用**：实测报 `IP Bypass is unavailable...
      Pro and Enterprise plans include it (402)` —— 免费档没有此功能
    - 新增调用外部服务的路由时，记得在 `vercel.json` 加 `maxDuration`，并确认是否需要共享限流
  - **入参校验**：最多取最近 20 条消息、**用户消息 ≤1000 字 / 助手消息 ≤4000 字**、总长 ≤12000 字、
    角色仅允许 user/assistant、最后一条必须是 user。
    助手消息上限更高的原因：客户端会原样回传历史，若对助手回复也卡 1000 字，
    某次回复一旦超过 1000 字，这个会话之后每次请求都会被判 400，**永久卡死**
  - **UI 要点**：气泡 `z-40`（低于站内浮层），面板展开时 `z-[95]`
    （低于三处 `z-[100]` 全屏遮罩＝模态态优先，高于工具侧栏 60 / 编辑弹窗 70 / 确认框 80）；
    **`bottom-6 right-6` 这个位置由全局客服气泡占用** —— 页面级的悬浮按钮必须避让：
    - `components/HistoryPanel.tsx` 的圆形按钮 → 已移至 `bottom-24`
    - `app/tools/simple-note/client.tsx` 移动端「+」FAB → 已移至 `bottom: calc(6rem + safe-area)`
      （该按钮用**内联 style** 定位，按 class 搜不到，排查时容易漏）
    - 天机阁上帝视角的旋转按钮在 `bottom-24 right-4`，底边高于气泡，不冲突
    - **以后新增右下角悬浮按钮时，先确认不会和客服气泡重叠**；
    **输入框处理了中文输入法组合态**（`isComposing`），避免按回车选词时发出半截消息
  - **部署**：Vercel，零额外服务器；沿用现有 `DEEPSEEK_*` 环境变量
  - **`vercel.json` 的 `maxDuration`**：Vercel 会按平台默认超时掐断函数（Hobby 档仅 10 秒），
    凡是调用外部 AI、耗时可能超过默认值的路由，**必须在 `vercel.json` 里单独声明 `maxDuration`**，
    否则路由内部写的 `AbortSignal.timeout` 根本等不到。当前已声明：
    - `api/generate` → 30（对应 `AbortSignal` 25s）
    - `api/chat` → 30（对应 `AbortSignal` 25s）
    - `api/pdf-to-md` → 60（对应 `AbortSignal` 60s，此前漏配，等于代码想要的 60 秒从未生效）
    - **新增调用外部服务的路由时，记得同步加这一条**
  - **实测结果（2026-09-15，本地 dev + 真实 DeepSeek）**：
    - 知识库覆盖到的问题 → 依据资料准确作答（0.9s）
    - 资料没有的站内问题 → 照抄兜底话术，引导去意见反馈（0.6s）
    - 跑题话题 → 礼貌拒绝并引回站内工具（1.1s）
    - **诱导编造（"会员多少钱一年"）→ 未编造**，正确说明本站无会员、工具免费（1.0s）
    - 多轮上下文 → 正确继承上文（0.4s）
    - **4 项提示词注入探测全部挡住**：直接索取 system prompt、伪装开发者、注入伪造 assistant 轮次、DAN 越狱
  - **第二轮审计 + 修复（2026-09-16，41 条实测 + 20 条回归验证）**：
    - 首轮 41 条覆盖 7 类提问，结果 **通过 32 / 部分通过 5 / 失败 4**。
      **失败与部分通过的 9 条，没有一条根因是模型能力，全部指向规则缺口或知识缺失**
    - 修复内容：① 规则块 9 条 → 12 条（补「部分覆盖」「客服自身」「多轮指代」「情绪处理」四类）；
      ② `keywords` 注入工具目录；③ `siteFeatures` 抽到 `lib/site-features.ts` 并作为资料三注入；
      ④ FAQ 116 → 122 条；⑤ 12 个过短的 `description` 扩写
    - 修复后复测 20 条：原先 4 条失败全部转为通过，4 条部分通过全部转为通过，8 条回归用例无退化
    - **本轮踩过的坑**：统计 `siteFeatures` 键数时用了 `(?=: \[)` 正则，把 `'human-benchmark'`、
      `'valorant-sens'` 两个**带引号的键**漏掉了，一度误判成「这两个外部站点缺功能特点」。
      实际它俩的数据一直都在（Human Benchmark 那 9 条含 7 个测试项目名）。
      **教训**：核数据要用能覆盖引号键的写法，或者直接 `comm` 对两个集合
  - **FAQ 定稿过程存档**：经三轮独立核查（对文档核 → 对源码核 → 找茬评审），
    130 条草稿 → 定稿 122 条 → 跨范围去重后 **113 条**，后又补入 3 条关于客服自身的问答（是不是真人 / 次数限制 / 对话是否保存）→ **116 条**。过程中修正了 8 条事实错误
    （含"简单记没有导出功能"这类与源码相反的结论）、改写了 10 条"写给模型而不是写给访客"的答案。
    **教训**：PROJECT.md 自身会漂移，核事实必须以源码为唯一权威
    - 2026-09-16 再补 6 条（图片压缩大小/批量、IDM 通道、Human Benchmark、隐私政策、手机 App、
      客服用什么模型）→ **122 条**；同时删掉了「开发工具分类」那条答案里的
      "后续会陆续补充更多开发工具"——它是句承诺，与硬性规则 7「不要承诺资料里没写的事」直接冲突
- [x] **所有上传入口支持 Ctrl+V 粘贴** —— **已完成并端到端实测**
  - **问题**：20 处上传入口里 18 处只能「点击选择文件」，用一张截图得先「另存为」到硬盘再回来选文件，白绕两步
  - **做法**：新增 `lib/useFileUpload.ts`，一次调用同时给出拖拽与粘贴；粘贴挂 **window 级**监听，不必先点击上传区；
    焦点在 `input`/`textarea`/`contenteditable` 时让路，不抢文本框粘贴
  - **接线**：5 个图片工具、5 个 PDF 工具、Office→PDF、图标提取、PDF→MD、md/html 批量导入 ×2（共 18 处）
  - **补拖拽**：原本连拖拽都没有的 6 处一并补齐（耗知通导入弹窗、天机阁存档导入、简单记备份导入 ×2、
    天机阁家具照片、简单记日记照片）
  - **JSON 类入口**：新增 `textHandler` 先 `JSON.parse` 校验，直接粘 JSON 文本也能导入；`setInputFiles()` 灌回原有 input，导入按钮逻辑不变
  - **踩过的坑**：简单记日记配图与天机阁家具图**已有** React `onPaste`，这两处必须传 `enabled: false`，
    否则同一次粘贴触发两次、图片加两张；弹窗关闭时也要传 `enabled: false`，免得关闭状态下仍接管粘贴
  - **顺带修**：原先拖入错误类型文件是**静默忽略**的，现在统一出「不支持的文件格式」提示
  - **已知限制**：手机浏览器不向页面派发粘贴事件，移动端不获益，仍走系统文件选择器（可拍照/进相册）
  - 同步新增 `lib/faq.ts` 2 条（粘贴方式、截图直传）→ **124 条**
- [x] **知识库全量核对（2026-09-16 第三轮）** —— 124 条逐条对源码，查出并修掉 13 处失真
  - **方法**：分四路并行核对（图片类 / 文档类 / 生活娱乐开发类 / 站级与网站软件类），
    共核对 148 条次，每一条的**每个事实断言**都回到源码找依据；关键结论二次人工复核
  - **修掉的失真（按严重度）**：
    1. **`pdf-to-office` 正文不转**（最严重）：FAQ 与 `tools.ts` 都说「可以转成 Word/Excel/PPT」，
       实际只按页数生成占位框架 → 见 §7.18，两处文案已如实改写并指向「PDF → MD/HTML」
    2. **`image-convert` 的 BMP**：`toDataURL('image/bmp')` 浏览器普遍不支持、会静默退回 PNG，
       而扩展名硬编码成 `.bmp` → 已补 `supportsFormat()` 实测 + `extFromDataUrl()` 按真实 MIME 定扩展名，
       不可用的格式选项自动隐藏（**与 `image-compress` 的防御写法对齐**）
    3. **图片裁剪**：FAQ 说「支持下载 PNG、JPG、WebP 三种格式」，实际没有格式选择控件、输出=输入格式
    4. **TikTok 限流**：FAQ 说「限流后会自动切直连」，实际站内限流返回 429 直接终止，
       只有第三方接口失败才降级 —— 原答案把两件事混成一件
    5. **隐私问答漏项**：说「只有四处会发到服务端」，漏了**高速下载每次探测链接都会把 URL 发给服务端**
       （这条是上一轮自己写错的，本轮修正）
    6. 字数统计指标名不符（实际是 字符数/不含空格/单词数/行数/段落数）
    7. Office 转 PDF 字体失败时中文变「?」而非「退化成 ASCII」
    8. 删除线在文字型 PDF 里不保留（原答案未限定范围）
    9. 行内 HTML 标签会原样漏进 PDF（原答案说「看不到」）
    10. 「不打包 ZIP 是有意为之」——代码无法佐证意图，删掉该断言
    11. 随机数复制按钮在手机上不显示（`opacity-0` + `group-hover`，触屏无 hover）
    12. 高速下载断点续传对 GitHub 镜像链接不生效（存档键与查找键不一致）
    13. 三个下载站「只介绍了功能、没有依据」——实际给的是官方直链，Everything 页自己写了「无广告无捆绑」
  - **弱化/删掉的无法核实项**：TikTok「约 2000 次调用」（数字只在 FAQ 与本文档，代码零依据）、
    「耗知通专门做过手机适配」（无移动端专用代码）、「手机上不支持粘贴」（属浏览器行为）
  - **补上 8 个外部站点的问答**（此前完全没进 FAQ，属 `.claude/CLAUDE.md` 点名的漏补）：
    S7 资源库、FMHY、便民查询网、柒夜导航、纸由我 PaperMe、AI Short、云游君的厨房、Steam 租号
    → FAQ **124 → 133 条**
  - **口径统一**：资料三写的是外站自己的介绍（Excalidraw「完全开源免费」、KMS「安全、绿色无病毒」），
    FAQ 原先一律说「以对方为准」，同一问题可能出两套说法。处理方式：
    **不改对外展示的详情页文案**，改在 FAQ 侧统一成「页面标注的是 X，站里只是照录、不替你打包票」，
    并新增一条总纲问答覆盖所有外站的收费/注册问题
  - **顺带修**：`pdf-to-office` 的关键词去掉了 `pdf编辑`/`pdf修改`（该工具不编辑 PDF，
    与上一轮删 `批量压缩` 同类）；`lib/faq.ts` 文件头「统一走最后一条兜底话术」已过时，改为指向具体条目
  - **教训**：① 条数变了必须重算知识体积——本轮又发现体积数字停留在上一轮（22,749 vs 实际 23,191）；
    ② `.claude/CLAUDE.md` 的「新增工具要检查 faq.ts」约定有 8 个历史欠账，说明该约定靠人记不可靠，
    建议将来加个脚本：比对 `tools.ts` 的工具名是否都在 `faq.ts` 里出现过
- [ ] 右上角在线人数功能（计划接入实时统计）
- [ ] Git 上传 + Vercel 部署
- [ ] 开发工具分类的工具补充
- [ ] 工具卡片封面图片（用户自备，后续缩小尺寸填入）
- [ ] 项目体积优化（当前约 500MB，含 node_modules）
- [ ] **高速下载 — 网盘链接解析**（夸克/阿里/百度/115/天翼/迅雷）
  - 前端和 API 代码已写好（`/api/fast-download/parse`），但需要 alist 作为解析后端
  - **阻塞问题**：alist 需要 Docker 部署，Vercel 不支持；用户无 VPS
  - **待解决**：找一台免费 VPS（Oracle Cloud 永久免费 ARM）跑 alist，或改用 Cloudflare Worker 直接解析
  - 环境变量：`ALIST_URL`、`ALIST_TOKEN`（已在 .env.local 预留）
