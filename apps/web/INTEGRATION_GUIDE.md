# ColdStart-PoR Frontend Integration Guide

## Overview

This guide explains how to integrate the blockchain functionality into your UI components. All the core infrastructure has been implemented in the `src/chain/` directory.

## Available Modules

### 1. Wallet Provider (`src/chain/wallet-provider.tsx`)

The wallet provider is already integrated into the app root. Users can connect their Phantom or Solflare wallets.

**Usage in components:**
```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function MyComponent() {
  const { publicKey, connected } = useWallet();
  
  return (
    <div>
      <WalletMultiButton />
      {connected && <p>Connected: {publicKey?.toString()}</p>}
    </div>
  );
}
```

### 2. Account Hooks (`src/chain/accounts.ts`)

Fetch on-chain account data with React hooks.

**Available hooks:**
- `useNetworkConfig()` - Fetch protocol parameters
- `useNodeState(owner: PublicKey)` - Fetch node state for a wallet
- `useVouchRecord(voucher: PublicKey, candidate: PublicKey)` - Fetch vouch record
- `useSlashVote(candidate: PublicKey)` - Fetch slash vote status

**Example - Display Network Config:**
```typescript
import { useNetworkConfig } from '../chain/accounts';

function Dashboard() {
  const { data: config, loading, error } = useNetworkConfig();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h2>Network Status</h2>
      <p>Current Round: {config.currentRound.toString()}</p>
      <p>Total Nodes: {config.totalNodes}</p>
      <p>N Tasks: {config.nTasks}</p>
      <p>M Rounds: {config.mRounds}</p>
    </div>
  );
}
```

**Example - Display User's Node State:**
```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { useNodeState } from '../chain/accounts';

function MyNodeStatus() {
  const { publicKey } = useWallet();
  const { data: nodeState, loading } = useNodeState(publicKey);
  
  if (!publicKey) return <div>Connect wallet to view node status</div>;
  if (loading) return <div>Loading...</div>;
  if (!nodeState) return <div>Node not registered</div>;
  
  return (
    <div>
      <h3>My Node</h3>
      <p>Phase: {Object.keys(nodeState.phase)[0]}</p>
      <p>Reputation: {nodeState.reputationBps / 100}%</p>
      <p>Tasks Completed: {nodeState.tasksCompleted}</p>
    </div>
  );
}
```

### 3. Instruction Functions (`src/chain/instructions.ts`)

Execute blockchain transactions.

**Available functions:**
- `registerNode(provider)` - Register a new node
- `submitTaskProof(provider, taskIndex, leafData, proof)` - Submit Phase 1 task
- `vouchForNode(provider, candidatePubkey)` - Vouch for a candidate
- `castVote(provider, round)` - Cast a consensus vote
- `releaseVoucherStake(provider, candidatePubkey)` - Release stake after graduation
- `recordRoundOutcome(provider, cosigner1, cosigner2, targetNode, round, wasHonest)` - Committee confirms outcome
- `proposeSlash(provider, candidatePubkey)` - Propose slashing a node
- `voteSlash(provider, candidatePubkey)` - Vote to slash (committee)
- `executeSlash(provider, candidatePubkey, voucherPubkey)` - Execute slash with 3+ votes

**Example - Register Node Button:**
```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { registerNode } from '../chain/instructions';
import { useState } from 'react';

function RegisterButton() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  
  const handleRegister = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions) return;
    
    try {
      setLoading(true);
      
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: 'confirmed' }
      );
      
      const signature = await registerNode(provider);
      setTxSignature(signature);
      
      console.log('Node registered:', signature);
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <button onClick={handleRegister} disabled={loading || !publicKey}>
        {loading ? 'Registering...' : 'Register Node'}
      </button>
      {txSignature && (
        <a 
          href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Transaction
        </a>
      )}
    </div>
  );
}
```

### 4. Merkle Tree Utilities (`src/chain/merkle.ts`)

Generate and verify Merkle proofs for Phase 1 tasks.

**Available functions:**
- `buildMerkleTree(leaves: Buffer[])` - Build tree from leaves
- `getMerkleProof(leaves: Buffer[], index: number)` - Get proof for leaf
- `verifyMerkleProof(root, leaf, proof, leafIndex)` - Verify a proof
- `fetchSolanaBlockHashes(connection, count)` - Fetch real block hashes
- `generateTaskDataset(count)` - Generate complete dataset

