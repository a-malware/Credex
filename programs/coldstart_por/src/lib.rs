//! # ColdStart-PoR — Solana / Anchor Implementation
//!
//! This program implements the ColdStart-PoR bootstrapping protocol described in:
//! "ColdStart-PoR: An Incentive-Compatible Reputation Bootstrapping Protocol for
//! Proof-of-Reputation Blockchains" (IEEE, 2026).
//!
//! ## Protocol Overview
//!
//! New nodes enter through three phases:
//!
//! **Phase 1 – Probationary Task Completion**
//! The candidate completes N verifiable micro-tasks.  Each task produces a
//! cryptographic proof that any node can verify.  The probationary score is:
//!
//!   P(v_new, k) = (1/k) * Σ 1[π_j valid]          (Eq. 1)
//!
//! The node advances only if P(v_new, N) ≥ θ_P.
//!
//! **Phase 2 – Stake-Backed Vouching**
//! An established node v_s (with R_s ≥ τ_v) stakes a fraction δ of its reputation:
//!
//!   R'_s = R_s · (1 − δ)                            (Eq. 2)
//!
//! The candidate receives a provisional reputation:
//!
//!   R_new(0) = α · R_s · δ                          (Eq. 3)
//!
//! **Phase 3 – Graduated Participation**
//! The candidate votes (but cannot lead) for M rounds.  Reputation evolves via
//! time-decayed exponential smoothing:
//!
//!   R(t+1) = λ · R(t) + (1−λ) · h(t)               (Eq. 4)
//!
//! After M honest rounds the node graduates; the voucher's stake is returned.
//! Misbehaviour at any point causes permanent banning and stake slashing.
//!
//! ## Fixed-Point Arithmetic
//!
//! All reputation values and parameters are stored as u64 in basis points
//! where SCALE = 10_000 represents 1.0.  Example: 0.15 → 1_500.

use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};

declare_id!("CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Fixed-point scale: 10_000 represents 1.0 (100%).
/// Reputation values R ∈ [0, 1] are stored as u64 in [0, SCALE].
pub const SCALE: u64 = 10_000;

/// Paper defaults (§V-A):
///   δ=0.15  α=0.5  θ_P=0.9  τ_v=0.4  N=20  M=10
/// λ is not specified explicitly; we default to 0.8 (common PoR decay).
pub const DEFAULT_DELTA_BPS: u64 = 1_500; // 0.15
pub const DEFAULT_ALPHA_BPS: u64 = 5_000; // 0.50
pub const DEFAULT_THETA_P_BPS: u64 = 9_000; // 0.90
pub const DEFAULT_TAU_V_BPS: u64 = 4_000; // 0.40
pub const DEFAULT_LAMBDA_BPS: u64 = 8_000; // 0.80
pub const DEFAULT_N_TASKS: u8 = 20;
pub const DEFAULT_M_ROUNDS: u8 = 10;

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

#[error_code]
pub enum PoRError {
    #[msg("Caller is not the network authority")]
    Unauthorized,
    #[msg("Node is not in the required phase for this instruction")]
    WrongPhase,
    #[msg("Task index is out of range")]
    InvalidTaskIndex,
    #[msg("Tasks must be submitted sequentially")]
    TaskOutOfOrder,
    #[msg("Reputation value out of [0, SCALE] range")]
    InvalidReputation,
    #[msg("Voucher reputation is below the minimum threshold τ_v")]
    VoucherReputationTooLow,
    #[msg("Voucher node is not a Full participant")]
    VoucherNotEligible,
    #[msg("Candidate already has an active voucher")]
    AlreadyVouched,
    #[msg("Candidate has not yet graduated to Full status")]
    CandidateNotGraduated,
    #[msg("This vouch record has already been settled (released or slashed)")]
    VouchAlreadySettled,
    #[msg("Round number does not match the current consensus round")]
    InvalidRound,
    #[msg("BPS parameter must be in range [1, 10_000]")]
    InvalidParameter,
    #[msg("Node has been permanently banned")]
    NodeBanned,
}

// ---------------------------------------------------------------------------
// State accounts
// ---------------------------------------------------------------------------

/// Global network configuration — one per deployment.
/// PDA seeds: ["config"]
#[account]
#[derive(Default)]
pub struct NetworkConfig {
    /// Network authority — may bootstrap genesis nodes and advance rounds.
    pub authority: Pubkey,

    /// δ — fraction of voucher's reputation staked as collateral (BPS).
    /// Recommended range: [1_000, 2_000] i.e. [0.10, 0.20]. (paper: 1_500)
    pub delta_bps: u64,

    /// α — dampening factor preventing reputation inflation (BPS). (paper: 5_000)
    pub alpha_bps: u64,

    /// θ_P — minimum probationary score to advance from Phase 1 (BPS). (paper: 9_000)
    pub theta_p_bps: u64,

    /// τ_v — minimum reputation for a node to be eligible as a voucher (BPS). (paper: 4_000)
    pub tau_v_bps: u64,

    /// λ — exponential time-decay weight in the reputation update rule (BPS). (~8_000)
    pub lambda_bps: u64,

    /// N — number of micro-tasks in Phase 1. (paper: 20)
    pub n_tasks: u8,

    /// M — number of honest consensus rounds required to graduate Phase 3. (paper: 10)
    pub m_rounds: u8,

    /// Monotonically increasing consensus round counter.
    pub current_round: u64,

    /// Total nodes ever registered (including banned/rejected).
    pub total_nodes: u32,

    /// PDA bump.
    pub bump: u8,
}

impl NetworkConfig {
    pub const LEN: usize = 8   // discriminator
        + 32   // authority
        + 8    // delta_bps
        + 8    // alpha_bps
        + 8    // theta_p_bps
        + 8    // tau_v_bps
        + 8    // lambda_bps
        + 1    // n_tasks
        + 1    // m_rounds
        + 8    // current_round
        + 4    // total_nodes
        + 1    // bump
        + 16;  // padding
}

/// Lifecycle phase of a node in the ColdStart-PoR protocol.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum NodePhase {
    /// Phase 1: completing probationary micro-tasks.
    Phase1,
    /// Phase 2: waiting for a voucher.
    Phase2,
    /// Phase 3: graduated participation (vote-only, reputation growing).
    Phase3,
    /// Fully graduated — can lead block production.
    Full,
    /// Permanently banned due to misbehaviour or failed Phase 1.
    Banned,
}

