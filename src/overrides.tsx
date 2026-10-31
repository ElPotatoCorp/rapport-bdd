import { Children, type ComponentProps, type ReactElement } from "react";
import { Code } from "./components/code";
import { Mermaid, Separator, type SeparatorProps } from "./components/report";
import { Callout, type CalloutProps } from "./components/report/Callout";

// MDX compiles a ```mermaid fence to <pre><code className="language-mermaid">...
// Intercepting `pre` lets every report.mdx just write plain ```mermaid blocks,
// no manual <Mermaid chart="..."> needed.

function Pre({ children, ...meta }: ComponentProps<"pre">) {
  const child = Children.only(children) as ReactElement<{
    className?: string;
    children?: string;
  }>;
  const lang = /language-(\S+)/.exec(child.props.className ?? "")?.[1];
  return (
    <Code type="bloc" lang={lang} {...meta}>
      {(child.props.children ?? "").trimEnd()}
    </Code>
  );
}

function PreOrMermaid({
  children,
  ...props
}: {
  children?: ReactElement<{ className?: string; children?: string }>;
}) {
  const isMermaid = children?.props?.className?.includes("language-mermaid");
  if (isMermaid)
    return <Mermaid chart={String(children?.props?.children ?? "")} />;
  return <Pre {...props}>{children}</Pre>;
}

export const mdxComponents = {
  pre: PreOrMermaid,
  code: (props: any) => <Code type="inline" {...props} />,
  hr: () => <Separator />,
  separator: (props: SeparatorProps) => <Separator {...props} />,
  callout: (props: CalloutProps) => <Callout {...props} />,
};
