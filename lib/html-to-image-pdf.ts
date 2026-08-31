// lib/html-to-image-pdf.ts
// 图片型 PDF：html2canvas 把渲染后的 HTML 整页截成图片，jsPDF 逐页切片合成。
// 特点：所见即所得、格式永不丢失；缺点是文字不可搜索。
// （html2pdf.js 在 Chromium 下会渲染空白画布（0.14 库 bug），故用 html2canvas + jsPDF 手动合成）
// html2canvas/jspdf 动态 import，避免 SSR 时加载浏览器 API
// 供 md-to-html 工具（MD→HTML/PDF、HTML→PDF/MD 两个 tab）的「图片形式」PDF 共用

/** 创建视口外的隐藏容器：html2canvas 可正常绘制且无闪烁；opacity 0.01 防闪现，渲染前还原为 1 */
function createInvisibleContainer(html: string): HTMLDivElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  el.style.position = 'absolute';
  el.style.left = '0';
  el.style.top = '0';
  el.style.width = '800px';
  el.style.opacity = '0.01';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '-9999';
  return el;
}

/**
 * 收集「安全切割线」：块级元素区间合并后，相邻区间的缝隙中点即安全线（canvas 像素）。
 * 切点落在缝隙处可保证文字行、图片、表格行不被从中间切断。
 * 容器类标签（div/table/ul 等）若内含内容标签子孙则让位不收集，避免外层大容器吞掉所有缝隙。
 */
function collectSafeLines(container: HTMLElement, domToCanvas: number): number[] {
  const containerSel = 'div,section,article,aside,header,footer,main,form,fieldset,table,ul,ol,figure,blockquote';
  const contentSel = 'h1,h2,h3,h4,h5,h6,p,li,tr,th,td,pre,img,hr,svg,figcaption,caption,legend';
  const containerTop = container.getBoundingClientRect().top;
  const ranges: Array<[number, number]> = [];

  container.querySelectorAll(`${contentSel},${containerSel}`).forEach(node => {
    const el = node as HTMLElement;
    // 包着内容子元素的容器让位给子元素；纯叶子容器（如包单张图的 div）仍需收集
    if (el.matches(containerSel) && el.querySelector(contentSel)) return;
    const r = el.getBoundingClientRect();
    if (r.height === 0) return; // display:none / 空元素
    ranges.push([r.top - containerTop, r.bottom - containerTop]);
  });

  // 排序并合并重叠区间（子元素区间被父元素包含的直接丢弃）
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [top, bottom] of ranges) {
    const last = merged[merged.length - 1];
    if (last && top < last[1]) {
      last[1] = Math.max(last[1], bottom);
    } else {
      merged.push([top, bottom]);
    }
  }

  // 相邻区间缝隙中点 = 安全线，换算为 canvas 像素
  const safeLines: number[] = [];
  for (let i = 0; i + 1 < merged.length; i++) {
    safeLines.push(((merged[i][1] + merged[i + 1][0]) / 2) * domToCanvas);
  }
  return safeLines;
}

/** 把 HTML 渲染为图片型 PDF（A4、智能安全切割线分页）并触发下载 */
export async function htmlToImagePdf(html: string, filename: string): Promise<void> {
  const container = createInvisibleContainer(html);
  document.body.appendChild(container);

  try {
    const html2canvasMod = await import('html2canvas');
    const html2canvas = html2canvasMod.default ?? html2canvasMod;
    const { jsPDF } = await import('jspdf');

    // opacity 0.01 会让画布以 1% alpha 绘制而近乎全白，渲染前临时还原
    container.style.opacity = '1';

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: 800,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({ unit: 'in', format: 'a4', orientation: 'portrait' });
    const contentWidth = 7.5; // A4 宽 8.5in - 左右边距各 0.5in
    const pageContentH = 10; // A4 高 11in - 上下边距各 0.5in
    const pxPerInch = canvas.width / contentWidth;
    const sliceH = Math.floor(pageContentH * pxPerInch);
    const minSlice = 400; // canvas px（≈200 DOM px），切点距页顶不足则回退硬切，避免极矮页

    // 安全线 = 块级元素缝隙中点（canvas 坐标）
    const safeLines = collectSafeLines(container, canvas.width / container.offsetWidth);

    let pageTop = 0;
    let pageIdx = 0;
    while (pageTop < Math.max(canvas.height, 1)) {
      if (pageIdx > 0) pdf.addPage();
      // 本页硬边界 = 起点 + 一页内容高（最后一页切到 canvas 末尾）
      const hardEnd = Math.min(pageTop + sliceH, canvas.height);
      // 切点 = 页内 ≤ hardEnd 的最大安全线；距页顶不足 minSlice 或页内无安全线则回退硬切
      let cut = hardEnd;
      for (let i = safeLines.length - 1; i >= 0; i--) {
        const line = safeLines[i];
        if (line > pageTop && line <= hardEnd) {
          if (line - pageTop >= minSlice) cut = line;
          break;
        }
      }
      const srcH = cut - pageTop;
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = srcH;
      pageCanvas.getContext('2d')!.drawImage(
        canvas, 0, pageTop, canvas.width, srcH,
        0, 0, canvas.width, srcH,
      );
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0.5, 0.5, contentWidth, srcH / pxPerInch);
      pageTop = cut;
      pageIdx++;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
