import type { ReactNode } from 'react';
import { useZoomPan } from './useZoomPan';

interface ZoomPanProps {
  children: ReactNode;
}

export function ZoomPan({ children }: ZoomPanProps) {
  const { containerRef, contentRef, scale, x, y, isZoomed, handlers } = useZoomPan();

  return (
    <div ref={containerRef} className="figure-zoom-pan" data-zoomed={isZoomed} {...handlers}>
      <div
        ref={contentRef}
        className={`figure-zoom-content${isZoomed ? ' is-zoomed' : ''}`}
        style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}
      >
        {children}
      </div>

      <p className="figure-zoom-hint">
        Scroll or pinch to zoom · drag to pan · double-click to reset
      </p>
    </div>
  );
}
