import { Sparkline, Tag } from "cordon-ui";
import type { TagTone } from "cordon-ui";

import type { MarketStatus, MarketSummary } from "./mockMarkets";

const STATUS_TONE: Record<MarketStatus, TagTone> = {
  open: "neutral",
  delayed: "critical",
  resolved: "positive",
};

export function MarketRow({
  market,
  onSelect,
}: {
  market: MarketSummary;
  onSelect?: (code: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(market.code)}
      className="grid w-full items-center gap-4 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-black/[0.03]"
      style={{ borderColor: "var(--cordon-hairline-soft)", gridTemplateColumns: "1fr auto auto" }}
    >
      <span className="flex flex-col">
        <span style={{ color: "var(--cordon-ink)", fontWeight: 600 }}>{market.code}</span>
        <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-caption)" }}>
          {market.route} · {market.date}
        </span>
      </span>

      <Sparkline values={market.history} width={84} height={26} />

      <span className="flex items-center gap-3">
        <span
          style={{
            color: "var(--cordon-ink)",
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {(market.probability * 100).toFixed(1)}%
        </span>
        <Tag tone={STATUS_TONE[market.status]} size="sm">
          {market.status}
        </Tag>
      </span>
    </button>
  );
}
