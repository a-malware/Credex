# ColdStart-PoR Devnet Deployment Script
# This script deploys the smart contract to Solana devnet

$ErrorActionPreference = "Stop"

Write-Host "🚀 ColdStart-PoR Devnet Deployment" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Solana CLI is installed
try {
    $solanaVersion = solana --version 2>&1
    Write-Host "✓ Solana CLI found: $solanaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Solana CLI not found" -ForegroundColor Red
    Write-Host "Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
}

# Check if Anchor is installed
try {
    $anchorVersion = anchor --version 2>&1
    Write-Host "✓ Anchor CLI found: $anchorVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Anchor CLI not found" -ForegroundColor Red
    Write-Host "Install from: https://www.anchor-lang.com/docs/installation"
    exit 1
}

Write-Host ""

# Configure Solana CLI for devnet
Write-Host "📡 Configuring Solana CLI for devnet..." -ForegroundColor Yellow
solana config set --url devnet
Write-Host ""

# Check wallet balance
Write-Host "💰 Checking wallet balance..." -ForegroundColor Yellow
$balance = solana balance
Write-Host "Current balance: $balance" -ForegroundColor White
Write-Host ""

# Check if balance is sufficient (need at least 2 SOL)
if ($balance -match "^0(\.\d+)?\s+SOL$" -or $balance -eq "0 SOL") {
    Write-Host "⚠️  Insufficient balance for deployment" -ForegroundColor Yellow
    Write-Host "💸 Requesting airdrop..." -ForegroundColor Yellow
    try {
        solana airdrop 2
    } catch {
        Write-Host "⚠️  Airdrop failed. Request manually from https://faucet.solana.com" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Build the program
Write-Host "🔨 Building program..." -ForegroundColor Yellow
anchor build
Write-Host ""

# Deploy to devnet
Write-Host "🚀 Deploying to devnet..." -ForegroundColor Yellow
anchor deploy --provider.cluster devnet
Write-Host ""

# Get deployed program ID
$programId = solana address -k target/deploy/coldstart_por-keypair.json
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Deployment Details:" -ForegroundColor Cyan
Write-Host "  Program ID: $programId" -ForegroundColor White
Write-Host "  Cluster: devnet" -ForegroundColor White
$explorerUrl = "https://explorer.solana.com/address/$programId" + "?cluster=devnet"
Write-Host "  Explorer: $explorerUrl" -ForegroundColor White
Write-Host ""

# Verify program ID matches Anchor.toml
$expectedId = "CFK9b4RXvcmJKfxodF5HNshWGfkvoQ2iAaN9eyRJnGfh"
if ($programId -ne $expectedId) {
    Write-Host "⚠️  Warning: Deployed program ID ($programId) differs from Anchor.toml ($expectedId)" -ForegroundColor Yellow
    Write-Host "   Update Anchor.toml and frontend program.ts with the new ID" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update frontend PROGRAM_ID if it changed"
Write-Host "  2. Copy updated IDL: cp target/idl/coldstart_por.json apps/web/src/chain/idl/"
$testCommand = "anchor test --skip-local-validator --provider.cluster devnet"
Write-Host "  3. Run tests: $testCommand"
