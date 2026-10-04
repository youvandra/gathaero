import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Providers } from "./app/Providers";
import { AppLayout } from "./components/layout/AppShell";
import { LandingPage } from "./landing/LandingPage";
import { ConnectPage } from "./pages/connect/ConnectPage";
import { ClaimPage } from "./pages/claim/ClaimPage";
import { DemoPassPage } from "./pages/demo/DemoPassPage";
import { KioskPage } from "./pages/kiosk/KioskPage";
import { EarnPage } from "./pages/app/EarnPage";
import { HomePage } from "./pages/app/HomePage";
import { MarketDetailPage } from "./pages/app/MarketDetailPage";
import { MarketsPage } from "./pages/app/MarketsPage";
import { PositionsPage } from "./pages/app/PositionsPage";
import { VaultPage } from "./pages/app/VaultPage";
import { DocsPage } from "./pages/public/DocsPage";
import { HowPage } from "./pages/public/HowPage";
import { MarketsPage as PublicMarketsPage } from "./pages/public/MarketsPage";

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/markets" element={<PublicMarketsPage />} />
          <Route path="/how" element={<HowPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/kiosk" element={<KioskPage />} />
          <Route path="/claim" element={<ClaimPage />} />
          <Route path="/demo-pass" element={<DemoPassPage />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="market" element={<MarketsPage />} />
            <Route path="market/:code" element={<MarketDetailPage />} />
            <Route path="positions" element={<PositionsPage />} />
            <Route path="vault" element={<VaultPage />} />
            <Route path="earn" element={<EarnPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Providers>
  );
}
