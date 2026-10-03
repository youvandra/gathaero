import { Pagination } from "cordon-ui";

type Paged = { page: number; pageCount: number; from: number; to: number; total: number };

/** Pagination under a table, shown only when there is more than one page. */
export function TablePager({
  paged,
  onPageChange,
  noun,
}: {
  paged: Paged;
  onPageChange: (page: number) => void;
  noun: string;
}) {
  if (paged.pageCount <= 1) return null;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3"
      style={{ borderColor: "var(--cordon-hairline-soft)" }}
    >
      <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-caption)" }}>
        {paged.from}–{paged.to} of {paged.total} {noun}
      </span>
      <Pagination page={paged.page} pageCount={paged.pageCount} onPageChange={onPageChange} />
    </div>
  );
}
