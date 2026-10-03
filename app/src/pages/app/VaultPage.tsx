import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  LineChart,
  Modal,
  TextField,
  useToast,
} from "cordon-ui";
import type { Column } from "cordon-ui";
import { useState } from "react";
import { useAccount } from "wagmi";

import { LoadError } from "../../components/feedback/LoadError";
import { TableSkeleton } from "../../components/feedback/Skeletons";
import { StatTile } from "../../features/dashboard/StatTile";
import { isLive, type FlightMarket } from "../../features/market/model";
import { useFlights } from "../../features/market/useFlights";
import { useMarketTrends } from "../../features/market/useMarketTrends";
import { usePositions } from "../../features/market/usePositions";
import { useCollateralBalance } from "../../features/market/useBalance";
import { STAGE_LABEL, useTransact } from "../../features/market/useTransact";
import { formatUsd, formatUsdc, parseAmount, usd } from "../../lib/format";
import { errorToast } from "../../lib/errors";
import { usePageTitle } from "../../lib/hooks/usePageTitle";

function CardTitle({ children }: { children: string }) {
  return (
    <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>{children}</h2>
  );
}

function buildColumns(onAdd: (row: FlightMarket) => void, canAdd: boolean): Column<FlightMarket>[] {
  return [
    {
      id: "flight",
      header: "Pool",
      sortBy: (row) => row.code,
      cell: (row) => (
        <span className="flex flex-col">
          <strong style={{ color: "var(--cordon-ink)" }}>{row.code}</strong>
          <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-micro)" }}>
            {row.route} · {row.date}
          </span>
        </span>
      ),
    },
    {
      id: "locked",
      header: "Locked",
      numeric: true,
      sortBy: (row) => Number(row.protection?.locked ?? 0n),
      cell: (row) => usd(row.protection?.locked ?? 0n, 0),
    },
    {
      id: "premium",
      header: "Premium",
      numeric: true,
      sortBy: (row) => row.delayProbability,
      cell: (row) => `${(row.delayProbability * 100).toFixed(1)}%`,
    },
    {
      id: "volume",
      header: "Volume",
      numeric: true,
      sortBy: (row) => Number(row.protection?.volume ?? 0n),
      cell: (row) => usd(row.protection?.volume ?? 0n, 0),
    },
    {
      id: "action",
      header: "",
      align: "end",
      cell: (row) => (
        <Button variant="secondary" size="sm" disabled={!canAdd} onClick={() => onAdd(row)}>
          Add
        </Button>
      ),
    },
  ];
}

export function VaultPage() {
  const { notify } = useToast();
  const { isConnected } = useAccount();
  usePageTitle("Vault");
  const { flights, isLoading, error, refetch } = useFlights();
  const { volumeSeries } = useMarketTrends(flights);
  const { positions, isLoading: positionsLoading } = usePositions();
  const { addLiquidity, pending, stage } = useTransact();
  const balance = useCollateralBalance();

  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState<FlightMarket | null>(null);

  const pools = flights.filter((flight) => isLive(flight) && flight.protection);
  const tvl = flights.reduce((sum, f) => sum + (f.protection?.locked ?? 0n), 0n);
  const volume = flights.reduce((sum, f) => sum + (f.protection?.volume ?? 0n), 0n);
  const myLiquidity = positions
    .filter((p) => p.side === "Liquidity")
    .reduce((sum, p) => sum + p.value, 0);

  const confirmAdd = async () => {
    if (!target?.protection) return;
    const parsed = parseAmount(amount);
    if (parsed <= 0n) {
      notify({ tone: "caution", title: "Enter an amount first" });
      return;
    }
    try {
      await addLiquidity(target.protection.address, parsed);
      notify({
        tone: "positive",
        title: "Liquidity added",
        children: `${amount} USDG on ${target.code} · ${target.route}`,
      });
      setTarget(null);
      setAmount("");
    } catch (error) {
      notify(errorToast(error));
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="TVL" value={usd(tvl, 0)} delta="protection pools" up loading={isLoading} />
        <StatTile label="Premium volume" value={usd(volume, 0)} up loading={isLoading} />
        <StatTile
          label="Your liquidity"
          value={formatUsd(myLiquidity)}
          loading={positionsLoading}
        />
        <StatTile label="Open pools" value={pools.length.toString()} loading={isLoading} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Cumulative volume</CardTitle>
          </CardHeader>
          <div className="px-5 pb-5">
            <LineChart
              series={[{ id: "vol", values: volumeSeries, glaze: "rose" }]}
              height={190}
              format={(value) => formatUsd(value, 0)}
              label="Volume"
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Underwrite a flight</CardTitle>
          </CardHeader>
          <CardBody>
            <p style={{ margin: 0, color: "var(--cordon-copy)" }}>
              Liquidity takes the other side of every protection buyer. You keep the premiums when
              the flight lands on time and withdraw once the market settles.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Protection pools</CardTitle>
        </CardHeader>
        {isLoading ? (
          <TableSkeleton rows={4} columns={5} />
        ) : error && pools.length === 0 ? (
          <LoadError what="pools" onRetry={refetch} />
        ) : (
          <DataTable
            columns={buildColumns(setTarget, isConnected)}
            rows={pools}
            rowKey={(row) => row.id}
            density="default"
            stickyHeader={false}
            empty="No open pools right now. New flights are listed every day."
          />
        )}
      </Card>

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title="Add liquidity"
        description={target ? `${target.code} · ${target.route} · ${target.date}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" loading={pending} onClick={confirmAdd}>
              {pending ? STAGE_LABEL[stage] : "Confirm"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField
            id="liquidity-amount"
            inputMode="decimal"
            prefix="USDG"
            placeholder="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <p
            style={{
              margin: 0,
              color: "var(--cordon-copy-dim)",
              fontSize: "var(--cordon-size-caption)",
            }}
          >
            Balance {balance === undefined ? "…" : formatUsdc(balance)} USDG. Withdraw after the
            flight settles, or in full if it is voided.
          </p>
        </div>
      </Modal>
    </>
  );
}
