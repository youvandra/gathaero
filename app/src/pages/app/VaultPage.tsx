import { Button, Card, CardBody, CardHeader, TextField } from "cordon-ui";
import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

import { StatTile } from "../../features/dashboard/StatTile";
import {
  DEFAULT_FLIGHT,
  flightIdOf,
  useAddLiquidity,
  useMarketAddress,
  useMarketState,
} from "../../features/market/useFlightMarket";

function CardTitle({ children }: { children: string }) {
  return (
    <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>
      {children}
    </h2>
  );
}

export function VaultPage() {
  const [amount, setAmount] = useState("");
  const { isConnected } = useAccount();

  const flightId = flightIdOf(DEFAULT_FLIGHT.number, DEFAULT_FLIGHT.date);
  const market = useMarketAddress(flightId);
  const state = useMarketState(market);
  const { addLiquidity, isPending } = useAddLiquidity(market);

  const tvl = state.reserves ? Number(state.reserves[0] + state.reserves[1]) / 1e6 : 24_800;
  const exposure = state.reserves ? Number(state.reserves[1]) / 1e6 : 12_400;

  const handleDeposit = () => {
    const parsed = parseUnits(amount || "0", 6);
    if (parsed > 0n) {
      void addLiquidity(parsed);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="TVL"
          value={`$${tvl.toLocaleString()}`}
          delta="+4.2% 7d"
          up
          history={[18, 19.5, 21, 20.4, 22.8, 23.6, 24.1, 24.8]}
        />
        <StatTile label="Yield" value="14.0%" delta="APY" up />
        <StatTile label="Exposure" value={`$${exposure.toLocaleString()}`} delta="at risk" up={false} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provide liquidity · SIN → CGK</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-3">
            <p style={{ margin: 0, color: "var(--cordon-copy)" }}>
              Underwrite delay risk on this route and earn the premium when flights land
              on time.
            </p>
            <TextField
              inputMode="decimal"
              prefix="USDC"
              placeholder="Amount"
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
        </CardBody>
      </Card>
    </>
  );
}
