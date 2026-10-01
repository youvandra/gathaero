import { Surface } from "cordon-ui";

export function ProbabilityPanel({ probability }: { probability: number }) {
  const onTime = 1 - probability;

  const readout = (
    <span className="flex items-baseline gap-1" style={{ color: "var(--cordon-on-glaze)" }}>
      <span
        style={{
          fontSize: "clamp(2.5rem, 12cqw, 3.75rem)",
          fontWeight: 700,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {(probability * 100).toFixed(1)}
      </span>
      <span style={{ fontSize: "1.25rem", fontWeight: 600 }}>%</span>
    </span>
  );

  return (
    <Surface glaze="ember" radius="5" elevation="tile" className="flex flex-col items-center gap-5 p-6">
      <div className="flex flex-col items-center gap-1" style={{ containerType: "inline-size" }}>
        {readout}
        <span
          style={{
            color: "var(--cordon-on-glaze-dim)",
            fontSize: "var(--cordon-size-micro)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Chance of delay
        </span>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        <div
          className="flex flex-col gap-1 rounded-[var(--cordon-radius-3)] p-3"
          style={{ background: "rgba(255,255,255,0.14)" }}
        >
          <span
            style={{
              color: "var(--cordon-on-glaze-dim)",
              fontSize: "var(--cordon-size-micro)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            On-time
          </span>
          <span style={{ color: "var(--cordon-on-glaze)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {(onTime * 100).toFixed(1)}%
          </span>
        </div>
        <div
          className="flex flex-col gap-1 rounded-[var(--cordon-radius-3)] p-3"
          style={{ background: "rgba(255,255,255,0.14)" }}
        >
          <span
            style={{
              color: "var(--cordon-on-glaze-dim)",
              fontSize: "var(--cordon-size-micro)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Delayed
          </span>
          <span style={{ color: "var(--cordon-on-glaze)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {(probability * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </Surface>
  );
}
