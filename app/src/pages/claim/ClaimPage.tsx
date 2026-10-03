import { Button, CordonProvider, Loader, Tag } from "cordon-ui";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { isHex, zeroHash, type Hex } from "viem";
import { useAccount } from "wagmi";

import { Big, BuyPanel, FlightCard, PredictPanel, Screen, muted } from "../../features/kiosk/parts";
import { usePassenger } from "../../features/market/useBoardingPass";
import { useFlights } from "../../features/market/useFlights";
import { STAGE_LABEL, useTransact } from "../../features/market/useTransact";
import { RequireWallet } from "../../features/wallet/RequireWallet";
import { explainError } from "../../lib/errors";
import { formatUsdc, shortenAddress } from "../../lib/format";
import { useNow } from "../../lib/hooks/useNow";
import { usePageTitle } from "../../lib/hooks/usePageTitle";

type Problem = { title: string; message: string };

const hexParam = (value: string | null): Hex | null => (value && isHex(value) ? value : null);

/** Where a traveller lands after scanning the kiosk's code: link the pass, then buy, on their own wallet. */
function Claim() {
  usePageTitle("Finish on your phone");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { address } = useAccount();
  const { flights, isLoading } = useFlights();
  const { registerPass, pending, stage } = useTransact();
  const now = useNow(1000);

  const flightId = hexParam(params.get("f"));
  const passHash = hexParam(params.get("h"));
  const signature = hexParam(params.get("s"));
  const expiry = Number(params.get("e") ?? 0);

  const { isPassenger, isLoading: passLoading } = usePassenger(flightId ?? zeroHash);
  const [problem, setProblem] = useState<Problem | null>(null);
  const predict = params.get("m") === "predict";
  const [bought, setBought] = useState<{ amount: string; payout: bigint; window?: string } | null>(
    null,
  );

  const aside = address ? <span>{shortenAddress(address)}</span> : null;
  const flight = flights.find((f) => f.id === flightId);

  if (!flightId) {
    return (
      <Screen aside={aside}>
        <Big>This link is incomplete</Big>
        <p className="m-0 text-lg" style={muted}>
          Scan the code on the kiosk screen again.
        </p>
      </Screen>
    );
  }

  if (isLoading || passLoading || !flight) {
    return (
      <Screen aside={aside}>
        <Loader label="Loading your flight" />
      </Screen>
    );
  }

  if (problem) {
    return (
      <Screen aside={aside}>
        <Big>{problem.title}</Big>
        <p className="m-0 text-lg" style={muted}>
          {problem.message}
        </p>
        <Button variant="primary" size="lg" onClick={() => setProblem(null)}>
          Try again
        </Button>
      </Screen>
    );
  }

  if (bought) {
    return (
      <Screen aside={aside}>
        <Tag tone="positive" dot>
          {bought.window ? "Prediction placed" : "Protected"}
        </Tag>
        <Big>
          {bought.window ? `You called ${bought.window}` : `You're covered on ${flight.code}`}
        </Big>
        <p className="m-0 text-xl">
          {bought.window
            ? `If ${flight.code} lands in that window, you receive `
            : `If ${flight.code} lands ${flight.thresholdMinutes}+ minutes late, you receive `}
          <strong>{formatUsdc(bought.payout)} USDG</strong>, paid automatically after landing.
        </p>
        <Button variant="secondary" size="lg" onClick={() => navigate("/app/positions")}>
          View my positions
        </Button>
      </Screen>
    );
  }

  if (!isPassenger) {
    const expired = !passHash || !signature || now >= expiry;
    const link = async () => {
      if (!passHash || !signature) return;
      try {
        await registerPass(flight.id, passHash, BigInt(expiry), signature);
      } catch (error) {
        setProblem(explainError(error));
      }
    };

    return (
      <Screen aside={aside}>
        <Big>Link your boarding pass</Big>
        <FlightCard flight={flight} now={now} />
        {expired ? (
          <>
            <p className="m-0 text-lg" style={muted}>
              This code has expired. Scan your boarding pass at the kiosk again, or verify it on the
              market page.
            </p>
            <Link to={`/app/market/${flight.code}`}>Open {flight.code}</Link>
          </>
        ) : (
          <>
            <p className="m-0 text-lg" style={muted}>
              One transaction links this boarding pass to{" "}
              {address ? shortenAddress(address) : "your wallet"}. Only a hash of your booking is
              stored.
            </p>
            <Button variant="primary" size="lg" block loading={pending} onClick={() => void link()}>
              {pending ? STAGE_LABEL[stage] : "Link boarding pass"}
            </Button>
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen aside={aside}>
      <Tag tone="positive" dot>
        Passenger verified
      </Tag>
      <Big>{predict ? "When will it land?" : "How much cover do you want?"}</Big>
      <FlightCard flight={flight} now={now} />
      {predict ? (
        <PredictPanel
          flight={flight}
          onBought={(window, amount, payout) => setBought({ window, amount, payout })}
          onError={(title, message) => setProblem({ title, message })}
        />
      ) : (
        <BuyPanel
          flight={flight}
          onBought={(amount, payout) => setBought({ amount, payout })}
          onError={(title, message) => setProblem({ title, message })}
        />
      )}
    </Screen>
  );
}

export function ClaimPage() {
  return (
    <CordonProvider glaze="rose" className="min-h-screen">
      <RequireWallet>
        <Claim />
      </RequireWallet>
    </CordonProvider>
  );
}
