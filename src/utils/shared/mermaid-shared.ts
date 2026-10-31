// Shared between the browser (Mermaid.tsx) and Node (scripts/mermaid-plugin.ts).
// Both sides MUST compute the same key for the same diagram, so keep this file
// free of any browser- or Node-only API.

/**
 * Global Mermaid config. It is part of the hash: changing the theme here
 * invalidates every pre-rendered SVG (they get re-captured in dev).
 */
export const MERMAID_CONFIG = { startOnLoad: false, theme: 'neutral' } as const

/** CRLF/LF-insensitive and whitespace-trimmed, so editing line endings never changes the key. */
export function normalizeChart(chart: string): string {
  return chart.replace(/\r\n?/g, '\n').trim()
}

// cyrb53: small, synchronous, good-enough 53-bit string hash (no crypto needed).
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

/** 14 hex chars, e.g. "01a2b3c4d5e6f7" -> file src/generated/mermaid/01a2b3c4d5e6f7.svg */
export function mermaidKey(chart: string): string {
  return hashString(JSON.stringify(MERMAID_CONFIG) + '\n' + normalizeChart(chart))
}