impl Default for NodePhase {
    fn default() -> Self {
        NodePhase::Phase1
    }
}

/// Per-node state account.
/// PDA seeds: ["node", owner.key()]
#[account]
#[derive(Default)]
pub struct NodeState {
    /// The wallet that controls this node.
    pub owner: Pubkey,

    /// Current reputation score R_i ∈ [0, SCALE] in BPS.
    pub reputation_bps: u64,

    /// Current lifecycle phase.
    pub phase: NodePhase,

    /// Number of Phase-1 tasks submitted so far.
    pub tasks_completed: u8,

    /// Number of Phase-1 tasks whose proofs were validated.
    pub tasks_passed: u8,

    /// Number of honest consensus rounds completed in Phase 3.
    pub honest_rounds: u8,

    /// Pubkey of the node that vouched for this node (set in Phase 2).
    pub voucher: Option<Pubkey>,

    /// Reputation staked by the voucher on behalf of this node (held here
    /// for bookkeeping; canonical record is in VouchRecord).
    pub staked_reputation_bps: u64,

    /// Tracks the last round in which this node cast a vote (prevents double voting).
    pub last_voted_round: u64,

    /// PDA bump.
    pub bump: u8,
}

impl NodeState {
    pub const LEN: usize = 8   // discriminator
        + 32   // owner
        + 8    // reputation_bps
        + 2    // phase (enum tag + padding)
        + 1    // tasks_completed
        + 1    // tasks_passed
        + 1    // honest_rounds
        + 33   // Option<Pubkey>
        + 8    // staked_reputation_bps
        + 8    // last_voted_round
        + 1    // bump
        + 16;  // padding
}

/// Records an active or settled vouching relationship.
/// Created in Phase 2; settled (active=false) in release_voucher_stake or report_misbehavior.
/// PDA seeds: ["vouch", voucher.key(), candidate.key()]
#[account]
pub struct VouchRecord {
    /// Pubkey of the vouching node.
    pub voucher: Pubkey,

    /// Pubkey of the candidate node.
    pub candidate: Pubkey,

    /// Reputation staked by the voucher (in BPS).
    pub staked_reputation_bps: u64,

    /// True while the stake is held; false once released or slashed.
    pub active: bool,

