# Implementation Tasks

## Phase 1: Smart Contract Protocol Fixes

### 1. Merkle Proof Task Verification

- [x] 1.1 Add Merkle fields to NetworkConfig
  - [x] 1.1.1 Add `task_merkle_root: [u8; 32]` field to NetworkConfig struct
  - [x] 1.1.2 Add `merkle_depth: u8` field to NetworkConfig struct
  - [x] 1.1.3 Update NetworkConfig::LEN constant to include new fields
  - [x] 1.1.4 Update initialize_network instruction to accept merkle_root and merkle_depth parameters

- [x] 1.2 Implement verify_merkle_proof helper function
  - [x] 1.2.1 Create verify_merkle_proof function with signature: `fn verify_merkle_proof(leaf_hash: [u8; 32], proof: &[[u8; 32]], leaf_index: u8, root: [u8; 32]) -> bool`
  - [x] 1.2.2 Implement bottom-up Merkle path verification logic
  - [x] 1.2.3 Handle left/right sibling ordering based on index parity
  - [x] 1.2.4 Add unit tests for valid and invalid proofs

- [x] 1.3 Modify submit_task_proof instruction
  - [x] 1.3.1 Change signature from `(task_index, nonce)` to `(task_index, leaf_data: [u8; 32], proof: Vec<[u8; 32]>)`
  - [x] 1.3.2 Remove SHA256 hashcash verification logic
  - [x] 1.3.3 Add Merkle proof verification using verify_merkle_proof
  - [x] 1.3.4 Compute leaf_hash = SHA256(leaf_data)
  - [x] 1.3.5 Update TaskSubmitted event to reflect Merkle verification

### 2. Committee-Confirmed Voting Outcomes

- [x] 2.1 Modify cast_vote instruction
  - [x] 2.1.1 Remove `honest: bool` parameter from cast_vote signature
  - [x] 2.1.2 Remove reputation update logic (Eq. 4) from cast_vote
  - [x] 2.1.3 Remove honest_rounds increment logic from cast_vote
  - [x] 2.1.4 Keep only vote recording (last_voted_round update)
  - [x] 2.1.5 Update VoteCast event to remove honest field

