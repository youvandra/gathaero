import { Button, Card, CardHeader, LineChart, Sparkline } from "cordon-ui";
import { useNavigate } from "react-router-dom";

import { HeroSearch } from "../../features/dashboard/HeroSearch";
import { MarketTable } from "../../features/dashboard/MarketTable";
import { StatTile } from "../../features/dashboard/StatTile";
import {
  MOCK_MARKETS,
  MOCK_TOTALS,
  MOCK_VOLUME_SERIES,
} from "../../features/dashboard/mockMarkets";

function CardTitle({ children }: { children: string }) {
  return (
    <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>
      {children}
    </h2>
  );
}

const STATS = [
  {
    label: "Flights live",
    value: MOCK_TOTALS.flightsLive.toLocaleString(),
    delta: "+38 today",
    up: true,
    history: [980, 1040, 1010, 1120, 1090, 1180, 1210, 1248],
  },
  {
    label: "Avg delay rate",
    value: `${(MOCK_TOTALS.avgDelayRate * 100).toFixed(1)}%`,
    history: [5.1, 5.4, 5.2, 5.8, 5.6, 6.0, 6.1, 6.2],
  },
  {
    label: "Protected",
    value: `$${Math.round(MOCK_TOTALS.protectedUsdc / 1000)}k`,
    delta: "+$12k today",
    up: true,
  },
  {
    label: "Open interest",
    value: `$${Math.round(MOCK_TOTALS.openInterest / 1000)}k`,
    delta: "+8.4%",
    up: true,
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const openMarket = () => navigate("/app/market");

  const movers = [...MOCK_MARKETS]
    .sort(
      (a, b) =>
        Math.abs(b.history[b.history.length - 1] - b.history[0]) -
        Math.abs(a.history[a.history.length - 1] - a.history[0]),
    )
    .slice(0, 4);

  return (
    <>
      <HeroSearch onSearch={openMarket} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Live markets</CardTitle>
              <Button variant="ghost" size="sm" iconEnd="arrow-right" onClick={openMarket}>
                All
              </Button>
            </div>
          </CardHeader>
          <MarketTable rows={MOCK_MARKETS} onSelect={openMarket} />
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Platform volume</CardTitle>
            </CardHeader>
            <div className="px-5 pb-5">
              <LineChart
                series={[{ id: "vol", values: MOCK_VOLUME_SERIES, glaze: "rose" }]}
                height={150}
                format={(value) => `$${value}k`}
                label="24h volume"
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top movers</CardTitle>
            </CardHeader>
            {movers.map((market) => (
              <button
                key={market.code}
                type="button"
                onClick={openMarket}
                className="flex items-center justify-between border-b px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-black/[0.03]"
                style={{ borderColor: "var(--cordon-hairline-soft)" }}
              >
                <span className="flex flex-col">
                  <span style={{ fontWeight: 600, color: "var(--cordon-ink)" }}>
                    {market.code}
                  </span>
                  <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-micro)" }}>
                    {market.route}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <Sparkline values={market.history} width={64} height={20} />
                  <span
                    style={{
                      color: "var(--cordon-ink)",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 500,
                    }}
                  >
                    {(market.delayProbability * 100).toFixed(1)}%
                  </span>
                </span>
              </button>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
