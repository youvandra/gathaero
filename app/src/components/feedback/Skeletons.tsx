import { Skeleton } from "cordon-ui";

/** Placeholder rows shaped like a market or positions table while data loads. */
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col px-5 pb-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="grid items-center gap-4 border-b py-3.5 last:border-b-0"
          style={{
            gridTemplateColumns: `minmax(0, 1.4fr) repeat(${columns - 1}, minmax(0, 1fr))`,
            borderColor: "var(--cordon-hairline-soft)",
          }}
        >
          <span className="flex flex-col gap-1.5">
            <Skeleton width="56%" height={12} />
            <Skeleton width="38%" height={9} />
          </span>
          {Array.from({ length: columns - 1 }, (_, col) => (
            <Skeleton key={col} width="70%" height={11} style={{ justifySelf: "end" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A short list of label/value rows, used for side cards like top movers. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="flex items-center justify-between border-b px-5 py-3 last:border-b-0"
          style={{ borderColor: "var(--cordon-hairline-soft)" }}
        >
          <span className="flex flex-col gap-1.5">
            <Skeleton width={64} height={12} />
            <Skeleton width={96} height={9} />
          </span>
          <Skeleton width={48} height={12} />
        </div>
      ))}
    </div>
  );
}
