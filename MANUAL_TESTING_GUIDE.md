# Manual Frontend Testing Guide

## Task 12.2: Manual Frontend Testing on Devnet

This guide provides step-by-step instructions for manually testing all frontend features against the deployed Solana devnet smart contract.

---

## Prerequisites

### 1. Phantom Wallet Setup

1. **Install Phantom Wallet**
   - Chrome: https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/phantom-app/
   - Brave: Use Chrome Web Store link

2. **Create/Import Wallet**
   - Open Phantom
   - Create new wallet or import existing
   - **Save your seed phrase securely**

3. **Switch to Devnet**
   - Click settings (gear icon)
   - Scroll to "Developer Settings"
   - Enable "Testnet Mode"
   - Select "Devnet" from network dropdown

4. **Get Devnet SOL**
   - Copy your wallet address
   - Visit: https://faucet.solana.com/
   - Paste address and request airdrop
   - Or use CLI: `solana airdrop 2 <YOUR_ADDRESS> --url devnet`

### 2. Application Setup

```bash
# Start the development server
cd apps/web
npm install
npm run dev
```

Visit: `http://localhost:5173` (or the port shown in terminal)

---

## Test Suite

### Test 12.2.1: Connect Phantom Wallet ✅

**Objective**: Verify wallet connection works correctly

**Steps**:
1. Open the application
2. Look for "Connect Wallet" button (usually in header/nav)
3. Click "Connect Wallet"
4. Phantom popup should appear
5. Click "Connect" in Phantom
6. Approve the connection

**Expected Results**:
- ✅ Phantom popup appears
- ✅ Wallet connects successfully
- ✅ Wallet address displays in UI (shortened format: `5qoZ...mcwP`)
- ✅ Balance displays correctly
- ✅ No console errors

**Troubleshooting**:
- If popup doesn't appear: Check if Phantom is installed
- If connection fails: Ensure you're on Devnet network
- If balance shows 0: Request devnet SOL from faucet

---

### Test 12.2.2: Register Node Flow ✅

**Objective**: Test node registration on blockchain

**Steps**:
1. Ensure wallet is connected with devnet SOL (at least 0.1 SOL)
2. Navigate to home/dashboard
3. Look for "Register Node" or similar button
4. Click the register button
5. Phantom will prompt for transaction approval
6. Review transaction details
7. Click "Approve" in Phantom
8. Wait for confirmation (5-15 seconds)

**Expected Results**:
- ✅ Register button is clickable
- ✅ Phantom transaction popup appears
- ✅ Transaction details show correct program ID
- ✅ Transaction confirms successfully
- ✅ Success notification appears
- ✅ Transaction signature displays
- ✅ Explorer link is clickable and opens correct transaction
- ✅ UI updates to show registered status
- ✅ Phase displays as "Phase 1"
- ✅ Reputation initializes to 10%

**Verification**:
1. Click the Explorer link
2. Verify transaction succeeded on Solana Explorer
3. Check program ID matches: `CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh`
4. Verify account was created

**Troubleshooting**:
- Transaction fails: Ensure sufficient SOL balance
- Button disabled: Check wallet connection
- No confirmation: Check network connection

---

### Test 12.2.3: Task Submission with Merkle Proofs ✅

**Objective**: Test task submission using Merkle proof verification

**Steps**:
1. Ensure node is registered (Phase 1)
2. Navigate to "Merit" or "Tasks" section
3. View available tasks (should show 0/20 or similar)
4. Click on first task or "Submit Task" button
5. Wait for Merkle tree generation (may take 2-5 seconds)
6. Phantom prompts for transaction approval
7. Approve transaction
8. Wait for confirmation

**Expected Results**:
- ✅ Tasks display correctly (0/20 initially)
- ✅ Task submission button is enabled
- ✅ Loading indicator shows during Merkle tree generation
- ✅ Transaction prompt appears
- ✅ Transaction confirms successfully
- ✅ Task counter updates (1/20, 2/20, etc.)
- ✅ Explorer link displays and works
- ✅ Success notification shows
- ✅ Can submit multiple tasks sequentially

