import { createProcessor } from '@mdx-js/mdx'
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import type { Plugin } from 'vite'
import { normalizeCode, shikiKey } from '../src/utils/shared/shiki-shared.ts'
import { collectCodeBlocks } from './shiki-extract.ts'

/**
 * Shiki pre-highlighting.
 *
 * build : buildStart parses src/report.mdx, finds every <Code type="bloc">, and
 *         highlights it in Node with BOTH themes in a single HTML (CSS variables
 *         --shiki-light / --shiki-dark, switched by CSS on :root[data-theme]).
 *         `virtual:shiki-runtime` then resolves to a stub holding only that
 *         HTML: no shiki, no wasm, no grammar in the bundle.
 * dev   : the virtual module highlights live with the full `shiki` package
 *         (any theme/language, ThemePanel preview keeps working).
 *
 * A virtual module (instead of `if (import.meta.env.DEV)`) guarantees the
 * bundler never sees the `shiki` import in a build — no reliance on tree-shaking.
 */

type MdxOptions = NonNullable<Parameters<typeof createProcessor>[0]>

export interface ShikiPluginOptions {
  /**
   * The SAME remark plugins as mdx(). The report is parsed here too, so the parser
   * must understand its syntax (remark-directive's `:::callout{…}`, GFM…) — otherwise
   * MDX reads `{…}` as a JS expression and fails. Only their parser extensions matter
   * here; their transformers are never run.
   */
  remarkPlugins?: MdxOptions['remarkPlugins']
}

const VIRTUAL_ID = 'virtual:shiki-runtime'
const RESOLVED_ID = '\0' + VIRTUAL_ID

const LIGHT_VAR = '--code-theme-light'
const DARK_VAR = '--code-theme-dark'
const DEFAULT_LIGHT = 'github-light'
const DEFAULT_DARK = 'github-dark'

// Shiki special-cases these — always valid, no grammar needed.
const BUILTIN_LANGS = new Set(['text', 'plaintext', 'txt', 'ansi'])

function readThemePair(cssPath: string): { light: string; dark: string } {
  let light = DEFAULT_LIGHT
  let dark = DEFAULT_DARK
  if (!fs.existsSync(cssPath)) return { light, dark }
  postcss.parse(fs.readFileSync(cssPath, 'utf-8')).walkDecls((decl) => {
    if (decl.prop === LIGHT_VAR) light = decl.value.trim()
    if (decl.prop === DARK_VAR) dark = decl.value.trim()
  })
  return { light, dark }
}

async function precompute(
  root: string,
  remarkPlugins: MdxOptions['remarkPlugins'],
  warn: (message: string) => void,
): Promise<Map<string, string>> {
  const mdxPath = path.resolve(root, 'src/report.mdx')
  const cssPath = path.resolve(root, 'src/styles/style.css')
  const result = new Map<string, string>()

  // Parse only (no transform): we just need the syntax tree.
  let tree
  try {
    tree = createProcessor({ remarkPlugins }).parse(fs.readFileSync(mdxPath, 'utf-8'))
  } catch (error) {
    throw new Error(
      "[shiki] couldn't parse src/report.mdx — pass the same remarkPlugins as mdx() to shikiPlugin({ remarkPlugins }). " +
      (error instanceof Error ? error.message : String(error)),
    )
  }
  const { blocks, unresolved } = collectCodeBlocks(tree as unknown as Record<string, unknown>)

  for (const line of unresolved) {
    warn(
      `[shiki] <Code type="bloc"> near line ${line} has a lang or content that isn't a static string ` +
      '(use a literal, or {`…`} without ${}) — it will render unhighlighted.',
    )
  }

  const { codeToHtml, bundledLanguagesInfo, bundledThemesInfo } = await import('shiki')
  const validLangs = new Set(bundledLanguagesInfo.flatMap((l) => [l.id, ...(l.aliases ?? [])]))
  const validThemes = new Set(bundledThemesInfo.map((t) => t.id))

  const pair = readThemePair(cssPath)
  const themes = {
    light: validThemes.has(pair.light) ? pair.light : DEFAULT_LIGHT,
    dark: validThemes.has(pair.dark) ? pair.dark : DEFAULT_DARK,
  }
  if (themes.light !== pair.light) warn(`[shiki] "${pair.light}" (light code theme) isn't a known Shiki theme — using ${DEFAULT_LIGHT}.`)
  if (themes.dark !== pair.dark) warn(`[shiki] "${pair.dark}" (dark code theme) isn't a known Shiki theme — using ${DEFAULT_DARK}.`)

  const warnedLangs = new Set<string>()
  const usedLangs = new Set<string>()

  for (const block of blocks) {
    const key = shikiKey(block.code, block.lang) // same call as the browser: lang as written
    if (result.has(key)) continue

    let lang = block.lang
    if (!BUILTIN_LANGS.has(lang) && !validLangs.has(lang)) {
      if (!warnedLangs.has(lang)) {
        warnedLangs.add(lang)
        warn(`[shiki] "${lang}" (near line ${block.line}) isn't a known Shiki language or alias — it will render unhighlighted. Typo?`)
      }
      lang = 'text'
    }
    usedLangs.add(lang)

    result.set(key, await codeToHtml(normalizeCode(block.code), { lang, themes, defaultColor: false }))
  }

  console.log(
    `[shiki] ${result.size} block(s) pre-highlighted (${[...usedLangs].join(', ') || 'none'}) · ${themes.light} / ${themes.dark} · no shiki in the bundle`,
  )
  return result
}

const DEV_RUNTIME = `
// Always undefined in dev: blocks are highlighted live.
export function peekShiki() {
  return undefined
}

export async function highlightLive(code, lang, themes) {
  const { codeToHtml } = await import('shiki')
  return codeToHtml(code, { lang: lang || 'text', themes, defaultColor: false })
}
`

function buildRuntime(blocks: Map<string, string>): string {
  const entries = [...blocks].map(([key, html]) => `${JSON.stringify(key)}: ${JSON.stringify(html)}`)
  return [
    `const blocks = {\n${entries.join(',\n')}\n}`,
    'export function peekShiki(key) { return blocks[key] }',
    "export async function highlightLive() { throw new Error('Code block not pre-highlighted') }",
  ].join('\n')
}

export function shikiPlugin({ remarkPlugins }: ShikiPluginOptions = {}): Plugin {
  let isBuild = false
  let root = process.cwd()
  let blocks = new Map<string, string>()

  return {
    name: 'report-maker:shiki',

    config(_config, { command }) {
      // The only import of `shiki` lives in a virtual module the dependency
      // scanner may not see: pre-bundle it explicitly to avoid a reload on first use.
      if (command === 'serve') return { optimizeDeps: { include: ['shiki'] } }
    },

    configResolved(config) {
      isBuild = config.command === 'build'
      root = config.root
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },

    async buildStart() {
      if (!isBuild) return
      blocks = await precompute(root, remarkPlugins, (message) => this.warn(message))
    },

    load(id) {
      if (id !== RESOLVED_ID) return
      return isBuild ? buildRuntime(blocks) : DEV_RUNTIME
    },
  }
}
