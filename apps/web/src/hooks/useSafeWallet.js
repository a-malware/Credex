import { useState, useEffect } from 'react';

// Safe wallet hook that handles client-side loading
export function useSafeWallet() {
  const [isClient, setIsClient] = useState(false);
  const [walletState, setWalletState] = useState({
    publicKey: null,
    connected: false,
    connecting: false,
  });

  useEffect(() => {
    setIsClient(true);
    
    // Only import wallet adapter on client-side
    if (typeof window !== 'undefined') {
      import('@solana/wallet-adapter-react')
        .then(({ useWallet }) => {
          // This will be handled by the actual useWallet hook when available
        })
        .catch(() => {
          // Fallback if wallet adapter fails to load
          console.log('Wallet adapter not available');
        });
    }
  }, []);

  // Return safe defaults during SSR and initial client render
  if (!isClient) {
    return {
      publicKey: null,
      connected: false,
      connecting: false,
      connect: () => {},
      disconnect: () => {},
    };
  }

  // Try to use actual wallet hook if available
  try {
    // This will be replaced by actual useWallet when wallet provider is loaded
    const { useWallet } = require('@solana/wallet-adapter-react');
    return useWallet();
  } catch {
    // Fallback if wallet adapter is not available
    return {
      publicKey: null,
      connected: false,
      connecting: false,
      connect: () => {},
      disconnect: () => {},
    };
  }
}