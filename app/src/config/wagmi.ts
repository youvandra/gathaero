import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { env } from "./env";
import { arbitrumTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [arbitrumTestnet],
  connectors: [injected()],
  transports: {
    [arbitrumTestnet.id]: http(env.rpcUrl),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
