import { MarketingShell } from "../../components/marketing/MarketingShell";
import { SILKSCREEN } from "../../lib/theme";

const STEPS = [
  {
    title: "Scan your boarding pass",
    body: "Only passengers of a flight can trade it. Your pass is checked against the on-chain schedule and linked to one wallet.",
  },
  {
    title: "Protect or predict",
    body: "Hedge a delay of 30+ minutes, or pick the window you think it lands in. Prices are the market's live odds, up to 200 USDG per flight.",
  },
  {
    title: "Paid to your wallet",
    body: "About 30 minutes after landing, the real gate arrival settles every market and winnings are sent to your wallet. Nothing to claim.",
  },
];

export function HowPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-5xl py-8">
        <header className="mb-10 max-w-xl">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">How Gathaero works</h1>
          <p className="mt-3 text-white/60">
            Trade your own flight. Protection and prediction are the same thing: a position on when
            your flight lands.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="flex flex-col gap-3 rounded-2xl bg-white/10 p-6 backdrop-blur-lg"
            >
              <span className="text-sm text-sky-300" style={{ fontFamily: SILKSCREEN }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-lg font-semibold text-white">{step.title}</span>
              <span className="text-sm leading-relaxed text-white/60">{step.body}</span>
            </div>
          ))}
        </div>
      </div>
    </MarketingShell>
  );
}
