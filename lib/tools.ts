export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  path: string;
  tags: string[];
  keywords?: string[]; // 功能关键词：用户可能搜索的功能描述
  externalUrl?: string;
}

export const categories = [
  { id: 'all', name: '全部', icon: '🔥' },
  { id: 'image', name: '图片工具', icon: '🖼️' },
  { id: 'document', name: '文档工具', icon: '📄' },
  { id: 'dev', name: '开发工具', icon: '🔧' },
  { id: 'life', name: '生活工具', icon: '🎯' },
  { id: 'entertainment', name: '娱乐工具', icon: '🎮' },
  { id: 'website', name: '网站工具', icon: '🌐' },
];

export const tools: Tool[] = [
  {
    id: 'image-compress',
    name: '图片压缩',
    description: '压缩图片大小，支持 JPG、PNG、WebP',
    icon: '📷',
    category: 'image',
    path: '/tools/image-compress',
    tags: ['图片', '压缩', 'image', 'compress'],
    keywords: ['减小图片', '缩小图片', '图片变小', '图片瘦身', '批量压缩', '降低画质', 'kb', 'mb'],
  },
  {
    id: 'qrcode',
    name: '二维码生成',
    description: '生成自定义二维码，支持调整大小和颜色',
    icon: '📱',
    category: 'entertainment',
    path: '/tools/qrcode',
    tags: ['二维码', 'qr', 'qrcode', '生成'],
    keywords: ['扫码', 'qr码', '二维码制作', '链接转二维码', '文字转二维码'],
  },
  {
    id: 'word-count',
    name: '字数统计',
    description: '统计文本字数、字符数、行数',
    icon: '📝',
    category: 'document',
    path: '/tools/word-count',
    tags: ['字数', '统计', 'word', 'count', '文本'],
    keywords: ['多少字', '字数', '字符数', '查字数', '文章字数', '论文查字'],
  },
  {
    id: 'bmi',
    name: 'BMI 计算器',
    description: '计算身体质量指数，支持公制/英制',
    icon: '⚖️',
    category: 'life',
    path: '/tools/bmi',
    tags: ['bmi', '体重', '健康', '计算'],
    keywords: ['胖瘦', '体重指数', '身高体重', '健康指数', '减肥'],
  },
  {
    id: 'random-generator',
    name: '随机数生成器',
    description: '生成随机数、字符串、UUID、密码',
    icon: '🎲',
    category: 'entertainment',
    path: '/tools/random-generator',
    tags: ['随机', 'random', 'uuid', '密码', '生成'],
    keywords: ['随机数', '抽签', '随机选择', 'uuid生成', '密码生成', '随机密码'],
  },
  {
    id: 'unit-converter',
    name: '单位换算',
    description: '长度、重量、温度、面积、体积、时间单位互转',
    icon: '📏',
    category: 'life',
    path: '/tools/unit-converter',
    tags: ['单位', '换算', 'unit', 'convert'],
    keywords: ['米换算英尺', '公斤磅', '摄氏华氏', '公里英里', '寸换算厘米', '单位转换'],
  },
  {
    id: 'calculator',
    name: '专业计算器',
    description: '标准/科学/程序员/日期四种模式',
    icon: '🧮',
    category: 'life',
    path: '/tools/calculator',
    tags: ['计算器', 'calculator', '科学', '程序员', '进制'],
    keywords: ['算数', '数学', '三角函数', '对数', '进制转换', '二进制', '十六进制', '日期计算'],
  },
  {
    id: 'image-convert',
    name: '图片格式转换',
    description: 'JPG/PNG/WebP/BMP 格式互转',
    icon: '🔄',
    category: 'image',
    path: '/tools/image-convert',
    tags: ['图片', '格式', '转换', 'png', 'jpg', 'webp'],
    keywords: ['png转jpg', 'jpg转png', '图片转格式', 'webp转png', '格式互转', 'bmp转jpg'],
  },
  {
    id: 'image-crop',
    name: '图片裁剪',
    description: '自定义区域裁剪图片',
    icon: '✂️',
    category: 'image',
    path: '/tools/image-crop',
    tags: ['图片', '裁剪', 'crop'],
    keywords: ['裁切图片', '截取部分', '图片裁切', '切图', '抠图'],
  },
  {
    id: 'image-resize',
    name: '图片调整大小',
    description: '按比例或像素调整图片尺寸',
    icon: '📐',
    category: 'image',
    path: '/tools/image-resize',
    tags: ['图片', '调整', '大小', 'resize', '缩放'],
    keywords: ['放大图片', '缩小图片', '改变尺寸', '图片缩放', '调整分辨率', '像素调整'],
  },
  {
    id: 'image-rotate',
    name: '图片旋转/翻转',
    description: '旋转角度、水平/垂直翻转',
    icon: '🔃',
    category: 'image',
    path: '/tools/image-rotate',
    tags: ['图片', '旋转', '翻转', 'rotate', 'flip'],
    keywords: ['图片转方向', '镜像翻转', '倒过来', '横转竖', '竖转横'],
  },
  {
    id: 'icon-extract',
    name: '图标提取',
    description: '从 EXE/DLL/ICO 文件中提取图标',
    icon: '🎯',
    category: 'image',
    path: '/tools/icon-extract',
    tags: ['图标', '提取', 'exe', 'dll', 'ico', 'icon', 'extract'],
    keywords: ['提取exe图标', '软件图标', '程序图标', 'ico文件', '应用图标'],
  },
  {
    id: 'pdf-to-office',
    name: 'PDF 转 Office',
    description: 'PDF 转 Word/Excel/PPT',
    icon: '📄',
    category: 'document',
    path: '/tools/pdf-to-office',
    tags: ['pdf', 'word', 'excel', 'ppt', '转换'],
    keywords: ['pdf转word', 'pdf转excel', 'pdf转ppt', 'pdf转文档', 'pdf编辑', 'pdf修改'],
  },
  {
    id: 'office-to-pdf',
    name: 'Office 转 PDF',
    description: 'Word/Excel/PPT 转 PDF',
    icon: '📑',
    category: 'document',
    path: '/tools/office-to-pdf',
    tags: ['word', 'excel', 'ppt', 'pdf', '转换'],
    keywords: ['word转pdf', 'excel转pdf', 'ppt转pdf', '文档转pdf', '打印pdf'],
  },
  {
    id: 'pdf-merge',
    name: 'PDF 合并',
    description: '多个 PDF 合并为一个文件',
    icon: '📑',
    category: 'document',
    path: '/tools/pdf-merge',
    tags: ['pdf', '合并', 'merge'],
    keywords: ['多个pdf', '合并文件', 'pdf拼接', 'pdf合并成一个'],
  },
  {
    id: 'pdf-split',
    name: 'PDF 拆分',
    description: 'PDF 拆分为多个独立文件',
    icon: '✂️',
    category: 'document',
    path: '/tools/pdf-split',
    tags: ['pdf', '拆分', 'split'],
    keywords: ['分离pdf', '提取页面', 'pdf拆开', 'pdf分页'],
  },
  {
    id: 'pdf-compress',
    name: 'PDF 压缩',
    description: '减小 PDF 文件大小',
    icon: '📦',
    category: 'document',
    path: '/tools/pdf-compress',
    tags: ['pdf', '压缩', 'compress'],
    keywords: ['pdf瘦身', '减小pdf', 'pdf变小', 'pdf文件太大'],
  },
  {
    id: 'wheel',
    name: '大转盘',
    description: '随机决策转盘，支持自定义选项',
    icon: '🎡',
    category: 'entertainment',
    path: '/tools/wheel',
    tags: ['转盘', '随机', '决策', '娱乐', 'wheel'],
    keywords: ['选择困难', '帮我决定', '抽签', '随机选择', '纠结', '命运转盘'],
  },
  {
    id: 'hook-generator',
    name: '爆款开头生成器',
    description: 'AI 生成10个不同风格的爆款开头，支持多平台',
    icon: '🎯',
    category: 'entertainment',
    path: '/tools/hook-generator',
    tags: ['AI', 'hook', '开头', '爆款', '文案', '小红书', '抖音'],
    keywords: ['标题生成', '文案写作', '自媒体', '短视频文案', '吸引眼球', '写作助手'],
  },
  {
    id: 'earth-cannon',
    name: '毁灭地球的电磁炮',
    description: '太空汪星人的电磁炮小游戏',
    icon: '🔫',
    category: 'entertainment',
    path: '/tools/earth-cannon',
    tags: ['电磁炮', '毁灭', '地球', '游戏', '娱乐'],
    keywords: ['电磁炮', '毁灭地球', '小游戏', '太空', '汪星人'],
  },
  {
    id: 'video-unwatermark',
    name: '视频去水印',
    description: '抖音/B站/西瓜视频无水印下载，支持多平台',
    icon: '🎬',
    category: 'life',
    path: '/tools/video-unwatermark',
    tags: ['视频', '去水印', '抖音', 'bilibili', '下载', '无水印', '短视频'],
    keywords: ['下载视频', '保存视频', '视频保存', '抖音下载', 'b站下载', '短视频下载', '搬运'],
  },
  {
    id: 'fast-download',
    name: '高速下载',
    description: '多线程并行下载，榨干你的带宽',
    icon: '⚡',
    category: 'life',
    path: '/tools/fast-download',
    tags: ['下载', '加速', '高速', 'download', 'idm', 'aria2', '多线程'],
    keywords: ['加速下载', '下载加速', '多线程下载', '满速下载', '网速慢', '下载慢'],
  },
  {
    id: 'steam',
    name: 'Steam 下载',
    description: 'Steam 客户端官方下载地址，支持 Windows/Mac/Linux',
    icon: '/steam.png',
    category: 'website',
    path: '/tools/steam',
    tags: ['steam', '下载', '游戏', '客户端', '平台'],
    keywords: ['游戏平台', 'steam安装', '游戏下载', 'epic'],
  },
  {
    id: 'tbtool',
    name: '图吧工具箱',
    description: 'DIY 爱好者硬件检测工具合集，开源免费无捆绑',
    icon: '/tbtool.png',
    category: 'website',
    path: '/tools/site/tbtool',
    externalUrl: 'https://www.tbtool.cn/',
    tags: ['硬件', '检测', '工具箱', 'diy', '装机', '图吧', 'cpu', 'gpu'],
    keywords: ['电脑检测', '硬件检测', '显卡检测', 'cpu检测', '跑分', '温度监控', '鲁大师替代'],
  },
  // ===== 开发工具 =====
  {
    id: 'online-compiler',
    name: '在线编译器',
    description: 'C/C++、Python、Java、Go 等语言在线编译器导航',
    icon: '💻',
    category: 'dev',
    path: '/tools/online-compiler',
    tags: ['编译器', 'compiler', '在线', '编程', 'python', 'java', 'c++', '开发'],
    keywords: ['在线编程', '写代码', '运行代码', '代码测试', '学编程', '编程练习'],
  },
  // ===== 网站工具 =====
  {
    id: 'excalidraw',
    name: 'Excalidraw',
    description: '手绘风格在线白板画图工具',
    icon: '✏️',
    category: 'website',
    path: '/tools/site/excalidraw',
    externalUrl: 'https://excalidraw.com',
    tags: ['画图', '白板', '流程图', '手绘'],
    keywords: ['画流程图', '思维导图', '在线画图', '白板协作', '架构图'],
  },
  {
    id: 'carbon',
    name: 'Carbon',
    description: '生成精美代码截图，分享代码更好看',
    icon: '💎',
    category: 'website',
    path: '/tools/site/carbon',
    externalUrl: 'https://carbon.now.sh',
    tags: ['代码', '截图', '分享', '美化'],
    keywords: ['代码截图', '代码分享', '漂亮代码图', '代码美化', '代码卡片'],
  },
  {
    id: 'jsonformatter',
    name: 'JSON 格式化',
    description: 'JSON 在线格式化、校验、树形查看',
    icon: '📋',
    category: 'website',
    path: '/tools/site/jsonformatter',
    externalUrl: 'https://jsonformatter.org',
    tags: ['json', '格式化', '校验'],
    keywords: ['json解析', 'json美化', 'json校验', 'json编辑', 'json查看'],
  },
  {
    id: 'codesandbox',
    name: 'CodeSandbox',
    description: '在线代码沙箱，秒速搭建前端项目',
    icon: '📦',
    category: 'website',
    path: '/tools/site/codesandbox',
    externalUrl: 'https://codesandbox.io',
    tags: ['代码', '前端', '在线', 'sandbox'],
    keywords: ['在线开发', '前端开发', 'react实验', 'vue实验', '代码沙箱'],
  },
  {
    id: 'photopea',
    name: 'Photopea',
    description: '在线版 Photoshop，支持 PSD/Sketch/AI',
    icon: '🖼️',
    category: 'website',
    path: '/tools/site/photopea',
    externalUrl: 'https://www.photopea.com',
    tags: ['ps', '设计', 'psd', '图片编辑', '在线'],
    keywords: ['在线ps', '修图', '图片处理', '设计工具', 'ps替代', '免费photoshop'],
  },
  {
    id: 'kms',
    name: 'KMS 激活',
    description: '一键激活 Windows 系统和 Office 软件',
    icon: '🔑',
    category: 'website',
    path: '/tools/site/kms',
    externalUrl: 'https://kms.cx/',
    tags: ['kms', 'windows', 'office', '激活', '系统'],
    keywords: ['激活windows', '激活office', '系统激活', '免费激活', 'windows10', 'windows11'],
  },
  {
    id: 'pdf24',
    name: 'PDF24 Tools',
    description: '免费在线 PDF 工具箱，合并压缩编辑转换',
    icon: '🐑',
    category: 'website',
    path: '/tools/site/pdf24',
    externalUrl: 'https://tools.pdf24.org/zh/',
    tags: ['pdf', '合并', '压缩', '编辑', '转换', '免费'],
    keywords: ['pdf工具箱', 'pdf编辑器', '免费pdf', 'pdf处理'],
  },
  {
    id: 's7zy',
    name: 'S7 资源库',
    description: '专业设计/办公/系统软件免费下载',
    icon: '💾',
    category: 'website',
    path: '/tools/site/s7zy',
    externalUrl: 'https://s7zy.top/',
    tags: ['软件', '下载', '设计', 'adobe', 'office', '免费'],
    keywords: ['下载软件', '免费软件', 'ps下载', 'pr下载', 'adobe全家桶', 'office下载'],
  },
  {
    id: 'fmhy',
    name: 'FMHY',
    description: '互联网最大免费资源导航集合',
    icon: '🌐',
    category: 'website',
    path: '/tools/site/fmhy',
    externalUrl: 'https://fmhy.net/',
    tags: ['免费', '资源', '影视', '游戏', '阅读', '导航'],
    keywords: ['资源导航', '免费资源', '网站推荐', '工具导航', '白嫖'],
  },
  {
    id: 'bmcx',
    name: '便民查询网',
    description: '身份证/IP/手机/邮编等在线查询工具',
    icon: '🔍',
    category: 'website',
    path: '/tools/site/bmcx',
    externalUrl: 'https://www.bmcx.com/',
    tags: ['查询', '身份证', 'ip', '手机', '邮编', '便民'],
    keywords: ['查ip', '查手机号', '身份证查询', '邮编查询', '归属地查询', 'ip地址'],
  },
  {
    id: 'aikanbot',
    name: '爱看机器人',
    description: '全网免费影视资源搜索引擎',
    icon: '🎬',
    category: 'website',
    path: '/tools/site/aikanbot',
    externalUrl: 'https://v.aikanbot.com/',
    tags: ['影视', '电影', '电视剧', '搜索', '免费', '在线观看'],
    keywords: ['看电影', '追剧', '免费看剧', '找电影', '影视搜索', '在线追剧', '免费影视'],
  },
];

