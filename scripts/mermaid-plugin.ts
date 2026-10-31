import type { Root } from 'mdast'
import fs from 'node:fs'
import path from 'node:path'
import { visit } from 'unist-util-visit'
import type { Plugin } from 'vite'
import { mermaidKey, normalizeChart } from '../src/utils/shared/mermaid-shared.ts'

/**
 * Mermaid pre-rendering.
 *
 * dev   : Mermaid.tsx renders live with the real `mermaid` package (so syntax
 *         errors show up while you edit) and POSTs each resulting SVG to
 *         /api/mermaid-svg, which saves it as src/generated/mermaid/<key>.svg.
 * build : the `mermaid` package is never imported. `virtual:mermaid-runtime`
 *         resolves to a stub that only contains the saved SVGs.
 *
 * The virtual module (instead of `if (import.meta.env.DEV)`) guarantees the
 * bundler never even sees the `mermaid` import in a build — no reliance on
 * tree-shaking.
 */

const VIRTUAL_ID = 'virtual:mermaid-runtime'
const RESOLVED_ID = '\0' + VIRTUAL_ID
const SVG_DIR = 'src/generated/mermaid'
const KEY_RE = /^[0-9a-f]{14}$/

// ---------------------------------------------------------------------------
// remark plugin: lists the diagrams of report.mdx, so the build can tell which
// SVGs are missing. Runs inside the MDX compilation (see vite.config.ts).
// ---------------------------------------------------------------------------

const collected = new Map<string, string>() // key -> normalized chart source
const dynamicLines: number[] = [] // <Mermaid chart={...}> that isn't a static string

interface EstreeExpression {
  type: string
  value?: unknown
  expressions?: unknown[]
  quasis?: { value: { cooked?: string | null } }[]
}
interface LooseAttr {
  type: string
  name?: string
  value?:
  | string
  | { type: string; value: string; data?: { estree?: { body?: { expression?: EstreeExpression }[] } } }
  | null
}
interface LooseNode {
  type: string
  lang?: string | null
  value?: string
  name?: string | null
  attributes?: LooseAttr[]
  position?: { start: { line: number } }
}

/** The chart attribute as a string, or null if it isn't a static string. */
function staticString(attr: LooseAttr): string | null {
  const v = attr.value
  if (typeof v === 'string') return v
  if (!v) return null

  const expr = v.data?.estree?.body?.[0]?.expression
  if (expr?.type === 'Literal' && typeof expr.value === 'string') return expr.value
  if (expr?.type === 'TemplateLiteral' && expr.expressions?.length === 0) {
    return expr.quasis?.[0]?.value.cooked ?? null
  }

  // No estree available: accept a plain `...` template literal without escapes.
  const raw = v.value.trim()
  if (raw.startsWith('`') && raw.endsWith('`') && !raw.includes('${') && !raw.includes('\\')) {
    return raw.slice(1, -1)
  }
  return null
}

function register(source: string): void {
  collected.set(mermaidKey(source), normalizeChart(source))
}

export function remarkMermaidCollect() {
  return (tree: Root): void => {
    visit(tree, (node) => {
      const n = node as unknown as LooseNode

      // ```mermaid fences
      if (n.type === 'code' && n.lang === 'mermaid' && typeof n.value === 'string') {
        register(n.value)
        return
      }

      // <Mermaid chart={`...`} />
      if ((n.type === 'mdxJsxFlowElement' || n.type === 'mdxJsxTextElement') && n.name === 'Mermaid') {
        const attr = n.attributes?.find((a) => a.type === 'mdxJsxAttribute' && a.name === 'chart')
        const source = attr ? staticString(attr) : null
        if (source !== null) register(source)
        else dynamicLines.push(n.position?.start.line ?? 0)
      }
    })
  }
}

// ---------------------------------------------------------------------------
// virtual module sources
// ---------------------------------------------------------------------------

