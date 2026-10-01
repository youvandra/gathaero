import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { CTA_GRADIENT } from "../../lib/theme";

const NAV_LINKS = [
  { label: "Markets", to: "/markets" },
  { label: "How it works", to: "/how" },
  { label: "Docs", to: "/docs" },
];

function Logo() {
  return <span className="text-lg font-semibold text-white">gathæro</span>;
}

export function SiteNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
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
          className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-lg md:hidden"
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
    </>
  );
}
