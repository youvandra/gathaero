import { Button, useToast } from "cordon-ui";
import type { ReactNode } from "react";

import { targetChain } from "../../config/chains";
import { shortenAddress } from "../../lib/format";

const explorer = targetChain.blockExplorers?.default.url;

/** Label/value rows for a detail panel. */
export function DetailList({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="m-0 flex flex-col">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-start justify-between gap-4 border-b py-2.5 last:border-b-0"
          style={{ borderColor: "var(--cordon-hairline-soft)" }}
        >
          <dt style={{ color: "var(--cordon-copy)", fontSize: "var(--cordon-size-caption)" }}>
            {row.label}
          </dt>
          <dd
            className="m-0 min-w-0 text-right"
            style={{
              color: "var(--cordon-ink)",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              overflowWrap: "anywhere",
            }}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailHeading({ children }: { children: string }) {
  return (
    <h3
      style={{
        margin: "18px 0 4px",
        color: "var(--cordon-copy-dim)",
        fontSize: "var(--cordon-size-micro)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      {children}
    </h3>
  );
}

/** A contract address or id: shortened, copyable, linked to the block explorer when it is an address. */
export function HexValue({ value, kind = "address" }: { value: string; kind?: "address" | "id" }) {
  const { notify } = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      notify({ tone: "info", title: "Copied" });
    } catch {
      notify({ tone: "caution", title: "Could not copy", children: value });
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      {kind === "address" && explorer ? (
        <a
          href={`${explorer}/address/${value}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--cordon-ink)" }}
          title="Open in block explorer"
        >
          {shortenAddress(value)}
        </a>
      ) : (
        <span title={value}>{shortenAddress(value)}</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        iconStart="copy"
        aria-label="Copy"
        onClick={() => {
          void copy();
        }}
      />
    </span>
  );
}
