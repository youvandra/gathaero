import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

import videoSrc from "../assets/hero.mp4";
import { isLive } from "../features/market/model";
import { useFlights } from "../features/market/useFlights";
import { formatNumber, usd } from "../lib/format";
import { CTA_GRADIENT, SILKSCREEN } from "../lib/theme";

const NAV_LINKS = [
  { label: "Markets", to: "/markets" },
  { label: "How it works", to: "/how" },
  { label: "Docs", to: "/docs" },
];

function Logo() {
  return <span className="text-lg font-semibold text-[#010101] lg:text-white">gathæro</span>;
}

export function LandingPage() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { flights } = useFlights();
  const live = flights.filter(isLive);
  const avgDelay =
    live.length > 0 ? live.reduce((sum, f) => sum + f.delayProbability, 0) / live.length : 0;
  const liveStats = [
    { label: "Avg delay odds", value: `${(avgDelay * 100).toFixed(1)}%` },
    {
      label: "USDG locked",
      value: usd(
        flights.reduce((sum, f) => sum + f.openInterest, 0n),
        0,
      ),
    },
    {
      label: "Volume",
      value: usd(
        flights.reduce((sum, f) => sum + f.volume, 0n),
        0,
      ),
    },
  ];

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <section className="relative h-screen w-full overflow-hidden">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
      />

      <div className="relative z-10 flex h-full flex-col">
        <nav className="flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
          <Link to="/">
            <Logo />
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-1.5 backdrop-blur-lg">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <Link
              to="/app"
              className="flex items-center justify-center self-stretch rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: CTA_GRADIENT }}
            >
              Launch App
            </Link>
          </div>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#010101] backdrop-blur-lg lg:text-white md:hidden"
          >
            <Menu
              className={`absolute h-5 w-5 transition-all duration-300 ${
                open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
            />
            <X
              className={`absolute h-5 w-5 transition-all duration-300 ${
                open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
              }`}
            />
          </button>
        </nav>

        <div
          className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />

        <div
          className={`fixed right-0 top-0 z-40 flex h-full w-72 flex-col bg-black/90 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col gap-2 px-6 pt-24">
            {NAV_LINKS.map((link, i) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="flex items-center rounded-xl px-4 py-3.5 text-base font-medium text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-white"
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? "translateX(0)" : "translateX(24px)",
                  transitionDelay: `${(i + 1) * 60}ms`,
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-auto px-6 pb-10">
            <Link
              to="/app"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-white transition-all"
              style={{
                background: CTA_GRADIENT,
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0)" : "translateY(16px)",
                transitionDelay: open ? "300ms" : "0ms",
                transitionDuration: "400ms",
              }}
            >
              Launch App
            </Link>
          </div>
        </div>

        <main className="mt-auto">
          <div className="flex flex-col gap-6 px-5 pb-8 sm:gap-8 sm:px-8 sm:pb-12 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:pb-16">
            <div className="max-w-xl">
              <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-[#010101] sm:text-4xl lg:text-[3.5rem] lg:text-white">
                Hedge the sky. Trade every flight.
              </h1>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const code = query.trim().toUpperCase();
                  navigate(code ? `/app/market/${code}` : "/app/market");
                }}
                className="mt-6 flex flex-col gap-3 sm:mt-8 sm:inline-flex sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:bg-white sm:p-1.5"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type flight code"
                  className="rounded-full bg-white px-5 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none sm:w-64 sm:rounded-none sm:bg-transparent sm:px-4 sm:py-2"
                />
                <button
                  type="submit"
                  className="rounded-full px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:py-2.5"
                  style={{ background: CTA_GRADIENT }}
                >
                  Search flight
                </button>
              </form>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row lg:w-auto lg:gap-5">
              <div className="flex flex-col justify-between rounded-2xl bg-white/10 p-5 backdrop-blur-lg sm:w-64 sm:p-6">
                <div
                  className="text-3xl tracking-tight text-[#010101] sm:text-4xl lg:text-white"
                  style={{ fontFamily: SILKSCREEN, fontWeight: 400 }}
                >
                  {formatNumber(live.length)}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#010101]/70 sm:mt-4 lg:text-white/70">
                  Flights priced and protected on Gathaero right now.
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl bg-white/10 p-5 backdrop-blur-lg sm:w-64 sm:p-6">
                {liveStats.map((stat) => (
                  <div key={stat.label} className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-[#010101]/70 lg:text-white/70">{stat.label}</span>
                    <span
                      className="text-lg text-[#010101] lg:text-white"
                      style={{ fontFamily: SILKSCREEN }}
                    >
                      {stat.value}
                    </span>
                  </div>
                ))}
                <p className="mt-1 text-xs text-[#010101]/60 lg:text-white/60">
                  Live from Arbitrum, refreshed every 10 seconds.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}
