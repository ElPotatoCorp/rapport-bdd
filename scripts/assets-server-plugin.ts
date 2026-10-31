import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const ASSETS_DIR = path.resolve(process.cwd(), 'src/assets');
const MATCH_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.mov', '.webm']);

function listRecursively(dir: string, base = ''): string[] {
  if (!fs.existsSync(dir)) return [];
  let out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out = out.concat(listRecursively(path.join(dir, entry.name), rel));
    else if (MATCH_EXT.has(path.extname(entry.name).toLowerCase())) out.push(rel);
  }
  return out;
}

// Dev-only: lists asset file NAMES from disk directly (fs.readdirSync), never
// importing their contents — so, unlike import.meta.glob, nothing here ever
// touches the Rollup build graph, and an unused asset never ships.
export function assetsServerPlugin(): Plugin {
  return {
    name: 'report-maker:assets-list',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/assets', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ files: listRecursively(ASSETS_DIR) }));
      });
    },
  };
}
