import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useUiMode } from "../../app/uiModeContext";
import { WalletButton } from "../../features/wallet/WalletButton";
import { ModeToggle } from "./ModeToggle";

const APP_NAV = [
  { to: "/app", label: "Home", icon: "◎", end: true },
  { to: "/app/market", label: "Market", icon: "▲", end: false },
  { to: "/app/positions", label: "Positions", icon: "◈", end: false },
  { to: "/app/vault", label: "Vault", icon: "◇", end: false },
] as const;

function Brand() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-white">
      <span className="text-sky-400">✈</span> gathaero
    </span>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 px-5 py-4 backdrop-blur-xl sm:px-7">
      <Brand />
      <div className="flex items-center gap-2.5">
        <ModeToggle />
        <WalletButton />
      </div>
    </header>
  );
}

function SideNav() {
  return (
    <nav className="flex h-full flex-col">
      <Brand />
      <div className="mt-7 flex flex-col gap-1">
        {APP_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="text-[15px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
      <NavLink to="/" className="mt-auto text-[13px] text-white/40 transition-colors hover:text-white">
        ← Back to site
      </NavLink>
    </nav>
  );
}

function BottomNav() {
  return (
    <nav className="flex justify-around border-t border-white/10 bg-black/50 px-2 pb-4 pt-2 backdrop-blur-xl">
      {APP_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] ${
              isActive ? "text-white" : "text-white/50"
            }`
          }
        >
          <span className="text-[17px] leading-none">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { mode } = useUiMode();

  if (mode === "web") {
    return (
      <div className="grid min-h-screen grid-cols-1 bg-[#05060a] md:grid-cols-[264px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r border-white/10 bg-white/[0.02] p-6 md:block">
          <SideNav />
        </aside>
        <div className="flex min-w-0 flex-col">
          <TopBar />
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-7">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(60%_50%_at_50%_0%,rgba(56,189,248,0.1),transparent_60%),#05060a] p-6">
      <div className="relative h-[800px] max-h-[calc(100vh-3rem)] w-[390px] max-w-full rounded-[46px] border border-white/10 bg-[#0b0b0e] p-3 shadow-[0_40px_120px_rgba(0,0,0,0.6)]">
        <div className="absolute left-1/2 top-4 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-[#05060a]" />
        <div className="flex h-full flex-col overflow-hidden rounded-[36px] bg-[#05060a]">
          <TopBar />
          <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4">{children}</div>
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
