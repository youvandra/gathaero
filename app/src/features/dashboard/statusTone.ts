import type { TagTone } from "cordon-ui";

import type { MarketStatus } from "../market/model";

export const STATUS_TONE: Record<MarketStatus, TagTone> = {
  open: "neutral",
  "in flight": "info",
  awaiting: "info",
  delayed: "critical",
  "on time": "positive",
  voided: "caution",
};
