import { Button, Tag, TextField, useToast } from "cordon-ui";
import { useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

import { DELAYED, ON_TIME, type Bucket } from "../market/model";
import { useTransact } from "../market/useTransact";

function BucketRow({ bucket, amount }: { bucket: Bucket; amount: string }) {
  const { isConnected } = useAccount();
  const { notify } = useToast();
  const { buy, pending } = useTransact();

  const settled = bucket.resolved || bucket.voided;

  const trade = async (outcome: number) => {
    const parsed = parseUnits(amount || "0", 6);
    if (parsed <= 0n) {
      notify({ tone: "caution", title: "Enter a stake first" });
      return;
    }
    try {
      await buy(bucket.address, outcome, parsed);
      notify({
        tone: "positive",
        title: outcome === ON_TIME ? "Prediction placed · Yes" : "Prediction placed · No",
        children: `${amount} USDG · lands ${bucket.from}–${bucket.to}`,
      });
    } catch (error) {
      notify({
        tone: "critical",
        title: "Could not place prediction",
        children: error instanceof Error ? error.message.split("\n")[0] : "Try again",
      });
    }
  };

  return (
    <div
      className="grid items-center gap-3 border-b py-3 last:border-b-0"
      style={{ gridTemplateColumns: "1fr auto auto", borderColor: "var(--cordon-hairline-soft)" }}
    >
      <span
        style={{
          fontWeight: 600,
          color: "var(--cordon-ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {bucket.from} – {bucket.to}
      </span>
      {settled ? (
        <span className="col-span-2 flex justify-end">
          <Tag tone={bucket.voided ? "caution" : bucket.hit ? "positive" : "neutral"} size="sm">
            {bucket.voided ? "voided" : bucket.hit ? "landed here" : "missed"}
          </Tag>
        </span>
      ) : (
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={!isConnected || pending}
            onClick={() => {
              void trade(ON_TIME);
            }}
          >
            Yes {(bucket.yes * 100).toFixed(0)}¢
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!isConnected || pending}
            onClick={() => {
              void trade(DELAYED);
            }}
          >
            No {((1 - bucket.yes) * 100).toFixed(0)}¢
          </Button>
        </>
      )}
    </div>
  );
}

export function PredictionBuckets({ buckets }: { buckets: Bucket[] }) {
  const [amount, setAmount] = useState("5");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span
          style={{
            color: "var(--cordon-copy-dim)",
            fontSize: "var(--cordon-size-micro)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Stake per trade
        </span>
        <TextField
          inputMode="decimal"
          prefix="USDG"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <div>
        {buckets.map((bucket) => (
          <BucketRow key={bucket.address} bucket={bucket} amount={amount} />
        ))}
      </div>
    </div>
  );
}
