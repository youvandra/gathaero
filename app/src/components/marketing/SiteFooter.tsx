import { Link } from "react-router-dom";

const LINKS = [
  { label: "Markets", to: "/markets" },
  { label: "How it works", to: "/how" },
  { label: "Docs", to: "/docs" },
  { label: "Launch App", to: "/app" },
];

export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-white/10 px-5 py-8 sm:px-8 lg:px-12">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-white">gathaero</span>
        <span className="text-sm text-white/50">Flight-risk market on Arbitrum.</span>
      </div>
      <div className="flex flex-wrap gap-5 text-sm text-white/60">
        {LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="transition-colors hover:text-white">
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
