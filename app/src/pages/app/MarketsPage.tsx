import { Card, CardHeader, SearchField } from "cordon-ui";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { MarketTable } from "../../features/dashboard/MarketTable";
import { MOCK_MARKETS } from "../../features/dashboard/mockMarkets";

export function MarketsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const rows = MOCK_MARKETS.filter((market) =>
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
        onSelect={(market) => navigate(`/app/market/${market.code}`)}
      />
    </Card>
  );
}
