import React, { useMemo, useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  
  // Only initialize on client-side to avoid SSR issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Configure devnet endpoint
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

  // Use empty wallets array to avoid problematic wallet dependencies
  // Wallets will be detected automatically when users try to connect
  const wallets = useMemo(() => [], []);

  // Render children without wallet provider during SSR/initial render
  if (!isClient) {
    return <>{children}</>;
  }

  // Only render wallet provider on client-side
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
