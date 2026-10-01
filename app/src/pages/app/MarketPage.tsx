import { useAccount } from "wagmi";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  DEFAULT_FLIGHT,
  flightIdOf,
  isConfigured,
  useBuyProtection,
  useMarketAddress,
  useMarketState,
} from "../../features/market/useFlightMarket";
import { WAD, formatPercent, formatUsdc } from "../../lib/format";
import { SILKSCREEN } from "../../lib/theme";

const PREMIUM = 6_200_000n;
const PAYOUT = 100_000_000n;

export function MarketPage() {
  const { isConnected } = useAccount();
  const flightId = flightIdOf(DEFAULT_FLIGHT.number, DEFAULT_FLIGHT.date);
  const market = useMarketAddress(flightId);
  const state = useMarketState(market);
  const { buy, isPending } = useBuyProtection(market);

  const delayed = state.probability !== undefined ? state.probability : 62_000_000_000_000_000n;
  const onTime = WAD - delayed;
  const pool =
    state.reserves !== undefined
      ? state.reserves[0] + state.reserves[1]
      : 24_800_000_000n;

  return (
    <>
      <Card
        title={`${DEFAULT_FLIGHT.number} · SIN → CGK`}
        action={
          <span className="rounded-full border border-green-400/40 px-2.5 py-1 text-xs text-green-400">
            ● {isConfigured && market ? "On-chain" : "Demo"}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-3.5">
            <span className="text-[13px] text-white/60">On-time</span>
            <span className="text-xl text-white" style={{ fontFamily: SILKSCREEN }}>
              {formatPercent(onTime)}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-sky-400/60 bg-sky-400/10 p-3.5">
            <span className="text-[13px] text-white/60">Delayed</span>
            <span className="text-xl text-white" style={{ fontFamily: SILKSCREEN }}>
              {formatPercent(delayed)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Pay</span>
            <strong className="text-white">{formatUsdc(PREMIUM)} USDC</strong>
          </div>
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Receive if delay &gt; 2h</span>
            <strong className="text-white">{formatUsdc(PAYOUT)} USDC</strong>
          </div>
          <Button
            block
            disabled={!isConnected || !market || isPending}
            onClick={() => {
              void buy(PREMIUM);
            }}
          >
            {isPending ? "Buying…" : "Buy protection"}
          </Button>
        </div>
      </Card>

      <Card title="Liquidity">
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>Pool</span>
          <strong className="text-white">{formatUsdc(pool)} USDC</strong>
        </div>
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>Status</span>
          <strong className="text-white">
            {state.resolved ? "Resolved" : "Open"}
          </strong>
        </div>
      </Card>
    </>
  );
}
