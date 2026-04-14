# Requirements Document

## Introduction

This document specifies the requirements for upgrading the ColdStart-PoR blockchain protocol from a B-grade to an A-grade final-year engineering project. The ColdStart-PoR protocol is a Solana-based Proof-of-Reputation blockchain implementation using the Anchor framework. The upgrade addresses three critical security vulnerabilities and adds production-ready features including blockchain integration, deployment infrastructure, and optional ML-based anomaly detection.

## Glossary

- **Protocol**: The ColdStart-PoR smart contract system implemented in Rust/Anchor
- **Phase_1**: Probationary task completion phase where candidates prove computational work
- **Phase_2**: Stake-backed vouching phase where established nodes vouch for candidates
- **Phase_3**: Graduated participation phase where candidates vote but cannot lead
- **Full_Node**: A fully graduated node with R ≥ τ_v that can lead block production and vouch for others
- **Candidate**: A node in Phase_1, Phase_2, or Phase_3 attempting to join the network
- **Voucher**: A Full_Node that stakes reputation to vouch for a Candidate
- **Merkle_Proof**: A cryptographic proof demonstrating inclusion of data in a Merkle tree
- **Committee**: A group of 3-5 Full_Nodes that collectively make slashing decisions
- **Slash_Vote**: An account recording votes from committee members to slash a misbehaving node
- **Frontend**: The React/TypeScript web application in apps/web/
- **Mobile_App**: The React Native mobile application in apps/mobile/
- **Wallet_Adapter**: Solana wallet integration library (Phantom, Solflare)
- **PDA**: Program Derived Address - deterministic Solana account addresses
- **Devnet**: Solana's development network for testing
- **Compute_Units**: Solana's measure of computational cost per instruction
- **BPS**: Basis points (1/10000) - fixed-point representation where 10000 = 1.0
- **Anomaly_Oracle**: ML-based system that detects suspicious voting patterns
- **Isolation_Forest**: Unsupervised ML algorithm for anomaly detection
- **Round_Outcome**: The verified result of a consensus round confirmed by committee

## Requirements

### Requirement 1: Merkle Proof Task Verification

**User Story:** As a protocol designer, I want Phase_1 tasks to use Merkle inclusion proofs instead of SHA256 hashcash, so that tasks represent verifiable real-world data rather than arbitrary computation.

#### Acceptance Criteria

1. THE Protocol SHALL store task_merkle_root as a 32-byte hash in NetworkConfig
2. THE Protocol SHALL store merkle_depth as a u8 value in NetworkConfig
3. WHEN submit_task_proof is called, THE Protocol SHALL accept leaf_data and proof parameters
4. WHEN a Merkle proof is submitted, THE Protocol SHALL verify the proof using verify_merkle_proof helper function
5. THE verify_merkle_proof function SHALL compute the Merkle root from leaf_data and proof
6. THE verify_merkle_proof function SHALL return true if computed root matches task_merkle_root
7. FOR ALL valid Merkle trees with depth D, THE verify_merkle_proof function SHALL accept valid proofs and reject invalid proofs (property: soundness and completeness)
8. WHEN all Phase_1 tasks are completed with valid proofs, THE Protocol SHALL advance the Candidate to Phase_2 if score ≥ θ_P

### Requirement 2: Committee-Confirmed Voting Outcomes

**User Story:** As a protocol designer, I want voting outcomes to be confirmed by a committee rather than self-reported, so that nodes cannot falsely claim honesty to inflate their reputation.

#### Acceptance Criteria

1. THE Protocol SHALL remove the honest parameter from cast_vote instruction
2. WHEN cast_vote is called, THE Protocol SHALL record the vote without updating reputation
3. THE Protocol SHALL provide a record_round_outcome instruction
4. WHEN record_round_outcome is called, THE Protocol SHALL require authority signature plus 2 Full_Node co-signers
5. WHEN record_round_outcome executes, THE Protocol SHALL update reputation for all voters based on verified outcomes
6. THE Protocol SHALL apply Eq. 4 (R(t+1) = λ · R(t) + (1−λ) · h(t)) in record_round_outcome
7. WHEN a Phase_3 node completes M honest rounds, THE Protocol SHALL graduate the node to Full status
8. FOR ALL voting sequences, THE Protocol SHALL ensure reputation updates occur only through committee-confirmed outcomes (property: no self-reported reputation inflation)

### Requirement 3: Committee-Based Slashing

**User Story:** As a protocol designer, I want slashing decisions to require 3-of-5 committee signatures instead of single authority approval, so that the protocol is decentralized and resistant to authority abuse.

