import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const TRENDING_FLIGHTS = [
  { number: "SQ 956", route: "SIN → CGK", probability: "6.2%" },
  { number: "AK 380", route: "SIN → KUL", probability: "9.1%" },
  { number: "TR 286", route: "SIN → CGK", probability: "6.2%" },
] as const;

export function HomePage() {
  return (
    <>
      <Card title="Find a flight">
        <div className="search">
          <input className="search__input" placeholder="Flight number, e.g. SQ956" />
          <input className="search__date" type="date" />
          <Button block>Search</Button>
        </div>
      </Card>

      <Card title="Trending">
        <ul className="rows">
          {TRENDING_FLIGHTS.map((flight) => (
            <li key={flight.number} className="row">
              <div>
                <div className="row__title">{flight.number}</div>
                <div className="row__sub">{flight.route}</div>
              </div>
              <div className="row__value">{flight.probability}</div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
