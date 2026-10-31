// Provided by scripts/mermaid-plugin.ts (a real module in dev, a stub of pre-rendered SVGs in build).
declare module 'virtual:mermaid-runtime' {
  /** Pre-rendered SVG for this key (build only); undefined in dev or if it was never captured. */
  export function peekMermaid(key: string): string | undefined
  /** Dev: renders live and saves the SVG. Build: rejects with a "not pre-rendered" error. */
  export function renderMermaid(chart: string, key: string, config: Record<string, unknown>): Promise<string>
}
