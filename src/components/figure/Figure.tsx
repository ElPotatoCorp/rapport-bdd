import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useFigureNumber } from "./FigureProvider";
import { ZoomPan } from "./ZoomPan";

type FigureProps = {
  children: ReactNode;
  caption?: ReactNode;
  lightbox?: boolean;
  lightboxContent?: ReactNode;
  className?: string;
};

export function Figure({
  children: media,
  caption,
  lightbox = false,
  lightboxContent,
  className = "",
}: FigureProps) {
  const figureNumber = useFigureNumber();
  const [open, setOpen] = useState(false);

  function openLightbox() {
    if (lightbox) {
      setOpen(true);
    }
  }

  function closeLightbox() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLightbox();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <figure
        className={`figure ${lightbox ? "clickable" : ""} ${className}`}
        onClick={openLightbox}
      >
        <div className="figure-media">{media}</div>

        <figcaption>
          <span className="figure-label">Figure {figureNumber}</span>

          {caption && (
            <span className="figure-caption">
              {" — "}
              {caption}
            </span>
          )}
        </figcaption>
      </figure>

      {open && (
        <div
          className="figure-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Figure ${figureNumber}`}
          onClick={closeLightbox}
        >
          <div
            className="figure-lightbox-content"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Remounted fresh each time the lightbox opens, so zoom/pan
                            always starts reset — no leftover state from last time. */}
            <ZoomPan>{lightboxContent ?? media}</ZoomPan>

            <button
              type="button"
              className="figure-lightbox-close"
              onClick={closeLightbox}
              aria-label="Close figure"
            >
              <X />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
