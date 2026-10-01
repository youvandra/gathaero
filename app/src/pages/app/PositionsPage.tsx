import { Button, Card, CardHeader, DataTable, Tag } from "cordon-ui";
import type { Column, TagTone } from "cordon-ui";

import { StatTile } from "../../features/dashboard/StatTile";

type Side = "Protection" | "Prediction";
type PosStatus = "active" | "delayed" | "resolved";

type Position = {
  id: string;
  flight: string;
  route: string;
  side: Side;
  detail: string;
  size: number;
  entry: string;
  mark: string;
  pnl: number;
  status: PosStatus;
};

const POSITIONS: Position[] = [
  { id: "TR286-P", flight: "TR286", route: "SIN → CGK", side: "Protection", detail: "Delayed > 2h", size: 100, entry: "$62.00", mark: "$100.00", pnl: 38, status: "delayed" },
  { id: "AK380-P", flight: "AK380", route: "SIN → KUL", side: "Protection", detail: "Delayed > 2h", size: 100, entry: "$9.10", mark: "$9.10", pnl: 0, status: "active" },
  { id: "QZ521-Y", flight: "QZ521", route: "SIN → DPS", side: "Prediction", detail: "Lands by 16:40", size: 40, entry: "48¢", mark: "52¢", pnl: 1.6, status: "active" },
  { id: "SQ956-P", flight: "SQ956", route: "SIN → CGK", side: "Protection", detail: "Delayed > 2h", size: 60, entry: "$6.20", mark: "$6.20", pnl: 0, status: "active" },
  { id: "GA410-Y", flight: "GA410", route: "CGK → DPS", side: "Prediction", detail: "Lands by 18:15", size: 30, entry: "70¢", mark: "100¢", pnl: 9, status: "resolved" },
];

const STATUS_TONE: Record<PosStatus, TagTone> = {
  active: "neutral",
  delayed: "critical",
  resolved: "positive",
};

const COLUMNS: Column<Position>[] = [
  {
    id: "flight",
    header: "Flight",
    sortBy: (row) => row.flight,
    cell: (row) => (
      <span className="flex flex-col">
        <span style={{ fontWeight: 600, color: "var(--cordon-ink)" }}>{row.flight}</span>
        <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-micro)" }}>
          {row.route}
        </span>
      </span>
    ),
  },
  {
    id: "side",
    header: "Type",
    sortBy: (row) => row.side,
    cell: (row) => (
      <span className="flex flex-col">
        <span>{row.side}</span>
        <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-micro)" }}>
          {row.detail}
        </span>
      </span>
    ),
  },
  { id: "size", header: "Size", numeric: true, sortBy: (row) => row.size, cell: (row) => `$${row.size}` },
  { id: "entry", header: "Entry", numeric: true, cell: (row) => row.entry },
  { id: "mark", header: "Mark", numeric: true, cell: (row) => row.mark },
  {
    id: "pnl",
    header: "PnL",
    numeric: true,
    sortBy: (row) => row.pnl,
    cell: (row) => (
      <span
        style={{
          color: row.pnl > 0 ? "var(--cordon-positive)" : row.pnl < 0 ? "var(--cordon-critical)" : "var(--cordon-copy)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {row.pnl > 0 ? "+" : ""}
        {row.pnl.toFixed(2)}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => (
      <Tag tone={STATUS_TONE[row.status]} size="sm">
        {row.status}
      </Tag>
    ),
  },
  {
    id: "action",
    header: "",
    align: "end",
    cell: (row) => (
      <Button variant={row.status === "delayed" ? "primary" : "secondary"} size="sm">
        {row.status === "delayed" ? "Claim" : "Sell"}
      </Button>
    ),
  },
];

export function PositionsPage() {
  const totalPnl = POSITIONS.reduce((sum, position) => sum + position.pnl, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open positions" value="5" delta="3 protection · 2 prediction" up />
        <StatTile label="Notional" value="$330" delta="protected" up />
        <StatTile label="Unrealized PnL" value={`+$${totalPnl.toFixed(2)}`} delta="+12.6%" up />
        <StatTile label="Pending claims" value="$100" delta="1 claimable" up />
      </div>

      <Card>
        <CardHeader>
          <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>
            Positions
          </h2>
        </CardHeader>
        <DataTable
          columns={COLUMNS}
          rows={POSITIONS}
          rowKey={(row) => row.id}
          density="compact"
          stickyHeader={false}
        />
      </Card>
    </>
  );
}
