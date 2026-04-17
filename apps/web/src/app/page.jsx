import { useStore } from '../store/useStore';
import { useState, useRef } from 'react';

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

// Simple icons as text (replacing lucide-react)
const Icons = {
  TrendingUp: '📈',
  Send: '📤',
  Repeat: '🔄',
  Vote: '🗳️',
  CheckCircle: '✅',
  Shield: '🛡️',
  Award: '🏆',
  Eye: '👁️',
  EyeOff: '🙈',
  Lock: '🔒',
  Gift: '🎁',
  Zap: '⚡',
  ChevronRight: '▶️'
};

const ACTIVITY_META = {
  task: { color: "#05C48F", bg: "#ECFDF5", icon: '✅' },
  vouch: { color: "#0052FF", bg: "#EEF3FF", icon: '🛡️' },
  reputation: { color: "#8B5CF6", bg: "#F5F3FF", icon: '📈' },
  phase: { color: "#F59E0B", bg: "#FFFBEB", icon: '🏆' },
  send: { color: "#EF4444", bg: "#FEF2F2", icon: '📤' },
  receive: { color: "#10B981", bg: "#ECFDF5", icon: '📥' },
  swap: { color: "#3B82F6", bg: "#EFF6FF", icon: '🔄' },
  default: { color: "#6B7280", bg: "#F9FAFB", icon: '⚡' },
};

