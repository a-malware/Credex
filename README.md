# ColdStart-PoR: Cold-Start Proof-of-Reputation Protocol

A decentralized reputation system for Solana that enables trustless node onboarding through committee-based governance and Merkle proof verification.

## 🚀 Live Deployment

- **Network**: Solana Devnet
- **Program ID**: `CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh`
- **Explorer**: [View on Solana Explorer](https://explorer.solana.com/address/CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh?cluster=devnet)

## 📋 Overview

ColdStart-PoR is a novel reputation protocol that solves the cold-start problem in decentralized networks. New nodes progress through four phases:

1. **Phase 1 (Probationary)**: Complete computational tasks verified via Merkle proofs
2. **Phase 2 (Vouched)**: Receive vouches from established Full-phase nodes
3. **Phase 3 (Voting)**: Participate in consensus rounds to build reputation
4. **Full**: Graduate after M honest voting rounds with committee confirmation

### Key Features

- ✅ **Merkle Proof Task Verification**: Deterministic verification against Solana block hashes
- ✅ **Committee-Based Governance**: 3-signature confirmation for voting outcomes and slashing
- ✅ **Sybil Resistance**: Multi-phase progression with stake-based vouching
- ✅ **Decentralized Slashing**: Democratic 3-vote process to ban malicious nodes

## 🏗️ Architecture

### Smart Contract (Solana/Anchor)

```
programs/coldstart_por/
├── src/
│   └── lib.rs          # Main program logic
└── Cargo.toml
```

**Instructions**:
- `initialize_network` - Setup protocol parameters
- `register_node` - Register new node (Phase 1)
- `submit_task_proof` - Submit Merkle proof for task completion
- `vouch_for_node` - Vouch for Phase 2 node (locks stake)
- `cast_vote` - Participate in consensus round
- `record_round_outcome` - Committee confirms voting outcome (3 sigs)
- `propose_slash` - Propose slashing a malicious node
- `vote_slash` - Vote on slash proposal
- `execute_slash` - Execute slash after 3 votes
- `release_voucher_stake` - Release stake after graduation

### Frontend (React + Vite)

```
apps/web/
├── src/
│   ├── chain/              # Blockchain integration
│   │   ├── program.ts      # Program singleton & PDAs
│   │   ├── accounts.ts     # Account fetching hooks
│   │   ├── instructions.ts # Instruction wrappers
│   │   ├── merkle.ts       # Merkle tree utilities
│   │   └── wallet-provider.tsx
│   └── ...
└── package.json
```

## 🛠️ Development Setup

### Prerequisites

- **Rust** 1.70+
- **Solana CLI** 1.18+
- **Anchor** 0.32.1
- **Node.js** 18+
- **Yarn** or **npm**

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd anything-dev
```

2. **Install Anchor CLI**
```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.32.1 anchor-cli
```

3. **Install dependencies**
```bash
# Smart contract
cd programs/coldstart_por
cargo build

# Frontend
cd apps/web
npm install
```

4. **Configure Solana CLI**
```bash
solana config set --url devnet
solana-keygen new  # Create wallet if needed
```

### Build & Test

**Build smart contract**:
```bash
anchor build
```

**Run tests**:
```bash
anchor test
```

**Deploy to devnet**:
```bash
# Using bash (Linux/Mac/WSL)
bash scripts/deploy-devnet.sh

# Using PowerShell (Windows)
.\scripts\deploy-devnet.ps1
```

**Run frontend**:
```bash
cd apps/web
npm run dev
```

## 📊 Performance Benchmarks

Run benchmarks to measure compute units and transaction times:

```bash
cd scripts
ts-node benchmark.ts
```

Results are saved to `docs/benchmark-results.json`.

See [docs/benchmarks.md](docs/benchmarks.md) for detailed performance analysis.

## 🧪 Multi-Node Simulation

Simulate a 10-node network going through the complete lifecycle:

```bash
cd scripts
ts-node simulate-network.ts
```

This will:
1. Create 3 genesis Full nodes
2. Register 10 candidate nodes
3. Complete Phase 1 tasks for all candidates
4. Vouch for all candidates
5. Execute 10 consensus rounds
6. Measure total execution time and fees

Results are saved to `docs/simulation-results.json`.

## 📖 Documentation

- **[Deployment Summary](DEPLOYMENT_SUMMARY.md)** - Deployment details and protocol features
- **[Progress Summary](PROGRESS_SUMMARY.md)** - Development progress and status
- **[Benchmarks](docs/benchmarks.md)** - Performance measurements
- **[Requirements](.kiro/specs/coldstart-por-protocol-upgrade/requirements.md)** - Protocol requirements
- **[Design](.kiro/specs/coldstart-por-protocol-upgrade/design.md)** - Technical design
- **[Tasks](.kiro/specs/coldstart-por-protocol-upgrade/tasks.md)** - Implementation tasks

## 🔐 Security

### Committee-Based Governance

All critical operations require committee confirmation:
- **Voting outcomes**: 3 Full-phase signatures required
- **Slashing**: 3 Full-phase votes required
- **Reputation updates**: Only via committee-confirmed outcomes

### Sybil Resistance

- **Vouching**: Requires stake lock from Full-phase node
- **Phase progression**: Must complete tasks and voting rounds
- **Reputation decay**: λ·R(t) + (1−λ)·h(t) formula prevents reputation hoarding

### Merkle Proof Verification

- Tasks verified against Solana block hashes (tamper-proof)
- Constant verification cost (no mining required)
- Deterministic and auditable

## 🚢 Deployment

### Devnet (Current)

```bash
# Deploy smart contract
anchor deploy --provider.cluster devnet

# Deploy frontend to Vercel
npx vercel --prod
```

### Mainnet (Future)

1. Update `Anchor.toml` cluster to "Mainnet"
2. Update program ID in `apps/web/src/chain/program.ts`
3. Set `VITE_SOLANA_CLUSTER=mainnet-beta` in `.env`
4. Deploy with production wallet

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Solana Foundation** - For the blockchain infrastructure
- **Anchor Framework** - For the development framework
- **Academic Research** - Based on cold-start reputation system research

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ on Solana**
