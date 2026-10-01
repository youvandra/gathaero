import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { env } from "./env";
import { arbitrumSepolia } from "./chains";

export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: http(env.rpcUrl),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
