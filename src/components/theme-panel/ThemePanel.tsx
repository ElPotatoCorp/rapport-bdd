import { PaintRoller } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SHIKI_DARK,
  DEFAULT_SHIKI_LIGHT,
  previewShikiThemes,
  SHIKI_DARK_VAR,
  SHIKI_LIGHT_VAR,
} from "../code/shiki-theme-vars";
import { Panel } from "../panel/Panel";
import {
  formatColor,
  isColor,
  parseColor,
  toHex,
  type RGBA,
} from "./theme-color";
import { applyTheme, resolveIsDark } from "../../utils/theme/theme";

const MANAGED_SHIKI_VARS = new Set([SHIKI_LIGHT_VAR, SHIKI_DARK_VAR]);

interface ShikiThemeMeta {
  id: string;
  displayName: string;
  type: "light" | "dark";
}

type ShikiThemesByType = Record<
  "light" | "dark",
  { id: string; displayName: string }[]
>;

const EMPTY_SHIKI_THEMES: ShikiThemesByType = { light: [], dark: [] };

type Vars = Record<string, string>;
type PreviewMode = "light" | "dark";

interface ThemeApiResponse {
  light: Vars;
  dark: Vars;
}

/**
 * Applies (or clears) a set of CSS custom properties as inline styles on
 * <html>, which override :root/.dark from style.css without
 * writing anything to disk — this is the "preview" half of the panel.
 */
function applyPreview(vars: Vars) {
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(vars))
    root.style.setProperty(prop, value);
}
function clearPreview(props: string[]) {
  const root = document.documentElement;
  for (const prop of props) root.style.removeProperty(prop);
}

