import { Button } from "cordon-ui";
import { useState, type ReactNode } from "react";

import { DELAYED, ON_TIME, quoteShares, type FlightMarket } from "../market/model";
import { STAGE_LABEL, useTransact } from "../market/useTransact";
import { explainError } from "../../lib/errors";
import { formatCountdown, formatUsdc, parseAmount, withSlippage } from "../../lib/format";

export const muted = { color: "var(--cordon-copy)" } as const;

/** Full-screen frame shared by the public kiosk and the traveller's claim page. */
export function Screen({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--cordon-paper)", color: "var(--cordon-ink)" }}
    >
      <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <span className="inline-flex items-center gap-2.5 text-xl font-semibold">
          <img src="/icon.svg" alt="" width={32} height={32} style={{ borderRadius: 8 }} />
          gathæro
        </span>
        <span className="flex items-center gap-3 text-sm" style={muted}>
          {aside}
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-10 sm:px-10">
        <div className="flex w-full max-w-2xl flex-col items-center gap-7 text-center">
          {children}
        </div>
      </main>
    </div>
  );
}

export function Big({ children }: { children: ReactNode }) {
  return (
    <h1
      className="m-0 text-balance"
      style={{ fontSize: "clamp(30px, 6vw, 54px)", fontWeight: 700, lineHeight: 1.05 }}
    >
      {children}
    </h1>
  );
}

export function FlightCard({ flight, now }: { flight: FlightMarket; now: number }) {
  const closesIn = flight.departureTimestamp - now;
  const cells: [string, string][] = [
    ["Flight", flight.code],
    ["Route", flight.route],
    ["Departs (UTC)", flight.scheduledDeparture],
    ["Delay odds", `${(flight.delayProbability * 100).toFixed(0)}%`],
    ["Pays if late by", `${flight.thresholdMinutes}+ min`],
    ["Buying closes in", closesIn > 0 ? formatCountdown(closesIn) : "closed"],
  ];
  return (
    <div
      className="grid w-full grid-cols-2 gap-4 rounded-[var(--cordon-radius-5)] border p-6 text-left sm:grid-cols-3"
      style={{ borderColor: "var(--cordon-hairline)", background: "var(--cordon-paper-raised)" }}
    >
      {cells.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-1">
          <span
            style={{
              ...muted,
              fontSize: "var(--cordon-size-micro)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
          <span style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

const AMOUNTS = ["10", "25", "50", "100"];

/** Pick an amount and buy the Delayed side of the flight's protection pool. */
export function BuyPanel({
  flight,
  onBought,
  onError,
}: {
  flight: FlightMarket;
  onBought: (amount: string, payout: bigint) => void;
  onError: (title: string, message: string) => void;
}) {
  const { buy, pending, stage } = useTransact();
  const [amount, setAmount] = useState("25");
  const protection = flight.protection;
  if (!protection) return null;

  const parsed = parseAmount(amount);
  const payout = quoteShares(protection, DELAYED, parsed);
  const closed = flight.status !== "open";

  const confirm = async () => {
    try {
      await buy(protection.address, DELAYED, parsed, withSlippage(payout));
      onBought(amount, payout);
    } catch (error) {
      const explained = explainError(error);
      onError(explained.title, explained.message);
    }
  };

  return (
    <>
      <div className="grid w-full grid-cols-4 gap-3">
        {AMOUNTS.map((value) => (
          <Button
            key={value}
            size="lg"
            variant={amount === value ? "primary" : "secondary"}
            onClick={() => setAmount(value)}
          >
            ${value}
          </Button>
        ))}
      </div>
      <p className="m-0 text-2xl">
        Pays <strong>{formatUsdc(payout)} USDG</strong> if {flight.code} is late
      </p>
      <Button
        variant="primary"
        size="lg"
        block
        loading={pending}
        disabled={closed || parsed <= 0n}
        onClick={() => void confirm()}
      >
        {pending ? STAGE_LABEL[stage] : closed ? "Buying has closed" : `Buy for $${amount}`}
      </Button>
    </>
  );
}

/** Pick an arrival window and buy its Yes side: a trade on when the flight lands. */
export function PredictPanel({
  flight,
  onBought,
  onError,
}: {
  flight: FlightMarket;
  onBought: (window: string, amount: string, payout: bigint) => void;
  onError: (title: string, message: string) => void;
}) {
  const { buy, pending, stage } = useTransact();
  const open = flight.buckets.filter((bucket) => !bucket.resolved && !bucket.voided);
  const [picked, setPicked] = useState(0);
  const [amount, setAmount] = useState("10");
  const bucket = open[Math.min(picked, open.length - 1)];
  if (!bucket) return null;

  const parsed = parseAmount(amount);
  const payout = quoteShares(bucket, ON_TIME, parsed);
  const closed = flight.status !== "open";
  const label = `${bucket.from}–${bucket.to} UTC`;

  const confirm = async () => {
    try {
      await buy(bucket.address, ON_TIME, parsed, withSlippage(payout));
      onBought(label, amount, payout);
    } catch (error) {
      const explained = explainError(error);
      onError(explained.title, explained.message);
    }
  };

  return (
    <>
      <p className="m-0" style={muted}>
        Scheduled to arrive {flight.scheduledArrival} UTC. When will it really land?
      </p>
      <div className="grid w-full grid-cols-2 gap-3">
        {open.map((option, index) => (
          <Button
            key={option.address}
            size="lg"
            variant={index === picked ? "primary" : "secondary"}
            onClick={() => setPicked(index)}
          >
            {option.from}–{option.to} · {(option.yes * 100).toFixed(0)}¢
          </Button>
        ))}
      </div>
      <div className="grid w-full grid-cols-4 gap-3">
        {AMOUNTS.map((value) => (
          <Button
            key={value}
            variant={amount === value ? "primary" : "ghost"}
            onClick={() => setAmount(value)}
          >
            ${value}
          </Button>
        ))}
      </div>
      <p className="m-0 text-2xl">
        Pays <strong>{formatUsdc(payout)} USDG</strong> if it lands {label}
      </p>
      <Button
        variant="primary"
        size="lg"
        block
        loading={pending}
        disabled={closed || parsed <= 0n}
        onClick={() => void confirm()}
      >
        {pending ? STAGE_LABEL[stage] : closed ? "Trading has closed" : `Trade for $${amount}`}
      </Button>
    </>
  );
}
