import { type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { SiteFooter } from "../components/marketing/SiteFooter";
import { SiteNav } from "../components/marketing/SiteNav";

const STATS = [
  { value: "1,248", label: "Flights live right now" },
  { value: "6.2%", label: "Average delay probability" },
  { value: "$418k", label: "Protected across markets" },
] as const;

const STEPS = [
  { title: "Search a flight", body: "Find any flight by code and date. The market opens for that flight." },
  { title: "Hedge or trade", body: "Lock in protection against delays, or take the other side as a trader." },
  { title: "Instant payout", body: "When the flight lands, settlement is automatic. No claims, no waiting." },
] as const;

export function LandingPage() {
  const navigate = useNavigate();

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate("/app/market");
  };

  return (
    <div className="landing">
      <div className="landing__bg" aria-hidden="true" />
      <div className="landing__inner">
        <SiteNav />

        <main className="landing__main">
          <section className="hero">
            <span className="hero__eyebrow">Prediction market · Delay protection</span>
            <h1 className="hero__title">Protect your flight. Trade the risk.</h1>
            <p className="hero__sub">
              Gathaero turns flight outcomes into a live market. Hedge a delay or take the
              other side — settled instantly on-chain.
            </p>

            <form className="search" onSubmit={handleSearch}>
              <input
                className="search__input"
                placeholder="Flight code — e.g. SQ956"
                aria-label="Flight code"
              />
              <button type="submit" className="btn btn--cta search__btn">
                Search flight
              </button>
            </form>
          </section>

          <section className="stats">
            {STATS.map((stat) => (
              <div key={stat.label} className="stat-card">
                <span className="stat-card__value">{stat.value}</span>
                <span className="stat-card__label">{stat.label}</span>
              </div>
            ))}
          </section>

          <section className="quote-card">
            <p className="quote-card__text">
              “A flight is an event with a price. Once you can trade it, delay stops being bad
              luck and becomes a market.”
            </p>
            <span className="quote-card__by">Gathaero thesis</span>
          </section>
        </main>

        <section className="section">
          <h2 className="section__title">How it works</h2>
          <div className="steps">
            {STEPS.map((step, index) => (
              <div key={step.title} className="step-card">
                <span className="step-card__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="step-card__title">{step.title}</span>
                <span className="step-card__body">{step.body}</span>
              </div>
            ))}
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
