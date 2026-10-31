declare module '*.mdx' {
  import type { ComponentType } from 'react';
  import type { TocEntry } from '../mdx-plugins/remark-heading-numbers';

  export const toc: TocEntry[];

  const MDXComponent: ComponentType<Record<string, unknown>>;
  export default MDXComponent;
}
