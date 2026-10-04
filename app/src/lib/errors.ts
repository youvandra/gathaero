import {
  BaseError,
  ContractFunctionRevertedError,
  decodeErrorResult,
  InsufficientFundsError,
  UserRejectedRequestError,
  type Abi,
  type Hex,
} from "viem";

import { targetChain } from "../config/chains";
import * as generated from "./abi/generated";

export type Explained = { title: string; message: string };

export class AppError extends Error {
  readonly title: string;

  constructor(title: string, message: string) {
    super(message);
    this.title = title;
  }
}

const ERROR_ABI = Object.values(generated)
  .flat()
  .filter((item) => item.type === "error") as Abi;

const REVERTS: Record<string, Explained> = {
  ERC1155InvalidReceiver: {
    title: "This wallet can't hold market shares",
    message:
      "Smart-contract wallets can't receive the shares a market returns. Use a regular wallet such as MetaMask or Rabby.",
  },
  MarketClosed: {
    title: "Trading is closed",
    message: "This flight has departed, so trading is closed. It settles after landing.",
  },
  MarketNotSeeded: {
    title: "Not open yet",
    message: "This market is still being opened. Try again in a minute.",
  },
  ResolutionFinal: {
    title: "Already settled",
    message: "This flight has a final arrival time, so it can no longer be cancelled.",
  },
  StakeLimitExceeded: {
    title: "Limit reached",
    message:
      "Each wallet can put up to 200 USDG on one flight, across all its markets. Try a smaller amount.",
  },
  MarketAlreadyResolved: {
    title: "Market already settled",
    message: "Open Positions to see your result and claim.",
  },
  MarketNotResolved: {
    title: "Not settled yet",
    message: "You can claim once the flight has landed and the market settles.",
  },
  SlippageExceeded: {
    title: "Price moved",
    message: "Someone traded just before you. Check the new price and try again.",
  },
  InsufficientLiquidity: {
    title: "Amount too large",
    message: "This market can't fill that size. Try a smaller amount.",
  },
  ERC20InsufficientBalance: {
    title: "Not enough USDG",
    message: "Tap your USDG balance at the top to get test USDG, then try again.",
  },
  ERC20InsufficientAllowance: {
    title: "USDG not approved",
    message: "Approve USDG in your wallet first, then try again.",
  },
  NothingToRedeem: {
    title: "Nothing to claim",
    message: "This wallet has no winning or refundable position in this market.",
  },
  InsufficientShares: {
    title: "Not enough shares",
    message: "You're trying to withdraw more than this wallet holds.",
  },
  ZeroAmount: { title: "Enter an amount", message: "The amount must be more than zero." },
  NotPassenger: {
    title: "Boarding pass needed",
    message: "Verify your boarding pass for this flight before trading on it.",
  },
  PassAlreadyUsed: {
    title: "Boarding pass already used",
    message: "This boarding pass is linked to another wallet.",
  },
  PassExpired: {
    title: "Verification expired",
    message: "Scan your boarding pass again, then confirm in your wallet within 15 minutes.",
  },
  Unauthorized: {
    title: "Wrong wallet",
    message:
      "This wallet can't do that. If you started at a kiosk, connect the wallet whose address you showed there.",
  },
};

const has = (error: BaseError, predicate: (e: unknown) => boolean): boolean =>
  Boolean(error.walk(predicate));

const codeOf = (e: unknown): number | undefined =>
  typeof e === "object" && e !== null && "code" in e && typeof e.code === "number"
    ? e.code
    : undefined;

function revertName(error: BaseError): string | undefined {
  const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
  if (reverted instanceof ContractFunctionRevertedError && reverted.data?.errorName) {
    return reverted.data.errorName;
  }

  const withData = error.walk(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      "data" in e &&
      typeof e.data === "string" &&
      e.data.startsWith("0x") &&
      e.data.length >= 10,
  ) as { data?: Hex } | null;
  if (!withData?.data) return undefined;

  try {
    return decodeErrorResult({ abi: ERROR_ABI, data: withData.data }).errorName;
  } catch {
    return undefined;
  }
}

export function explainError(error: unknown): Explained {
  if (error instanceof AppError) return { title: error.title, message: error.message };
  if (!(error instanceof BaseError)) {
    return {
      title: "Something went wrong",
      message: error instanceof Error ? error.message : "Please try again.",
    };
  }

  if (has(error, (e) => e instanceof UserRejectedRequestError || codeOf(e) === 4001)) {
    return {
      title: "Cancelled in your wallet",
      message: "Nothing was sent. Try again and press Confirm in your wallet when it pops up.",
    };
  }
  if (has(error, (e) => codeOf(e) === -32002)) {
    return {
      title: "Wallet is waiting for you",
      message: "A request is already open. Open your wallet extension and finish or close it.",
    };
  }
  if (has(error, (e) => codeOf(e) === 4902 || (e instanceof Error && e.name.includes("Chain")))) {
    return {
      title: "Wrong network",
      message: `Switch your wallet to ${targetChain.name}, then try again.`,
    };
  }
  if (has(error, (e) => e instanceof InsufficientFundsError)) {
    return {
      title: "Not enough ETH for gas",
      message: `Get free ${targetChain.name} ETH from a faucet, then try again.`,
    };
  }

  const name = revertName(error);
  if (name && REVERTS[name]) return REVERTS[name];

  return {
    title: "Transaction failed",
    message: (error.shortMessage || error.message).split("\n")[0],
  };
}

export function errorToast(error: unknown) {
  const { title, message } = explainError(error);
  const cancelled = title === "Cancelled in your wallet";
  return {
    tone: cancelled ? ("caution" as const) : ("critical" as const),
    title,
    children: message,
  };
}
