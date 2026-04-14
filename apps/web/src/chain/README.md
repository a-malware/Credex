# ColdStart-PoR Blockchain Integration

Complete blockchain integration for the ColdStart-PoR Proof-of-Reputation protocol on Solana.

## 📁 Module Structure

```
src/chain/
├── wallet-provider.tsx      # Wallet connection (Phantom, Solflare)
├── program.ts               # Anchor program singleton & PDA helpers
├── accounts.ts              # React hooks for fetching on-chain data
├── instructions.ts          # Transaction execution wrappers
├── merkle.ts                # Merkle tree generation & verification
├── utils.ts                 # Helper utilities
├── types.ts                 # TypeScript type definitions
├── index.ts                 # Main exports
├── components/              # Example React components
│   ├── NetworkStatus.tsx    # Display network config
│   ├── MyNodeCard.tsx       # Display user's node
│   ├── RegisterNodeButton.tsx
│   ├── SubmitTaskButton.tsx
│   ├── NodeList.tsx         # List all nodes
│   ├── VouchButton.tsx
│   └── index.ts
├── idl/
│   └── coldstart_por.json   # Program IDL
└── README.md                # This file
```

## 🚀 Quick Start

### 1. Import Components

```typescript
import { 
  NetworkStatus, 
  MyNodeCard, 
  RegisterNodeButton 
} from '@/chain/components';

function Dashboard() {
  return (
    <div>
      <NetworkStatus />
      <MyNodeCard />
      <RegisterNodeButton />
    </div>
  );
}
```

### 2. Use Hooks

```typescript
import { useNetworkConfig, useNodeState } from '@/chain';
import { useWallet } from '@solana/wallet-adapter-react';

function MyComponent() {
  const { publicKey } = useWallet();
  const { data: config } = useNetworkConfig();
  const { data: nodeState } = useNodeState(publicKey);
  
  return (
    <div>
      <p>Current Round: {config?.currentRound.toString()}</p>
      <p>My Reputation: {nodeState?.reputationBps}</p>
    </div>
  );
}
```

### 3. Execute Transactions

```typescript
import { registerNode } from '@/chain';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';

async function register() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  
  const provider = new AnchorProvider(
    connection,
    { publicKey, signTransaction, signAllTransactions },
    { commitment: 'confirmed' }
  );
  
  const signature = await registerNode(provider);
  console.log('Registered:', signature);
}
```

## 📚 API Reference

### Hooks

#### `useNetworkConfig()`
Fetches the global network configuration.

**Returns:**
```typescript
{
  data: NetworkConfig | null;
  loading: boolean;
  error: Error | null;
}
```

**NetworkConfig fields:**
- `currentRound: bigint` - Current consensus round
- `totalNodes: number` - Total registered nodes
- `nTasks: number` - Phase 1 task count
- `mRounds: number` - Phase 3 graduation rounds
- `deltaBps: bigint` - Vouching stake fraction (BPS)
- `alphaBps: bigint` - Dampening factor (BPS)
- `thetaPBps: bigint` - Probationary threshold (BPS)
- `tauVBps: bigint` - Voucher eligibility threshold (BPS)
- `lambdaBps: bigint` - Time-decay factor (BPS)

#### `useNodeState(owner?: PublicKey)`
Fetches node state for a specific wallet.

**Returns:**
```typescript
{
  data: NodeState | null;
  loading: boolean;
  error: Error | null;
}
```

**NodeState fields:**
- `owner: PublicKey` - Node owner wallet
- `reputationBps: bigint` - Reputation score (0-10000)
- `phase: NodePhase` - Current phase (Phase1, Phase2, Phase3, Full, Banned)
- `tasksCompleted: number` - Phase 1 tasks completed
- `tasksPassed: number` - Phase 1 tasks passed
- `honestRounds: number` - Honest rounds in Phase 3
- `lastVotedRound: bigint` - Last round voted

#### `useVouchRecord(voucher?: PublicKey, candidate?: PublicKey)`
Fetches vouch record between voucher and candidate.

#### `useSlashVote(candidate?: PublicKey)`
Fetches slash vote status for a candidate.

### Instructions

All instruction functions return `Promise<string>` (transaction signature).

#### `registerNode(provider: AnchorProvider)`
Register a new node (Phase 1 entry).

#### `submitTaskProof(provider, taskIndex, leafData, proof)`
Submit a Phase 1 task with Merkle proof.

**Parameters:**
- `taskIndex: number` - Task index (0-19)
- `leafData: Uint8Array` - Leaf data (32 bytes)
- `proof: Uint8Array[]` - Merkle proof path

#### `vouchForNode(provider, candidatePubkey)`
Vouch for a Phase 2 candidate.

#### `castVote(provider, round)`
Cast a consensus vote for the current round.

#### `releaseVoucherStake(provider, candidatePubkey)`
Release voucher stake after candidate graduates.

#### `recordRoundOutcome(provider, cosigner1, cosigner2, targetNode, round, wasHonest)`
Committee confirms voting outcome (requires 3 signatures).

#### `proposeSlash(provider, candidatePubkey)`
Propose slashing a misbehaving node.

