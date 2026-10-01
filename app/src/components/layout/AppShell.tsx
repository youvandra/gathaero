import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CordonProvider } from "cordon-ui";

import { WalletButton } from "../../features/wallet/WalletButton";

const APP_NAV = [
  { to: "/app", label: "Home", icon: "◎", end: true },
  { to: "/app/market", label: "Market", icon: "▲", end: false },
  { to: "/app/positions", label: "Positions", icon: "◈", end: false },
  { to: "/app/vault", label: "Vault", icon: "◇", end: false },
] as const;

function Brand() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-[var(--cordon-ink)]">
      <span className="text-[var(--cordon-accent)]">✈</span> gathaero
    </span>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[var(--cordon-hairline)] bg-[var(--cordon-paper)]/85 px-5 py-4 backdrop-blur-xl sm:px-7">
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
              `flex items-center gap-3 rounded-[var(--cordon-radius-3)] px-3.5 py-2.5 text-sm transition ${
                isActive
                  ? "bg-[var(--cordon-accent-quiet)] font-semibold text-[var(--cordon-accent)]"
                  : "text-[var(--cordon-copy)] hover:bg-black/[0.04] hover:text-[var(--cordon-ink)]"
              }`
            }
          >
            <span className="text-[15px]">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
      <NavLink
        to="/"
        className="mt-auto text-[13px] text-[var(--cordon-copy-dim)] transition-colors hover:text-[var(--cordon-ink)]"
      >
        ← Back to site
      </NavLink>
    </nav>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-[var(--cordon-hairline)] bg-[var(--cordon-paper)]/95 px-2 pb-3 pt-2 backdrop-blur-xl md:hidden">
      {APP_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] ${
              isActive ? "text-[var(--cordon-accent)]" : "text-[var(--cordon-copy-dim)]"
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
    <div className="min-h-screen bg-[var(--cordon-paper)] text-[var(--cordon-ink)]">
      <div className="md:grid md:min-h-screen md:grid-cols-[264px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r border-[var(--cordon-hairline)] bg-[var(--cordon-paper-raised)] p-6 md:block">
          <SideNav />
        </aside>
        <div className="flex min-w-0 flex-col">
          <TopBar />
          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-5 pb-28 md:p-7 md:pb-7">
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
    <CordonProvider glaze="rose" className="min-h-screen">
      <AppShell>
        <Outlet />
      </AppShell>
    </CordonProvider>
  );
}
