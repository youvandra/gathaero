import { useMemo, useState, type ReactNode } from "react";

import { UiModeContext, type UiMode, type UiModeValue } from "./uiModeContext";

const readInitialMode = (): UiMode =>
  typeof window !== "undefined" && window.innerWidth >= 1024 ? "web" : "mobile";

export function UiModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<UiMode>(readInitialMode);

  const value = useMemo<UiModeValue>(
    () => ({
      mode,
      setMode,
      toggle: () => setMode((current) => (current === "mobile" ? "web" : "mobile")),
    }),
    [mode],
  );

  return <UiModeContext.Provider value={value}>{children}</UiModeContext.Provider>;
}
