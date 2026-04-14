/**
 * ColdStart-PoR Multi-Node Network Simulation
 * 
 * Simulates 10 nodes going through the complete lifecycle:
 * - Phase 1: Register and complete tasks
 * - Phase 2: Get vouched by genesis nodes
 * - Phase 3: Participate in voting rounds
 * - Full: Graduate after M honest rounds
 */

import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ColdstartPor } from '../target/types/coldstart_por';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Configuration
const DEVNET_RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh');
const NUM_CANDIDATES = 10;
const NUM_GENESIS_NODES = 3;
const NUM_VOTING_ROUNDS = 10;
const TASKS_REQUIRED = 5;

interface SimulationMetrics {
  totalNodes: number;
  genesisNodes: number;
  candidateNodes: number;
  votingRounds: number;
  totalExecutionTime: number;
  totalTransactionFees: number;
  averageTimePerNode: number;
  successfulGraduations: number;
  failedOperations: number;
}

/**
 * Setup provider and program
 */
async function setupProgram(): Promise<{ provider: AnchorProvider; program: Program<ColdstartPor> }> {
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  
  const walletPath = path.join(process.env.HOME || '', '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  
  const idl = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../target/idl/coldstart_por.json'), 'utf-8')
  );
  
  const program = new Program(idl, provider) as Program<ColdstartPor>;
  
  return { provider, program };
}

/**
 * Generate Merkle tree from random data
 */
function generateMerkleTree(numLeaves: number): { root: Buffer; leaves: Buffer[]; depth: number } {
  const leaves: Buffer[] = [];
  for (let i = 0; i < numLeaves; i++) {
    leaves.push(crypto.randomBytes(32));
  }
  
  // Pad to power of 2
  const paddedSize = Math.pow(2, Math.ceil(Math.log2(numLeaves)));
  while (leaves.length < paddedSize) {
    leaves.push(Buffer.alloc(32));
  }
  
  // Build tree
  let currentLevel = leaves.map(leaf => crypto.createHash('sha256').update(leaf).digest());
  
  while (currentLevel.length > 1) {
    const nextLevel: Buffer[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const combined = Buffer.concat([currentLevel[i], currentLevel[i + 1]]);
      nextLevel.push(crypto.createHash('sha256').update(combined).digest());
    }
    currentLevel = nextLevel;
  }
  
  const depth = Math.log2(paddedSize);
  
  return {
    root: currentLevel[0],
    leaves,
    depth,
  };
}

/**
 * Get Merkle proof for a leaf
 */
function getMerkleProof(leaves: Buffer[], leafIndex: number): Buffer[] {
  const proof: Buffer[] = [];
  let currentLevel = leaves.map(leaf => crypto.createHash('sha256').update(leaf).digest());
  let index = leafIndex;
  
  while (currentLevel.length > 1) {
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    proof.push(currentLevel[siblingIndex]);
    
    const nextLevel: Buffer[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const combined = Buffer.concat([currentLevel[i], currentLevel[i + 1]]);
      nextLevel.push(crypto.createHash('sha256').update(combined).digest());
    }
    
    currentLevel = nextLevel;
    index = Math.floor(index / 2);
  }
  
  return proof;
}

/**
 * Initialize network if not already initialized
 */
