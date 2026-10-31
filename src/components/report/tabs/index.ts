import { Tabs as TabsContainer } from "./Tabs";
import { TabItem } from "./TabItem";

export const Tabs = Object.assign(TabsContainer, {
  Item: TabItem,
});

export type { TabsProps, TabItemProps } from "./types";