    /// PDA bump.
    pub bump: u8,
}

impl VouchRecord {
    pub const LEN: usize = 8   // discriminator
        + 32   // voucher
        + 32   // candidate
        + 8    // staked_reputation_bps
        + 1    // active
        + 1    // bump
        + 8;   // padding
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct NetworkInitialized {
    pub authority: Pubkey,
    pub delta_bps: u64,
    pub alpha_bps: u64,
    pub theta_p_bps: u64,
    pub tau_v_bps: u64,
    pub n_tasks: u8,
    pub m_rounds: u8,
}

#[event]
pub struct NodeBootstrapped {
    pub node: Pubkey,
    pub reputation_bps: u64,
}

#[event]
pub struct NodeRegistered {
    pub node: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TaskSubmitted {
    pub node: Pubkey,
    pub task_index: u8,
    pub proof_valid: bool,
    pub tasks_completed: u8,
    pub tasks_passed: u8,
}

#[event]
pub struct PhaseAdvanced {
    pub node: Pubkey,
    pub from_phase: u8,
    pub to_phase: u8,
    pub score_bps: u64,
}

#[event]
pub struct NodeRejected {
    pub node: Pubkey,
    pub probationary_score_bps: u64,
    pub threshold_bps: u64,
}

#[event]
pub struct VouchingCompleted {
    pub voucher: Pubkey,
    pub candidate: Pubkey,
    pub staked_reputation_bps: u64,
    pub candidate_initial_rep_bps: u64,
}

#[event]
pub struct VoteCast {
    pub node: Pubkey,
    pub round: u64,
    pub honest: bool,
    pub new_reputation_bps: u64,
}

#[event]
pub struct NodeGraduated {
    pub node: Pubkey,
    pub final_reputation_bps: u64,
}

#[event]
pub struct StakeReleased {
    pub voucher: Pubkey,
    pub candidate: Pubkey,
    pub returned_bps: u64,
}

#[event]
pub struct MisbehaviorReported {
    pub candidate: Pubkey,
    pub voucher: Pubkey,
    pub slashed_bps: u64,
}

#[event]
pub struct RoundAdvanced {
    pub new_round: u64,
}

// ---------------------------------------------------------------------------
// Helper: fixed-point multiplication
// ---------------------------------------------------------------------------

/// Multiply two BPS values and return a BPS result.
/// Equivalent to (a/SCALE) * (b/SCALE) * SCALE = a*b/SCALE.
fn bps_mul(a: u64, b: u64) -> u64 {
    a.saturating_mul(b) / SCALE
}

// ---------------------------------------------------------------------------
// Account context structs
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeNetwork<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = NetworkConfig::LEN,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, NetworkConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BootstrapGenesisNode<'info> {
    /// Must be the network authority.
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority @ PoRError::Unauthorized,
    )]
    pub config: Account<'info, NetworkConfig>,

    /// CHECK: arbitrary pubkey — the genesis node operator's wallet.
    pub node_owner: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        space = NodeState::LEN,
        seeds = [b"node", node_owner.key().as_ref()],
        bump,
    )]
    pub node_state: Account<'info, NodeState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterNode<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, NetworkConfig>,

    #[account(
        init,
        payer = owner,
        space = NodeState::LEN,
        seeds = [b"node", owner.key().as_ref()],
        bump,
    )]
    pub node_state: Account<'info, NodeState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitTaskProof<'info> {
    /// The candidate node's wallet — must sign each task submission.
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, NetworkConfig>,

    #[account(
        mut,
        seeds = [b"node", owner.key().as_ref()],
        bump = node_state.bump,
        constraint = node_state.owner == owner.key(),
    )]
    pub node_state: Account<'info, NodeState>,
}