#### Acceptance Criteria

1. THE Protocol SHALL define a SlashVote account type
2. THE SlashVote account SHALL store the candidate pubkey, proposer pubkey, vote count, and array of voter pubkeys
3. THE Protocol SHALL provide a propose_slash instruction callable by any Full_Node
4. WHEN propose_slash is called, THE Protocol SHALL create a SlashVote account with vote_count = 1
5. THE Protocol SHALL provide a vote_slash instruction callable by any Full_Node
6. WHEN vote_slash is called by a Full_Node not already in the voters array, THE Protocol SHALL increment vote_count
7. THE Protocol SHALL provide an execute_slash instruction
8. WHEN execute_slash is called with vote_count ≥ 3, THE Protocol SHALL ban the Candidate and slash the Voucher stake
9. WHEN execute_slash is called with vote_count < 3, THE Protocol SHALL return an error
10. THE Protocol SHALL remove the single-authority report_misbehavior instruction
11. FOR ALL slashing attempts, THE Protocol SHALL require at least 3 distinct Full_Node signatures (property: decentralized slashing)

### Requirement 4: Wallet Provider Integration

**User Story:** As a web application user, I want to connect my Solana wallet (Phantom or Solflare), so that I can interact with the Protocol using my own keys.

#### Acceptance Criteria

1. THE Frontend SHALL install @solana/wallet-adapter-react and @solana/wallet-adapter-wallets dependencies
2. THE Frontend SHALL provide a WalletProvider component in chain/wallet-provider.tsx
3. THE WalletProvider SHALL support Phantom and Solflare wallets
4. WHEN a user clicks connect wallet, THE Frontend SHALL display available wallet options
5. WHEN a wallet connection succeeds, THE Frontend SHALL display the connected wallet address
6. WHEN a wallet connection fails, THE Frontend SHALL display an error message
7. THE Frontend SHALL wrap the application root with WalletProvider

### Requirement 5: Program Singleton and PDA Helpers

**User Story:** As a frontend developer, I want a singleton Anchor program instance and PDA derivation helpers, so that I can easily interact with on-chain accounts.

#### Acceptance Criteria

1. THE Frontend SHALL provide a getProgram function in chain/program.ts
2. THE getProgram function SHALL return an Anchor Program instance connected to the Protocol
3. THE Frontend SHALL provide PDA derivation functions for config, node, vouch, and slash_vote accounts
4. WHEN deriveConfigPDA is called, THE Frontend SHALL return the PDA for ["config"]
5. WHEN deriveNodePDA is called with owner pubkey, THE Frontend SHALL return the PDA for ["node", owner]
6. WHEN deriveVouchPDA is called with voucher and candidate pubkeys, THE Frontend SHALL return the PDA for ["vouch", voucher, candidate]
7. WHEN deriveSlashVotePDA is called with candidate pubkey, THE Frontend SHALL return the PDA for ["slash_vote", candidate]
8. FOR ALL PDA derivations, THE Frontend SHALL use the correct program ID and seeds (property: PDA correctness)

### Requirement 6: On-Chain Account Fetching

**User Story:** As a frontend developer, I want React hooks to fetch on-chain account state, so that the UI displays real blockchain data instead of mock data.

#### Acceptance Criteria

1. THE Frontend SHALL provide useNetworkConfig hook in chain/accounts.ts
2. WHEN useNetworkConfig is called, THE Frontend SHALL fetch and return the NetworkConfig account
3. THE Frontend SHALL provide useNodeState hook accepting owner pubkey
4. WHEN useNodeState is called, THE Frontend SHALL fetch and return the NodeState account for the owner
5. THE Frontend SHALL provide useVouchRecord hook accepting voucher and candidate pubkeys
6. WHEN useVouchRecord is called, THE Frontend SHALL fetch and return the VouchRecord account
7. WHEN an account does not exist, THE hooks SHALL return null
8. WHEN an account fetch fails, THE hooks SHALL return an error state
9. THE hooks SHALL automatically refetch when the wallet connection changes

### Requirement 7: Instruction Execution Functions

**User Story:** As a frontend developer, I want one function per smart contract instruction, so that I can execute Protocol operations from the UI.

#### Acceptance Criteria

