import type { Address } from "viem";

export const AMOUNTS = ["10", "25", "50", "100"];

/** What the traveller picked on the kiosk, carried to their phone in the hand-off link. */
export type Choice = { amount: string; bucket?: Address };
