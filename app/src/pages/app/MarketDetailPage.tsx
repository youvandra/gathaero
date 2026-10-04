import {
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LineChart,
  Modal,
  Segmented,
  Skeleton,
  Tag,
  TextField,
  useToast,
} from "cordon-ui";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";

import { checkPassForMarket, parseBoardingPass } from "../../features/boarding/bcbp";
import { BoardingPassScanner } from "../../features/boarding/BoardingPassScanner";
import { demoPassFor } from "../../features/boarding/demoPass";
import { STATUS_TONE } from "../../features/dashboard/statusTone";
import { PredictionBuckets } from "../../features/dashboard/PredictionBuckets";
import { ProbabilityPanel } from "../../features/dashboard/ProbabilityPanel";
import { ContractsSheet } from "../../features/market/ContractsSheet";
import {
  actualArrival,
  DELAYED,
  MAX_STAKE,
  quoteShares,
  type FlightMarket,
} from "../../features/market/model";
import { probabilitySeries, useTrades } from "../../features/market/useActivity";
import { requestAttestation, usePassenger } from "../../features/market/useBoardingPass";
import { pickFlight, useFlights } from "../../features/market/useFlights";
import { useCollateralBalance } from "../../features/market/useBalance";
import { STAGE_LABEL, useTransact } from "../../features/market/useTransact";
import { env } from "../../config/env";
import { passRegistryAbi } from "../../lib/abi";
import { formatCountdown, formatUsdc, parseAmount, usd, withSlippage } from "../../lib/format";
import { useNow } from "../../lib/hooks/useNow";
import { usePageTitle } from "../../lib/hooks/usePageTitle";
import { errorToast } from "../../lib/errors";

type Tab = "protection" | "prediction";

function CardTitle({ children }: { children: string }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: "var(--cordon-size-title)",
        fontWeight: 600,
      }}
    >
      {children}
    </h2>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span style={{ color: "var(--cordon-copy)" }}>{label}</span>
      <strong
        style={{
          color: "var(--cordon-ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Notice({ title, tone, children }: { title: string; tone: string; children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--cordon-radius-3)] border p-4"
      style={{
        borderColor: "var(--cordon-hairline)",
        background: "var(--cordon-paper-raised)",
      }}
    >
      <span style={{ color: tone, fontWeight: 600 }}>{title}</span>
      {children}
    </div>
  );
}

const caption = {
  color: "var(--cordon-copy)",
  fontSize: "var(--cordon-size-caption)",
} as const;

function outcomeLine(market: FlightMarket): string {
  if (market.delayMinutes === null) return "";
  if (market.delayMinutes <= 0) return `Landed ${Math.abs(market.delayMinutes)} min early`;
  return `Landed ${market.delayMinutes} min late`;
}

const QUICK_AMOUNTS = ["10", "25", "50", "100"];

function DetailSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading market">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Skeleton width={180} height={20} />
          <Skeleton width={160} height={30} />
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between">
              <Skeleton width={110} height={44} />
              <Skeleton width={110} height={44} />
            </div>
            <Skeleton width="100%" height={10} />
            <Skeleton variant="text" lines={2} />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton variant="text" lines={3} />
            <Skeleton width="100%" height={44} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function MarketDetailPage() {
  const navigate = useNavigate();
  const { code = "" } = useParams<{ code: string }>();
  const { flights, isLoading, error, refetch } = useFlights();
  const [params] = useSearchParams();
  const market = pickFlight(flights, code, params.get("id"));
  usePageTitle(code.toUpperCase());

  if (!market) {
    if (isLoading) return <DetailSkeleton />;
    return (
      <Card>
        <CardBody>
          {error ? (
            <EmptyState
              icon="warning"
              title="Couldn't load this market"
              description="The network didn't answer. Check your connection, then try again."
              action={
                <Button variant="secondary" size="sm" iconStart="refresh" onClick={refetch}>
                  Try again
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="search"
              title={`No market for ${code.toUpperCase()}`}
              description="Only listed flights can be traded. Check the flight number or pick one from the list."
              action={
                <Button variant="secondary" size="sm" onClick={() => navigate("/app/market")}>
                  Browse markets
                </Button>
              }
            />
          )}
        </CardBody>
      </Card>
    );
  }

  return <MarketDetail market={market} />;
}

function MarketDetail({ market }: { market: FlightMarket }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { isConnected, address } = useAccount();
  const { buy, refund, registerPass, pending, stage } = useTransact();
  const balance = useCollateralBalance();
  const now = useNow();

  const [tab, setTab] = useState<Tab>("protection");
  const [buyOpen, setBuyOpen] = useState(false);
  const [amount, setAmount] = useState("10");
  const [passOpen, setPassOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [contractsOpen, setContractsOpen] = useState(false);

  const { isPassenger, gated, isLoading: passLoading } = usePassenger(market.id);
  // Trading on an open flight is for its passengers. The check lives on-chain per wallet,
  // so a verified wallet goes straight to the market on every visit.
  const needsPass = market.status === "open" && gated && !isPassenger;

  const protection = market.protection;
  const { data: trades = [] } = useTrades(protection ? [protection.address] : []);
  const history = protection
    ? probabilitySeries(trades, protection.address, market.delayProbability)
    : [];

  const settledProbability =
    market.status === "delayed" ? 1 : market.status === "on time" ? 0 : null;
  const probability = settledProbability ?? market.delayProbability;
  const parsedAmount = parseAmount(amount);
  const payout = protection ? quoteShares(protection, DELAYED, parsedAmount) : 0n;

  const { data: staked = 0n } = useReadContract({
    address: env.contracts.passRegistry,
    abi: passRegistryAbi,
    functionName: "staked",
    args: address ? [market.id, address] : undefined,
    query: { enabled: Boolean(address && buyOpen) },
  });
  const room = MAX_STAKE > staked ? MAX_STAKE - staked : 0n;
  const amountIssue =
    parsedAmount <= 0n
      ? "Enter an amount."
      : parsedAmount > room
        ? `You can add up to ${formatUsdc(room)} USDG more on this flight (200 USDG per flight, across every market).`
        : balance !== undefined && parsedAmount > balance
          ? "Not enough USDG. Tap your balance at the top to get test USDG."
          : null;

  const confirmBuy = async () => {
    if (!protection) return;
    if (parsedAmount <= 0n) {
      notify({ tone: "caution", title: "Enter an amount first" });
      return;
    }
    try {
      await buy(protection.address, DELAYED, parsedAmount, withSlippage(payout));
      notify({
        tone: "positive",
        title: "Protection bought",
        children: `${amount} USDG on ${market.code} · pays ${formatUsdc(payout)} if delayed`,
        action: (
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/positions")}>
            View
          </Button>
        ),
      });
      setBuyOpen(false);
    } catch (error) {
      notify(errorToast(error));
    }
  };

  const handleScan = useCallback(
    async (text: string) => {
      setPassOpen(false);
      const pass = parseBoardingPass(text);
      if (!pass) {
        notify({
          tone: "caution",
          title: "That isn't a boarding pass barcode",
          children:
            "Scan the barcode or QR code printed on your boarding pass or shown in your airline app.",
        });
        return;
      }
      const check = checkPassForMarket(pass, market);
      if (!check.ok) {
        notify({
          tone: "caution",
          title: "Boarding pass doesn't match",
          children: check.reason,
        });
        return;
      }
      if (!address) return;

      setChecking(true);
      try {
        const attestation = await requestAttestation(market.id, address, text);
        await registerPass(
          market.id,
          attestation.passHash,
          BigInt(attestation.expiry),
          attestation.signature,
        );
        notify({
          tone: "positive",
          title: "Boarding pass verified",
          children: `${attestation.passenger} · ${attestation.flight}${attestation.seat ? ` · seat ${attestation.seat}` : ""}`,
        });
      } catch (error) {
        notify(errorToast(error));
      } finally {
        setChecking(false);
      }
    },
    [address, market, notify, registerPass],
  );

  const handleUnreadable = useCallback(
    () =>
      notify({
        tone: "caution",
        title: "No barcode found",
        children: "Use a sharp photo where the whole barcode is visible, then try again.",
      }),
    [notify],
  );

  const confirmRefund = async () => {
    if (!protection) return;
    try {
      await refund(protection.address);
      notify({
        tone: "positive",
        title: "Refund claimed",
        children: `${market.code} · unwound`,
      });
    } catch (error) {
      notify(errorToast(error));
    }
  };

  const action = (() => {
    if (market.status === "voided") {
      return (
        <Notice title="Market voided · force majeure" tone="var(--cordon-critical)">
          <span style={caption}>
            The flight was cancelled or diverted. Premiums are refunded and LP principal is returned
            — no payout.
          </span>
          <Button
            variant="primary"
            block
            loading={pending}
            disabled={!isConnected}
            onClick={() => {
              void confirmRefund();
            }}
          >
            Claim refund
          </Button>
        </Notice>
      );
    }
    if (market.status === "delayed" || market.status === "on time") {
      return (
        <Notice
          title={`${outcomeLine(market)} · ${market.status === "delayed" ? "protection pays" : "protection expired"}`}
          tone={market.status === "delayed" ? "var(--cordon-critical)" : "var(--cordon-positive)"}
        >
          <span style={caption}>
            Settled on-chain from the oracle report. Winning positions redeem 1 USDG per share.
          </span>
          <Button variant="secondary" block onClick={() => navigate("/app/positions")}>
            Go to positions
          </Button>
        </Notice>
      );
    }
    if (market.status === "in flight") {
      return (
        <Notice title="In the air · trading closed" tone="var(--cordon-ink)">
          <span style={caption}>
            Trading closed at departure, while the arrival was still unknown. The market settles
            after landing.
          </span>
        </Notice>
      );
    }
    if (market.status === "awaiting") {
      return (
        <Notice title="Landed · awaiting oracle" tone="var(--cordon-ink)">
          <span style={caption}>
            Trading is closed. The market settles as soon as the arrival is reported.
          </span>
        </Notice>
      );
    }
    return (
      <>
        <div className="flex items-center justify-between">
          <span
            style={{
              color: "var(--cordon-copy-dim)",
              fontSize: "var(--cordon-size-caption)",
            }}
          >
            Passenger
          </span>
          <Tag tone="positive" dot>
            Verified
          </Tag>
        </div>
        <Button variant="primary" block disabled={!protection} onClick={() => setBuyOpen(true)}>
          Buy protection
        </Button>
      </>
    );
  })();

  const passGate = (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{`${market.code} · ${market.route}`}</CardTitle>
          <Tag tone={STATUS_TONE[market.status]} dot>
            {market.status}
          </Tag>
        </div>
      </CardHeader>
      <CardBody>
        <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-6 text-center">
          <div className="flex flex-col gap-2">
            <h3
              style={{
                margin: 0,
                fontSize: "var(--cordon-size-title)",
                fontWeight: 600,
              }}
            >
              Verify your boarding pass to trade
            </h3>
            <p style={{ margin: 0, color: "var(--cordon-copy)" }}>
              Protection and predictions on {market.code} are open to passengers of this flight.
              Verify once and this wallet stays verified, on-chain.
            </p>
          </div>
          <ol className="flex w-full flex-col gap-2 text-left" style={{ margin: 0, padding: 0 }}>
            {[
              "Scan the barcode or QR code with your camera, or upload a photo of it.",
              `We match it to ${market.code} · ${market.route} · ${market.date}.`,
              "Confirm one transaction that links the pass to your wallet.",
            ].map((step, index) => (
              <li
                key={step}
                className="flex gap-3 rounded-[var(--cordon-radius-3)] border p-3"
                style={{
                  listStyle: "none",
                  borderColor: "var(--cordon-hairline)",
                  background: "var(--cordon-paper-raised)",
                  color: "var(--cordon-copy)",
                  fontSize: "var(--cordon-size-caption)",
                }}
              >
                <strong style={{ color: "var(--cordon-ink)" }}>{index + 1}</strong>
                {step}
              </li>
            ))}
          </ol>
          <Button variant="primary" block loading={checking} onClick={() => setPassOpen(true)}>
            {checking
              ? pending
                ? STAGE_LABEL[stage]
                : "Checking your pass…"
              : "Scan boarding pass"}
          </Button>
          <span style={caption}>
            Each boarding pass links to one wallet. Only a hash of your booking is stored.
          </span>
        </div>
      </CardBody>
    </Card>
  );

  const tradeCard = (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>{`${market.code} · ${market.route}`}</CardTitle>
            <Tag tone={STATUS_TONE[market.status]} dot>
              {market.status}
            </Tag>
          </div>
          <Segmented
            value={tab}
            onValueChange={(value) => setTab(value as Tab)}
            options={[
              { value: "protection", label: "Protection" },
              { value: "prediction", label: "Predictions" },
            ]}
          />
        </div>
      </CardHeader>

      <CardBody>
        {tab === "protection" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ProbabilityPanel probability={probability} />
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {market.status === "open" ? (
                  <Row
                    label="Trading closes in"
                    value={formatCountdown(market.departureTimestamp - now)}
                  />
                ) : null}
                <Row label="Premium" value={`${(probability * 100).toFixed(2)} per 100`} />
                <Row
                  label="Pays if delayed"
                  value={probability > 0 ? `${(1 / probability).toFixed(1)}x` : "—"}
                />
                <Row label="Delayed means" value={`> ${market.thresholdMinutes} min late`} />
              </div>
              {action}
              <p
                style={{
                  margin: 0,
                  color: "var(--cordon-copy-dim)",
                  fontSize: "var(--cordon-size-caption)",
                }}
              >
                A hedge, not a bet. It pays when the flight lands more than{" "}
                {market.thresholdMinutes} minutes late and trading closes at the scheduled
                departure.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Row label="Arrives (UTC)" value={market.scheduledArrival} />
              <Row label="Day" value={market.date} />
              <Row label="Windows" value={market.buckets.length.toString()} />
              <Row label="Open interest" value={usd(market.openInterest, 0)} />
            </div>
            <BarChart
              data={market.buckets.map((bucket) => ({
                label: bucket.window,
                value: bucket.yes * 100,
                glaze: "violet" as const,
              }))}
              height={170}
              format={(value) => `${value.toFixed(0)}%`}
              label="Arrival distribution"
            />
            <PredictionBuckets buckets={market.buckets} closed={market.status !== "open"} />
            <p
              style={{
                margin: 0,
                color: "var(--cordon-copy-dim)",
                fontSize: "var(--cordon-size-caption)",
              }}
            >
              Each row is a window for the actual arrival time at the gate (UTC). Yes pays 1 USDG if
              the flight arrives inside it. Trading closes at departure.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );

  const insights = (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Delay probability · by trade</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5">
          <LineChart
            series={[{ id: "prob", values: history, glaze: "ember" }]}
            height={180}
            format={(value) => `${(value * 100).toFixed(1)}%`}
            label="Delay probability"
          />
        </div>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Details</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              iconEnd="arrow-right"
              onClick={() => setContractsOpen(true)}
            >
              Contracts
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <Row
            label="Departs · trading closes"
            value={`${market.date} · ${market.scheduledDeparture} UTC`}
          />
          <Row label="Scheduled arrival" value={`${market.scheduledArrival} UTC`} />
          <Row
            label="Actual arrival (gate)"
            value={actualArrival(market) ? `${actualArrival(market)} UTC` : "Not reported yet"}
          />
          <Row label="Delay threshold" value={`> ${market.thresholdMinutes} min`} />
          <Row label="Volume" value={usd(market.volume)} />
          <Row label="Locked" value={usd(market.openInterest)} />
          <Row
            label="Oracle"
            value={market.delayMinutes === null ? "pending" : outcomeLine(market)}
          />
        </CardBody>
      </Card>
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          iconStart="chevron-left"
          aria-label="Back to markets"
          onClick={() => navigate("/app/market")}
        />
        <span
          style={{
            color: "var(--cordon-copy-dim)",
            fontSize: "var(--cordon-size-caption)",
          }}
        >
          Markets
        </span>
      </div>

      {passLoading && market.status === "open" ? (
        <Card>
          <CardBody>
            <EmptyState title="Checking your boarding pass…" />
          </CardBody>
        </Card>
      ) : needsPass ? (
        passGate
      ) : (
        <>
          {tradeCard}
          {insights}
        </>
      )}

      <Modal
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        title="Buy protection"
        description={`${market.code} · ${market.route} · ${market.date}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBuyOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={!pending && amountIssue !== null}
              onClick={confirmBuy}
            >
              {pending ? STAGE_LABEL[stage] : "Confirm"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField
            id="buy-amount"
            inputMode="decimal"
            prefix="USDG"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_AMOUNTS.map((quick) => (
              <Button
                key={quick}
                variant={amount === quick ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setAmount(quick)}
              >
                {quick}
              </Button>
            ))}
            <span className="ml-auto" style={caption}>
              Balance {balance === undefined ? "…" : formatUsdc(balance)} USDG
            </span>
          </div>
          {amountIssue && parsedAmount > 0n ? (
            <span role="alert" style={{ ...caption, color: "var(--cordon-critical)" }}>
              {amountIssue}
            </span>
          ) : null}
          <Row label="You pay" value={`${formatUsdc(parsedAmount)} USDG`} />
          <Row label="Pays if delayed" value={`${formatUsdc(payout)} USDG`} />
          <Row label="Implied delay" value={`${(probability * 100).toFixed(1)}%`} />
        </div>
      </Modal>

      <Modal
        open={passOpen}
        onClose={() => setPassOpen(false)}
        title="Verify boarding pass"
        description={`${market.code} · ${market.route} · ${market.date}`}
        footer={
          <>
            {env.demoPass ? (
              <Button
                variant="secondary"
                loading={checking}
                onClick={() => void handleScan(demoPassFor(market).barcode)}
              >
                Use a demo pass
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setPassOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {passOpen ? (
            <BoardingPassScanner
              onScan={(text) => void handleScan(text)}
              onUnreadable={handleUnreadable}
            />
          ) : null}
          <p
            style={{
              margin: 0,
              color: "var(--cordon-copy-dim)",
              fontSize: "var(--cordon-size-caption)",
            }}
          >
            We check the barcode against this flight, then you confirm one transaction that links
            this pass to your wallet. Only a hash of your booking is stored on-chain.
            {env.demoPass
              ? " No boarding pass? On testnet, Use a demo pass generates one for this flight."
              : ""}
          </p>
        </div>
      </Modal>
      <ContractsSheet
        market={market}
        open={contractsOpen}
        onClose={() => setContractsOpen(false)}
      />
    </>
  );
}
