import { DataTable, Sparkline, Tag } from "cordon-ui";
import type { Column, TagTone } from "cordon-ui";

import type { FlightMarket, MarketStatus } from "./mockMarkets";

const STATUS_TONE: Record<MarketStatus, TagTone> = {
  open: "neutral",
  delayed: "critical",
  resolved: "positive",
};

const COLUMNS: Column<FlightMarket>[] = [
  {
    id: "code",
    header: "Flight",
    sortBy: (row) => row.code,
    cell: (row) => (
      <span className="flex flex-col">
        <span style={{ fontWeight: 600, color: "var(--cordon-ink)" }}>{row.code}</span>
        <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-micro)" }}>
          {row.route}
        </span>
      </span>
    ),
  },
  {
    id: "date",
    header: "Date",
    sortBy: (row) => row.date,
    cell: (row) => row.date,
  },
  {
    id: "ata",
    header: "Scheduled",
    numeric: true,
    sortBy: (row) => row.scheduledArrival,
    cell: (row) => row.scheduledArrival,
  },
  {
    id: "delay",
    header: "Delay %",
    numeric: true,
    sortBy: (row) => row.delayProbability,
    cell: (row) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {(row.delayProbability * 100).toFixed(1)}%
      </span>
    ),
  },
  {
    id: "volume",
    header: "Volume",
    numeric: true,
    sortBy: (row) => row.volume,
    cell: (row) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        ${row.volume.toLocaleString()}
      </span>
    ),
  },
  {
    id: "trend",
    header: "Trend",
    cell: (row) => <Sparkline values={row.history} width={72} height={22} />,
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
];

export function MarketTable({
  rows,
  onSelect,
}: {
  rows: FlightMarket[];
  onSelect?: (row: FlightMarket) => void;
}) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.code}
      density="default"
      stickyHeader={false}
      onRowClick={onSelect}
    />
  );
}
