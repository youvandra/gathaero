import { useEffect } from "react";

const BRAND = "Gathæro";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BRAND}` : BRAND;
  }, [title]);
}
