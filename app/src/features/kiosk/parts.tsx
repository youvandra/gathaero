import { Button } from "cordon-ui";
import { useState, type ReactNode } from "react";
import type { Address } from "viem";

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

export const AMOUNTS = ["10", "25", "50", "100"];

/** What the traveller picked on the kiosk, carried to their phone in the hand-off link. */
export type Choice = { amount: string; bucket?: Address };

function openBuckets(flight: FlightMarket) {
  return flight.buckets.filter((bucket) => !bucket.resolved && !bucket.voided);
}

function useProtectChoice(flight: FlightMarket, initial?: Choice) {
  const [amount, setAmount] = useState(initial?.amount ?? "25");
  const parsed = parseAmount(amount);
  const payout = flight.protection ? quoteShares(flight.protection, DELAYED, parsed) : 0n;
  return { amount, setAmount, parsed, payout };
}

function usePredictChoice(flight: FlightMarket, initial?: Choice) {
  const open = openBuckets(flight);
  const initialIndex = open.findIndex(
    (bucket) => bucket.address.toLowerCase() === initial?.bucket?.toLowerCase(),
  );
  const [picked, setPicked] = useState(Math.max(0, initialIndex));
  const [amount, setAmount] = useState(initial?.amount ?? "10");
  const bucket = open[Math.min(picked, open.length - 1)];
  const parsed = parseAmount(amount);
  const payout = bucket ? quoteShares(bucket, ON_TIME, parsed) : 0n;
  const label = bucket ? `${bucket.window} UTC` : "";
  return { open, picked, setPicked, bucket, amount, setAmount, parsed, payout, label };
}

function AmountPicker({
  amount,
  onChange,
  quiet = false,
}: {
  amount: string;
  onChange: (amount: string) => void;
  quiet?: boolean;
}) {
  return (
    <div className="grid w-full grid-cols-4 gap-3">
      {AMOUNTS.map((value) => (
        <Button
          key={value}
          size={quiet ? undefined : "lg"}
          variant={amount === value ? "primary" : quiet ? "ghost" : "secondary"}
          onClick={() => onChange(value)}
        >
          ${value}
        </Button>
      ))}
    </div>
  );
}

function WindowPicker({ choice }: { choice: ReturnType<typeof usePredictChoice> }) {
  return (
    <div className="grid w-full grid-cols-2 gap-3">
      {choice.open.map((option, index) => (
        <Button
          key={option.address}
          size="lg"
          variant={index === choice.picked ? "primary" : "secondary"}
          onClick={() => choice.setPicked(index)}
        >
          {option.window} · {(option.yes * 100).toFixed(0)}¢
        </Button>
      ))}
    </div>
  );
}

/** Pick an amount and buy the Delayed side of the flight's protection pool. */
export function BuyPanel({
  flight,
  initial,
  onBought,
  onError,
}: {
  flight: FlightMarket;
  initial?: Choice;
  onBought: (amount: string, payout: bigint) => void;
  onError: (title: string, message: string) => void;
}) {
  const { buy, pending, stage } = useTransact();
  const choice = useProtectChoice(flight, initial);
  const protection = flight.protection;
  if (!protection) return null;

  const closed = flight.status !== "open";
  const confirm = async () => {
    try {
      await buy(protection.address, DELAYED, choice.parsed, withSlippage(choice.payout));
      onBought(choice.amount, choice.payout);
    } catch (error) {
      const explained = explainError(error);
      onError(explained.title, explained.message);
    }
  };

  return (
    <>
      <AmountPicker amount={choice.amount} onChange={choice.setAmount} />
      <p className="m-0 text-2xl">
        Pays <strong>{formatUsdc(choice.payout)} USDG</strong> if {flight.code} is late
      </p>
      <Button
        variant="primary"
        size="lg"
        block
        loading={pending}
        disabled={closed || choice.parsed <= 0n}
        onClick={() => void confirm()}
      >
        {pending ? STAGE_LABEL[stage] : closed ? "Buying has closed" : `Buy for $${choice.amount}`}
      </Button>
    </>
  );
}

/** Pick an arrival window and buy its Yes side: a trade on when the flight lands. */
export function PredictPanel({
  flight,
  initial,
  onBought,
  onError,
}: {
  flight: FlightMarket;
  initial?: Choice;
  onBought: (window: string, amount: string, payout: bigint) => void;
  onError: (title: string, message: string) => void;
}) {
  const { buy, pending, stage } = useTransact();
  const choice = usePredictChoice(flight, initial);
  const bucket = choice.bucket;
  if (!bucket) return null;

  const closed = flight.status !== "open";
  const confirm = async () => {
    try {
      await buy(bucket.address, ON_TIME, choice.parsed, withSlippage(choice.payout));
      onBought(choice.label, choice.amount, choice.payout);
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
      <WindowPicker choice={choice} />
      <AmountPicker amount={choice.amount} onChange={choice.setAmount} quiet />
      <p className="m-0 text-2xl">
        Pays <strong>{formatUsdc(choice.payout)} USDG</strong> if it lands {choice.label}
      </p>
      <Button
        variant="primary"
        size="lg"
        block
        loading={pending}
        disabled={closed || choice.parsed <= 0n}
        onClick={() => void confirm()}
      >
        {pending
          ? STAGE_LABEL[stage]
          : closed
            ? "Trading has closed"
            : `Trade for $${choice.amount}`}
      </Button>
    </>
  );
}

/** The kiosk's version of the panels: the traveller picks here, and confirms on their phone. */
export function ChoicePanel({
  flight,
  predict,
  onChoose,
}: {
  flight: FlightMarket;
  predict: boolean;
  onChoose: (choice: Choice, summary: string) => void;
}) {
  const protect = useProtectChoice(flight);
  const prediction = usePredictChoice(flight);

  if (predict) {
    if (!prediction.bucket) return null;
    const bucket = prediction.bucket.address;
    return (
      <>
        <p className="m-0" style={muted}>
          Scheduled to arrive {flight.scheduledArrival} UTC. When will it really land?
        </p>
        <WindowPicker choice={prediction} />
        <AmountPicker amount={prediction.amount} onChange={prediction.setAmount} quiet />
        <p className="m-0 text-2xl">
          Pays <strong>{formatUsdc(prediction.payout)} USDG</strong> if it lands {prediction.label}
        </p>
        <Button
          variant="primary"
          size="lg"
          block
          onClick={() =>
            onChoose(
              { amount: prediction.amount, bucket },
              `$${prediction.amount} on ${prediction.label}`,
            )
          }
        >
          Continue with ${prediction.amount}
        </Button>
      </>
    );
  }

  return (
    <>
      <AmountPicker amount={protect.amount} onChange={protect.setAmount} />
      <p className="m-0 text-2xl">
        Pays <strong>{formatUsdc(protect.payout)} USDG</strong> if {flight.code} is late
      </p>
      <Button
        variant="primary"
        size="lg"
        block
        onClick={() => onChoose({ amount: protect.amount }, `$${protect.amount} of cover`)}
      >
        Continue with ${protect.amount}
      </Button>
    </>
  );
}
