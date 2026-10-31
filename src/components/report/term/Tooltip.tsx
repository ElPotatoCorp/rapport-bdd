import {
  autoUpdate,
  flip,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  offset,
  safePolygon,
  shift,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingTree,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  type OpenChangeReason,
} from '@floating-ui/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';

const DEFAULT_OPEN_DELAY_MS = 300;
const DEFAULT_CLOSE_DELAY_MS = 100;
const TRIGGER_GAP_PX = 8;
const VIEWPORT_PADDING_PX = 8;
const PRIMARY_MOUSE_BUTTON = 0;
const MIDDLE_MOUSE_BUTTON = 1;

/** Lets a nested tooltip pin the tooltip that contains it. */
const PinParentContext = createContext<(() => void) | null>(null);

export interface TooltipProps {
  /** Anything renderable, including other tooltips. */
  content: ReactNode;
  /** The trigger's content. Wrapped in a focusable inline element. */
  children: ReactNode;
  /** Class applied to the trigger element. */
  className?: string;
  /** Delay before showing on hover, in ms. Focus opens immediately. */
  openDelay?: number;
  /** Grace period before hiding once the pointer leaves, in ms. */
  closeDelay?: number;
}

/**
 * Hover/focus tooltip. Middle-click pins it open; a pinned tooltip only closes
 * on an outside press (or Escape). Opening a nested tooltip pins its parent.
 */
export function Tooltip(props: TooltipProps) {
  const parentId = useFloatingParentNodeId();

  // Only the outermost tooltip creates a tree; nested ones join it so that
  // hover-safety and dismissal treat the whole chain as one unit.
  if (parentId === null) {
    return (
      <FloatingTree>
        <TooltipNode {...props} />
      </FloatingTree>
    );
  }
  return <TooltipNode {...props} />;
}

function TooltipNode({
  content,
  children,
  className,
  openDelay = DEFAULT_OPEN_DELAY_MS,
  closeDelay = DEFAULT_CLOSE_DELAY_MS,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  const nodeId = useFloatingNodeId();
  const tree = useFloatingTree();
  const pinParent = useContext(PinParentContext);
  const pin = useCallback(() => setPinned(true), []);

  // Children live inside our content, so they unmount (and close) with us.
  useEffect(() => {
    if (open) pinParent?.();
  }, [open, pinParent]);

  const handleOpenChange = (next: boolean, _event?: Event, reason?: OpenChangeReason) => {
    // Pinned tooltips ignore hover-leave and blur.
    const isExplicitDismiss = reason === 'outside-press' || reason === 'escape-key';
    if (!next && pinned && !isExplicitDismiss) return;

    if (!next) setPinned(false);
    setOpen(next);
  };

  const { refs, floatingStyles, context } = useFloating({
    nodeId,
    open,
    onOpenChange: handleOpenChange,
    placement: 'top',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(TRIGGER_GAP_PX),
      flip({ padding: VIEWPORT_PADDING_PX }),
      shift({ padding: VIEWPORT_PADDING_PX }),
    ],
  });

  // A press on any trigger or tooltip of this tree is not "outside".
  const isInsideTree = (target: Node) =>
    tree?.nodesRef.current.some(
      ({ context: nodeContext }) =>
        nodeContext?.elements.floating?.contains(target) ||
        nodeContext?.elements.domReference?.contains(target),
    ) ?? false;

  const { getReferenceProps, getFloatingProps } = useInteractions([
    // safePolygon keeps the tooltip open while the pointer travels to it,
    // which makes the content hoverable (WCAG 1.4.13).
    useHover(context, {
      move: false,
      delay: { open: openDelay, close: closeDelay },
      handleClose: safePolygon(),
    }),
    useFocus(context),
    useDismiss(context, {
      // Primary button only: a middle-click elsewhere must be able to pin
      // another tooltip without dismissing this one.
      outsidePress: (event) =>
        event.button === PRIMARY_MOUSE_BUTTON && !isInsideTree(event.target as Node),
    }),
    // Wires aria-describedby on the trigger to the floating element's id.
    useRole(context, { role: 'tooltip' }),
  ]);

  const pinHandlers = {
    // Stops the browser's middle-click autoscroll.
    onMouseDown: (event: MouseEvent) => {
      if (event.button !== MIDDLE_MOUSE_BUTTON) return;
      event.preventDefault();
      event.stopPropagation();
    },
    onAuxClick: (event: MouseEvent) => {
      if (event.button !== MIDDLE_MOUSE_BUTTON) return;
      // React events bubble through portals: don't also pin our ancestors.
      event.stopPropagation();
      setPinned(true);
      setOpen(true);
    },
  };

  return (
    <FloatingNode id={nodeId}>
      <span
        ref={refs.setReference}
        tabIndex={0}
        className={className}
        {...getReferenceProps(pinHandlers)}
      >
        {children}
      </span>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-500 box-border max-w-[min(20rem,calc(100vw-1rem))] rounded-md border-[3px] border-border bg-bg-surface px-3 py-2 text-sm leading-[1.4] text-text shadow-[0_4px_12px_rgb(0_0_0/0.25)] animate-[fade-in_120ms_ease-out] motion-reduce:animate-none data-pinned:border-border-strong"
            data-pinned={pinned || undefined}
            {...getFloatingProps(pinHandlers)}
          >
            <PinParentContext.Provider value={pin}>{content}</PinParentContext.Provider>
          </div>
        </FloatingPortal>
      )}
    </FloatingNode>
  );
}
