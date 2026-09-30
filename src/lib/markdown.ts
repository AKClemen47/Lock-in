const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

/**
 * Minimal Markdown for task notes: `# titre`, `- liste`, **gras**, *italique*, `code`, [lien](https://…).
 * Input is HTML-escaped first, so the output is safe to inject.
 */
export function renderMarkdown(src: string): string {
  const html: string[] = []
  let inList = false
  for (const raw of escape(src).split('\n')) {
    const line = raw.trimEnd()
    const item = line.match(/^\s*[-*] (.*)$/)
    if (item) {
      if (!inList) html.push('<ul>')
      inList = true
      html.push(`<li>${inline(item[1])}</li>`)
      continue
    }
    if (inList) html.push('</ul>')
    inList = false
    const h = line.match(/^#{1,3} (.*)$/)
    if (h) html.push(`<h4>${inline(h[1])}</h4>`)
    else if (line) html.push(`<p>${inline(line)}</p>`)
  }
  if (inList) html.push('</ul>')
  return html.join('')
}
