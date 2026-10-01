import { Button } from "cordon-ui";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { shortenAddress } from "../../lib/format";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <Button variant="secondary" size="sm" onClick={() => disconnect()}>
        {shortenAddress(address)}
      </Button>
    );
  }

  const connector = connectors[0];

  return (
    <Button
      variant="primary"
      size="sm"
      loading={isPending}
      disabled={!connector}
      onClick={() => connector && connect({ connector })}
    >
      Connect
    </Button>
  );
}
