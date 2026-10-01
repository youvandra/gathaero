import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function PositionsPage() {
  return (
    <>
      <Card title="TR286 · 15 Nov">
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>Protection</span>
          <strong className="text-white">100 USDC</strong>
        </div>
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>Status</span>
          <span className="rounded-full border border-green-400/40 px-2.5 py-1 text-xs text-green-400">
            Delayed 47m
          </span>
        </div>
        <Button block>Claim 100 USDC</Button>
      </Card>

      <Card title="AK380 · 16 Nov">
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>Protection</span>
          <strong className="text-white">100 USDC</strong>
        </div>
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>Status</span>
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/60">
            Active
          </span>
        </div>
        <Button variant="ghost" block>
          Sell position
        </Button>
      </Card>
    </>
  );
}
