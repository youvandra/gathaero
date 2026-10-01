import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { INPUT } from "../../lib/theme";

const METRICS = [
  { label: "TVL", value: "12,400 USDC" },
  { label: "Yield", value: "~14% APY" },
  { label: "Exposure", value: "3,200 USDC" },
];

export function VaultPage() {
  return (
    <Card title="Route: SIN → CGK">
      <div className="grid grid-cols-3 gap-2.5">
        {METRICS.map((metric) => (
          <div
            key={metric.label}
            className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <span className="text-xs text-white/50">{metric.label}</span>
            <span className="text-[13px] font-semibold text-white">{metric.value}</span>
          </div>
        ))}
      </div>
      <input className={INPUT} placeholder="Amount (USDC)" />
      <Button block>Deposit</Button>
    </Card>
  );
}