#### `voteSlash(provider, candidatePubkey)`
Vote to slash (committee member).

#### `executeSlash(provider, candidatePubkey, voucherPubkey)`
Execute slash after 3+ votes.

### Merkle Utilities

#### `buildMerkleTree(leaves: Buffer[])`
Build Merkle tree from leaves.

**Returns:** `{ root: Buffer, depth: number }`

#### `getMerkleProof(leaves: Buffer[], index: number)`
Get Merkle proof for a specific leaf.

**Returns:** `Buffer[]` - Proof path

#### `verifyMerkleProof(root, leaf, proof, leafIndex)`
Verify a Merkle proof.

**Returns:** `boolean`

#### `fetchSolanaBlockHashes(connection, count)`
Fetch recent Solana block hashes (for task leaves).

**Returns:** `Promise<Buffer[]>`

#### `generateTaskDataset(count)`
Generate complete task dataset from Solana mainnet.

**Returns:**
```typescript
Promise<{
  root: string;
  depth: number;
  leaves: string[];
}>
```

### Utility Functions

#### `getExplorerUrl(signature, cluster?)`
Generate Solana Explorer URL for a transaction.

#### `getAccountExplorerUrl(address, cluster?)`
Generate Solana Explorer URL for an account.

#### `formatReputation(reputationBps)`
Format reputation BPS to percentage string.

**Example:** `8500` → `"85.00%"`

#### `bpsToDecimal(bps)`
Convert BPS to decimal (0-1 range).

**Example:** `5000` → `0.5`

#### `getPhaseLabel(phase)`
Get human-readable phase name.

**Example:** `{ phase1: {} }` → `"Phase 1: Probationary Tasks"`

#### `getPhaseColor(phase)`
Get color for phase (for UI styling).

**Returns:** `'blue' | 'yellow' | 'purple' | 'green' | 'red' | 'gray'`

#### `shortenAddress(address, chars?)`
Shorten public key for display.

**Example:** `"7xKX...9zYp"` (default 4 chars each side)

#### `isPhase(phase, targetPhase)`
Check if node is in a specific phase.

#### `parseTransactionError(error)`
Parse error message from transaction failure.

## 🎨 Example Components

### NetworkStatus
Displays network configuration and protocol parameters.

```typescript
import { NetworkStatus } from '@/chain/components';

<NetworkStatus />
```

### MyNodeCard
Displays current user's node status.

```typescript
import { MyNodeCard } from '@/chain/components';

<MyNodeCard />
```

### RegisterNodeButton
Button to register a new node.

```typescript
import { RegisterNodeButton } from '@/chain/components';

<RegisterNodeButton />
```

### SubmitTaskButton
Button to submit a Phase 1 task with Merkle proof.

```typescript
import { SubmitTaskButton } from '@/chain/components';

<SubmitTaskButton taskIndex={0} />
```

### NodeList
List all nodes in the network (with optional phase filter).

```typescript
import { NodeList } from '@/chain/components';

// All nodes
<NodeList />

// Only Phase 2 nodes
<NodeList filterPhase="phase2" />
```

### VouchButton
Button to vouch for a candidate.

```typescript
import { VouchButton } from '@/chain/components';

<VouchButton candidateAddress="7xKX...9zYp" />
```

## 🔧 Configuration

### Environment Variables

Create `apps/web/.env`:

```bash
VITE_SOLANA_CLUSTER=devnet
VITE_PROGRAM_ID=CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh
```

### Program ID

The program ID is hardcoded in `program.ts`:

```typescript
export const PROGRAM_ID = new PublicKey('CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh');
```

Update this if you deploy to a different address.

## 🧪 Testing

### Manual Testing Checklist

- [ ] Wallet connects successfully (Phantom/Solflare)
- [ ] Network config displays correctly
- [ ] Node registration works
- [ ] Task submission with Merkle proof works
- [ ] Vouching works
- [ ] Vote casting works
- [ ] Explorer links open correctly
- [ ] Error messages display properly
- [ ] Loading states work

### Testing with Devnet

1. Connect wallet to Solana devnet
2. Get devnet SOL from faucet: https://faucet.solana.com
3. Test each instruction
4. Verify transactions on Explorer

## 📖 Additional Resources

- [Solana Documentation](https://docs.solana.com)
- [Anchor Documentation](https://www.anchor-lang.com)
- [Wallet Adapter Docs](https://github.com/solana-labs/wallet-adapter)
- [Integration Guide](../../INTEGRATION_GUIDE.md)
- [Design Document](../../../../.kiro/specs/coldstart-por-protocol-upgrade/design.md)

## 🐛 Troubleshooting

### "Wallet not connected"
Make sure wallet is connected before calling instructions.

### "Transaction failed"
Check:
- Sufficient SOL balance
- Correct phase for instruction
- Valid parameters
- Network connection

### "Account not found"
The account may not exist yet. Check if node is registered.

### "Invalid Merkle proof"
Ensure you're using the same Merkle root that was set during network initialization.

## 📝 License

This code is part of the ColdStart-PoR protocol implementation.
