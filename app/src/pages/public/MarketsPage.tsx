import { Link } from "react-router-dom";

import { MarketingShell } from "../../components/marketing/MarketingShell";
import { isLive } from "../../features/market/model";
import { useFlights } from "../../features/market/useFlights";
import { SILKSCREEN } from "../../lib/theme";

export function MarketsPage() {
  const { flights, isLoading } = useFlights();
  const live = flights.filter(isLive);

  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">Live flight markets</h1>
          <p className="mt-3 max-w-xl text-white/60">
            Every market is a tradeable position on whether a flight is delayed.
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl bg-white/10 backdrop-blur-lg">
          {live.length === 0 ? (
            <div className="px-5 py-6 text-sm text-white/60">
              {isLoading ? "Loading markets…" : "No live markets right now."}
            </div>
          ) : null}
          {live.map((market) => (
            <Link
              key={market.id}
              to={`/app/market/${market.code}`}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/10 px-5 py-4 no-underline last:border-b-0 hover:bg-white/5"
            >
              <div>
                <div className="font-semibold text-white">{market.code}</div>
                <div className="text-sm text-white/50">{market.route}</div>
              </div>
              <span className="text-sm text-white/50">{market.date}</span>
              <span className="text-sm text-white" style={{ fontFamily: SILKSCREEN }}>
                {(market.delayProbability * 100).toFixed(1)}%
              </span>
            </Link>
          ))}
        </div>
      </div>
    </MarketingShell>
  );
}
