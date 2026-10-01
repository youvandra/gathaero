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
    <span className="brand">
      <span className="brand__mark">✈</span> gathaero
    </span>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <Brand />
      <div className="topbar__actions">
        <ModeToggle />
        <WalletButton />
      </div>
    </header>
  );
}

function SideNav() {
  return (
    <nav className="sidenav">
      <Brand />
      <div className="sidenav__links">
        {APP_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="sidenav__item">
            <span className="sidenav__icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
      <NavLink to="/" className="sidenav__back">
        ← Back to site
      </NavLink>
    </nav>
  );
}

function BottomNav() {
  return (
    <nav className="bottomnav">
      {APP_NAV.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className="bottomnav__item">
          <span className="bottomnav__icon">{item.icon}</span>
          <span className="bottomnav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { mode } = useUiMode();

  if (mode === "web") {
    return (
      <div className="app app--web">
        <aside className="app__sidebar">
          <SideNav />
        </aside>
        <div className="app__main">
          <TopBar />
          <div className="app__content">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app app--mobile">
      <div className="device">
        <div className="device__notch" />
        <div className="device__screen">
          <TopBar />
          <div className="app__content">{children}</div>
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
