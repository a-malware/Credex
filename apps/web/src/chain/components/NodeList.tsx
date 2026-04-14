import React, { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { getProgram } from '../program';
import { formatReputation, getPhaseLabel, shortenAddress, getAccountExplorerUrl } from '../utils';

/**
 * Example component: Display all nodes in the network
 * Demonstrates Task 10.2: Wire node list component
 */
export function NodeList({ filterPhase }: { filterPhase?: 'phase1' | 'phase2' | 'phase3' | 'full' }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNodes();
  }, [connection, filterPhase]);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      const program = getProgram(provider);

      // Fetch all NodeState accounts
      const allNodes = await program.account.nodeState.all();

      // Filter by phase if specified
      let filteredNodes = allNodes;
      if (filterPhase) {
        filteredNodes = allNodes.filter(node => filterPhase in node.account.phase);
      }

      setNodes(filteredNodes);
    } catch (err) {
      console.error('Failed to fetch nodes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 border rounded">
        <p>Loading nodes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-500 rounded">
        <p className="text-red-500">Error: {error}</p>
        <button
          onClick={fetchNodes}
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="p-4 border rounded">
        <p className="text-gray-500">
          {filterPhase ? `No nodes in ${filterPhase}` : 'No nodes registered'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {filterPhase ? `${getPhaseLabel({ [filterPhase]: {} })} Nodes` : 'All Nodes'}
        </h3>
        <span className="text-sm text-gray-500">{nodes.length} nodes</span>
      </div>

      <div className="space-y-2">
        {nodes.map((node) => (
          <div
            key={node.publicKey.toString()}
            className="p-4 border rounded hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={getAccountExplorerUrl(node.account.owner)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-blue-600 hover:underline"
                  >
                    {shortenAddress(node.account.owner.toString(), 6)}
                  </a>
                  <span className="text-xs text-gray-500">
                    {getPhaseLabel(node.account.phase)}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Reputation:</span>
                    <span className="ml-1 font-medium">
                      {formatReputation(node.account.reputationBps)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tasks:</span>
                    <span className="ml-1 font-medium">
                      {node.account.tasksCompleted} / {node.account.tasksPassed}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Vote:</span>
                    <span className="ml-1 font-medium">
                      Round {node.account.lastVotedRound.toString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={fetchNodes}
        className="w-full py-2 border rounded hover:bg-gray-50 text-sm text-gray-600"
      >
        Refresh
      </button>
    </div>
  );
}
