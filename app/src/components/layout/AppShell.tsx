import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { WalletButton } from "../../features/wallet/WalletButton";

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
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/10 bg-black/40 px-5 py-4 backdrop-blur-xl sm:px-7">
      <span className="md:hidden">
        <Brand />
      </span>
      <span className="hidden md:block" />
      <WalletButton />
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
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-white/10 bg-black/60 px-2 pb-3 pt-2 backdrop-blur-xl md:hidden">
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
          <span className="text-[18px] leading-none">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05060a]">
      <div className="md:grid md:min-h-screen md:grid-cols-[264px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r border-white/10 bg-white/[0.02] p-6 md:block">
          <SideNav />
        </aside>
        <div className="flex min-w-0 flex-col">
          <TopBar />
          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-5 pb-28 md:p-7 md:pb-7">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
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
