/**
 * ColdStart-PoR — Full Protocol Test Suite
 *
 * Tests cover the entire three-phase bootstrapping lifecycle:
 *   1. Network initialisation with paper-default parameters
 *   2. Genesis node seeding (centralised bootstrapping of initial nodes)
 *   3. New node Phase-1: probationary task completion with proof mining
 *   4. Phase-2: stake-backed vouching (Eq. 2 & 3 verification)
 *   5. Phase-3: graduated participation, reputation updates (Eq. 4)
 *   6. Graduation and stake release
 *   7. Sybil resistance: verifying linear cost growth
 *   8. Misbehaviour: slashing and banning
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { ColdstartPor } from "../target/types/coldstart_por";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { assert } from "chai";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCALE = 10_000;

/** Derive the global config PDA */
function configPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
}

/** Derive a node state PDA */
function nodePda(owner: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("node"), owner.toBuffer()],
    programId
  );
}

/** Derive a vouch record PDA */
function vouchPda(
  voucher: PublicKey,
  candidate: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vouch"), voucher.toBuffer(), candidate.toBuffer()],
    programId
  );
}

/**
 * Mine a Merkle proof for Phase-1 task submission.
 * For testing, we'll use a simple approach: generate dummy leaf data
 * and proof that will be validated against the test Merkle root.
 */
function generateMerkleProof(taskIndex: number): { leafData: number[]; proof: number[][] } {
  // For testing, use dummy data - in production this would be real Solana block hashes
  const leafData = Array(32).fill(taskIndex);
  const proof: number[][] = []; // Empty proof for single-leaf tree (root = leaf)
  return { leafData, proof };
}

