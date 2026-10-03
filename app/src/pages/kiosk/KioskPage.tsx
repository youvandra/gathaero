import { Button, CordonProvider, Loader, Tag } from "cordon-ui";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Hex } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { targetChain } from "../../config/chains";
import { env } from "../../config/env";
import { checkPassForMarket, parseBoardingPass } from "../../features/boarding/bcbp";
import { BoardingPassScanner } from "../../features/boarding/BoardingPassScanner";
import { useCollateralBalance } from "../../features/market/useBalance";
import { requestAttestation } from "../../features/market/useBoardingPass";
import { DELAYED, quoteShares, type FlightMarket } from "../../features/market/model";
import { useFlights } from "../../features/market/useFlights";
import { STAGE_LABEL, useTransact } from "../../features/market/useTransact";
import { RequireWallet } from "../../features/wallet/RequireWallet";
import { passRegistryAbi } from "../../lib/abi";
import { explainError } from "../../lib/errors";
import {
  formatCountdown,
  formatUsdc,
  parseAmount,
  shortenAddress,
  withSlippage,
} from "../../lib/format";
import { useNow } from "../../lib/hooks/useNow";
import { usePageTitle } from "../../lib/hooks/usePageTitle";

const AMOUNTS = ["10", "25", "50", "100"];
const RESET_SECONDS = 20;

type Step =
  | { kind: "scan" }
  | { kind: "working"; label: string }
  | { kind: "problem"; title: string; message: string }
  | { kind: "buy"; flightId: Hex; passenger: string; seat: string }
  | { kind: "done"; flightId: Hex; amount: string; payout: bigint };

const muted = { color: "var(--cordon-copy)" } as const;

function Shell({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const balance = useCollateralBalance();
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--cordon-paper)", color: "var(--cordon-ink)" }}
    >
      <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <span className="text-xl font-semibold">gathæro</span>
        <span className="flex items-center gap-3 text-sm" style={muted}>
          {address ? <span>{shortenAddress(address)}</span> : null}
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {balance === undefined ? "…" : formatUsdc(balance)} USDG
          </span>
          <Link to="/app" style={{ color: "var(--cordon-copy)" }}>
            Exit kiosk
          </Link>
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-10 sm:px-10">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
          {children}
        </div>
      </main>
    </div>
  );
}

function Big({ children }: { children: ReactNode }) {
  return (
    <h1
      className="m-0 text-balance"
      style={{ fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 700, lineHeight: 1.05 }}
    >
      {children}
    </h1>
  );
}

