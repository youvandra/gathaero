import { Button, Card, CardBody, CardHeader, TextField } from "cordon-ui";
import { useNavigate } from "react-router-dom";

const TRENDING = [
  { number: "SQ 956", route: "SIN → CGK", probability: "6.2%" },
  { number: "AK 380", route: "SIN → KUL", probability: "9.1%" },
  { number: "TR 286", route: "SIN → CGK", probability: "6.2%" },
];

function CardTitle({ children }: { children: string }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: "var(--cordon-size-title)",
        fontWeight: "var(--cordon-weight-semibold)",
        color: "var(--cordon-ink)",
      }}
    >
      {children}
    </h2>
  );
}

export function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Find a flight</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-3">
            <TextField placeholder="Flight number, e.g. SQ956" />
            <TextField type="date" />
            <Button variant="primary" block onClick={() => navigate("/app/market")}>
              Search
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trending</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="flex flex-col">
            {TRENDING.map((flight) => (
              <li
                key={flight.number}
                className="flex items-center justify-between border-b py-3 last:border-b-0"
                style={{ borderColor: "var(--cordon-hairline-soft)" }}
              >
                <div>
                  <div className="font-semibold" style={{ color: "var(--cordon-ink)" }}>
                    {flight.number}
                  </div>
                  <div className="text-[13px]" style={{ color: "var(--cordon-copy-dim)" }}>
                    {flight.route}
                  </div>
                </div>
                <div className="font-semibold" style={{ color: "var(--cordon-accent)" }}>
                  {flight.probability}
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
