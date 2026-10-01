import { MarketingShell } from "../../components/marketing/MarketingShell";
import { SILKSCREEN } from "../../lib/theme";

const MARKETS = [
  { code: "SQ956", route: "SIN → CGK", date: "15 Nov", probability: "6.2%", up: true },
  { code: "AK380", route: "SIN → KUL", date: "16 Nov", probability: "9.1%", up: true },
  { code: "TR286", route: "SIN → CGK", date: "15 Nov", probability: "6.2%", up: false },
  { code: "CZ352", route: "SIN → CAN", date: "17 Nov", probability: "4.4%", up: false },
  { code: "SQ118", route: "SIN → KUL", date: "18 Nov", probability: "7.8%", up: true },
];

export function MarketsPage() {
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
          {MARKETS.map((market) => (
            <div
              key={market.code}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/10 px-5 py-4 last:border-b-0"
            >
              <div>
                <div className="font-semibold text-white">{market.code}</div>
                <div className="text-sm text-white/50">{market.route}</div>
              </div>
              <span className="text-sm text-white/50">{market.date}</span>
              <span
                className={`text-sm ${market.up ? "text-green-400" : "text-red-400"}`}
                style={{ fontFamily: SILKSCREEN }}
              >
                {market.probability}
              </span>
            </div>
          ))}
        </div>
      </div>
    </MarketingShell>
  );
}