**Merkle Proof Verification**:
1. Open browser console (F12)
2. Look for Merkle tree generation logs
3. Verify proof array is generated
4. Check transaction logs on Explorer
5. Confirm Merkle verification succeeded

**Repeat**: Submit all 20 tasks to complete Phase 1

**Troubleshooting**:
- Merkle generation fails: Check internet connection (needs mainnet block hashes)
- Transaction fails: Verify proof is valid
- Slow generation: Normal, fetching from Solana mainnet

---

### Test 12.2.4: Vouching Flow ✅

**Objective**: Test vouching for Phase 2 nodes

**Prerequisites**:
- Your node must be in Phase 2 (completed 20 tasks)
- Need another wallet/node in Phase 2 to vouch for
- Reputation must be ≥70% to vouch

**Steps**:
1. Complete Phase 1 (20 tasks) to reach Phase 2
2. Navigate to "Vouch" tab
3. View list of Phase 2 nodes
4. Select a node to vouch for
5. Click "Vouch" button
6. Review vouch modal (shows 2.5 SOL stake)
7. Click "Confirm Vouch"
8. Approve transaction in Phantom
9. Wait for confirmation

**Expected Results**:
- ✅ Phase 2 nodes display in list
- ✅ Node details show (address, tasks, reputation)
- ✅ Vouch button is enabled (if reputation ≥70%)
- ✅ Modal shows stake amount (2.5 SOL)
- ✅ Transaction confirms successfully
- ✅ Explorer link works
- ✅ Vouched node moves to Phase 3
- ✅ Your reputation updates
- ✅ Stake is locked

**If Reputation < 70%**:
- ✅ Vouch section shows "locked" message
- ✅ Explains reputation requirement
- ✅ Shows current reputation vs required

**Troubleshooting**:
- No Phase 2 nodes: Create test nodes or wait for others
- Can't vouch: Check reputation requirement
- Insufficient SOL: Need at least 2.5 SOL for stake

---

### Test 12.2.5: Voting Flow ✅

**Objective**: Test consensus voting mechanism

**Prerequisites**:
- Node must be in Phase 3 or Full phase
- Current round must be active

**Steps**:
1. Navigate to "Validate" tab
2. View current round number
3. Click "Cast Vote" button
4. Approve transaction in Phantom
5. Wait for confirmation

**Expected Results**:
- ✅ Current round displays correctly
- ✅ Vote button is enabled
- ✅ Transaction confirms successfully
- ✅ Explorer link works
- ✅ Vote status updates to "Voted"
- ✅ Button disables after voting (prevents double voting)
- ✅ Reputation may update after committee confirmation

**Repeat Testing**:
- Try voting again in same round (should be prevented)
- Wait for next round and vote again

**Troubleshooting**:
- Button disabled: May have already voted this round
- Transaction fails: Check phase requirement
- No round displayed: Network config may not be initialized

---

### Test 12.2.6: Verify All Explorer Links Work ✅

**Objective**: Ensure all transaction Explorer links are functional

**Steps**:
1. Perform each transaction type:
   - Node registration
   - Task submission
   - Vouch transaction
   - Vote casting
   - Stake release (if applicable)

2. For each transaction:
   - Click the Explorer link
   - Verify it opens Solana Explorer
   - Check URL includes `?cluster=devnet`
   - Verify transaction details are correct
   - Confirm transaction succeeded

**Expected Results**:
- ✅ All Explorer links open in new tab
- ✅ Links point to correct devnet cluster
- ✅ Transaction signatures match
- ✅ Program ID is correct in all transactions
- ✅ Account changes are visible
- ✅ Event logs are present

**Explorer URL Format**:
```
https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet
https://explorer.solana.com/address/<ADDRESS>?cluster=devnet
```

---

## Additional Tests

### Network Status Display

**Test**: Dashboard shows correct network data
- ✅ Current round number displays
- ✅ Total nodes count is accurate
- ✅ Network status indicator shows "active"

### Node List / Leaderboard

