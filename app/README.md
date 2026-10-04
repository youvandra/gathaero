# Gathæro app

React 19, Vite, TypeScript (strict), wagmi and viem, built as a PWA. Live at
<https://gathaero.space>.

| Route | Page |
|---|---|
| `/` | Landing with live numbers from Arbitrum |
| `/markets`, `/how`, `/docs` | Public pages |
| `/app` | Wallet-gated app: Home, Markets, a market's detail, Positions, Vault |
| `/kiosk` | The gate screen: choose, scan a boarding pass, pick, hand off by QR. Holds no wallet |
| `/claim` | Where the kiosk QR lands on the traveller's phone: link the pass, confirm |
| `/demo-pass` | Testnet only: a generated boarding pass for any open flight |

All data is read on-chain through `MarketLens`; trade history and payouts come
from contract events since `VITE_DEPLOY_BLOCK`.

```bash
npm install
cp .env.example .env    # addresses from the project README
npm run dev
npm run build           # tsc -b, then vite build
```

| Variable | Meaning |
|---|---|
| `VITE_CHAIN_ID`, `VITE_RPC_URL` | Arbitrum Sepolia by default |
| `VITE_MARKET_FACTORY`, `VITE_MARKET_LENS`, `VITE_COLLATERAL`, `VITE_PASS_REGISTRY` | Contract addresses |
| `VITE_VERIFIER_URL` | Boarding pass verifier, e.g. `https://gathaero.space/verifier` |
| `VITE_DEPLOY_BLOCK` | First block to scan for events |
| `VITE_FAUCET` | `false` hides the test USDG mint |
| `VITE_DEMO_PASS` | `false` hides demo boarding passes |

The UI components come from `cordon-ui`, a private library linked as a local
dependency, so a fresh clone needs it alongside the repo to build.
