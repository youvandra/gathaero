import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { INPUT, SILKSCREEN } from "../../lib/theme";

const TRENDING = [
  { number: "SQ 956", route: "SIN → CGK", probability: "6.2%" },
  { number: "AK 380", route: "SIN → KUL", probability: "9.1%" },
  { number: "TR 286", route: "SIN → CGK", probability: "6.2%" },
];

export function HomePage() {
  return (
    <>
      <Card title="Find a flight">
        <input className={INPUT} placeholder="Flight number, e.g. SQ956" />
        <input className={INPUT} type="date" />
        <Button block>Search</Button>
      </Card>

      <Card title="Trending">
        <ul className="flex flex-col">
          {TRENDING.map((flight) => (
            <li
              key={flight.number}
              className="flex items-center justify-between border-b border-white/10 py-3 last:border-b-0"
            >
              <div>
                <div className="font-semibold text-white">{flight.number}</div>
                <div className="text-[13px] text-white/50">{flight.route}</div>
              </div>
              <div className="text-sm text-green-400" style={{ fontFamily: SILKSCREEN }}>
                {flight.probability}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
