// lib/pdf2md.ts
// PDF → Markdown：pdf.js 提取文本+字号+字体 → 启发式重建 Markdown 结构
// 启发式为免费本地方案（质量一般）；AI 增强走 /api/pdf-to-md（DeepSeek 还原）

export interface PdfLine {
  x: number; // 行首 x 坐标
  y: number; // 基线 y（PDF 坐标，页顶最大）
  size: number; // 字号
  text: string;
  bold: boolean;
  mono: boolean; // 等宽字体（代码块检测）
}

export interface PdfPage {
  lines: PdfLine[]; // 按阅读顺序（y 降序）排列的合并行
  text: string; // 该页纯文本（供 AI 增强）
}

// ─── pdf.js 动态加载（仅浏览器端，避免 SSR 报错） ───
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

async function getPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const mod = await import('pdfjs-dist');
      const pdfjs = (mod.default ?? mod) as typeof import('pdfjs-dist');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      }
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

const MONO_PATTERN = /courier|consolas|menlo|mono|source ?code|fira ?code|ubuntu ?mono|dejavu ?sans ?mono|inconsolata/i;

// 从页面提取原始文本项，触发 operatorList 解析以拿到真实字体名
async function getTextItems(pdfjs: typeof import('pdfjs-dist'), page: unknown) {
  const p = page as {
    getOperatorList(): Promise<unknown>;
    getTextContent(): Promise<{ items: Array<Record<string, unknown>> }>;
    commonObjs: { get(name: string): { name?: string } | undefined };
  };
  // getOperatorList 强制解析页面对象，之后 commonObjs 里才有字体信息
  await p.getOperatorList();
  const tc = await p.getTextContent();
  return tc.items.filter(i => typeof i.str === 'string' && (i.str as string).length > 0);
}

// 提取整个 PDF → 逐页行数据
export async function extractPdf(file: File): Promise<PdfPage[]> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const doc = await loadingTask.promise;
  const pages: PdfPage[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const items = await getTextItems(pdfjs, page);

      // 行聚类：同一基线 y（容差 2pt）合并为一行，按 x 排序
      const rows: PdfLine[][] = [];
      for (const item of items) {
        const size = Math.abs((item.transform as number[])[0]);
        const y = (item.transform as number[])[5];
        const x = (item.transform as number[])[4];
        const fontName = page.commonObjs.get(item.fontName as string)?.name ?? '';
        const row = {
          x,
          y,
          size,
          text: item.str as string,
          bold: /bold|black|heavy|semibold|medium/i.test(fontName),
          mono: MONO_PATTERN.test(fontName),
        };
        const last = rows[rows.length - 1];
        if (last && Math.abs(last[0].y - y) <= 2) {
          last.push(row);
        } else {
          rows.push([row]);
        }
      }

      // 合并同一行的碎片：x 间隙超过 1 个字符宽度（估计 ~0.55×字号）时补空格
      const lines: PdfLine[] = rows
        .sort((a, b) => b[0].y - a[0].y) // y 降序 = 从上到下
        .map(row => {
          row.sort((a, b) => a.x - b.x);
          let text = '';
          let prev: PdfLine | null = null;
          for (const r of row) {
            if (prev && r.x - (prev.x + prev.text.length * prev.size * 0.55) > prev.size * 0.6) {
              text += ' ';
            }
            text += r.text;
            prev = r;
          }
          return { ...row[0], text };
        })
        .filter(l => l.text.trim().length > 0);

      pages.push({
        lines,
        text: lines.map(l => l.text).join('\n'),
      });
    }
  } finally {
    // pdf.js v6：通过 loadingTask 销毁，释放内存
    await loadingTask.destroy();
  }
  return pages;
}

// ─── 启发式重建：行数据 → Markdown ───
// 规则（第一版，可靠优先）：
// - 字号中位数 = 正文基准；≥1.8× → h1，≥1.5× → h2，≥1.2× → h3
// - 行首 -/*/• → 无序列表；\d+[.、)] → 有序列表
// - 等宽字体连续行 → 代码块
// - 正文行间大间隔 → 分段；同段连续行空格连接
export function linesToMarkdown(pages: PdfPage[]): string {
  const allSizes = pages
    .flatMap(p => p.lines)
    .map(l => l.size)
    .filter(s => s > 0)
    .sort((a, b) => a - b);
  const bodySize = allSizes.length > 0 ? allSizes[Math.floor(allSizes.length / 2)] : 12;
  const lineGap = bodySize * 1.8; // 段间隔阈值：常规行距约 1.4-1.6×字号，段间距更大

  const out: string[] = [];

  for (const page of pages) {
    let prevY: number | null = null;
    let prevIsPara = false;
    let prevList = false; // 上一行是否为列表项（连续列表项不插空行）
    let codeBuffer: string[] = [];
    let inCode = false;

    const flushCode = () => {
      if (codeBuffer.length > 0) {
        out.push('```');
        out.push(...codeBuffer);
        out.push('```');
        codeBuffer = [];
        inCode = false;
      }
    };

    for (const line of page.lines) {
      const text = line.text.trim();

      // 等宽字体 → 代码块（连续聚拢，非 mono 行打断）
      if (line.mono) {
        if (!inCode && out.length > 0) out.push('');
        inCode = true;
        codeBuffer.push(text);
        prevIsPara = false;
        prevList = false;
        prevY = line.y;
        continue;
      } else {
        flushCode();
      }

      const ratio = bodySize > 0 ? line.size / bodySize : 1;

      // 标题
      if (ratio >= 1.5) {
        if (out.length > 0 && out[out.length - 1] !== '') out.push('');
        out.push(ratio >= 1.8 ? `# ${text}` : `## ${text}`);
        out.push('');
        prevY = line.y;
        prevIsPara = false;
        prevList = false;
        continue;
      }
      if (ratio >= 1.2) {
        if (out.length > 0 && out[out.length - 1] !== '') out.push('');
        out.push(`### ${text}`);
        out.push('');
        prevY = line.y;
        prevIsPara = false;
        prevList = false;
        continue;
      }

      // 列表（连续列表项之间不插空行）
      const ul = text.match(/^[-*•·]\s*(.*)$/);
      const ol = text.match(/^(\d+)[.、)]\s*(.*)$/);
      if (ul || ol) {
        const gap = prevY !== null ? prevY - line.y : lineGap * 2;
        if (!(prevList && gap <= lineGap) && out.length > 0 && out[out.length - 1] !== '') {
          out.push('');
        }
        out.push(ul ? `- ${ul[1]}` : `${ol![1]}. ${ol![2]}`);
        prevList = true;
        prevY = line.y;
        prevIsPara = false;
        continue;
      }

      // 正文
      const gap = prevY !== null ? prevY - line.y : lineGap * 2;
      const isNewPara = gap > lineGap;
      if (!prevIsPara || isNewPara) {
        if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      }
      const boldText = line.bold && line.size <= bodySize * 1.2 ? `**${text}**` : text;
      out.push(boldText);
      prevIsPara = true; // 当前是正文行，后续行若间隔小则同段
      prevList = false;
      prevY = line.y;
    }
    flushCode();

    // 页间空一行（保持连续阅读感，不插分隔线）
    if (page !== pages[pages.length - 1] && out.length > 0) out.push('');
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
