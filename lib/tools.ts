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
  { id: 'favorites', name: '收藏工具', icon: '⭐' },
  { id: 'history', name: '历史工具', icon: '🕐' },
  { id: 'all', name: '全部', icon: '🔥' },
  { id: 'image', name: '图片工具', icon: '🖼️' },
  { id: 'document', name: '文档工具', icon: '📄' },
  { id: 'dev', name: '开发工具', icon: '🔧' },
  { id: 'life', name: '生活工具', icon: '🎯' },
  { id: 'entertainment', name: '娱乐工具', icon: '🎮' },
  { id: 'website', name: '网站工具', icon: '🌐' },
  { id: 'software', name: '软件工具', icon: '💿' },
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
    id: 'simple-note',
    name: '简单记',
    description: '简单好用的日记工具，记录每天的心情和故事',
    icon: '📝',
    category: 'life',
    path: '/tools/simple-note',
    tags: ['日记', '笔记', '记录', '心情', '照片'],
    keywords: ['日记', '笔记', '记事', '心情', '简单记'],
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
    id: 'md-to-html',
    name: 'Markdown 转 HTML',
    description: '将 Markdown 文件或代码转换为 HTML，支持实时预览',
    icon: '📝',
    category: 'document',
    path: '/tools/md-to-html',
    tags: ['markdown', 'html', 'md', '转换', '预览'],
    keywords: ['md转html', 'markdown渲染', 'markdown预览', 'markdown转网页', '生成html', 'markdown导出'],
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
    description: '多线程并行下载，充分利用你的带宽',
    icon: '⚡',
    category: 'life',
    path: '/tools/fast-download',
    tags: ['下载', '加速', '高速', 'download', 'idm', 'aria2', '多线程'],
    keywords: ['加速下载', '下载加速', '多线程下载', '满速下载', '网速慢', '下载慢'],
  },
  {
    id: 'tianjige',
    name: '天机阁',
    description: '天机阁，一览无余',
    icon: '🏠',
    category: 'life',
    path: '/tools/tianjige',
    tags: ['收纳', '物品管理', '3D', '整理', '查找'],
    keywords: ['收纳', '物品管理', '找不到东西', '整理', '天机阁'],
  },
  {
    id: 'consumables',
    name: '耗知通',
    description: '记录你的消耗品，清楚库存',
    icon: '📦',
    category: 'life',
    path: '/tools/consumables',
    tags: ['消耗品', '库存', '记录', '日用品', '补货'],
    keywords: ['消耗品管理', '库存记录', '日用品', '补货提醒', '消耗品'],
  },
  {
    id: 'everything',
    name: 'Everything 下载',
    description: 'Windows 文件秒搜工具，百万文件瞬间定位',
    icon: '/everything.png',
    category: 'website',
    path: '/tools/everything',
    tags: ['搜索', '文件', '工具', '下载', '秒搜'],
    keywords: ['文件搜索', 'everything', '秒搜', '文件查找', '文件管理'],
  },
  {
    id: 'treesize',
    name: 'TreeSize 下载',
    description: '专业磁盘空间分析工具，快速找出大文件',
    icon: '🌳',
    category: 'website',
    path: '/tools/treesize',
    tags: ['磁盘', '空间', '分析', '大文件', '清理', 'treesize'],
    keywords: ['磁盘分析', '大文件查找', '磁盘清理', '空间不足', '磁盘满了', '找大文件'],
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
    id: 'steampp',
    name: 'Watt Toolkit',
    description: 'Steam 多功能工具箱，加速/令牌/多账号管理',
    icon: '🔧',
    category: 'website',
    path: '/tools/steampp',
    tags: ['steam', '加速', '工具箱', '网络', '令牌', 'watt'],
    keywords: ['steam加速', 'steam工具', 'steam社区修复', 'steam商店加速', 'watt toolkit', 'steam++', '令牌管理'],
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
  // ===== 软件工具 =====
  {
    id: 'desktop-cleaner',
    name: 'AI智能桌面整理大师',
    description: 'AI驱动的桌面图标整理工具，一键优化桌面布局',
    icon: '🧹',
    category: 'software',
    path: '/tools/desktop-cleaner',
    tags: ['桌面', '整理', '清理', '图标', '优化', 'AI'],
    keywords: ['桌面整理', '图标整理', '桌面清理', '桌面优化', '桌面图标', '桌面美化'],
  },
  {
    id: 'smart-danmu',
    name: '智能弹幕',
    description: '桌面弹幕助手，AI生成弹幕，让桌面不再孤单',
    icon: '💬',
    category: 'software',
    path: '/tools/smart-danmu',
    tags: ['弹幕', '桌面', 'AI', '陪伴', '直播'],
    keywords: ['桌面弹幕', '弹幕助手', 'AI弹幕', '直播弹幕', '桌面陪伴', '弹幕软件'],
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
  {
    id: 'imagesplitter',
    name: 'Image Splitter',
    description: '在线图片分割工具，支持网格/自由切割',
    icon: '✂️',
    category: 'website',
    path: '/tools/site/imagesplitter',
    externalUrl: 'https://imagesplitter.tools/zh',
    tags: ['图片', '分割', '切割', '裁剪', '九宫格'],
    keywords: ['图片分割', '九宫格切图', '图片切割', '分割图片', '网格切图'],
  },
  {
    id: 'qinight',
    name: '柒夜导航',
    description: '黑科技网站资源导航集合',
    icon: '🧭',
    category: 'website',
    path: '/tools/site/qinight',
    externalUrl: 'https://nav.qinight.com',
    tags: ['导航', '资源', '黑科技', '网站', '集合'],
    keywords: ['网站导航', '资源集合', '黑科技', '工具导航', '网站推荐'],
  },
  {
    id: 'phwalls',
    name: 'PhWalls',
    description: '高质量手机壁纸免费下载',
    icon: '🖼️',
    category: 'website',
    path: '/tools/site/phwalls',
    externalUrl: 'https://phwalls.com/zh',
    tags: ['壁纸', '手机', '下载', '高清', '背景'],
    keywords: ['手机壁纸', '高清壁纸', '壁纸下载', '锁屏壁纸', '桌面壁纸'],
  },
  {
    id: 'paperme',
    name: '纸由我 PaperMe',
    description: '自定义打印纸生成器，方格/横线/五线谱',
    icon: '📝',
    category: 'website',
    path: '/tools/site/paperme',
    externalUrl: 'https://paperme.toolooz.com',
    tags: ['打印纸', '方格纸', '横线纸', '五线谱', '生成'],
    keywords: ['打印纸', '方格纸生成', '横线纸', '五线谱', '稿纸', '练习纸'],
  },
  {
    id: 'virustotal',
    name: 'VirusTotal',
    description: '在线病毒检测，70+ 引擎同时扫描',
    icon: '🛡️',
    category: 'website',
    path: '/tools/site/virustotal',
    externalUrl: 'https://www.virustotal.com',
    tags: ['病毒', '安全', '扫描', '检测', '杀毒'],
    keywords: ['查毒', '病毒扫描', '文件安全', '网址检测', '恶意软件', '安全检测'],
  },
  {
    id: 'learngitbranching',
    name: 'Learn Git Branching',
    description: '交互式 Git 学习游戏，可视化分支操作',
    icon: '🌳',
    category: 'website',
    path: '/tools/site/learngitbranching',
    externalUrl: 'https://learngitbranching.js.org',
    tags: ['git', '学习', '分支', '教程', '交互'],
    keywords: ['学git', 'git教程', 'git分支', '版本控制', 'git可视化', 'git入门'],
  },
  {
    id: 'aishort',
    name: 'AI Short',
    description: 'AI 提示词精选库，一键复制 ChatGPT/Claude 高效提示词',
    icon: '🤖',
    category: 'website',
    path: '/tools/site/aishort',
    externalUrl: 'https://www.aishort.top',
    tags: ['AI', '提示词', 'ChatGPT', 'Claude', 'Prompt'],
    keywords: ['AI提示词', 'ChatGPT提示词', 'Claude提示词', 'AI工具', '提示词库', 'AI对话'],
  },
  {
    id: 'cook',
    name: '云游君的厨房',
    description: '程序员菜谱，简单易学的家常菜做法',
    icon: '🍳',
    category: 'website',
    path: '/tools/site/cook',
    externalUrl: 'https://cook.yunyoujun.cn',
    tags: ['菜谱', '做饭', '厨房', '家常菜', '美食'],
    keywords: ['菜谱', '做菜', '家常菜', '烹饪', '食谱', '厨房'],
  },
  {
    id: 'runoob',
    name: '菜鸟教程',
    description: '编程技术在线教程，HTML/CSS/JS/Python/Java 等全栈学习',
    icon: '📚',
    category: 'website',
    path: '/tools/site/runoob',
    externalUrl: 'https://www.runoob.com/',
    tags: ['教程', '编程', '学习', '前端', '后端', 'python', 'java'],
    keywords: ['学编程', '编程入门', '前端教程', 'python教程', 'java教程', 'html教程', '在线教程', '菜鸟'],
  },
  {
    id: 'human-benchmark',
    name: 'Human Benchmark',
    description: '在线认知能力测试，挑战你的反应力与记忆力',
    icon: '🧠',
    category: 'website',
    path: '/tools/site/human-benchmark',
    externalUrl: 'https://humanbenchmark.com/',
    tags: ['测试', '反应力', '记忆', '大脑', '认知', '练习', '脑力'],
    keywords: ['反应速度测试', '记忆力测试', '脑力训练', '认知测试', 'sequence memory', 'number memory', 'typing speed', 'chimp test'],
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
