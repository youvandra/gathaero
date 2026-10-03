import { parseUnits } from "viem";

export const USDC_DECIMALS = 6;
export const WAD = 1_000_000_000_000_000_000n;

export function formatUnits(value: bigint, decimals: number, fractionDigits = 2): string {
  const unit = 10n ** BigInt(decimals);
  const whole = value / unit;
  const fraction = (value % unit).toString().padStart(decimals, "0").slice(0, fractionDigits);
  return fractionDigits > 0 ? `${whole}.${fraction}` : whole.toString();
}

export function parseAmount(value: string): bigint {
  try {
    return parseUnits(value.trim() || "0", USDC_DECIMALS);
  } catch {
    return 0n;
  }
}

export function withSlippage(shares: bigint, bps = 100n): bigint {
  return (shares * (10_000n - bps)) / 10_000n;
}

export function formatUsdc(value: bigint, fractionDigits = 2): string {
  return formatUnits(value, USDC_DECIMALS, fractionDigits);
}

export function formatPercent(wad: bigint, fractionDigits = 1): string {
  return `${(Number(wad) / 1e16).toFixed(fractionDigits)}%`;
}

export function percentNumber(wad: bigint, fractionDigits = 1): string {
  return (Number(wad) / 1e16).toFixed(fractionDigits);
}

export function toWad(percent: number): bigint {
  return BigInt(Math.round(percent * 1e18));
}

export function shortenAddress(address: string, size = 4): string {
  return `${address.slice(0, 2 + size)}…${address.slice(-size)}`;
}
