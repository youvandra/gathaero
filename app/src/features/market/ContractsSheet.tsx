import { Sheet } from "cordon-ui";

import { DetailHeading, DetailList, HexValue } from "../../components/data/DetailList";
import { env } from "../../config/env";
import type { FlightMarket } from "./model";

/** Every contract behind one flight, so anyone can check the market on the block explorer. */
export function ContractsSheet({
  market,
  open,
  onClose,
}: {
  market: FlightMarket;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      side="right"
      size={440}
      title={`${market.code} contracts`}
      description={`${market.route} · ${market.date}`}
    >
      <div className="flex flex-col">
        <DetailHeading>Flight</DetailHeading>
        <DetailList
          rows={[
            { label: "Flight ID", value: <HexValue value={market.id} kind="id" /> },
            ...(market.protection
              ? [
                  {
                    label: "Protection pool",
                    value: <HexValue value={market.protection.address} />,
                  },
                ]
              : []),
          ]}
        />

        {market.buckets.length > 0 ? (
          <>
            <DetailHeading>Arrival windows (UTC)</DetailHeading>
            <DetailList
              rows={market.buckets.map((bucket) => ({
                label: `${bucket.from}–${bucket.to}`,
                value: <HexValue value={bucket.address} />,
              }))}
            />
          </>
        ) : null}

        <DetailHeading>Protocol</DetailHeading>
        <DetailList
          rows={[
            { label: "MarketFactory", value: <HexValue value={env.contracts.marketFactory} /> },
            { label: "PassRegistry", value: <HexValue value={env.contracts.passRegistry} /> },
            { label: "MarketLens", value: <HexValue value={env.contracts.marketLens} /> },
            { label: "USDG", value: <HexValue value={env.contracts.collateral} /> },
          ]}
        />
      </div>
    </Sheet>
  );
}
