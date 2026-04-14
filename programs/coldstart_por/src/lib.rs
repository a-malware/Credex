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

    /// Merkle root for task verification (Solana block hashes).
    pub task_merkle_root: [u8; 32],

    /// Depth of the Merkle tree used for task verification.
    pub merkle_depth: u8,

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
        + 32   // task_merkle_root
        + 1    // merkle_depth
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

/// Records votes from committee members to slash a misbehaving node.
/// Created by propose_slash; votes added by vote_slash; executed by execute_slash.
/// PDA seeds: ["slash_vote", candidate.key()]
#[account]
pub struct SlashVote {
    /// Pubkey of the candidate being considered for slashing.
    pub candidate: Pubkey,

    /// Number of votes received (max 5, need 3 to execute).
    pub votes: u8,

    /// First voter pubkey.
    pub voter_1: Option<Pubkey>,

    /// Second voter pubkey.
    pub voter_2: Option<Pubkey>,

    /// Third voter pubkey.
    pub voter_3: Option<Pubkey>,

    /// True while voting is active; false once executed or cancelled.
    pub active: bool,

    /// PDA bump.
    pub bump: u8,
}

impl SlashVote {
    pub const LEN: usize = 8   // discriminator
        + 32   // candidate
        + 1    // votes
        + 33   // Option<Pubkey> voter_1
        + 33   // Option<Pubkey> voter_2
        + 33   // Option<Pubkey> voter_3
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

#[event]
pub struct RoundOutcomeRecorded {
    pub node: Pubkey,
    pub round: u64,
    pub was_honest: bool,
    pub new_reputation_bps: u64,
}

#[event]
pub struct SlashProposed {
    pub candidate: Pubkey,
    pub proposer: Pubkey,
    pub vote_count: u8,
}

#[event]
pub struct SlashVoteAdded {
    pub candidate: Pubkey,
    pub voter: Pubkey,
    pub total_votes: u8,
}

#[event]
pub struct SlashExecuted {
    pub candidate: Pubkey,
    pub voucher: Pubkey,
    pub slashed_bps: u64,
    pub total_votes: u8,
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
// Helper: Merkle proof verification
// ---------------------------------------------------------------------------

/// Verify a Merkle inclusion proof for a given leaf.
///
/// This function implements bottom-up Merkle path verification. Starting from
/// the leaf hash, it iteratively combines the current hash with each sibling
/// in the proof, moving up the tree until reaching the root.
///
/// # Parameters
/// - `leaf_hash` — The hash of the leaf data (32 bytes)
/// - `proof` — Array of sibling hashes along the path from leaf to root
/// - `leaf_index` — The index of the leaf in the tree (used to determine left/right ordering)
/// - `root` — The expected Merkle root (32 bytes)
///
/// # Returns
/// `true` if the computed root matches the expected root, `false` otherwise
///
/// # Algorithm
/// For each sibling in the proof:
/// 1. If leaf_index is even, current goes left: hash(current || sibling)
/// 2. If leaf_index is odd, current goes right: hash(sibling || current)
/// 3. Divide leaf_index by 2 to move up one level
/// 4. Repeat until all siblings are processed
/// 5. Compare final computed hash with expected root
fn verify_merkle_proof(
    leaf_hash: [u8; 32],
    proof: &[[u8; 32]],
    leaf_index: u8,
    root: [u8; 32],
) -> bool {
    let mut current = leaf_hash;
    let mut index = leaf_index as usize;
    
    for sibling in proof.iter() {
        let mut combined = [0u8; 64];
        if index % 2 == 0 {
            // Current is left child
            combined[..32].copy_from_slice(&current);
            combined[32..].copy_from_slice(sibling);
        } else {
            // Current is right child
            combined[..32].copy_from_slice(sibling);
            combined[32..].copy_from_slice(&current);
        }
        current = Sha256::digest(&combined).into();
        index /= 2;
    }
    
    current == root
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
pub struct RecordRoundOutcome<'info> {
    /// Network authority initiates the outcome recording
    pub authority: Signer<'info>,

    /// First cosigner - must be a Full node
    pub cosigner_1: Signer<'info>,

    /// Second cosigner - must be a Full node
    pub cosigner_2: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority @ PoRError::Unauthorized,
    )]
    pub config: Account<'info, NetworkConfig>,

