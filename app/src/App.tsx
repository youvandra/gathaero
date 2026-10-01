import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { Providers } from "./app/Providers";
import { AppShell } from "./components/layout/AppShell";
import { HomePage } from "./pages/HomePage";
import { MarketPage } from "./pages/MarketPage";
import { PositionsPage } from "./pages/PositionsPage";
import { VaultPage } from "./pages/VaultPage";

export default function App() {
  return (
    <Providers>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/positions" element={<PositionsPage />} />
            <Route path="/vault" element={<VaultPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </Providers>
  );
}
