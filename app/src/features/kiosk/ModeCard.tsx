import type { ReactNode } from "react";

const ink = "var(--cordon-ink)";
const copy = "var(--cordon-copy)";
const accent = "var(--cordon-accent)";

/** A large choice card for the kiosk's first screen: an illustration, the choice, and what it does. */
export function ModeCard({
  eyebrow,
  title,
  text,
  art,
  onChoose,
}: {
  eyebrow: string;
  title: string;
  text: string;
  art: ReactNode;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      className="group flex flex-col overflow-hidden rounded-[28px] border text-left outline-none transition duration-200 hover:-translate-y-1 focus-visible:ring-4"
      style={{
        borderColor: "var(--cordon-hairline)",
        background: "var(--cordon-paper-raised)",
        color: ink,
        boxShadow: "0 24px 48px -32px rgb(0 0 0 / 0.35)",
        ["--tw-ring-color" as string]: "var(--cordon-accent-quiet)",
      }}
    >
      <div
        className="flex h-48 items-center justify-center px-6"
        style={{
          background: "linear-gradient(160deg, var(--cordon-accent-quiet), transparent 85%)",
        }}
      >
        {art}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-6">
        <span
          style={{
            color: accent,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {eyebrow}
        </span>
        <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15 }}>{title}</span>
        <span style={{ color: copy, lineHeight: 1.45 }}>{text}</span>
        <span
          className="mt-4 inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold transition group-hover:gap-3"
          style={{ background: accent, color: "var(--cordon-paper)" }}
        >
          Choose
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </button>
  );
}

/** A torn-off boarding pass showing a late arrival and the payout it triggers. */
export function ProtectArt() {
  return (
    <div
      className="flex w-full max-w-[300px] overflow-hidden rounded-2xl shadow-md"
      style={{ background: "var(--cordon-paper)", border: "1px solid var(--cordon-hairline)" }}
      aria-hidden="true"
    >
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span style={{ fontSize: 11, letterSpacing: "0.12em", color: copy }}>
          AK714 · SIN → KUL
        </span>
        <span style={{ fontSize: 26, fontWeight: 700, color: ink }}>09:15</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: accent }}>Landed +34 min</span>
      </div>
      <div
        className="flex flex-col items-center justify-center gap-1 px-4"
        style={{ borderLeft: "2px dashed var(--cordon-hairline)" }}
      >
        <span style={{ fontSize: 11, letterSpacing: "0.12em", color: copy }}>PAID</span>
        <span style={{ fontSize: 26, fontWeight: 800, color: accent }}>$70</span>
      </div>
    </div>
  );
}

/** Arrival windows with their prices, one of them picked. */
export function PredictArt() {
  const windows = [
    { label: "09:00–09:10", price: "22¢", width: 44 },
    { label: "09:10–09:25", price: "45¢", width: 90, picked: true },
    { label: "09:25–09:45", price: "20¢", width: 40 },
    { label: "09:45–10:15", price: "8¢", width: 16 },
  ];
  return (
    <div className="flex w-full max-w-[300px] flex-col gap-2" aria-hidden="true">
      {windows.map((w) => (
        <div
          key={w.label}
          className="grid items-center gap-3 rounded-xl px-3 py-1.5"
          style={{
            gridTemplateColumns: "92px 1fr 34px",
            background: w.picked ? "var(--cordon-paper)" : "transparent",
            border: w.picked ? `1.5px solid ${accent}` : "1.5px solid transparent",
            fontSize: 13,
            color: ink,
          }}
        >
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{w.label}</span>
          <span className="h-2 rounded-full" style={{ background: "var(--cordon-hairline)" }}>
            <span
              className="block h-2 rounded-full"
              style={{
                width: `${w.width}%`,
                background: w.picked ? accent : copy,
                opacity: w.picked ? 1 : 0.45,
              }}
            />
          </span>
          <span style={{ textAlign: "right", fontWeight: 600, color: w.picked ? accent : copy }}>
            {w.price}
          </span>
        </div>
      ))}
    </div>
  );
}
