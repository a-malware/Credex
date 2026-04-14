import { Connection, clusterApiUrl } from '@solana/web3.js';
import { createHash } from 'crypto';

/**
 * SHA256 hash function
 */
function sha256(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest();
}

/**
 * Build a Merkle tree from an array of leaves
 * Pads to power of 2 and builds bottom-up
 */
export function buildMerkleTree(leaves: Buffer[]): { root: Buffer; depth: number } {
  if (leaves.length === 0) {
    throw new Error('Cannot build Merkle tree from empty leaves array');
  }

  // Pad leaves to next power of 2
  let layer = [...leaves];
  while (layer.length & (layer.length - 1)) {
    layer.push(layer[layer.length - 1]); // Duplicate last leaf
  }

  const depth = Math.log2(layer.length);

  // Build tree bottom-up
  while (layer.length > 1) {
    const nextLayer: Buffer[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const combined = Buffer.concat([layer[i], layer[i + 1]]);
      nextLayer.push(sha256(combined));
    }
    layer = nextLayer;
  }

  return { root: layer[0], depth };
}

/**
 * Get Merkle proof for a specific leaf index
 * Returns array of sibling hashes from leaf to root
 */
export function getMerkleProof(leaves: Buffer[], index: number): Buffer[] {
  if (index < 0 || index >= leaves.length) {
    throw new Error('Leaf index out of bounds');
  }

  // Pad leaves to power of 2
  let layer = [...leaves];
  while (layer.length & (layer.length - 1)) {
    layer.push(layer[layer.length - 1]);
  }

  const proof: Buffer[] = [];
  let idx = index;

  // Collect sibling hashes from leaf to root
  while (layer.length > 1) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    proof.push(layer[siblingIdx]);

    // Build next layer
    const nextLayer: Buffer[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const combined = Buffer.concat([layer[i], layer[i + 1]]);
      nextLayer.push(sha256(combined));
    }
    layer = nextLayer;
    idx = Math.floor(idx / 2);
  }

  return proof;
}

/**
 * Verify a Merkle proof
 * Returns true if the proof is valid
 */
export function verifyMerkleProof(
  root: Buffer,
  leaf: Buffer,
  proof: Buffer[],
  leafIndex: number
): boolean {
  let current = sha256(leaf);
  let index = leafIndex;

  for (const sibling of proof) {
    const combined = index % 2 === 0
      ? Buffer.concat([current, sibling])
      : Buffer.concat([sibling, current]);
    
    current = sha256(combined);
    index = Math.floor(index / 2);
  }

  return current.equals(root);
}

/**
 * Fetch recent Solana block hashes from mainnet
 * These will be used as leaves for the Merkle tree
 */
export async function fetchSolanaBlockHashes(
  connection: Connection,
  count: number = 20
): Promise<Buffer[]> {
  try {
    const slot = await connection.getSlot();
    const blockHashes: Buffer[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const block = await connection.getBlock(slot - i, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (block && block.blockhash) {
          // Convert blockhash string to Buffer
          blockHashes.push(Buffer.from(block.blockhash));
        }
      } catch (err) {
        console.warn(`Failed to fetch block at slot ${slot - i}:`, err);
      }
    }

    if (blockHashes.length === 0) {
      throw new Error('Failed to fetch any block hashes');
    }

    return blockHashes;
  } catch (error) {
    console.error('Error fetching Solana block hashes:', error);
    throw error;
  }
}

/**
 * Generate a complete Merkle tree dataset from Solana mainnet
 * Returns root, depth, and all leaves
 */
export async function generateTaskDataset(count: number = 20): Promise<{
  root: string;
  depth: number;
  leaves: string[];
}> {
  // Connect to mainnet to fetch real block hashes
  const connection = new Connection(clusterApiUrl('mainnet-beta'));
  
  const blockHashes = await fetchSolanaBlockHashes(connection, count);
  const tree = buildMerkleTree(blockHashes);

  return {
    root: tree.root.toString('hex'),
    depth: tree.depth,
    leaves: blockHashes.map(h => h.toString('hex')),
  };
}

/**
 * Helper: Convert hex string to Buffer
 */
export function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

/**
 * Helper: Convert Buffer to Uint8Array for Anchor
 */
export function bufferToUint8Array(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer);
}
