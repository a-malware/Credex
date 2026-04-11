export const presentationData = {
  title: "Credex: Zero Knowledge Reputation Exchange",
  subtitle: "ColdStart-PoR: An Incentive-Compatible Reputation Bootstrapping Protocol",
  authors: [
    { name: "Abhijith S", roll: "AM.EN.U4EAC22001" },
    { name: "Amal Anand", roll: "AM.EN.U4EAC22016" },
    { name: "Heman Sakkthivel M S", roll: "AM.EN.U4EAC22028" },
    { name: "Roshan R", roll: "AM.EN.U4EAC22058" },
    { name: "Vaishnav Raj M", roll: "AM.EN.U4EAC22063" }
  ],
  guide: "Ms. Shalu Murali",
  department: "Department of Electronics and Communication Engineering",
  institution: "Amrita School of Engineering, Amritapuri",
  slides: [
    {
      id: "title",
      type: "title",
      title: "Credex: Zero Knowledge Reputation Exchange",
      content: "ColdStart-PoR: An Incentive-Compatible Reputation Bootstrapping Protocol"
    },
    {
      id: "contents",
      type: "list",
      title: "Table of Contents",
      items: [
        "1. Introduction & Project Objective",
        "2. The Cold-Start Problem",
        "3. Proposed Solution: ColdStart-PoR",
        "4. System Architecture & Bootstrapping Phases",
        "5. Technical Comparison: Existing vs. Proposed",
        "6. Work Completed (Solana Implementation)",
        "7. Results & Sybil Resistance Analysis",
        "8. Live System Demo",
        "9. Conclusion & Future Work"
      ]
    },
    {
      id: "objective",
      type: "content",
      title: "Project Objective",
      content: "To develop a game-theoretically sound bootstrapping protocol for Proof-of-Reputation (PoR) blockchains that resolves the 'cold-start problem' without relying on trusted authorities, stake deposits, or massive computational work.",
      highlights: [
        "Incentive-Compatible Entry",
        "Sybil Attack Resistance",
        "Decentralized Bootstrapping",
        "Reputation-Native Protocol"
      ]
    },
    {
      id: "problem-definition",
      type: "content",
      title: "The Cold-Start Problem",
      content: "How does a new node with no prior history securely enter a Proof-of-Reputation network? Current approaches fail critically:",
      highlights: [
        "Genesis Block Assignment: Fails decentralization (requires trusted authority).",
        "Uniform Starter Scores: Fails security (enables Sybil amplification where k attackers gain k * Rstart)."
      ]
    },
    {
      id: "block-diagram",
      type: "diagram",
      title: "Project Block Diagram",
      description: "The 3-Phase ColdStart-PoR Lifecycle",
      steps: [
        { phase: "Phase 1", name: "Probationary Tasks", detail: "N verifiable micro-tasks; cryptographically proven." },
        { phase: "Phase 2", name: "Stake-Backed Vouching", detail: "Existing node stakes δ·R reputation to sponsor the candidate." },
        { phase: "Phase 3", name: "Graduated Participation", detail: "Vote-only mode for M rounds; reputation evolves via dynamic scoring." }
      ]
    },
    {
      id: "math-model",
      type: "content",
      title: "Mathematical Model: Phase 3",
      content: "During Graduated Participation, the new node's reputation evolves dynamically over time. We utilize a time-decay model:",
      highlights: [
        "R(t+1) = λ·R(t) + (1−λ)·h(t)",
        "Where λ is the time-decay parameter",
        "h(t) ∈ {0,1} indicates honesty at round t",
        "Voucher's stake is released only after M consecutive honest rounds."
      ]
    },
    {
      id: "comparison",
      type: "content",
      title: "Technical Comparison",
      content: "How ColdStart-PoR improves upon existing consensus entry mechanisms:",
      table: [
        ["Mechanism", "Decentralized", "Sybil-Resistant", "Incentive Compatible", "No Stake Req."],
        ["Genesis Assignment", "❌", "✅", "❌", "✅"],
        ["Uniform Starter", "✅", "❌", "❌", "✅"],
        ["PoS-Backed Entry", "✅", "✅", "❌", "❌"],
        ["ColdStart-PoR", "✅", "✅", "✅", "✅"]
      ]
    },
    {
      id: "work-done",
      type: "content",
      title: "Work Done So Far",
      content: "Full-stack implementation on the Solana Blockchain using the Anchor Framework.",
      highlights: [
        "9 On-chain Instructions implemented in Rust",
        "PDA-based state management (NetworkConfig, NodeState, VouchRecord)",
        "Fixed-point arithmetic for reputation BPS (Basis Points)",
        "Automated Test Suite (TypeScript) covering full lifecycle"
      ]
    },
    {
      id: "results",
      type: "content",
      title: "Results So Far",
      content: "Simulation and on-chain verification confirm the protocol's effectiveness.",
      highlights: [
        "Sybil Cost: Confirmed linear growth O(k·τv)",
        "Performance: < 3% consensus latency overhead",
        "Reliability: 10/10 automated test cases passing consistently",
        "Incentive Compatibility: Verified Nash equilibrium via slashing"
      ]
    },
    {
      id: "demo",
      type: "title",
      title: "Live System Demo",
      content: "Solana On-chain Implementation: Request Entry → Vouching → Task Completion"
    },
    {
      id: "conclusion",
      type: "content",
      title: "Conclusion & Future Work",
      content: "ColdStart-PoR provides the first incentive-compatible entry mechanism for reputation blockchains.",
      highlights: [
        "Achieved: Sybil-resistant, decentralized bootstrapping model.",
        "Achieved: Functional Solana on-chain implementation.",
        "Future Work: Zero-knowledge proofs (ZKP) for private vouching.",
        "Future Work: Mainnet deployment optimization."
      ]
    }
  ]
};
