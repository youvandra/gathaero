import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  DEFAULT_FLIGHT,
  flightIdOf,
  useAddLiquidity,
  useMarketAddress,
  useMarketState,
} from "../../features/market/useFlightMarket";
import { formatUsdc } from "../../lib/format";
import { INPUT } from "../../lib/theme";

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

  const metrics = [
    { label: "TVL", value: `${formatUsdc(tvl)} USDC` },
    { label: "Yield", value: "~14% APY" },
    { label: "Exposure", value: `${formatUsdc(exposure)} USDC` },
  ];

  return (
    <Card title="Route: SIN → CGK">
      <div className="grid grid-cols-3 gap-2.5">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <span className="text-xs text-white/50">{metric.label}</span>
            <span className="text-[13px] font-semibold text-white">{metric.value}</span>
          </div>
        ))}
      </div>
      <input
        className={INPUT}
        inputMode="decimal"
        placeholder="Amount (USDC)"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />
      <Button block disabled={!isConnected || !market || isPending} onClick={handleDeposit}>
        {isPending ? "Depositing…" : "Deposit"}
      </Button>
    </Card>
  );
}
