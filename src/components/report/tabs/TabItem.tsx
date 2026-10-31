import type { TabItemProps } from "./types";

export function TabItem({ children }: TabItemProps) {
  // Tab.Item serves as a declarative wrapper for the panel content.
  // Its props are extracted at the parent <Tabs> level.
  return <>{children}</>;
}
