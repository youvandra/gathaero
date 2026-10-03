import { DataTable, Sparkline, Tag } from "cordon-ui";
import type { Column } from "cordon-ui";

import { TablePager } from "../../components/data/TablePager";
import { LoadError } from "../../components/feedback/LoadError";
import { TableSkeleton } from "../../components/feedback/Skeletons";
import type { FlightMarket } from "../market/model";
import { formatCountdown, usd } from "../../lib/format";
import { useNow } from "../../lib/hooks/useNow";
import { usePaged } from "../../lib/hooks/usePaged";
import { STATUS_TONE } from "./statusTone";

function buildColumns(
  now: number,
  trendOf?: (row: FlightMarket) => number[],
): Column<FlightMarket>[] {
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
      id: "departs",
      header: "Departs (UTC)",
      sortBy: (row) => row.departureTimestamp,
      cell: (row) => (
        <span className="flex flex-col">
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {row.date} · {row.scheduledDeparture}
          </span>
          {row.status === "open" ? (
            <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-micro)" }}>
              closes in {formatCountdown(row.departureTimestamp - now)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "ata",
      header: "Arrives",
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
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{usd(row.volume, 0)}</span>
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
  loading = false,
  error = false,
  onRetry,
  pageSize = 10,
}: {
  rows: FlightMarket[];
  onSelect?: (row: FlightMarket) => void;
  trendOf?: (row: FlightMarket) => number[];
  empty?: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  pageSize?: number;
}) {
  const now = useNow();
  const paged = usePaged(rows, pageSize);
  if (loading) return <TableSkeleton columns={trendOf ? 7 : 6} />;
  if (error && rows.length === 0 && onRetry) return <LoadError what="markets" onRetry={onRetry} />;

  return (
    <>
      <DataTable
        columns={buildColumns(now, trendOf)}
        rows={paged.pageRows}
        rowKey={(row) => row.id}
        density="default"
        stickyHeader={false}
        onRowClick={onSelect}
        empty={empty ?? "No markets listed yet"}
      />
      <TablePager paged={paged} onPageChange={paged.setPage} noun="flights" />
    </>
  );
}
