import { Button, Card, CardHeader, Tag } from "cordon-ui";
import type { TagTone } from "cordon-ui";

import { StatTile } from "../../features/dashboard/StatTile";

type Position = {
  code: string;
  route: string;
  date: string;
  size: number;
  status: "active" | "delayed" | "resolved";
  note?: string;
};

const POSITIONS: Position[] = [
  { code: "TR286", route: "SIN → CGK", date: "15 Nov", size: 100, status: "delayed", note: "Delayed 47m" },
  { code: "AK380", route: "SIN → KUL", date: "16 Nov", size: 100, status: "active", note: "Closes in 21h" },
  { code: "QZ521", route: "SIN → DPS", date: "19 Nov", size: 60, status: "active", note: "Closes in 3d" },
];

const TONE: Record<Position["status"], TagTone> = {
  active: "neutral",
  delayed: "critical",
  resolved: "positive",
};

function CardTitle({ children }: { children: string }) {
  return (
    <h2 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>
      {children}
    </h2>
  );
}

export function PositionsPage() {
  const totalProtected = POSITIONS.reduce((sum, position) => sum + position.size, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Protected" value={`$${totalProtected}`} delta="3 active" up />
        <StatTile label="Won this month" value="$240" delta="+$100 pending" up />
      </div>

      {POSITIONS.map((position) => (
        <Card key={position.code}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{`${position.code} · ${position.date}`}</CardTitle>
              <Tag tone={TONE[position.status]} dot>
                {position.note}
              </Tag>
            </div>
          </CardHeader>
          <div className="flex items-center justify-between gap-3 px-5 pb-5">
            <div className="flex flex-col">
              <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-micro)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {position.route}
              </span>
              <span style={{ color: "var(--cordon-ink)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {position.size} USDC
              </span>
            </div>
            {position.status === "delayed" ? (
              <Button variant="primary" size="sm">
                Claim
              </Button>
            ) : (
              <Button variant="secondary" size="sm">
                Sell
              </Button>
            )}
          </div>
        </Card>
      ))}
    </>
  );
}
