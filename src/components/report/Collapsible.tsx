import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

type CollapsibleProps = {
  title?: string;
  open?: boolean;
  children: ReactNode;
};

export function Collapsible({
  title = "Voir plus d'informations",
  open = false,
  children,
}: CollapsibleProps) {
  return (
    <details className="collapsible" open={open}>
      <summary className="collapsible-summary">
        <span className="collapsible-chevron" aria-hidden="true">
          <ChevronRight size={18} strokeWidth={2.25} />
        </span>
        <span>{title}</span>
      </summary>

      <div className="collapsible-content">{children}</div>
    </details>
  );
}
