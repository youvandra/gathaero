import { Button, EmptyState } from "cordon-ui";

/** Shown when on-chain data could not be read, with a way to try again. */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon="warning"
      title={`Couldn't load ${what}`}
      description="The network didn't answer. Check your connection, then try again."
      action={
        <Button variant="secondary" size="sm" iconStart="refresh" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
