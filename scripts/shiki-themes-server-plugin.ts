import type { Plugin } from 'vite';

/**
 * Dev-only endpoint: GET /api/shiki-themes -> the full bundledThemesInfo list.
 *
 * ThemePanel used to `import { bundledThemesInfo } from 'shiki'` directly —
 * cheap metadata in principle, but it sits in the same module as the actual
 * theme loader map, and relying on the bundler to tree-shake the rest of
 * that module away (behind `import.meta.env.DEV`) turned out to be
 * bundler-version-sensitive: it tree-shook correctly under plain Rollup in
 * testing here, but leaked the full ~65-theme catalog into a production
 * build under a newer bundler setup. Fetching the list from the dev server
 * instead makes this immune to that question entirely — 'shiki' is only
 * ever required here, in Node, never in client source.
 */
export function shikiThemesServerPlugin(): Plugin {
  return {
    name: 'report-maker:shiki-themes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/shiki-themes', async (_req, res) => {
        const { bundledThemesInfo } = await import('shiki');
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify(
            bundledThemesInfo.map((t) => ({ id: t.id, displayName: t.displayName, type: t.type })),
          ),
        );
      });
    },
  };
}
