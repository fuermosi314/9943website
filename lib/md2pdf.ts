// lib/md2pdf.ts
// Markdown → 文字型 PDF（pdfmake 排版，文字可复制/可搜索）
// 流程：marked.lexer 解析 tokens → 转换为 pdfmake 文档定义 → 运行时注入中文字体渲染
// 字体：Noto Sans CJK SC 子集（GB2312 全字集 + ASCII，约 1.8MB/个），首次转换时按需加载

import { marked, type Token, type Tokens } from 'marked';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

const A4_WIDTH_PT = 595.28;
const CONTENT_WIDTH_PT = A4_WIDTH_PT - 80; // 左右边距各 40pt
const MAX_IMG_WIDTH = 455; // 内容宽 515 留余量

// ─── pdfmake 动态加载 + 字体注入（仅浏览器端） ───
let pdfMakePromise: Promise<PdfMakeModule> | null = null;

interface PdfMakeModule {
  virtualfs: { writeFileSync(filename: string, content: string, encoding?: string): void };
  fonts: Record<string, Record<string, string>>;
  createPdf(doc: TDocumentDefinitions): { download(name: string): Promise<void> };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

async function getPdfMake(): Promise<PdfMakeModule> {
  if (!pdfMakePromise) {
    pdfMakePromise = (async () => {
      const mod = await import('pdfmake/build/pdfmake');
      const pdfMake = (mod.default ?? mod) as PdfMakeModule;
      // 中文字体按需加载（浏览器缓存，第二次起零等待）
      const [regular, bold] = await Promise.all([
        fetch('/fonts/noto-sans-sc-regular.ttf').then(r => r.arrayBuffer()),
        fetch('/fonts/noto-sans-sc-bold.ttf').then(r => r.arrayBuffer()),
      ]);
      pdfMake.virtualfs.writeFileSync('noto-sans-sc-regular.ttf', arrayBufferToBase64(regular), 'base64');
      pdfMake.virtualfs.writeFileSync('noto-sans-sc-bold.ttf', arrayBufferToBase64(bold), 'base64');
      pdfMake.fonts.NotoSansSC = {
        normal: 'noto-sans-sc-regular.ttf',
        bold: 'noto-sans-sc-bold.ttf',
        italics: 'noto-sans-sc-regular.ttf', // 中文无真斜体，用常规字形顶替
        bolditalics: 'noto-sans-sc-bold.ttf',
      };
      return pdfMake;
    })();
  }
  return pdfMakePromise;
}

// ─── 行内 tokens → pdfmake 内容（返回 text 数组可用的混合值） ───
type InlineResult = string | Content;

function inlineToContent(tokens: Token[] | undefined, brokenImages: Set<string>): InlineResult[] {
  if (!tokens) return [''];
  const out: InlineResult[] = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case 'text':
      case 'escape':
        out.push(tok.text);
        break;
      case 'strong':
        out.push({ text: inlineToContent(tok.tokens, brokenImages), bold: true });
        break;
      case 'em':
        out.push({ text: inlineToContent(tok.tokens, brokenImages), italics: true });
        break;
      case 'del':
        // pdfmake 无删除线样式，保留文字
        out.push({ text: inlineToContent(tok.tokens, brokenImages) });
        break;
      case 'codespan':
        out.push({ text: tok.text, background: '#f6f8fa', fontSize: 9.5, color: '#cf222e' });
        break;
      case 'link':
        out.push({
          text: inlineToContent(tok.tokens, brokenImages),
          link: tok.href,
          color: '#0969da',
          decoration: 'underline',
          decorationStyle: 'solid',
          decorationColor: '#0969da',
        });
        break;
      case 'image':
        out.push(imageToContent(tok as Tokens.Image, brokenImages));
        break;
      case 'br':
        out.push({ text: '', lineBreak: true });
        break;
      default:
        out.push(tok.raw ?? '');
    }
  }
  return out;
}

function imageToContent(tok: Tokens.Image, brokenImages: Set<string>): Content {
  const { href } = tok;
  const isData = href.startsWith('data:');
  const isHttp = /^https?:\/\//i.test(href);
  if ((isData || isHttp) && !brokenImages.has(href)) {
    return { image: href, fit: [MAX_IMG_WIDTH, 550] };
  }
  // 相对路径 / 加载失败的图片：降级为文字提示
  return { text: `[图片: ${tok.text || href}]`, color: '#656d76', italics: true };
}