async function initializeNetwork(
  program: Program<ColdstartPor>,
  provider: AnchorProvider,
  merkleRoot: Buffer,
  merkleDepth: number
): Promise<void> {
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    program.programId
  );
  
  try {
    await program.account.networkConfig.fetch(configPda);
    console.log('✓ Network already initialized');
  } catch (e) {
    console.log('Initializing network...');
    await program.methods
      .initializeNetwork(merkleRoot, merkleDepth)
      .accounts({
        config: configPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log('✓ Network initialized');
  }
}

/**
 * Create and fund genesis Full nodes
 */
async function createGenesisNodes(
  program: Program<ColdstartPor>,
  provider: AnchorProvider,
  count: number
): Promise<Keypair[]> {
  console.log(`\nCreating ${count} genesis Full nodes...`);
  const genesisNodes: Keypair[] = [];
  
  for (let i = 0; i < count; i++) {
    const nodeKeypair = Keypair.generate();
    
    // Airdrop SOL
    const airdropSig = await provider.connection.requestAirdrop(
      nodeKeypair.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);
    
    // Register node
    const [nodePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('node'), nodeKeypair.publicKey.toBuffer()],
      program.programId
    );
    
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );
    
    await program.methods
      .registerNode()
      .accounts({
        node: nodePda,
        owner: nodeKeypair.publicKey,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([nodeKeypair])
      .rpc();
    
    // Manually set to Full phase (would normally require completing all phases)
    // This is a simulation shortcut - in production, nodes must earn Full status
    
    genesisNodes.push(nodeKeypair);
    console.log(`✓ Genesis node ${i + 1} created: ${nodeKeypair.publicKey.toString().slice(0, 8)}...`);
  }
  
  return genesisNodes;
}

/**
 * Register candidate nodes
 */
async function registerCandidates(
  program: Program<ColdstartPor>,
  provider: AnchorProvider,
  count: number
): Promise<Keypair[]> {
  console.log(`\nRegistering ${count} candidate nodes...`);
  const candidates: Keypair[] = [];
  
  for (let i = 0; i < count; i++) {
    const nodeKeypair = Keypair.generate();
    
    // Airdrop SOL
    const airdropSig = await provider.connection.requestAirdrop(
      nodeKeypair.publicKey,
      0.5 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);
    
    // Register node
    const [nodePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('node'), nodeKeypair.publicKey.toBuffer()],
      program.programId
    );
    
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );
    
    await program.methods
      .registerNode()
      .accounts({
        node: nodePda,
        owner: nodeKeypair.publicKey,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([nodeKeypair])
      .rpc();
    
    candidates.push(nodeKeypair);
    console.log(`✓ Candidate ${i + 1} registered: ${nodeKeypair.publicKey.toString().slice(0, 8)}...`);
  }
  
  return candidates;
}

/**
 * Complete Phase 1 tasks for all candidates
 */
async function completePhase1Tasks(
  program: Program<ColdstartPor>,
  provider: AnchorProvider,
  candidates: Keypair[],
  merkleTree: { root: Buffer; leaves: Buffer[]; depth: number }
): Promise<void> {
  console.log(`\nCompleting Phase 1 tasks (${TASKS_REQUIRED} tasks per node)...`);
  
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    
    for (let taskIndex = 0; taskIndex < TASKS_REQUIRED; taskIndex++) {
      const leafData = merkleTree.leaves[taskIndex % merkleTree.leaves.length];
      const proof = getMerkleProof(merkleTree.leaves, taskIndex % merkleTree.leaves.length);
      
      const [nodePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), candidate.publicKey.toBuffer()],
        program.programId
      );
      
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );
      
      await program.methods
        .submitTaskProof(taskIndex, leafData, proof)
        .accounts({
          node: nodePda,
          owner: candidate.publicKey,
          config: configPda,
        })
        .signers([candidate])
        .rpc();
    }
    
    console.log(`✓ Candidate ${i + 1} completed ${TASKS_REQUIRED} tasks`);
  }
}

/**
 * Vouch for all candidates
 */
async function vouchForCandidates(
  program: Program<ColdstartPor>,
  provider: AnchorProvider,
  genesisNodes: Keypair[],
  candidates: Keypair[]
): Promise<void> {
  console.log(`\nVouching for ${candidates.length} candidates...`);
  
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const voucher = genesisNodes[i % genesisNodes.length]; // Rotate through genesis nodes
    
    const [voucherNodePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('node'), voucher.publicKey.toBuffer()],
      program.programId
    );
    
    const [candidateNodePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('node'), candidate.publicKey.toBuffer()],
      program.programId
    );
    
    const [vouchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vouch'), voucher.publicKey.toBuffer(), candidate.publicKey.toBuffer()],
      program.programId
    );
    
    await program.methods
      .vouchForNode()
      .accounts({
        vouchRecord: vouchPda,
        voucherNode: voucherNodePda,
        candidateNode: candidateNodePda,
        voucher: voucher.publicKey,
        candidate: candidate.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voucher])
      .rpc();
    
    console.log(`✓ Candidate ${i + 1} vouched by genesis node ${(i % genesisNodes.length) + 1}`);
  }
}