1. THE Frontend SHALL provide instruction functions in chain/instructions.ts
2. THE Frontend SHALL provide registerNode function
3. WHEN registerNode is called, THE Frontend SHALL execute the register_node instruction and return the transaction signature
4. THE Frontend SHALL provide submitTaskProof function accepting task_index and nonce
5. WHEN submitTaskProof is called, THE Frontend SHALL execute the submit_task_proof instruction
6. THE Frontend SHALL provide vouchForNode function accepting candidate pubkey
7. WHEN vouchForNode is called, THE Frontend SHALL execute the vouch_for_node instruction
8. THE Frontend SHALL provide castVote function accepting round and honest parameters
9. WHEN castVote is called, THE Frontend SHALL execute the cast_vote instruction
10. THE Frontend SHALL provide releaseVoucherStake function accepting candidate pubkey
11. WHEN releaseVoucherStake is called, THE Frontend SHALL execute the release_voucher_stake instruction
12. THE Frontend SHALL provide proposeSlash function accepting candidate pubkey
13. WHEN proposeSlash is called, THE Frontend SHALL execute the propose_slash instruction
14. THE Frontend SHALL provide voteSlash function accepting candidate pubkey
15. WHEN voteSlash is called, THE Frontend SHALL execute the vote_slash instruction
16. THE Frontend SHALL provide executeSlash function accepting candidate pubkey
17. WHEN executeSlash is called, THE Frontend SHALL execute the execute_slash instruction
18. WHEN any instruction execution fails, THE Frontend SHALL return a descriptive error message
19. FOR ALL instruction functions, THE Frontend SHALL wait for transaction confirmation before returning (property: confirmed execution)

### Requirement 8: Merkle Tree Generation Utilities

**User Story:** As a frontend developer, I want utilities to generate Merkle trees from Solana block hashes, so that candidates can generate valid Phase_1 task proofs.

#### Acceptance Criteria

1. THE Frontend SHALL provide generateMerkleTree function in chain/merkle.ts
2. WHEN generateMerkleTree is called with an array of block hashes, THE Frontend SHALL construct a Merkle tree
3. THE Frontend SHALL provide getMerkleProof function accepting tree and leaf_index
4. WHEN getMerkleProof is called, THE Frontend SHALL return the Merkle proof path for the leaf
5. THE Frontend SHALL provide verifyMerkleProof function accepting root, leaf, and proof
6. WHEN verifyMerkleProof is called, THE Frontend SHALL return true if proof is valid
7. THE Frontend SHALL provide fetchSolanaBlockHashes function
8. WHEN fetchSolanaBlockHashes is called, THE Frontend SHALL fetch recent Solana block hashes via RPC
9. FOR ALL generated Merkle trees, THE verifyMerkleProof function SHALL accept valid proofs and reject invalid proofs (property: round-trip verification)

### Requirement 9: UI Component Blockchain Integration

**User Story:** As a user, I want all UI components to interact with the real blockchain, so that I can perform actual Protocol operations instead of viewing mock data.

#### Acceptance Criteria

1. WHEN the dashboard loads, THE Frontend SHALL display NetworkConfig data from the blockchain
2. WHEN the node list loads, THE Frontend SHALL query and display all NodeState accounts
3. WHEN a user clicks "Register Node", THE Frontend SHALL call registerNode and display the transaction signature
4. WHEN a user submits a Phase_1 task, THE Frontend SHALL call submitTaskProof with a valid Merkle proof
5. WHEN a user vouches for a node, THE Frontend SHALL call vouchForNode and update the UI after confirmation
6. WHEN a user casts a vote, THE Frontend SHALL call castVote and display the updated reputation
7. WHEN a user releases voucher stake, THE Frontend SHALL call releaseVoucherStake and update the voucher's reputation display
8. WHEN any transaction completes, THE Frontend SHALL display a Solana Explorer link to the transaction
9. THE Frontend SHALL remove all mock data generators and hardcoded test data

### Requirement 10: Vouch Component Phase-2 Integration

**User Story:** As a user viewing the vouch interface, I want to see only Phase_2 nodes as vouch candidates, so that I can vouch for nodes that have completed Phase_1.

#### Acceptance Criteria

1. WHEN the vouch component loads, THE Frontend SHALL query all NodeState accounts with phase = Phase2
2. THE Frontend SHALL display only Phase_2 nodes in the vouch candidate list
3. WHEN a node advances from Phase_1 to Phase_2, THE Frontend SHALL include it in the vouch candidate list
4. WHEN a node is vouched and advances to Phase_3, THE Frontend SHALL remove it from the vouch candidate list
5. THE Frontend SHALL display each candidate's tasks_passed and probationary score

### Requirement 11: Devnet Deployment Configuration

