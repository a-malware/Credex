import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNodeState } from '../accounts';
import { formatReputation, getPhaseLabel, getPhaseColor, shortenAddress } from '../utils';

/**
 * Example component: Display current user's node status
 * Demonstrates using useNodeState hook
 */
export function MyNodeCard() {
  const { publicKey, connected } = useWallet();
  const { data: nodeState, loading, error } = useNodeState(publicKey || undefined);

  if (!connected) {
    return (
      <div className="p-4 border rounded">
        <p className="text-gray-500">Connect your wallet to view node status</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 border rounded">
        <p>Loading node status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-500 rounded">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  if (!nodeState) {
    return (
      <div className="p-4 border rounded">
        <p className="text-gray-500">Node not registered</p>
        <p className="text-sm text-gray-400 mt-2">
          Register your node to participate in the network
        </p>
      </div>
    );
  }

  const phaseColor = getPhaseColor(nodeState.phase);
  const phaseLabel = getPhaseLabel(nodeState.phase);

  return (
    <div className="p-6 border rounded-lg shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">My Node</h3>
          <p className="text-sm text-gray-500">
            {shortenAddress(publicKey!.toString())}
          </p>
        </div>
        <span 
          className={`px-3 py-1 rounded-full text-sm font-medium bg-${phaseColor}-100 text-${phaseColor}-800`}
        >
          {phaseLabel}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-gray-600">Reputation:</span>
          <span className="ml-2 font-semibold">
            {formatReputation(nodeState.reputationBps)}
          </span>
        </div>

        <div>
          <span className="text-gray-600">Tasks Completed:</span>
          <span className="ml-2 font-semibold">
            {nodeState.tasksCompleted} / {nodeState.tasksPassed}
          </span>
        </div>

        {('phase3' in nodeState.phase || 'full' in nodeState.phase) && (
          <div>
            <span className="text-gray-600">Honest Rounds:</span>
            <span className="ml-2 font-semibold">
              {nodeState.honestRounds}
            </span>
          </div>
        )}

        <div>
          <span className="text-gray-600">Last Voted Round:</span>
          <span className="ml-2 font-semibold">
            {nodeState.lastVotedRound.toString()}
          </span>
        </div>
      </div>
    </div>
  );
}
