import mdx from "@mdx-js/rollup";
import babel from '@rolldown/plugin-babel';
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import rehypeMdxCodeProps from "rehype-mdx-code-props";
import rehypeMdxImportMedia from "rehype-mdx-import-media";
import remarkDirective from "remark-directive";
import remarkDirectiveRehype from "remark-directive-rehype";
import remarkGfm from "remark-gfm";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, type PluginOption } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import svgr from "vite-plugin-svgr";
import { loadAssetConfig, shouldInlineAsset } from "./scripts/asset-rules.ts";
import { assetsServerPlugin } from "./scripts/assets-server-plugin.ts";
import { exportServerPlugin } from "./scripts/export-server-plugin.ts";
import { mermaidPlugin, remarkMermaidCollect } from './scripts/mermaid-plugin.ts';
import { shikiPlugin } from './scripts/shiki-plugin.ts';
import { shikiThemesServerPlugin } from "./scripts/shiki-themes-server-plugin.ts";
import { themeServerPlugin } from "./scripts/theme-server-plugin.ts";
import remarkHeadingNumbers from "./src/utils/mdx-plugins/remark-heading-numbers.ts";

// Set by scripts/build-report.mjs (see package.json "build:*" scripts):
//   folder     -> normal Vite build, assets emitted to dist/folder/assets/
//   singlefile -> everything (JS, CSS, every asset) inlined into one dist/singlefile/index.html
//   hybrid     -> JS/CSS inlined into one HTML, but assets matching
//                 report.assets.config.json stay external in dist/hybrid/assets/
type ReportBuildMode = "folder" | "singlefile" | "hybrid";
const buildMode = (process.env.REPORT_BUILD_MODE ??
  "folder") as ReportBuildMode;

const assetConfig = loadAssetConfig();

const manualChunks = (id: string) => {
  const path = id.replace(/\\/g, "/");

  // Shiki - 1.3 Mo
  if (path.includes("/node_modules/@shikijs/engine-oniguruma")) return "shiki";
  if (path.includes("wasm")) return "shiki";
  if (path.includes("shiki-bundle.generated")) return "shiki-themes";

  // Index - 0.5 Mo
  // Rolldown runtime - 2 Ko

  /*
  Chunker les composants connu au lieu d'un gros index

  En mode folder, organiser :
  - les js dans /assets/scripts
  - png, etc. dans /assets/media
  - styles dans /assets/styles
  */
}

import type { Options as MdxOptions } from '@mdx-js/rollup';

const remarkPlugins: MdxOptions['remarkPlugins'] = [
  remarkGfm,
  remarkHeadingNumbers,
  remarkDirective,
  remarkDirectiveRehype,
  remarkMermaidCollect,
]

export default defineConfig({
  base: buildMode === "folder" ? "/" : "./",

  plugins: [
    // Must run before @vitejs/plugin-react transforms the JSX MDX compiles down to.
    {
      enforce: 'pre',
      ...mdx({ remarkPlugins, rehypePlugins: [rehypeMdxCodeProps, rehypeMdxImportMedia] })
    },
    shikiPlugin({ remarkPlugins }),

    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    tailwindcss(),

    svgr(),
    exportServerPlugin(),
    themeServerPlugin(),
    assetsServerPlugin(),
    shikiThemesServerPlugin(),
    mermaidPlugin(),

    // Full single-file mode: let the plugin apply its recommended config
    // (it force-inlines every JS/CSS/asset into one HTML — see its source).
    buildMode === "singlefile" && viteSingleFile(),

    // Hybrid mode: we still want JS/CSS inlined into one HTML, but NOT its
    // blanket "inline every asset" behavior, so we disable the recommended
    // config and set assetsInlineLimit ourselves below instead.
    buildMode === 'hybrid' && viteSingleFile({ useRecommendedBuildConfig: false }),

    babel({ presets: [reactCompilerPreset()] })
  ].filter(Boolean) as PluginOption[],

  build: {
    outDir: `dist/${buildMode}`,
    cssCodeSplit: buildMode === "folder",
    assetsDir: buildMode === "folder" ? "assets" : "",
    chunkSizeWarningLimit: buildMode === "folder" ? undefined : 100_000_000,
    assetsInlineLimit:
      buildMode === "hybrid"
        ? (filePath: string, content: Buffer) =>
          shouldInlineAsset(filePath, content, assetConfig)
        : undefined, // folder: Vite's default 4kb threshold · singlefile: forced true by the plugin
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    rolldownOptions: {
      plugins: [
        visualizer({
          filename: "stats.html",
          open: true,
          gzipSize: true,
          brotliSize: true,
        })
      ]
    }
  }
})
