export function ProbabilityPanel({ probability }: { probability: number }) {
  const onTime = 1 - probability;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span
            style={{
              color: "var(--cordon-copy-dim)",
              fontSize: "var(--cordon-size-micro)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            On-time
          </span>
          <span
            style={{
              color: "var(--cordon-ink)",
              fontSize: "var(--cordon-size-display)",
              fontWeight: 700,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {(onTime * 100).toFixed(1)}
            <span style={{ fontSize: "0.5em", fontWeight: 600 }}>%</span>
          </span>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span
            style={{
              color: "var(--cordon-copy-dim)",
              fontSize: "var(--cordon-size-micro)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Delayed
          </span>
          <span
            style={{
              color: "var(--cordon-critical)",
              fontSize: "var(--cordon-size-display)",
              fontWeight: 700,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {(probability * 100).toFixed(1)}
            <span style={{ fontSize: "0.5em", fontWeight: 600 }}>%</span>
          </span>
        </div>
      </div>

      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(34,34,34,0.08)" }}
      >
        <div style={{ width: `${onTime * 100}%`, background: "var(--cordon-positive)" }} />
        <div style={{ width: `${probability * 100}%`, background: "var(--cordon-critical)" }} />
      </div>

      <p
        style={{
          margin: 0,
          color: "var(--cordon-copy-dim)",
          fontSize: "var(--cordon-size-caption)",
        }}
      >
        Implied by the market. Buy protection against the delayed side.
      </p>
    </div>
  );
}
