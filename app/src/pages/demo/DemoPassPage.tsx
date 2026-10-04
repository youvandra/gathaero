import { Button, CordonProvider, Loader, Tag } from "cordon-ui";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { demoPassFor, type DemoPass } from "../../features/boarding/demoPass";
import { Big, Screen, muted } from "../../features/kiosk/parts";
import { useFlights } from "../../features/market/useFlights";
import { usePageTitle } from "../../lib/hooks/usePageTitle";

/** Testnet helper: a fresh boarding pass for any open flight, to scan at the kiosk or upload. */
function DemoPassView() {
  usePageTitle("Demo boarding pass");
  const { flights, isLoading } = useFlights();
  const open = useMemo(() => flights.filter((flight) => flight.status === "open"), [flights]);
  const [code, setCode] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [qr, setQr] = useState<{ barcode: string; src: string } | null>(null);

  const flight = open.find((f) => f.id === code) ?? open[0];
  // A new random pass whenever the flight changes or "New pass" bumps the nonce.
  const pass = useMemo<DemoPass | null>(
    () => (flight && nonce >= 0 ? demoPassFor(flight) : null),
    [flight, nonce],
  );

  useEffect(() => {
    if (!pass) return;
    let live = true;
    QRCode.toDataURL(pass.barcode, { width: 520, margin: 2, errorCorrectionLevel: "M" })
      .then((src) => live && setQr({ barcode: pass.barcode, src }))
      .catch(() => live && setQr(null));
    return () => {
      live = false;
    };
  }, [pass]);

  const qrSrc = qr && pass && qr.barcode === pass.barcode ? qr.src : null;

  const aside = (
    <Tag tone="caution" dot>
      Testnet demo
    </Tag>
  );

  if (isLoading) {
    return (
      <Screen aside={aside}>
        <Loader label="Loading open flights" />
      </Screen>
    );
  }

  if (!flight || !pass) {
    return (
      <Screen aside={aside}>
        <Big>No open flights right now</Big>
        <p className="m-0 text-lg" style={muted}>
          Demo passes are made for flights that have not departed yet.
        </p>
      </Screen>
    );
  }

  return (
    <Screen aside={aside}>
      <Big>Demo boarding pass</Big>
      <p className="m-0 text-lg" style={muted}>
        A real-format boarding pass with a random name, so you can try Gathæro without flying. Each
        pass links to one wallet; make a new one for each wallet.
      </p>
      <div className="flex w-full flex-wrap justify-center gap-2">
        {open.map((option) => (
          <Button
            key={option.id}
            size="sm"
            variant={option.id === flight.id ? "primary" : "secondary"}
            onClick={() => setCode(option.id)}
          >
            {option.code} · {option.date}
          </Button>
        ))}
      </div>
      <div
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-[var(--cordon-radius-5)] border p-6"
        style={{ borderColor: "var(--cordon-hairline)", background: "var(--cordon-paper-raised)" }}
      >
        <div className="grid w-full grid-cols-3 gap-3 text-left">
          {[
            ["Flight", flight.code],
            ["Route", flight.route],
            ["Departs (UTC)", flight.scheduledDeparture],
            ["Passenger", pass.passenger],
            ["Booking", pass.booking],
            ["Seat", pass.seat],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs uppercase tracking-wider" style={muted}>
                {label}
              </span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>
        <div className="rounded-[var(--cordon-radius-3)] bg-white p-3">
          {qrSrc ? (
            <img src={qrSrc} alt={`Demo boarding pass for ${flight.code}`} width={260} height={260} />
          ) : (
            <Loader label="Making the code" />
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={() => setNonce((n) => n + 1)}>
          New pass
        </Button>
        {qrSrc ? (
          <a href={qrSrc} download={`gathaero-demo-pass-${flight.code}.png`}>
            <Button variant="secondary">Download PNG</Button>
          </a>
        ) : null}
        <Link to={`/app/market/${flight.code}?id=${flight.id}`}>
          <Button variant="primary">Open {flight.code}</Button>
        </Link>
      </div>
      <p className="m-0 text-sm" style={muted}>
        Scan it at <Link to="/kiosk">the kiosk</Link>, or upload the PNG on the flight's page. The
        market page also has a Use a demo pass button. Not valid for travel.
      </p>
    </Screen>
  );
}

export function DemoPassPage() {
  return (
    <CordonProvider glaze="rose" className="min-h-screen">
      <DemoPassView />
    </CordonProvider>
  );
}
