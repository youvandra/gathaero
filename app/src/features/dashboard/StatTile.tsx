import { Sparkline } from "cordon-ui";

type StatTileProps = {
  label: string;
  value: string;
  delta?: string;
  up?: boolean;
  history?: number[];
};

export function StatTile({ label, value, delta, up = true, history }: StatTileProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[var(--cordon-radius-4)] border p-4"
      style={{
        borderColor: "var(--cordon-hairline)",
        background: "var(--cordon-paper-raised)",
      }}
    >
      <span
        style={{
          color: "var(--cordon-copy-dim)",
          fontSize: "var(--cordon-size-micro)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--cordon-ink)",
          fontSize: "var(--cordon-size-metric)",
          fontWeight: 600,
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      {history ? <Sparkline values={history} height={26} area /> : null}
      {delta ? (
        <span
          style={{
            color: up ? "var(--cordon-positive)" : "var(--cordon-critical)",
            fontSize: "var(--cordon-size-caption)",
          }}
        >
          {delta}
        </span>
      ) : null}
    </div>
  );
}
