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

// Navigation component
function Navigation() {
  const { activeTab, setActiveTab } = useStore();
  
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'merit', label: 'Merit', icon: '⭐' },
    { id: 'validate', label: 'Validate', icon: '✅' },
    { id: 'vouch', label: 'Vouch', icon: '🤝' },
    { id: 'activity', label: 'Activity', icon: '📊' }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'white',
      borderTop: '1px solid #E5E7EB',
      padding: '8px 0',
      display: 'flex',
      justifyContent: 'space-around',
      zIndex: 1000
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            color: activeTab === tab.id ? '#0052FF' : '#6B7280',
            fontSize: '12px',
            fontWeight: activeTab === tab.id ? '600' : '400'
          }}
        >
          <span style={{ fontSize: '16px' }}>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// Content component that shows different views based on active tab
function TabContent() {
  const { activeTab } = useStore();
  
  const content = {
    home: {
      title: 'Home Dashboard',
      description: 'Portfolio overview and quick actions',
      color: '#0052FF'
    },
    merit: {
      title: 'Merit Mode',
      description: 'Complete tasks to earn reputation',
      color: '#8B5CF6'
    },
    validate: {
      title: 'Validate Network',
      description: 'Participate in network validation',
      color: '#10B981'
    },
    vouch: {
      title: 'Vouch System',
      description: 'Vouch for other participants',
      color: '#F59E0B'
    },
    activity: {
      title: 'Activity Feed',
      description: 'Recent transactions and events',
      color: '#EF4444'
    }
  };

  const current = content[activeTab] || content.home;

  return (
    <div style={{
      padding: '20px',
      paddingBottom: '80px', // Space for navigation
      textAlign: 'center'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: current.color + '20',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        fontSize: '24px',
        color: current.color
      }}>
        {activeTab === 'home' && '🏠'}
        {activeTab === 'merit' && '⭐'}
        {activeTab === 'validate' && '✅'}
        {activeTab === 'vouch' && '🤝'}
        {activeTab === 'activity' && '📊'}
      </div>
      
      <h2 style={{ 
        color: '#0D1421', 
        marginBottom: '10px',
        fontSize: '24px',
        fontWeight: '700'
      }}>
        {current.title}
      </h2>
      
      <p style={{ 
        color: '#6B7280', 
        marginBottom: '30px',
        fontSize: '16px'
      }}>
        {current.description}
      </p>

      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        textAlign: 'left'
      }}>
        <h3 style={{ color: '#0D1421', marginBottom: '15px' }}>
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Features
        </h3>
        <div style={{ color: '#6B7280', fontSize: '14px' }}>
          This is where the {activeTab} component will be implemented. 
          Navigation is working perfectly!
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { portfolioUSD, reputation, phase } = useStore();
  
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      background: '#E8EDF5'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderBottom: '1px solid #E5E7EB',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          color: '#0D1421', 
          margin: 0,
          fontSize: '20px',
          fontWeight: '700'
        }}>
          ColdStart PoR Protocol
        </h1>
        <p style={{ 
          color: '#6B7280', 
          margin: '5px 0 0',
          fontSize: '14px'
        }}>
          Reputation: {(reputation * 100).toFixed(1)}% • Phase {phase} • ${portfolioUSD.toFixed(0)}
        </p>
      </div>

      {/* Main Content */}
      <TabContent />

      {/* Bottom Navigation */}
      <Navigation />
    </div>
  );
}
