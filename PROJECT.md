# 9943小工具大全 — 项目设计文档

> 每次开发本项目相关内容时，先阅读此文档。

---

## 1. 项目简介

一个在线工具集合网站，设计风格参考 4399小游戏，以卡片式布局展示各类实用工具。

- **项目名**: 9943小工具大全
- **技术栈**: Next.js 14 + React 18 + Tailwind CSS 3 + TypeScript
- **项目路径**: `/home/huang/claude/vs/work/9943小工具大全`
- **部署计划**: 本地开发 → Git → Vercel 发布

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
│   └── tools/
│       ├── bmi/             # BMI 计算器
│       ├── calculator/      # 专业计算器
│       ├── hook-generator/  # 爆款开头生成器
│       ├── image-compress/  # 图片压缩
│       ├── image-convert/   # 图片格式转换
│       ├── image-crop/      # 图片裁剪
│       ├── image-resize/    # 图片调整大小
│       ├── image-rotate/    # 图片旋转/翻转
│       ├── office-to-pdf/   # Office 转 PDF
│       ├── pdf-compress/    # PDF 压缩
│       ├── pdf-merge/       # PDF 合并
│       ├── pdf-split/       # PDF 拆分
│       ├── pdf-to-office/   # PDF 转 Office
│       ├── qrcode/          # 二维码生成
│       ├── random-generator/# 随机数生成器
│       ├── unit-converter/  # 单位换算
│       ├── online-compiler/ # 在线编译器导航
│       ├── video-unwatermark/ # 视频去水印
│       ├── wheel/           # 大转盘
│       ├── word-count/      # 字数统计
│       ├── site/[slug]/     # 网站工具详情页（动态路由）
│       └── steam/           # Steam 客户端下载
├── components/
│   ├── Header.tsx           # 顶栏：Logo + 搜索框 + 在线状态
│   ├── CategoryNav.tsx      # 分类导航栏（sticky）
│   ├── ToolCard.tsx         # 工具卡片组件
│   ├── TopicInput.tsx       # [爆款开头] 主题输入框
│   ├── PlatformSelector.tsx # [爆款开头] 平台选择器
│   ├── ContentTypeSelector.tsx # [爆款开头] 内容类型选择
│   ├── HookCard.tsx         # [爆款开头] 单个 hook 卡片
│   ├── HookGrid.tsx         # [爆款开头] hook 网格展示
│   ├── ErrorBanner.tsx      # [爆款开头] 错误提示
│   └── HistoryPanel.tsx     # [爆款开头] 历史记录面板
├── lib/
│   ├── tools.ts             # 工具数据定义 + 分类 + 搜索
│   ├── types.ts             # TypeScript 类型
│   ├── prompts.ts           # DeepSeek 提示词模板
│   └── storage.ts           # localStorage 封装
├── .env.local               # DeepSeek API 配置
├── tailwind.config.ts
├── postcss.config.js
└── package.json
```

---

## 4. 分类体系

| ID | 名称 | 图标 | 说明 |
|----|------|------|------|
| `all` | 全部 | 🔥 | 默认视图，显示所有工具 |
| `image` | 图片工具 | 🖼️ | 图片压缩、格式转换、裁剪、缩放、旋转 |
| `document` | 文档工具 | 📄 | PDF 系列 + 字数统计（原"文本工具"已合并至此） |
| `dev` | 开发工具 | 🔧 | 在线编译器导航 |
| `life` | 生活工具 | 🎯 | BMI 计算器、单位换算、专业计算器、视频去水印 |
| `entertainment` | 娱乐工具 | 🎮 | 大转盘、二维码生成、随机数生成器、爆款开头生成器 |
| `website` | 网站工具 | 🌐 | Excalidraw, Carbon, JSON, CodeSandbox, Photopea, KMS, PDF24, S7资源库, FMHY, 便民查询网, 爱看机器人, Steam 下载, 图吧工具箱 |

### 工具归属规则
- "文本工具"分类已删除，所有文本工具归入"文档工具"
- 二维码生成、随机数生成器、爆款开头生成器已移入"娱乐工具"
- 专业计算器替代原"进制转换"，本身自带进制转换功能

---

## 5. 关键设计规则

### 5.1 导航返回逻辑（重要，待修复）
**现状**: 所有工具页面使用 `router.back()`，依赖浏览器历史记录。如果用户直接通过 URL 进入工具页，返回会出错。网站工具详情页 (`site/[slug]`) 用 `router.push('/')` 直接跳回首页（更差）。

**目标**: 从具体工具页面返回时，必须回到上级分类，不能跳回"全部工具"。

**修复方案**: 每个工具页面的返回按钮应根据工具的 category 构造目标 URL：
```tsx
// 工具页面应这样实现返回：
import { tools } from '@/lib/tools';
const tool = tools.find(t => t.id === '当前工具id');
const backUrl = `/?category=${tool.category}`;
// 然后 <Link href={backUrl}> 或 router.push(backUrl)
```
效果：
```
从娱乐工具打开大转盘 → 返回 /?category=entertainment
从文档工具打开 PDF 合并 → 返回 /?category=document
从网站工具打开详情页 → 返回 /?category=website
```
**所有工具页面和新增工具都必须遵守此规则。**

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
- **服务端解析**: 抖音、B站、西瓜视频（通过各平台 API 直接解析）
- **Fallback**: 快手、TikTok 等不支持的平台跳转第三方工具
- API 路由: `/api/video-parse`，支持 IP 速率限制（每 IP 每分钟 10 次）
- 抖音解析流程: 短链重定向 → 提取 aweme_id → 调用详情 API → 获取无水印视频 URL
- Bilibili 解析: 提取 BV ID → 获取视频信息 → 获取播放地址（DASH 格式）
- 解析失败时推荐第三方去水印网站

---

## 8. 数据持久化

### localStorage 键名汇总
| 键名 | 来源 | 用途 | 上限 |
|------|------|------|------|
| `wheel-custom-presets` | wheel 页面 | 自定义转盘类别 | 无 |
| `wheel-current-items` | wheel 页面 | 当前转盘选项 | 无 |
| `wheel-active-preset` | wheel 页面 | 当前预设名 | 无 |
| `wheel-history` | wheel 页面 | 转盘结果历史 | 无 |
| `hook-generator-auth` | hook-generator 页面 | 密码验证状态 | 无 |
| `ai-hook-lab-history` | storage.ts | 爆款开头生成历史 | 50 条 |
| `ai-hook-lab-favorites` | storage.ts | 收藏的生成结果 | 无 |

> 注意：`lib/storage.ts` 的键名仍保留 `ai-hook-lab-` 前缀（从 Ai Hook Lab 迁移而来）

---

## 9. API 配置

```env
# .env.local
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

- API 调用仅在服务端 (`/api/generate/route.ts`)
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
- [ ] 右上角在线人数功能（计划接入实时统计）
- [ ] Git 上传 + Vercel 部署
- [ ] 开发工具分类的工具补充
- [ ] 工具卡片封面图片（用户自备，后续缩小尺寸填入）
- [ ] 项目体积优化（当前约 500MB，含 node_modules）
