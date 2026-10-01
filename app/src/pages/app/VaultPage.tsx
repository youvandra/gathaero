import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function VaultPage() {
  return (
    <Card title="Route: SIN → CGK">
      <div className="stats">
        <div className="stat">
          <span className="stat__label">TVL</span>
          <span className="stat__value">12,400 USDC</span>
        </div>
        <div className="stat">
          <span className="stat__label">Yield</span>
          <span className="stat__value">~14% APY</span>
        </div>
        <div className="stat">
          <span className="stat__label">Exposure</span>
          <span className="stat__value">3,200 USDC</span>
        </div>
      </div>

      <div className="search">
        <input className="search__input" placeholder="Amount (USDC)" />
        <Button block>Deposit</Button>
      </div>
    </Card>
  );
}
