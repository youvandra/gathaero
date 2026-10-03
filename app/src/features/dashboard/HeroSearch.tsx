import { Button, SearchField } from "cordon-ui";
import { useState } from "react";

export function HeroSearch({
  popular,
  onSearch,
}: {
  popular: string[];
  onSearch: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const submit = () => {
    const query = code.trim() || popular[0];
    if (query) onSearch(query);
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-[var(--cordon-radius-5)] border p-5 sm:p-6"
      style={{
        borderColor: "var(--cordon-hairline)",
        background: "var(--cordon-paper-raised)",
      }}
    >
      <div className="flex flex-col gap-1">
        <h2
          style={{
            margin: 0,
            fontSize: "var(--cordon-size-title)",
            fontWeight: 600,
            color: "var(--cordon-ink)",
          }}
        >
          Find a flight
        </h2>
        <p
          style={{ margin: 0, color: "var(--cordon-copy)", fontSize: "var(--cordon-size-caption)" }}
        >
          Search any flight number and open its delay market.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="sm:flex-1">
          <SearchField
            size="lg"
            placeholder="Flight number — e.g. SQ956"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onSearch={submit}
          />
        </div>
        <Button variant="primary" size="lg" onClick={submit}>
          Search flight
        </Button>
      </div>

      {popular.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span style={{ color: "var(--cordon-copy-dim)", fontSize: "var(--cordon-size-caption)" }}>
            Popular
          </span>
          {popular.map((flight) => (
            <Button key={flight} variant="ghost" size="sm" onClick={() => onSearch(flight)}>
              {flight}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
