import { Card, CardHeader, SearchField } from "cordon-ui";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MarketTable } from "../../features/dashboard/MarketTable";
import { useFlights } from "../../features/market/useFlights";
import { useMarketTrends } from "../../features/market/useMarketTrends";
import { usePageTitle } from "../../lib/hooks/usePageTitle";

export function MarketsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  usePageTitle("Markets");
  const { flights, isLoading, error, refetch } = useFlights();
  const { trendOf } = useMarketTrends(flights);

  const rows = flights.filter((market) =>
    `${market.code} ${market.route}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>
            Markets
          </h2>
          <div className="w-full sm:w-72">
            <SearchField
              placeholder="Search flight or route"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <MarketTable
        rows={rows}
        trendOf={trendOf}
        loading={isLoading}
        error={Boolean(error)}
        onRetry={refetch}
        empty={query ? `No flight matches "${query.trim()}"` : undefined}
        onSelect={(market) => navigate(`/app/market/${market.code}`)}
      />
    </Card>
  );
}
