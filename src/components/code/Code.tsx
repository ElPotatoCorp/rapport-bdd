import { Copy, CopyCheck } from "lucide-react";
import {
  useEffect,
  useState,
  type ReactNode
} from "react";
import { highlightLive, peekShiki } from "virtual:shiki-runtime";
import { shikiKey } from "../../utils/shared/shiki-shared";
import {
  SHIKI_PREVIEW_EVENT,
  getPersistedShikiThemes,
  type ShikiThemePair,
} from "./shiki-theme-vars";

type CodeProps = {
  type?: "inline" | "bloc";
  copy?: boolean;
  bar?: boolean;
  name?: string;
  lang?: string;
  children: ReactNode;
};

function copyFallback(text: string) {
  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.setAttribute("readonly", "");

  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  return copied;
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Use fallback below.
    }
  }

  return copyFallback(text);
}

/**
 * A code block is highlighted ONCE, with both themes in a single HTML: every token
 * carries --shiki-light / --shiki-dark variables, and style.css picks one according
 * to :root[data-theme]. Switching the theme therefore never re-highlights anything.
 *
 * - build: the HTML was computed at build time (scripts/shiki-plugin.ts) and is
 *   looked up synchronously by hash — no shiki, wasm or grammar in the bundle,
 *   and no flash of unhighlighted code. A block missing from the table (dynamic
 *   content the build couldn't read) stays as plain, unhighlighted text.
 * - dev: highlighted live with the full `shiki` package, so any theme or language
 *   works and ThemePanel's live preview keeps working.
 */
export function Code({
  type = "inline",
  copy = false,
  bar = false,
  name,
  lang,
  children,
}: CodeProps) {
  const [copied, setCopied] = useState(false);
  const [liveHtml, setLiveHtml] = useState("");
  const [themePair, setThemePair] = useState<ShikiThemePair>(() =>
    typeof window === "undefined"
      ? { light: "github-light", dark: "github-dark" }
      : getPersistedShikiThemes(),
  );

  const code =
    typeof children === "string"
      ? children
      : String(children);

  // string in build (if the block was found), always undefined in dev
  const precompiled = type === "bloc" ? peekShiki(shikiKey(code, lang || "")) : undefined;

  useEffect(() => {
    // Only fires in dev — ThemePanel (the only thing that dispatches this
    // event) never renders in production.
    function handlePreview(e: Event) {
      setThemePair((e as CustomEvent<ShikiThemePair>).detail);
    }
    window.addEventListener(SHIKI_PREVIEW_EVENT, handlePreview);
    return () => window.removeEventListener(SHIKI_PREVIEW_EVENT, handlePreview);
  }, []);

  useEffect(() => {
    if (type !== "bloc" || precompiled !== undefined) return;

    let cancelled = false;

    highlightLive(code, lang || "", themePair)
      .then((html) => {
        if (!cancelled) setLiveHtml(html);
      })
      .catch(() => {
        // Unknown language in dev, or a block the build didn't pre-highlight:
        // stay on the plain, unhighlighted fallback below.
        if (!cancelled) setLiveHtml("");
      });

    return () => {
      cancelled = true;
    };
  }, [type, code, lang, themePair, precompiled]);

  if (type === "inline") {
    return <code className="code-inline">{children}</code>;
  }

  async function handleCopy() {
    const success = await copyText(code);

    if (!success) return;

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  const html = precompiled ?? liveHtml;

  return (
    <div className={`code-wrapper ${bar ? "has-code-bar" : ""}`}>
      {bar && (
        <div className="code-bar">
          <div className="code-info">
            {name && (
              <span className="code-name">
                {name}
              </span>
            )}

            {lang && (
              <span className="code-language">
                {lang}
              </span>
            )}
          </div>

          {copy && (
            <button
              type="button"
              className={`copy-button ${copied ? "copied-button" : ""
                }`}
              onClick={handleCopy}
              aria-label={
                copied
                  ? "Code copied"
                  : "Copy code"
              }
            >
              {copied ? (
                <CopyCheck size={18} />
              ) : (
                <Copy size={18} />
              )}

              <span>
                {copied ? "Copied" : "Copy"}
              </span>
            </button>
          )}
        </div>
      )}

      {!bar && copy && (
        <button
          type="button"
          className={`copy-button-no-bar ${copied ? "copied-button" : ""
            }`}
          onClick={handleCopy}
          aria-label={
            copied
              ? "Code copied"
              : "Copy code"
          }
        >
          {copied ? (
            <CopyCheck size={18} />
          ) : (
            <Copy size={18} />
          )}
        </button>
      )}

      {html ? (
        <div
          className="code-shiki"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="code-bloc">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}