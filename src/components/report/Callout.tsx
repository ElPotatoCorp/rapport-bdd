import {
  InfoIcon,
  Lightbulb,
  MessageCircleWarning,
  SquareExclamationPoint,
  StickyNote,
  TriangleAlert,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

type CalloutType =
  "info" | "tip" | "note" | "warning" | "caution" | "important";

export type CalloutProps = {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
};

type CalloutConfig = {
  title: string;
  Icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
    "aria-hidden"?: boolean;
  }>;
};

const CALLOUT_CONFIG: Record<CalloutType, CalloutConfig> = {
  info: {
    title: "Info",
    Icon: InfoIcon,
  },
  tip: {
    title: "Tip",
    Icon: Lightbulb,
  },
  note: {
    title: "Note",
    Icon: StickyNote,
  },
  warning: {
    title: "Warning",
    Icon: TriangleAlert,
  },
  caution: {
    title: "Caution",
    Icon: SquareExclamationPoint,
  },
  important: {
    title: "Important",
    Icon: MessageCircleWarning,
  },
};

export function Callout({ type = "note", title, children }: CalloutProps) {
  const { title: defaultTitle, Icon } = CALLOUT_CONFIG[type];
  const isAlert = type === "warning" || type === "caution";

  return (
    <aside
      className={`callout callout-${type}`}
      role={isAlert ? "alert" : undefined}
    >
      <div className="callout-heading">
        <Icon size={22} strokeWidth={2.25} aria-hidden />

        <div className="callout-title">{title ?? defaultTitle}</div>
      </div>

      <div className="callout-body">{children}</div>
    </aside>
  );
}
