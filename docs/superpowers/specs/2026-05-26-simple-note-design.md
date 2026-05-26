# 简单记 — 设计文档

> 工具分类：生活工具 | 工具 ID：`simple-note` | 路径：`/tools/simple-note`

---

## 1. 概述

"简单记"是一个轻量级日记工具，用户可以按日期记录每天发生的事情，支持保存照片和选择心情。数据通过 IndexedDB 持久化存储在浏览器本地，单设备长期保存。

## 2. 数据模型

### 日记条目

```ts
interface DiaryEntry {
  id: string;           // crypto.randomUUID()
  date: string;         // 'YYYY-MM-DD'
  content: string;      // 文字内容
  mood: Mood;           // 心情
  photos: PhotoRef[];   // 照片引用（含缩略图）
  createdAt: number;    // Date.now()
  updatedAt: number;    // Date.now()
}

type Mood = 'happy' | 'normal' | 'sad' | 'angry' | 'excited';

interface PhotoRef {
  id: string;           // 照片 ID，关联 diary_photos 表
  thumbnail: string;    // base64 缩略图（200px 宽）
  width: number;
  height: number;
}
```

### IndexedDB 设计

- 数据库名：`simple-note-db`，版本 1
- **entries 表**：keyPath `id`，索引 `date`
- **photos 表**：keyPath `id`，索引 `entryId`，存储原始 Blob

### 缩略图策略

上传照片时：
1. 读取原图 File → Blob 存入 `photos` 表
2. Canvas 缩放至 200px 宽 → 生成 base64 缩略图
3. 缩略图存入 Entry 的 `photos` 数组，用于列表预览
4. 查看大图时通过 photo ID 从 `photos` 表按需加载原图 Blob

## 3. 页面结构

### 文件

```
app/tools/simple-note/
  └── page.tsx              # 主页面（含所有子组件）
lib/
  └── simple-note-db.ts     # IndexedDB 封装
```

### 组件

| 组件 | 职责 |
|------|------|
| `CalendarPanel` | 月历网格，高亮有日记的日期，切换月份 |
| `EntryList` | 当天日记列表，卡片展示，从新到旧 |
| `EntryCard` | 单条日记卡片：心情 + 时间 + 摘要 + 缩略图 |
| `EntryEditor` | 新建/编辑全屏覆盖层 |
| `PhotoGrid` | 编辑器内照片区：上传 + 预览 + 删除 |
| `MoodPicker` | 心情选择器（5 个表情） |

### 主页面布局

```
桌面端 (≥768px)：
┌────────────────────────────┐
│  Header（BackButton + 标题）│
├──────────┬─────────────────┤
│ 日历面板  │  日记列表       │
│ 280px    │  剩余空间       │
│ sticky   │  scroll         │
└──────────┴─────────────────┘

移动端 (<768px)：
┌────────────────────────┐
│  Header    [日历图标]   │
├────────────────────────┤
│  日记列表（默认）       │
│  ...                   │
├────────────────────────┤
│  [+ 新建] 浮动按钮      │
└────────────────────────┘

点击日历图标 → 日历面板从底部滑出覆盖
```

## 4. 交互流程

### 4.1 查看日记

1. 默认选中今天
2. 有日记的日期显示小圆点
3. 点击日期 → 右侧/下方显示当天日记列表
4. 点击日记卡片 → 展开查看完整内容和照片

### 4.2 新建日记

1. 点击"+ 新建日记"按钮
2. 弹出全屏编辑器
3. 填写：日期（默认今天）、心情、文字、照片
4. 点击保存 → 写入 IndexedDB → 返回列表

### 4.3 编辑日记

1. 点击已有日记卡片
2. 打开编辑器，预填现有内容
3. 修改后保存

### 4.4 删除日记

1. 编辑器内点击删除按钮
2. 弹出确认框
3. 确认后删除 Entry + 关联 Photos

### 4.5 照片上传

1. 点击"+"区域或拖拽文件
2. 支持多选（`input.multiple`）
3. `accept="image/*"`
4. FileReader 读取 → Canvas 生成缩略图 → Blob 存 IndexedDB
5. 显示在照片网格中

## 5. 响应式设计

- **桌面端**：左右分栏，日历面板 280px 固定宽度，列表区自适应
- **移动端**：默认只显示列表，日历通过图标触发底部弹出面板
- **编辑器**：两种端都是全屏覆盖层
- **断点**：768px（`md:` Tailwind class）

## 6. 心情系统

| 心情 | 表情 | 颜色 |
|------|------|------|
| happy | 😊 | #FFD93D |
| excited | 🤩 | #FF6B6B |
| normal | 😐 | #A0A0A0 |
| sad | 😢 | #74B9FF |
| angry | 😠 | #E17055 |

## 7. IndexedDB 封装

`lib/simple-note-db.ts` 提供以下函数：

```ts
// 初始化
initDB() → Promise<IDBDatabase>

// Entry CRUD
addEntry(entry: DiaryEntry) → Promise<void>
updateEntry(entry: DiaryEntry) → Promise<void>
deleteEntry(id: string) → Promise<void>
getEntriesByDate(date: string) → Promise<DiaryEntry[]>
getAllDatesWithEntries() → Promise<string[]>  // 用于日历小圆点

// Photo CRUD
addPhoto(photo: { id: string, entryId: string, blob: Blob }) → Promise<void>
getPhoto(id: string) → Promise<Blob | null>
deletePhotosByEntryId(entryId: string) → Promise<void>

// 缩略图生成
generateThumbnail(file: File, maxWidth?: number) → Promise<{ thumbnail: string, blob: Blob, width: number, height: number }>
```

## 8. UI 细节

### 日记卡片

```
┌─────────────────────────────┐
│ 😊  14:30                   │
│ 今天去了公园，天气很好，和    │
│ 朋友一起野餐...              │
│ [缩略图1] [缩略图2] [+3]    │
└─────────────────────────────┘
```

- 左侧心情表情
- 右侧：时间 + 内容摘要（前 60 字 + "..."） + 缩略图（最多显示 3 张）
- 有照片时显示缩略图网格

### 空状态

选中日期无日记时：
- 插图 + "这天还没有记录"
- 下方"+ 新建日记"按钮

### 删除确认

- 简单的确认弹窗："确定要删除这条日记吗？"
- 取消 / 确认删除（红色按钮）

## 9. 工具注册

在 `lib/tools.ts` 的 life 分类中添加：

```ts
{
  id: 'simple-note',
  name: '简单记',
  description: '简单好用的日记工具，记录每天的心情和故事',
  icon: '📝',
  category: 'life',
  path: '/tools/simple-note',
  tags: ['日记', '笔记', '记录', '心情', '照片'],
  keywords: ['日记', '笔记', '记事', '心情', '简单记'],
}
```
