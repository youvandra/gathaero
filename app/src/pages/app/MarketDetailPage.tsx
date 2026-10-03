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
  Tag,
  TextField,
  useToast,
} from "cordon-ui";
import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAccount } from "wagmi";

import { STATUS_TONE } from "../../features/dashboard/statusTone";
import { PredictionBuckets } from "../../features/dashboard/PredictionBuckets";
import { ProbabilityPanel } from "../../features/dashboard/ProbabilityPanel";
import { DELAYED, quoteShares, type FlightMarket } from "../../features/market/model";
import { probabilitySeries, useTrades } from "../../features/market/useActivity";
import { useBoardingPass } from "../../features/market/useBoardingPass";
import { pickFlight, useFlights } from "../../features/market/useFlights";
import { useTransact } from "../../features/market/useTransact";
import { formatUsdc, parseAmount, usd, withSlippage } from "../../lib/format";

type Tab = "protection" | "prediction";

function CardTitle({ children }: { children: string }) {
  return (
    <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>{children}</h2>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span style={{ color: "var(--cordon-copy)" }}>{label}</span>
      <strong style={{ color: "var(--cordon-ink)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </strong>
    </div>
  );
}

function Notice({ title, tone, children }: { title: string; tone: string; children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--cordon-radius-3)] border p-4"
      style={{ borderColor: "var(--cordon-hairline)", background: "var(--cordon-paper-raised)" }}
    >
      <span style={{ color: tone, fontWeight: 600 }}>{title}</span>
      {children}
    </div>
  );
}

const caption = { color: "var(--cordon-copy)", fontSize: "var(--cordon-size-caption)" } as const;

function outcomeLine(market: FlightMarket): string {
  if (market.delayMinutes === null) return "";
  if (market.delayMinutes <= 0) return `Landed ${Math.abs(market.delayMinutes)} min early`;
  return `Landed ${market.delayMinutes} min late`;
}

export function MarketDetailPage() {
  const { code = "" } = useParams<{ code: string }>();
  const { flights, isLoading } = useFlights();
  const market = pickFlight(flights, code);

  if (!market) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title={isLoading ? "Loading market…" : `No market for ${code.toUpperCase()}`}
            description={isLoading ? undefined : "Only listed flights can be traded."}
          />
        </CardBody>
      </Card>
    );
  }

  return <MarketDetail market={market} />;
}

function MarketDetail({ market }: { market: FlightMarket }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { isConnected } = useAccount();
  const { buy, refund, pending } = useTransact();

  const [tab, setTab] = useState<Tab>("protection");
  const [buyOpen, setBuyOpen] = useState(false);
  const [amount, setAmount] = useState("10");
  const [passOpen, setPassOpen] = useState(false);
  const [reference, setReference] = useState("");

  const { isVerified, verify } = useBoardingPass();
  const verified = isVerified(market.code);

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
      });
      setBuyOpen(false);
    } catch (error) {
      notify({
        tone: "critical",
        title: "Could not buy protection",
        children: error instanceof Error ? error.message.split("\n")[0] : "Try again",
      });
    }
  };

  const confirmVerify = () => {
    if (reference.trim().length < 5) {
      notify({ tone: "caution", title: "Enter a valid booking reference" });
      return;
    }
    verify(market.code, reference.trim().toUpperCase());
    notify({
      tone: "positive",
      title: "Boarding pass verified",
      children: `${market.code} · insurable interest confirmed`,
    });
    setPassOpen(false);
  };

  const confirmRefund = async () => {
    if (!protection) return;
    try {
      await refund(protection.address);
      notify({ tone: "positive", title: "Refund claimed", children: `${market.code} · unwound` });
    } catch (error) {
      notify({
        tone: "critical",
        title: "Nothing to refund",
        children: error instanceof Error ? error.message.split("\n")[0] : "Try again",
      });
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
    if (market.status === "awaiting") {
      return (
        <Notice title="Landed · awaiting oracle" tone="var(--cordon-ink)">
          <span style={caption}>
            Trading is closed. The market settles as soon as the arrival is reported.
          </span>
        </Notice>
      );
    }
    if (!verified) {
      return (
        <Notice title="Verify your boarding pass" tone="var(--cordon-ink)">
          <span style={caption}>
            Protection is a hedge, so you must be a passenger on this flight — insurable interest.
            Verify to unlock buying.
          </span>
          <Button variant="secondary" block onClick={() => setPassOpen(true)}>
            Verify boarding pass
          </Button>
        </Notice>
      );
    }
    return (
      <>
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-caption)" }}>
            Passenger
          </span>
          <Tag tone="positive" dot>
            Verified
          </Tag>
        </div>
        <Button
          variant="primary"
          block
          disabled={!isConnected || !protection}
          onClick={() => setBuyOpen(true)}
        >
          {isConnected ? "Buy protection" : "Connect wallet to buy"}
        </Button>
      </>
    );
  })();

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
        <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-caption)" }}>
          Markets
        </span>
      </div>

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
                  arrival.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Row label="Scheduled (UTC)" value={market.scheduledArrival} />
                <Row label="Day" value={market.date} />
                <Row label="Windows" value={market.buckets.length.toString()} />
                <Row label="Open interest" value={usd(market.openInterest, 0)} />
              </div>
              <BarChart
                data={market.buckets.map((bucket) => ({
                  label: `${bucket.from}–${bucket.to}`,
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
                Each row is a window for the actual touchdown time (UTC). Yes pays 1 USDG if the
                flight lands inside it.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

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
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody>
            <Row
              label="Scheduled arrival"
              value={`${market.date} · ${market.scheduledArrival} UTC`}
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
            <Button variant="primary" loading={pending} onClick={confirmBuy}>
              Confirm
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField
            inputMode="decimal"
            prefix="USDG"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
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
            <Button variant="ghost" onClick={() => setPassOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmVerify}>
              Verify
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField
            placeholder="Booking reference — e.g. ABC123"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
          <p
            style={{
              margin: 0,
              color: "var(--cordon-copy-dim)",
              fontSize: "var(--cordon-size-caption)",
            }}
          >
            We confirm you are a passenger on this flight. This enforces insurable interest —
            nothing else is stored on-chain.
          </p>
        </div>
      </Modal>
    </>
  );
}
