import { Button, Card, CardHeader, DataTable, Tag, useToast } from "cordon-ui";
import type { Column, TagTone } from "cordon-ui";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { LoadError } from "../../components/feedback/LoadError";
import { TableSkeleton } from "../../components/feedback/Skeletons";

import { StatTile } from "../../features/dashboard/StatTile";
import {
  usePositions,
  type Position,
  type PositionAction,
} from "../../features/market/usePositions";
import { useTransact } from "../../features/market/useTransact";
import { formatUsd, formatUsdc } from "../../lib/format";
import { errorToast } from "../../lib/errors";
import { usePageTitle } from "../../lib/hooks/usePageTitle";

const STATE_TONE: Record<Position["state"], TagTone> = {
  open: "neutral",
  won: "positive",
  lost: "critical",
  voided: "caution",
  settled: "info",
};

const ACTION_LABEL: Record<Exclude<PositionAction, null>, string> = {
  redeem: "Claim",
  refund: "Refund",
  withdraw: "Withdraw",
};

const ACTION_DONE: Record<Exclude<PositionAction, null>, string> = {
  redeem: "Winnings claimed",
  refund: "Refund claimed",
  withdraw: "Liquidity withdrawn",
};

function buildColumns(
  onAction: (row: Position) => void,
  busyKey: string | null,
): Column<Position>[] {
  return [
    {
      id: "flight",
      header: "Flight",
      sortBy: (row) => row.flight,
      cell: (row) => (
        <span className="flex flex-col">
          <span style={{ fontWeight: 600, color: "var(--cordon-ink)" }}>{row.flight}</span>
          <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-micro)" }}>
            {row.label}
          </span>
        </span>
      ),
    },
    { id: "side", header: "Side", sortBy: (row) => row.side, cell: (row) => row.side },
    {
      id: "shares",
      header: "Shares",
      numeric: true,
      sortBy: (row) => Number(row.shares),
      cell: (row) => formatUsdc(row.shares),
    },
    {
      id: "mark",
      header: "Mark",
      numeric: true,
      cell: (row) => `${(row.mark * 100).toFixed(0)}¢`,
    },
    {
      id: "value",
      header: "Value",
      numeric: true,
      sortBy: (row) => row.value,
      cell: (row) => formatUsd(row.value),
    },
    {
      id: "state",
      header: "Status",
      cell: (row) => (
        <Tag tone={STATE_TONE[row.state]} size="sm">
          {row.state}
        </Tag>
      ),
    },
    {
      id: "action",
      header: "",
      align: "end",
      cell: (row) =>
        row.action ? (
          <Button
            variant="primary"
            size="sm"
            loading={busyKey === row.key}
            disabled={busyKey !== null && busyKey !== row.key}
            onClick={() => onAction(row)}
          >
            {ACTION_LABEL[row.action]}
          </Button>
        ) : null,
    },
  ];
}

export function PositionsPage() {
  usePageTitle("Positions");
  const navigate = useNavigate();
  const { notify } = useToast();
  const { positions, isLoading, error, refetch } = usePositions();
  const { redeem, refund, removeLiquidity } = useTransact();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const open = positions.filter((p) => p.state === "open");
  const claimable = positions.filter((p) => p.action !== null);
  const openValue = open.reduce((sum, p) => sum + p.value, 0);
  const claimableValue = claimable.reduce((sum, p) => sum + p.value, 0);

  const handleAction = async (row: Position) => {
    if (!row.action) return;
    setBusyKey(row.key);
    try {
      if (row.action === "redeem") await redeem(row.market);
      if (row.action === "refund") await refund(row.market);
      if (row.action === "withdraw") await removeLiquidity(row.market, row.shares);
      notify({
        tone: "positive",
        title: ACTION_DONE[row.action],
        children: `${row.flight} · ${row.label} · ${formatUsd(row.value)}`,
      });
    } catch (error) {
      notify(errorToast(error));
    } finally {
      setBusyKey(null);
    }
  };

  const columns = buildColumns((row) => {
    void handleAction(row);
  }, busyKey);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open positions" value={open.length.toString()} loading={isLoading} />
        <StatTile
          label="Open value"
          value={formatUsd(openValue)}
          delta="at market price"
          up
          loading={isLoading}
        />
        <StatTile
          label="Claimable"
          value={formatUsd(claimableValue)}
          delta={`${claimable.length} ready`}
          up
          loading={isLoading}
        />
        <StatTile
          label="Settled"
          value={(positions.length - open.length).toString()}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>
            Positions
          </h2>
        </CardHeader>
        {isLoading ? (
          <TableSkeleton rows={3} columns={6} />
        ) : error && positions.length === 0 ? (
          <LoadError what="your positions" onRetry={refetch} />
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-start gap-3 px-5 pb-6">
            <p style={{ margin: 0, color: "var(--cordon-copy)" }}>
              No positions yet. Pick a flight you're on and buy protection.
            </p>
            <Button variant="primary" size="sm" onClick={() => navigate("/app/market")}>
              Browse markets
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={positions}
            rowKey={(row) => row.key}
            density="default"
            stickyHeader={false}
          />
        )}
      </Card>
    </>
  );
}
