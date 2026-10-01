import { MarketingShell } from "../../components/marketing/MarketingShell";

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
    body: "Deployed on Arbitrum. Sepolia chain id 421614, One chain id 42161.",
  },
];

export function DocsPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-5xl py-8">
        <header className="mb-10 max-w-xl">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">Docs</h1>
          <p className="mt-3 text-white/60">
            The pieces that make a flight market settle on its own.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <article key={section.title} className="rounded-2xl bg-white/10 p-6 backdrop-blur-lg">
              <h2 className="mb-2 text-lg font-semibold text-white">{section.title}</h2>
              <p className="text-sm leading-relaxed text-white/60">{section.body}</p>
            </article>
          ))}
        </div>
      </div>
    </MarketingShell>
  );
}
