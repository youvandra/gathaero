# Gathæro — Spec & Catatan

> Event-driven derivatives market onchain: posisi atas risiko delay penerbangan.
> Hedger (traveler) dapat proteksi; trader dapat pasar. Settlement instan.

## 0. Ringkasan
- **Hackathon:** Arbitrum Open House Singapore (online buildathon), deadline build 13 Okt.
- **Chain:** Arbitrum Sepolia (421614) / Arbitrum One (42161).
- **Framing:** app konsumer, responsive, blockchain invisible, settlement instan.
- **Bentuk:** PWA (web, installable).
- **Bounty target:** Paxos (stablecoin) · QuickNode (RPC) · Dune (dashboard) · ZeroDev (gasless) · Pendle (yield). Stretch: Stylus (Rust AMM).

## 1. Aset
| Aset | Bentuk | Ticker | Untuk |
|---|---|---|---|
| Settlement | ERC-20 stablecoin | `USDC` | bayar / payout |
| Posisi | ERC-1155 per flight | `SQ956-15NOV-DELAY` / `-ONTIME` | trade & hedge |
| LP share | ERC-20 per rute | `AT-SINCGK` | setoran LP |
| `$AIR` | roadmap | — | skip di MVP |

Outcome share bayar **1 unit stablecoin** kalau menang, 0 kalau kalah.
Ticker posisi unik per flight (bukan token global).

## 2. Aktor
Hedger (traveler) · Trader (spekulan) · LP (underwriter) · Oracle (CRE) · MockFeeder (demo).

## 3. Flow
```
1. Flight didaftarkan → market 2 outcome dibuat
2. LP deposit ke market → liquidity (AMM)
3. Traveler beli DELAY / trader trading
4. Market OPEN sampai LANDING
5. CRE cron → fetch API flight → consensus → tulis on-chain
6. Landing → hasil final → market resolve
7. Pemenang redeem 1 stablecoin/share otomatis
8. LP ambil sisa premium (yield)
```

## 4. Kontrak (Solidity · Foundry)
| Kontrak | Fungsi |
|---|---|
| `FlightRegistry` | daftar flight (flightNo, tanggal, jadwal) |
| `MarketFactory` | bikin market + outcome token per flight |
| `FlightMarket` | AMM CPMM 2 outcome, buy, resolve, redeem, liquidity |
| `MarketKind` | `Protection` (delay binary) · `Threshold` (ATA ≤ strike / prediction) |
| `FlightOracleConsumer` | multi-reporter, simpan resolusi |
| `FlightOracleReceiver` | `IReceiver` → terima report dari CRE |
| `MockFeeder` | fallback signer (demo) |
| `OutcomeToken` | ERC-1155 (OpenZeppelin) |
| `MockERC20` | stablecoin mock buat lokal |

## 5. Oracle
```
CRE workflow (TypeScript):
  cron trigger → runtime.http.fetch(flight status API)
  → consensus DON → runtime.report(payload)
  → evmClient.writeReport(FlightOracleReceiver @ Arbitrum Sepolia)
Fallback demo: MockFeeder nimpa hasil (interface sama).
```
- CRE support Arbitrum sejak CLI `v1.0.0+`.
- Pastikan: deploy access, `cre workflow supported-chains`.

## 6. Frontend (Vite + React + TS, responsive PWA)
Landing + halaman publik (Markets, How it works, Docs) + app (Home, Market, Positions, Vault).
Responsive: sidebar di desktop, bottom-nav di mobile. Video hero ala nexum + glass UI.

## 7. Tech Stack
| Layer | Pilihan | Alasan |
|---|---|---|
| Kontrak | Foundry `>=1.8.0` + Solidity | standar EVM |
| Frontend | Vite + React + TS + Tailwind | cepat, cocok UI glass |
| Wallet | wagmi + viem | viem punya `arbitrum`/`arbitrumSepolia` |
| PWA | vite-plugin-pwa | installable |
| Oracle | Chainlink CRE (TS) | HTTP API → on-chain |
| Mock feeder | Node + viem (TS) | satu bahasa, reuse |
| RPC | QuickNode | bounty + infra |

## 8. Arbitrum — Fakta Teknis
- Arbitrum Sepolia: Chain ID **421614**, RPC `https://sepolia-rollup.arbitrum.io/rpc`
- Arbitrum One: Chain ID **42161**, RPC `https://arb1.arbitrum.io/rpc`
- Gas token **ETH** (butuh faucet untuk testnet)
- EVM-compatible penuh; `evm_version = cancun` aman
- Explorer: Arbiscan / Sepolia Arbiscan

## 9. Struktur Repo
```
/contracts   (Foundry: src, test, script)
/app         (Vite + React + TS + Tailwind, wagmi/viem, PWA)
/cre         (Chainlink CRE workflow TS)
/feeder      (mock feeder Node)
/docs        (spec)
```

## 10. Scope
**Masuk:** 1 rute (SIN→CGK), market 2 outcome, AMM, resolve, auto-redeem, CRE + mock, landing + app.
**Keluar (roadmap):** passenger earn (Fly&Earn), secondary market, tranching/Pendle, multi-rute, `$AIR`, Stylus AMM.

## 11. Reliability & Buildability
| Komponen | Reliable? | Risiko | Mitigasi |
|---|---|---|---|
| Foundry + Solidity @ Arbitrum | ✅ tinggi | rendah | — |
| Arbitrum Sepolia | ✅ | rendah | faucet ETH |
| viem/wagmi + Arbitrum | ✅ | rendah | built-in chain |
| Vite + React + Tailwind + PWA | ✅ | rendah | — |
| ERC-1155 + AMM CPMM | ✅ | math AMM | tes unit Foundry |
| Chainlink CRE deploy access | ⚠️ | gate approval | MockFeeder fallback |
| Flight data API | ⚠️ | auth/rate-limit | fallback mock |

## 12. Risiko Global
1. CRE deploy-access gate → MockFeeder siap.
2. Liquidity cold-start → seed manual + bot demo.
3. Regulasi → framing "market/venue", bukan "asuransi".
4. Track lawannya DeFi serius → menangkan lewat bounty + demo dramatis.

## 13. Data Asli (Real Flight API) — AeroDataBox
- Akses via **RapidAPI** (`aerodatabox.p.rapidapi.com`), header `X-RapidAPI-Key`.
- Endpoint: `GET /flights/number/{number}/{date}` → **CONFIRMED works**.
- **Delay = `arrival.revisedTime − arrival.scheduledTime`** (gak ada field delay eksplisit).
- Contoh asli: **SQ956 SIN→CGK**.
- Free tier RapidAPI Basic (400 units) cukup buat demo; cache 7 hari; attribution wajib.
- **⚠️ Legal:** dilarang resell raw data; oracle republish derivatif = abu-abu (aman buat hackathon).
- **Jebakan:** data asli gak bisa ngatur delay → sediakan **demo mode** (injeksi storm).

## 14. Open Questions
- Track/bounty persis Arbitrum Open House (cek di HackQuest).
- CRE: Arbitrum Sepolia di-enable untuk tenant kita?
- API key AeroDataBox (RapidAPI) udah ada?
