import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function MarketPage() {
  return (
    <>
      <Card title="SQ956 · SIN → CGK" action={<span className="pill pill--live">● Live</span>}>
        <div className="outcomes">
          <button className="outcome">
            <span className="outcome__label">On-time</span>
            <span className="outcome__value">93.8%</span>
          </button>
          <button className="outcome outcome--active">
            <span className="outcome__label">Delayed</span>
            <span className="outcome__value">6.2%</span>
          </button>
        </div>

        <div className="trade">
          <div className="trade__row">
            <span>Pay</span>
            <strong>6.20 USDC</strong>
          </div>
          <div className="trade__row">
            <span>Receive if delay &gt; 2h</span>
            <strong>100 USDC</strong>
          </div>
          <Button block disabled>
            Buy protection
          </Button>
        </div>
      </Card>

      <Card title="Liquidity">
        <div className="trade__row">
          <span>Pool</span>
          <strong>12,400 USDC</strong>
        </div>
        <div className="trade__row">
          <span>Closes in</span>
          <strong>23h 12m</strong>
        </div>
      </Card>
    </>
  );
}
