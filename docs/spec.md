# Airtime — Spec & Catatan

> Event-driven derivatives market onchain: posisi atas risiko delay penerbangan.
> Hedger (traveler) dapat proteksi; trader dapat pasar. Settlement instan.

## 0. Ringkasan
- **Hackathon:** Arbitrum Metropolis (1 Sep – 13 Okt), deadline build 13 Okt.
- **Track:** 02 — Consumer Products & Payments.
- **Bounty target:** Agora Mobile Trading ($10k) + Chainlink CRE ($3k, all-tracks).
- **Framing:** app konsumer, mobile, blockchain invisible, settlement instan.
- **Bentuk:** mobile-first PWA (bukan web desktop, bukan native dari nol).

## 1. Aset
| Aset | Bentuk | Ticker | Untuk |
|---|---|---|---|
| Settlement | USDC | `USDC` | bayar / payout |
| Posisi | ERC-1155 per flight | `TR286-15NOV-DELAY` / `-ONTIME` | trade & hedge |
| LP share | ERC-20 per rute | `AT-SINCGK` | setoran LP |
| `$AIR` | roadmap | — | skip di MVP |

Outcome share bayar **1 USDC** kalau menang, 0 kalau kalah.
Ticker posisi unik per flight (bukan token global).

## 2. Aktor
Hedger (traveler) · Trader (spekulan) · LP (underwriter) · Oracle (CRE) · MockFeeder (demo).

## 3. Flow
```
1. Flight didaftarkan → market 2 outcome dibuat
2. LP deposit ke vault rute → liquidity (AMM)
3. Traveler beli DELAY / trader trading
4. Market OPEN sampai LANDING
5. CRE cron → fetch API flight → consensus → tulis on-chain
6. Landing → hasil final → market resolve
7. Pemenang redeem 1 USDC/share otomatis
8. LP ambil sisa premium (yield)
```

## 4. Kontrak (Solidity · Foundry)
| Kontrak | Fungsi |
|---|---|
| `FlightRegistry` | daftar flight (flightNo, tanggal, jadwal) |
| `MarketFactory` | bikin market + outcome token per flight |
| `FlightMarket` | AMM CPMM 2 outcome, buy/sell, resolve, redeem |
| `LiquidityVault` | deposit/withdraw LP per rute, exposure |
| `FlightOracleConsumer` | implement `IReceiver` → terima report dari CRE |
| `MockFeeder` | fallback signer (interface sama) |
| `OutcomeToken` | ERC-1155 (OpenZeppelin) |

## 5. Oracle
```
CRE workflow (TypeScript):
  cron trigger → runtime.http.fetch(flight status API)
  → consensus DON → runtime.report(payload)
  → evmClient.writeReport(FlightOracleConsumer @ Arbitrum Testnet)
Fallback demo: MockFeeder nimpa hasil (interface sama).
```
- Pastikan: CLI `v1.30.0+`, deploy access, `cre workflow supported-chains`.

## 6. Frontend (Vite PWA, mobile-first)
Layar: Cari Flight · Flight Market · My Positions · LP Vault · Feed + tombol **Simulate Storm**.

## 7. Tech Stack
| Layer | Pilihan | Alasan |
|---|---|---|
| Kontrak | Foundry `>=1.8.0` + Solidity | standar, support resmi Arbitrum |
| Frontend | Vite + React + TS | SPA/PWA client-side, ringan |
| Wallet | wagmi + viem `>=2.40` | viem udah punya `arbitrum.ts` |
| PWA | vite-plugin-pwa | installable → "app HP" |
| Oracle | Chainlink CRE (TS) | bounty + all-tracks |
| Mock feeder | Node + viem (TS) | satu bahasa, reuse |
| Pkg manager | Bun (fallback pnpm) | cepat; Foundry independen |
| RPC | QuickNode / Alchemy | credit gratis |

**Kenapa bukan Next.js:** wallet app 100% client-side; SSR/SEO gak kepake.
**Kenapa bukan Python:** CRE-nya TS → satu bahasa (TS) lebih hemat.

## 8. Arbitrum — Fakta Teknis
- Testnet: Chain ID **421614**, RPC `https://rpc.testnet.arbitrum.xyz`
- Mainnet: Chain ID **143**, RPC `https://rpc.arbitrum.xyz`
- Foundry `>=1.8.0` (aktifkan Arbitrum execution network)
- viem `>=2.40.0`, alloy-chains `>=0.2.20`
- Max contract size **128kb**; EIP-7702 + precompile P256 (`0x0100`) didukung

## 9. Struktur Repo
```
/contracts   (Foundry: src, test, script)
/app         (Vite + React + TS, wagmi/viem, PWA)
/cre         (Chainlink CRE workflow TS)
/feeder      (mock feeder Node)
```

## 10. Scope 12 Hari
**Masuk:** 1 rute (SIN→CGK), market 2 outcome, AMM, vault, resolve, auto-redeem, CRE + mock, frontend 5 layar.
**Keluar (roadmap):** passenger earn (Fly&Earn), secondary market, tranching, multi-rute, `$AIR`, Mera passkey.

Timeline: D1–3 kontrak · D4–6 CRE+oracle · D7–9 frontend · D10–11 integrasi/demo · D12 polish+submit.

