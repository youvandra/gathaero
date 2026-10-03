import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { targetChain } from "./chains";
import { env } from "./env";

export const wagmiConfig = createConfig({
  chains: [targetChain],
  connectors: [injected()],
  transports: {
    [targetChain.id]: http(env.rpcUrl),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
