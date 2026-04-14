import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { submitTaskProof } from '../instructions';
import { 
  fetchSolanaBlockHashes, 
  buildMerkleTree, 
  getMerkleProof,
  bufferToUint8Array 
} from '../merkle';
import { getExplorerUrl, parseTransactionError } from '../utils';

/**
 * Example component: Submit a Phase 1 task with Merkle proof
 * Demonstrates Task 10.4: Wire task submission
 */
export function SubmitTaskButton({ taskIndex }: { taskIndex: number }) {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setError('Wallet not connected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSignature(null);

      // Step 1: Fetch Solana block hashes (these are the task leaves)
      console.log('Fetching Solana block hashes...');
      const blockHashes = await fetchSolanaBlockHashes(connection, 20);

      // Step 2: Build Merkle tree
      console.log('Building Merkle tree...');
      const tree = buildMerkleTree(blockHashes);
      console.log('Merkle root:', tree.root.toString('hex'));

      // Step 3: Get proof for the specific task
      console.log(`Generating proof for task ${taskIndex}...`);
      const proof = getMerkleProof(blockHashes, taskIndex);

      // Step 4: Convert to Uint8Array for Anchor
      const leafData = bufferToUint8Array(blockHashes[taskIndex]);
      const proofArray = proof.map(p => bufferToUint8Array(p));

      // Step 5: Submit to blockchain
      console.log('Submitting task proof...');
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions },
        { commitment: 'confirmed' }
      );

      const sig = await submitTaskProof(provider, taskIndex, leafData, proofArray);
      setSignature(sig);

      console.log('Task submitted successfully:', sig);
    } catch (err) {
      console.error('Task submission failed:', err);
      setError(parseTransactionError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSubmit}
        disabled={loading || !publicKey}
        className={`
          px-4 py-2 rounded font-medium transition-colors text-sm
          ${loading || !publicKey
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
          }
        `}
      >
        {loading ? 'Submitting...' : `Submit Task ${taskIndex}`}
      </button>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          <strong>Error:</strong> {error}
        </div>
      )}

      {signature && (
        <div className="p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-green-700 text-xs font-medium mb-1">
            ✓ Task {taskIndex} submitted!
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
