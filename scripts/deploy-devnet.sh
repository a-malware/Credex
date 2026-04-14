#!/bin/bash

# ColdStart-PoR Devnet Deployment Script
# This script deploys the smart contract to Solana devnet

set -e

echo "🚀 ColdStart-PoR Devnet Deployment"
echo "=================================="
echo ""

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI not found"
    echo "Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Error: Anchor CLI not found"
    echo "Install from: https://www.anchor-lang.com/docs/installation"
    exit 1
fi

echo "✓ Solana CLI found: $(solana --version)"
echo "✓ Anchor CLI found: $(anchor --version)"
echo ""

# Configure Solana CLI for devnet
echo "📡 Configuring Solana CLI for devnet..."
solana config set --url devnet
echo ""

# Check wallet balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance)
echo "Current balance: $BALANCE"
echo ""

# Check if balance is sufficient (need at least 2 SOL)
if [[ "$BALANCE" == "0 SOL" ]]; then
    echo "⚠️  Insufficient balance for deployment"
    echo "💸 Requesting airdrop..."
    solana airdrop 2 || echo "⚠️  Airdrop failed. Request manually from https://faucet.solana.com"
    echo ""
fi

# Build the program
echo "🔨 Building program..."
anchor build
echo ""

# Deploy to devnet
echo "🚀 Deploying to devnet..."
anchor deploy --provider.cluster devnet
echo ""

# Get deployed program ID
PROGRAM_ID=$(solana address -k target/deploy/coldstart_por-keypair.json)
echo "✅ Deployment successful!"
echo ""
echo "📋 Deployment Details:"
echo "  Program ID: $PROGRAM_ID"
echo "  Cluster: devnet"
echo "  Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""

# Verify program ID matches Anchor.toml
EXPECTED_ID="CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh"
if [ "$PROGRAM_ID" != "$EXPECTED_ID" ]; then
    echo "⚠️  Warning: Deployed program ID ($PROGRAM_ID) differs from Anchor.toml ($EXPECTED_ID)"
    echo "   Update Anchor.toml and frontend program.ts with the new ID"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Update frontend PROGRAM_ID if it changed"
echo "  2. Copy updated IDL: cp target/idl/coldstart_por.json apps/web/src/chain/idl/"
echo "  3. Run tests: anchor test --skip-local-validator --provider.cluster devnet"