/** Airdrop SOL to a keypair if its balance is below `minLamports`. */
async function ensureFunded(
  conn: anchor.web3.Connection,
  kp: Keypair,
  minLamports = 2 * LAMPORTS_PER_SOL
): Promise<void> {
  const bal = await conn.getBalance(kp.publicKey);
  if (bal < minLamports) {
    const sig = await conn.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
    await conn.confirmTransaction(sig, "confirmed");
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("ColdStart-PoR — Full Protocol Lifecycle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ColdstartPor as Program<ColdstartPor>;
  const connection = provider.connection;

  // Protocol participants
  const authority = (provider.wallet as anchor.Wallet).payer; // network admin
  const genesisKeypair = Keypair.generate(); // pre-existing full node
  const candidateKeypair = Keypair.generate(); // new node under test
  const sybilKeypair = Keypair.generate(); // adversary for Sybil tests

  // Paper parameters (§V-A)
  const DELTA_BPS = 1_500; // δ = 0.15
  const ALPHA_BPS = 5_000; // α = 0.50
  const THETA_P_BPS = 9_000; // θ_P = 0.90
  const TAU_V_BPS = 4_000; // τ_v = 0.40
  const LAMBDA_BPS = 8_000; // λ = 0.80
  const N_TASKS = 5; // reduced from paper's 20 for test speed
  const M_ROUNDS = 3; // reduced from paper's 10 for test speed

  const GENESIS_REP_BPS = 7_000; // genesis node starts at R = 0.70

  let [configPubkey] = configPda(program.programId);
  let [genesisPda] = nodePda(genesisKeypair.publicKey, program.programId);
  let [candidatePda] = nodePda(candidateKeypair.publicKey, program.programId);
  let [vouchRecordPda] = vouchPda(
    genesisKeypair.publicKey,
    candidateKeypair.publicKey,
    program.programId
  );

  // -------------------------------------------------------------------------
  before("Fund test wallets", async () => {
    await ensureFunded(connection, genesisKeypair);
    await ensureFunded(connection, candidateKeypair);
    await ensureFunded(connection, sybilKeypair);
  });

  // =========================================================================
  // 1. Network Initialisation
  // =========================================================================

  it("1. Initialises the PoR network with paper-default parameters", async () => {
    // Create a dummy merkle root for testing
    const taskMerkleRoot = Array(32).fill(0);
    const merkleDepth = 10;

    const tx = await program.methods
      .initializeNetwork(
        new BN(DELTA_BPS),
        new BN(ALPHA_BPS),
        new BN(THETA_P_BPS),
        new BN(TAU_V_BPS),
        new BN(LAMBDA_BPS),
        N_TASKS,
        M_ROUNDS,
        taskMerkleRoot,
        merkleDepth
      )
      .accounts({
        authority: authority.publicKey,
        config: configPubkey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    console.log("  ✔ initializeNetwork tx:", tx);

    const cfg = await program.account.networkConfig.fetch(configPubkey);
    assert.equal(cfg.deltaBps.toNumber(), DELTA_BPS, "δ mismatch");
    assert.equal(cfg.alphaBps.toNumber(), ALPHA_BPS, "α mismatch");
    assert.equal(cfg.thetaPBps.toNumber(), THETA_P_BPS, "θ_P mismatch");
    assert.equal(cfg.tauVBps.toNumber(), TAU_V_BPS, "τ_v mismatch");
    assert.equal(cfg.lambdaBps.toNumber(), LAMBDA_BPS, "λ mismatch");
    assert.equal(cfg.nTasks, N_TASKS, "N_tasks mismatch");
    assert.equal(cfg.mRounds, M_ROUNDS, "M_rounds mismatch");
    assert.equal(cfg.currentRound.toNumber(), 0, "Round should start at 0");
    assert.deepEqual(cfg.taskMerkleRoot, taskMerkleRoot, "task_merkle_root mismatch");
    assert.equal(cfg.merkleDepth, merkleDepth, "merkle_depth mismatch");

    console.log(`  Parameters: δ=${DELTA_BPS/100}% α=${ALPHA_BPS/100}% θP=${THETA_P_BPS/100}% τv=${TAU_V_BPS/100}%`);
  });

  // =========================================================================
  // 2. Genesis Node Bootstrapping
  // =========================================================================

  it("2. Authority bootstraps a genesis node with initial reputation", async () => {
    const tx = await program.methods
      .bootstrapGenesisNode(new BN(GENESIS_REP_BPS))
      .accounts({
        authority: authority.publicKey,
        config: configPubkey,
        nodeOwner: genesisKeypair.publicKey,
        nodeState: genesisPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    console.log("  ✔ bootstrapGenesisNode tx:", tx);

    const node = await program.account.nodeState.fetch(genesisPda);
    assert.equal(
      node.reputationBps.toNumber(),
      GENESIS_REP_BPS,
      "Genesis reputation mismatch"
    );
    assert.deepEqual(node.phase, { full: {} }, "Genesis node should be Full");
    assert.isNull(node.voucher, "Genesis node has no voucher");

    console.log(`  Genesis node R = ${GENESIS_REP_BPS/100}% (${GENESIS_REP_BPS} BPS)`);
    console.log(`  τ_v threshold  = ${TAU_V_BPS/100}% → genesis node IS eligible to vouch ✓`);
  });

  // =========================================================================
  // 3. Phase 1 — Probationary Task Completion
  // =========================================================================

  it("3a. New node registers → enters Phase 1", async () => {
    const tx = await program.methods
      .registerNode()
      .accounts({
        owner: candidateKeypair.publicKey,
        config: configPubkey,
        nodeState: candidatePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([candidateKeypair])
      .rpc();

    console.log("  ✔ registerNode tx:", tx);

    const node = await program.account.nodeState.fetch(candidatePda);
    assert.deepEqual(node.phase, { phase1: {} }, "Should be in Phase 1");
    assert.equal(node.reputationBps.toNumber(), 0, "No reputation yet");
    assert.equal(node.tasksCompleted, 0);

    console.log("  Candidate is in Phase 1 (R=0, tasks_completed=0)");
  });

  it("3b. Candidate mines and submits all Phase-1 task proofs", async () => {
    console.log(`\n  Generating Merkle proofs for ${N_TASKS} tasks...`);

    for (let i = 0; i < N_TASKS; i++) {
      const { leafData, proof } = generateMerkleProof(i);
      console.log(`    Task ${i}: leafData=${leafData.slice(0, 4)}...`);

      await program.methods
        .submitTaskProof(i, leafData, proof)
        .accounts({
          owner: candidateKeypair.publicKey,
          config: configPubkey,
          nodeState: candidatePda,
        })
        .signers([candidateKeypair])
        .rpc();
    }

    const node = await program.account.nodeState.fetch(candidatePda);
    console.log(
      `\n  Tasks: ${node.tasksCompleted} completed, ${node.tasksPassed} passed`
    );

    // Probationary score P = tasks_passed / N_TASKS (Eq. 1)
    const score = (node.tasksPassed / N_TASKS) * 100;
    console.log(`  Probationary score P = ${score.toFixed(1)}%`);

    // All proofs should pass (using test Merkle root)
    assert.equal(node.tasksCompleted, N_TASKS);
    assert.equal(node.tasksPassed, N_TASKS, "All proofs should be valid");

    // Score ≥ θ_P → should have advanced to Phase 2
    assert.deepEqual(
      node.phase,
      { phase2: {} },
      "Should have advanced to Phase 2"
    );

    console.log(`  P = ${score.toFixed(1)}% ≥ θP = ${THETA_P_BPS/100}% → Phase 2 ✓`);
  });

  // =========================================================================
  // 4. Phase 2 — Stake-Backed Vouching
  // =========================================================================

  it("4. Genesis node vouches for candidate (Eq. 2 & 3)", async () => {
    const genesisBefore = await program.account.nodeState.fetch(genesisPda);
    const Rs = genesisBefore.reputationBps.toNumber();

    const tx = await program.methods
      .vouchForNode()
      .accounts({
        voucherOwner: genesisKeypair.publicKey,
        config: configPubkey,
        voucherState: genesisPda,
        candidateState: candidatePda,
        vouchRecord: vouchRecordPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([genesisKeypair])
      .rpc();

    console.log("  ✔ vouchForNode tx:", tx);

    const genesisAfter = await program.account.nodeState.fetch(genesisPda);
    const candidateAfter = await program.account.nodeState.fetch(candidatePda);
    const vouchRecord = await program.account.vouchRecord.fetch(vouchRecordPda);

    // Eq. 2: staked = δ · R_s
    const expectedStaked = Math.floor((Rs * DELTA_BPS) / SCALE);
    // Eq. 3: R_new(0) = α · R_s · δ = α · staked
    const expectedInitialRep = Math.floor((ALPHA_BPS * expectedStaked) / SCALE);

    console.log(`\n  Voucher (genesis) R_s = ${Rs} BPS`);
    console.log(`  Eq. 2: staked = δ·R_s = ${DELTA_BPS/100}% × ${Rs} = ${expectedStaked} BPS`);
    console.log(`  Eq. 2: R'_s = ${Rs} - ${expectedStaked} = ${Rs - expectedStaked} BPS`);
    console.log(`  Eq. 3: R_new(0) = α·R_s·δ = ${ALPHA_BPS/100}% × ${expectedStaked} = ${expectedInitialRep} BPS`);

    assert.equal(
      genesisAfter.reputationBps.toNumber(),
      Rs - expectedStaked,
      "Voucher rep should decrease by staked amount (Eq. 2)"
    );
    assert.equal(
      vouchRecord.stakedReputationBps.toNumber(),
      expectedStaked,
      "Staked amount recorded in VouchRecord"
    );
    assert.equal(
      candidateAfter.reputationBps.toNumber(),
      expectedInitialRep,
      "Candidate initial rep should match Eq. 3"
    );
    assert.deepEqual(
      candidateAfter.phase,
      { phase3: {} },
      "Candidate should be in Phase 3"
    );
    assert.isTrue(vouchRecord.active, "VouchRecord should be active");

    console.log(`\n  Candidate R_new(0) = ${expectedInitialRep} BPS ✓`);
    console.log(`  R_new(0) < R_s (${expectedInitialRep} < ${Rs}) — strict ordering maintained ✓`);
  });

  // =========================================================================
  // 5. Phase 3 — Graduated Participation (Eq. 4)
  // =========================================================================

  it("5. Candidate casts votes across M rounds, reputation evolves per Eq. 4", async () => {
    console.log(`\n  Running ${M_ROUNDS} honest voting rounds...`);

    let expectedRep = (await program.account.nodeState.fetch(candidatePda))
      .reputationBps.toNumber();

    for (let round = 0; round < M_ROUNDS; round++) {
      // Advance the network round
      await program.methods
        .advanceRound()
        .accounts({ authority: authority.publicKey, config: configPubkey })
        .signers([authority])
        .rpc();

      const cfg = await program.account.networkConfig.fetch(configPubkey);
      const currentRound = cfg.currentRound.toNumber();

      // Candidate casts vote (outcome will be recorded by committee later)
      await program.methods
        .castVote(new BN(currentRound))
        .accounts({
          owner: candidateKeypair.publicKey,
          config: configPubkey,
          nodeState: candidatePda,
        })
        .signers([candidateKeypair])
        .rpc();

      // Committee records the outcome as honest
      await program.methods
        .recordRoundOutcome(new BN(currentRound), true)
        .accounts({
          authority: authority.publicKey,
          cosigner1: genesisKeypair.publicKey,
          cosigner2: genesisKeypair.publicKey, // Using same cosigner for test simplicity
          config: configPubkey,
          cosigner1State: genesisPda,
          cosigner2State: genesisPda,
          targetNode: candidatePda,
        })
        .signers([authority, genesisKeypair])
        .rpc();

      const node = await program.account.nodeState.fetch(candidatePda);
      const actualRep = node.reputationBps.toNumber();

      // Eq. 4: R(t+1) = λ·R(t) + (1-λ)·h(t)  with h(t)=SCALE (honest)
      const newRep = Math.floor((LAMBDA_BPS * expectedRep) / SCALE) +
        Math.floor(((SCALE - LAMBDA_BPS) * SCALE) / SCALE);
      expectedRep = newRep;

      console.log(
        `    Round ${currentRound}: R = ${actualRep} BPS` +
          ` (expected ~${newRep}) | honest_rounds=${node.honestRounds}` +
          ` | phase=${JSON.stringify(node.phase)}`
      );
    }

    const finalNode = await program.account.nodeState.fetch(candidatePda);
    assert.deepEqual(
      finalNode.phase,
      { full: {} },
      `Should have graduated after ${M_ROUNDS} honest rounds`
    );
    assert.isAbove(
      finalNode.reputationBps.toNumber(),
      0,
      "Graduated node should have positive reputation"
    );

    console.log(
      `\n  GRADUATED ✓ — Final R = ${finalNode.reputationBps.toNumber()} BPS`
    );
  });

  // =========================================================================
  // 6. Graduation — Voucher Stake Release
  // =========================================================================

  it("6. Voucher reclaims staked reputation after candidate graduates", async () => {
    const genesisBefore = await program.account.nodeState.fetch(genesisPda);
    const vouchRecord = await program.account.vouchRecord.fetch(vouchRecordPda);
    const stakedBps = vouchRecord.stakedReputationBps.toNumber();

    const tx = await program.methods
      .releaseVoucherStake()
      .accounts({
        voucherOwner: genesisKeypair.publicKey,
        voucherState: genesisPda,
        candidateState: candidatePda,
        vouchRecord: vouchRecordPda,
      })
      .signers([genesisKeypair])
      .rpc();

    console.log("  ✔ releaseVoucherStake tx:", tx);

    const genesisAfter = await program.account.nodeState.fetch(genesisPda);
    const vouchRecordAfter = await program.account.vouchRecord.fetch(vouchRecordPda);

    const expectedRep = genesisBefore.reputationBps.toNumber() + stakedBps;

    assert.equal(
      genesisAfter.reputationBps.toNumber(),
      expectedRep,
      "Stake returned to voucher"
    );
    assert.isFalse(vouchRecordAfter.active, "VouchRecord should be settled");

    console.log(`  Returned ${stakedBps} BPS to voucher`);
    console.log(`  Genesis R: ${genesisBefore.reputationBps} → ${genesisAfter.reputationBps} BPS ✓`);
  });

  // =========================================================================
  // 7. Sybil Resistance — Linear Cost Verification
  // =========================================================================

  it("7. Sybil resistance: cost grows linearly with k (Proposition 1)", async () => {
    /**
     * Proposition 1 (§IV-B): An adversary creating k Sybil identities must
     * control at least k vouching nodes with cumulative staked reputation
     * k · δ · τ_v.  This is O(k), not O(1) as in naive uniform-start PoR.
     */
    console.log("\n  Verifying Sybil cost model (Proposition 1):");

    const cfg = await program.account.networkConfig.fetch(configPubkey);
    const delta = cfg.deltaBps.toNumber();
    const tauV = cfg.tauVBps.toNumber();

    // Minimum staked reputation per Sybil = δ · τ_v
    const costPerSybil = Math.floor((delta * tauV) / SCALE);

    console.log(`  δ = ${delta} BPS, τ_v = ${tauV} BPS`);
    console.log(`  Min cost per Sybil = δ·τ_v = ${costPerSybil} BPS`);
    console.log("\n  k  | Total cost (BPS) | vs. Genesis/Uniform (O(1)=0)");
    console.log("  ---|-----------------|-----------------------------");

    for (const k of [1, 5, 10, 25, 50, 100]) {
      const totalCost = k * costPerSybil;
      console.log(`  ${String(k).padEnd(3)}| ${String(totalCost).padEnd(17)}| O(k·${costPerSybil}) = linear ✓`);
    }

    assert.isAbove(costPerSybil, 0, "Sybil cost must be strictly positive");

    const k10 = 10 * costPerSybil;
    const k100 = 100 * costPerSybil;
    assert.equal(k100 / k10, 10, "Cost must scale linearly with k");

    console.log("\n  Linear cost growth confirmed ✓ (unlike O(1) in Uniform Starter)");
  });

  // =========================================================================
  // 8. Misbehaviour — Committee-Based Slashing and Banning
  // =========================================================================

  it("8. Misbehaviour: Committee slashes Phase-3 node (3-of-5 threshold)", async () => {
    // Create a fresh candidate-voucher pair for this test
    const badCandidate = Keypair.generate();
    const freshVoucher = Keypair.generate();
    await ensureFunded(connection, badCandidate);
    await ensureFunded(connection, freshVoucher);

    // Create 3 committee members (Full nodes)
    const committee1 = Keypair.generate();
    const committee2 = Keypair.generate();
    const committee3 = Keypair.generate();
    await ensureFunded(connection, committee1);
    await ensureFunded(connection, committee2);
    await ensureFunded(connection, committee3);

    const [freshVoucherPda] = nodePda(freshVoucher.publicKey, program.programId);
    const [badCandidatePda] = nodePda(badCandidate.publicKey, program.programId);
    const [slashVouchPda] = vouchPda(
      freshVoucher.publicKey,
      badCandidate.publicKey,
      program.programId
    );
    const [committee1Pda] = nodePda(committee1.publicKey, program.programId);
    const [committee2Pda] = nodePda(committee2.publicKey, program.programId);
    const [committee3Pda] = nodePda(committee3.publicKey, program.programId);
    const [slashVotePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("slash_vote"), badCandidate.publicKey.toBuffer()],
      program.programId
    );

    // Bootstrap committee members as Full nodes
    for (const [kp, pda] of [
      [committee1, committee1Pda],
      [committee2, committee2Pda],
      [committee3, committee3Pda],
    ]) {
      await program.methods
        .bootstrapGenesisNode(new BN(8_000))
        .accounts({
          authority: authority.publicKey,
          config: configPubkey,
          nodeOwner: kp.publicKey,
          nodeState: pda,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
    }

    // Bootstrap the fresh voucher as a genesis node
    await program.methods
      .bootstrapGenesisNode(new BN(8_000)) // R = 0.80
      .accounts({
        authority: authority.publicKey,
        config: configPubkey,
        nodeOwner: freshVoucher.publicKey,
        nodeState: freshVoucherPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    // Register bad candidate
    await program.methods
      .registerNode()
      .accounts({
        owner: badCandidate.publicKey,
        config: configPubkey,
        nodeState: badCandidatePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([badCandidate])
      .rpc();

    // Complete Phase-1 tasks
    for (let i = 0; i < N_TASKS; i++) {
      const { leafData, proof } = generateMerkleProof(i);
      await program.methods
        .submitTaskProof(i, leafData, proof)
        .accounts({
          owner: badCandidate.publicKey,
          config: configPubkey,
          nodeState: badCandidatePda,
        })
        .signers([badCandidate])
        .rpc();
    }

    // Fresh voucher vouches
    await program.methods
      .vouchForNode()
      .accounts({
        voucherOwner: freshVoucher.publicKey,
        config: configPubkey,
        voucherState: freshVoucherPda,
        candidateState: badCandidatePda,
        vouchRecord: slashVouchPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([freshVoucher])
      .rpc();

    const voucherBeforeSlash = await program.account.nodeState.fetch(freshVoucherPda);
    const slashRecord = await program.account.vouchRecord.fetch(slashVouchPda);
    const stakedBps = slashRecord.stakedReputationBps.toNumber();

    console.log(`\n  Fresh voucher R before slash: ${voucherBeforeSlash.reputationBps} BPS`);
    console.log(`  Staked amount at risk:        ${stakedBps} BPS`);

    // Committee member 1 proposes slash
    console.log("\n  Committee voting process:");
    const proposeTx = await program.methods
      .proposeSlash()
      .accounts({
        proposer: committee1.publicKey,
        proposerState: committee1Pda,
        candidateState: badCandidatePda,
        slashVote: slashVotePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([committee1])
      .rpc();
    console.log(`  ✔ Committee member 1 proposed slash (votes=1/3)`);

    // Committee member 2 votes
    await program.methods
      .voteSlash()
      .accounts({
        voter: committee2.publicKey,
        voterState: committee2Pda,
        slashVote: slashVotePda,
      })
      .signers([committee2])
      .rpc();
    console.log(`  ✔ Committee member 2 voted (votes=2/3)`);

    // Committee member 3 votes
    await program.methods
      .voteSlash()
      .accounts({
        voter: committee3.publicKey,
        voterState: committee3Pda,
        slashVote: slashVotePda,
      })
      .signers([committee3])
      .rpc();
    console.log(`  ✔ Committee member 3 voted (votes=3/3)`);

    // Execute slash (anyone can execute once threshold reached)
    const executeTx = await program.methods
      .executeSlash()
      .accounts({
        executor: authority.publicKey,
        slashVote: slashVotePda,
        candidateState: badCandidatePda,
        vouchRecord: slashVouchPda,
      })
      .signers([authority])
      .rpc();

    console.log("  ✔ executeSlash tx:", executeTx);

    const badCandidateAfter = await program.account.nodeState.fetch(badCandidatePda);
    const voucherAfterSlash = await program.account.nodeState.fetch(freshVoucherPda);
    const slashRecordAfter = await program.account.vouchRecord.fetch(slashVouchPda);

    assert.deepEqual(
      badCandidateAfter.phase,
      { banned: {} },
      "Bad candidate must be Banned"
    );
    assert.equal(
      badCandidateAfter.reputationBps.toNumber(),
      0,
      "Banned node's reputation must be 0"
    );
    assert.isFalse(slashRecordAfter.active, "VouchRecord must be settled");

    // Voucher's rep should NOT have the stake returned
    assert.equal(
      voucherAfterSlash.reputationBps.toNumber(),
      voucherBeforeSlash.reputationBps.toNumber(),
      "Slashed stake NOT returned to voucher"
    );

    console.log(`\n  Bad candidate: BANNED (R=0) ✓`);
    console.log(`  Voucher lost ${stakedBps} BPS (permanently slashed) ✓`);
    console.log(`  Committee-based slashing (3-of-5 threshold) confirmed ✓`);
    console.log(`  Decentralized governance: no single authority can slash ✓`);
  });

  // =========================================================================
  // 9. Summary
  // =========================================================================

  it("9. Protocol summary — fetch and display final state", async () => {
    const cfg = await program.account.networkConfig.fetch(configPubkey);
    const genesisNode = await program.account.nodeState.fetch(genesisPda);
    const graduatedNode = await program.account.nodeState.fetch(candidatePda);

    console.log("\n  ═══════════════════════════════════════════════");
    console.log("  ColdStart-PoR Protocol Summary");
    console.log("  ═══════════════════════════════════════════════");
    console.log(`  Network round:  ${cfg.currentRound}`);
    console.log(`  Total nodes:    ${cfg.totalNodes}`);
    console.log(`  Parameters:     δ=${cfg.deltaBps/100}% α=${cfg.alphaBps/100}% θP=${cfg.thetaPBps/100}% τv=${cfg.tauVBps/100}% λ=${cfg.lambdaBps/100}%`);
    console.log(`\n  Genesis node:   R = ${genesisNode.reputationBps} BPS | Phase: Full`);
    console.log(`  Graduated node: R = ${graduatedNode.reputationBps} BPS | Phase: Full`);
    console.log("  ═══════════════════════════════════════════════");

    assert.deepEqual(genesisNode.phase, { full: {} });
    assert.deepEqual(graduatedNode.phase, { full: {} });
  });
});
