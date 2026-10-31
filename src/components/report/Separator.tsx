export type SeparatorProps = {
  label?: string;
};

export function Separator({ label }: SeparatorProps) {
  if (!label) {
    return <hr className="separator" />;
  }

  return (
    <div className="separator-labeled" role="separator">
      <span className="separator-line" />
      <span className="separator-label">{label}</span>
      <span className="separator-line" />
    </div>
  );
}
