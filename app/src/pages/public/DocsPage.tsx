import { SiteFooter } from "../../components/marketing/SiteFooter";
import { SiteNav } from "../../components/marketing/SiteNav";

const SECTIONS = [
  {
    title: "Contracts",
    body: "FlightMarket holds the AMM and outcome shares. MarketFactory deploys one market per flight. LiquidityVault backs markets per route.",
  },
  {
    title: "Oracle",
    body: "FlightOracleConsumer stores finalized flight resolutions. FlightOracleReceiver accepts signed reports from Chainlink CRE, which reads AeroDataBox.",
  },
  {
    title: "Settlement",
    body: "Winning shares redeem 1:1 for the collateral token. Delay is the arrival time minus the scheduled arrival time.",
  },
  {
    title: "Network",
    body: "Deployed on Arbitrum. Testnet chain id 421614, mainnet chain id 143.",
  },
] as const;

export function DocsPage() {
  return (
    <div className="landing">
      <div className="landing__bg" aria-hidden="true" />
      <div className="landing__inner">
        <SiteNav />
        <main className="page">
          <header className="page__head">
            <h1 className="page__title">Docs</h1>
            <p className="page__sub">The pieces that make a flight market settle on its own.</p>
          </header>

          <div className="doc-grid">
            {SECTIONS.map((section) => (
              <article key={section.title} className="doc-card">
                <h2 className="doc-card__title">{section.title}</h2>
                <p className="doc-card__body">{section.body}</p>
              </article>
            ))}
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
