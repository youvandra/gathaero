import { MarketingShell } from "../../components/marketing/MarketingShell";

const SECTIONS = [
  {
    title: "Contracts",
    body: "MarketFactory deploys a protection pool and four arrival-window pools per flight. Each FlightMarket is a fixed-product market maker with non-transferable ERC-1155 outcome shares.",
  },
  {
    title: "Passengers",
    body: "PassRegistry links a verified boarding pass to one wallet with an EIP-712 signature, and caps each passenger at 200 USDG per flight.",
  },
  {
    title: "Oracle",
    body: "FlightOracleConsumer stores each flight's arrival once. Today the resolver posts it through MockFeeder from AeroDataBox; a Chainlink CRE workflow for FlightOracleReceiver is written and not yet deployed.",
  },
  {
    title: "Settlement",
    body: "Delay is the gate arrival minus the scheduled arrival. Winning shares pay 1 USDG each, pushed to the holder's wallet by redeemFor; cancelled flights refund everyone.",
  },
  {
    title: "Network",
    body: "Live on Arbitrum Sepolia (chain id 421614). Mainnet target: Arbitrum One (42161) with Paxos USDG.",
  },
  {
    title: "Source",
    body: "Contracts, services and app are open source at github.com/youvandra/gathaero, with every deployed address in the README.",
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
