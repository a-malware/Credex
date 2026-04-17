"use client";
import { useState, useCallback, useEffect } from "react";
import { useStore } from "../store/useStore";

// Simple icons as text (replacing lucide-react to avoid dependencies)
const Icons = {
  Search: '🔍',
  Shield: '🛡️',
  X: '❌',
  AlertTriangle: '⚠️',
  CheckCircle: '✅',
  Lock: '🔒',
  ExternalLink: '🔗',
  Loader: '⏳',
};

// Icon wrapper component to handle size and color props
const Icon = ({ name, size, color, style, ...props }) => (
  <span style={{ fontSize: `${size || 16}px`, color, ...style }} {...props}>
    {Icons[name] || '❓'}
  </span>
);

// Create icon components that match the old API
const Search = (props) => <Icon name="Search" {...props} />;
const Shield = (props) => <Icon name="Shield" {...props} />;
const X = (props) => <Icon name="X" {...props} />;
const AlertTriangle = (props) => <Icon name="AlertTriangle" {...props} />;
const CheckCircle = (props) => <Icon name="CheckCircle" {...props} />;
const Lock = (props) => <Icon name="Lock" {...props} />;
const ExternalLink = (props) => <Icon name="ExternalLink" {...props} />;
const Loader = (props) => <Icon name="Loader" {...props} />;

// Helper function to shorten addresses
const shortenAddress = (address, chars = 4) => {
  const addr = typeof address === 'string' ? address : address.toString();
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
};

