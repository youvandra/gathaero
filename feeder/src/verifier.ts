import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { encodePacked, isAddress, isHex, keccak256, zeroAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { flightRegistryAbi, passRegistryAbi } from "./abi.js";
import { dayOfYearUtc, parseBoardingPass } from "./bcbp.js";
import { clientsFor } from "./chain.js";
import { loadConfig } from "./config.js";

const SIGNATURE_TTL_SECONDS = 15 * 60;
const MAX_BODY_BYTES = 8 * 1024;

type PassRequest = { flightId: Hex; wallet: Address; barcode: string };

class Rejected extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
};

const config = loadConfig();
const { publicClient } = clientsFor(config);
const verifier = privateKeyToAccount(requireEnv("VERIFIER_PRIVATE_KEY") as Hex);
const passRegistry = requireEnv("PASS_REGISTRY") as Address;
const port = Number(process.env.VERIFIER_PORT ?? 8787);

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) reject(new Rejected(413, "Request too large."));
      else chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseRequest(body: string): PassRequest {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Rejected(400, "Invalid request.");
  }
  const { flightId, wallet, barcode } = (data ?? {}) as Record<string, unknown>;
  if (typeof flightId !== "string" || !isHex(flightId) || flightId.length !== 66) {
    throw new Rejected(400, "Unknown flight.");
  }
  if (typeof wallet !== "string" || !isAddress(wallet)) throw new Rejected(400, "Invalid wallet.");
  if (typeof barcode !== "string") throw new Rejected(400, "Missing barcode.");
  return { flightId, wallet, barcode };
}

async function sign({ flightId, wallet, barcode }: PassRequest) {
  const pass = parseBoardingPass(barcode);
  if (!pass) throw new Rejected(422, "That isn't a boarding pass barcode.");

  const exists = await publicClient.readContract({
    address: config.contracts.registry,
    abi: flightRegistryAbi,
    functionName: "exists",
    args: [flightId],
  });
  if (!exists) throw new Rejected(404, "This flight isn't listed.");

  const flight = await publicClient.readContract({
    address: config.contracts.registry,
    abi: flightRegistryAbi,
    functionName: "getFlight",
    args: [flightId],
  });
  const [from, to] = flight.route.split("-");
  if (pass.flight.toUpperCase() !== flight.number.toUpperCase()) {
    throw new Rejected(422, `This pass is for ${pass.flight}, not ${flight.number}.`);
  }
  if (pass.from !== from || pass.to !== to) {
    throw new Rejected(422, `This pass is for ${pass.from} → ${pass.to}, not ${from} → ${to}.`);
  }
  const gap = Math.abs(pass.dayOfYear - dayOfYearUtc(Number(flight.scheduledDeparture)));
  if (gap > 1 && gap < 364) throw new Rejected(422, "This pass is for a different day.");

  const passHash = keccak256(
    encodePacked(
      ["bytes32", "string", "string"],
      [flightId, pass.bookingReference.toUpperCase(), pass.passenger.toUpperCase()],
    ),
  );
  // The registry enforces both rules; checking first gives a clear answer without a failed tx.
  const [holder, alreadyPassenger] = await Promise.all([
    publicClient.readContract({
      address: passRegistry,
      abi: passRegistryAbi,
      functionName: "holderOf",
      args: [passHash],
    }),
    publicClient.readContract({
      address: passRegistry,
      abi: passRegistryAbi,
      functionName: "isPassenger",
      args: [flightId, wallet],
    }),
  ]);
  if (alreadyPassenger) throw new Rejected(409, "This wallet is already verified for this flight.");
  if (holder !== zeroAddress && holder.toLowerCase() !== wallet.toLowerCase()) {
    throw new Rejected(409, "This boarding pass is already linked to another wallet.");
  }

  const expiry = BigInt(Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS);

  const signature = await verifier.signTypedData({
    domain: {
      name: "Gathaero",
      version: "1",
      chainId: config.chainId,
      verifyingContract: passRegistry,
    },
    types: {
      Pass: [
        { name: "flightId", type: "bytes32" },
        { name: "wallet", type: "address" },
        { name: "passHash", type: "bytes32" },
        { name: "expiry", type: "uint64" },
      ],
    },
    primaryType: "Pass",
    message: { flightId, wallet, passHash, expiry },
  });

  return {
    passHash,
    expiry: expiry.toString(),
    signature,
    passenger: pass.passenger,
    flight: pass.flight,
    seat: pass.seat,
  };
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, null);
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
  if (req.method !== "POST" || req.url !== "/passes")
    return send(res, 404, { error: "Not found." });

  try {
    send(res, 200, await sign(parseRequest(await readBody(req))));
  } catch (error) {
    if (error instanceof Rejected) return send(res, error.status, { error: error.message });
    console.error(error);
    send(res, 500, { error: "Verifier is unavailable. Try again shortly." });
  }
}).listen(port, () => console.log(`verifier ${verifier.address} on :${port}`));
