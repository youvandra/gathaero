import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { formatUnits, type Address, type Hex } from "viem";

import { flightMarketAbi, outcomeTokenAbi } from "./abi.js";
import type { Clients } from "./chain.js";
import type { FeederConfig } from "./config.js";
import { send } from "./mailer.js";
import { emailOf, forget } from "./subscribers.js";

type MarketView = {
  market: Address;
  kind: number;
  lowerBound: bigint;
  upperBound: bigint;
  resolved: boolean;
  voided: boolean;
  winning: number;
};

export type SettledFlight = {
  flightId: Hex;
  number: string;
  route: string;
  scheduledArrival: bigint;
  delayThresholdMinutes: number;
  delayMinutes: number;
  finalized: boolean;
  protection: MarketView;
  ranges: readonly MarketView[];
};

type Line = { label: string; stake: bigint; paid: bigint; result: "won" | "lost" | "refunded" };

const ON_TIME = 0;
const LOG_CHUNK = 5_000_000n;
const OPEN_END_SECONDS = 6n * 3600n;
const LOGO_URL = "https://gathaero.space/email/mark.png";
const doneDir = () => join(process.env.DATA_DIR ?? "data", "paid");

const usd = (amount: bigint) => Number(formatUnits(amount, 6)).toFixed(2);

const hhmm = (seconds: bigint) => new Date(Number(seconds) * 1000).toISOString().slice(11, 16);

function windowOf(flight: SettledFlight, market: MarketView): string {
  if (flight.scheduledArrival - market.lowerBound > OPEN_END_SECONDS) {
    return `before ${hhmm(market.upperBound)} UTC`;
  }
  if (market.upperBound - flight.scheduledArrival > OPEN_END_SECONDS) {
    return `after ${hhmm(market.lowerBound)} UTC`;
  }
  return `${hhmm(market.lowerBound)}–${hhmm(market.upperBound)} UTC`;
}

function labelOf(flight: SettledFlight, market: MarketView, side: number): string {
  if (market.kind === 0) {
    return side === ON_TIME
      ? "On time"
      : `Delay protection (${flight.delayThresholdMinutes}+ min late)`;
  }
  const window = windowOf(flight, market);
  return side === ON_TIME ? `Lands ${window}` : `Does not land ${window}`;
}

export const marketsOf = (flight: SettledFlight): MarketView[] =>
  [flight.protection, ...flight.ranges].filter(
    (market) => market.market !== "0x0000000000000000000000000000000000000000",
  );

export const isSettled = (flight: SettledFlight): boolean =>
  marketsOf(flight).every((market) => market.resolved || market.voided);

async function alreadyPaid(flightId: Hex): Promise<boolean> {
  return stat(join(doneDir(), flightId.toLowerCase())).then(
    () => true,
    () => false,
  );
}

async function markPaid(flightId: Hex): Promise<void> {
  await mkdir(doneDir(), { recursive: true });
  await writeFile(join(doneDir(), flightId.toLowerCase()), new Date().toISOString());
}

async function purchases(clients: Clients, config: FeederConfig, market: Address) {
  const latest = await clients.publicClient.getBlockNumber();
  const found: { buyer: Address; want: number; collateralIn: bigint }[] = [];
  for (let from = config.deployBlock; from <= latest; from += LOG_CHUNK) {
    const to = from + LOG_CHUNK - 1n < latest ? from + LOG_CHUNK - 1n : latest;
    const logs = await clients.publicClient.getContractEvents({
      address: market,
      abi: flightMarketAbi,
      eventName: "Bought",
      fromBlock: from,
      toBlock: to,
    });
    for (const log of logs) {
      const { buyer, want, collateralIn } = log.args;
      if (buyer && want !== undefined && collateralIn !== undefined) {
        found.push({ buyer, want, collateralIn });
      }
    }
  }
  return found;
}

