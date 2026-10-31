export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

const HEX_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
// Accepts both legacy comma syntax (rgb(0,0,0) / rgba(0,0,0,0.25)) and the
// modern space/slash syntax (rgb(0 0 0 / 25%)), with or without surrounding spaces.
const RGB_RE =
  /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i;
const HSL_RE =
  /^hsla?\(\s*([\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i;

function parseAlpha(raw: string | undefined): number {
  if (raw === undefined) return 1;
  return raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw);
}

/** Parses a CSS color string (hex/rgb/rgba/hsl/hsla) into {r,g,b,a}, or null if it isn't one. */
export function parseColor(value: string): RGBA | null {
  const v = value.trim();

  const hexMatch = HEX_RE.exec(v);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgbMatch = RGB_RE.exec(v);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
      a: parseAlpha(rgbMatch[4]),
    };
  }

  const hslMatch = HSL_RE.exec(v);
  if (hslMatch) {
    const { r, g, b } = hslToRgb(
      Number(hslMatch[1]),
      Number(hslMatch[2]) / 100,
      Number(hslMatch[3]) / 100,
    );
    return { r, g, b, a: parseAlpha(hslMatch[4]) };
  }

  return null;
}

export function isColor(value: string): boolean {
  return parseColor(value) !== null;
}

const clampByte = (n: number) => Math.round(Math.min(255, Math.max(0, n)));
const toHexByte = (n: number) => clampByte(n).toString(16).padStart(2, '0');

/** {r,g,b} -> "#rrggbb" (ignores alpha — for feeding the native <input type="color">) */
export function toHex({ r, g, b }: Pick<RGBA, 'r' | 'g' | 'b'>): string {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

/** Builds a clean CSS value: plain hex when fully opaque, rgba(...) otherwise. */
export function formatColor({ r, g, b, a }: RGBA): string {
  if (a >= 1) return toHex({ r, g, b });
  const alpha = Math.round(Math.max(0, Math.min(1, a)) * 100) / 100;
  return `rgba(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)}, ${alpha})`;
}
