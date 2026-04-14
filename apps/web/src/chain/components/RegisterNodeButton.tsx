import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { registerNode } from '../instructions';
import { getExplorerUrl, parseTransactionError } from '../utils';

/**
 * Example component: Register a new node
 * Demonstrates Task 10.3: Wire register node button
 */
export function RegisterNodeButton() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError('Wallet not connected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSignature(null);

      // Create Anchor provider
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: 'confirmed' }
      );

      // Execute registration
      const sig = await registerNode(provider);
      setSignature(sig);

      console.log('Node registered successfully:', sig);
    } catch (err) {
      console.error('Registration failed:', err);
      setError(parseTransactionError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleRegister}
        disabled={loading || !publicKey}
        className={`
          px-6 py-3 rounded-lg font-medium transition-colors
          ${loading || !publicKey
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }
        `}
      >
        {loading ? 'Registering...' : 'Register Node'}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {signature && (
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-700 font-medium mb-2">
            ✓ Node registered successfully!
          </p>
          <a
            href={getExplorerUrl(signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            View transaction on Solana Explorer →
          </a>
        </div>
      )}
    </div>
  );
}