    #[account(
        seeds = [b"node", cosigner_1.key().as_ref()],
        bump = cosigner_1_state.bump,
        constraint = cosigner_1_state.owner == cosigner_1.key(),
        constraint = cosigner_1_state.phase == NodePhase::Full @ PoRError::VoucherNotEligible,
    )]
    pub cosigner_1_state: Account<'info, NodeState>,

    #[account(
        seeds = [b"node", cosigner_2.key().as_ref()],
        bump = cosigner_2_state.bump,
        constraint = cosigner_2_state.owner == cosigner_2.key(),
        constraint = cosigner_2_state.phase == NodePhase::Full @ PoRError::VoucherNotEligible,
    )]
    pub cosigner_2_state: Account<'info, NodeState>,

    #[account(
        mut,
        seeds = [b"node", target_node.owner.as_ref()],
        bump = target_node.bump,
    )]
    pub target_node: Account<'info, NodeState>,
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
pub struct ProposeSlash<'info> {
    /// The Full node proposing the slash
    #[account(mut)]
    pub proposer: Signer<'info>,

    #[account(
        seeds = [b"node", proposer.key().as_ref()],
        bump = proposer_state.bump,
        constraint = proposer_state.owner == proposer.key(),
        constraint = proposer_state.phase == NodePhase::Full @ PoRError::VoucherNotEligible,
    )]
    pub proposer_state: Account<'info, NodeState>,

    #[account(
        seeds = [b"node", candidate_state.owner.as_ref()],
        bump = candidate_state.bump,
    )]
    pub candidate_state: Account<'info, NodeState>,

    #[account(
        init,
        payer = proposer,
        space = SlashVote::LEN,
        seeds = [b"slash_vote", candidate_state.owner.as_ref()],
        bump,
    )]
    pub slash_vote: Account<'info, SlashVote>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoteSlash<'info> {
    /// A Full node voting on the slash proposal
    pub voter: Signer<'info>,

    #[account(
        seeds = [b"node", voter.key().as_ref()],
        bump = voter_state.bump,
        constraint = voter_state.owner == voter.key(),
        constraint = voter_state.phase == NodePhase::Full @ PoRError::VoucherNotEligible,
    )]
    pub voter_state: Account<'info, NodeState>,

    #[account(
        mut,
        seeds = [b"slash_vote", slash_vote.candidate.as_ref()],
        bump = slash_vote.bump,
        constraint = slash_vote.active,
    )]
    pub slash_vote: Account<'info, SlashVote>,
}

