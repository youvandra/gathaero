import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { WalletButton } from "../../features/wallet/WalletButton";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: "◎" },
  { to: "/market", label: "Market", icon: "▲" },
  { to: "/positions", label: "Positions", icon: "◈" },
  { to: "/vault", label: "Vault", icon: "◇" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header className="shell__top">
        <span className="brand">
          <span className="brand__mark">✈</span> Skyasa
        </span>
        <WalletButton />
      </header>

      <main className="shell__main">{children}</main>

      <nav className="shell__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end className="nav__item">
            <span className="nav__icon">{item.icon}</span>
            <span className="nav__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