**Test**: Reputation tab shows all network nodes
- ✅ Queries all NodeState accounts
- ✅ Displays phase for each node
- ✅ Shows reputation scores
- ✅ Sorts by reputation (highest first)
- ✅ Shows top 10 nodes

### Stake Release

**Test**: Release stake after candidate graduates
- ✅ Graduated nodes display in list
- ✅ Release button is enabled
- ✅ Transaction confirms successfully
- ✅ 2.5 SOL returns to wallet
- ✅ Reputation bonus applied

### Error Handling

**Test**: Application handles errors gracefully
- ✅ Insufficient SOL shows clear error
- ✅ Network errors display user-friendly message
- ✅ Transaction failures show reason
- ✅ Loading states prevent double-clicks
- ✅ Console errors are minimal

### Responsive Design

**Test**: UI works on different screen sizes
- ✅ Desktop (1920x1080)
- ✅ Laptop (1366x768)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

---

## Test Results Template

Use this template to document your test results:

```markdown
## Test Session: [Date]

### Environment
- Network: Solana Devnet
- Program ID: CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh
- Wallet: [Your wallet address]
- Browser: [Chrome/Firefox/Brave]
- Application URL: [localhost or deployed URL]

### Test 12.2.1: Wallet Connection
- Status: ✅ PASS / ❌ FAIL
- Notes: [Any observations]

### Test 12.2.2: Node Registration
- Status: ✅ PASS / ❌ FAIL
- Transaction: [Signature]
- Explorer: [Link]
- Notes: [Any observations]

### Test 12.2.3: Task Submission
- Status: ✅ PASS / ❌ FAIL
- Tasks Completed: [X/20]
- Transactions: [List signatures]
- Notes: [Any observations]

### Test 12.2.4: Vouching
- Status: ✅ PASS / ❌ FAIL
- Vouched For: [Address]
- Transaction: [Signature]
- Notes: [Any observations]

### Test 12.2.5: Voting
- Status: ✅ PASS / ❌ FAIL
- Round: [Number]
- Transaction: [Signature]
- Notes: [Any observations]

### Test 12.2.6: Explorer Links
- Status: ✅ PASS / ❌ FAIL
- Links Tested: [Count]
- Notes: [Any observations]

### Issues Found
1. [Issue description]
2. [Issue description]

### Overall Result
- Total Tests: 6
- Passed: [X]
- Failed: [X]
- Status: ✅ ALL PASS / ⚠️ PARTIAL / ❌ FAILED
```

---

## Common Issues and Solutions

### Issue: Wallet Won't Connect
**Solution**: 
- Refresh page
- Disconnect and reconnect in Phantom
- Clear browser cache
- Try incognito mode

### Issue: Transactions Fail
**Solution**:
- Check SOL balance (need at least 0.1 SOL)
- Verify on Devnet network
- Check program is deployed
- Review transaction error in Explorer

### Issue: UI Not Updating
**Solution**:
- Refresh page
- Check browser console for errors
- Verify blockchain transaction succeeded
- Wait for confirmation (can take 15-30 seconds)

### Issue: No Phase 2 Nodes to Vouch
**Solution**:
- Create additional test wallets
- Complete Phase 1 with multiple wallets
- Ask team members to register nodes

### Issue: Merkle Proof Generation Slow
**Solution**:
- Normal behavior (fetching from mainnet)
- Ensure stable internet connection
- Wait 5-10 seconds
- Check console for errors

---

## Success Criteria

All tests must pass for Task 12.2 to be considered complete:

- ✅ Wallet connects successfully
- ✅ Node registration works
- ✅ All 20 tasks can be submitted
- ✅ Vouching flow completes
- ✅ Voting works correctly
- ✅ All Explorer links function
- ✅ No critical errors in console
- ✅ UI updates reflect blockchain state
- ✅ Transactions confirm on devnet

---

**Testing Status**: Ready for manual testing
**Estimated Time**: 30-45 minutes for complete test suite
**Tester**: [Your name]
**Date**: [Test date]
