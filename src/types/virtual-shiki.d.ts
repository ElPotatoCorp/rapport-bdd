// Provided by scripts/shiki-plugin.ts (live highlighting in dev, a table of pre-highlighted HTML in build).
declare module 'virtual:shiki-runtime' {
  /** Pre-highlighted HTML (both themes, CSS variables) for this key — build only; undefined in dev or if the block wasn't found. */
  export function peekShiki(key: string): string | undefined
  /** Dev: highlights live with the full shiki package. Build: rejects. */
  export function highlightLive(code: string, lang: string, themes: { light: string; dark: string }): Promise<string>
}
