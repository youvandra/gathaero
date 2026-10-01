import { Button, Card, CardBody, CardHeader, Tag } from "cordon-ui";
import type { ReactNode } from "react";

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
      <strong style={{ color: "var(--cordon-ink)" }}>{value}</strong>
    </div>
  );
}

export function PositionsPage() {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>TR286 · 15 Nov</CardTitle>
            <Tag tone="positive" dot>
              Delayed 47m
            </Tag>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-2">
            <Row label="Protection" value="100 USDC" />
            <Button variant="primary" block>
              Claim 100 USDC
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>AK380 · 16 Nov</CardTitle>
            <Tag tone="neutral">Active</Tag>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-2">
            <Row label="Protection" value="100 USDC" />
            <Button variant="secondary" block>
              Sell position
            </Button>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
