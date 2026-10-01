import { Button, Card, CardBody, CardHeader, DataTable, LineChart, TextField } from "cordon-ui";
import type { Column } from "cordon-ui";
import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

import { StatTile } from "../../features/dashboard/StatTile";
import {
  DEFAULT_FLIGHT,
  flightIdOf,
  useAddLiquidity,
  useMarketAddress,
  useMarketState,
} from "../../features/market/useFlightMarket";

type Pool = {
  route: string;
  tvl: number;
  apy: number;
  utilisation: number;
  exposure: number;
};

const POOLS: Pool[] = [
  { route: "SIN → CGK", tvl: 24_800, apy: 14.0, utilisation: 0.42, exposure: 12_400 },
  { route: "SIN → KUL", tvl: 16_300, apy: 11.5, utilisation: 0.36, exposure: 6_100 },
  { route: "SIN → DPS", tvl: 9_100, apy: 16.8, utilisation: 0.55, exposure: 4_300 },
];

const COLUMNS: Column<Pool>[] = [
  { id: "route", header: "Route", sortBy: (row) => row.route, cell: (row) => <strong style={{ color: "var(--cordon-ink)" }}>{row.route}</strong> },
  { id: "tvl", header: "TVL", numeric: true, sortBy: (row) => row.tvl, cell: (row) => `$${row.tvl.toLocaleString()}` },
  {
    id: "apy",
    header: "APY",
    numeric: true,
    sortBy: (row) => row.apy,
    cell: (row) => <span style={{ color: "var(--cordon-positive)" }}>{row.apy.toFixed(1)}%</span>,
  },
  {
    id: "utilisation",
    header: "Utilisation",
    numeric: true,
    sortBy: (row) => row.utilisation,
    cell: (row) => `${(row.utilisation * 100).toFixed(0)}%`,
  },
  { id: "exposure", header: "Exposure", numeric: true, sortBy: (row) => row.exposure, cell: (row) => `$${row.exposure.toLocaleString()}` },
  { id: "action", header: "", align: "end", cell: () => <Button variant="secondary" size="sm">Add</Button> },
];

function CardTitle({ children }: { children: string }) {
  return (
    <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>
      {children}
    </h2>
  );
}

export function VaultPage() {
  const [amount, setAmount] = useState("");
  const { isConnected } = useAccount();

  const flightId = flightIdOf(DEFAULT_FLIGHT.number, DEFAULT_FLIGHT.date);
  const market = useMarketAddress(flightId);
  const state = useMarketState(market);
  const { addLiquidity, isPending } = useAddLiquidity(market);

  const tvl = state.reserves ? Number(state.reserves[0] + state.reserves[1]) / 1e6 : 24_800;
  const exposure = state.reserves ? Number(state.reserves[1]) / 1e6 : 12_400;

  const handleDeposit = () => {
    const parsed = parseUnits(amount || "0", 6);
    if (parsed > 0n) {
      void addLiquidity(parsed);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="TVL" value={`$${tvl.toLocaleString()}`} delta="+4.2% 7d" up history={[18, 19.5, 21, 20.4, 22.8, 23.6, 24.1, 24.8]} />
        <StatTile label="Net APY" value="14.0%" delta="premium yield" up />
        <StatTile label="Exposure" value={`$${exposure.toLocaleString()}`} delta="at risk" up={false} />
        <StatTile label="Routes" value="3" delta="live pools" up />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Total value locked · 30d</CardTitle>
          </CardHeader>
          <div className="px-5 pb-5">
            <LineChart
              series={[
                {
                  id: "tvl",
                  values: [12, 13.5, 15, 14.2, 16.8, 18.4, 19.1, 20.6, 22.4, 23.1, 24.0, 24.8],
                  glaze: "rose",
                },
              ]}
              height={190}
              format={(value) => `$${value}k`}
              label="TVL"
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add liquidity</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-3">
              <p style={{ margin: 0, color: "var(--cordon-copy)" }}>
                Adding liquidity is how you underwrite the route — it is the same as
                depositing into the pool. You earn the premium when flights land on time, and
                can withdraw between flights.
              </p>
              <TextField
                inputMode="decimal"
                prefix="USDC"
                placeholder="Amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <Button
                variant="primary"
                block
                disabled={!isConnected || !market || isPending}
                onClick={handleDeposit}
              >
                {isPending ? "Adding…" : "Add liquidity"}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Route pools</CardTitle>
        </CardHeader>
        <DataTable columns={COLUMNS} rows={POOLS} rowKey={(row) => row.route} density="default" stickyHeader={false} />
      </Card>
    </>
  );
}
