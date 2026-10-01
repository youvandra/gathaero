import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__row">
        <span className="logo__word">gathaero</span>
        <span className="site-footer__note">Flight-risk market on Arbitrum.</span>
      </div>
      <div className="site-footer__links">
        <Link to="/markets">Markets</Link>
        <Link to="/how">How it works</Link>
        <Link to="/docs">Docs</Link>
        <Link to="/app">Launch App</Link>
      </div>
    </footer>
  );
}
