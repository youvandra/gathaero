import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function PositionsPage() {
  return (
    <>
      <Card title="TR286 · 15 Nov">
        <div className="trade__row">
          <span>Protection</span>
          <strong>100 USDC</strong>
        </div>
        <div className="trade__row">
          <span>Status</span>
          <span className="pill pill--win">Delayed 47m</span>
        </div>
        <Button block>Claim 100 USDC</Button>
      </Card>

      <Card title="AK380 · 16 Nov">
        <div className="trade__row">
          <span>Protection</span>
          <strong>100 USDC</strong>
        </div>
        <div className="trade__row">
          <span>Status</span>
          <span className="pill">Active</span>
        </div>
        <Button variant="ghost" block>
          Sell position
        </Button>
      </Card>
    </>
  );
}
