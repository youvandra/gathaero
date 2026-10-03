import { Button, CordonProvider, Loader, Tag, TextField } from "cordon-ui";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { getAddress, isAddress, type Address, type Hex } from "viem";
import { usePublicClient } from "wagmi";

import { targetChain } from "../../config/chains";
import { env } from "../../config/env";
import { checkPassForMarket, parseBoardingPass } from "../../features/boarding/bcbp";
import { BoardingPassScanner } from "../../features/boarding/BoardingPassScanner";
import { ModeCard, PredictArt, ProtectArt } from "../../features/kiosk/ModeCard";
import { Big, FlightCard, Screen, muted } from "../../features/kiosk/parts";
import { requestAttestation } from "../../features/market/useBoardingPass";
import { useFlights } from "../../features/market/useFlights";
import { passRegistryAbi } from "../../lib/abi";
import { explainError } from "../../lib/errors";
import { shortenAddress } from "../../lib/format";
import { useNow } from "../../lib/hooks/useNow";
import { usePageTitle } from "../../lib/hooks/usePageTitle";

/** A public kiosk never holds a wallet: it checks the pass, then hands off to the traveller's phone. */
const IDLE_RESET_SECONDS = 180;

type Pass = { text: string; flightId: Hex; passenger: string; seat: string };

type Mode = "protect" | "predict";

type Step =
  | { kind: "choose" }
  | { kind: "pass" }
  | { kind: "wallet"; pass: Pass }
  | { kind: "working"; label: string }
  | { kind: "problem"; title: string; message: string }
  | { kind: "handoff"; flightId: Hex; wallet: Address; url: string; expiresAt: number };

/** Pulls an address out of a wallet QR: plain 0x…, ethereum:0x…@chain, or similar. */
function addressFrom(text: string): Address | null {
  const match = /0x[a-fA-F0-9]{40}/.exec(text);
  return match && isAddress(match[0]) ? getAddress(match[0]) : null;
}

function HandoffQr({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(url, { width: 360, margin: 1, errorCorrectionLevel: "M" })
      .then((data) => live && setSrc(data))
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
    };
  }, [url]);

  return (
    <div
      className="flex items-center justify-center rounded-[var(--cordon-radius-5)] p-4"
      style={{ background: "#ffffff", width: 300, height: 300 }}
    >
      {src ? (
        <img src={src} alt="QR code that opens Gathæro on your phone" width={268} height={268} />
      ) : (
        <Loader label="Making your code" />
      )}
    </div>
  );
}