#[derive(Accounts)]
pub struct ExecuteSlash<'info> {
    /// Anyone can execute once threshold is reached
    pub executor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"slash_vote", slash_vote.candidate.as_ref()],
        bump = slash_vote.bump,
        constraint = slash_vote.active,
    )]
    pub slash_vote: Account<'info, SlashVote>,

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
        task_merkle_root: [u8; 32],
        merkle_depth: u8,
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
        cfg.task_merkle_root = task_merkle_root;
        cfg.merkle_depth = merkle_depth;
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
    /// The proof is a Merkle inclusion proof demonstrating that leaf_data
    /// is included in the task Merkle tree stored in NetworkConfig.
    /// This verifies that the task data comes from a real-world verifiable
    /// source (Solana block hashes) rather than arbitrary computation.
    ///
    /// After all N tasks:
    ///   P = tasks_passed / n_tasks  (Eq. 1)
    ///
    /// If P ≥ θ_P  → advance to Phase 2.
    /// Otherwise   → node is Banned (rejected).
    ///
    /// # Parameters
    /// - `task_index` — which task is being submitted (must equal tasks_completed)
    /// - `leaf_data`  — 32-byte leaf data (e.g., Solana block hash)
    /// - `proof`      — Merkle proof path (array of sibling hashes)
    pub fn submit_task_proof(
        ctx: Context<SubmitTaskProof>,
        task_index: u8,
        leaf_data: [u8; 32],
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;
        let node = &mut ctx.accounts.node_state;

        require!(node.phase == NodePhase::Phase1, PoRError::WrongPhase);
        require!(task_index < cfg.n_tasks, PoRError::InvalidTaskIndex);
        require!(task_index == node.tasks_completed, PoRError::TaskOutOfOrder);

        // ------------------------------------------------------------------
        // Merkle proof verification (Eq. 1 — "verifiable micro-task proof π_j")
        // Compute leaf hash and verify inclusion in the task Merkle tree
        // ------------------------------------------------------------------
        let leaf_hash = Sha256::digest(&leaf_data).into();
        let proof_valid = verify_merkle_proof(
            leaf_hash,
            &proof,
            task_index,
            cfg.task_merkle_root,
        );

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
    /// Record a consensus vote for the current round.
    ///
    /// This instruction only records that the node voted in this round.
    /// Reputation updates and graduation logic are handled separately by
    /// the record_round_outcome instruction, which requires committee confirmation.
    ///
    /// Phase-3 and Full nodes may cast votes. The actual outcome (honest/dishonest)
    /// is determined off-chain and confirmed by a committee of Full nodes.
    ///
    /// # Parameters
    /// - `round`  — must equal config.current_round
    pub fn cast_vote(ctx: Context<CastVote>, round: u64) -> Result<()> {
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

        // Record the vote
        node.last_voted_round = round;

        emit!(VoteCast {
            node: node.owner,
            round,
            honest: true, // Placeholder - actual outcome determined by committee
            new_reputation_bps: node.reputation_bps,
        });

        msg!(
            "Vote recorded: {} round={} (outcome pending committee confirmation)",
            node.owner, round
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 7: record_round_outcome
    // -----------------------------------------------------------------------
    /// Record the outcome of a voting round with committee confirmation.
    ///
    /// This instruction requires signatures from the authority plus 2 Full nodes
    /// (cosigners) to confirm whether a node's vote was honest or dishonest.
    /// It updates reputation using Eq. 4 and handles Phase 3 graduation.
    ///
    /// Eq. 4:  R(t+1) = λ · R(t) + (1−λ) · h(t)
    ///
    /// where h(t) ∈ {0, 1} is the honesty indicator (1 = honest, 0 = dishonest).
    ///
    /// # Parameters
    /// - `round` — the round being confirmed (must be < current_round)
    /// - `was_honest` — whether the node's vote was honest (true) or dishonest (false)
    pub fn record_round_outcome(
        ctx: Context<RecordRoundOutcome>,
        round: u64,
        was_honest: bool,
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;
        let node = &mut ctx.accounts.target_node;

        // Constraint: can't record outcome for current round (must be past round)
        require!(round < cfg.current_round, PoRError::InvalidRound);

        // Constraint: node must have voted in this round
        require!(node.last_voted_round == round, PoRError::InvalidRound);

        // Eq. 4: R(t+1) = λ · R(t) + (1−λ) · h(t)
        let h_t: u64 = if was_honest { SCALE } else { 0 };
        let lambda = cfg.lambda_bps;

        node.reputation_bps = bps_mul(lambda, node.reputation_bps)
            .saturating_add(bps_mul(SCALE - lambda, h_t));

        // Track Phase-3 graduation progress
        if node.phase == NodePhase::Phase3 && was_honest {
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

        emit!(RoundOutcomeRecorded {
            node: node.owner,
            round,
            was_honest,
            new_reputation_bps: node.reputation_bps,
        });

        msg!(
            "Round outcome recorded: {} round={} honest={} → R={} BPS (confirmed by committee)",
            node.owner, round, was_honest, node.reputation_bps
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 8: release_voucher_stake
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
    // -----------------------------------------------------------------------
    // Instruction 9: propose_slash
    // -----------------------------------------------------------------------
    /// Propose slashing a misbehaving node (requires Full node status).
    ///
    /// Creates a SlashVote account with votes = 1. Other Full nodes can
    /// vote using vote_slash. Once votes >= 3, execute_slash can be called.
    pub fn propose_slash(ctx: Context<ProposeSlash>) -> Result<()> {
        let slash_vote = &mut ctx.accounts.slash_vote;
        let candidate = &ctx.accounts.candidate_state;
        let proposer = &ctx.accounts.proposer;

        slash_vote.candidate = candidate.owner;
        slash_vote.votes = 1;
        slash_vote.voter_1 = Some(proposer.key());
        slash_vote.voter_2 = None;
        slash_vote.voter_3 = None;
        slash_vote.active = true;
        slash_vote.bump = ctx.bumps.slash_vote;

        emit!(SlashProposed {
            candidate: candidate.owner,
            proposer: proposer.key(),
            vote_count: 1,
        });

        msg!(
            "Slash proposed: candidate={} proposer={} votes=1/3",
            candidate.owner, proposer.key()
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 10: vote_slash
    // -----------------------------------------------------------------------
    /// Add a vote to an existing slash proposal (requires Full node status).
    ///
    /// Voter must not have already voted. Increments vote count.
    pub fn vote_slash(ctx: Context<VoteSlash>) -> Result<()> {
        let slash_vote = &mut ctx.accounts.slash_vote;
        let voter = &ctx.accounts.voter;

        // Check voter hasn't already voted
        require!(
            slash_vote.voter_1 != Some(voter.key())
                && slash_vote.voter_2 != Some(voter.key())
                && slash_vote.voter_3 != Some(voter.key()),
            PoRError::AlreadyVouched // Reusing error code for "already participated"
        );

        // Add voter to the list
        if slash_vote.voter_2.is_none() {
            slash_vote.voter_2 = Some(voter.key());
        } else if slash_vote.voter_3.is_none() {
            slash_vote.voter_3 = Some(voter.key());
        } else {
            // Already have 3 voters, can't add more
            return Err(PoRError::AlreadyVouched.into());
        }

        slash_vote.votes += 1;

        emit!(SlashVoteAdded {
            candidate: slash_vote.candidate,
            voter: voter.key(),
            total_votes: slash_vote.votes,
        });

        msg!(
            "Slash vote added: candidate={} voter={} votes={}/3",
            slash_vote.candidate, voter.key(), slash_vote.votes
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 11: execute_slash
    // -----------------------------------------------------------------------
    /// Execute a slash once votes >= 3.
    ///
    /// Result:
    ///   - Candidate is permanently Banned (R → 0).
    ///   - Voucher's staked reputation is slashed (not returned).
    ///   - VouchRecord is settled (active → false).
    ///   - SlashVote is deactivated.
    pub fn execute_slash(ctx: Context<ExecuteSlash>) -> Result<()> {
        let slash_vote = &mut ctx.accounts.slash_vote;
        let candidate = &mut ctx.accounts.candidate_state;
        let vouch_record = &mut ctx.accounts.vouch_record;

        // Require at least 3 votes
        require!(slash_vote.votes >= 3, PoRError::VoucherReputationTooLow); // Reusing error for "insufficient votes"

        require!(vouch_record.active, PoRError::VouchAlreadySettled);

        let slashed = vouch_record.staked_reputation_bps;

        // Ban and zero-out the candidate
        candidate.phase = NodePhase::Banned;
        candidate.reputation_bps = 0;

        // Slash: the stake is simply not returned (not added back to voucher)
        vouch_record.active = false;
        slash_vote.active = false;

        emit!(SlashExecuted {
            candidate: candidate.owner,
            voucher: vouch_record.voucher,
            slashed_bps: slashed,
            total_votes: slash_vote.votes,
        });

        msg!(
            "SLASH EXECUTED: {} banned | voucher {} slashed {} BPS (votes={}/3)",
            candidate.owner, vouch_record.voucher, slashed, slash_vote.votes
        );
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Instruction 12: advance_round
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

// ---------------------------------------------------------------------------
// Unit tests for verify_merkle_proof
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper function to build a simple Merkle tree for testing
    fn build_test_tree(leaves: &[[u8; 32]]) -> ([u8; 32], Vec<Vec<[u8; 32]>>) {
        let mut layer = leaves.to_vec();
        let mut proofs = vec![Vec::new(); leaves.len()];
        
        // Pad to power of 2
        while layer.len() & (layer.len() - 1) != 0 {
            layer.push(layer[layer.len() - 1]);
        }
        
        let mut level = 0;
        while layer.len() > 1 {
            let mut next_layer = Vec::new();
            
            for i in (0..layer.len()).step_by(2) {
                let left = layer[i];
                let right = layer[i + 1];
                
                // Record siblings for proof construction
                if i < leaves.len() {
                    proofs[i].push(right);
                }
                if i + 1 < leaves.len() {
                    proofs[i + 1].push(left);
                }
                
                // Compute parent hash
                let mut combined = [0u8; 64];
                combined[..32].copy_from_slice(&left);
                combined[32..].copy_from_slice(&right);
                let parent: [u8; 32] = Sha256::digest(&combined).into();
                next_layer.push(parent);
            }
            
            layer = next_layer;
            level += 1;
        }
        
        (layer[0], proofs)
    }

    #[test]
    fn test_verify_merkle_proof_valid_proof() {
        // Create a simple 4-leaf tree
        let leaf0: [u8; 32] = Sha256::digest(b"leaf0").into();
        let leaf1: [u8; 32] = Sha256::digest(b"leaf1").into();
        let leaf2: [u8; 32] = Sha256::digest(b"leaf2").into();
        let leaf3: [u8; 32] = Sha256::digest(b"leaf3").into();
        
        let leaves = [leaf0, leaf1, leaf2, leaf3];
        let (root, proofs) = build_test_tree(&leaves);
        
        // Test valid proof for each leaf
        for (i, leaf) in leaves.iter().enumerate() {
            let result = verify_merkle_proof(*leaf, &proofs[i], i as u8, root);
            assert!(result, "Valid proof for leaf {} should verify", i);
        }
    }

    #[test]
    fn test_verify_merkle_proof_invalid_sibling() {
        // Create a 4-leaf tree
        let leaf0: [u8; 32] = Sha256::digest(b"leaf0").into();
        let leaf1: [u8; 32] = Sha256::digest(b"leaf1").into();
        let leaf2: [u8; 32] = Sha256::digest(b"leaf2").into();
        let leaf3: [u8; 32] = Sha256::digest(b"leaf3").into();
        
        let leaves = [leaf0, leaf1, leaf2, leaf3];
        let (root, proofs) = build_test_tree(&leaves);
        
        // Corrupt one sibling in the proof
        let mut bad_proof = proofs[0].clone();
        bad_proof[0] = Sha256::digest(b"wrong_sibling").into();
        
        let result = verify_merkle_proof(leaf0, &bad_proof, 0, root);
        assert!(!result, "Proof with wrong sibling should fail");
    }

    #[test]
    fn test_verify_merkle_proof_wrong_leaf() {
        // Create a 4-leaf tree
        let leaf0: [u8; 32] = Sha256::digest(b"leaf0").into();
        let leaf1: [u8; 32] = Sha256::digest(b"leaf1").into();
        let leaf2: [u8; 32] = Sha256::digest(b"leaf2").into();
        let leaf3: [u8; 32] = Sha256::digest(b"leaf3").into();
        
        let leaves = [leaf0, leaf1, leaf2, leaf3];
        let (root, proofs) = build_test_tree(&leaves);
        
        // Try to verify wrong leaf with correct proof
        let wrong_leaf: [u8; 32] = Sha256::digest(b"wrong_leaf").into();
        let result = verify_merkle_proof(wrong_leaf, &proofs[0], 0, root);
        assert!(!result, "Proof with wrong leaf should fail");
    }

    #[test]
    fn test_verify_merkle_proof_wrong_root() {
        // Create a 4-leaf tree
        let leaf0: [u8; 32] = Sha256::digest(b"leaf0").into();
        let leaf1: [u8; 32] = Sha256::digest(b"leaf1").into();
        let leaf2: [u8; 32] = Sha256::digest(b"leaf2").into();
        let leaf3: [u8; 32] = Sha256::digest(b"leaf3").into();
        
        let leaves = [leaf0, leaf1, leaf2, leaf3];
        let (_root, proofs) = build_test_tree(&leaves);
        
        // Use wrong root
        let wrong_root: [u8; 32] = Sha256::digest(b"wrong_root").into();
        let result = verify_merkle_proof(leaf0, &proofs[0], 0, wrong_root);
        assert!(!result, "Proof with wrong root should fail");
    }

    #[test]
    fn test_verify_merkle_proof_empty_proof() {
        // Single leaf tree (empty proof)
        let leaf: [u8; 32] = Sha256::digest(b"single_leaf").into();
        let empty_proof: Vec<[u8; 32]> = vec![];
        
        // For a single-leaf tree, the leaf itself is the root
        let result = verify_merkle_proof(leaf, &empty_proof, 0, leaf);
        assert!(result, "Single leaf tree with empty proof should verify");
    }

    #[test]
    fn test_verify_merkle_proof_left_right_ordering() {
        // Create a 2-leaf tree to test left/right ordering
        let leaf0: [u8; 32] = Sha256::digest(b"left").into();
        let leaf1: [u8; 32] = Sha256::digest(b"right").into();
        
        // Manually compute root with correct ordering
        let mut combined = [0u8; 64];
        combined[..32].copy_from_slice(&leaf0);
        combined[32..].copy_from_slice(&leaf1);
        let root: [u8; 32] = Sha256::digest(&combined).into();
        
        // Test leaf0 (index 0, even - should be left)
        let proof0 = vec![leaf1];
        assert!(verify_merkle_proof(leaf0, &proof0, 0, root), 
                "Left leaf (even index) should verify");
        
        // Test leaf1 (index 1, odd - should be right)
        let proof1 = vec![leaf0];
        assert!(verify_merkle_proof(leaf1, &proof1, 1, root), 
                "Right leaf (odd index) should verify");
    }

    #[test]
    fn test_verify_merkle_proof_larger_tree() {
        // Create an 8-leaf tree
        let leaves: Vec<[u8; 32]> = (0..8)
            .map(|i| Sha256::digest(format!("leaf{}", i).as_bytes()).into())
            .collect();
        
        let leaves_array: [_; 8] = leaves.try_into().unwrap();
        let (root, proofs) = build_test_tree(&leaves_array);
        
        // Verify all leaves
        for (i, leaf) in leaves_array.iter().enumerate() {
            let result = verify_merkle_proof(*leaf, &proofs[i], i as u8, root);
            assert!(result, "Valid proof for leaf {} in 8-leaf tree should verify", i);
        }
    }

    #[test]
    fn test_verify_merkle_proof_wrong_index() {
        // Create a 4-leaf tree
        let leaf0: [u8; 32] = Sha256::digest(b"leaf0").into();
        let leaf1: [u8; 32] = Sha256::digest(b"leaf1").into();
        let leaf2: [u8; 32] = Sha256::digest(b"leaf2").into();
        let leaf3: [u8; 32] = Sha256::digest(b"leaf3").into();
        
        let leaves = [leaf0, leaf1, leaf2, leaf3];
        let (root, proofs) = build_test_tree(&leaves);
        
        // Use proof for leaf0 but with wrong index
        let result = verify_merkle_proof(leaf0, &proofs[0], 1, root);
        assert!(!result, "Proof with wrong index should fail");
    }
}
