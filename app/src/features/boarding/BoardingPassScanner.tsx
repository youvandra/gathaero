import { Button, Loader } from "cordon-ui";
import type { IScannerControls } from "@zxing/browser";
import type { DecodeHintType as HintType } from "@zxing/library";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

type Status = "starting" | "scanning" | "blocked";

async function createReader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  const hints = new Map<HintType, unknown>([
    [
      DecodeHintType.POSSIBLE_FORMATS,
      [
        BarcodeFormat.PDF_417,
        BarcodeFormat.AZTEC,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
      ],
    ],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  return new BrowserMultiFormatReader(hints);
}

export function BoardingPassScanner({
  onScan,
  onUnreadable,
  subject = "the boarding pass",
  square = false,
}: {
  onScan: (text: string) => void;
  onUnreadable: () => void;
  /** What is being scanned, used in the fallback copy. */
  subject?: string;
  /** A square guide for QR codes instead of the wide boarding-pass strip. */
  square?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const handlers = useRef({ onScan, onUnreadable });

  useEffect(() => {
    handlers.current = { onScan, onUnreadable };
  });
  const [status, setStatus] = useState<Status>("starting");

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let cancelled = false;

    createReader()
      .then((reader) => {
        if (cancelled || !video.current) return undefined;
        return reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          video.current,
          (result) => {
            if (!result) return;
            controls?.stop();
            handlers.current.onScan(result.getText());
          },
        );
      })
      .then((started) => {
        controls = started;
        if (cancelled) started?.stop();
        else setStatus("scanning");
      })
      .catch(() => {
        if (!cancelled) setStatus("blocked");
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  const readPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const reader = await createReader();
      const result = await reader.decodeFromImageUrl(url);
      handlers.current.onScan(result.getText());
    } catch {
      handlers.current.onUnreadable();
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative overflow-hidden rounded-[var(--cordon-radius-3)]"
        style={{ aspectRatio: "4 / 3", background: "var(--cordon-ink)" }}
      >
        <video ref={video} className="h-full w-full object-cover" muted playsInline />
        {status === "starting" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader label="Opening camera" />
          </div>
        ) : null}
        {status === "blocked" ? (
          <div
            className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm"
            style={{ color: "var(--cordon-paper)" }}
          >
            Camera unavailable. Allow camera access, or upload a photo of {subject}.
          </div>
        ) : null}
        {status === "scanning" ? <ScanGuide square={square} /> : null}
      </div>
      {square ? null : (
        <p className="m-0 text-center text-sm" style={{ color: "var(--cordon-copy)" }}>
          Wide barcode, QR or Aztec code: any boarding pass works.
        </p>
      )}
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => void readPhoto(event)}
      />
      <Button variant="secondary" block onClick={() => photoInput.current?.click()}>
        Upload a photo instead
      </Button>
    </div>
  );
}

const CORNERS = [
  "left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-lg",
  "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-lg",
  "left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-lg",
  "right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-lg",
];

/** Corner brackets that frame a wide boarding-pass barcode or a square QR code alike. */
function ScanGuide({ square }: { square: boolean }) {
  return (
    <div
      className={
        square
          ? "pointer-events-none absolute left-1/2 top-1/2 h-1/2 aspect-square -translate-x-1/2 -translate-y-1/2"
          : "pointer-events-none absolute inset-x-[14%] inset-y-[18%]"
      }
    >
      {CORNERS.map((corner) => (
        <span
          key={corner}
          className={`absolute h-8 w-8 ${corner}`}
          style={{ borderColor: "var(--cordon-paper)" }}
        />
      ))}
    </div>
  );
}
