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
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Direct Test</h1>
      <p>This bypasses all complex components!</p>
      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
        <strong>Environment Variables:</strong>
        <ul>
          <li>VITE_SOLANA_CLUSTER: {typeof window !== 'undefined' ? 'client-side' : 'server-side'}</li>
          <li>NODE_ENV: {process.env.NODE_ENV || 'undefined'}</li>
        </ul>
      </div>
    </div>
  );
}
