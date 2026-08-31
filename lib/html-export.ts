// lib/html-export.ts
// 导出的 HTML 页面共享资源：内嵌 GitHub 风格 CSS + 完整 HTML 组装
// 供 md-to-html 工具（MD→HTML / PDF→MD 的 .html 下载）共用，避免循环依赖

export const EMBED_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC",sans-serif;font-size:16px;line-height:1.6;color:#1f2328;max-width:900px;margin:0 auto;padding:2rem;background:#fff;word-wrap:break-word}
h1,h2,h3,h4,h5,h6{margin-top:1.5em;margin-bottom:0.5em;font-weight:600;line-height:1.25}
h1{font-size:2em;border-bottom:1px solid #d0d7de;padding-bottom:.3em}
h2{font-size:1.5em;border-bottom:1px solid #d0d7de;padding-bottom:.3em}
h3{font-size:1.25em}h4{font-size:1em}h5{font-size:.875em}h6{font-size:.85em;color:#656d76}
p{margin:0.5em 0}
a{color:#0969da;text-decoration:none}
a:hover{text-decoration:underline}
strong{font-weight:600}
code{background:#f6f8fa;padding:.2em .4em;border-radius:3px;font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;font-size:85%}
pre{background:#f6f8fa;padding:1rem;border-radius:6px;overflow-x:auto;margin:0.5em 0}
pre code{background:none;padding:0;font-size:85%}
blockquote{border-left:4px solid #d0d7de;padding:0 1em;color:#656d76;margin:0.5em 0}
ul,ol{padding-left:2em;margin:0.5em 0}
li{margin:0.25em 0}
li:has(input[type=checkbox]){list-style:none}
input[type=checkbox]{margin-right:.5em}
table{border-collapse:collapse;margin:0.5em 0;width:100%;display:block;overflow-x:auto}
th,td{border:1px solid #d0d7de;padding:.5em 1em;text-align:left}
th{background:#f6f8fa;font-weight:600}
tr:nth-child(even){background:#f6f8fa}
img{max-width:100%;height:auto}
hr{border:none;border-top:1px solid #d0d7de;margin:1em 0}
@media(max-width:640px){body{padding:1rem;font-size:14px}}
@media print{body{max-width:none;padding:1cm}}
`.trim();

export function buildFullHtml(body: string, title: string): string {
  const escapedTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapedTitle}</title>
<style>${EMBED_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}
