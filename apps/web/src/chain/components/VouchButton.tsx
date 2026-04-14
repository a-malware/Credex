import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { vouchForNode } from '../instructions';
import { getExplorerUrl, parseTransactionError, shortenAddress } from '../utils';

/**
 * Example component: Vouch for a Phase 2 candidate
 * Demonstrates Task 10.5: Wire vouch interface
 */
export function VouchButton({ candidateAddress }: { candidateAddress: string }) {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const handleVouch = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError('Wallet not connected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSignature(null);

      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: 'confirmed' }
      );

      const candidatePubkey = new PublicKey(candidateAddress);
      const sig = await vouchForNode(provider, candidatePubkey);
      setSignature(sig);

      console.log('Vouched successfully:', sig);
    } catch (err) {
      console.error('Vouch failed:', err);
      setError(parseTransactionError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleVouch}
        disabled={loading || !publicKey}
        className={`
          px-4 py-2 rounded font-medium transition-colors text-sm w-full
          ${loading || !publicKey
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
          }
        `}
      >
        {loading ? 'Vouching...' : 'Vouch for Node'}
      </button>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}

      {signature && (
        <div className="p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-green-700 text-xs font-medium mb-1">
            ✓ Vouched for {shortenAddress(candidateAddress)}
          </p>
          <a
            href={getExplorerUrl(signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-xs"
          >
            View on Explorer →
          </a>
        </div>
      )}
    </div>
  );
}