// ─── 块级 token → pdfmake 内容 ───
function tableLayout() {
  return {
    fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f6f8fa' : rowIndex % 2 === 0 ? '#f8f9fa' : null),
    hLineColor: () => '#d0d7de',
    vLineColor: () => '#d0d7de',
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  };
}

function blockquoteLayout() {
  return {
    hLineWidth: () => 0,
    vLineWidth: (i: number) => (i === 0 ? 3 : 0), // 仅左边框
    vLineColor: () => '#d0d7de',
    paddingLeft: () => 14,
    paddingRight: () => 12,
    paddingTop: () => 5,
    paddingBottom: () => 5,
  };
}

function blockToContent(tok: Token, brokenImages: Set<string>): Content[] {
  switch (tok.type) {
    case 'heading': {
      const size = [22, 17, 14.5, 12.5, 11, 10.5][tok.depth - 1] ?? 11;
      const marginTop = [18, 16, 12, 10, 8, 8][tok.depth - 1] ?? 8;
      return [{
        text: inlineToContent(tok.tokens, brokenImages),
        fontSize: size,
        bold: true,
        color: tok.depth === 6 ? '#656d76' : '#1f2328',
        margin: [0, marginTop, 0, 6],
      }];
    }
    case 'paragraph':
      return [{ text: inlineToContent(tok.tokens, brokenImages), margin: [0, 4, 0, 4] }];
    case 'code':
      return [{
        text: tok.text,
        fontSize: 9.5,
        background: '#f6f8fa',
        color: '#24292f',
        lineHeight: 1.45,
        preserveLeadingSpaces: true,
        margin: [0, 8, 0, 8],
      }];
    case 'blockquote': {
      // blockquote.tokens 是块级 tokens（paragraph/list 等），递归转换
      const body: Content[] = [];
      for (const t of tok.tokens ?? []) body.push(...blockToContent(t as Token, brokenImages));
      return [{
        table: {
          widths: ['*'],
          body: [[body]],
        },
        layout: blockquoteLayout(),
        margin: [0, 6, 0, 6],
      }];
    }
    case 'list':
      return [listToContent(tok as Tokens.List, brokenImages)];
    case 'table':
      return [tableToContent(tok as Tokens.Table, brokenImages)];
    case 'hr':
      return [{
        canvas: [{ type: 'line', x1: 0, y1: 6, x2: CONTENT_WIDTH_PT, y2: 6, lineWidth: 1, lineColor: '#d0d7de' }],
        margin: [0, 12, 0, 12],
      }];
    case 'html':
      // 原始 HTML 块无法在 pdfmake 渲染，静默跳过
      return [];
    case 'space':
      return [];
    default:
      return [];
  }
}

function listToContent(tok: Tokens.List, brokenImages: Set<string>): Content {
  const items = tok.items.map(item => listItemToContent(item, brokenImages));
  const base = {
    markerColor: '#656d76',
    margin: [0, 4, 0, 4],
  };
  if (tok.items.some(i => i.task)) {
    // 任务列表：pdfmake 无内置勾选框，用 √/□ 前缀（GB2312 字集内）+ 无标记
    const tasks = tok.items.map(item => {
      const inner = listItemToContent(item, brokenImages);
      const mark = item.checked ? '√ ' : '□ ';
      if (Array.isArray(inner)) return [{ text: mark, color: '#0969da' }, ...inner];
      return [{ text: mark, color: '#0969da' }, inner];
    });
    return { ul: tasks, ...base, listType: 'none' };
  }
  if (tok.ordered) {
    return { ol: items, ...base, start: tok.start };
  }
  return { ul: items, ...base };
}

function listItemToContent(item: Tokens.ListItem, brokenImages: Set<string>): Content | Content[] {
  const parts: Content[] = [];
  for (const t of item.tokens) {
    if (t.type === 'text' || t.type === 'paragraph') {
      // marked 18：列表项顶层为 text token（含行内格式），loose 列表为 paragraph
      parts.push({ text: inlineToContent(t.tokens, brokenImages), margin: [0, 1, 0, 1] });
    } else if (t.type === 'list') {
      parts.push(listToContent(t as Tokens.List, brokenImages));
    } else {
      parts.push(...blockToContent(t, brokenImages));
    }
  }
  if (parts.length === 1) return parts[0];
  return parts;
}

