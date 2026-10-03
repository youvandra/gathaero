import { useCollateralBalance } from "./useBalance";
import { usePositions } from "./usePositions";

export function usePortfolio() {
  const balance = useCollateralBalance();
  const { positions, isLoading } = usePositions();

  const open = positions.filter((position) => position.state === "open");
  const claimable = positions.filter((position) => position.action !== null);
  const protectedPayout = open
    .filter((position) => position.side === "Delayed" && position.label === "Delay protection")
    .reduce((sum, position) => sum + Number(position.shares) / 1e6, 0);

  return {
    balance,
    isLoading,
    openCount: open.length,
    openValue: open.reduce((sum, position) => sum + position.value, 0),
    claimableCount: claimable.length,
    claimableValue: claimable.reduce((sum, position) => sum + position.value, 0),
    protectedPayout,
  };
}