#[derive(Accounts)]
pub struct VouchForNode<'info> {
    /// The established node performing the vouch.
    #[account(mut)]
    pub voucher_owner: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, NetworkConfig>,

    #[account(
        mut,
        seeds = [b"node", voucher_owner.key().as_ref()],
        bump = voucher_state.bump,
        constraint = voucher_state.owner == voucher_owner.key(),
    )]
    pub voucher_state: Account<'info, NodeState>,

    #[account(
        mut,
        seeds = [b"node", candidate_state.owner.as_ref()],
        bump = candidate_state.bump,
    )]
    pub candidate_state: Account<'info, NodeState>,

    #[account(
        init,
        payer = voucher_owner,
        space = VouchRecord::LEN,
        seeds = [b"vouch", voucher_owner.key().as_ref(), candidate_state.owner.as_ref()],
        bump,
    )]
    pub vouch_record: Account<'info, VouchRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, NetworkConfig>,

    #[account(
        mut,
        seeds = [b"node", owner.key().as_ref()],
        bump = node_state.bump,
        constraint = node_state.owner == owner.key(),
    )]
    pub node_state: Account<'info, NodeState>,
}

#[derive(Accounts)]
pub struct ReleaseVoucherStake<'info> {
    /// The voucher reclaims their stake — must sign.
    pub voucher_owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"node", voucher_owner.key().as_ref()],
        bump = voucher_state.bump,
        constraint = voucher_state.owner == voucher_owner.key(),
    )]
    pub voucher_state: Account<'info, NodeState>,

    #[account(
        seeds = [b"node", candidate_state.owner.as_ref()],
        bump = candidate_state.bump,
    )]
    pub candidate_state: Account<'info, NodeState>,

    #[account(
        mut,
        seeds = [b"vouch", voucher_owner.key().as_ref(), candidate_state.owner.as_ref()],
        bump = vouch_record.bump,
        constraint = vouch_record.voucher == voucher_owner.key(),
        constraint = vouch_record.candidate == candidate_state.owner,
    )]
    pub vouch_record: Account<'info, VouchRecord>,
}

#[derive(Accounts)]
pub struct ReportMisbehavior<'info> {
    /// Only the network authority may report misbehaviour (in production this
    /// would be a committee-signed slashing proof).
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority @ PoRError::Unauthorized,
    )]
    pub config: Account<'info, NetworkConfig>,

    #[account(
        mut,
        seeds = [b"node", candidate_state.owner.as_ref()],
        bump = candidate_state.bump,
    )]
    pub candidate_state: Account<'info, NodeState>,

    #[account(
        mut,
        seeds = [b"vouch", vouch_record.voucher.as_ref(), candidate_state.owner.as_ref()],
        bump = vouch_record.bump,
        constraint = vouch_record.candidate == candidate_state.owner,
    )]
    pub vouch_record: Account<'info, VouchRecord>,
}

#[derive(Accounts)]
pub struct AdvanceRound<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority @ PoRError::Unauthorized,
    )]
    pub config: Account<'info, NetworkConfig>,
}

// ---------------------------------------------------------------------------
// Program entry points
// ---------------------------------------------------------------------------

#[program]
pub mod coldstart_por {
    use super::*;

