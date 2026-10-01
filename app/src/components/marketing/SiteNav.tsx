import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

const LINKS = [
  { to: "/markets", label: "Markets" },
  { to: "/how", label: "How it works" },
  { to: "/docs", label: "Docs" },
] as const;

function Logo() {
  return (
    <span className="logo">
      <span className="logo__mark">✈</span>
      <span className="logo__word">gathaero</span>
    </span>
  );
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
    <header className="site-nav">
      <Link to="/" className="site-nav__logo" onClick={() => setOpen(false)}>
        <Logo />
      </Link>

      <nav className="site-nav__links">
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} className="site-nav__link">
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="site-nav__right">
        <Link to="/app" className="btn btn--cta">
          Launch App
        </Link>
        <button
          type="button"
          className="burger"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "✕" : "≡"}
        </button>
      </div>

      <div className={`drawer${open ? " is-open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`drawer-panel${open ? " is-open" : ""}`}>
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} className="drawer-panel__link" onClick={() => setOpen(false)}>
            {link.label}
          </NavLink>
        ))}
        <Link to="/app" className="btn btn--cta drawer-panel__cta" onClick={() => setOpen(false)}>
          Launch App
        </Link>
      </aside>
    </header>
  );
}
