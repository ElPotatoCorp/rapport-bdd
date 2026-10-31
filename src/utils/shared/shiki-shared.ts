// Shared between the browser (Code.tsx) and Node (scripts/shiki-plugin.ts).
// Both sides MUST compute the same key for the same <Code type="bloc">, so keep
// this file free of any browser- or Node-only API, and free of relative imports
// (the Node side loads it as plain TS).
// The themes are NOT part of the key: in a build they are baked into the HTML,
// which is recomputed on every build from style.css.

/** CRLF/LF-insensitive. Deliberately NOT trimmed: the code is shown as written. */
export function normalizeCode(code: string): string {
  return code.replace(/\r\n?/g, '\n')
}

// cyrb53 (same algorithm as mermaid-shared.ts).
function hashString(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}

/**
 * 14 hex chars, e.g. "01a2b3c4d5e6f7". An empty lang means "text".
 * Trailing newlines don't count: the text of a Markdown fence reaches <Code> with one,
 * while the mdast `value` seen by the build doesn't.
 */
export function shikiKey(code: string, lang: string): string {
  return hashString((lang || 'text') + '\n' + normalizeCode(code).replace(/\n+$/, ''))
}
