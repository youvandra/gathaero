import { SiteFooter } from "../../components/marketing/SiteFooter";
import { SiteNav } from "../../components/marketing/SiteNav";

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
] as const;

export function HowPage() {
  return (
    <div className="landing">
      <div className="landing__bg" aria-hidden="true" />
      <div className="landing__inner">
        <SiteNav />
        <main className="page">
          <header className="page__head">
            <h1 className="page__title">How Gathaero works</h1>
            <p className="page__sub">
              Prediction market and delay protection are the same thing — a position on a
              flight's outcome.
            </p>
          </header>

          <div className="steps">
            {STEPS.map((step, index) => (
              <div key={step.title} className="step-card">
                <span className="step-card__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="step-card__title">{step.title}</span>
                <span className="step-card__body">{step.body}</span>
              </div>
            ))}
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
