import { Button } from "cordon-ui";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { shortenAddress } from "../../lib/format";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="rounded-full border px-3 py-1.5 text-sm"
          style={{
            borderColor: "var(--cordon-hairline)",
            color: "var(--cordon-ink)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {shortenAddress(address)}
        </span>
        <Button variant="ghost" size="sm" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
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
      Connect Wallet
    </Button>
  );
}
