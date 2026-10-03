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
      [BarcodeFormat.PDF_417, BarcodeFormat.AZTEC, BarcodeFormat.QR_CODE],
    ],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  return new BrowserMultiFormatReader(hints);
}

export function BoardingPassScanner({
  onScan,
  onUnreadable,
}: {
  onScan: (text: string) => void;
  onUnreadable: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
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
            onScan(result.getText());
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
  }, [onScan]);

  const readPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const reader = await createReader();
      const result = await reader.decodeFromImageUrl(url);
      onScan(result.getText());
    } catch {
      onUnreadable();
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
            Camera unavailable. Allow camera access, or upload a photo of the boarding pass.
          </div>
        ) : null}
        {status === "scanning" ? (
          <div
            className="pointer-events-none absolute inset-x-6 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2"
            style={{ borderColor: "var(--cordon-paper)" }}
          />
        ) : null}
      </div>
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
