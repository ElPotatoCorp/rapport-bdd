import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_CLICK_SCALE = 2.5;

interface ZoomPanState {
  scale: number;
  x: number;
  y: number;
}

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export function useZoomPan() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<ZoomPanState>({ scale: 1, x: 0, y: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPinchDist = useRef<number | null>(null);
  const dragOrigin = useRef<{ x: number; y: number; originX: number; originY: number } | null>(
    null,
  );

  /** x/y are the content's top-left offset from the container's top-left (same coordinate space as getBoundingClientRect). */
  const clampPosition = useCallback((scale: number, x: number, y: number) => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return { x, y };

    const containerRect = container.getBoundingClientRect();
    const contentWidth = content.offsetWidth * scale;
    const contentHeight = content.offsetHeight * scale;

    const clampAxis = (pos: number, contentSize: number, containerSize: number) => {
      if (contentSize <= containerSize) return (containerSize - contentSize) / 2;
      const min = containerSize - contentSize;
      return Math.min(0, Math.max(min, pos));
    };

    return {
      x: clampAxis(x, contentWidth, containerRect.width),
      y: clampAxis(y, contentHeight, containerRect.height),
    };
  }, []);

  const center = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const containerRect = container.getBoundingClientRect();
    setState({
      scale: 1,
      x: (containerRect.width - content.offsetWidth) / 2,
      y: (containerRect.height - content.offsetHeight) / 2,
    });
  }, []);

  // Keep it centered while scale is still 1 (e.g. an image finishing loading,
  // or the lightbox being resized) — once the reader zooms, stop auto-recentering.
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    center();
    const ro = new ResizeObserver(() => {
      if (stateRef.current.scale === 1) center();
    });
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      setState((prev) => {
        const nextScale = clampScale(prev.scale * factor);
        if (nextScale === prev.scale) return prev;
        // Keep the point under the cursor/fingers fixed on screen while scaling.
        const cx = (px - prev.x) / prev.scale;
        const cy = (py - prev.y) / prev.scale;
        const nextX = px - cx * nextScale;
        const nextY = py - cy * nextScale;
        return { scale: nextScale, ...clampPosition(nextScale, nextX, nextY) };
      });
    },
    [clampPosition],
  );

  const toggleZoom = useCallback(
    (clientX: number, clientY: number) => {
      if (stateRef.current.scale > 1) center();
      else zoomAt(clientX, clientY, DOUBLE_CLICK_SCALE);
    },
    [center, zoomAt],
  );

  // React attaches onWheel as a *passive* listener by default (for scroll
  // perf), which means event.preventDefault() inside a JSX onWheel handler
  // is silently ignored — the page keeps scrolling underneath. Binding the
  // listener ourselves with { passive: false } is the only reliable fix.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoomAt]);

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1 && stateRef.current.scale > 1) {
      dragOrigin.current = {
        x: e.clientX,
        y: e.clientY,
        originX: stateRef.current.x,
        originY: stateRef.current.y,
      };
    }
    if (pointers.current.size === 2) {
      dragOrigin.current = null;
      const pts = Array.from(pointers.current.values());
      lastPinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 2) {
        const pts = Array.from(pointers.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        if (lastPinchDist.current) zoomAt(midX, midY, dist / lastPinchDist.current);
        lastPinchDist.current = dist;
        return;
      }

      if (dragOrigin.current) {
        const origin = dragOrigin.current;
        const dx = e.clientX - origin.x;
        const dy = e.clientY - origin.y;
        setState((prev) => ({
          ...prev,
          ...clampPosition(prev.scale, origin.originX + dx, origin.originY + dy),
        }));
      }
    },
    [zoomAt, clampPosition],
  );

  const endPointer = useCallback((e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastPinchDist.current = null;
    if (pointers.current.size === 0) dragOrigin.current = null;
  }, []);

  const onDoubleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => toggleZoom(e.clientX, e.clientY),
    [toggleZoom],
  );

  return {
    containerRef,
    contentRef,
    scale: state.scale,
    x: state.x,
    y: state.y,
    isZoomed: state.scale > 1,
    reset: center,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onPointerLeave: endPointer,
      onDoubleClick,
    },
  };
}