function FlightCard({ flight, now }: { flight: FlightMarket; now: number }) {
  const closesIn = flight.departureTimestamp - now;
  return (
    <div
      className="grid w-full grid-cols-3 gap-4 rounded-[var(--cordon-radius-5)] border p-6 text-left"
      style={{ borderColor: "var(--cordon-hairline)", background: "var(--cordon-paper-raised)" }}
    >
      {[
        ["Flight", flight.code],
        ["Route", flight.route],
        ["Departs (UTC)", `${flight.scheduledDeparture}`],
        ["Delay odds", `${(flight.delayProbability * 100).toFixed(0)}%`],
        ["Pays if late by", `${flight.thresholdMinutes}+ min`],
        ["Buying closes in", closesIn > 0 ? formatCountdown(closesIn) : "closed"],
      ].map(([label, value]) => (
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
          <span style={{ fontSize: 24, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Kiosk() {
  usePageTitle("Kiosk");
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const { flights } = useFlights();
  const { buy, registerPass, pending, stage } = useTransact();
  const now = useNow(1000);

  const [step, setStep] = useState<Step>({ kind: "scan" });
  const [amount, setAmount] = useState("25");
  const [resetAt, setResetAt] = useState<number | null>(null);

  const reset = useCallback(() => {
    setStep({ kind: "scan" });
    setAmount("25");
    setResetAt(null);
  }, []);

  useEffect(() => {
    if (resetAt !== null && now >= resetAt) reset();
  }, [now, resetAt, reset]);

  const problem = (title: string, message: string) => setStep({ kind: "problem", title, message });

  const handleScan = useCallback(
    async (text: string) => {
      const pass = parseBoardingPass(text);
      if (!pass) {
        problem(
          "That isn't a boarding pass",
          "Scan the barcode on your boarding pass or in your airline app.",
        );
        return;
      }
      const flight = flights.find((f) => f.status === "open" && checkPassForMarket(pass, f).ok);
      if (!flight) {
        problem(
          `${pass.flight} isn't open right now`,
          `We couldn't find an open market for ${pass.flight} ${pass.from} → ${pass.to}. Buying closes at departure.`,
        );
        return;
      }
      if (!address || !publicClient) return;

      try {
        setStep({ kind: "working", label: "Checking your boarding pass…" });
        const verified = await publicClient.readContract({
          address: env.contracts.passRegistry,
          abi: passRegistryAbi,
          functionName: "isPassenger",
          args: [flight.id, address],
        });
        if (!verified) {
          const attestation = await requestAttestation(flight.id, address, text);
          setStep({ kind: "working", label: "Confirm in your wallet to link this pass" });
          await registerPass(
            flight.id,
            attestation.passHash,
            BigInt(attestation.expiry),
            attestation.signature,
          );
        }
        setStep({ kind: "buy", flightId: flight.id, passenger: pass.passenger, seat: pass.seat });
      } catch (error) {
        const explained = explainError(error);
        problem(explained.title, explained.message);
      }
    },
    [address, flights, publicClient, registerPass],
  );

  const onUnreadable = useCallback(
    () => problem("No barcode found", "Hold the whole barcode inside the frame and try again."),
    [],
  );

  if (step.kind === "scan") {
    return (
      <Shell>
        <Tag tone="info" dot>
          Flights from Singapore Changi
        </Tag>
        <Big>Protect your flight from delays</Big>
        <p className="m-0 text-lg" style={muted}>
          Scan your boarding pass. If you land 30+ minutes late, you're paid automatically.
        </p>
        <div className="w-full max-w-md">
          <BoardingPassScanner
            onScan={(text) => void handleScan(text)}
            onUnreadable={onUnreadable}
          />
        </div>
      </Shell>
    );
  }

  if (step.kind === "working") {
    return (
      <Shell>
        <Loader label={pending ? STAGE_LABEL[stage] || step.label : step.label} />
        <Big>{pending ? STAGE_LABEL[stage] || step.label : step.label}</Big>
      </Shell>
    );
  }

  if (step.kind === "problem") {
    return (
      <Shell>
        <Big>{step.title}</Big>
        <p className="m-0 text-lg" style={muted}>
          {step.message}
        </p>
        <Button variant="primary" size="lg" onClick={reset}>
          Scan again
        </Button>
      </Shell>
    );
  }

  const flight = flights.find((f) => f.id === step.flightId);
  if (!flight?.protection) {
    return (
      <Shell>
        <Loader label="Loading flight" />
      </Shell>
    );
  }

  if (step.kind === "done") {
    return (
      <Shell>
        <Tag tone="positive" dot>
          Protected
        </Tag>
        <Big>You're covered on {flight.code}</Big>
        <p className="m-0 text-xl">
          If {flight.code} lands {flight.thresholdMinutes}+ minutes late, you receive{" "}
          <strong>{formatUsdc(step.payout)} USDG</strong>, paid automatically after landing.
        </p>
        <p className="m-0" style={muted}>
          Paid {step.amount} USDG · next traveller in{" "}
          {resetAt !== null ? Math.max(0, resetAt - now) : RESET_SECONDS}s
        </p>
        <Button variant="secondary" size="lg" onClick={reset}>
          Next traveller
        </Button>
      </Shell>
    );
  }

  const protection = flight.protection;
  const parsed = parseAmount(amount);
  const payout = quoteShares(protection, DELAYED, parsed);
  const closed = flight.status !== "open";

  const confirm = async () => {
    try {
      await buy(protection.address, DELAYED, parsed, withSlippage(payout));
      setStep({ kind: "done", flightId: flight.id, amount, payout });
      setResetAt(Math.floor(Date.now() / 1000) + RESET_SECONDS);
    } catch (error) {
      const explained = explainError(error);
      problem(explained.title, explained.message);
    }
  };

  return (
    <Shell>
      <p className="m-0 text-lg" style={muted}>
        Welcome, {step.passenger}
        {step.seat ? ` · seat ${step.seat}` : ""}
      </p>
      <Big>How much cover do you want?</Big>
      <FlightCard flight={flight} now={now} />
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
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <Button variant="ghost" size="lg" block onClick={reset} disabled={pending}>
          Cancel
        </Button>
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
      </div>
    </Shell>
  );
}

export function KioskPage() {
  return (
    <CordonProvider glaze="rose" className="min-h-screen">
      <RequireWallet>
        <Kiosk />
      </RequireWallet>
    </CordonProvider>
  );
}