export function getToolsByCategory(categoryId: string): Tool[] {
  if (categoryId === 'all') return tools;
  return tools.filter((tool) => tool.category === categoryId);
}

export function searchTools(query: string): Tool[] {
  const q = query.toLowerCase().trim();
  if (!q) return tools;

  // 每个工具的匹配分数
  const scored = tools.map((tool) => {
    let score = 0;
    const name = tool.name.toLowerCase();
    const desc = tool.description.toLowerCase();
    const tags = tool.tags.map((t) => t.toLowerCase());

    // 名称匹配（权重最高）
    if (name === q) score += 100;
    else if (name.startsWith(q)) score += 80;
    else if (name.includes(q)) score += 60;

    // 标签匹配
    for (const tag of tags) {
      if (tag === q) score += 70;
      else if (tag.startsWith(q)) score += 50;
      else if (tag.includes(q)) score += 30;
    }

    // 功能关键词匹配
    if (tool.keywords) {
      for (const kw of tool.keywords) {
        const kwl = kw.toLowerCase();
        if (kwl === q) score += 65;
        else if (kwl.startsWith(q)) score += 45;
        else if (kwl.includes(q)) score += 35;
      }
    }

    // 描述匹配
    if (desc.includes(q)) score += 20;

    // 多关键词支持：将搜索词拆分，每个词都匹配则加分
    const words = q.split(/\s+/);
    if (words.length > 1) {
      const allFields = `${name} ${desc} ${tags.join(' ')} ${(tool.keywords || []).join(' ')}`;
      const matchCount = words.filter((w) => allFields.includes(w)).length;
      score += (matchCount / words.length) * 40;
    }

    return { tool, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.tool);
}
