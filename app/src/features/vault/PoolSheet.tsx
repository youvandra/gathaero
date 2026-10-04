import { Button, Sheet } from "cordon-ui";
import { useNavigate } from "react-router-dom";

import { DetailHeading, DetailList, HexValue } from "../../components/data/DetailList";
import { actualArrival, delayLine, type FlightMarket } from "../market/model";
import { formatUsd, formatUsdc, usd } from "../../lib/format";

export function PoolSheet({
  pool,
  myLiquidity,
  canAdd,
  onAdd,
  onClose,
}: {
  pool: FlightMarket | null;
  myLiquidity: number;
  canAdd: boolean;
  onAdd: (pool: FlightMarket) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const protection = pool?.protection;
  const ata = pool ? actualArrival(pool) : null;

  return (
    <Sheet
      open={pool !== null}
      onClose={onClose}
      side="right"
      size={420}
      title={pool ? `${pool.code} · ${pool.route}` : ""}
      description="Protection pool"
      footer={
        pool ? (
          <div className="flex w-full gap-2">
            <Button
              variant="secondary"
              block
              onClick={() => navigate(`/app/market/${pool.code}?id=${pool.id}`)}
            >
              Open market
            </Button>
            <Button variant="primary" block disabled={!canAdd} onClick={() => onAdd(pool)}>
              Add liquidity
            </Button>
          </div>
        ) : null
      }
    >
      {pool && protection ? (
        <div className="flex flex-col">
          <DetailHeading>Pool</DetailHeading>
          <DetailList
            rows={[
              { label: "Locked", value: usd(protection.locked) },
              { label: "Premium volume", value: usd(protection.volume) },
              {
                label: "Delay odds",
                value: `${(protection.delayedProbability * 100).toFixed(1)}%`,
              },
              { label: "On-time shares in pool", value: formatUsdc(protection.reserveOnTime) },
              { label: "Delayed shares in pool", value: formatUsdc(protection.reserveDelayed) },
              { label: "Your liquidity", value: formatUsd(myLiquidity) },
            ]}
          />

          <DetailHeading>Flight</DetailHeading>
          <DetailList
            rows={[
              {
                label: "Departs · trading closes",
                value: `${pool.date} · ${pool.scheduledDeparture} UTC`,
              },
              { label: "Scheduled arrival", value: `${pool.scheduledArrival} UTC` },
              { label: "Actual arrival (gate)", value: ata ? `${ata} UTC` : "Not reported yet" },
              {
                label: "Delay",
                value: pool.delayMinutes === null ? "—" : delayLine(pool.delayMinutes),
              },
              { label: "Delayed means", value: `> ${pool.thresholdMinutes} min late` },
            ]}
          />

          <DetailHeading>On-chain</DetailHeading>
          <DetailList
            rows={[
              { label: "Pool contract", value: <HexValue value={protection.address} /> },
              { label: "Flight ID", value: <HexValue value={pool.id} kind="id" /> },
            ]}
          />
        </div>
      ) : null}
    </Sheet>
  );
}
