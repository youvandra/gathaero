const SCALE = 1_000_000n;

export function seedTradeFor(
  liquidity: bigint,
  delayedProbability: number,
): { outcome: 0 | 1; amount: bigint } | null {
  const p = Math.min(Math.max(delayedProbability, 0.01), 0.99);
  if (Math.abs(p - 0.5) < 1e-6) return null;

  const outcome = p < 0.5 ? 0 : 1;
  const ratio = outcome === 0 ? (1 - p) / p : p / (1 - p);
  const factor = BigInt(Math.round((Math.sqrt(ratio) - 1) * Number(SCALE)));

  return { outcome, amount: (liquidity * factor) / SCALE };
}
