import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import "./Panel.css";

interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Panel name, rendered as the <h2> and used as the dialog's accessible name. */
  title: string;
  /** Extra header content, rendered between the title and the close button. */
  headerActions?: ReactNode;
  /** Footer content, typically `.panel-btn` buttons. */
  footer: ReactNode;
  /** Any CSS length. Defaults to 30rem. */
  maxWidth?: string;
  children: ReactNode;
}

/**
 * Modal shell shared by every floating panel: backdrop, header, scrollable
 * body and footer. It owns open/close behaviour (backdrop click, Escape) and
 * dialog semantics; callers own the content and the actions.
 */
export function Panel({
  isOpen,
  onClose,
  title,
  headerActions,
  footer,
  maxWidth,
  children,
}: PanelProps) {
  const titleId = useId();

  // Listen on document: a keydown handler on the backdrop <div> only fires
  // when focus is inside it, which is not the case after opening the modal
  // with a mouse click.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // The backdrop click is a pointer shortcut; keyboard users close via
    // Escape or the close button, hence role="presentation".
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-bg-surface text-text max-h-[85vh] w-full overflow-y-auto rounded-xl shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxWidth: maxWidth ?? "30rem" }}
      >
        <header className="border-b-border flex items-center gap-3 border-b border-solid px-5 py-4">
          <h2 id={titleId} className="panel-title">
            {title}
          </h2>
          {headerActions}
          <button
            type="button"
            className="cursor-pointer border-none bg-none text-base opacity-60 hover:opacity-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
        </header>

        <div className="flex flex-col gap-5 p-5">{children}</div>

        <footer className="border-border flex justify-end gap-2.5 border-t border-solid px-5 py-4">
          {footer}
        </footer>
      </div>
    </div>
  );
}
