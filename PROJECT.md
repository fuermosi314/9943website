# 9943小工具大全 — 项目设计文档

> 每次开发本项目相关内容时，先阅读此文档。

---

## 1. 项目简介

一个在线工具集合网站，设计风格参考 4399小游戏，以卡片式布局展示各类实用工具。

- **项目名**: 9943小工具大全
- **技术栈**: Next.js 14 + React 18 + Tailwind CSS 3 + TypeScript
- **项目路径**: `/home/huang/claude/vs/work/9943小工具大全`
- **部署计划**: 本地开发 → Git → Vercel 发布
- **当前工具数量**: 66 个（自动统计自 `lib/tools.ts`）

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
│   ├── api/generate/
│   │   └── route.ts         # DeepSeek API 调用（爆款开头生成器）
│   ├── api/video-parse/
│   │   └── route.ts         # 视频去水印解析 API（抖音/B站/西瓜）
│   ├── api/github-mirrors/
│   │   └── route.ts         # GitHub 镜像列表 API
│   ├── api/fast-download/
│   │   ├── parse/route.ts   # 网盘链接解析（夸克/阿里/百度/115/天翼/迅雷）
│   │   ├── probe/route.ts   # 下载链接探测（文件大小/Range/CORS支持）
│   │   ├── download/route.ts # 分片下载代理
│   │   └── aria2-release/route.ts # aria2 最新版本信息
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
│       ├── md-to-html/      # Markdown 转 HTML
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
│   ├── types.ts             # TypeScript 类型
│   ├── prompts.ts           # DeepSeek 提示词模板
│   ├── storage.ts           # localStorage 封装
│   ├── useToolHistory.ts    # 工具历史记录 hook
│   ├── category-manager.ts  # 分类管理工具
│   ├── consumables-db.ts    # 消耗品 IndexedDB
│   ├── download-db.ts       # 下载进度 IndexedDB（断点续传）
│   ├── simple-note-db.ts    # 简单记 IndexedDB
│   └── tianjige-db.ts       # 天机阁 IndexedDB
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
| `life` | 生活工具 | 🎯 | BMI 计算器、单位换算、专业计算器、视频去水印、简单记、耗知通 |
| `entertainment` | 娱乐工具 | 🎮 | 大转盘、二维码生成、随机数生成器、爆款开头生成器、毁灭地球的电磁炮 |
| `website` | 网站工具 | 🌐 | Excalidraw, Carbon, JSON, CodeSandbox, Photopea, KMS, PDF24, S7资源库, FMHY, 便民查询网, 爱看机器人, Steam 下载, 图吧工具箱, Image Splitter, 柒夜导航, PhWalls, 纸由我, VirusTotal, Learn Git Branching, Watt Toolkit, AI Short, 云游君的厨房, 菜鸟教程, Human Benchmark, Everything 下载, TreeSize 下载 |
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
- 中间：搜索框（圆角，实时搜索，支持按名称/描述/标签匹配）
- 右侧：绿色脉冲点 + "在线"文字（预留在线人数功能，暂未实现）

### 5.3 CategoryNav 组件
- `sticky top-14`，固定在 Header 下方
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
- 介绍页风格统一，使用 `siteFeatures` 数据

### 5.6 工具页面布局规范
每个工具页面应包含：
- 顶部导航栏（返回按钮 + 9943 Logo）
- 工具标题 + 描述
- 工具功能区
- 底部装饰元素（与网站整体风格一致）
- 背景效果（网格线 + 光晕，与首页一致）

---

## 6. 工具卡片尺寸规范
- 所有工具卡片的容器框必须保持一致大小
- 使用 `min-h-[2.5rem]` 确保名称和描述区域对齐
- 网格布局：`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`
- 间距：`gap-4`

---

## 7. 特殊工具实现细节

### 7.1 大转盘 (wheel)
- 预设模板：今天吃什么、谁请客、真心话大冒险、做什么运动、看什么电影、自定义
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
- **环境变量**: `ALIST_URL`（alist 服务地址）、`ALIST_TOKEN`（可选认证令牌）
- 百度网盘、115网盘支持提取码输入
- 未配置 alist 时网盘解析不可用，直链下载不受影响

### 7.9 天机阁 (tianjige)
- 3D 家居收纳工具，使用 Three.js 渲染房间和家具，一览无余
- **数据存储**: IndexedDB（`lib/tianjige-db.ts`）
- **核心组件**: `components/tianjige/Scene3D.tsx`
- **功能**: 预设场景（客厅/卧室/厨房等）、自定义场景管理、家具添加/移动、家具编辑（右键/长按打开，支持重命名、改色、移动位置、旋转、缩放、删除）、物品记录（名称/分类/数量/价格/照片）、场景数据导入/导出
- **场景管理**: 底部工具栏"管理场景"按钮打开场景管理弹窗，支持新建/删除自定义场景、JSON 导出/导入（merge 模式）