function tableToContent(tok: Tokens.Table, brokenImages: Set<string>): Content {
  const cell = (c: Tokens.TableCell): Content =>
    ({ text: inlineToContent(c.tokens, brokenImages) });
  const body: Content[][] = [tok.header.map(cell), ...tok.rows.map(r => r.map(cell))];
  return {
    table: {
      widths: Array(tok.header.length).fill('*'),
      body,
    },
    layout: tableLayout(),
    margin: [0, 6, 0, 6],
  };
}

// ─── 文档定义 ───
export function mdToDocDefinition(markdown: string, title: string, brokenImages: Set<string>): TDocumentDefinitions {
  const tokens = marked.lexer(markdown, { gfm: true, breaks: false });
  const content: Content[] = [];
  for (const tok of tokens) content.push(...blockToContent(tok, brokenImages));
  return {
    info: { title: title || 'document', creator: '9943小工具大全' },
    pageSize: 'A4',
    pageMargins: [40, 48, 40, 48],
    content,
    defaultStyle: { font: 'NotoSansSC', fontSize: 11, lineHeight: 1.6, color: '#1f2328' },
  };
}

// ─── 预检测图片：http(s) 图片在浏览器中测试加载，失败的降级为文本 ───
function collectImageUrls(markdown: string): string[] {
  const urls: string[] = [];
  const walk = (tokens: Token[] | undefined) => {
    if (!tokens) return;
    for (const tok of tokens) {
      if (tok.type === 'image') {
        if (/^https?:\/\//i.test(tok.href)) urls.push(tok.href);
      } else if ('tokens' in tok && tok.tokens) {
        walk(tok.tokens);
      }
    }
  };
  walk(marked.lexer(markdown, { gfm: true }));
  return urls;
}

async function findBrokenImages(markdown: string): Promise<Set<string>> {
  const urls = collectImageUrls(markdown);
  if (urls.length === 0) return new Set();
  const results = await Promise.all(urls.map(url => new Promise<boolean>(resolve => {
    const img = new Image();
    img.onload = () => resolve(false);
    img.onerror = () => resolve(true);
    img.src = url;
  })));
  return new Set(urls.filter((_, i) => results[i]));
}

// ─── 导出：MD → PDF 直接下载 ───
export async function markdownToPdf(markdown: string, filename: string): Promise<void> {
  const pdfMake = await getPdfMake();
  const brokenImages = await findBrokenImages(markdown);
  const doc = mdToDocDefinition(markdown, filename.replace(/\.pdf$/i, ''), brokenImages);
  await pdfMake.createPdf(doc).download(filename);
}

// ─── HTML → PDF（turndown 转 Markdown 后复用文字型管线） ───
// 适用于结构化 HTML（本工具导出的 GitHub 风格 HTML 等）；复杂 CSS 布局会降级为结构化文本
let turndownPromise: Promise<TurndownServiceLike> | null = null;

interface TurndownServiceLike {
  addRule(name: string, rule: unknown): void;
  turndown(html: string): string;
}

export async function getTurndown(): Promise<TurndownServiceLike> {
  if (!turndownPromise) {
    turndownPromise = (async () => {
      const mod = await import('turndown');
      const Turndown = mod.default ?? mod;
      const td = new Turndown({ codeBlockStyle: 'fenced', headingStyle: 'atx' }) as TurndownServiceLike;
      // 任务列表勾选框 → [x]/[ ]，复用 md2pdf 的 √/□ 渲染
      td.addRule('taskCheckbox', {
        filter: (node: HTMLElement) =>
          node.nodeName === 'INPUT' && node.getAttribute('type') === 'checkbox',
        replacement: (_content: string, node: HTMLElement) =>
          (node as HTMLInputElement).checked ? '[x] ' : '[ ] ',
      });
      return td;
    })();
  }
  return turndownPromise;
}

export async function htmlToPdf(html: string, filename: string): Promise<void> {
  const td = await getTurndown();
  // 只转换 body 内容，避免 <head> 里的 <style>/<title> 变成正文文本
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const markdown = td.turndown(parsed.body?.innerHTML ?? html);
  await markdownToPdf(markdown, filename);
}