**Example - Submit Task with Merkle Proof:**
```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { submitTaskProof } from '../chain/instructions';
import { 
  fetchSolanaBlockHashes, 
  buildMerkleTree, 
  getMerkleProof,
  bufferToUint8Array 
} from '../chain/merkle';

async function submitTask(taskIndex: number) {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  
  if (!publicKey || !signTransaction || !signAllTransactions) return;
  
  // 1. Fetch Solana block hashes (these are the task leaves)
  const blockHashes = await fetchSolanaBlockHashes(connection, 20);
  
  // 2. Build Merkle tree
  const tree = buildMerkleTree(blockHashes);
  
  // 3. Get proof for the specific task
  const proof = getMerkleProof(blockHashes, taskIndex);
  
  // 4. Convert to Uint8Array for Anchor
  const leafData = bufferToUint8Array(blockHashes[taskIndex]);
  const proofArray = proof.map(p => bufferToUint8Array(p));
  
  // 5. Submit to blockchain
  const provider = new AnchorProvider(
    connection,
    { publicKey, signTransaction, signAllTransactions },
    { commitment: 'confirmed' }
  );
  
  const signature = await submitTaskProof(provider, taskIndex, leafData, proofArray);
  console.log('Task submitted:', signature);
}
```

## UI Integration Checklist

### Task 10.1: Wire Dashboard Component
- [ ] Import `useNetworkConfig` hook
- [ ] Display `current_round` from config
- [ ] Display `total_nodes` from config
- [ ] Display protocol parameters (delta_bps, alpha_bps, etc.)
- [ ] Remove mock data

### Task 10.2: Wire Node List Component
- [ ] Use `program.account.nodeState.all()` to fetch all nodes
- [ ] Display phase, reputation, tasks_completed for each
- [ ] Filter by phase if needed
- [ ] Remove mock data

**Example:**
```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { getProgram } from '../chain/program';

async function fetchAllNodes() {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const provider = new AnchorProvider(connection, wallet as any, {});
  const program = getProgram(provider);
  
  const nodes = await program.account.nodeState.all();
  return nodes;
}
```

### Task 10.3: Wire Register Node Button
- [ ] Call `registerNode(provider)` on click
- [ ] Display transaction signature
- [ ] Add Solana Explorer link: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
- [ ] Show loading state

### Task 10.4: Wire Task Submission
- [ ] Generate Merkle tree from Solana block hashes
- [ ] Get proof for task index
- [ ] Call `submitTaskProof(provider, taskIndex, leafData, proof)`
- [ ] Update UI after confirmation

### Task 10.5: Wire Vouch Interface
- [ ] Query Phase 2 nodes: `program.account.nodeState.all()` with filter
- [ ] Display candidate's `tasks_passed` and probationary score
- [ ] Call `vouchForNode(provider, candidatePubkey)` on button click
- [ ] Remove hardcoded ELIGIBLE_USERS array

### Task 10.6: Wire Vote Casting
- [ ] Call `castVote(provider, round)` with current round
- [ ] Display updated reputation after confirmation
- [ ] Add Explorer link

### Task 10.7: Wire Stake Release
- [ ] Call `releaseVoucherStake(provider, candidatePubkey)` when candidate graduates
- [ ] Update voucher reputation display
- [ ] Add Explorer link

### Task 10.8: Add Transaction Explorer Links
- [ ] Create helper: `getExplorerUrl(signature: string) => string`
- [ ] Add links to all transaction confirmations
- [ ] Use devnet cluster parameter

**Helper function:**
```typescript
export function getExplorerUrl(signature: string, cluster: 'devnet' | 'mainnet-beta' = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}
```

## Common Patterns

### Pattern 1: Transaction with Loading State
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [signature, setSignature] = useState<string | null>(null);

const handleTransaction = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const sig = await someInstruction(provider, ...args);
    setSignature(sig);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Pattern 2: Fetch and Display Account Data
```typescript
const { data, loading, error } = useSomeAccount(publicKey);

if (loading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <NotFound />;

return <DisplayData data={data} />;
```

### Pattern 3: Query All Accounts of a Type
```typescript
const provider = new AnchorProvider(connection, wallet as any, {});
const program = getProgram(provider);

// Fetch all nodes
const allNodes = await program.account.nodeState.all();

// Filter Phase 2 nodes
const phase2Nodes = allNodes.filter(node => 
  'phase2' in node.account.phase
);
```

## Testing

Before deploying, test each integration:

1. **Wallet Connection**: Verify Phantom/Solflare connect successfully
2. **Account Fetching**: Check that hooks return correct data
3. **Transactions**: Verify each instruction executes and confirms
4. **Error Handling**: Test with disconnected wallet, insufficient SOL, etc.
5. **Explorer Links**: Verify all links open correct transactions

## Next Steps

After completing UI integration (Task 10), proceed to:
- **Phase 3**: Deployment & Benchmarking (Tasks 11-16)
- **Phase 4**: ML Oracle (Tasks 17-20, Optional)

## Support

For issues or questions:
- Check Solana docs: https://docs.solana.com
- Check Anchor docs: https://www.anchor-lang.com
- Review the design document: `.kiro/specs/coldstart-por-protocol-upgrade/design.md`
