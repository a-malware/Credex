export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test Page</h1>
      <p>If you can see this, React Router is working!</p>
      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
        <strong>Environment Variables:</strong>
        <ul>
          <li>VITE_SOLANA_CLUSTER: {import.meta.env.VITE_SOLANA_CLUSTER || 'undefined'}</li>
          <li>VITE_PROGRAM_ID: {import.meta.env.VITE_PROGRAM_ID || 'undefined'}</li>
        </ul>
      </div>
    </div>
  );
}