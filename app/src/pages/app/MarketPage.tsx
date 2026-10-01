import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SILKSCREEN } from "../../lib/theme";

const OUTCOMES = [
  { label: "On-time", value: "93.8%", active: false },
  { label: "Delayed", value: "6.2%", active: true },
];

export function MarketPage() {
  return (
    <>
      <Card
        title="SQ956 · SIN → CGK"
        action={
          <span className="rounded-full border border-green-400/40 px-2.5 py-1 text-xs text-green-400">
            ● Live
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2.5">
          {OUTCOMES.map((outcome) => (
            <button
              key={outcome.label}
              type="button"
              className={`flex flex-col gap-1 rounded-xl border p-3.5 text-left transition ${
                outcome.active
                  ? "border-sky-400/60 bg-sky-400/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <span className="text-[13px] text-white/60">{outcome.label}</span>
              <span className="text-xl text-white" style={{ fontFamily: SILKSCREEN }}>
                {outcome.value}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Pay</span>
            <strong className="text-white">6.20 USDC</strong>
          </div>
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Receive if delay &gt; 2h</span>
            <strong className="text-white">100 USDC</strong>
          </div>
          <Button block>Buy protection</Button>
        </div>
      </Card>

      <Card title="Liquidity">
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>Pool</span>
          <strong className="text-white">12,400 USDC</strong>
        </div>
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>Closes in</span>
          <strong className="text-white">23h 12m</strong>
        </div>
      </Card>
    </>
  );
}