**User Story:** As a developer, I want to deploy the Protocol to Solana devnet, so that I can test with real blockchain infrastructure.

#### Acceptance Criteria

1. THE Anchor.toml file SHALL specify devnet cluster configuration
2. THE Anchor.toml file SHALL specify the devnet program ID
3. WHEN anchor build is executed, THE Protocol SHALL compile successfully
4. WHEN anchor deploy --provider.cluster devnet is executed, THE Protocol SHALL deploy to devnet
5. WHEN deployment completes, THE system SHALL output the deployed program address
6. THE Frontend SHALL configure connection to devnet RPC endpoint

### Requirement 12: Devnet Test Execution

**User Story:** As a developer, I want to run the test suite against devnet, so that I can verify Protocol behavior on a real blockchain.

#### Acceptance Criteria

1. THE test suite SHALL configure Anchor provider for devnet
2. WHEN tests are executed against devnet, THE test suite SHALL use real transaction confirmations
3. WHEN tests are executed against devnet, THE test suite SHALL verify on-chain account state
4. THE test suite SHALL test the complete node lifecycle: register → Phase_1 → Phase_2 → vouch → Phase_3 → graduate
5. THE test suite SHALL test committee-based slashing with 3 co-signers
6. WHEN all tests pass, THE test suite SHALL output success confirmation

### Requirement 13: Performance Benchmarking

**User Story:** As a researcher, I want documented performance metrics for all Protocol instructions, so that I can include empirical data in the academic paper.

#### Acceptance Criteria

1. THE benchmarking script SHALL measure compute units for each instruction
2. THE benchmarking script SHALL measure transaction confirmation times for each instruction
3. THE benchmarking script SHALL measure account rent costs for NetworkConfig, NodeState, VouchRecord, and SlashVote
4. THE benchmarking script SHALL execute each instruction 10 times and compute mean and standard deviation
5. THE benchmarking script SHALL output results in markdown table format
6. THE benchmarking results SHALL include: instruction name, mean compute units, std dev, mean confirmation time (ms), account rent (SOL)

### Requirement 14: Multi-Node Simulation

**User Story:** As a researcher, I want a simulation script that runs 10 nodes through the complete Protocol lifecycle, so that I can demonstrate scalability and measure aggregate performance.

#### Acceptance Criteria

1. THE simulation script SHALL create 10 candidate nodes
2. THE simulation script SHALL execute Phase_1 for all 10 nodes with valid Merkle proofs
3. THE simulation script SHALL create 3 genesis Full_Nodes as vouchers
4. THE simulation script SHALL vouch for all 10 candidates
5. THE simulation script SHALL execute 10 consensus rounds with all nodes voting
6. THE simulation script SHALL graduate all 10 nodes to Full status
7. THE simulation script SHALL measure total execution time
8. THE simulation script SHALL measure total transaction fees
9. THE simulation script SHALL output a summary report with node count, total time, total fees, and average time per node

### Requirement 15: Web Application Deployment

**User Story:** As a user, I want to access the Frontend via a public URL, so that I can interact with the Protocol without running a local development server.

#### Acceptance Criteria

1. THE Frontend SHALL be deployed to Vercel
2. WHEN a user visits the deployment URL, THE Frontend SHALL load successfully
3. THE deployed Frontend SHALL connect to Solana devnet
4. THE deployed Frontend SHALL support wallet connections
5. THE deployed Frontend SHALL execute all Protocol instructions
6. WHEN the main branch is updated, THE Frontend SHALL automatically redeploy

### Requirement 16: Academic Paper Benchmark Updates

**User Story:** As a researcher, I want the academic paper updated with real devnet benchmarks, so that the paper presents empirical data instead of simulations.

#### Acceptance Criteria

1. THE paper SHALL replace simulated performance data with devnet benchmark results
2. THE paper SHALL include a table of compute units per instruction
3. THE paper SHALL include a table of transaction confirmation times
4. THE paper SHALL include account rent costs
5. THE paper SHALL include multi-node simulation results (10 nodes)
6. THE paper SHALL cite the deployed devnet program address
7. THE paper SHALL cite the deployed Frontend URL

### Requirement 17: Anomaly Detection Feature Extraction

**User Story:** As an ML engineer, I want to extract voting behavior features from on-chain events, so that the Anomaly_Oracle can detect suspicious patterns.

#### Acceptance Criteria