    // -----------------------------------------------------------------------
    // Instruction 1: initialize_network
    // -----------------------------------------------------------------------
    /// Deploy the PoR network with configurable protocol parameters.
    ///
    /// Called once by the network authority.  All parameters are stored in the
    /// global `NetworkConfig` PDA.  Pass `0` for any parameter to use the
    /// paper's default values.
    ///
    /// # Parameters
    /// - `delta_bps`   — Vouching stake fraction δ in BPS (default 1_500 = 0.15)
    /// - `alpha_bps`   — Dampening factor α in BPS (default 5_000 = 0.50)
    /// - `theta_p_bps` — Probationary pass threshold θ_P in BPS (default 9_000 = 0.90)
    /// - `tau_v_bps`   — Voucher eligibility threshold τ_v in BPS (default 4_000 = 0.40)
    /// - `lambda_bps`  — Time-decay λ in BPS (default 8_000 = 0.80)
    /// - `n_tasks`     — Number of Phase-1 tasks N (default 20)
    /// - `m_rounds`    — Phase-3 graduation rounds M (default 10)
    pub fn initialize_network(
        ctx: Context<InitializeNetwork>,
        delta_bps: u64,
        alpha_bps: u64,
        theta_p_bps: u64,
        tau_v_bps: u64,
        lambda_bps: u64,
        n_tasks: u8,
        m_rounds: u8,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;

        // Apply defaults for any zero-valued parameters.
        cfg.authority = ctx.accounts.authority.key();
        cfg.delta_bps = if delta_bps == 0 { DEFAULT_DELTA_BPS } else { delta_bps };
        cfg.alpha_bps = if alpha_bps == 0 { DEFAULT_ALPHA_BPS } else { alpha_bps };
        cfg.theta_p_bps = if theta_p_bps == 0 { DEFAULT_THETA_P_BPS } else { theta_p_bps };
        cfg.tau_v_bps = if tau_v_bps == 0 { DEFAULT_TAU_V_BPS } else { tau_v_bps };
        cfg.lambda_bps = if lambda_bps == 0 { DEFAULT_LAMBDA_BPS } else { lambda_bps };
        cfg.n_tasks = if n_tasks == 0 { DEFAULT_N_TASKS } else { n_tasks };
        cfg.m_rounds = if m_rounds == 0 { DEFAULT_M_ROUNDS } else { m_rounds };
        cfg.current_round = 0;
        cfg.total_nodes = 0;
        cfg.bump = ctx.bumps.config;

        require!(cfg.delta_bps <= SCALE, PoRError::InvalidParameter);
        require!(cfg.alpha_bps <= SCALE, PoRError::InvalidParameter);
        require!(cfg.theta_p_bps <= SCALE, PoRError::InvalidParameter);
        require!(cfg.tau_v_bps <= SCALE, PoRError::InvalidParameter);
        require!(cfg.lambda_bps <= SCALE, PoRError::InvalidParameter);

        emit!(NetworkInitialized {
            authority: cfg.authority,
            delta_bps: cfg.delta_bps,
            alpha_bps: cfg.alpha_bps,
            theta_p_bps: cfg.theta_p_bps,
            tau_v_bps: cfg.tau_v_bps,
            n_tasks: cfg.n_tasks,
            m_rounds: cfg.m_rounds,
        });

        msg!(
            "ColdStart-PoR network initialised. δ={} α={} θP={} τv={} λ={} N={} M={}",
            cfg.delta_bps, cfg.alpha_bps, cfg.theta_p_bps,
            cfg.tau_v_bps, cfg.lambda_bps, cfg.n_tasks, cfg.m_rounds,
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 2: bootstrap_genesis_node
    // -----------------------------------------------------------------------
    /// Authority-only: create a genesis node with a pre-assigned reputation.
    ///
    /// This is the *only* centralised step in the protocol.  It is used
    /// exclusively to seed the initial set of full participants from which
    /// future nodes can obtain vouching.  The paper explicitly acknowledges
    /// that genesis-block assignment is unavoidable for the very first nodes
    /// (§II-B).  After genesis nodes are seeded, the system operates in a
    /// fully decentralised manner.
    ///
    /// # Parameters
    /// - `initial_reputation_bps` — starting R ∈ [0, SCALE]
    pub fn bootstrap_genesis_node(
        ctx: Context<BootstrapGenesisNode>,
        initial_reputation_bps: u64,
    ) -> Result<()> {
        require!(
            initial_reputation_bps <= SCALE,
            PoRError::InvalidReputation
        );

        let cfg = &mut ctx.accounts.config;
        let node = &mut ctx.accounts.node_state;

        node.owner = ctx.accounts.node_owner.key();
        node.reputation_bps = initial_reputation_bps;
        node.phase = NodePhase::Full;
        node.tasks_completed = cfg.n_tasks;
        node.tasks_passed = cfg.n_tasks;
        node.honest_rounds = cfg.m_rounds;
        node.voucher = None;
        node.staked_reputation_bps = 0;
        node.last_voted_round = 0;
        node.bump = ctx.bumps.node_state;

        cfg.total_nodes += 1;

        emit!(NodeBootstrapped {
            node: node.owner,
            reputation_bps: initial_reputation_bps,
        });

        msg!(
            "Genesis node {} bootstrapped with reputation {} BPS",
            node.owner, initial_reputation_bps
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 3: register_node
    // -----------------------------------------------------------------------
    /// A new node self-registers to enter Phase 1 (Probationary Tasks).
    ///
    /// No stake or prior reputation required.  The node's account is
    /// initialised with reputation = 0 and phase = Phase1.
    pub fn register_node(ctx: Context<RegisterNode>) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        let node = &mut ctx.accounts.node_state;

        node.owner = ctx.accounts.owner.key();
        node.reputation_bps = 0;
        node.phase = NodePhase::Phase1;
        node.tasks_completed = 0;
        node.tasks_passed = 0;
        node.honest_rounds = 0;
        node.voucher = None;
        node.staked_reputation_bps = 0;
        node.last_voted_round = 0;
        node.bump = ctx.bumps.node_state;

        cfg.total_nodes += 1;

        let ts = Clock::get()?.unix_timestamp;
        emit!(NodeRegistered {
            node: node.owner,
            timestamp: ts,
        });

        msg!("Node {} registered → Phase 1", node.owner);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 4: submit_task_proof
    // -----------------------------------------------------------------------
    /// Submit a verifiable proof for one Phase-1 micro-task (Eq. 1).
    ///
    /// Tasks must be submitted in order (task 0, then 1, …, then N−1).
    ///
    /// ## Proof mechanism
    /// The proof is a hash-based puzzle: the caller provides a `nonce` such
    /// that SHA256(owner_pubkey ‖ task_index ‖ nonce) starts with `0x00`
    /// (≈ 1/256 probability per attempt — trivial for a real node, infeasible
    /// to fake at scale).  In production this would be replaced by a richer
    /// verifiable computation (Merkle proof, relay certificate, etc.).
    ///
    /// After all N tasks:
    ///   P = tasks_passed / n_tasks  (Eq. 1)
    ///
    /// If P ≥ θ_P  → advance to Phase 2.
    /// Otherwise   → node is Banned (rejected).
    ///
    /// # Parameters
    /// - `task_index` — which task is being submitted (must equal tasks_completed)
    /// - `nonce`      — 64-bit nonce satisfying the proof puzzle
    pub fn submit_task_proof(
        ctx: Context<SubmitTaskProof>,
        task_index: u8,
        nonce: u64,
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;
        let node = &mut ctx.accounts.node_state;

        require!(node.phase == NodePhase::Phase1, PoRError::WrongPhase);
        require!(task_index < cfg.n_tasks, PoRError::InvalidTaskIndex);
        require!(task_index == node.tasks_completed, PoRError::TaskOutOfOrder);

        // ------------------------------------------------------------------
        // Proof verification (Eq. 1 — "verifiable micro-task proof π_j")
        // Build preimage: owner_pubkey (32 B) || task_index (1 B) || nonce (8 B)
        // ------------------------------------------------------------------
        let mut preimage = Vec::with_capacity(41);
        preimage.extend_from_slice(ctx.accounts.owner.key().as_ref());
        preimage.push(task_index);
        preimage.extend_from_slice(&nonce.to_le_bytes());

        let digest = Sha256::digest(&preimage);

        // Accept proof if first byte is 0x00 (~0.39% chance — easily found
        // with a simple loop; use threshold 0x03 for demo speed).
        let proof_valid = digest[0] <= 0x03;

        node.tasks_completed += 1;
        if proof_valid {
            node.tasks_passed += 1;
        }

        emit!(TaskSubmitted {
            node: node.owner,
            task_index,
            proof_valid,
            tasks_completed: node.tasks_completed,
            tasks_passed: node.tasks_passed,
        });

        msg!(
            "Task {}/{} submitted by {} — valid={} ({}/{})",
            task_index + 1, cfg.n_tasks, node.owner,
            proof_valid, node.tasks_passed, node.tasks_completed
        );

        // ------------------------------------------------------------------
        // Check phase transition after the final task
        // ------------------------------------------------------------------
        if node.tasks_completed == cfg.n_tasks {
            // Probationary score: P(v_new, N) = tasks_passed / N  (Eq. 1)
            let score_bps =
                (node.tasks_passed as u64).saturating_mul(SCALE) / cfg.n_tasks as u64;

            if score_bps >= cfg.theta_p_bps {
                node.phase = NodePhase::Phase2;
                emit!(PhaseAdvanced {
                    node: node.owner,
                    from_phase: 1,
                    to_phase: 2,
                    score_bps,
                });
                msg!(
                    "Node {} Phase 1 PASSED (score={}/10000 ≥ θP={}/10000) → Phase 2",
                    node.owner, score_bps, cfg.theta_p_bps
                );
            } else {
                node.phase = NodePhase::Banned;
                emit!(NodeRejected {
                    node: node.owner,
                    probationary_score_bps: score_bps,
                    threshold_bps: cfg.theta_p_bps,
                });
                msg!(
                    "Node {} Phase 1 FAILED (score={}/10000 < θP={}/10000) → Banned",
                    node.owner, score_bps, cfg.theta_p_bps
                );
            }
        }

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 5: vouch_for_node
    // -----------------------------------------------------------------------
    /// An eligible full node stakes δ · R_s of its reputation to vouch for a
    /// Phase-2 candidate (Eq. 2 & Eq. 3).
    ///
    /// Eq. 2:  R'_s = R_s · (1 − δ)          [voucher's rep after staking]
    /// Eq. 3:  R_new(0) = α · R_s · δ         [candidate's initial rep]
    ///
    /// The staked amount δ · R_s is deducted from the voucher immediately and
    /// stored in the `VouchRecord`.  It is returned if the candidate graduates
    /// or slashed if the candidate misbehaves.
    ///
    /// Only one active vouch per candidate is allowed.
    pub fn vouch_for_node(ctx: Context<VouchForNode>) -> Result<()> {
        let cfg = &ctx.accounts.config;
        let voucher = &mut ctx.accounts.voucher_state;
        let candidate = &mut ctx.accounts.candidate_state;
        let vouch_record = &mut ctx.accounts.vouch_record;

        require!(candidate.phase == NodePhase::Phase2, PoRError::WrongPhase);
        require!(voucher.phase == NodePhase::Full, PoRError::VoucherNotEligible);
        require!(
            voucher.reputation_bps >= cfg.tau_v_bps,
            PoRError::VoucherReputationTooLow
        );
        require!(candidate.voucher.is_none(), PoRError::AlreadyVouched);

        // Eq. 2: compute stake = δ · R_s
        let r_s = voucher.reputation_bps;
        let staked = bps_mul(r_s, cfg.delta_bps); // δ · R_s

        // Deduct stake from voucher
        voucher.reputation_bps = r_s.saturating_sub(staked);

        // Eq. 3: R_new(0) = α · R_s · δ
        //   = α · staked   (since staked = R_s · δ)
        let initial_rep = bps_mul(cfg.alpha_bps, staked);

        // Write candidate's provisional reputation
        candidate.reputation_bps = initial_rep;
        candidate.voucher = Some(ctx.accounts.voucher_owner.key());
        candidate.staked_reputation_bps = staked;
        candidate.phase = NodePhase::Phase3;

        // Record the vouch
        vouch_record.voucher = ctx.accounts.voucher_owner.key();
        vouch_record.candidate = candidate.owner;
        vouch_record.staked_reputation_bps = staked;
        vouch_record.active = true;
        vouch_record.bump = ctx.bumps.vouch_record;

        emit!(VouchingCompleted {
            voucher: vouch_record.voucher,
            candidate: vouch_record.candidate,
            staked_reputation_bps: staked,
            candidate_initial_rep_bps: initial_rep,
        });

        msg!(
            "Vouch: {} → {} | staked={} BPS | R_new(0)={} BPS → Phase 3",
            vouch_record.voucher, vouch_record.candidate, staked, initial_rep
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 6: cast_vote
    // -----------------------------------------------------------------------
    /// Record a consensus vote for the current round and update reputation (Eq. 4).
    ///
    /// Eq. 4:  R(t+1) = λ · R(t) + (1−λ) · h(t)
    ///
    /// where h(t) ∈ {0, 1} is the honesty indicator (1 = honest, 0 = dishonest).
    ///
    /// Phase-3 nodes accumulate honest_rounds.  After M honest rounds they
    /// graduate to Full status.  Phase-3 nodes that misbehave should then
    /// have `report_misbehavior` called against them.
    ///
    /// Full nodes may also cast votes to update their time-decayed reputation.
    ///
    /// # Parameters
    /// - `round`  — must equal config.current_round
    /// - `honest` — whether the vote is well-formed (true) or malicious (false)
    pub fn cast_vote(ctx: Context<CastVote>, round: u64, honest: bool) -> Result<()> {
        let cfg = &ctx.accounts.config;
        let node = &mut ctx.accounts.node_state;

        require!(
            node.phase == NodePhase::Phase3 || node.phase == NodePhase::Full,
            PoRError::WrongPhase
        );
        require!(node.phase != NodePhase::Banned, PoRError::NodeBanned);
        require!(round == cfg.current_round, PoRError::InvalidRound);
        // Prevent double-voting within the same round
        require!(node.last_voted_round < round || round == 0, PoRError::InvalidRound);

        // Eq. 4: R(t+1) = λ · R(t) + (1−λ) · h(t)
        let h_t: u64 = if honest { SCALE } else { 0 };
        let lambda = cfg.lambda_bps;

        node.reputation_bps = bps_mul(lambda, node.reputation_bps)
            .saturating_add(bps_mul(SCALE - lambda, h_t));

        node.last_voted_round = round;

        // Track Phase-3 graduation progress
        if node.phase == NodePhase::Phase3 && honest {
            node.honest_rounds = node.honest_rounds.saturating_add(1);

            if node.honest_rounds >= cfg.m_rounds {
                node.phase = NodePhase::Full;
                emit!(NodeGraduated {
                    node: node.owner,
                    final_reputation_bps: node.reputation_bps,
                });
                msg!(
                    "Node {} GRADUATED to Full PoR participation (R={} BPS)",
                    node.owner, node.reputation_bps
                );
            }
        }

        emit!(VoteCast {
            node: node.owner,
            round,
            honest,
            new_reputation_bps: node.reputation_bps,
        });

        msg!(
            "Vote: {} round={} honest={} → R={} BPS",
            node.owner, round, honest, node.reputation_bps
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 7: release_voucher_stake
    // -----------------------------------------------------------------------
    /// Voucher reclaims the reputation stake after the candidate has graduated.
    ///
    /// Can only be called once per VouchRecord (active=true → false).
    /// The voucher's reputation is restored by `staked_reputation_bps`.
    pub fn release_voucher_stake(ctx: Context<ReleaseVoucherStake>) -> Result<()> {
        let candidate = &ctx.accounts.candidate_state;
        let voucher = &mut ctx.accounts.voucher_state;
        let vouch_record = &mut ctx.accounts.vouch_record;

        require!(
            candidate.phase == NodePhase::Full,
            PoRError::CandidateNotGraduated
        );
        require!(vouch_record.active, PoRError::VouchAlreadySettled);

        let returned = vouch_record.staked_reputation_bps;
        voucher.reputation_bps = voucher.reputation_bps.saturating_add(returned);
        vouch_record.active = false;

        emit!(StakeReleased {
            voucher: vouch_record.voucher,
            candidate: vouch_record.candidate,
            returned_bps: returned,
        });

        msg!(
            "Stake released: {} ← {} BPS (candidate {} graduated)",
            vouch_record.voucher, returned, vouch_record.candidate
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 8: report_misbehavior
    // -----------------------------------------------------------------------
    /// Authority reports misbehaviour by a Phase-3 node.
    ///
    /// Result:
    ///   - Candidate is permanently Banned (R → 0).
    ///   - Voucher's staked reputation is slashed (not returned).
    ///   - VouchRecord is settled (active → false).
    ///
    /// In a production system this instruction would be gated behind a
    /// committee-signed slashing proof rather than sole authority discretion.
    pub fn report_misbehavior(ctx: Context<ReportMisbehavior>) -> Result<()> {
        let candidate = &mut ctx.accounts.candidate_state;
        let vouch_record = &mut ctx.accounts.vouch_record;

        require!(candidate.phase == NodePhase::Phase3, PoRError::WrongPhase);
        require!(vouch_record.active, PoRError::VouchAlreadySettled);

        let slashed = vouch_record.staked_reputation_bps;

        // Ban and zero-out the candidate
        candidate.phase = NodePhase::Banned;
        candidate.reputation_bps = 0;

        // Slash: the stake is simply not returned (not added back to voucher)
        vouch_record.active = false;

        emit!(MisbehaviorReported {
            candidate: candidate.owner,
            voucher: vouch_record.voucher,
            slashed_bps: slashed,
        });

        msg!(
            "MISBEHAVIOUR: {} banned | voucher {} slashed {} BPS",
            candidate.owner, vouch_record.voucher, slashed
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 9: advance_round
    // -----------------------------------------------------------------------
    /// Authority increments the consensus round counter.
    ///
    /// In a real PoR chain this would be triggered automatically by the
    /// consensus protocol after each block is finalised.
    pub fn advance_round(ctx: Context<AdvanceRound>) -> Result<()> {
        ctx.accounts.config.current_round += 1;
        let r = ctx.accounts.config.current_round;
        emit!(RoundAdvanced { new_round: r });
        msg!("Round advanced → {}", r);
        Ok(())
    }
}
