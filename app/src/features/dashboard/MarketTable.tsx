import { DataTable, Sparkline, Tag } from "cordon-ui";
import type { Column } from "cordon-ui";

import type { FlightMarket } from "../market/model";
import { formatUsdc } from "../../lib/format";
import { STATUS_TONE } from "./statusTone";

function buildColumns(trendOf?: (row: FlightMarket) => number[]): Column<FlightMarket>[] {
  const columns: Column<FlightMarket>[] = [
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
      sortBy: (row) => row.arrivalTimestamp,
      cell: (row) => row.date,
    },
    {
      id: "ata",
      header: "Arrives (UTC)",
      numeric: true,
      sortBy: (row) => row.arrivalTimestamp,
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
      sortBy: (row) => Number(row.volume),
      cell: (row) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>${formatUsdc(row.volume, 0)}</span>
      ),
    },
  ];

  if (trendOf) {
    columns.push({
      id: "trend",
      header: "Trend",
      cell: (row) => <Sparkline values={trendOf(row)} width={72} height={22} />,
    });
  }

  columns.push({
    id: "status",
    header: "Status",
    cell: (row) => (
      <Tag tone={STATUS_TONE[row.status]} size="sm">
        {row.status}
      </Tag>
    ),
  });

  return columns;
}

export function MarketTable({
  rows,
  onSelect,
  trendOf,
  empty,
}: {
  rows: FlightMarket[];
  onSelect?: (row: FlightMarket) => void;
  trendOf?: (row: FlightMarket) => number[];
  empty?: string;
}) {
  return (
    <DataTable
      columns={buildColumns(trendOf)}
      rows={rows}
      rowKey={(row) => row.id}
      density="default"
      stickyHeader={false}
      onRowClick={onSelect}
      empty={empty ?? "No markets listed yet"}
    />
  );
}
