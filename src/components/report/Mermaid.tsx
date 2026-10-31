import { useEffect, useState } from 'react';
import { peekMermaid, renderMermaid } from 'virtual:mermaid-runtime';
import { MERMAID_CONFIG, mermaidKey, normalizeChart } from '../../utils/shared/mermaid-shared';

interface MermaidProps {
  chart: string;
}

type RenderState =
  | { status: 'loading' }
  | { status: 'ready'; svg: string }
  | { status: 'error'; message: string }

/**
 * Renders a mermaid diagram from its source text.
 *
 * - build: the SVG was captured beforehand (see scripts/mermaid-plugin.ts) and is
 *   looked up synchronously by hash — no mermaid.js in the bundle, no loading flash.
 * - dev: rendered live with the real `mermaid` package, so syntax errors show up
 *   while editing; each SVG is saved to src/generated/mermaid/ for the next build.
 */
export function Mermaid({ chart }: MermaidProps) {
  const source = normalizeChart(chart)
  const key = mermaidKey(source)
  const precompiled = peekMermaid(key) // string in build (if captured), always undefined in dev
  const [state, setState] = useState<RenderState>({ status: 'loading' })

  useEffect(() => {
    if (precompiled !== undefined) return
    let cancelled = false
    renderMermaid(source, key, MERMAID_CONFIG)
      .then((svg) => {
        if (!cancelled) setState({ status: 'ready', svg })
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      cancelled = true
    }
  }, [source, key, precompiled])

  const svg = precompiled ?? (state.status === 'ready' ? state.svg : null)
  // eslint-disable-next-line react/no-danger -- mermaid's own SVG output
  if (svg !== null) return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />
  if (state.status === 'error') {
    return (
      <pre className="mermaid-error" role="alert">
        {state.message}
      </pre>
    )
  }
  return <pre className="mermaid-loading">Rendering diagram…</pre>
}
