import { Button, Sheet, Tag } from "cordon-ui";
import type { TagTone } from "cordon-ui";
import { useNavigate } from "react-router-dom";

import { DetailHeading, DetailList, HexValue } from "../../components/data/DetailList";
import { actualArrival, delayLine, type FlightMarket } from "../market/model";
import type { Position } from "../market/usePositions";
import { formatUsd, formatUsdc } from "../../lib/format";

const STATE_TONE: Record<Position["state"], TagTone> = {
  open: "neutral",
  won: "positive",
  lost: "critical",
  voided: "caution",
  settled: "info",
  paid: "positive",
};

export function PositionSheet({
  position,
  flight,
  actionLabel,
  busy,
  onAction,
  onClose,
}: {
  position: Position | null;
  flight: FlightMarket | undefined;
  actionLabel?: string;
  busy: boolean;
  onAction: (position: Position) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const ata = flight ? actualArrival(flight) : null;

  return (
    <Sheet
      open={position !== null}
      onClose={onClose}
      side="right"
      size={420}
      title={position ? `${position.flight} · ${position.label}` : ""}
      description={position ? `${position.side} side` : undefined}
      footer={
        position ? (
          <div className="flex w-full gap-2">
            {flight ? (
              <Button
                variant="secondary"
                block
                onClick={() => navigate(`/app/market/${flight.code}?id=${flight.id}`)}
              >
                Open market
              </Button>
            ) : null}
            {position.action && actionLabel ? (
              <Button variant="primary" block loading={busy} onClick={() => onAction(position)}>
                {actionLabel}
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {position ? (
        <div className="flex flex-col">
          <DetailHeading>Position</DetailHeading>
          <DetailList
            rows={[
              {
                label: "Status",
                value: (
                  <Tag tone={STATE_TONE[position.state]} size="sm">
                    {position.state}
                  </Tag>
                ),
              },
              { label: "Shares", value: formatUsdc(position.shares) },
              { label: "Price now", value: `${(position.mark * 100).toFixed(1)}¢` },
              { label: "Value", value: formatUsd(position.value) },
            ]}
          />

          {flight ? (
            <>
              <DetailHeading>Flight</DetailHeading>
              <DetailList
                rows={[
                  { label: "Route", value: flight.route },
                  {
                    label: "Departs · trading closes",
                    value: `${flight.date} · ${flight.scheduledDeparture} UTC`,
                  },
                  { label: "Scheduled arrival", value: `${flight.scheduledArrival} UTC` },
                  {
                    label: "Actual arrival (gate)",
                    value: ata ? `${ata} UTC` : "Not reported yet",
                  },
                  {
                    label: "Delay",
                    value: flight.delayMinutes === null ? "—" : delayLine(flight.delayMinutes),
                  },
                  { label: "Delayed means", value: `> ${flight.thresholdMinutes} min late` },
                ]}
              />
            </>
          ) : null}

          <DetailHeading>On-chain</DetailHeading>
          <DetailList
            rows={[
              { label: "Market contract", value: <HexValue value={position.market} /> },
              ...(flight
                ? [{ label: "Flight ID", value: <HexValue value={flight.id} kind="id" /> }]
                : []),
            ]}
          />
        </div>
      ) : null}
    </Sheet>
  );
}