const DEV_RUNTIME = `
import mermaid from 'mermaid'

let initialized = false
const posted = new Set()

// Always undefined in dev: diagrams are rendered live.
export function peekMermaid() {
  return undefined
}

export async function renderMermaid(chart, key, config) {
  if (!initialized) {
    mermaid.initialize(config)
    initialized = true
  }
  // The id ends up inside the SVG (styles, markers): deriving it from the key
  // keeps ids unique across diagrams once they are all inlined in one page.
  const id = 'mermaid-' + key
  let svg
  try {
    ;({ svg } = await mermaid.render(id, chart))
  } catch (err) {
    // On syntax errors mermaid leaves a temp element in <body>.
    document.getElementById('d' + id)?.remove()
    document.getElementById(id)?.remove()
    throw err
  }
  if (!posted.has(key)) {
    posted.add(key)
    fetch('/api/mermaid-svg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, svg }),
    }).catch(() => posted.delete(key))
  }
  return svg
}
`

function buildRuntime(root: string): string {
  const dir = path.resolve(root, SVG_DIR)
  const keys = fs.existsSync(dir)
    ? fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.svg'))
      .map((f) => f.slice(0, -4))
      .filter((k) => KEY_RE.test(k))
    : []

  // Root-relative ids: resolved the same way on every OS.
  const imports = keys.map((k, i) => `import svg_${i} from ${JSON.stringify(`/${SVG_DIR}/${k}.svg?raw`)}`)
  const entries = keys.map((k, i) => `${JSON.stringify(k)}: svg_${i}`)

  return [
    ...imports,
    `const svgs = { ${entries.join(', ')} }`,
    'export function peekMermaid(key) { return svgs[key] }',
    'export async function renderMermaid(_chart, key) {',
    "  throw new Error('Diagram not pre-rendered: ' + key + '.svg is missing. Run npm run dev, open the report so the diagram renders once, then rebuild.')",
    '}',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// the Vite plugin
// ---------------------------------------------------------------------------

export function mermaidPlugin(): Plugin {
  let isBuild = false
  let root = process.cwd()

  return {
    name: 'report-maker:mermaid',

    config(_config, { command }) {
      // The only import of `mermaid` lives in a virtual module the dependency
      // scanner may not see: pre-bundle it explicitly to avoid a reload on first load.
      if (command === 'serve') return { optimizeDeps: { include: ['mermaid'] } }
    },

    configResolved(config) {
      isBuild = config.command === 'build'
      root = config.root
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },

    load(id) {
      if (id !== RESOLVED_ID) return
      return isBuild ? buildRuntime(root) : DEV_RUNTIME
    },

    configureServer(server) {
      const dir = path.resolve(root, SVG_DIR)

      server.middlewares.use('/api/mermaid-svg', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => {
          try {
            const { key, svg } = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
              key?: unknown
              svg?: unknown
            }
            if (typeof key !== 'string' || !KEY_RE.test(key) || typeof svg !== 'string' || !svg.startsWith('<svg')) {
              res.statusCode = 400
              res.end('bad request')
              return
            }
            const file = path.join(dir, `${key}.svg`)
            fs.mkdirSync(dir, { recursive: true })
            // Skip identical writes: no pointless file-watcher noise.
            if (!fs.existsSync(file) || fs.readFileSync(file, 'utf-8') !== svg) fs.writeFileSync(file, svg)
            res.statusCode = 204
            res.end()
          } catch {
            res.statusCode = 400
            res.end('bad request')
          }
        })
      })
    },

    buildEnd(error) {
      if (error || !isBuild) return

      const dir = path.resolve(root, SVG_DIR)
      const existing = new Set(
        fs.existsSync(dir)
          ? fs
            .readdirSync(dir)
            .filter((f) => f.endsWith('.svg'))
            .map((f) => f.slice(0, -4))
          : [],
      )
      const preview = (chart: string) => chart.split('\n')[0].slice(0, 60)

      let missing = 0
      for (const [key, chart] of collected) {
        if (existing.has(key)) continue
        missing++
        this.warn(
          `[mermaid] ${key}.svg could not be found for the diagram "${preview(chart)}…" — the report will show an error there. ` +
          'Run `npm run dev`, open the report so the diagram renders once, then rebuild.',
        )
      }
      for (const line of dynamicLines) {
        this.warn(
          `[mermaid] <Mermaid chart={…}> near line ${line} is not a static string and can't be pre-rendered.`,
        )
      }
      for (const key of existing) {
        if (!collected.has(key)) {
          this.warn(`[mermaid] ${key}.svg isn't used by any diagram anymore (still bundled — delete it to shrink the build).`)
        }
      }

      console.log(`[mermaid] ${collected.size - missing}/${collected.size} diagram(s) pre-rendered, no mermaid.js in the bundle`)
    },
  }
}
