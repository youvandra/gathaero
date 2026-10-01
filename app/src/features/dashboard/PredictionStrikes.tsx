import { Button, TextField } from "cordon-ui";
import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

import {
  DELAYED_OUTCOME,
  ON_TIME_OUTCOME,
  isConfigured,
  strikeTimestamp,
  useBuyOutcome,
  useMarketState,
  useThresholdMarketAddress,
} from "../market/useFlightMarket";
import type { Strike } from "./mockMarkets";

function StrikeRow({
  flightId,
  date,
  strike,
  amount,
}: {
  flightId: `0x${string}`;
  date: string;
  strike: Strike;
  amount: string;
}) {
  const { isConnected } = useAccount();
  const address = useThresholdMarketAddress(flightId, strikeTimestamp(date, strike.time));
  const state = useMarketState(address);
  const { buyOutcome, isPending } = useBuyOutcome(address);

  const live = isConfigured && Boolean(address);
  const yes =
    live && state.probability !== undefined ? 1 - Number(state.probability) / 1e18 : strike.yes;
  const no = 1 - yes;

  const trade = (outcome: number) => {
    const parsed = parseUnits(amount || "0", 6);
    if (parsed > 0n) {
      void buyOutcome(outcome, parsed);
    }
  };

  return (
    <div
      className="grid items-center gap-3 border-b py-3 last:border-b-0"
      style={{ gridTemplateColumns: "1fr auto auto", borderColor: "var(--cordon-hairline-soft)" }}
    >
      <span className="flex flex-col">
        <span
          style={{
            fontWeight: 600,
            color: "var(--cordon-ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Lands by {strike.time}
        </span>
        <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-micro)" }}>
          {live ? "On-chain" : "Demo"}
        </span>
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={!isConnected || !address || isPending}
        onClick={() => trade(ON_TIME_OUTCOME)}
      >
        Yes {(yes * 100).toFixed(0)}¢
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={!isConnected || !address || isPending}
        onClick={() => trade(DELAYED_OUTCOME)}
      >
        No {(no * 100).toFixed(0)}¢
      </Button>
    </div>
  );
}

export function PredictionStrikes({
  flightId,
  date,
  strikes,
}: {
  flightId: `0x${string}`;
  date: string;
  strikes: Strike[];
}) {
  const [amount, setAmount] = useState("5");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span
          style={{
            color: "var(--cordon-copy-dim)",
            fontSize: "var(--cordon-size-micro)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Stake per trade
        </span>
        <TextField
          inputMode="decimal"
          prefix="USDC"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <div>
        {strikes.map((strike) => (
          <StrikeRow
            key={strike.time}
            flightId={flightId}
            date={date}
            strike={strike}
            amount={amount}
          />
        ))}
      </div>
    </div>
  );
}
