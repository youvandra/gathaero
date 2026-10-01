import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "cordon-ui";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "../config/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider placement="bottom-right">{children}</ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