## 11. Reliability & Buildability
| Komponen | Reliable? | Buildable 12 hari? | Risiko | Mitigasi |
|---|---|---|---|---|
| Foundry + Solidity @ Arbitrum | ✅ tinggi | ✅ | rendah | — |
| Arbitrum Testnet (421614) | ✅ | ✅ | rendah | — |
| viem/wagmi + Arbitrum | ✅ | ✅ | rendah | tambah custom chain network |
| Vite + React + PWA | ✅ tinggi | ✅ | rendah | — |
| ERC-1155 + AMM CPMM | ✅ | ✅ sedang | math AMM | tes unit Foundry |
| **Chainlink CRE deploy access** | ⚠️ sedang | ⚠️ | **gate approval** | MockFeeder fallback |
| Flight data API | ⚠️ | ✅ | auth/rate-limit/biaya | mock data buat demo |
| Agora bounty criteria | ❓ | ❓ | spesifik sponsor | cek requirement Agora |
| Bun | ✅ | ✅ | edge case | fallback pnpm |

**Verdict:** Core (kontrak, AMM, frontend, oracle mock, redeem) **reliable & buildable**.
Yang berisiko tinggi cuma dua: **CRE deploy access** dan **kriteria bounty Agora**.
Desain sengaja *source-agnostic* (CRE ↔ MockFeeder) supaya risiko terkontrol.

## 12. Risiko Global
1. CRE deploy-access gate → MockFeeder siap dari awal.
2. Liquidity cold-start → seed manual + bot buat demo.
3. Regulasi → framing "market/venue", bukan "asuransi".
4. Track 02 lawan consumer app lain → menangkan lewat bounty + demo dramatis.

## 13. Data Asli (Real Flight API) — KEPUTUSAN: pakai asli
Opsi API:
| API | Harga | Isi | Catatan |
|---|---|---|---|
| OpenSky Network | Gratis | ADS-B real (posisi, `on_ground`) | OAuth2 client_id/secret; 4.000 credit/hari; **gak ada jadwal** |
| AeroDataBox (RapidAPI) | Free tier terbatas | status by flight number + delay, jadwal vs aktual | **paling pas untuk delay** |
| AviationStack | Free tier (100/bln) | status + delay | kuota kecil |
| FlightAware AeroAPI | Berbayar | terlengkap | gak gratis |

**Pilihan: AeroDataBox saja.**

Akses (API sama, gateway beda):
| Jalur | Free | Paid | Catatan |
|---|---|---|---|
| RapidAPI | Basic free forever (400 units) | $8/mo (5.000) | paling gampang, 1 req/s |
| API.Market | Basic free 7-hari (400 units) | $7.50/mo | termurah |
| Direct | credits via feed ADS-B | $19/mo (40.000) | bisa free credit |

- **API units ≠ request.** Tier: T1=1, T2=2, T3=6 unit.
- **Cache boleh s/d 7 hari.** Attribution wajib di plan free.
- **Rekomendasi: RapidAPI Basic (free forever, 400 units).** Cukup buat demo.
- **Gateway (verifikasi dari OpenAPI):**
  | Jalur | URL | Header |
  |---|---|---|
  | Direct | `api.aerodatabox.com` | `X-Api-Key` |
  | API.Market | `prod.api.market/api/v1/aedbx/aerodatabox` | `x-api-market-key` |
  | RapidAPI | `aerodatabox.p.rapidapi.com` | `X-RapidAPI-Key` + `X-RapidAPI-Host` |
- Endpoint: `GET /flights/number/{number}/{date}` (flight status by number).
  - **CONFIRMED works** (RapidAPI, HTTP 200), return array flight.
  - Field: `departure.scheduledTime/revisedTime`, `arrival.scheduledTime/revisedTime/runwayTime`, `status`, `lastUpdatedUtc`.
  - **Delay = `arrival.revisedTime − arrival.scheduledTime`** (gak ada field delay eksplisit).
  - Contoh asli: **SQ956 SIN→CGK** (rute kita).
- **Status key:** Direct key valid tapi habis (402); **RapidAPI key aktif ✅**.
- **Status key yang dites** (`23f221e3-...`): valid **Direct key**, tapi **plan habis → HTTP 402**.
  - Buat hackathon: ambil **RapidAPI Basic (free forever, 400 units)**.
  - API balas **402/429** dengan pesan jelas → integrasi handle → **fallback MockFeeder**.
- CRE: simpan key di **secrets (Vault DON)**.

**⚠️ Legal:** dilarang resell raw data / bikin API di depan API mereka. Oracle republish derivatif = abu-abu. Aman buat hackathon; produk nyata butuh plan **Derived Work licensing** + attribution.

- Cron: jangan poll tiap menit (hemat units); poll 30–60 menit atau hanya window aktif.
- Fallback: MockFeeder / demo mode.

**Jebakan:** data asli = **gak bisa ngatur delay buat demo**. Maka:
- **Live mode**: data asli (kredibel).
- **Demo mode**: injeksi hasil → momen "storm".
Keduanya nembak interface kontrak yang sama.

**Teknis:**
- CRE simpan API key via **secrets (Vault DON)**.
- Match flight number → data harus hati-hati; pilih rute coverage bagus (SIN→CGK).
- API down/rate-limit → **fallback wajib** (ke MockFeeder/demo mode).

## 14. Open Questions
- Agora: requirement persis "Best Mobile Trading App"?
- CRE: apakah Arbitrum Testnet di-enable untuk tenant kita? (`cre workflow supported-chains`)
- API key AeroDataBox/OpenSky udah ada belum?
