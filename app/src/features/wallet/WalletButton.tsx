import { Button, useToast } from "cordon-ui";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { env } from "../../config/env";
import { useCollateralBalance } from "../market/useBalance";
import { FAUCET_AMOUNT, useTransact } from "../market/useTransact";
import { formatUsdc, shortenAddress } from "../../lib/format";

export function WalletButton() {
  const { notify } = useToast();
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const balance = useCollateralBalance();
  const { faucet, pending } = useTransact();

  const claimFaucet = async () => {
    try {
      await faucet();
      notify({ tone: "positive", title: `${formatUsdc(FAUCET_AMOUNT, 0)} test USDG added` });
    } catch (error) {
      notify({
        tone: "critical",
        title: "Faucet failed",
        children: error instanceof Error ? error.message.split("\n")[0] : "Try again",
      });
    }
  };

  if (isConnected && address) {
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(address);
        notify({ tone: "info", title: "Address copied" });
      } catch {
        notify({ tone: "caution", title: "Could not copy" });
      }
    };

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={pending}
          disabled={!env.faucet}
          onClick={() => {
            void claimFaucet();
          }}
          title={env.faucet ? "Mint test USDG" : "USDG balance"}
        >
          {balance === undefined ? "USDG" : `${formatUsdc(balance, 0)} USDG`}
          {env.faucet ? " +" : ""}
        </Button>
        <button
          type="button"
          onClick={() => {
            void copy();
          }}
          className="rounded-full border px-3 py-1.5 text-sm"
          style={{
            borderColor: "var(--cordon-hairline)",
            color: "var(--cordon-ink)",
            fontVariantNumeric: "tabular-nums",
          }}
          title="Copy address"
        >
          {shortenAddress(address)}
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            disconnect();
            notify({ tone: "info", title: "Wallet disconnected" });
          }}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  const connector = connectors[0];

  const handleConnect = async () => {
    if (!connector) return;
    try {
      await connectAsync({ connector });
      notify({ tone: "positive", title: "Wallet connected" });
    } catch (error) {
      notify({
        tone: "critical",
        title: "Connection failed",
        children: error instanceof Error ? error.message : "Try again",
      });
    }
  };

  return (
    <Button
      variant="primary"
      size="sm"
      loading={isPending}
      disabled={!connector}
      onClick={() => {
        void handleConnect();
      }}
    >
      Connect Wallet
    </Button>
  );
}
