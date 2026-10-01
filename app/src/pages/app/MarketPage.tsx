import { Button, Card, CardBody, CardHeader, MetricCard, Tag } from "cordon-ui";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";

import {
  DEFAULT_FLIGHT,
  flightIdOf,
  isConfigured,
  useBuyProtection,
  useMarketAddress,
  useMarketState,
} from "../../features/market/useFlightMarket";
import { WAD, formatUsdc } from "../../lib/format";

const PREMIUM = 6_200_000n;
const PAYOUT = 100_000_000n;

function pct(wad: bigint): string {
  return (Number(wad) / 1e16).toFixed(1);
}

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
      <strong style={{ color: "var(--cordon-ink)" }}>{value}</strong>
    </div>
  );
}

export function MarketPage() {
  const { isConnected } = useAccount();
  const flightId = flightIdOf(DEFAULT_FLIGHT.number, DEFAULT_FLIGHT.date);
  const market = useMarketAddress(flightId);
  const state = useMarketState(market);
  const { buy, isPending } = useBuyProtection(market);

  const delayed = state.probability ?? 62_000_000_000_000_000n;
  const onTime = WAD - delayed;
  const pool = state.reserves ? state.reserves[0] + state.reserves[1] : 24_800_000_000n;
  const live = isConfigured && Boolean(market);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{`${DEFAULT_FLIGHT.number} · SIN → CGK`}</CardTitle>
            <Tag tone={live ? "positive" : "neutral"} dot>
              {live ? "Live" : "Demo"}
            </Tag>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap justify-center gap-4 py-2">
            <MetricCard
              title={<>On-time</>}
              value={pct(onTime)}
              unit="%"
              progress={Number(onTime) / 1e18}
              figure={null}
              animate={false}
              className="max-w-[230px]"
            />
            <MetricCard
              title={<>Delayed</>}
              value={pct(delayed)}
              unit="%"
              progress={Number(delayed) / 1e18}
              glaze="ember"
              animate={false}
              className="max-w-[230px]"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buy protection</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-2">
            <Row label="Pay" value={`${formatUsdc(PREMIUM)} USDC`} />
            <Row label="Receive if delay > 2h" value={`${formatUsdc(PAYOUT)} USDC`} />
            <Button
              variant="primary"
              block
              disabled={!isConnected || !market || isPending}
              onClick={() => {
                void buy(PREMIUM);
              }}
            >
              {isPending ? "Buying…" : "Buy protection"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liquidity</CardTitle>
        </CardHeader>
        <CardBody>
          <Row label="Pool" value={`${formatUsdc(pool)} USDC`} />
          <Row label="Status" value={state.resolved ? "Resolved" : "Open"} />
        </CardBody>
      </Card>
    </>
  );
}
