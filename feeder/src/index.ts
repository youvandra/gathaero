import { fetchFlightStatus } from "./aerodatabox.js";
import { loadConfig } from "./config.js";
import { flightIdOf, postResolution } from "./oracle.js";

async function resolveDelayMinutes(
  config: ReturnType<typeof loadConfig>,
): Promise<number> {
  if (!config.rapidApi) {
    return config.fallbackDelayMinutes;
  }

  const status = await fetchFlightStatus(config.flightNumber, config.flightDate, {
    apiKey: config.rapidApi.key,
    host: config.rapidApi.host,
  });
  return status.delayMinutes;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const flightId = flightIdOf(config.flightNumber, config.flightDate);
  const delayMinutes = await resolveDelayMinutes(config);

  console.log(`flight ${config.flightNumber} ${config.flightDate} -> id ${flightId}`);
  console.log(`delay ${delayMinutes} min`);

  const hash = await postResolution(config, flightId, delayMinutes);
  console.log(`submitted ${hash}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
