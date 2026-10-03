import { Button, Card, CardHeader, LineChart, Sparkline } from "cordon-ui";
import { useNavigate } from "react-router-dom";

import { HeroSearch } from "../../features/dashboard/HeroSearch";
import { MarketTable } from "../../features/dashboard/MarketTable";
import { StatTile } from "../../features/dashboard/StatTile";
import { isLive } from "../../features/market/model";
import { useFlights } from "../../features/market/useFlights";
import { useMarketTrends } from "../../features/market/useMarketTrends";
import { formatUsdc } from "../../lib/format";

function CardTitle({ children }: { children: string }) {
  return (
    <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>{children}</h2>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const openDetail = (code: string) => navigate(`/app/market/${code}`);

  const { flights } = useFlights();
  const { trades, trendOf, volumeSeries } = useMarketTrends(flights);

  const live = flights.filter(isLive);
  const avgDelay =
    live.length > 0 ? live.reduce((sum, f) => sum + f.delayProbability, 0) / live.length : 0;
  const openInterest = flights.reduce((sum, f) => sum + f.openInterest, 0n);
  const volume = flights.reduce((sum, f) => sum + f.volume, 0n);

  const movement = (code: string) => {
    const flight = flights.find((f) => f.code === code);
    if (!flight) return 0;
    const series = trendOf(flight);
    return Math.abs(series[series.length - 1] - series[0]);
  };
  const movers = [...live].sort((a, b) => movement(b.code) - movement(a.code)).slice(0, 4);

  const stats = [
    {
      label: "Flights live",
      value: live.length.toString(),
      delta: `${flights.length} listed`,
      up: true,
    },
    { label: "Avg delay odds", value: `${(avgDelay * 100).toFixed(1)}%` },
    {
      label: "Open interest",
      value: `$${formatUsdc(openInterest, 0)}`,
      delta: "USDG locked",
      up: true,
    },
    {
      label: "Volume",
      value: `$${formatUsdc(volume, 0)}`,
      delta: `${trades.length} trades`,
      up: true,
    },
  ];

  return (
    <>
      <HeroSearch
        popular={live.slice(0, 4).map((flight) => flight.code)}
        onSearch={(code) => openDetail(code)}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Live markets</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                iconEnd="arrow-right"
                onClick={() => navigate("/app/market")}
              >
                All markets
              </Button>
            </div>
          </CardHeader>
          <MarketTable
            rows={live}
            trendOf={trendOf}
            onSelect={(market) => openDetail(market.code)}
          />
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Platform volume</CardTitle>
            </CardHeader>
            <div className="px-5 pb-5">
              <LineChart
                series={[{ id: "vol", values: volumeSeries, glaze: "rose" }]}
                height={150}
                format={(value) => `$${Math.round(value).toLocaleString()}`}
                label="Cumulative volume"
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top movers</CardTitle>
            </CardHeader>
            {movers.map((market) => (
              <button
                key={market.id}
                type="button"
                onClick={() => openDetail(market.code)}
                className="flex items-center justify-between border-b px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-black/[0.03]"
                style={{ borderColor: "var(--cordon-hairline-soft)" }}
              >
                <span className="flex flex-col">
                  <span style={{ fontWeight: 600, color: "var(--cordon-ink)" }}>{market.code}</span>
                  <span
                    style={{
                      color: "var(--cordon-copy-dim)",
                      fontSize: "var(--cordon-size-micro)",
                    }}
                  >
                    {market.route}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <Sparkline values={trendOf(market)} width={64} height={20} />
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