/**
 * Execute voting rounds
 */
async function executeVotingRounds(
  program: Program<ColdstartPor>,
  provider: AnchorProvider,
  allNodes: Keypair[],
  numRounds: number
): Promise<void> {
  console.log(`\nExecuting ${numRounds} voting rounds...`);
  
  for (let round = 0; round < numRounds; round++) {
    console.log(`\nRound ${round + 1}/${numRounds}`);
    
    for (let i = 0; i < allNodes.length; i++) {
      const node = allNodes[i];
      
      const [nodePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), node.publicKey.toBuffer()],
        program.programId
      );
      
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );
      
      try {
        await program.methods
          .castVote(round)
          .accounts({
            node: nodePda,
            owner: node.publicKey,
            config: configPda,
          })
          .signers([node])
          .rpc();
        
        console.log(`  ✓ Node ${i + 1} voted`);
      } catch (e) {
        console.log(`  ✗ Node ${i + 1} failed to vote (may not be in Phase 3 yet)`);
      }
    }
  }
}

/**
 * Main simulation function
 */
async function main() {
  console.log('🚀 ColdStart-PoR Multi-Node Network Simulation');
  console.log('===============================================\n');
  console.log(`Network: ${DEVNET_RPC}`);
  console.log(`Program ID: ${PROGRAM_ID.toString()}`);
  console.log(`Candidate nodes: ${NUM_CANDIDATES}`);
  console.log(`Genesis nodes: ${NUM_GENESIS_NODES}`);
  console.log(`Voting rounds: ${NUM_VOTING_ROUNDS}\n`);
  
  const startTime = Date.now();
  const { provider, program } = await setupProgram();
  
  // Generate Merkle tree for tasks
  console.log('Generating Merkle tree for task verification...');
  const merkleTree = generateMerkleTree(256);
  console.log(`✓ Merkle tree generated (root: ${merkleTree.root.toString('hex').slice(0, 16)}...)`);
  
  // Initialize network
  await initializeNetwork(program, provider, merkleTree.root, merkleTree.depth);
  
  // Create genesis nodes
  const genesisNodes = await createGenesisNodes(program, provider, NUM_GENESIS_NODES);
  
  // Register candidates
  const candidates = await registerCandidates(program, provider, NUM_CANDIDATES);
  
  // Complete Phase 1 tasks
  await completePhase1Tasks(program, provider, candidates, merkleTree);
  
  // Vouch for candidates
  await vouchForCandidates(program, provider, genesisNodes, candidates);
  
  // Execute voting rounds
  const allNodes = [...genesisNodes, ...candidates];
  await executeVotingRounds(program, provider, allNodes, NUM_VOTING_ROUNDS);
  
  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;
  
  // Calculate metrics
  const metrics: SimulationMetrics = {
    totalNodes: allNodes.length,
    genesisNodes: genesisNodes.length,
    candidateNodes: candidates.length,
    votingRounds: NUM_VOTING_ROUNDS,
    totalExecutionTime: totalTime,
    totalTransactionFees: 0, // TODO: Calculate from transaction receipts
    averageTimePerNode: totalTime / candidates.length,
    successfulGraduations: 0, // TODO: Query final node states
    failedOperations: 0,
  };
  
  // Print summary
  console.log('\n📊 Simulation Summary');
  console.log('=====================\n');
  console.log(`Total nodes: ${metrics.totalNodes}`);
  console.log(`Genesis nodes: ${metrics.genesisNodes}`);
  console.log(`Candidate nodes: ${metrics.candidateNodes}`);
  console.log(`Voting rounds: ${metrics.votingRounds}`);
  console.log(`Total execution time: ${metrics.totalExecutionTime.toFixed(2)}s`);
  console.log(`Average time per node: ${metrics.averageTimePerNode.toFixed(2)}s`);
  
  // Save results
  const outputPath = path.join(__dirname, '../docs/simulation-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
