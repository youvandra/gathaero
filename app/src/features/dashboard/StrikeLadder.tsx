import { Button, DataTable } from "cordon-ui";
import type { Column } from "cordon-ui";

import type { Strike } from "./mockMarkets";

const COLUMNS: Column<Strike>[] = [
  {
    id: "strike",
    header: "Lands by",
    sortBy: (row) => row.time,
    cell: (row) => (
      <span style={{ fontWeight: 600, color: "var(--cordon-ink)", fontVariantNumeric: "tabular-nums" }}>
        {row.time}
      </span>
    ),
  },
  {
    id: "yes",
    header: "Yes",
    numeric: true,
    sortBy: (row) => row.yes,
    cell: (row) => (
      <span style={{ color: "var(--cordon-positive)", fontVariantNumeric: "tabular-nums" }}>
        {(row.yes * 100).toFixed(0)}¢
      </span>
    ),
  },
  {
    id: "no",
    header: "No",
    numeric: true,
    sortBy: (row) => 1 - row.yes,
    cell: (row) => (
      <span style={{ color: "var(--cordon-critical)", fontVariantNumeric: "tabular-nums" }}>
        {((1 - row.yes) * 100).toFixed(0)}¢
      </span>
    ),
  },
  {
    id: "action",
    header: "",
    align: "end",
    cell: () => (
      <Button variant="secondary" size="sm">
        Trade
      </Button>
    ),
  },
];

export function StrikeLadder({ strikes }: { strikes: Strike[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={strikes}
      rowKey={(row) => row.time}
      density="compact"
      stickyHeader={false}
    />
  );
}
