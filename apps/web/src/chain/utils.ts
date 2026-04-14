import { PublicKey } from '@solana/web3.js';

/**
 * Generate Solana Explorer URL for a transaction
 */
export function getExplorerUrl(
  signature: string,
  cluster: 'devnet' | 'mainnet-beta' | 'testnet' = 'devnet'
): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

/**
 * Generate Solana Explorer URL for an account
 */
export function getAccountExplorerUrl(
  address: string | PublicKey,
  cluster: 'devnet' | 'mainnet-beta' | 'testnet' = 'devnet'
): string {
  const addressStr = typeof address === 'string' ? address : address.toString();
  return `https://explorer.solana.com/address/${addressStr}?cluster=${cluster}`;
}

/**
 * Format reputation BPS to percentage string
 */
export function formatReputation(reputationBps: number | bigint): string {
  const bps = typeof reputationBps === 'bigint' ? Number(reputationBps) : reputationBps;
  return `${(bps / 100).toFixed(2)}%`;
}

/**
 * Format BPS to decimal (0-1 range)
 */
export function bpsToDecimal(bps: number | bigint): number {
  const value = typeof bps === 'bigint' ? Number(bps) : bps;
  return value / 10000;
}

/**
 * Get human-readable phase name
 */
export function getPhaseLabel(phase: any): string {
  if ('phase1' in phase) return 'Phase 1: Probationary Tasks';
  if ('phase2' in phase) return 'Phase 2: Awaiting Vouch';
  if ('phase3' in phase) return 'Phase 3: Graduated Participation';
  if ('full' in phase) return 'Full Node';
  if ('banned' in phase) return 'Banned';
  return 'Unknown';
}

/**
 * Get phase color for UI
 */
export function getPhaseColor(phase: any): string {
  if ('phase1' in phase) return 'blue';
  if ('phase2' in phase) return 'yellow';
  if ('phase3' in phase) return 'purple';
  if ('full' in phase) return 'green';
  if ('banned' in phase) return 'red';
  return 'gray';
}

/**
 * Shorten public key for display
 */
export function shortenAddress(address: string | PublicKey, chars = 4): string {
  const addressStr = typeof address === 'string' ? address : address.toString();
  return `${addressStr.slice(0, chars)}...${addressStr.slice(-chars)}`;
}

/**
 * Check if a node is in a specific phase
 */
export function isPhase(phase: any, targetPhase: 'phase1' | 'phase2' | 'phase3' | 'full' | 'banned'): boolean {
  return targetPhase in phase;
}

/**
 * Calculate probationary score (tasks_passed / n_tasks)
 */
export function calculateProbationaryScore(tasksPassed: number, nTasks: number): number {
  return (tasksPassed / nTasks) * 10000; // Return as BPS
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp: number | bigint): string {
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleString();
}

/**
 * Wait for transaction confirmation with timeout
 */
export async function waitForConfirmation(
  connection: any,
  signature: string,
  timeoutMs: number = 30000
): Promise<boolean> {
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    try {
      const status = await connection.getSignatureStatus(signature);
      if (status?.value?.confirmationStatus === 'confirmed' || 
          status?.value?.confirmationStatus === 'finalized') {
        return true;
      }
    } catch (err) {
      console.warn('Error checking confirmation:', err);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}

/**
 * Parse error message from transaction
 */
export function parseTransactionError(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.toString) return error.toString();
  return 'Unknown error occurred';
}