### 7.10 耗知通 (consumables)
- 消耗品管理工具，记录和追踪日常消耗品库存
- **数据存储**: IndexedDB（`lib/consumables-db.ts`）
- **数据结构**: Consumable（id, name, quantity, price, category, storageDate, expiryDate?, note?, createdAt, updatedAt）
- **分类**: 日用/食品/电子/办公/清洁/其他，每类有对应图标
- **功能**: 添加/编辑/删除消耗品、按名称/备注搜索、按分类筛选、多字段排序（名称/数量/金额/日期）、统计概览（总数量/总价值/物品种类）
- **导入导出**: JSON 格式，支持合并导入（只添加新条目）和替换导入（清空现有数据）
- **备份提醒**: localStorage 记录上次备份时间，超过 24 小时提醒用户
- **UI**: 响应式布局，全屏编辑器弹窗，删除确认对话框，Toast 提示

### 7.11 Markdown 转 HTML (md-to-html)
- **三种输入模式**:
  - ✏️ **粘贴内容**: 直接输入 Markdown 代码，300ms 实时预览
  - 📁 **上传文件**: 上传单个 .md/.markdown 文件（支持拖拽），上传后可重新选择替换
  - 📂 **批量上传**: 上传多个 .md 文件（文件选择器多选或拖拽），左侧文件列表点选切换预览
- **实时预览**: 300ms debounce，左右分栏（桌面端）/ 上下堆叠（移动端），批量模式下右侧显示当前选中文件的预览
- **Markdown 解析**: 使用 `marked` 库，支持 GFM（表格、任务列表、删除线等）
- **XSS 防护**: `DOMPurify` 清理输出 + iframe sandbox 双重防护
- **输出选项**:
  - 复制完整 HTML 代码（含内嵌 GitHub 风格 CSS）
  - 下载单个 .html 文件
  - 📦 **批量下载**: 一键逐个下载所有 HTML 文件（300ms 间隔避免浏览器拦截），不打包 ZIP
- **内嵌 CSS**: GitHub 风格排版样式，独立打开时也能正确渲染
- 批量模式下支持：添加更多文件、重新选择替换、清除全部
- 无代码语法高亮

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
| `wheel-history` | wheel 页面 | 转盘结果历史 | 无 |
| `hook-generator-auth` | hook-generator 页面 | 密码验证状态 | 无 |
| `ai-hook-lab-history` | storage.ts | 爆款开头生成历史 | 50 条 |
| `ai-hook-lab-favorites` | storage.ts | 收藏的生成结果 | 无 |
| `consumables-last-backup` | consumables 页面 | 上次备份时间戳 | 无 |
| `fast-dl-method` | fast-download 页面 | 下载方式偏好（aria2/browser/idm）| 无 |
| `fast-dl-aria2-host` | fast-download 页面 | aria2 主机地址 | 无 |
| `fast-dl-aria2-port` | fast-download 页面 | aria2 端口 | 无 |
| `fast-dl-aria2-secret` | fast-download 页面 | aria2 密钥 | 无 |
| `fast-dl-aria2-path-hint` | fast-download 页面 | aria2 搜索路径提示 | 无 |

> 注意：`lib/storage.ts` 的键名仍保留 `ai-hook-lab-` 前缀（从 Ai Hook Lab 迁移而来）

### IndexedDB 数据库
| 数据库 | 来源 | 用途 |
|--------|------|------|
| `simple-note-db` | simple-note 页面 | 日记条目 + 照片 |
| `consumables-db` | consumables 页面 | 消耗品记录 |
| `tianjige-db` | tianjige 页面 | 3D 场景数据 |
| `fast-download-db` | fast-download 页面 | 下载进度缓存（断点续传） |

---

## 9. API 配置

```env
# .env.local
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# 网盘解析服务（alist）
ALIST_URL=https://alist.example.com
ALIST_TOKEN=
```

- DeepSeek API 调用仅在服务端 (`/api/generate/route.ts`)
- 网盘解析通过 alist 开源项目实现 (`/api/fast-download/parse/route.ts`)
- 使用原生 `fetch()`，无第三方 AI SDK
- API Key 不发送到客户端

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
5. 网站工具需同时添加到 `lib/tools.ts`（含 `externalUrl`）和 `app/tools/site/[slug]/page.tsx` 的 `siteFeatures`
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
- [x] **API 速率限制**（已添加每 IP 每分钟 5 次限制 + topic 100 字符上限）
- [x] **PDF 工具 alert() 替换**（已改为 React state 内联错误提示）
- [x] **计算器进制标签汉化**（BIN/OCT/DEC/HEX 已改为中文）
- [x] **计算器手机端优化**（按钮高度、响应式布局已修复）
- [x] **Office-to-PDF 中文支持**（自动加载 LXGW WenKai 字体，失败时降级为 ASCII）
- [x] **分类切换动画逻辑**（sessionStorage 追踪已动画分类：首次进入蹦出动画，后续进入全部一起出现）
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
