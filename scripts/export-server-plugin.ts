import type { Plugin } from 'vite';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type ReportBuildMode = 'folder' | 'singlefile' | 'hybrid';

export interface ExportRequestBody {
  mode: ReportBuildMode;
  excludeExtensions?: string[];
  maxImageWidth?: number;
  excludeFiles?: string[];
}

/**
 * Dev-only middleware: POST /api/export triggers a real `vite build` with the
 * chosen mode + asset-exclusion rules, without leaving the browser.
 * Only active while `vite dev` is running — never bundled into report output.
 *
 * TODO(you): build the <ExportPanel> component (mode toggle + checkboxes for
 * which assets to exclude) that calls this, e.g.:
 *
 *   const res = await fetch('/api/export', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       mode: 'hybrid',
 *       excludeExtensions: ['.mp4', '.mov', '.gif'],
 *       maxImageWidth: 3000,
 *     }),
 *   })
 *   const { ok, log, outDir } = await res.json()
 */
export function exportServerPlugin(): Plugin {
  return {
    name: 'report-maker:export-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/export', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          let payload: ExportRequestBody;
          try {
            payload = JSON.parse(body || '{}');
          } catch {
            res.statusCode = 400;
            res.end('Invalid JSON body');
            return;
          }

          const configPath = path.resolve(process.cwd(), 'report.assets.config.json');
          fs.writeFileSync(
            configPath,
            JSON.stringify(
              {
                excludeExtensions: payload.excludeExtensions ?? ['.mp4', '.mov', '.webm', '.gif'],
                maxImageWidth: payload.maxImageWidth ?? 3000,
                excludeFiles: payload.excludeFiles ?? [],
              },
              null,
              2,
            ),
          );

          const mode = payload.mode ?? 'folder';
          const child = spawn('node', ['scripts/build-report.mjs', mode], {
            cwd: process.cwd(),
            shell: true,
          });

          let log = '';
          child.stdout.on('data', (d) => (log += d.toString()));
          child.stderr.on('data', (d) => (log += d.toString()));
          child.on('close', (code) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: code === 0, log, outDir: `dist/${mode}` }));
          });
        });
      });
    },
  };
}
