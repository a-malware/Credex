import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getProgram, configPda, nodePda, vouchPda, slashVotePda } from './program';

/**
 * Register a new node (Phase 1 entry)
 */
export async function registerNode(provider: AnchorProvider): Promise<string> {
  const program = getProgram(provider);
  const [config] = configPda();
  const [nodeState] = nodePda(provider.wallet.publicKey);

  const tx = await program.methods
    .registerNode()
    .accounts({
      owner: provider.wallet.publicKey,
      config,
      nodeState,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/**
 * Submit a task proof with Merkle verification
 */
export async function submitTaskProof(
  provider: AnchorProvider,
  taskIndex: number,
  leafData: Uint8Array,
  proof: Uint8Array[]
): Promise<string> {
  const program = getProgram(provider);
  const [config] = configPda();
  const [nodeState] = nodePda(provider.wallet.publicKey);

  const tx = await program.methods
    .submitTaskProof(
      taskIndex,
      Array.from(leafData),
      proof.map(p => Array.from(p))
    )
    .accounts({
      owner: provider.wallet.publicKey,
      config,
      nodeState,
    })
    .rpc();

  return tx;
}

/**
 * Vouch for a Phase 2 candidate node
 */
export async function vouchForNode(
  provider: AnchorProvider,
  candidatePubkey: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const [config] = configPda();
  const [voucherState] = nodePda(provider.wallet.publicKey);
  const [candidateState] = nodePda(candidatePubkey);
  const [vouchRecord] = vouchPda(provider.wallet.publicKey, candidatePubkey);

  const tx = await program.methods
    .vouchForNode()
    .accounts({
      voucherOwner: provider.wallet.publicKey,
      config,
      voucherState,
      candidateState,
      vouchRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/**
 * Cast a vote for the current round
 */
export async function castVote(
  provider: AnchorProvider,
  round: number
): Promise<string> {
  const program = getProgram(provider);
  const [config] = configPda();
  const [nodeState] = nodePda(provider.wallet.publicKey);

  const tx = await program.methods
    .castVote(round, true) // Note: honest parameter still in IDL but will be removed
    .accounts({
      owner: provider.wallet.publicKey,
      config,
      nodeState,
    })
    .rpc();

  return tx;
}

/**
 * Release voucher stake after candidate graduates
 */
export async function releaseVoucherStake(
  provider: AnchorProvider,
  candidatePubkey: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const [voucherState] = nodePda(provider.wallet.publicKey);
  const [candidateState] = nodePda(candidatePubkey);
  const [vouchRecord] = vouchPda(provider.wallet.publicKey, candidatePubkey);

  const tx = await program.methods
    .releaseVoucherStake()
    .accounts({
      voucherOwner: provider.wallet.publicKey,
      voucherState,
      candidateState,
      vouchRecord,
    })
    .rpc();

  return tx;
}

/**
 * Record round outcome with committee confirmation
 */
export async function recordRoundOutcome(
  provider: AnchorProvider,
  cosigner1: PublicKey,
  cosigner2: PublicKey,
  targetNode: PublicKey,
  round: number,
  wasHonest: boolean
): Promise<string> {
  const program = getProgram(provider);
  const [config] = configPda();
  const [cosigner1State] = nodePda(cosigner1);
  const [cosigner2State] = nodePda(cosigner2);
  const [targetNodeState] = nodePda(targetNode);

  const tx = await program.methods
    .recordRoundOutcome(round, wasHonest)
    .accounts({
      authority: provider.wallet.publicKey,
      cosigner1,
      cosigner1State,
      cosigner2,
      cosigner2State,
      config,
      targetNode: targetNodeState,
    })
    .rpc();

  return tx;
}

/**
 * Propose slashing a misbehaving node
 */
export async function proposeSlash(
  provider: AnchorProvider,
  candidatePubkey: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const [proposerState] = nodePda(provider.wallet.publicKey);
  const [candidateState] = nodePda(candidatePubkey);
  const [slashVote] = slashVotePda(candidatePubkey);

  const tx = await program.methods
    .proposeSlash()
    .accounts({
      proposer: provider.wallet.publicKey,
      proposerState,
      candidateState,
      slashVote,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/**
 * Vote to slash a candidate (committee member)
 */
export async function voteSlash(
  provider: AnchorProvider,
  candidatePubkey: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const [voterState] = nodePda(provider.wallet.publicKey);
  const [slashVote] = slashVotePda(candidatePubkey);

  const tx = await program.methods
    .voteSlash()
    .accounts({
      voter: provider.wallet.publicKey,
      voterState,
      slashVote,
    })
    .rpc();

  return tx;
}

/**
 * Execute slash after 3+ votes
 */
export async function executeSlash(
  provider: AnchorProvider,
  candidatePubkey: PublicKey,
  voucherPubkey: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const [candidateState] = nodePda(candidatePubkey);
  const [slashVote] = slashVotePda(candidatePubkey);
  const [vouchRecord] = vouchPda(voucherPubkey, candidatePubkey);

  const tx = await program.methods
    .executeSlash()
    .accounts({
      executor: provider.wallet.publicKey,
      candidateState,
      slashVote,
      vouchRecord,
    })
    .rpc();

  return tx;
}
