import { Button, Card, CardHeader, LineChart, Sparkline } from "cordon-ui";
import { useNavigate } from "react-router-dom";

import { ListSkeleton } from "../../components/feedback/Skeletons";
import { HeroSearch } from "../../features/dashboard/HeroSearch";
import { MarketTable } from "../../features/dashboard/MarketTable";
import { StatTile } from "../../features/dashboard/StatTile";
import { isLive } from "../../features/market/model";
import { useFlights } from "../../features/market/useFlights";
import { useMarketTrends } from "../../features/market/useMarketTrends";
import { formatNumber, formatUsd, usd } from "../../lib/format";
import { usePortfolio } from "../../features/market/usePortfolio";
import { usePageTitle } from "../../lib/hooks/usePageTitle";

function CardTitle({ children }: { children: string }) {
  return (
    <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>{children}</h2>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const openDetail = (code: string, id?: string) =>
    navigate(id ? `/app/market/${code}?id=${id}` : `/app/market/${code}`);

  usePageTitle("Home");
  const { flights, isLoading, error, refetch } = useFlights();
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

  const portfolio = usePortfolio();
  const stats = [
    {
      label: "Wallet balance",
      value: portfolio.balance === undefined ? "—" : usd(portfolio.balance),
      delta: "USDG",
      up: true,
    },
    {
      label: "Open positions",
      value: formatUsd(portfolio.openValue),
      delta: `${portfolio.openCount} open`,
      up: true,
    },
    {
      label: "Protected",
      value: formatUsd(portfolio.protectedPayout),
      delta: "pays if delayed",
      up: true,
    },
    {
      label: "Paying out",
      value: formatUsd(portfolio.claimableValue),
      delta: `${portfolio.claimableCount} on the way`,
      up: portfolio.claimableCount > 0,
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
          <StatTile key={stat.label} {...stat} loading={portfolio.isLoading} />
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
            loading={isLoading}
            error={Boolean(error)}
            onRetry={refetch}
            empty="No flights open right now. New flights are listed ahead of departure."
            pageSize={6}
            onSelect={(market) => openDetail(market.code, market.id)}
          />
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Platform</CardTitle>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "var(--cordon-copy-dim)",
                  fontSize: "var(--cordon-size-caption)",
                }}
              >
                {isLoading
                  ? "Loading platform numbers…"
                  : `${live.length} live · ${(avgDelay * 100).toFixed(1)}% avg delay odds · ${usd(openInterest, 0)} locked · ${usd(volume, 0)} volume · ${formatNumber(trades.length)} trades`}
              </p>
            </CardHeader>
            <div className="px-5 pb-5">
              <LineChart
                series={[{ id: "vol", values: volumeSeries, glaze: "rose" }]}
                height={150}
                format={(value) => formatUsd(value, 0)}
                label="Cumulative volume"
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top movers</CardTitle>
            </CardHeader>
            {isLoading ? <ListSkeleton /> : null}
            {!isLoading && movers.length === 0 ? (
              <p
                className="px-5 pb-5"
                style={{
                  margin: 0,
                  color: "var(--cordon-copy-dim)",
                  fontSize: "var(--cordon-size-caption)",
                }}
              >
                Odds start moving once people trade.
              </p>
            ) : null}
            {movers.map((market) => (
              <button
                key={market.id}
                type="button"
                onClick={() => openDetail(market.code, market.id)}
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
