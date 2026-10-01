import {
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
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
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

import { ProbabilityPanel } from "../../features/dashboard/ProbabilityPanel";
import { PredictionBuckets } from "../../features/dashboard/PredictionBuckets";
import { DEFAULT_MARKET_CODE, findMarket } from "../../features/dashboard/mockMarkets";
import {
  flightIdOf,
  isConfigured,
  useBuyProtection,
  useMarketAddress,
  useMarketState,
} from "../../features/market/useFlightMarket";
import { useBoardingPass } from "../../features/market/useBoardingPass";
import { formatUsdc } from "../../lib/format";

type Tab = "protection" | "prediction";

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
      <strong style={{ color: "var(--cordon-ink)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </strong>
    </div>
  );
}

export function MarketDetailPage() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const market = findMarket(code ?? DEFAULT_MARKET_CODE);
  const { notify } = useToast();

  const { isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("protection");
  const [buyOpen, setBuyOpen] = useState(false);
  const [amount, setAmount] = useState("6.20");
  const [passOpen, setPassOpen] = useState(false);
  const [reference, setReference] = useState("");

  const { isVerified, verify } = useBoardingPass();
  const verified = isVerified(market.code);

  const onChain = market.code === DEFAULT_MARKET_CODE;
  const flightId = flightIdOf(market.code, market.isoDate);
  const marketAddress = useMarketAddress(flightId);
  const state = useMarketState(marketAddress);
  const { buy, isPending } = useBuyProtection(marketAddress);

  const live = onChain && isConfigured && Boolean(marketAddress);
  const probability =
    live && state.probability ? Number(state.probability) / 1e18 : market.delayProbability;

  const premium = Number(amount) || 0;
  const payout = probability > 0 ? premium / probability : 0;

  const confirmBuy = async () => {
    const parsed = parseUnits(amount || "0", 6);
    if (parsed <= 0n) {
      notify({ tone: "caution", title: "Enter an amount first" });
      return;
    }
    try {
      await buy(parsed);
      notify({
        tone: "positive",
        title: "Protection submitted",
        children: `${amount} USDC on ${market.code}`,
      });
      setBuyOpen(false);
    } catch (error) {
      notify({
        tone: "critical",
        title: "Could not buy protection",
        children: error instanceof Error ? error.message : "Try again",
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
              <Tag tone={live ? "positive" : "neutral"} dot>
                {live ? "Live" : "Demo"}
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
                  <Row label="Premium" value={`${market.premium.toFixed(2)} per 100`} />
                  <Row
                    label="Pays if delayed"
                    value={probability > 0 ? `${(1 / probability).toFixed(1)}x` : "—"}
                  />
                  <Row label="Buy window" value="closes at landing" />
                </div>
                {verified ? (
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
                    <Button
                      variant="primary"
                      block
                      disabled={!isConnected || !marketAddress}
                      onClick={() => setBuyOpen(true)}
                    >
                      Buy protection
                    </Button>
                  </>
                ) : (
                  <div
                    className="flex flex-col gap-3 rounded-[var(--cordon-radius-3)] border p-4"
                    style={{
                      borderColor: "var(--cordon-hairline)",
                      background: "var(--cordon-paper-raised)",
                    }}
                  >
                    <span style={{ color: "var(--cordon-ink)", fontWeight: 600 }}>
                      Verify your boarding pass
                    </span>
                    <span
                      style={{
                        color: "var(--cordon-copy)",
                        fontSize: "var(--cordon-size-caption)",
                      }}
                    >
                      Protection is a hedge, so you must be a passenger on this flight —
                      insurable interest. Verify to unlock buying.
                    </span>
                    <Button variant="secondary" block onClick={() => setPassOpen(true)}>
                      Verify boarding pass
                    </Button>
                  </div>
                )}
                <p
                  style={{
                    margin: 0,
                    color: "var(--cordon-copy-dim)",
                    fontSize: "var(--cordon-size-caption)",
                  }}
                >
                  A hedge, not a bet. It pays when the flight is delayed past the threshold
                  and locks the moment the flight lands or the delay is announced.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Row label="Scheduled ATA" value={market.scheduledArrival} />
                <Row label="Expected ATA" value={market.expectedAta} />
                <Row label="Day" value={market.date} />
                <Row label="Open interest" value={`$${market.openInterest.toLocaleString()}`} />
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
              <PredictionBuckets
                flightId={flightId}
                date={market.isoDate}
                buckets={market.buckets}
              />
              <p
                style={{
                  margin: 0,
                  color: "var(--cordon-copy-dim)",
                  fontSize: "var(--cordon-size-caption)",
                }}
              >
                Each row is a window for the actual touchdown time. Yes pays if the flight
                lands inside it; positions stay tradeable until the wheels touch down.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Delay probability · 24h</CardTitle>
          </CardHeader>
          <div className="px-5 pb-5">
            <LineChart
              series={[
                { id: "prob", values: market.history.map((value) => value / 100), glaze: "ember" },
              ]}
              height={180}
              format={(value) => `${(value * 100).toFixed(0)}%`}
              label="Delay probability"
            />
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody>
            <Row label="Delay threshold" value="> 2h" />
            <Row label="Premium" value={`${market.premium.toFixed(2)} / 100`} />
            <Row label="Volume" value={`$${market.volume.toLocaleString()}`} />
            <Row label="Status" value={market.status} />
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
            <Button variant="primary" loading={isPending} onClick={confirmBuy}>
              Confirm
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <TextField
            inputMode="decimal"
            prefix="USDC"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <Row label="You pay" value={`${formatUsdc(parseUnits(amount || "0", 6))} USDC`} />
          <Row label="Pays if delayed" value={`~${payout.toFixed(0)} USDC`} />
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
