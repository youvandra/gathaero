import { parseUnits } from "viem";

export const USDC_DECIMALS = 6;

const groupers = new Map<number, Intl.NumberFormat>();

function grouper(fractionDigits: number): Intl.NumberFormat {
  let format = groupers.get(fractionDigits);
  if (!format) {
    format = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    groupers.set(fractionDigits, format);
  }
  return format;
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return grouper(fractionDigits).format(value);
}

export function formatUsd(value: number, fractionDigits = 2): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${formatNumber(Math.abs(value), fractionDigits)}`;
}

export function toNumber(value: bigint): number {
  return Number(value) / 10 ** USDC_DECIMALS;
}

export function formatUsdc(value: bigint, fractionDigits = 2): string {
  return formatNumber(toNumber(value), fractionDigits);
}

export function usd(value: bigint, fractionDigits = 2): string {
  return formatUsd(toNumber(value), fractionDigits);
}

export function parseAmount(value: string): bigint {
  try {
    return parseUnits(value.trim().replace(/,/g, "") || "0", USDC_DECIMALS);
  } catch {
    return 0n;
  }
}

export function withSlippage(shares: bigint, bps = 100n): bigint {
  return (shares * (10_000n - bps)) / 10_000n;
}

export function shortenAddress(address: string, size = 4): string {
  return `${address.slice(0, 2 + size)}…${address.slice(-size)}`;
}
