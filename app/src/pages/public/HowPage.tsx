import { MarketingShell } from "../../components/marketing/MarketingShell";
import { SILKSCREEN } from "../../lib/theme";

const STEPS = [
  {
    title: "A flight becomes a market",
    body: "Each flight lists two outcomes: on-time and delayed. Their prices reflect the market's live probability of a delay.",
  },
  {
    title: "Hedgers and traders meet",
    body: "Travelers buy delay protection. Traders and liquidity providers take the other side and earn the premium.",
  },
  {
    title: "The oracle settles",
    body: "When the flight lands, a flight-status oracle resolves the market. Winning positions pay out automatically.",
  },
];

export function HowPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-5xl py-8">
        <header className="mb-10 max-w-xl">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">How Gathaero works</h1>
          <p className="mt-3 text-white/60">
            Prediction market and delay protection are the same thing — a position on a
            flight's outcome.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex flex-col gap-3 rounded-2xl bg-white/10 p-6 backdrop-blur-lg">
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
