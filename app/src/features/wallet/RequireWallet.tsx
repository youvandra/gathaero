import { Loader } from "cordon-ui";
import { useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";

export function RequireWallet({ children }: { children: ReactNode }) {
  const { status } = useAccount();
  const location = useLocation();
  const [wasConnected, setWasConnected] = useState(false);

  if (status === "connected" && !wasConnected) setWasConnected(true);

  if (status === "connected") return <>{children}</>;

  if (status === "connecting" || status === "reconnecting") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader label="Restoring wallet" />
      </div>
    );
  }

  if (wasConnected) return <Navigate to="/" replace />;

  const next = `${location.pathname}${location.search}`;
  return <Navigate to={`/connect?next=${encodeURIComponent(next)}`} replace />;
}
