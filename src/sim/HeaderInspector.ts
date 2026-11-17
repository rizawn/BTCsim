/**
 * HeaderInspector — 80-byte Bitcoin Block Header Parser & nBits Compact Format Decoder.
 * References:
 * - https://developer.bitcoin.org/reference/block_chain.html
 * - Genesis target: 0x1d00ffff
 *
 * Header 80-byte fields:
 * 1. Version (4 bytes, little-endian)
 * 2. Previous Block Hash (32 bytes)
 * 3. Merkle Root (32 bytes)
 * 4. Timestamp (4 bytes, little-endian)
 * 5. nBits (4 bytes, compact target representation)
 * 6. Nonce (4 bytes, little-endian)
 *
 * No Phaser dependency.
 */

export interface BlockHeader {
  version: number;
  prevBlockHash: string;
  merkleRoot: string;
  timestamp: number;
  nBits: number;
  nonce: number;
}

export interface DecodedNBits {
  nBitsHex: string;
  exponent: number;
  mantissa: number;
  targetHex: string;
  difficulty: number;
}

export interface HeaderAnalysis {
  header: BlockHeader;
  decodedNBits: DecodedNBits;
  humanTimestamp: string;
  byteSize: number;
  fields: {
    name: string;
    bytes: number;
    value: string;
    description: string;
  }[];
}

/**
 * Decode nBits compact target format.
 *
 * Format: 0xEECCCCCC
 * where EE is the exponent (in base 256), CCCCCC is the mantissa.
 * target = mantissa * 256^(exponent - 3)
 */
export function decodeNBits(nBits: number): DecodedNBits {
  const nBitsHex = '0x' + (nBits >>> 0).toString(16).padStart(8, '0');
  const exponent = (nBits >>> 24) & 0xff;
  const mantissa = nBits & 0x007fffff;

  // Max / Genesis difficulty-1 target (0x1d00ffff)
  // mantissa: 0x00ffff, exp: 0x1d
  const genesisExponent = 0x1d;
  const genesisMantissa = 0x00ffff;

  // Calculate difficulty relative to genesis
  // diff = (genesisMantissa / mantissa) * 256^(genesisExponent - exponent)
  const expDiff = genesisExponent - exponent;
  const difficulty = (genesisMantissa / (mantissa || 1)) * Math.pow(256, expDiff);

  // Generate 64-char hex target string
  let targetHex = mantissa.toString(16).padStart(6, '0');
  const trailingZeros = Math.max(0, (exponent - 3) * 2);
  targetHex = targetHex + '0'.repeat(trailingZeros);
  targetHex = targetHex.padStart(64, '0').slice(-64);

  return {
    nBitsHex,
    exponent,
    mantissa,
    targetHex: '0x' + targetHex,
    difficulty: Math.max(1, difficulty),
  };
}

/**
 * Inspect an 80-byte Bitcoin block header.
 */
export function inspectBlockHeader(header: BlockHeader): HeaderAnalysis {
  const decoded = decodeNBits(header.nBits);
  const date = new Date(header.timestamp * 1000).toISOString();

  return {
    header,
    decodedNBits: decoded,
    humanTimestamp: date,
    byteSize: 80,
    fields: [
      {
        name: 'Version',
        bytes: 4,
        value: `0x${header.version.toString(16).padStart(8, '0')} (${header.version})`,
        description: 'Menentukan aturan konsensus dan soft-fork bip yang didukung blok ini.',
      },
      {
        name: 'Previous Block Hash',
        bytes: 32,
        value: header.prevBlockHash,
        description: 'Tautan kriptografis ke blok sebelumnya yang menyusun rantai (blockchain).',
      },
      {
        name: 'Merkle Root',
        bytes: 32,
        value: header.merkleRoot,
        description: 'Ringkasan kriptografis dari seluruh transaksi di dalam blok ini.',
      },
      {
        name: 'Timestamp',
        bytes: 4,
        value: `${header.timestamp} (${date})`,
        description: 'Waktu perkiraan blok ditambang (dalam detik Unix epoch).',
      },
      {
        name: 'nBits (Compact Difficulty)',
        bytes: 4,
        value: `${decoded.nBitsHex} (Diff: ${decoded.difficulty.toLocaleString('id-ID', { maximumFractionDigits: 2 })})`,
        description: 'Format ringkas target proof-of-work yang harus dicapai oleh hash blok.',
      },
      {
        name: 'Nonce',
        bytes: 4,
        value: `0x${(header.nonce >>> 0).toString(16).padStart(8, '0')} (${header.nonce})`,
        description: 'Variabel 32-bit yang diubah penambang untuk menemukan hash di bawah target.',
      },
    ],
  };
}

/**
 * Creates a sample genesis block header.
 */
export function createGenesisBlockHeader(): BlockHeader {
  return {
    version: 1,
    prevBlockHash: '0000000000000000000000000000000000000000000000000000000000000000',
    merkleRoot: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
    timestamp: 1231006505, // Jan 03 2009 18:15:05 UTC
    nBits: 0x1d00ffff,     // Difficulty-1 target
    nonce: 2083236893,
  };
}

