import { visit } from 'unist-util-visit';
import { toString as mdastToString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import { valueToEstree } from 'estree-util-value-to-estree';
import type { Root, Heading } from 'mdast';
import type { Plugin } from 'unified';

// Note: `hProperties` is already declared on mdast's `Data` type by
// mdast-util-to-hast (typed as hast's `Properties`, i.e. string/number/
// boolean/array values) — no module augmentation needed here. Redeclaring
// it with an incompatible type (e.g. `Record<string, unknown>`) causes a
// "subsequent property declarations must have the same type" error.

export interface TocEntry {
  id: string;
  depth: number;
  /** e.g. "2.1" */
  number: string;
  text: string;
}

export interface HeadingNumbersOptions {
  /** Shallowest heading depth to number (default: 1) */
  minDepth?: number;
  /** Deepest heading depth to number (default: 6) */
  maxDepth?: number;
  /** Name of the export injected into the compiled MDX module (default: "toc") */
  exportName?: string;
  /** Set false if you want to add the visible "1.2 " prefix yourself in a component instead */
  prefixHeadingText?: boolean;
}

/**
 * Walks the MDX/Markdown AST once per file and:
 *   1. Assigns hierarchical numbers to every <h1>-<h6> ("1", "1.1", "1.2", "2", "2.1"...)
 *   2. Assigns a stable, unique slug id to each heading (for anchor links)
 *   3. Injects `export const toc = [{ id, depth, number, text }, ...]` into the
 *      compiled module, so any component importing the .mdx file can render
 *      a table of contents with zero extra wiring:
 *
 *        import Report, { toc } from './report.mdx'
 */
const remarkHeadingNumbers: Plugin<[HeadingNumbersOptions?], Root> = (options = {}) => {
  const { minDepth = 1, maxDepth = 6, exportName = 'toc', prefixHeadingText = true } = options;

  return (tree, file) => {
    const slugger = new GithubSlugger();
    // counters[0] = h1 count, counters[1] = h2 count, etc.
    const counters = [0, 0, 0, 0, 0, 0];
    const toc: TocEntry[] = [];

    visit(tree, 'heading', (node: Heading) => {
      const { depth } = node;
      if (depth < minDepth || depth > maxDepth) return;

      counters[depth - 1] += 1;
      // Reset all deeper counters whenever a shallower heading appears,
      // e.g. a new h1 resets h2/h3/... back to 0.
      for (let i = depth; i < counters.length; i++) counters[i] = 0;

      const number = counters.slice(minDepth - 1, depth).join('.');
      const text = mdastToString(node);
      const id = slugger.slug(text || `section-${number}`);

      const data = (node.data ??= {});
      data.hProperties = {
        ...data.hProperties,
        id,
        'data-heading-number': number,
      };

      if (prefixHeadingText) {
        node.children.unshift({ type: 'text', value: `${number}\u2003` } as never);
      }

      toc.push({ id, depth, number, text });
    });

    // Inject `export const toc = [...]` as an MDX ESM node so it becomes a
    // real named export of the compiled module.
    tree.children.unshift({
      type: 'mdxjsEsm',
      value: '',
      data: {
        estree: {
          type: 'Program',
          sourceType: 'module',
          body: [
            {
              type: 'ExportNamedDeclaration',
              specifiers: [],
              source: null,
              declaration: {
                type: 'VariableDeclaration',
                kind: 'const',
                declarations: [
                  {
                    type: 'VariableDeclarator',
                    id: { type: 'Identifier', name: exportName },
                    init: valueToEstree(toc),
                  },
                ],
              },
            },
          ],
        },
      },
    } as never);

    file.data.toc = toc;
  };
};

export default remarkHeadingNumbers;
