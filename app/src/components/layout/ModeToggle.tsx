import { useUiMode, type UiMode } from "../../app/uiModeContext";

const OPTIONS: { value: UiMode; label: string }[] = [
  { value: "mobile", label: "Mobile" },
  { value: "web", label: "Web" },
];

export function ModeToggle() {
  const { mode, setMode } = useUiMode();

  return (
    <div className="inline-flex rounded-full bg-white/10 p-1 backdrop-blur-lg" role="tablist" aria-label="Interface mode">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={mode === option.value}
          onClick={() => setMode(option.value)}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
            mode === option.value ? "bg-white text-zinc-900" : "text-white/70 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
