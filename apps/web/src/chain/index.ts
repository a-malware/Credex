/**
 * ColdStart-PoR Blockchain Integration
 * 
 * This module provides complete blockchain integration for the ColdStart-PoR protocol.
 * 
 * @module chain
 */

// Wallet Provider
export { SolanaWalletProvider } from './wallet-provider';

// Program and PDAs
export { 
  PROGRAM_ID, 
  getProgram, 
  configPda, 
  nodePda, 
  vouchPda, 
  slashVotePda 
} from './program';

// Account Hooks
export { 
  useNetworkConfig, 
  useNodeState, 
  useVouchRecord, 
  useSlashVote 
} from './accounts';

// Instruction Functions
export {
  registerNode,
  submitTaskProof,
  vouchForNode,
  castVote,
  releaseVoucherStake,
  recordRoundOutcome,
  proposeSlash,
  voteSlash,
  executeSlash
} from './instructions';

// Merkle Tree Utilities
export {
  buildMerkleTree,
  getMerkleProof,
  verifyMerkleProof,
  fetchSolanaBlockHashes,
  generateTaskDataset,
  hexToBuffer,
  bufferToUint8Array
} from './merkle';

// Utility Functions
export {
  getExplorerUrl,
  getAccountExplorerUrl,
  formatReputation,
  bpsToDecimal,
  getPhaseLabel,
  getPhaseColor,
  shortenAddress,
  isPhase,
  calculateProbationaryScore,
  formatTimestamp,
  waitForConfirmation,
  parseTransactionError
} from './utils';

// Example Components
export * from './components';

// Types
export type { ColdstartPor } from './types';
