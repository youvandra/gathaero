import { Button, Tag, TextField, useToast } from "cordon-ui";
import { useState } from "react";
import { useAccount } from "wagmi";

import { DELAYED, ON_TIME, quoteShares, type Bucket } from "../market/model";
import { STAGE_LABEL, useTransact } from "../market/useTransact";
import { parseAmount, withSlippage } from "../../lib/format";
import { errorToast } from "../../lib/errors";

function BucketRow({
  bucket,
  amount,
  closed,
}: {
  bucket: Bucket;
  amount: string;
  closed: boolean;
}) {
  const { isConnected } = useAccount();
  const { notify } = useToast();
  const { buy, pending, stage } = useTransact();
  const [side, setSide] = useState<number | null>(null);

  const settled = bucket.resolved || bucket.voided;

  const trade = async (outcome: number) => {
    const parsed = parseAmount(amount);
    if (parsed <= 0n) {
      notify({ tone: "caution", title: "Enter a stake first" });
      return;
    }
    setSide(outcome);
    try {
      await buy(
        bucket.address,
        outcome,
        parsed,
        withSlippage(quoteShares(bucket, outcome, parsed)),
      );
      notify({
        tone: "positive",
        title: outcome === ON_TIME ? "Prediction placed · Yes" : "Prediction placed · No",
        children: `${amount} USDG · lands ${bucket.window}`,
      });
    } catch (error) {
      notify(errorToast(error));
    } finally {
      setSide(null);
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
        {bucket.window}
      </span>
      {closed && !settled ? (
        <span className="col-span-2 flex justify-end">
          <Tag tone="info" size="sm">
            closed
          </Tag>
        </span>
      ) : settled ? (
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
            loading={pending && side === ON_TIME}
            disabled={!isConnected || pending}
            title={
              pending
                ? STAGE_LABEL[stage]
                : `Pays 1 USDG per share if the flight arrives ${bucket.window}`
            }
            onClick={() => {
              void trade(ON_TIME);
            }}
          >
            Yes {(bucket.yes * 100).toFixed(0)}¢
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={pending && side === DELAYED}
            disabled={!isConnected || pending}
            title={
              pending
                ? STAGE_LABEL[stage]
                : "Pays 1 USDG per share if it arrives outside this window"
            }
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

export function PredictionBuckets({ buckets, closed }: { buckets: Bucket[]; closed: boolean }) {
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
          id="prediction-stake"
          inputMode="decimal"
          prefix="USDG"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>
      <div>
        {buckets.map((bucket) => (
          <BucketRow key={bucket.address} bucket={bucket} amount={amount} closed={closed} />
        ))}
      </div>
    </div>
  );
}
