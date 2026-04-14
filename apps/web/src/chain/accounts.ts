import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import { getProgram, configPda, nodePda, vouchPda, slashVotePda } from './program';

/**
 * Hook to fetch NetworkConfig account
 */
export function useNetworkConfig() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create a dummy wallet for read-only operations
        const provider = new AnchorProvider(
          connection,
          wallet as any,
          { commitment: 'confirmed' }
        );
        
        const program = getProgram(provider);
        const [pda] = configPda();
        
        const config = await program.account.networkConfig.fetch(pda);
        setData(config);
      } catch (err) {
        setError(err as Error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [connection, wallet]);

  return { data, loading, error };
}

/**
 * Hook to fetch NodeState account for a given owner
 */
export function useNodeState(owner?: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!owner) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchNodeState = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const provider = new AnchorProvider(
          connection,
          wallet as any,
          { commitment: 'confirmed' }
        );
        
        const program = getProgram(provider);
        const [pda] = nodePda(owner);
        
        const nodeState = await program.account.nodeState.fetch(pda);
        setData(nodeState);
      } catch (err) {
        // Account doesn't exist - this is normal for unregistered nodes
        setData(null);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchNodeState();
  }, [owner, connection, wallet]);

  return { data, loading, error };
}

/**
 * Hook to fetch VouchRecord account
 */
export function useVouchRecord(voucher?: PublicKey, candidate?: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!voucher || !candidate) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchVouchRecord = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const provider = new AnchorProvider(
          connection,
          wallet as any,
          { commitment: 'confirmed' }
        );
        
        const program = getProgram(provider);
        const [pda] = vouchPda(voucher, candidate);
        
        const vouchRecord = await program.account.vouchRecord.fetch(pda);
        setData(vouchRecord);
      } catch (err) {
        setData(null);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVouchRecord();
  }, [voucher, candidate, connection, wallet]);

  return { data, loading, error };
}

/**
 * Hook to fetch SlashVote account
 */
export function useSlashVote(candidate?: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!candidate) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchSlashVote = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const provider = new AnchorProvider(
          connection,
          wallet as any,
          { commitment: 'confirmed' }
        );
        
        const program = getProgram(provider);
        const [pda] = slashVotePda(candidate);
        
        const slashVote = await program.account.slashVote.fetch(pda);
        setData(slashVote);
      } catch (err) {
        setData(null);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSlashVote();
  }, [candidate, connection, wallet]);

  return { data, loading, error };
}
