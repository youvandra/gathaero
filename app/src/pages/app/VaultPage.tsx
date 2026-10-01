import { Button, Card, CardBody, CardHeader, TextField } from "cordon-ui";
import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

import {
  DEFAULT_FLIGHT,
  flightIdOf,
  useAddLiquidity,
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span style={{ color: "var(--cordon-copy)" }}>{label}</span>
      <strong style={{ color: "var(--cordon-ink)" }}>{value}</strong>
    </div>
  );
}

export function VaultPage() {
  const [amount, setAmount] = useState("");
  const { isConnected } = useAccount();

  const flightId = flightIdOf(DEFAULT_FLIGHT.number, DEFAULT_FLIGHT.date);
  const market = useMarketAddress(flightId);
  const state = useMarketState(market);
  const { addLiquidity, isPending } = useAddLiquidity(market);

  const tvl = state.reserves ? state.reserves[0] + state.reserves[1] : 24_800_000_000n;
  const exposure = state.reserves ? state.reserves[1] : 12_400_000_000n;

  const handleDeposit = () => {
    const parsed = parseUnits(amount || "0", 6);
    if (parsed > 0n) {
      void addLiquidity(parsed);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Route: SIN → CGK</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col gap-2">
          <Row label="TVL" value={`${formatUsdc(tvl)} USDC`} />
          <Row label="Yield" value="~14% APY" />
          <Row label="Exposure" value={`${formatUsdc(exposure)} USDC`} />

          <div className="flex flex-col gap-3 pt-3">
            <TextField
              inputMode="decimal"
              placeholder="Amount (USDC)"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <Button
              variant="primary"
              block
              disabled={!isConnected || !market || isPending}
              onClick={handleDeposit}
            >
              {isPending ? "Depositing…" : "Deposit"}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
