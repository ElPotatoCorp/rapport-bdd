import fs from 'node:fs';
import path from 'node:path';
import { imageSize } from 'image-size';

export interface AssetExclusionConfig {
  /** File extensions that always stay external, regardless of size, e.g. video/gif */
  excludeExtensions: string[];
  /** Images wider than this (px) are treated as "large" and kept external */
  maxImageWidth: number;
  /** Explicit relative paths the user checked off in the export UI */
  excludeFiles: string[];
}

const CONFIG_PATH = path.resolve(process.cwd(), 'report.assets.config.json');

export const DEFAULT_ASSET_CONFIG: AssetExclusionConfig = {
  excludeExtensions: ['.mp4', '.mov', '.webm', '.gif'],
  maxImageWidth: 3000,
  excludeFiles: [],
};

export function loadAssetConfig(): AssetExclusionConfig {
  if (!fs.existsSync(CONFIG_PATH)) return DEFAULT_ASSET_CONFIG;
  try {
    const user = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return { ...DEFAULT_ASSET_CONFIG, ...user };
  } catch {
    console.warn('[report-maker] Could not parse report.assets.config.json — using defaults.');
    return DEFAULT_ASSET_CONFIG;
  }
}

/**
 * Used as Vite's `build.assetsInlineLimit` function in "hybrid" mode.
 * Return false to force the asset to be emitted as a separate file in
 * dist/<mode>/assets/ instead of being base64-inlined into the bundle.
 */
export function shouldInlineAsset(
  filePath: string,
  content: Buffer,
  config: AssetExclusionConfig,
): boolean {
  const ext = path.extname(filePath).toLowerCase();

  if (config.excludeFiles.some((f) => filePath.endsWith(f))) return false;
  if (config.excludeExtensions.includes(ext)) return false;

  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    try {
      const { width } = imageSize(content);
      if (width && width > config.maxImageWidth) return false;
    } catch {
      // Couldn't read dimensions (corrupt/odd file) — fall through and let it inline.
    }
  }

  return true;
}
