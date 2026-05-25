import { Platform, ContentType } from './types';

const PLATFORM_GUIDE: Record<Platform, string> = {
  xiaohongshu: '小红书风格：种草感、闺蜜语气、适当使用emoji、常用"姐妹们""救命""绝绝子"等网络用语，标题要有吸引力，适合年轻女性用户。',
  douyin: '抖音风格：前3秒必须抓住注意力、善用反转和悬念、常用"你知道吗""千万别""我后悔了"等开头，口语化、节奏快。',
  bilibili: 'B站风格：可以玩梗、有知识感、常用"家人们""今天来聊个有意思的事"，用户喜欢有深度但不装的内容。',
  youtube: 'YouTube风格：英文思维的中文表达、善用好奇心缺口（curiosity gap）、常用"如果…会怎样""真相是…"等结构。',
  x: 'X/Twitter风格：简短锐利、观点鲜明、适合thread开头、常用"Hot take:""说个扎心的事实""不接受反驳"等表达。',
};

const CONTENT_GUIDE: Record<ContentType, string> = {
  video: '视频内容：hook要口语化、节奏快、有悬念或冲突，让人想继续看下去。适合用疑问句或反转句。',
  'image-text': '图文内容：hook要像标题党、有列表感、善用emoji排版，让人想点进来看全文。',
  ad: '产品广告：从痛点切入、场景代入、常用"你是不是也…""终于找到了"等表达，让人产生共鸣。',
  tutorial: '教程类：承诺具体结果、用数字量化、常用"X分钟学会""一招搞定""保姆级教程"等表达。',
  opinion: '观点帖：开头要有争议性、反常识或鲜明立场、常用"说实话""我知道说了会被骂""不接受反驳"等表达。',
};

const STYLE_TYPES = [
  '悬念型',
  '痛点型',
  '数字型',
  '反常识型',
  '故事型',
  '提问型',
  '紧迫型',
  '权威型',
  '共情型',
  '争议型',
];

export function buildPrompt(topic: string, platform: Platform, contentType: ContentType): string {
  return `你是一个顶级的社交媒体内容策划专家，擅长撰写爆款开头（hook）。

现在需要你为以下主题生成10个不同风格的爆款开头hook：

主题：${topic}
平台：${PLATFORM_GUIDE[platform]}
内容类型：${CONTENT_GUIDE[contentType]}

要求：
1. 每个hook必须风格不同，覆盖以下10种风格：${STYLE_TYPES.join('、')}
2. 每个hook控制在30字以内
3. 要有真实感，不要假大空
4. 紧扣主题，不要偏离
5. 符合所选平台的说话风格和用户习惯

请严格按以下JSON格式输出，不要输出其他内容：
{
  "hooks": [
    {
      "text": "hook文案内容",
      "style": "风格类型",
      "score": 8,
      "reason": "推荐理由，说明为什么这个hook有效"
    }
  ]
}

评分标准（1-10分）：
- 好奇心激发程度（30%）
- 情绪触发强度（25%）
- 平台风格匹配度（25%）
- 信息密度（20%）

请生成10个hook，风格依次为：${STYLE_TYPES.join('、')}`;
}
