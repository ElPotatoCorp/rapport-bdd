import type { ReactNode } from 'react';
import { Tooltip, type TooltipProps } from './Tooltip';

export interface TermProps extends Omit<TooltipProps, 'content' | 'className'> {
  tooltip: ReactNode;
}

export function Term({ tooltip, ...rest }: TermProps) {
  return (
    <Tooltip
      content={tooltip}
      className="underline decoration-dotted decoration-primary decoration-3 underline-offset-4 cursor-help"
      {...rest}
    />
  );
}
