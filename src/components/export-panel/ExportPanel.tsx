import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Panel } from "../panel/Panel";

type ReportBuildMode = "folder" | "singlefile" | "hybrid";

interface ExportResult {
  ok: boolean;
  log: string;
  outDir: string;
}

const MODE_INFO: {
  value: ReportBuildMode;
  label: string;
  description: string;
}[] = [
  {
    value: "folder",
    label: "Folder",
    description:
      "index.html + a separate assets/ folder (default Vite output).",
  },
  {
    value: "singlefile",
    label: "Single file",
    description:
      "Everything — JS, CSS, every image/gif/video — inlined into one .html.",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    description:
      "One .html for JS/CSS, but the assets you exclude below stay in assets/.",
  },
];

const KNOWN_EXTENSIONS = [".gif", ".mp4", ".mov", ".webm"] as const;

export function ExportPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ReportBuildMode>("hybrid");
  const [excludedExt, setExcludedExt] = useState<Set<string>>(
    new Set([".gif", ".mp4", ".mov", ".webm"]),
  );
  const [maxImageWidth, setMaxImageWidth] = useState(3000);
  const [excludedFiles, setExcludedFiles] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);

  const [detectedAssets, setDetectedAssets] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then((d) => setDetectedAssets(d.files));
  }, []);

  // Must depend on detectedAssets: it now arrives asynchronously from the
  // fetch above, not synchronously from import.meta.glob like before — an
  // empty dependency array would freeze this at the first render's "[]".
  const largeAssets = useMemo(
    () =>
      detectedAssets.filter((f) =>
        KNOWN_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext)),
      ),
    [detectedAssets],
  );

  function toggleSet(
    set: Set<string>,
    setSet: (s: Set<string>) => void,
    value: string,
  ) {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setSet(next);
  }

  async function handleExport() {
    setIsExporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          excludeExtensions: Array.from(excludedExt),
          maxImageWidth,
          excludeFiles: Array.from(excludedFiles),
        }),
      });
      const data: ExportResult = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        ok: false,
        log: err instanceof Error ? err.message : String(err),
        outDir: "",
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="floating-button"
        onClick={() => setIsOpen(true)}
        aria-label="Open export panel"
        title="Export report"
      >
        <Download />
      </button>

      <Panel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Export report"
        footer={
          <>
            <button
              type="button"
              className="panel-btn panel-btn--secondary"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="panel-btn panel-btn--primary"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? "Building…" : "Export"}
            </button>
          </>
        }
      >
        <fieldset className="panel-section">
          <legend>Build mode</legend>
          {MODE_INFO.map((m) => (
            <label
              key={m.value}
              className="flex cursor-pointer items-start gap-2.5 py-1.5"
            >
              <input
                className="mt-1.5"
                type="radio"
                name="report-export-mode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
              />
              <span className="flex flex-col">
                <strong>{m.label}</strong>
                <small className="text-sm opacity-65">{m.description}</small>
              </span>
            </label>
          ))}
        </fieldset>

        {mode === "hybrid" && (
          <fieldset className="panel-section">
            <legend>Keep external (don't inline)</legend>

            <div className="my-2 flex flex-wrap gap-x-5 gap-y-2">
              {KNOWN_EXTENSIONS.map((ext) => (
                <label
                  key={ext}
                  className="flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={excludedExt.has(ext)}
                    onChange={() => toggleSet(excludedExt, setExcludedExt, ext)}
                  />
                  all {ext} files
                </label>
              ))}
            </div>

            <label className="mt-2 flex items-center gap-2 text-sm">
              Exclude images wider than
              <input
                className="w-22 px-1.5 py-1"
                type="number"
                min={0}
                step={100}
                value={maxImageWidth}
                onChange={(e) => setMaxImageWidth(Number(e.target.value))}
              />
              px
            </label>

            {largeAssets.length > 0 && (
              <>
                <p className="mt-3 text-sm opacity-75">
                  Detected gif/video assets — exclude individually:
                </p>
                <div className="my-2 flex max-h-32 flex-col flex-wrap gap-x-5 gap-y-2 overflow-y-auto">
                  {largeAssets.map((f) => (
                    <label
                      key={f}
                      className="flex cursor-pointer items-center gap-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={excludedFiles.has(f)}
                        onChange={() =>
                          toggleSet(excludedFiles, setExcludedFiles, f)
                        }
                      />
                      {f}
                    </label>
                  ))}
                </div>
              </>
            )}
          </fieldset>
        )}

        {result && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${result.ok ? "bg-success/12 text-success" : "bg-error/12 text-error"}`}
          >
            <p>
              {result.ok ? `✓ Built to ${result.outDir}/` : "✗ Build failed"}
            </p>
            {result.log && (
              <pre className="mt-2 max-h-40 overflow-auto text-xs whitespace-pre-wrap">
                {result.log}
              </pre>
            )}
          </div>
        )}
      </Panel>
    </>
  );
}
