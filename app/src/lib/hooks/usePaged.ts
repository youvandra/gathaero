import { useEffect, useState } from "react";

/** Splits rows into pages and keeps the page in range when the rows change. */
export function usePaged<Row>(rows: Row[], pageSize: number) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  return {
    page: current,
    setPage,
    pageCount,
    pageRows: rows.slice(start, start + pageSize),
    from: rows.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, rows.length),
    total: rows.length,
  };
}
