import { useStore } from '../store/useStore';

export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ColdStart PoR Protocol</title>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}

export default function App() {
  const { portfolioUSD, reputation, phase } = useStore();
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      background: '#E8EDF5',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 430,
        background: '#F5F7FA',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 0 60px rgba(0,0,0,0.18)'
      }}>
        <h1 style={{ color: '#0D1421', marginBottom: '20px' }}>ColdStart PoR Protocol</h1>
        <p style={{ color: '#6B7280', marginBottom: '20px' }}>
          Reputation-based Proof of Reputation protocol on Solana Devnet
        </p>
        
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#FFFFFF', 
          borderRadius: '10px',
          border: '1px solid #E5E7EB'
        }}>
          <h3 style={{ color: '#0D1421', marginBottom: '10px' }}>System Status</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ color: '#059669', marginBottom: '5px' }}>✅ React Router v7: Working</li>
            <li style={{ color: '#059669', marginBottom: '5px' }}>✅ Vercel Deployment: Working</li>
            <li style={{ color: '#059669', marginBottom: '5px' }}>✅ Zustand Store: Working</li>
            <li style={{ color: '#EF4444', marginBottom: '5px' }}>❌ Wallet Provider: Causes Blank Screen</li>
            <li style={{ color: '#059669', marginBottom: '5px' }}>✅ Environment: {typeof window !== 'undefined' ? 'Client-side' : 'Server-side'}</li>
            <li style={{ color: '#059669', marginBottom: '5px' }}>✅ Build Mode: {process.env.NODE_ENV || 'development'}</li>
          </ul>
        </div>

        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#E0F2FE', 
          borderRadius: '10px',
          border: '1px solid #0EA5E9'
        }}>
          <h3 style={{ color: '#0C4A6E', marginBottom: '10px' }}>Store Data Test</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ color: '#0C4A6E', marginBottom: '5px' }}>💰 Portfolio: ${portfolioUSD.toFixed(2)}</li>
            <li style={{ color: '#0C4A6E', marginBottom: '5px' }}>⭐ Reputation: {(reputation * 100).toFixed(1)}%</li>
            <li style={{ color: '#0C4A6E', marginBottom: '5px' }}>🎯 Phase: {phase}</li>
          </ul>
        </div>

        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#FEE2E2', 
          borderRadius: '10px',
          border: '1px solid #EF4444'
        }}>
          <h3 style={{ color: '#991B1B', marginBottom: '10px' }}>Issue Identified</h3>
          <p style={{ color: '#991B1B', fontSize: '14px', marginBottom: '10px' }}>
            🎯 <strong>Root Cause Found:</strong> Solana Wallet Provider causes blank screen in production
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ color: '#991B1B', fontSize: '12px', marginBottom: '3px' }}>• Zustand Store: ✅ Working</li>
            <li style={{ color: '#991B1B', fontSize: '12px', marginBottom: '3px' }}>• Wallet Provider: ❌ Blank Screen</li>
            <li style={{ color: '#991B1B', fontSize: '12px', marginBottom: '3px' }}>• Need alternative wallet solution</li>
          </ul>
        </div>

        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          background: '#FEF3C7', 
          borderRadius: '10px',
          border: '1px solid #F59E0B'
        }}>
          <h3 style={{ color: '#92400E', marginBottom: '10px' }}>Next Steps</h3>
          <p style={{ color: '#92400E', fontSize: '14px' }}>
            Will implement wallet integration without provider wrapper or use conditional loading.
          </p>
        </div>
      </div>
    </div>
  );
}
