import { SiteFooter } from "../../components/marketing/SiteFooter";
import { SiteNav } from "../../components/marketing/SiteNav";

const MARKETS = [
  { code: "SQ956", route: "SIN → CGK", date: "15 Nov", probability: "6.2%", trend: "up" },
  { code: "AK380", route: "SIN → KUL", date: "16 Nov", probability: "9.1%", trend: "up" },
  { code: "TR286", route: "SIN → CGK", date: "15 Nov", probability: "6.2%", trend: "down" },
  { code: "CZ352", route: "SIN → CAN", date: "17 Nov", probability: "4.4%", trend: "down" },
  { code: "SQ118", route: "SIN → KUL", date: "18 Nov", probability: "7.8%", trend: "up" },
] as const;

export function MarketsPage() {
  return (
    <div className="landing">
      <div className="landing__bg" aria-hidden="true" />
      <div className="landing__inner">
        <SiteNav />
        <main className="page">
          <header className="page__head">
            <h1 className="page__title">Live flight markets</h1>
            <p className="page__sub">
              Every market is a tradeable position on whether a flight is delayed.
            </p>
          </header>

          <div className="market-list">
            {MARKETS.map((market) => (
              <div key={market.code} className="market-row">
                <div className="market-row__id">
                  <span className="market-row__code">{market.code}</span>
                  <span className="market-row__route">{market.route}</span>
                </div>
                <span className="market-row__date">{market.date}</span>
                <span className={`market-row__prob market-row__prob--${market.trend}`}>
                  {market.probability}
                </span>
              </div>
            ))}
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
