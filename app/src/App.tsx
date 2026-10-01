import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { Providers } from "./app/Providers";
import { AppLayout } from "./components/layout/AppShell";
import { LandingPage } from "./landing/LandingPage";
import { HomePage } from "./pages/app/HomePage";
import { MarketPage } from "./pages/app/MarketPage";
import { PositionsPage } from "./pages/app/PositionsPage";
import { VaultPage } from "./pages/app/VaultPage";
import { DocsPage } from "./pages/public/DocsPage";
import { HowPage } from "./pages/public/HowPage";
import { MarketsPage } from "./pages/public/MarketsPage";

export default function App() {
  return (
    <Providers>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/markets" element={<MarketsPage />} />
          <Route path="/how" element={<HowPage />} />
          <Route path="/docs" element={<DocsPage />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="market" element={<MarketPage />} />
            <Route path="positions" element={<PositionsPage />} />
            <Route path="vault" element={<VaultPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </Providers>
  );
}