export function ThemePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [light, setLight] = useState<Vars>({});
  const [dark, setDark] = useState<Vars>({});
  const [previewMode, setPreviewMode] = useState<PreviewMode>("light");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [shikiThemesByType, setShikiThemesByType] =
    useState<ShikiThemesByType>(EMPTY_SHIKI_THEMES);

  // Theme catalog comes from the dev server (see shiki-themes-server-plugin.ts)
  // rather than importing 'shiki' here — keeps the package out of client source.
  useEffect(() => {
    fetch("/api/shiki-themes")
      .then((r) => r.json())
      .then((list: ShikiThemeMeta[]) => {
        const grouped: ShikiThemesByType = { light: [], dark: [] };
        for (const t of list)
          grouped[t.type].push({ id: t.id, displayName: t.displayName });
        setShikiThemesByType(grouped);
      })
      .catch(() => {
        // Non-fatal: the comboboxes just stay empty until the server is reachable.
      });
  }, []);

  // Load current values once, on first open.
  useEffect(() => {
    if (!isOpen || loaded) return;
    fetch("/api/theme")
      .then((r) => r.json())
      .then((data: ThemeApiResponse) => {
        setLight(data.light);
        setDark(data.dark);
        setLoaded(true);
        previewShikiThemes({
          light: data.light[SHIKI_LIGHT_VAR] ?? DEFAULT_SHIKI_LIGHT,
          dark: data.light[SHIKI_DARK_VAR] ?? DEFAULT_SHIKI_DARK,
        });
      })
      .catch((err) =>
        setMessage({ ok: false, text: `Could not load theme: ${err.message}` }),
      );
  }, [isOpen, loaded]);

  // Live preview whenever a value or the light/dark toggle changes.
  useEffect(() => {
    if (!loaded) return;
    applyTheme(previewMode === "dark");
    applyPreview(light);
    if (previewMode === "dark") applyPreview(dark);
  }, [light, dark, previewMode, loaded]);

  useEffect(() => {
    return () => {
      // Panel unmounted: drop the forced preview, let the page fall back to
      // its own default (e.g. prefers-color-scheme via CSS, if you use that
      // for first-load, or plain :root if you don't).
      applyTheme(resolveIsDark());
      clearPreview([...Object.keys(light), ...Object.keys(dark)]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colorVars = useMemo(
    () =>
      Object.keys(light).filter(
        (k) => isColor(light[k]) && !MANAGED_SHIKI_VARS.has(k),
      ),
    [light],
  );
  const otherVars = useMemo(
    () =>
      Object.keys(light).filter(
        (k) => !isColor(light[k]) && !MANAGED_SHIKI_VARS.has(k),
      ),
    [light],
  );

  const shikiLight = light[SHIKI_LIGHT_VAR] ?? DEFAULT_SHIKI_LIGHT;
  const shikiDark = light[SHIKI_DARK_VAR] ?? DEFAULT_SHIKI_DARK;

  function setShikiTheme(which: "light" | "dark", value: string) {
    const next = {
      light: which === "light" ? value : shikiLight,
      dark: which === "dark" ? value : shikiDark,
    };
    setLightVar(which === "light" ? SHIKI_LIGHT_VAR : SHIKI_DARK_VAR, value);
    previewShikiThemes(next);
  }

  function setLightVar(key: string, value: string) {
    setLight((prev) => ({ ...prev, [key]: value }));
  }
  function setDarkVar(key: string, value: string) {
    setDark((prev) => ({ ...prev, [key]: value }));
  }
  function clearDarkOverride(key: string) {
    setDark((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ light, dark }),
      });
      const data = await res.json();
      setMessage(
        data.ok
          ? { ok: true, text: "Saved to style.css — Vite will hot-reload it." }
          : { ok: false, text: data.error ?? "Save failed." },
      );
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    clearPreview([...Object.keys(light), ...Object.keys(dark)]);
    setLoaded(false); // triggers a fresh GET next render
    setMessage(null);
  }

  return (
    <>
      <button
        type="button"
        className="floating-button bg-rainbow-cone"
        onClick={() => setIsOpen(true)}
        aria-label="Open theme panel"
        title="Edit theme"
      >
        <PaintRoller />
      </button>

      <Panel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Theme"
        maxWidth="34rem"
        headerActions={
          <div
            className="border-border flex overflow-hidden rounded-full border border-solid"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={previewMode === "light"}
              className="aria-selected:bg-primary aria-selected:text-text-on-accent cursor-pointer px-2.5 py-1 text-sm opacity-60 aria-selected:opacity-100"
              onClick={() => setPreviewMode("light")}
            >
              ☀ Light
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={previewMode === "dark"}
              className="aria-selected:bg-primary aria-selected:text-text-on-accent cursor-pointer px-2.5 py-1 text-sm opacity-60 aria-selected:opacity-100"
              onClick={() => setPreviewMode("dark")}
            >
              🌙 Dark
            </button>
          </div>
        }
        footer={
          <>
            <button
              type="button"
              className="panel-btn panel-btn--secondary"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              type="button"
              className="panel-btn panel-btn--primary"
              onClick={handleSave}
              disabled={isSaving || !loaded}
            >
              {isSaving ? "Saving…" : "Save to style.css"}
            </button>
          </>
        }
      >
        {!loaded ? (
          <p className="m-0 text-base opacity-70">Loading current theme…</p>
        ) : (
          <>
            <fieldset className="panel-section">
              <legend>Colors</legend>
              {colorVars.map((key) => {
                const value =
                  previewMode === "dark"
                    ? (dark[key] ?? light[key])
                    : light[key];
                const overridden = previewMode === "dark" && key in dark;
                const parsed: RGBA = parseColor(value) ?? {
                  r: 0,
                  g: 0,
                  b: 0,
                  a: 1,
                };
                const setVar =
                  previewMode === "dark" ? setDarkVar : setLightVar;

                function updateHue(hex: string) {
                  const next = parseColor(hex);
                  if (next) setVar(key, formatColor({ ...next, a: parsed.a }));
                }
                function updateAlpha(percent: number) {
                  setVar(key, formatColor({ ...parsed, a: percent / 100 }));
                }

                return (
                  <label key={key} className="flex items-center gap-2 py-1.25">
                    <span className="basis-36 overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap opacity-80">
                      {key}
                    </span>
                    <input
                      className="h-8 w-8 cursor-pointer rounded-sm"
                      type="color"
                      value={toHex(parsed)}
                      onChange={(e) => updateHue(e.target.value)}
                    />
                    <input
                      type="range"
                      className="accent-secondary w-18 basis-auto"
                      min={0}
                      max={100}
                      value={Math.round(parsed.a * 100)}
                      onChange={(e) => updateAlpha(Number(e.target.value))}
                      title={`Opacity: ${Math.round(parsed.a * 100)}%`}
                    />
                    <input
                      type="text"
                      className="border-border flex min-w-0 rounded-sm border border-solid px-2 py-1 text-sm"
                      value={value}
                      onChange={(e) => setVar(key, e.target.value)}
                    />
                    {previewMode === "dark" && (
                      <button
                        type="button"
                        className="cursor-pointer border-none bg-none text-base opacity-60 disabled:cursor-default disabled:opacity-20"
                        title="Use the same value as light mode"
                        disabled={!overridden}
                        onClick={() => clearDarkOverride(key)}
                      >
                        ↺
                      </button>
                    )}
                  </label>
                );
              })}
            </fieldset>

            <fieldset className="panel-section">
              <legend>Typography &amp; sizes</legend>
              {otherVars.map((key) => {
                const value =
                  previewMode === "dark"
                    ? (dark[key] ?? light[key])
                    : light[key];
                const overridden = previewMode === "dark" && key in dark;
                const setVar =
                  previewMode === "dark" ? setDarkVar : setLightVar;
                return (
                  <label key={key} className="flex items-center gap-2 py-1.25">
                    <span className="basis-36 overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap opacity-80">
                      {key}
                    </span>
                    <input
                      type="text"
                      className="border-border flex min-w-0 basis-full rounded-sm border border-solid px-2 py-1 text-sm"
                      value={value}
                      onChange={(e) => setVar(key, e.target.value)}
                    />
                    {previewMode === "dark" && (
                      <button
                        type="button"
                        className="cursor-pointer border-none bg-none text-base opacity-60 disabled:cursor-default disabled:opacity-20"
                        title="Use the same value as light mode"
                        disabled={!overridden}
                        onClick={() => clearDarkOverride(key)}
                      >
                        ↺
                      </button>
                    )}
                  </label>
                );
              })}
            </fieldset>

            <fieldset className="panel-section">
              <legend>Code syntax theme (Shiki)</legend>
              <label className="flex items-center gap-2 py-1.25">
                <span className="basis-36 overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap opacity-80">
                  Light theme
                </span>
                <select
                  className="border-border flex min-w-0 basis-full rounded-sm border border-solid px-2 py-1 text-sm"
                  value={shikiLight}
                  onChange={(e) => setShikiTheme("light", e.target.value)}
                >
                  <optgroup label="Light themes">
                    {shikiThemesByType.light.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.displayName}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Dark themes">
                    {shikiThemesByType.dark.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.displayName}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <label className="flex items-center gap-2 py-1.25">
                <span className="basis-36 overflow-hidden font-mono text-xs text-ellipsis whitespace-nowrap opacity-80">
                  Dark theme
                </span>
                <select
                  className="border-border flex min-w-0 basis-full rounded-sm border border-solid px-2 py-1 text-sm"
                  value={shikiDark}
                  onChange={(e) => setShikiTheme("dark", e.target.value)}
                >
                  <optgroup label="Dark themes">
                    {shikiThemesByType.dark.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.displayName}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Light themes">
                    {shikiThemesByType.light.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.displayName}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <p className="mt-2 text-xs opacity-60">
                Applies live to any <code>Code</code> block on the page.
                Requires a one-time CSS rule in style.css — see README.
              </p>
            </fieldset>

            {message && (
              <p
                className={`rounded-lg px-3.5 py-2.5 text-sm ${message.ok ? "bg-success/12 text-success" : "bg-error/12 text-error"}`}
              >
                {message.text}
              </p>
            )}
          </>
        )}
      </Panel>
    </>
  );
}