export default function Vouch() {
  const { reputation, addActivity } = useStore();
  const wallet = { publicKey: null }; // Wallet integration disabled
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [vouching, setVouching] = useState(false);
  const [vouched, setVouched] = useState({});
  const [phase2Nodes, setPhase2Nodes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock Phase 2 nodes for demo
  const mockPhase2Nodes = [
    {
      pubkey: "mock1",
      owner: { toString: () => "2mPx...7Rn4" },
      tasksCompleted: 20,
      nTasks: 20,
      reputation: 0.85,
      taskScore: 1.0,
      phase: 2,
      isOnline: true,
      lastSeen: "recently",
    },
    {
      pubkey: "mock2", 
      owner: { toString: () => "6qTy...3Fu9" },
      tasksCompleted: 19,
      nTasks: 20,
      reputation: 0.78,
      taskScore: 0.95,
      phase: 2,
      isOnline: true,
      lastSeen: "recently",
    },
    {
      pubkey: "mock3",
      owner: { toString: () => "4hWz...1Kp6" },
      tasksCompleted: 18,
      nTasks: 20,
      reputation: 0.72,
      taskScore: 0.90,
      phase: 2,
      isOnline: false,
      lastSeen: "2h ago",
    },
  ];

  // Fetch Phase 2 nodes from blockchain (demo mode)
  useEffect(() => {
    const fetchPhase2Nodes = async () => {
      try {
        setLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setPhase2Nodes(mockPhase2Nodes);
      } catch (err) {
        console.error('Error fetching Phase 2 nodes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPhase2Nodes();
  }, []);

  const canVouch = reputation >= 0.7;
  const stakeAmount = 2.5;

  const filtered = phase2Nodes.filter(
    (u) => !search || u.owner.toString().toLowerCase().includes(search.toLowerCase()),
  );

  const handleVouch = useCallback(async () => {
    if (!modal) return;
    
    setVouching(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store vouched state with mock signature
      setVouched((prev) => ({ 
        ...prev, 
        [modal.owner.toString()]: { signature: "demo_sig_" + Date.now(), timestamp: Date.now() } 
      }));
      
      addActivity({
        id: Date.now(),
        type: "vouch",
        message: `Vouched for ${modal.owner.toString()} · ${stakeAmount} SOL staked (demo)`,
        time: "just now",
      });

      console.log(`Vouch submitted for ${modal.owner.toString()} in demo mode`);
    } catch (err) {
      console.error('Vouch error:', err);
    } finally {
      setVouching(false);
      setModal(null);
    }
  }, [modal, addActivity, stakeAmount]);

  if (loading) {
    return (
      <div style={{ padding: "20px 16px 0", textAlign: "center" }}>
        <span style={{ fontSize: '32px' }}>{Icons.Loader}</span>
        <div style={{ fontSize: 14, color: "#6B7280", marginTop: 12 }}>
          Loading eligible nodes...
        </div>
      </div>
    );
  }

  if (!canVouch)
    return (
      <div style={{ padding: "20px 16px 0" }}>
        <div
          style={{
            background: "white",
            borderRadius: 24,
            padding: "40px 24px",
            textAlign: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#F3F4F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <span style={{ fontSize: '32px', color: '#9CA3AF' }}>{Icons.Lock}</span>
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#0D1421",
              marginBottom: 8,
            }}
          >
            Vouch Access Locked
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#6B7280",
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            You need a reputation score of{" "}
            <strong style={{ color: "#0D1421" }}>70% or higher</strong> to vouch
            for other users.
          </div>
          <div
            style={{
              background: "#F5F7FA",
              borderRadius: 16,
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 13, color: "#6B7280" }}>
                Your current score
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#EF4444" }}>
                {Math.round(reputation * 100)}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "#E5E7EB",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "#EF4444",
                  borderRadius: 3,
                  width: `${Math.round(reputation * 100)}%`,
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
              Need {Math.round((0.7 - reputation) * 100)}% more · Complete tasks
              and get vouched
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div style={{ padding: "20px 16px 0" }}>
      {/* Pulse animation for online indicators */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(1.35); }
        }
        .online-dot { animation: pulse-dot 1.8s ease-in-out infinite; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0D1421" }}>Vouch for Others</div>
          {/* Live node counter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#ECFDF5", borderRadius: 20, padding: "4px 10px" }}>
            <div className="online-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#05C48F" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#05C48F" }}>
              {phase2Nodes.filter(u => u.isOnline).length} active now
            </span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>
          Stake SOL to help new members join the network
        </div>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg,#EEF3FF,#F5F8FF)",
          border: "1px solid #DBEAFE",
          borderRadius: 16,
          padding: "14px 16px",
          marginBottom: 18,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <Shield
          size={18}
          color="#0052FF"
          style={{ flexShrink: 0, marginTop: 1 }}
        />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0D1421" }}>
            Staking {stakeAmount} SOL per vouch
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>
            If the user behaves dishonestly, your stake will be slashed. Choose
            carefully.
          </div>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search
          size={16}
          color="#9CA3AF"
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
        <input
          type="text"
          placeholder="Search by wallet address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 14px 12px 40px",
            borderRadius: 14,
            border: "1.5px solid #E5E7EB",
            background: "white",
            fontSize: 14,
            color: "#0D1421",
            outline: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#9CA3AF" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No Phase 2 nodes found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {search ? "Try a different search" : "Check back later for eligible candidates"}
            </div>
          </div>
        ) : (
          filtered.map((user) => {
            const ownerStr = user.owner.toString();
            const done = vouched[ownerStr];
            const displayAddress = shortenAddress(user.owner, 4);
            
            return (
              <div
                key={ownerStr}
                style={{
                  background: "white",
                  borderRadius: 18,
                  padding: "14px 16px",
                  boxShadow: user.isOnline
                    ? "0 0 0 1.5px #05C48F30, 0 2px 10px rgba(0,0,0,0.06)"
                    : "0 1px 6px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {/* Avatar with online ring */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      background: `hsl(${(ownerStr.charCodeAt(0) * 7) % 360},55%,52%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ color: "white", fontSize: 14, fontWeight: 800 }}>
                      {ownerStr.slice(0, 2)}
                    </span>
                  </div>
                  {user.isOnline && (
                    <div
                      className="online-dot"
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 11,
                        height: 11,
                        borderRadius: "50%",
                        background: "#05C48F",
                        border: "2px solid white",
                      }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0D1421" }}>
                      {displayAddress}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                    {user.tasksCompleted}/{user.nTasks} tasks · Rep {Math.round(user.reputation * 100)}%
                    {" · "}
                    <span style={{ color: user.isOnline ? "#05C48F" : "#D1D5DB", fontWeight: 600 }}>
                      {user.isOnline ? `Active ${user.lastSeen}` : `Last seen ${user.lastSeen}`}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 3,
                      background: "#F3F4F6",
                      borderRadius: 2,
                      marginTop: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: user.isOnline ? "#05C48F" : "#0052FF",
                        borderRadius: 2,
                        width: `${Math.round(user.taskScore * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      background: "#EEF3FF",
                      borderRadius: 10,
                      padding: "3px 9px",
                    }}
                  >
                    <span
                      style={{ fontSize: 12, fontWeight: 700, color: "#0052FF" }}
                    >
                      {Math.round(user.taskScore * 100)}%
                    </span>
                  </div>
                  {done ? (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <CheckCircle size={13} color="#05C48F" />
                      <span
                        style={{
                          fontSize: 11,
                          color: "#05C48F",
                          fontWeight: 600,
                        }}
                      >
                        Vouched
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setModal(user)}
                      style={{
                        background: "#0052FF",
                        color: "white",
                        border: "none",
                        borderRadius: 10,
                        padding: "7px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Shield size={11} /> Vouch
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {modal && (
        <>
          <div
            onClick={() => !vouching && setModal(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(13,20,33,0.55)",
              zIndex: 100,
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: 430,
              background: "white",
              borderRadius: "24px 24px 0 0",
              padding: "24px 20px 36px",
              zIndex: 101,
              boxShadow: "0 -12px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                background: "#E5E7EB",
                borderRadius: 2,
                margin: "0 auto 20px",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0D1421" }}>
                Confirm Vouch
              </div>
              <button
                onClick={() => !vouching && setModal(null)}
                style={{
                  background: "#F5F7FA",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} color="#6B7280" />
              </button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#F9FAFB",
                borderRadius: 16,
                padding: "14px",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `hsl(${(modal.owner.toString().charCodeAt(0) * 7) % 360},55%,52%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ color: "white", fontSize: 14, fontWeight: 800 }}>
                  {modal.owner.toString().slice(0, 2)}
                </span>
              </div>
              <div>
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: "#0D1421" }}
                >
                  {shortenAddress(modal.owner, 4)}
                </div>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                  {modal.tasksCompleted}/{modal.nTasks} tasks · Phase {modal.phase}
                </div>
              </div>
            </div>
            <div
              style={{
                background: "#F9FAFB",
                borderRadius: 16,
                padding: "14px",
                marginBottom: 16,
              }}
            >
              {[
                {
                  label: "Stake amount",
                  value: `${stakeAmount} SOL`,
                  color: "#0D1421",
                },
                {
                  label: "Your reputation",
                  value: `${Math.round(reputation * 100)}%`,
                  color: "#05C48F",
                },
                {
                  label: "Recipient rep gain",
                  value: "+10%",
                  color: "#0052FF",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #F0F0F0",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#6B7280" }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 20,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <AlertTriangle
                size={15}
                color="#D97706"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
                If this user behaves dishonestly,{" "}
                <strong>{stakeAmount} SOL</strong> will be slashed from your
                stake. This cannot be undone.
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => !vouching && setModal(null)}
                disabled={vouching}
                style={{
                  flex: 1,
                  background: "#F5F7FA",
                  color: "#6B7280",
                  border: "none",
                  borderRadius: 14,
                  padding: "15px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleVouch}
                disabled={vouching}
                style={{
                  flex: 2,
                  background: vouching ? "#F3F4F6" : "#0052FF",
                  color: vouching ? "#9CA3AF" : "white",
                  border: "none",
                  borderRadius: 14,
                  padding: "15px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: vouching ? "not-allowed" : "pointer",
                  boxShadow: vouching
                    ? "none"
                    : "0 4px 16px rgba(0,82,255,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {vouching ? (
                  "Submitting…"
                ) : (
                  <>
                    <Shield size={15} /> Confirm Vouch
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
