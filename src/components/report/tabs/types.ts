import type { ReactNode } from "react";

export type TabItemProps = {
  label: ReactNode;
  children: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  children: ReactNode;
  defaultActive?: number;
  className?: string;
};
