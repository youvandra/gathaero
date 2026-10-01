import { Button, Card, CardHeader } from "cordon-ui";
import { useNavigate } from "react-router-dom";

import { HeroSearch } from "../../features/dashboard/HeroSearch";
import { MarketRow } from "../../features/dashboard/MarketRow";
import { StatTile } from "../../features/dashboard/StatTile";
import { MOCK_MARKETS, MOCK_TOTALS } from "../../features/dashboard/mockMarkets";

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
    label: "24h volume",
    value: `$${(MOCK_TOTALS.volume24h / 1000).toFixed(1)}k`,
    delta: "+8.4%",
    up: true,
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const openMarket = () => navigate("/app/market");

  return (
    <>
      <HeroSearch onSearch={openMarket} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live markets</CardTitle>
            <Button variant="ghost" size="sm" iconEnd="arrow-right" onClick={openMarket}>
              View all
            </Button>
          </div>
        </CardHeader>
        {MOCK_MARKETS.map((market) => (
          <MarketRow key={market.code} market={market} onSelect={openMarket} />
        ))}
      </Card>
    </>
  );
}
