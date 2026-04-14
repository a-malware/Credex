import React from 'react';
import { useNetworkConfig } from '../accounts';
import { formatReputation, bpsToDecimal } from '../utils';

/**
 * Example component: Display network configuration and status
 * This demonstrates Task 10.1: Wire dashboard component
 */
export function NetworkStatus() {
  const { data: config, loading, error } = useNetworkConfig();

  if (loading) {
    return (
      <div className="p-4 border rounded">
        <p>Loading network status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-500 rounded">
        <p className="text-red-500">Error loading network: {error.message}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-4 border rounded">
        <p>Network not initialized</p>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-4">Network Status</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold text-gray-600">Current Round</h3>
          <p className="text-xl">{config.currentRound.toString()}</p>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-600">Total Nodes</h3>
          <p className="text-xl">{config.totalNodes}</p>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-600">Phase 1 Tasks (N)</h3>
          <p className="text-xl">{config.nTasks}</p>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-600">Phase 3 Rounds (M)</h3>
          <p className="text-xl">{config.mRounds}</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold text-gray-600 mb-2">Protocol Parameters</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Delta (δ):</span>
            <span className="ml-2">{bpsToDecimal(config.deltaBps).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500">Alpha (α):</span>
            <span className="ml-2">{bpsToDecimal(config.alphaBps).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500">Theta_P (θ_P):</span>
            <span className="ml-2">{bpsToDecimal(config.thetaPBps).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500">Tau_V (τ_v):</span>
            <span className="ml-2">{bpsToDecimal(config.tauVBps).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-500">Lambda (λ):</span>
            <span className="ml-2">{bpsToDecimal(config.lambdaBps).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
