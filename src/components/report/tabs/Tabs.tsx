import React, { useId, useRef, useState, type KeyboardEvent } from "react";
import { TabItem } from "./TabItem";
import type { TabItemProps, TabsProps } from "./types";

export function Tabs({
  children,
  defaultActive = 0,
  className = "",
}: TabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultActive);
  const tabsId = useId();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Extract and validate direct child Tab.Item props
  const tabItems: TabItemProps[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      const childType = child.type as any;
      if (childType === TabItem || childType?.name === "TabItem") {
        tabItems.push(child.props as TabItemProps);
      } else {
        console.warn(
          "Tabs component only accepts <Tab.Item> as direct children.",
        );
      }
    }
  });

  const getNextEnabledIndex = (index: number, direction: 1 | -1): number => {
    let nextIndex = index;
    for (let i = 0; i < tabItems.length; i++) {
      nextIndex = (nextIndex + direction + tabItems.length) % tabItems.length;
      if (!tabItems[nextIndex].disabled) {
        return nextIndex;
      }
    }
    return index;
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = getNextEnabledIndex(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = getNextEnabledIndex(index, -1);
        break;
      case "Home":
        nextIndex = tabItems.findIndex((tab) => !tab.disabled);
        break;
      case "End":
        nextIndex = [...tabItems]
          .map((tab, tabIndex) => ({ tab, tabIndex }))
          .reverse()
          .find(({ tab }) => !tab.disabled)?.tabIndex;
        break;
      default:
        return;
    }

    event.preventDefault();

    if (nextIndex !== undefined && nextIndex !== -1) {
      setActiveIndex(nextIndex);
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  if (tabItems.length === 0) {
    return null;
  }

  const activeTab = tabItems[activeIndex] ?? tabItems[0];
  const activeTabId = `${tabsId}-tab-${activeIndex}`;
  const activePanelId = `${tabsId}-panel-${activeIndex}`;

  return (
    <div className={`tabs ${className}`}>
      {/* Tab Triggers Header */}
      <div className="tabs-list" role="tablist" aria-label="Content sections">
        {tabItems.map((tab, index) => {
          const tabId = `${tabsId}-tab-${index}`;
          const panelId = `${tabsId}-panel-${index}`;
          const isActive = index === activeIndex;

          return (
            <button
              key={tabId}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              id={tabId}
              type="button"
              role="tab"
              className={`tabs-trigger ${isActive ? "active" : ""}`}
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Panel */}
      <div
        id={activePanelId}
        className="tabs-panel"
        role="tabpanel"
        aria-labelledby={activeTabId}
        tabIndex={0}
      >
        {activeTab.children}
      </div>
    </div>
  );
}
