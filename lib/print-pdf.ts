// lib/print-pdf.ts
// 浏览器原生打印：把 HTML 写入离屏 iframe 后调用 window.print()，由用户在系统打印对话框中「另存为 PDF」。
//
// 优点：浏览器排版引擎渲染，输出质量最高（与网页所见完全一致，字体/表格/分页都是系统级处理）；
//       不需要下载生成逻辑，实现最轻。
// 缺点：必须用户手动确认打印对话框，无法一键完成；批量转换时需逐个确认（N 个文件 = N 次确认）。
//
// 适用建议：单个文件转换时优先用本方式（质量优先）；批量转换建议用「文字/图片」型 PDF 一键下载。
//
// 实现注意：
// - iframe 必须置于视口外（left:-10000px）而非 display:none，否则部分浏览器不渲染打印内容；
// - sandbox 必须同时含 allow-modals 和 allow-same-origin：
//   只写 allow-modals 时 iframe 是 unique origin，父页面调用 win.print() 会抛 SecurityError（实测确认）；
//   allow-same-origin 让 srcdoc 继承父页面 origin，print() 才可调用。不放行 allow-scripts，
//   因此内容中的脚本依旧被沙箱禁止执行，安全性不受影响；
// - 打印完成后在 afterprint 事件中移除 iframe，Safari 等不支持 afterprint 的浏览器用延时兜底。

let printFrame: HTMLIFrameElement | null = null;

export async function printHtmlToPdf(html: string): Promise<void> {
  // 清理上一次打印残留的 iframe
  if (printFrame) printFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '800px';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.setAttribute('sandbox', 'allow-modals allow-same-origin');
  iframe.title = '打印预览';
  printFrame = iframe;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('打印内容加载失败'));
      // 给 onload 设置超时兜底（内容缺失时避免按钮一直无响应）
      setTimeout(() => resolve(), 5000);
      iframe.srcdoc = html;
    });
    const win = iframe.contentWindow;
    if (!win) throw new Error('打印窗口初始化失败');
    win.focus();
    win.print();
  } catch (e) {
    iframe.remove();
    printFrame = null;
    throw e;
  } finally {
    // 打印对话框关闭后移除；不支持 afterprint 的浏览器 60s 后兜底清理
    iframe.contentWindow?.addEventListener('afterprint', () => {
      iframe.remove();
      if (printFrame === iframe) printFrame = null;
    });
    setTimeout(() => {
      if (document.body.contains(iframe)) iframe.remove();
      if (printFrame === iframe) printFrame = null;
    }, 60000);
  }
}
