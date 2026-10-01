import { createContext, useContext } from "react";

export type UiMode = "mobile" | "web";

export type UiModeValue = {
  mode: UiMode;
  setMode: (mode: UiMode) => void;
  toggle: () => void;
};

export const UiModeContext = createContext<UiModeValue | null>(null);

export function useUiMode(): UiModeValue {
  const value = useContext(UiModeContext);
  if (!value) {
    throw new Error("useUiMode must be used within UiModeProvider");
  }
  return value;
}
