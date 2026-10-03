import { Button, CordonProvider, Tag, useToast } from "cordon-ui";
import { useEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAccount, useConnect, useSwitchChain } from "wagmi";

import { targetChain } from "../../config/chains";
import { errorToast } from "../../lib/errors";

const safeNext = (value: string | null): string =>
  value && value.startsWith("/app") ? value : "/app";

const hasInjectedWallet = (): boolean =>
  typeof window !== "undefined" && "ethereum" in window && Boolean(window.ethereum);

export function ConnectPage() {
  const { notify } = useToast();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const { status, chainId } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { switchChainAsync } = useSwitchChain();

  const connector = connectors[0];
  const walletFound = hasInjectedWallet();

  useEffect(() => {
    if (status === "connected" && chainId !== targetChain.id) {
      switchChainAsync({ chainId: targetChain.id }).catch(() => undefined);
    }
  }, [status, chainId, switchChainAsync]);

  if (status === "connected") return <Navigate to={next} replace />;

  const connect = async () => {
    if (!connector) return;
    try {
      await connectAsync({ connector, chainId: targetChain.id });
    } catch (error) {
      notify(errorToast(error));
    }
  };

  return (
    <CordonProvider glaze="rose" className="min-h-screen">
      <main
        className="flex min-h-screen items-center justify-center px-4 py-10"
        style={{ background: "var(--cordon-paper)", color: "var(--cordon-ink)" }}
      >
        <div
          className="flex w-full max-w-sm flex-col gap-6 rounded-[var(--cordon-radius-5)] border p-6 sm:p-8"
          style={{
            borderColor: "var(--cordon-hairline)",
            background: "var(--cordon-paper-raised)",
          }}
        >
          <Link
            to="/"
            className="font-semibold no-underline"
            style={{ color: "var(--cordon-ink)" }}
          >
            gathæro
          </Link>

          <div className="flex flex-col gap-2">
            <h1 style={{ margin: 0, fontSize: "var(--cordon-size-title)", fontWeight: 600 }}>
              Connect your wallet
            </h1>
            <p style={{ margin: 0, color: "var(--cordon-copy)" }}>
              Your positions, protection and liquidity live in your wallet. Connect to open the app.
            </p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span style={{ color: "var(--cordon-copy-dim)" }}>Network</span>
            <Tag tone="neutral" size="sm">
              {targetChain.name}
            </Tag>
          </div>

          {walletFound ? (
            <Button
              variant="primary"
              block
              loading={isPending || status === "connecting"}
              disabled={!connector}
              onClick={() => {
                void connect();
              }}
            >
              Connect wallet
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <p
                style={{
                  margin: 0,
                  color: "var(--cordon-copy)",
                  fontSize: "var(--cordon-size-caption)",
                }}
              >
                No browser wallet found. Install MetaMask or Rabby, then reload this page.
              </p>
              <Button
                variant="primary"
                block
                onClick={() => window.open("https://metamask.io/download/", "_blank", "noopener")}
              >
                Get a wallet
              </Button>
            </div>
          )}

          <Link
            to="/"
            className="text-center text-sm no-underline"
            style={{ color: "var(--cordon-copy-dim)" }}
          >
            Back to home
          </Link>
        </div>
      </main>
    </CordonProvider>
  );
}
