import { Button, Card, CardHeader, DataTable, Tag, useToast } from "cordon-ui";
import type { Column, TagTone } from "cordon-ui";
import { useAccount } from "wagmi";

import { StatTile } from "../../features/dashboard/StatTile";
import {
  usePositions,
  type Position,
  type PositionAction,
} from "../../features/market/usePositions";
import { useTransact } from "../../features/market/useTransact";
import { formatUsd, formatUsdc } from "../../lib/format";

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

function buildColumns(onAction: (row: Position) => void, pending: boolean): Column<Position>[] {
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
          <Button variant="primary" size="sm" disabled={pending} onClick={() => onAction(row)}>
            {ACTION_LABEL[row.action]}
          </Button>
        ) : null,
    },
  ];
}

export function PositionsPage() {
  const { notify } = useToast();
  const { isConnected } = useAccount();
  const { positions, isLoading } = usePositions();
  const { redeem, refund, removeLiquidity, pending } = useTransact();

  const open = positions.filter((p) => p.state === "open");
  const claimable = positions.filter((p) => p.action !== null);
  const openValue = open.reduce((sum, p) => sum + p.value, 0);
  const claimableValue = claimable.reduce((sum, p) => sum + p.value, 0);

  const handleAction = async (row: Position) => {
    try {
      if (row.action === "redeem") await redeem(row.market);
      if (row.action === "refund") await refund(row.market);
      if (row.action === "withdraw") await removeLiquidity(row.market, row.shares);
      notify({ tone: "positive", title: "Claimed", children: `${row.flight} · ${row.label}` });
    } catch (error) {
      notify({
        tone: "critical",
        title: "Could not claim",
        children: error instanceof Error ? error.message.split("\n")[0] : "Try again",
      });
    }
  };

  const columns = buildColumns((row) => {
    void handleAction(row);
  }, pending);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open positions" value={open.length.toString()} />
        <StatTile label="Open value" value={formatUsd(openValue)} delta="at market price" up />
        <StatTile
          label="Claimable"
          value={formatUsd(claimableValue)}
          delta={`${claimable.length} ready`}
          up
        />
        <StatTile label="Settled" value={(positions.length - open.length).toString()} />
      </div>

      <Card>
        <CardHeader>
          <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>
            Positions
          </h2>
        </CardHeader>
        <DataTable
          columns={columns}
          rows={positions}
          rowKey={(row) => row.key}
          density="default"
          stickyHeader={false}
          empty={
            !isConnected
              ? "Connect a wallet to see your positions"
              : isLoading
                ? "Loading positions…"
                : "No positions yet — buy protection or a prediction to start"
          }
        />
      </Card>
    </>
  );
}
