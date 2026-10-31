import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

import type { TocEntry } from '../../utils/mdx-plugins/remark-heading-numbers';

type TocEntryWithChildren = TocEntry & {
  children: TocEntryWithChildren[];
};

type TableOfContentProps = {
  title?: string;
  items: TocEntry[];
};

function buildTocTree(items: TocEntry[]): TocEntryWithChildren[] {
  const root: TocEntryWithChildren[] = [];
  const stack: TocEntryWithChildren[] = [];

  for (const item of items) {
    const entry: TocEntryWithChildren = {
      ...item,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= entry.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(entry);
    } else {
      stack[stack.length - 1].children.push(entry);
    }

    stack.push(entry);
  }

  return root;
}

type TocItemProps = {
  item: TocEntryWithChildren;
  expandedItems: Set<string>;
  toggleItem: (id: string) => void;
};

function TocItem({ item, expandedItems, toggleItem }: TocItemProps) {
  const hasChildren = item.children.length > 0;

  // Les niveaux 1 à 5 peuvent être développés.
  const canExpand = item.depth >= 1 && item.depth <= 5 && hasChildren;

  // Les h1 sont toujours ouverts afin que les h2 soient visibles.
  const isExpanded = item.depth === 1 || expandedItems.has(item.id);

  return (
    <li className={`toc__item lvl${item.depth}`}>
      <div className="toc__row">
        {canExpand ? (
          <button
            type="button"
            className={`toc__toggle ${isExpanded ? 'is-expanded' : ''}`}
            onClick={() => toggleItem(item.id)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Réduire ${item.text}` : `Développer ${item.text}`}
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        ) : (
          <span className="toc__toggle-placeholder" aria-hidden="true" />
        )}

        <a href={`#${item.id}`} className="toc__link">
          <span className="toc__number">{item.number}</span>
          <span>{item.text}</span>
        </a>
      </div>

      {hasChildren && isExpanded && (
        <ul className="toc__children">
          {item.children.map((child) => (
            <TocItem
              key={child.id}
              item={child}
              expandedItems={expandedItems}
              toggleItem={toggleItem}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TableOfContent({ title = 'Sommaire', items }: TableOfContentProps) {
  const tree = buildTocTree(items);

  // Les h1 sont ouverts, mais les h2 sont fermés par défaut.
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  function toggleItem(id: string) {
    setExpandedItems((currentItems) => {
      const nextItems = new Set(currentItems);

      if (nextItems.has(id)) {
        nextItems.delete(id);
      } else {
        nextItems.add(id);
      }

      return nextItems;
    });
  }

  return (
    <>
      <h1>{title}</h1>

      <nav className="toc" aria-label="Table des matières">
        <ul className="toc__list">
          {tree.map((item) => (
            <TocItem
              key={item.id}
              item={item}
              expandedItems={expandedItems}
              toggleItem={toggleItem}
            />
          ))}
        </ul>
      </nav>
    </>
  );
}
