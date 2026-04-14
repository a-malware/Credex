/**
 * ColdStart-PoR Performance Benchmarking Script
 * 
 * Measures compute units, transaction confirmation times, and account rent costs
 * for all instructions in the ColdStart-PoR protocol.
 */

import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ColdstartPor } from '../target/types/coldstart_por';
import fs from 'fs';
import path from 'path';

// Configuration
const DEVNET_RPC = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh');
const NUM_ITERATIONS = 10;

interface BenchmarkResult {
  instruction: string;
  iterations: number;
  computeUnits: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  };
  confirmationTime: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  };
  rentCost: number;
  success: boolean;
  error?: string;
}

/**
 * Calculate mean of an array
 */
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(arr: number[]): number {
  const avg = mean(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Parse compute units from transaction logs
 */
function parseComputeUnits(logs: string[]): number | null {
  for (const log of logs) {
    const match = log.match(/consumed (\d+) of/);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return null;
}

/**
 * Get account rent cost
 */
async function getAccountRent(connection: Connection, size: number): Promise<number> {
  const rent = await connection.getMinimumBalanceForRentExemption(size);
  return rent / LAMPORTS_PER_SOL;
}

/**
 * Setup provider and program
 */
async function setupProgram(): Promise<{ provider: AnchorProvider; program: Program<ColdstartPor> }> {
  const connection = new Connection(DEVNET_RPC, 'confirmed');
  
  // Load wallet from file
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
 * Benchmark initialize_network instruction
 */
async function benchmarkInitializeNetwork(
  program: Program<ColdstartPor>,
  provider: AnchorProvider
): Promise<BenchmarkResult> {
  const computeUnits: number[] = [];
  const confirmationTimes: number[] = [];
  
  try {
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      const startTime = Date.now();
      
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );
      
      // Skip if already initialized
      try {
        await program.account.networkConfig.fetch(configPda);
        console.log('Network already initialized, skipping...');
        break;
      } catch (e) {
        // Not initialized, proceed
      }
      
      const tx = await program.methods
        .initializeNetwork(
          Buffer.from(new Array(32).fill(0)), // merkle_root
          8 // merkle_depth
        )
        .accounts({
          config: configPda,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      const endTime = Date.now();
      confirmationTimes.push(endTime - startTime);
      
      // Fetch transaction to get compute units
      const txDetails = await provider.connection.getTransaction(tx, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      
      if (txDetails?.meta?.logMessages) {
        const cu = parseComputeUnits(txDetails.meta.logMessages);
        if (cu) computeUnits.push(cu);
      }
    }
    
    const rentCost = await getAccountRent(provider.connection, 168); // NetworkConfig size
    
    return {
      instruction: 'initialize_network',
      iterations: computeUnits.length,
      computeUnits: {
        mean: mean(computeUnits),
        stdDev: stdDev(computeUnits),
        min: Math.min(...computeUnits),
        max: Math.max(...computeUnits),
      },
      confirmationTime: {
        mean: mean(confirmationTimes),
        stdDev: stdDev(confirmationTimes),
        min: Math.min(...confirmationTimes),
        max: Math.max(...confirmationTimes),
      },
      rentCost,
      success: true,
    };
  } catch (error) {
    return {
      instruction: 'initialize_network',
      iterations: 0,
      computeUnits: { mean: 0, stdDev: 0, min: 0, max: 0 },
      confirmationTime: { mean: 0, stdDev: 0, min: 0, max: 0 },
      rentCost: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Benchmark register_node instruction
 */
async function benchmarkRegisterNode(
  program: Program<ColdstartPor>,
  provider: AnchorProvider
): Promise<BenchmarkResult> {
  const computeUnits: number[] = [];
  const confirmationTimes: number[] = [];
  
  try {
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      const nodeKeypair = Keypair.generate();
      
      // Airdrop for transaction fees
      const airdropSig = await provider.connection.requestAirdrop(
        nodeKeypair.publicKey,
        0.1 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);
      
      const startTime = Date.now();
      
      const [nodePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('node'), nodeKeypair.publicKey.toBuffer()],
        program.programId
      );
      
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        program.programId
      );
      
      const tx = await program.methods
        .registerNode()
        .accounts({
          node: nodePda,
          owner: nodeKeypair.publicKey,
          config: configPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([nodeKeypair])
        .rpc();
      
      const endTime = Date.now();
      confirmationTimes.push(endTime - startTime);
      
      const txDetails = await provider.connection.getTransaction(tx, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      
      if (txDetails?.meta?.logMessages) {
        const cu = parseComputeUnits(txDetails.meta.logMessages);
        if (cu) computeUnits.push(cu);
      }
    }
    
    const rentCost = await getAccountRent(provider.connection, 197); // NodeState size
    
    return {
      instruction: 'register_node',
      iterations: computeUnits.length,
      computeUnits: {
        mean: mean(computeUnits),
        stdDev: stdDev(computeUnits),
        min: Math.min(...computeUnits),
        max: Math.max(...computeUnits),
      },
      confirmationTime: {
        mean: mean(confirmationTimes),
        stdDev: stdDev(confirmationTimes),
        min: Math.min(...confirmationTimes),
        max: Math.max(...confirmationTimes),
      },
      rentCost,
      success: true,
    };
  } catch (error) {
    return {
      instruction: 'register_node',
      iterations: 0,
      computeUnits: { mean: 0, stdDev: 0, min: 0, max: 0 },
      confirmationTime: { mean: 0, stdDev: 0, min: 0, max: 0 },
      rentCost: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main benchmarking function
 */
async function main() {
  console.log('🚀 ColdStart-PoR Performance Benchmarking');
  console.log('==========================================\n');
  console.log(`Network: ${DEVNET_RPC}`);
  console.log(`Program ID: ${PROGRAM_ID.toString()}`);
  console.log(`Iterations per instruction: ${NUM_ITERATIONS}\n`);
  
  const { provider, program } = await setupProgram();
  
  const results: BenchmarkResult[] = [];
  
  // Benchmark each instruction
  console.log('Benchmarking initialize_network...');
  results.push(await benchmarkInitializeNetwork(program, provider));
  
  console.log('Benchmarking register_node...');
  results.push(await benchmarkRegisterNode(program, provider));
  
  // TODO: Add more instruction benchmarks
  // - submit_task_proof
  // - vouch_for_node
  // - cast_vote
  // - record_round_outcome
  // - propose_slash
  // - vote_slash
  // - execute_slash
  
  // Print results
  console.log('\n📊 Benchmark Results');
  console.log('====================\n');
  
  for (const result of results) {
    console.log(`Instruction: ${result.instruction}`);
    if (result.success) {
      console.log(`  Iterations: ${result.iterations}`);
      console.log(`  Compute Units: ${result.computeUnits.mean.toFixed(0)} ± ${result.computeUnits.stdDev.toFixed(0)}`);
      console.log(`  Confirmation Time: ${result.confirmationTime.mean.toFixed(0)}ms ± ${result.confirmationTime.stdDev.toFixed(0)}ms`);
      console.log(`  Rent Cost: ${result.rentCost.toFixed(8)} SOL`);
    } else {
      console.log(`  ❌ Failed: ${result.error}`);
    }
    console.log('');
  }
  
  // Save results to JSON
  const outputPath = path.join(__dirname, '../docs/benchmark-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${outputPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
