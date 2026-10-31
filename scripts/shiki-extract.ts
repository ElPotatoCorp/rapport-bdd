// Finds every <Code type="bloc"> of an MDX syntax tree and reads its language and code
// as static strings. No imports on purpose: pure logic, easy to test.
//
// A code block can come from three places:
//  - a Markdown fence (mdast `code` node): ```bash bar copy name="terminal" … ```
//    — the current syntax, also inside directives (`:::callout`, `:::tabs`…), whose
//    children are ordinary mdast nodes;
//  - a <Code type="bloc"> mdast node (mdxJsxFlowElement / mdxJsxTextElement) — the old syntax;
//  - a <Code type="bloc"> JSXElement inside a JS expression (estree), e.g. in
//    <Tabs tabs={[{ content: (<Code ...>...</Code>) }]} />.

// AST shapes come from remark-mdx and acorn-jsx; not worth typing exhaustively.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>

export interface CodeBlock {
  code: string
  lang: string // 'text' when no lang is given
  line: number // line in report.mdx (of the closest mdast node)
}

export interface Extraction {
  blocks: CodeBlock[]
  /** Lines of <Code type="bloc"> whose lang or content isn't a static string. */
  unresolved: number[]
}

/** String value of a string literal or of a template literal without ${}; null otherwise. */
function staticFromExpression(expr: Loose | null | undefined): string | null {
  if (!expr) return null
  if (expr.type === 'Literal' && typeof expr.value === 'string') return expr.value
  if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0 && expr.quasis.length === 1) {
    return expr.quasis[0].value.cooked ?? null
  }
  return null
}

function walkEstree(node: unknown, cb: (n: Loose) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walkEstree(child, cb)
    return
  }
  if (!node || typeof node !== 'object') return
  const n = node as Loose
  if (typeof n.type === 'string') cb(n)
  for (const key of Object.keys(n)) {
    if (key === 'loc' || key === 'range') continue
    walkEstree(n[key], cb)
  }
}

// ---- estree side (JSXElement) ---------------------------------------------
// Attribute readers return: undefined = absent, string = static value, null = present but dynamic.

function estAttr(attrs: Loose[], name: string): string | null | undefined {
  const attr = attrs.find((a) => a.type === 'JSXAttribute' && a.name?.name === name)
  if (!attr) return undefined
  const v = attr.value
  if (v === null || v === undefined) return '' // bare attribute (e.g. `bar`)
  if (v.type === 'Literal') return typeof v.value === 'string' ? v.value : null
  if (v.type === 'JSXExpressionContainer') return staticFromExpression(v.expression)
  return null
}

function estChildren(children: Loose[]): string | null {
  const real = children.filter((c) => !(c.type === 'JSXText' && String(c.value).trim() === ''))
  if (real.length !== 1 || real[0].type !== 'JSXExpressionContainer') return null
  return staticFromExpression(real[0].expression)
}

// ---- mdast side (mdxJsx*Element) ------------------------------------------

function mdAttr(attrs: Loose[], name: string): string | null | undefined {
  const attr = attrs.find((a) => a.type === 'mdxJsxAttribute' && a.name === name)
  if (!attr) return undefined
  const v = attr.value
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  return staticFromExpression(v.data?.estree?.body?.[0]?.expression)
}

function mdChildren(children: Loose[]): string | null {
  const real = children.filter((c) => !(c.type === 'text' && String(c.value).trim() === ''))
  if (real.length !== 1) return null
  const c = real[0]
  if (c.type !== 'mdxFlowExpression' && c.type !== 'mdxTextExpression') return null
  return staticFromExpression(c.data?.estree?.body?.[0]?.expression)
}

export function collectCodeBlocks(root: Loose): Extraction {
  const blocks: CodeBlock[] = []
  const unresolved: number[] = []

  const add = (type: string | null | undefined, lang: string | null | undefined, code: string | null, line: number) => {
    if (type === undefined || (type !== null && type !== 'bloc')) return // inline <Code>: nothing to highlight
    if (type === null || lang === null || code === null) {
      unresolved.push(line)
      return
    }
    blocks.push({ code, lang: lang || 'text', line })
  }

  const fromEstree = (estree: unknown, line: number) =>
    walkEstree(estree, (n) => {
      if (n.type !== 'JSXElement' || n.openingElement?.name?.name !== 'Code') return
      const attrs: Loose[] = n.openingElement.attributes ?? []
      add(estAttr(attrs, 'type'), estAttr(attrs, 'lang'), estChildren(n.children ?? []), line)
    })

  const walkMd = (node: Loose) => {
    const line: number = node.position?.start?.line ?? 0

    // Markdown fences. ```mermaid ones belong to the Mermaid plugin.
    if (node.type === 'code' && typeof node.value === 'string' && node.lang !== 'mermaid') {
      blocks.push({ code: node.value, lang: node.lang || 'text', line })
    }

    // JS expressions: {…} in the text, ESM blocks.
    if (node.data?.estree) fromEstree(node.data.estree, line)

    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      const attrs: Loose[] = node.attributes ?? []
      // JS expressions inside attributes: <Tabs tabs={[…<Code>…]} />
      for (const a of attrs) {
        if (a.value && typeof a.value === 'object' && a.value.data?.estree) fromEstree(a.value.data.estree, line)
      }
      if (node.name === 'Code') {
        add(mdAttr(attrs, 'type'), mdAttr(attrs, 'lang'), mdChildren(node.children ?? []), line)
      }
    }

    for (const child of node.children ?? []) walkMd(child)
  }

  walkMd(root)
  return { blocks, unresolved }
}