1. THE Anomaly_Oracle SHALL extract alignment_rate feature (fraction of votes matching consensus)
2. THE Anomaly_Oracle SHALL extract reputation_delta feature (change in reputation over last N rounds)
3. THE Anomaly_Oracle SHALL extract join_recency feature (number of rounds since Phase_3 entry)
4. THE Anomaly_Oracle SHALL extract vote_frequency feature (votes per round)
5. WHEN a VoteCast event is received, THE Anomaly_Oracle SHALL update the feature vector for the voting node
6. THE Anomaly_Oracle SHALL maintain a sliding window of the last 50 rounds for feature computation

### Requirement 18: Isolation Forest Anomaly Detection

**User Story:** As an ML engineer, I want to train an Isolation Forest model on voting features, so that the Anomaly_Oracle can identify outlier nodes.

#### Acceptance Criteria

1. THE Anomaly_Oracle SHALL use scikit-learn IsolationForest implementation
2. THE Anomaly_Oracle SHALL train the model on historical voting data
3. WHEN a new feature vector is computed, THE Anomaly_Oracle SHALL predict anomaly score
4. WHEN anomaly score exceeds threshold (e.g., -0.5), THE Anomaly_Oracle SHALL flag the node as suspicious
5. THE Anomaly_Oracle SHALL retrain the model every 100 rounds
6. THE Anomaly_Oracle SHALL log all anomaly detections with node pubkey, score, and timestamp

### Requirement 19: WebSocket Event Listener

**User Story:** As an ML engineer, I want the Anomaly_Oracle to listen for on-chain VoteCast events in real-time, so that anomaly detection runs continuously.

#### Acceptance Criteria

1. THE Anomaly_Oracle SHALL connect to Solana devnet via WebSocket
2. THE Anomaly_Oracle SHALL subscribe to VoteCast events from the Protocol program
3. WHEN a VoteCast event is received, THE Anomaly_Oracle SHALL parse the event data
4. WHEN a VoteCast event is received, THE Anomaly_Oracle SHALL update feature vectors
5. WHEN a VoteCast event is received, THE Anomaly_Oracle SHALL run anomaly detection
6. WHEN the WebSocket connection drops, THE Anomaly_Oracle SHALL automatically reconnect

### Requirement 20: Automatic Slash Proposal

**User Story:** As an ML engineer, I want the Anomaly_Oracle to automatically call propose_slash for detected anomalies, so that suspicious nodes are flagged for committee review.

#### Acceptance Criteria

1. WHEN the Anomaly_Oracle detects an anomaly, THE Anomaly_Oracle SHALL call proposeSlash with the flagged node's pubkey
2. THE Anomaly_Oracle SHALL sign the propose_slash transaction with its own keypair
3. WHEN propose_slash succeeds, THE Anomaly_Oracle SHALL log the transaction signature
4. WHEN propose_slash fails, THE Anomaly_Oracle SHALL log the error and retry after 10 seconds
5. THE Anomaly_Oracle SHALL not propose slash for the same node more than once per 50 rounds
6. THE Anomaly_Oracle SHALL maintain a cooldown list of recently flagged nodes

### Requirement 21: Backward Compatibility with Test Suite

**User Story:** As a developer, I want all Protocol changes to maintain backward compatibility with the existing test suite structure, so that I can verify correctness without rewriting tests.

#### Acceptance Criteria

1. WHEN the test suite is executed, THE Protocol SHALL pass all existing test cases
2. THE Protocol SHALL maintain the same account structure for NetworkConfig (with added fields)
3. THE Protocol SHALL maintain the same account structure for NodeState (unchanged)
4. THE Protocol SHALL maintain the same PDA derivation seeds for config, node, and vouch accounts
5. THE Protocol SHALL maintain the same event emission structure (with added events for new instructions)
6. WHEN new instructions are added, THE test suite SHALL include new test cases without modifying existing ones

### Requirement 22: Fixed-Point Arithmetic Preservation

**User Story:** As a developer, I want all reputation calculations to continue using BPS fixed-point arithmetic, so that the Protocol maintains precision and consistency.

#### Acceptance Criteria

1. THE Protocol SHALL represent all reputation values as u64 in range [0, 10000]
2. THE Protocol SHALL use bps_mul helper function for all reputation multiplications
3. WHEN reputation is updated via Eq. 4, THE Protocol SHALL use BPS arithmetic
4. WHEN voucher stake is calculated via Eq. 2, THE Protocol SHALL use BPS arithmetic
5. WHEN candidate initial reputation is calculated via Eq. 3, THE Protocol SHALL use BPS arithmetic
6. FOR ALL reputation calculations, THE Protocol SHALL ensure results remain in range [0, 10000] (property: bounded reputation)
