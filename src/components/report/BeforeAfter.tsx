import type { ReactNode } from "react";
import { Tabs } from "./tabs";

type Slot = string | ReactNode;

type BeforeAfterProps = {
  before: Slot;
  after: Slot;
  beforeLabel?: string;
  afterLabel?: string;
};

export function BeforeAfter({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
}: BeforeAfterProps) {
  return (
    <Tabs className="before-after">
      <Tabs.Item label={beforeLabel}>
        {<div className="before-after-content">{before}</div>}
      </Tabs.Item>
      <Tabs.Item label={afterLabel}>
        {<div className="before-after-content">{after}</div>}
      </Tabs.Item>
    </Tabs>
  );
}