async function push(
  clients: Clients,
  market: Address,
  functionName: "redeemFor" | "refundFor",
  holder: Address,
): Promise<Hex> {
  const hash = await clients.walletClient.writeContract({
    address: market,
    abi: flightMarketAbi,
    functionName,
    args: [holder],
  });
  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Transaction reverted: ${hash}`);
  return hash;
}

/** Pays every winner and refunds every voided stake straight to their wallet. */
async function payMarket(
  clients: Clients,
  config: FeederConfig,
  flight: SettledFlight,
  market: MarketView,
  lines: Map<Address, Line[]>,
  receipts: Map<Address, Hex>,
) {
  const bought = await purchases(clients, config, market.market);
  if (bought.length === 0) return;
  const outcome = await clients.publicClient.readContract({
    address: market.market,
    abi: flightMarketAbi,
    functionName: "outcome",
  });

  const buyers = [...new Set(bought.map((purchase) => purchase.buyer))];
  for (const buyer of buyers) {
    const mine = bought.filter((purchase) => purchase.buyer === buyer);
    let paid = 0n;

    if (market.voided) {
      paid = await clients.publicClient.readContract({
        address: market.market,
        abi: flightMarketAbi,
        functionName: "contributions",
        args: [buyer],
      });
      if (paid > 0n) receipts.set(buyer, await push(clients, market.market, "refundFor", buyer));
    } else {
      paid = await clients.publicClient.readContract({
        address: outcome,
        abi: outcomeTokenAbi,
        functionName: "balanceOf",
        args: [buyer, BigInt(market.winning)],
      });
      if (paid > 0n) receipts.set(buyer, await push(clients, market.market, "redeemFor", buyer));
    }

    for (const side of [0, 1]) {
      const stake = mine
        .filter((purchase) => purchase.want === side)
        .reduce((sum, purchase) => sum + purchase.collateralIn, 0n);
      if (stake === 0n) continue;
      const result = market.voided ? "refunded" : side === market.winning ? "won" : "lost";
      const line: Line = {
        label: labelOf(flight, market, side),
        stake,
        paid: result === "lost" ? 0n : result === "refunded" ? stake : paid,
        result,
      };
      lines.set(buyer, [...(lines.get(buyer) ?? []), line]);
    }
  }
}

function landedLine(flight: SettledFlight): string {
  if (!flight.finalized) return `${flight.number} was cancelled or diverted`;
  const minutes = flight.delayMinutes;
  if (minutes > 0) return `${flight.number} landed ${minutes} min late`;
  if (minutes < 0) return `${flight.number} landed ${-minutes} min early`;
  return `${flight.number} landed on time`;
}

export function compose(
  flight: SettledFlight,
  wallet: Address,
  lines: Line[],
  receipt: Hex | undefined,
) {
  const total = lines.reduce((sum, line) => sum + line.paid, 0n);
  const won = lines.some((line) => line.result === "won");
  const refunded = lines.every((line) => line.result === "refunded");
  const headline = landedLine(flight);
  const subject = refunded
    ? `${headline}: ${usd(total)} USDG refunded`
    : won
      ? `${headline}: you won ${usd(total)} USDG`
      : `${headline}: no payout this time`;
  const sent = total > 0n ? `${usd(total)} USDG was sent to your wallet ${wallet}.` : "";
  const explorer = receipt ? `https://sepolia.arbiscan.io/tx/${receipt}` : null;

  const text = [
    headline + ` (${flight.route.replace("-", " → ")}).`,
    "",
    ...lines.map(
      (line) => `${line.label}: staked ${usd(line.stake)}, ${line.result}, paid ${usd(line.paid)}`,
    ),
    "",
    sent,
    explorer ? `Transaction: ${explorer}` : "",
    "Nothing to claim: payouts go straight to your wallet.",
  ]
    .filter((row, index, rows) => row !== "" || rows[index - 1] !== "")
    .join("\n");

  const rows = lines
    .map((line) => {
      const lost = line.result === "lost";
      const outcome = lost ? "Lost" : line.result === "refunded" ? "Refunded" : "Won";
      return `<tr>
<td style="padding:14px 0;border-bottom:1px solid #efe9e2;font-size:15px;color:#1d1a1b">${line.label}<br><span style="font-size:13px;color:#8a7f80">Staked $${usd(line.stake)} · ${outcome}</span></td>
<td align="right" style="padding:14px 0;border-bottom:1px solid #efe9e2;font-size:17px;font-weight:700;color:${lost ? "#8a7f80" : "#2f7a46"};white-space:nowrap">${lost ? "$0.00" : `+$${usd(line.paid)}`}</td>
</tr>`;
    })
    .join("");
  const button = explorer
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="background:#8c1320;border-radius:999px">
<a href="${explorer}" style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:600;color:#fff6e0;text-decoration:none">View the payout on Arbiscan →</a>
</td></tr></table>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f1ec">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 12px;font-family:Geist,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#8c1320;background-image:linear-gradient(160deg,#c2415f,#8c1320);padding:22px 32px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle"><img src="${LOGO_URL}" width="40" height="40" alt="" style="display:block;border-radius:10px"></td>
<td style="vertical-align:middle;padding-left:12px;font-size:22px;font-weight:700;color:#fff6e0;letter-spacing:-.02em">gathæro</td>
<td style="vertical-align:middle;padding-left:16px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#f3c9d0">${flight.number} · ${flight.route.replace("-", " → ")}</td>
</tr></table>
</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 20px;font-size:26px;line-height:1.2;color:#1d1a1b;letter-spacing:-.01em">${subject}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #efe9e2">${rows}</table>
${sent ? `<p style="margin:20px 0 0;font-size:15px;line-height:1.5;color:#1d1a1b">${total > 0n ? `<strong>${usd(total)} USDG</strong> was sent to your wallet` : ""}<br><span style="font-family:Menlo,monospace;font-size:13px;color:#6f6f6f">${wallet}</span></p>` : ""}
${button}
</td></tr>
<tr><td style="padding:20px 32px;background:#faf7f3;font-size:13px;line-height:1.5;color:#8a7f80">Nothing to claim: payouts go straight to your wallet. We delete this email address now that your flight has settled.<br><a href="https://gathaero.space" style="color:#8c1320;text-decoration:none">gathaero.space</a></td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject, text, html };
}

/** After every market on a flight settles: push payouts, then email each subscriber their result. */
export async function payOut(clients: Clients, config: FeederConfig, flight: SettledFlight) {
  if (!isSettled(flight) || (await alreadyPaid(flight.flightId))) return;

  const lines = new Map<Address, Line[]>();
  const receipts = new Map<Address, Hex>();
  for (const market of marketsOf(flight)) {
    await payMarket(clients, config, flight, market, lines, receipts);
  }

  for (const [wallet, rows] of lines) {
    const email = await emailOf(flight.flightId, wallet);
    if (!email) continue;
    try {
      await send({ to: email, ...compose(flight, wallet, rows, receipts.get(wallet)) });
      await forget(flight.flightId, wallet);
    } catch (error) {
      console.warn(`  ${flight.number}: ${(error as Error).message}`);
    }
  }
  await markPaid(flight.flightId);
  console.log(`  ${flight.number}: paid ${receipts.size} wallets`);
}