function Kiosk() {
  usePageTitle("Kiosk");
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const { flights } = useFlights();
  const now = useNow(1000);

  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [mode, setMode] = useState<Mode>("protect");
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState(() => Math.floor(Date.now() / 1000));

  const reset = useCallback(() => {
    setStep({ kind: "choose" });
    setTyped("");
    setStartedAt(Math.floor(Date.now() / 1000));
  }, []);

  // Clear the screen for the next traveller when a code expires or the kiosk sits idle.
  useEffect(() => {
    if (step.kind === "choose") return;
    if (step.kind === "handoff" && now >= step.expiresAt) reset();
    else if (now - startedAt > IDLE_RESET_SECONDS) reset();
  }, [now, reset, startedAt, step]);

  const problem = (title: string, message: string) => setStep({ kind: "problem", title, message });

  const onPass = useCallback(
    (text: string) => {
      setStartedAt(Math.floor(Date.now() / 1000));
      const pass = parseBoardingPass(text);
      if (!pass) {
        problem(
          "That isn't a boarding pass",
          "Scan the barcode on your boarding pass or in your airline app.",
        );
        return;
      }
      const flight = flights.find((f) => f.status === "open" && checkPassForMarket(pass, f).ok);
      if (!flight) {
        problem(
          `${pass.flight} isn't open right now`,
          `There's no open market for ${pass.flight} ${pass.from} → ${pass.to}. Buying closes at departure.`,
        );
        return;
      }
      setStep({
        kind: "wallet",
        pass: { text, flightId: flight.id, passenger: pass.passenger, seat: pass.seat },
      });
    },
    [flights],
  );

  const onWallet = useCallback(
    async (pass: Pass, wallet: Address) => {
      if (!publicClient) return;
      setStep({ kind: "working", label: "Checking your boarding pass…" });
      try {
        const claim = new URL("/claim", window.location.origin);
        claim.searchParams.set("f", pass.flightId);
        if (mode === "predict") claim.searchParams.set("m", "predict");

        const verified = await publicClient.readContract({
          address: env.contracts.passRegistry,
          abi: passRegistryAbi,
          functionName: "isPassenger",
          args: [pass.flightId, wallet],
        });
        let expiresAt = Math.floor(Date.now() / 1000) + IDLE_RESET_SECONDS;
        if (!verified) {
          const attestation = await requestAttestation(pass.flightId, wallet, pass.text);
          claim.searchParams.set("h", attestation.passHash);
          claim.searchParams.set("e", attestation.expiry);
          claim.searchParams.set("s", attestation.signature);
          expiresAt = Number(attestation.expiry);
        }
        setStep({
          kind: "handoff",
          flightId: pass.flightId,
          wallet,
          url: claim.toString(),
          expiresAt,
        });
      } catch (error) {
        const explained = explainError(error);
        problem(explained.title, explained.message);
      }
    },
    [mode, publicClient],
  );

  const unreadable = (what: string) => () =>
    problem("No code found", `Hold the whole ${what} inside the frame and try again.`);

  const aside = (
    <Tag tone="info" dot>
      Kiosk · Singapore Changi
    </Tag>
  );

  if (step.kind === "choose") {
    const pick = (next: Mode) => {
      setMode(next);
      setStartedAt(Math.floor(Date.now() / 1000));
      setStep({ kind: "pass" });
    };
    return (
      <Screen aside={aside}>
        <Big>Your flight, your call</Big>
        <p className="m-0 text-lg" style={muted}>
          Only passengers of a flight can use it. Choose how.
        </p>
        <div className="grid w-full gap-5 sm:grid-cols-2">
          <ModeCard
            eyebrow="Protect"
            title="Protect my flight"
            text="Get paid automatically if it lands more than 30 minutes late. No claim form."
            art={<ProtectArt />}
            onChoose={() => pick("protect")}
          />
          <ModeCard
            eyebrow="Predict"
            title="Trade my flight"
            text="Pick the window you think it lands in, and get paid if you're right."
            art={<PredictArt />}
            onChoose={() => pick("predict")}
          />
        </div>
      </Screen>
    );
  }

  if (step.kind === "pass") {
    return (
      <Screen aside={aside}>
        <Big>
          {mode === "protect" ? "Protect your flight from delays" : "Trade your own flight"}
        </Big>
        <p className="m-0 text-lg" style={muted}>
          {mode === "protect"
            ? "Scan your boarding pass. Land 30+ minutes late and you're paid automatically."
            : "Scan your boarding pass, then predict when your flight really lands."}
        </p>
        <div className="w-full max-w-md">
          <BoardingPassScanner onScan={onPass} onUnreadable={unreadable("barcode")} />
        </div>
      </Screen>
    );
  }

  if (step.kind === "wallet") {
    const flight = flights.find((f) => f.id === step.pass.flightId);
    const typedAddress = addressFrom(typed);
    return (
      <Screen aside={aside}>
        <p className="m-0 text-lg" style={muted}>
          Welcome, {step.pass.passenger}
          {step.pass.seat ? ` · seat ${step.pass.seat}` : ""}
        </p>
        <Big>Show your wallet address</Big>
        {flight ? <FlightCard flight={flight} now={now} /> : null}
        <p className="m-0" style={muted}>
          Open your wallet, tap Receive, and hold the QR code up to the camera.
        </p>
        <div className="w-full max-w-sm">
          <BoardingPassScanner
            square
            subject="your wallet's QR code"
            onScan={(text) => {
              const wallet = addressFrom(text);
              if (wallet) void onWallet(step.pass, wallet);
              else
                problem(
                  "That isn't a wallet address",
                  "Show the Receive QR code from your wallet.",
                );
            }}
            onUnreadable={unreadable("QR code")}
          />
        </div>
        <div className="flex w-full max-w-sm flex-col gap-2 text-left">
          <TextField
            id="kiosk-wallet"
            placeholder="Or type your address, 0x…"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="ghost" block onClick={reset}>
              Start over
            </Button>
            <Button
              variant="primary"
              block
              disabled={!typedAddress}
              onClick={() => typedAddress && void onWallet(step.pass, typedAddress)}
            >
              Continue
            </Button>
          </div>
        </div>
      </Screen>
    );
  }

  if (step.kind === "working") {
    return (
      <Screen aside={aside}>
        <Loader label={step.label} />
        <Big>{step.label}</Big>
      </Screen>
    );
  }

  if (step.kind === "problem") {
    return (
      <Screen aside={aside}>
        <Big>{step.title}</Big>
        <p className="m-0 text-lg" style={muted}>
          {step.message}
        </p>
        <Button variant="primary" size="lg" onClick={reset}>
          Start over
        </Button>
      </Screen>
    );
  }

  const flight = flights.find((f) => f.id === step.flightId);
  return (
    <Screen aside={aside}>
      <Tag tone="positive" dot>
        Boarding pass checked
      </Tag>
      <Big>Scan with your phone to finish</Big>
      <HandoffQr url={step.url} />
      <p className="m-0 text-lg" style={muted}>
        Opens Gathæro{flight ? ` for ${flight.code}` : ""} in your wallet's browser. Link the pass
        to {shortenAddress(step.wallet)} and{" "}
        {mode === "protect" ? "choose your cover" : "make your prediction"} there.
      </p>
      <p className="m-0" style={muted}>
        Code valid for {Math.floor(Math.max(0, step.expiresAt - now) / 60)}:
        {String(Math.max(0, step.expiresAt - now) % 60).padStart(2, "0")}
      </p>
      <Button variant="secondary" size="lg" onClick={reset}>
        Done · next traveller
      </Button>
    </Screen>
  );
}

export function KioskPage() {
  return (
    <CordonProvider glaze="rose" className="min-h-screen">
      <Kiosk />
    </CordonProvider>
  );
}
