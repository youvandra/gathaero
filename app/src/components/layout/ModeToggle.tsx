import { useUiMode, type UiMode } from "../../app/uiModeContext";

const OPTIONS: { value: UiMode; label: string }[] = [
  { value: "mobile", label: "Mobile" },
  { value: "web", label: "Web" },
];

export function ModeToggle() {
  const { mode, setMode } = useUiMode();

  return (
    <div className="modetoggle" role="tablist" aria-label="Interface mode">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={mode === option.value}
          className={`modetoggle__btn${mode === option.value ? " is-active" : ""}`}
          onClick={() => setMode(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