// Home component (wallet-free version)
function HomeComponent() {
  const {
    portfolioBalance,
    portfolioUSD,
    reputation,
    phase,
    tasksCompleted,
    reputationGrowth,
    meritBoost,
    tokens,
    activities,
    setActiveTab,
    graduated,
    claimedGenesis,
    setActiveModal,
  } = useStore();

  const [hideBalance, setHideBalance] = useState(false);
  const longPressRef = useRef(null);

  const startLongPress = () => {
    longPressRef.current = setTimeout(() => setActiveModal("slash"), 700);
  };
  const cancelLongPress = () => clearTimeout(longPressRef.current);

  const repPercent = Math.round(reputation * 100);

  return (
    <div style={{ padding: "20px 16px 0" }}>
      {/* Network Stats */}
      <div
        style={{
          background: "linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)",
          borderRadius: 18,
          padding: "14px 16px",
          marginBottom: 16,
          border: "1px solid #E5E7EB",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, marginBottom: 4 }}>
              NETWORK STATUS
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <span style={{ fontSize: 13, color: "#9CA3AF" }}>Round: </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0D1421" }}>
                  42
                </span>
              </div>
              <div>
                <span style={{ fontSize: 13, color: "#9CA3AF" }}>Nodes: </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0D1421" }}>
                  156
                </span>
              </div>
            </div>
          </div>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#05C48F",
              boxShadow: "0 0 0 3px #05C48F30",
            }}
          />
        </div>
      </div>

      {/* Portfolio Balance */}
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: "24px 20px",
          marginBottom: 20,
          boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#9CA3AF",
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Total Balance
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#0D1421",
                letterSpacing: -1.5,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {hideBalance
                ? "••••••"
                : `$${portfolioUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#6B7280",
                marginTop: 4,
              }}
            >
              {hideBalance ? "•••" : `${portfolioBalance.toFixed(2)} SOL`}
            </div>
          </div>
          <button
            onClick={() => setHideBalance(!hideBalance)}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#F5F7FA",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            {hideBalance ? Icons.EyeOff : Icons.Eye}
          </button>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}
        >
          {[
            { label: "Send", icon: Icons.Send, color: "#0052FF", modal: "send" },
            { label: "Swap", icon: Icons.Repeat, color: "#8B5CF6", modal: "swap" },
            {
              label: claimedGenesis ? "Claimed" : "Claim",
              icon: graduated ? (claimedGenesis ? Icons.CheckCircle : Icons.Gift) : Icons.Lock,
              color: graduated && !claimedGenesis ? "#10B981" : "#9CA3AF",
              modal: "claim",
            },
            { label: "Vote", icon: Icons.Vote, color: "#F59E0B", modal: null },
          ].map(({ label, icon, color, modal }) => (
            <button
              key={label}
              onClick={() => modal ? setActiveModal(modal) : setActiveTab("merit")}
              style={{
                background: "#F9FAFB",
                borderRadius: 14,
                padding: "14px 8px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: color + "15",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px"
                }}
              >
                {icon}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6B7280",
                }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Large Reputation Orb Card */}
      <div
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        style={{
          background:
            "linear-gradient(140deg, #0038E8 0%, #0052FF 55%, #2271FF 100%)",
          borderRadius: 24,
          padding: "28px 24px",
          marginBottom: 20,
          position: "relative",
          overflow: "hidden",
          cursor: "default",
          userSelect: "none",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -24,
            left: 20,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              MERIT SCORE
            </div>
            <div
              style={{
                color: "white",
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: -2,
              }}
            >
              {repPercent}
              <span style={{ fontSize: 28, fontWeight: 700 }}>%</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginTop: 10,
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 20,
                  padding: "3px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: "12px" }}>{Icons.TrendingUp}</span>
                <span style={{ color: "white", fontSize: 12, fontWeight: 600 }}>
                  +{reputationGrowth.toFixed(1)}% this week
                </span>
              </div>
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.18)",
              borderRadius: 14,
              padding: "6px 14px",
              backdropFilter: "blur(10px)",
            }}
          >
            <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>
              Phase {phase}
            </span>
          </div>
        </div>

        {/* Merit boost info */}
        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: 14,
            padding: "12px 14px",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 11,
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                Yield Multiplier
              </div>
              <div
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                {meritBoost.toFixed(2)}x
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.7)",
                textAlign: "right",
              }}
            >
              Earn {Math.round((meritBoost - 1) * 100)}% more
              <br />
              on staking rewards
            </div>
          </div>
        </div>
      </div>

      {/* Merit Progress Cards */}
      {!graduated && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 18,
              padding: "16px 14px",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>
                Tasks Done
              </span>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#05C48F18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px"
                }}
              >
                {Icons.CheckCircle}
              </div>
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#0D1421",
                marginBottom: 3,
              }}
            >
              {tasksCompleted}/20
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>
              Phase {phase === 1 ? "1" : "Complete"}
            </div>
          </div>

          <button
            onClick={() => setActiveTab("merit")}
            style={{
              background: "linear-gradient(135deg,#0038E8,#0052FF)",
              borderRadius: 18,
              padding: "16px 14px",
              boxShadow: "0 4px 16px rgba(0,82,255,0.25)",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: 600,
                }}
              >
                Continue
              </span>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px"
                }}
              >
                {Icons.Zap}
              </div>
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "white",
                marginBottom: 3,
              }}
            >
              Merit Mode
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
              Activate now →
            </div>
          </button>
        </div>
      )}

      {/* Token List */}
      <div
        style={{
          background: "white",
          borderRadius: 20,
          overflow: "hidden",
          marginBottom: 20,
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid #F5F5F5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0D1421" }}>
            Assets
          </span>
          <span style={{ fontSize: 12, color: "#0052FF", fontWeight: 600 }}>
            See all
          </span>
        </div>
        {tokens.map((token, i) => (
          <div
            key={token.symbol}
            style={{
              padding: "14px 16px",
              borderBottom:
                i < tokens.length - 1 ? "1px solid #F9F9F9" : "none",
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "#F3F4F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {token.logo}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0D1421",
                }}
              >
                {token.symbol}
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                {token.balance >= 1000
                  ? token.balance.toLocaleString()
                  : token.balance.toFixed(2)}{" "}
                {token.symbol}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0D1421",
                }}
              >
                ${token.value.toFixed(2)}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: token.change24h >= 0 ? "#10B981" : "#EF4444",
                  marginTop: 1,
                  fontWeight: 600,
                }}
              >
                {token.change24h >= 0 ? "+" : ""}
                {token.change24h.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div
        style={{
          background: "white",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          marginBottom: 80, // Space for navigation
        }}
      >
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid #F5F5F5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: "#0D1421" }}>
            Recent Activity
          </span>
          <button
            onClick={() => setActiveTab("activity")}
            style={{
              fontSize: 12,
              color: "#0052FF",
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            See all
          </button>
        </div>

        {activities.slice(0, 5).map((activity, i) => {
          const meta = ACTIVITY_META[activity.type] || ACTIVITY_META.default;
          const { icon, color, bg } = meta;
          return (
            <div
              key={activity.id || i}
              style={{
                padding: "13px 16px",
                borderBottom:
                  i < Math.min(activities.length, 5) - 1
                    ? "1px solid #F9F9F9"
                    : "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "18px"
                }}
              >
                {icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0D1421",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {activity.message}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                  {activity.time}
                </div>
              </div>
              <span style={{ fontSize: "15px", color: "#D1D5DB" }}>{Icons.ChevronRight}</span>
            </div>
          );
        })}
      </div>
    </div>
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

// Import the actual components
import MeritComponent from '../components/merit.jsx';
import ValidateComponent from '../components/validate.jsx';
import VouchComponent from '../components/vouch.jsx';
import ActivityComponent from '../components/activity.jsx';

// Content component that shows different views based on active tab
function TabContent() {
  const { activeTab } = useStore();
  
  if (activeTab === 'home') {
    return <HomeComponent />;
  }
  
  if (activeTab === 'merit') {
    return <MeritComponent />;
  }
  
  if (activeTab === 'validate') {
    return <ValidateComponent />;
  }
  
  if (activeTab === 'vouch') {
    return <VouchComponent />;
  }
  
  if (activeTab === 'activity') {
    return <ActivityComponent />;
  }

  // Fallback for unknown tabs
  return (
    <div style={{
      padding: '20px',
      paddingBottom: '80px',
      textAlign: 'center'
    }}>
      <div style={{ color: '#6B7280', fontSize: '16px' }}>
        Tab not found: {activeTab}
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