- [x] 2.2 Create record_round_outcome instruction
  - [x] 2.2.1 Define RecordRoundOutcome account context with authority + 2 cosigners
  - [x] 2.2.2 Add constraint checks: cosigner_1 and cosigner_2 must be Full phase
  - [x] 2.2.3 Add constraint: round < current_round (can't record current round)
  - [x] 2.2.4 Add constraint: target_node.last_voted_round == round
  - [x] 2.2.5 Implement reputation update using Eq. 4: R(t+1) = λ·R(t) + (1−λ)·h(t)
  - [x] 2.2.6 Implement honest_rounds increment for Phase 3 nodes
  - [x] 2.2.7 Implement graduation logic (Phase 3 → Full after M rounds)
  - [x] 2.2.8 Add RoundOutcomeRecorded event

### 3. Committee-Based Slashing

- [x] 3.1 Create SlashVote account structure
  - [x] 3.1.1 Define SlashVote struct with candidate, votes, voter_1/2/3, active, bump fields
  - [x] 3.1.2 Calculate and set SlashVote::LEN constant
  - [x] 3.1.3 Define PDA seeds: ["slash_vote", candidate]

- [x] 3.2 Implement propose_slash instruction
  - [x] 3.2.1 Define ProposeSlash account context
  - [x] 3.2.2 Add constraint: proposer must be Full phase
  - [x] 3.2.3 Initialize SlashVote account with votes = 1, voter_1 = proposer
  - [x] 3.2.4 Add SlashProposed event

- [x] 3.3 Implement vote_slash instruction
  - [x] 3.3.1 Define VoteSlash account context
  - [x] 3.3.2 Add constraint: voter must be Full phase
  - [x] 3.3.3 Add constraint: voter not already in voter_1/2/3 array
  - [x] 3.3.4 Increment votes and add voter to array
  - [x] 3.3.5 Add SlashVoteAdded event

- [x] 3.4 Implement execute_slash instruction
  - [x] 3.4.1 Define ExecuteSlash account context
  - [x] 3.4.2 Add constraint: slash_vote.votes >= 3
  - [x] 3.4.3 Ban candidate (phase = Banned, reputation = 0)
  - [x] 3.4.4 Slash voucher stake (set vouch_record.active = false)
  - [x] 3.4.5 Add SlashExecuted event

- [x] 3.5 Remove report_misbehavior instruction
  - [x] 3.5.1 Delete ReportMisbehavior account context
  - [x] 3.5.2 Delete report_misbehavior function
  - [x] 3.5.3 Update tests to use new slashing flow

### 4. Smart Contract Testing

- [x] 4.1 Update existing tests for modified instructions
  - [x] 4.1.1 Update submit_task_proof tests to use Merkle proofs
  - [x] 4.1.2 Update cast_vote tests to remove honest parameter
  - [x] 4.1.3 Update test helper functions for new signatures

- [ ] 4.2 Add tests for committee voting
  - [~] 4.2.1 Test record_round_outcome with valid committee
  - [~] 4.2.2 Test record_round_outcome rejects non-Full cosigners
  - [~] 4.2.3 Test reputation update via Eq. 4
  - [~] 4.2.4 Test Phase 3 graduation after M honest rounds

- [ ] 4.3 Add tests for committee slashing
  - [~] 4.3.1 Test propose_slash creates SlashVote with votes = 1
  - [~] 4.3.2 Test vote_slash increments vote count
  - [~] 4.3.3 Test vote_slash rejects duplicate voters
  - [~] 4.3.4 Test execute_slash with votes < 3 fails
  - [~] 4.3.5 Test execute_slash with votes >= 3 succeeds

- [ ] 4.4 Add edge case tests
  - [~] 4.4.1 Test invalid Merkle proof rejection
  - [~] 4.4.2 Test valid proof for wrong task index rejection
  - [~] 4.4.3 Test double voting in same round rejection
  - [~] 4.4.4 Test Phase 2 node cannot cast_vote

## Phase 2: Frontend Integration

### 5. Wallet Adapter Integration

- [x] 5.1 Install dependencies
  - [x] 5.1.1 Install @solana/wallet-adapter-react
  - [x] 5.1.2 Install @solana/wallet-adapter-react-ui
  - [x] 5.1.3 Install @solana/wallet-adapter-wallets
  - [x] 5.1.4 Install @solana/web3.js
  - [x] 5.1.5 Install @coral-xyz/anchor@^0.32.1

- [x] 5.2 Create wallet provider component
  - [x] 5.2.1 Create apps/web/src/chain/wallet-provider.tsx
  - [x] 5.2.2 Configure ConnectionProvider with devnet endpoint
  - [x] 5.2.3 Configure WalletProvider with Phantom and Solflare adapters
  - [x] 5.2.4 Add WalletModalProvider wrapper
  - [x] 5.2.5 Wrap app root with SolanaWalletProvider in layout

### 6. Anchor Program Setup

- [x] 6.1 Create program singleton
  - [x] 6.1.1 Create apps/web/src/chain/program.ts
  - [x] 6.1.2 Export PROGRAM_ID constant
  - [x] 6.1.3 Implement getProgram(provider) function
  - [x] 6.1.4 Copy IDL from target/idl/coldstart_por.json to apps/web/src/chain/idl/

- [x] 6.2 Create PDA helper functions
  - [x] 6.2.1 Implement configPda(): [PublicKey, number]
  - [x] 6.2.2 Implement nodePda(owner: PublicKey): [PublicKey, number]
  - [x] 6.2.3 Implement vouchPda(voucher, candidate): [PublicKey, number]
  - [x] 6.2.4 Implement slashVotePda(candidate): [PublicKey, number]

### 7. Account Fetching Hooks

- [x] 7.1 Create account hooks file
  - [x] 7.1.1 Create apps/web/src/chain/accounts.ts

- [x] 7.2 Implement useNetworkConfig hook
  - [x] 7.2.1 Fetch NetworkConfig account from configPda
  - [x] 7.2.2 Return loading, error, and data states
  - [x] 7.2.3 Refetch on connection change

- [x] 7.3 Implement useNodeState hook
  - [x] 7.3.1 Accept owner PublicKey parameter
  - [x] 7.3.2 Fetch NodeState account from nodePda(owner)
  - [x] 7.3.3 Return null if account doesn't exist
  - [x] 7.3.4 Return loading, error, and data states

- [x] 7.4 Implement useVouchRecord hook
  - [x] 7.4.1 Accept voucher and candidate PublicKey parameters
  - [x] 7.4.2 Fetch VouchRecord account from vouchPda
  - [x] 7.4.3 Return loading, error, and data states

- [x] 7.5 Implement useSlashVote hook
  - [x] 7.5.1 Accept candidate PublicKey parameter
  - [x] 7.5.2 Fetch SlashVote account from slashVotePda
  - [x] 7.5.3 Return loading, error, and data states

### 8. Instruction Execution Wrappers

- [x] 8.1 Create instructions file
  - [x] 8.1.1 Create apps/web/src/chain/instructions.ts

- [x] 8.2 Implement node lifecycle instructions
  - [x] 8.2.1 Implement registerNode(provider): Promise<string>
  - [x] 8.2.2 Implement submitTaskProof(provider, taskIndex, leafData, proof): Promise<string>
  - [x] 8.2.3 Implement vouchForNode(provider, candidatePubkey): Promise<string>
  - [x] 8.2.4 Implement castVote(provider, round): Promise<string>
  - [x] 8.2.5 Implement releaseVoucherStake(provider, candidatePubkey): Promise<string>

- [x] 8.3 Implement committee instructions
  - [x] 8.3.1 Implement recordRoundOutcome(provider, cosigner1, cosigner2, round, wasHonest): Promise<string>
  - [x] 8.3.2 Implement proposeSlash(provider, candidatePubkey): Promise<string>
  - [x] 8.3.3 Implement voteSlash(provider, candidatePubkey): Promise<string>
  - [x] 8.3.4 Implement executeSlash(provider, candidatePubkey): Promise<string>

### 9. Merkle Tree Utilities

- [x] 9.1 Create merkle utilities file
  - [x] 9.1.1 Create apps/web/src/chain/merkle.ts

- [x] 9.2 Implement tree generation
  - [x] 9.2.1 Implement buildMerkleTree(leaves: Buffer[]): {root, depth}
  - [x] 9.2.2 Pad leaves to power of 2
  - [x] 9.2.3 Build tree bottom-up with SHA256 hashing

- [x] 9.3 Implement proof generation
  - [x] 9.3.1 Implement getMerkleProof(leaves, index): Buffer[]
  - [x] 9.3.2 Collect sibling hashes from leaf to root

- [x] 9.4 Implement proof verification
  - [x] 9.4.1 Implement verifyMerkleProof(root, leaf, proof): boolean
  - [x] 9.4.2 Test round-trip: verify(root, leaf, getProof(tree, leaf)) === true

- [x] 9.5 Implement Solana block hash fetching
  - [x] 9.5.1 Implement fetchSolanaBlockHashes(connection, count): Promise<Buffer[]>
  - [x] 9.5.2 Fetch recent block hashes from mainnet

### 10. UI Component Integration

- [x] 10.1 Wire dashboard component
  - [x] 10.1.1 Use useNetworkConfig to display protocol parameters
  - [x] 10.1.2 Display current_round, total_nodes
  - [x] 10.1.3 Remove mock data

- [x] 10.2 Wire node list component
  - [x] 10.2.1 Query all NodeState accounts via getProgramAccounts
  - [x] 10.2.2 Display phase, reputation, tasks_completed for each node
  - [x] 10.2.3 Remove mock data

- [x] 10.3 Wire register node button
  - [x] 10.3.1 Call registerNode on button click
  - [x] 10.3.2 Display transaction signature
  - [x] 10.3.3 Add Solana Explorer link
  - [x] 10.3.4 Show loading state during transaction

- [x] 10.4 Wire task submission
  - [x] 10.4.1 Generate Merkle tree from Solana block hashes
  - [x] 10.4.2 Get proof for task index
  - [x] 10.4.3 Call submitTaskProof with leaf_data and proof
  - [x] 10.4.4 Update UI after confirmation

- [x] 10.5 Wire vouch interface
  - [x] 10.5.1 Query Phase 2 nodes only
  - [x] 10.5.2 Display candidate tasks_passed and probationary score
  - [x] 10.5.3 Call vouchForNode on button click
  - [x] 10.5.4 Remove hardcoded ELIGIBLE_USERS array

- [x] 10.6 Wire vote casting
  - [x] 10.6.1 Call castVote with current round
  - [x] 10.6.2 Display updated reputation after confirmation
  - [x] 10.6.3 Add Explorer link

- [x] 10.7 Wire stake release
  - [x] 10.7.1 Call releaseVoucherStake when candidate graduates
  - [x] 10.7.2 Update voucher reputation display
  - [x] 10.7.3 Add Explorer link

- [x] 10.8 Add transaction Explorer links
  - [x] 10.8.1 Create helper function to generate Explorer URL
  - [x] 10.8.2 Add links to all transaction confirmations
  - [x] 10.8.3 Use devnet cluster parameter

## Phase 3: Deployment & Benchmarking

### 11. Devnet Deployment

- [x] 11.1 Configure Anchor for devnet
  - [x] 11.1.1 Update Anchor.toml cluster to "Devnet"
  - [x] 11.1.2 Set devnet program ID in Anchor.toml
  - [x] 11.1.3 Configure wallet path

- [x] 11.2 Deploy smart contract
  - [x] 11.2.1 Run `solana config set --url devnet`
  - [x] 11.2.2 Run `solana airdrop 2`
  - [x] 11.2.3 Run `anchor build`
  - [x] 11.2.4 Run `anchor deploy --provider.cluster devnet`
  - [x] 11.2.5 Verify deployed program ID matches Anchor.toml

- [x] 11.3 Configure frontend for devnet
  - [x] 11.3.1 Set VITE_SOLANA_CLUSTER=devnet in apps/web/.env
  - [x] 11.3.2 Update PROGRAM_ID in program.ts if changed
  - [x] 11.3.3 Copy updated IDL to apps/web/src/chain/idl/

### 12. Devnet Testing

- [x] 12.1 Run test suite against devnet
  - [x] 12.1.1 Run `anchor test --skip-local-validator --provider.cluster devnet`
  - [x] 12.1.2 Verify all tests pass
  - [x] 12.1.3 Fix any devnet-specific issues

- [x] 12.2 Manual frontend testing
  - [x] 12.2.1 Connect Phantom wallet to devnet
  - [x] 12.2.2 Test register node flow
  - [x] 12.2.3 Test task submission with Merkle proofs
  - [x] 12.2.4 Test vouching flow
  - [x] 12.2.5 Test voting flow
  - [x] 12.2.6 Verify all Explorer links work

### 13. Performance Benchmarking

- [x] 13.1 Create benchmarking script
  - [x] 13.1.1 Create scripts/benchmark.ts
  - [x] 13.1.2 Measure compute units per instruction
  - [x] 13.1.3 Measure transaction confirmation times
  - [x] 13.1.4 Measure account rent costs

- [ ] 13.2 Run benchmarks
  - [~] 13.2.1 Execute each instruction 10 times
  - [~] 13.2.2 Compute mean and standard deviation
  - [~] 13.2.3 Parse compute units from transaction logs

- [x] 13.3 Document results
  - [x] 13.3.1 Create docs/benchmarks.md
  - [x] 13.3.2 Create markdown table with results
  - [x] 13.3.3 Include: instruction name, mean CU, std dev, mean time (ms), rent (SOL)

### 14. Multi-Node Simulation

- [x] 14.1 Create simulation script
  - [x] 14.1.1 Create scripts/simulate-network.ts
  - [x] 14.1.2 Generate 10 candidate keypairs
  - [x] 14.1.3 Airdrop SOL to all candidates

- [ ] 14.2 Implement simulation flow
  - [~] 14.2.1 Register all 10 nodes
  - [~] 14.2.2 Complete Phase 1 tasks for all nodes
  - [~] 14.2.3 Create 3 genesis Full nodes as vouchers
  - [~] 14.2.4 Vouch for all 10 candidates
  - [~] 14.2.5 Execute 10 consensus rounds with all nodes voting
  - [~] 14.2.6 Graduate all nodes to Full status

- [ ] 14.3 Measure and report
  - [~] 14.3.1 Measure total execution time
  - [~] 14.3.2 Measure total transaction fees
  - [~] 14.3.3 Output summary report
  - [~] 14.3.4 Include: node count, total time, total fees, avg time per node

### 15. Web Application Deployment

- [x] 15.1 Configure Vercel deployment
  - [x] 15.1.1 Create vercel.json with build configuration
  - [x] 15.1.2 Set VITE_SOLANA_CLUSTER=devnet environment variable
  - [x] 15.1.3 Configure build command and output directory

- [x] 15.2 Deploy to Vercel
  - [x] 15.2.1 Run `npx vercel --prod`
  - [x] 15.2.2 Verify deployment succeeds
  - [x] 15.2.3 Test deployed app with wallet connection
  - [x] 15.2.4 Verify all features work on deployed version

- [x] 15.3 Configure auto-deployment
  - [x] 15.3.1 Connect GitHub repository to Vercel
  - [x] 15.3.2 Configure auto-deploy on main branch push
  - [x] 15.3.3 Test auto-deployment with a commit

### 16. Academic Paper Updates

- [ ] 16.1 Update simulation section
  - [~] 16.1.1 Replace simulated data with devnet multi-node results
  - [~] 16.1.2 Update Section V-A with real node counts and timing

- [ ] 16.2 Update performance figures
  - [~] 16.2.1 Replace Fig. 3 with devnet benchmark table
  - [~] 16.2.2 Update caption to reference devnet measurements

- [ ] 16.3 Update protocol description
  - [~] 16.3.1 Update Section III-B to describe Merkle inclusion proofs
  - [~] 16.3.2 Update Section III-D to describe committee voting

- [ ] 16.4 Add deployment references
  - [~] 16.4.1 Add devnet program address to paper
  - [~] 16.4.2 Add deployed frontend URL to paper
  - [~] 16.4.3 Add screenshot of live UI as Fig. 4

## Phase 4: ML Oracle (Optional)

### 17. Feature Extraction

- [ ] 17.1 Setup Python environment
  - [ ] 17.1.1 Create scripts/ml-oracle/ directory
  - [ ] 17.1.2 Create requirements.txt with scikit-learn, solana-py, numpy
  - [ ] 17.1.3 Create virtual environment and install dependencies

- [ ] 17.2 Implement feature extractor
  - [ ] 17.2.1 Create scripts/ml-oracle/detector.py
  - [ ] 17.2.2 Define VotingAnomalyDetector class
  - [ ] 17.2.3 Implement extract_features method
  - [ ] 17.2.4 Extract alignment_rate (fraction matching consensus)
  - [ ] 17.2.5 Extract reputation_delta (change over last N rounds)
  - [ ] 17.2.6 Extract join_recency (rounds since Phase 3 entry)
  - [ ] 17.2.7 Extract vote_frequency (votes per round)

- [ ] 17.3 Implement vote history tracking
  - [ ] 17.3.1 Implement record_vote method
  - [ ] 17.3.2 Maintain sliding window of last 50 rounds
  - [ ] 17.3.3 Store node pubkey, round, reputation, alignment per vote

### 18. Isolation Forest Integration

- [ ] 18.1 Implement model training
  - [ ] 18.1.1 Import IsolationForest from sklearn
  - [ ] 18.1.2 Initialize with contamination=0.05
  - [ ] 18.1.3 Implement fit method on historical voting data
  - [ ] 18.1.4 Retrain every 100 rounds

- [ ] 18.2 Implement anomaly detection
  - [ ] 18.2.1 Implement is_anomalous method
  - [ ] 18.2.2 Predict anomaly score for feature vector
  - [ ] 18.2.3 Use threshold of -0.5 for flagging
  - [ ] 18.2.4 Return boolean: anomalous or not

- [ ] 18.3 Add logging
  - [ ] 18.3.1 Log all anomaly detections with node pubkey, score, timestamp
  - [ ] 18.3.2 Log model retraining events

### 19. WebSocket Event Listener

- [ ] 19.1 Implement WebSocket connection
  - [ ] 19.1.1 Create scripts/ml-oracle/chain_listener.py
  - [ ] 19.1.2 Connect to wss://api.devnet.solana.com
  - [ ] 19.1.3 Subscribe to logs mentioning program ID

- [ ] 19.2 Implement event parsing
  - [ ] 19.2.1 Parse VoteCast events from transaction logs
  - [ ] 19.2.2 Extract node pubkey, round, reputation from event
  - [ ] 19.2.3 Determine alignment with consensus majority

- [ ] 19.3 Implement reconnection logic
  - [ ] 19.3.1 Detect WebSocket disconnection
  - [ ] 19.3.2 Automatically reconnect after 5 seconds
  - [ ] 19.3.3 Log reconnection attempts

- [ ] 19.4 Wire to feature extractor
  - [ ] 19.4.1 Call detector.record_vote on each VoteCast event
  - [ ] 19.4.2 Run anomaly detection after each vote
  - [ ] 19.4.3 Trigger slash proposal if anomaly detected

### 20. Automatic Slash Proposal

- [ ] 20.1 Implement slash proposer
  - [ ] 20.1.1 Create scripts/ml-oracle/oracle.py
  - [ ] 20.1.2 Load oracle keypair for signing transactions
  - [ ] 20.1.3 Implement propose_slash call using solana-py

- [ ] 20.2 Implement cooldown logic
  - [ ] 20.2.1 Maintain cooldown list of recently flagged nodes
  - [ ] 20.2.2 Prevent proposing slash for same node within 50 rounds
  - [ ] 20.2.3 Remove nodes from cooldown after 50 rounds

- [ ] 20.3 Implement error handling
  - [ ] 20.3.1 Log successful slash proposals with transaction signature
  - [ ] 20.3.2 Log failed proposals with error message
  - [ ] 20.3.3 Retry failed proposals after 10 seconds

- [ ] 20.4 Create main loop
  - [ ] 20.4.1 Initialize detector and WebSocket listener
  - [ ] 20.4.2 Run event loop continuously
  - [ ] 20.4.3 Handle graceful shutdown on SIGINT

- [ ] 20.5 Test with simulated bad node
  - [ ] 20.5.1 Create test node that votes dishonestly
  - [ ] 20.5.2 Verify oracle detects anomaly
  - [ ] 20.5.3 Verify oracle proposes slash
  - [ ] 20.5.4 Verify SlashVote account created on-chain
