import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import type { ColdstartPor } from './types';
import IDL from './idl/coldstart_por.json';

// Program ID from the deployed smart contract
export const PROGRAM_ID = new PublicKey('CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh');

/**
 * Get the Anchor program instance
 */
export function getProgram(provider: AnchorProvider): Program<ColdstartPor> {
  return new Program(IDL as ColdstartPor, provider);
}

/**
 * PDA helper: NetworkConfig account
 * Seeds: ["config"]
 */
export function configPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );
}

/**
 * PDA helper: NodeState account
 * Seeds: ["node", owner_pubkey]
 */
export function nodePda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('node'), owner.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * PDA helper: VouchRecord account
 * Seeds: ["vouch", voucher_pubkey, candidate_pubkey]
 */
export function vouchPda(voucher: PublicKey, candidate: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vouch'), voucher.toBuffer(), candidate.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * PDA helper: SlashVote account
 * Seeds: ["slash_vote", candidate_pubkey]
 */
export function slashVotePda(candidate: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('slash_vote'), candidate.toBuffer()],
    PROGRAM_ID
  );
}
