/**
 * In-window placeholder shown until `dsh web` prints its ready URL.
 * @module @deepseek-ai/dsh-desktop/splash
 */

/**
 * Build the splash document.
 * @param message - status line shown in the window.
 * @returns a complete HTML document.
 */
export function splashHtml(message: string): string {
  const text = escapeHtml(message)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>DeepSeek Harness</title>
  <style>
    html, body { height: 100%; margin: 0; }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #c9cdd4;
      background: #0f1115;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body><p>${text}</p></body>
</html>
`
}

/**
 * Encode the splash as a `data:` URL `BrowserWindow.loadURL` can open without
 * a local HTTP server.
 * @param message - status line shown in the window.
 * @returns a `data:text/html` URL.
 */
export function splashDataUrl(message: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(splashHtml(message))}`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
