import type { ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { CordonProvider, Icon } from "cordon-ui";
import type { IconName } from "cordon-ui";

import { WalletButton } from "../../features/wallet/WalletButton";

const APP_NAV: { to: string; label: string; icon: IconName; end: boolean }[] = [
  { to: "/app", label: "Home", icon: "home", end: true },
  { to: "/app/market", label: "Markets", icon: "bolt", end: false },
  { to: "/app/positions", label: "Positions", icon: "layers", end: false },
  { to: "/app/vault", label: "Vault", icon: "star", end: false },
];

function Brand() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 font-semibold no-underline" style={{ color: "var(--cordon-ink)" }}>
      <span style={{ color: "var(--cordon-accent)" }}>
        <Icon name="globe" />
      </span>
      gathaero
    </Link>
  );
}

function TopBar() {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b px-5 py-4 backdrop-blur-xl sm:px-7"
      style={{ borderColor: "var(--cordon-hairline)", background: "color-mix(in srgb, var(--cordon-paper) 85%, transparent)" }}
    >
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
              `flex items-center gap-3 rounded-[var(--cordon-radius-3)] px-3.5 py-2.5 text-sm no-underline transition ${
                isActive ? "font-semibold" : ""
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? "var(--cordon-accent-quiet)" : "transparent",
              color: isActive ? "var(--cordon-accent)" : "var(--cordon-copy)",
            })}
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t px-2 pb-3 pt-2 backdrop-blur-xl md:hidden"
      style={{ borderColor: "var(--cordon-hairline)", background: "color-mix(in srgb, var(--cordon-paper) 95%, transparent)" }}
    >
      {APP_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-1.5 text-[11px] no-underline ${
              isActive ? "font-semibold" : ""
            }`
          }
          style={({ isActive }) => ({
            color: isActive ? "var(--cordon-accent)" : "var(--cordon-copy-dim)",
          })}
        >
          <Icon name={item.icon} size={18} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--cordon-paper)", color: "var(--cordon-ink)" }}>
      <div className="md:grid md:min-h-screen md:grid-cols-[264px_1fr]">
        <aside
          className="sticky top-0 hidden h-screen border-r p-6 md:block"
          style={{ borderColor: "var(--cordon-hairline)", background: "var(--cordon-paper-raised)" }}
        >
          <SideNav />
        </aside>
        <div className="flex min-w-0 flex-col">
          <TopBar />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-5 pb-28 md:p-7 md:pb-7">
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
