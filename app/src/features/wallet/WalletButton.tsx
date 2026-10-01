import { useAccount, useConnect, useDisconnect } from "wagmi";

import { Button } from "../../components/ui/Button";
import { shortenAddress } from "../../lib/format";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <Button variant="ghost" onClick={() => disconnect()}>
        {shortenAddress(address)}
      </Button>
    );
  }

  const connector = connectors[0];

  return (
    <Button onClick={() => connector && connect({ connector })} disabled={isPending || !connector}>
      {isPending ? "Connecting…" : "Connect"}
    </Button>
  );
}
