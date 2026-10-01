import { DotText, Gauge, Surface } from "cordon-ui";

export function ProbabilityPanel({ probability }: { probability: number }) {
  const onTime = 1 - probability;

  return (
    <Surface
      glaze="ember"
      radius="5"
      elevation="tile"
      className="flex flex-col items-center gap-5 p-6"
    >
      <Gauge value={probability} size="min(300px, 100%)" footnote="Chance of delay">
        <span
          className="inline-flex items-baseline gap-1"
          style={{ color: "var(--cordon-on-glaze)" }}
        >
          <DotText radius={2.4}>{(probability * 100).toFixed(1)}</DotText>
          <span style={{ fontSize: "0.5em", fontWeight: 600 }}>%</span>
        </span>
      </Gauge>

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
          <span
            style={{
              color: "var(--cordon-on-glaze)",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
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
          <span
            style={{
              color: "var(--cordon-on-glaze)",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {(probability * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </Surface>
  );
}
