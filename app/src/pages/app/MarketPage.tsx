import { Button, Card, CardBody, CardHeader, Tag, TextField } from "cordon-ui";
import type { ReactNode } from "react";
import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

import { ProbabilityPanel } from "../../features/dashboard/ProbabilityPanel";
import {
  DEFAULT_FLIGHT,
  flightIdOf,
  isConfigured,
  useBuyProtection,
  useMarketAddress,
  useMarketState,
} from "../../features/market/useFlightMarket";
import { formatUsdc } from "../../lib/format";

function CardTitle({ children }: { children: string }) {
  return (
    <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>
      {children}
    </h2>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span style={{ color: "var(--cordon-copy)" }}>{label}</span>
      <strong style={{ color: "var(--cordon-ink)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </strong>
    </div>
  );
}

export function MarketPage() {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("6.20");

  const flightId = flightIdOf(DEFAULT_FLIGHT.number, DEFAULT_FLIGHT.date);
  const market = useMarketAddress(flightId);
  const state = useMarketState(market);
  const { buy, isPending } = useBuyProtection(market);

  const probability = state.probability ? Number(state.probability) / 1e18 : 0.062;
  const live = isConfigured && Boolean(market);
  const pool = state.reserves ? Number(state.reserves[0] + state.reserves[1]) / 1e6 : 24_800;

  const premium = Number(amount) || 0;
  const payout = probability > 0 ? premium / probability : 0;

  const buyAmount = () => {
    const parsed = parseUnits(amount || "0", 6);
    if (parsed > 0n) {
      void buy(parsed);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle>{`${DEFAULT_FLIGHT.number} · SIN → CGK`}</CardTitle>
              <Tag tone={live ? "positive" : "neutral"} dot>
                {live ? "Live" : "Demo"}
              </Tag>
            </div>
            <Button variant="ghost" size="sm" iconOnly iconStart="refresh" aria-label="Refresh" />
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ProbabilityPanel probability={probability} />

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <TextField
                  inputMode="decimal"
                  prefix="USDC"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <Row label="Pay" value={`${formatUsdc(parseUnits(amount || "0", 6))} USDC`} />
                <Row label="Pays if delayed" value={`~${payout.toFixed(0)} USDC`} />
              </div>
              <Button
                variant="primary"
                block
                disabled={!isConnected || !market || isPending}
                onClick={buyAmount}
              >
                {isPending ? "Buying…" : "Buy protection"}
              </Button>
              <p style={{ margin: 0, color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-caption)" }}>
                Settles automatically when the flight lands.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market</CardTitle>
        </CardHeader>
        <CardBody>
          <Row label="Pool liquidity" value={`${pool.toLocaleString()} USDC`} />
          <Row label="Status" value={state.resolved ? "Resolved" : "Open"} />
          <Row label="Closes" value="at landing" />
        </CardBody>
      </Card>
    </>
  );
}
