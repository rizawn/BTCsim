/**
 * MempoolTreasury — UTXO accounting, timelock (OP_CHECKLOCKTIMEVERIFY), and mempool management.
 *
 * Supported features:
 * - UTXO cards: confirmed, mempool, locked (CLTV)
 * - Timelock verification: transfers locked -> confirmed when blockHeight >= lockTime
 * - Split & merge UTXO operations
 * - Mempool fee prioritization (sat/vB)
 *
 * No Phaser dependency.
 */

export type UTXOStatus = 'confirmed' | 'mempool' | 'locked';

export interface UTXO {
  id: string;
  satoshis: number;
  status: UTXOStatus;
  /** Block height when created / included. */
  createdBlock: number;
  /** Required block height for timelock (OP_CHECKLOCKTIMEVERIFY). */
  lockUntilBlock?: number;
  label?: string;
}

export interface MempoolTx {
  txid: string;
  satoshis: number;
  feeSatoshis: number;
  vBytes: number;
  feeRateSatVb: number;
  receivedBlock: number;
}

export class TreasuryManager {
  private utxos: UTXO[] = [];

  constructor(initialUtxos?: UTXO[]) {
    if (initialUtxos) {
      this.utxos = [...initialUtxos];
    }
  }

  addUTXO(utxo: UTXO): void {
    this.utxos.push(utxo);
  }

  getUTXOs(): readonly UTXO[] {
    return this.utxos;
  }

  /**
   * Check and unlock any CLTV timelocked UTXOs if current block reaches threshold.
   */
  processTimelocks(currentBlock: number): UTXO[] {
    const unlocked: UTXO[] = [];
    for (const u of this.utxos) {
      if (u.status === 'locked' && u.lockUntilBlock !== undefined && currentBlock >= u.lockUntilBlock) {
        u.status = 'confirmed';
        unlocked.push(u);
      }
    }
    return unlocked;
  }

  /**
   * Create a timelocked UTXO (OP_CHECKLOCKTIMEVERIFY).
   */
  createTimelockUTXO(satoshis: number, lockUntilBlock: number, currentBlock: number, label = 'CLTV Vault'): UTXO {
    const utxo: UTXO = {
      id: `utxo_cltv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      satoshis,
      status: currentBlock >= lockUntilBlock ? 'confirmed' : 'locked',
      createdBlock: currentBlock,
      lockUntilBlock,
      label,
    };
    this.utxos.push(utxo);
    return utxo;
  }

  /**
   * Split an existing confirmed UTXO into multiple denominations.
   */
  splitUTXO(utxoId: string, amounts: number[], currentBlock: number): UTXO[] | null {
    const index = this.utxos.findIndex((u) => u.id === utxoId && u.status === 'confirmed');
    if (index === -1) return null;

    const source = this.utxos[index]!;
    const totalSplit = amounts.reduce((a, b) => a + b, 0);
    if (totalSplit > source.satoshis) return null; // Insufficient funds

    // Remove source
    this.utxos.splice(index, 1);

    const newUtxos: UTXO[] = amounts.map((sat, i) => ({
      id: `utxo_split_${Date.now()}_${i}`,
      satoshis: sat,
      status: 'confirmed',
      createdBlock: currentBlock,
      label: `Split ${i + 1}`,
    }));

    // Add change if any
    const change = source.satoshis - totalSplit;
    if (change > 0) {
      newUtxos.push({
        id: `utxo_change_${Date.now()}`,
        satoshis: change,
        status: 'confirmed',
        createdBlock: currentBlock,
        label: 'Change',
      });
    }

    this.utxos.push(...newUtxos);
    return newUtxos;
  }

  /**
   * Merge multiple confirmed UTXOs into a single UTXO.
   */
  mergeUTXOs(utxoIds: string[], currentBlock: number): UTXO | null {
    const confirmedToMerge: UTXO[] = [];

    for (const id of utxoIds) {
      const u = this.utxos.find((item) => item.id === id && item.status === 'confirmed');
      if (!u) return null;
      confirmedToMerge.push(u);
    }

    const total = confirmedToMerge.reduce((acc, u) => acc + u.satoshis, 0);

    // Remove merged
    this.utxos = this.utxos.filter((u) => !utxoIds.includes(u.id));

    const merged: UTXO = {
      id: `utxo_merged_${Date.now()}`,
      satoshis: total,
      status: 'confirmed',
      createdBlock: currentBlock,
      label: `Merged (${confirmedToMerge.length} UTXOs)`,
    };

    this.utxos.push(merged);
    return merged;
  }

  getTotalConfirmedSatoshis(): number {
    return this.utxos
      .filter((u) => u.status === 'confirmed')
      .reduce((acc, u) => acc + u.satoshis, 0);
  }

  getTotalLockedSatoshis(): number {
    return this.utxos
      .filter((u) => u.status === 'locked')
      .reduce((acc, u) => acc + u.satoshis, 0);
  }
}

/**
 * Simple Mempool Manager to simulate incoming transactions and block packing.
 */
export class MempoolManager {
  private queue: MempoolTx[] = [];

  addTx(tx: MempoolTx): void {
    this.queue.push(tx);
    // Sort descending by fee rate (sat/vB)
    this.queue.sort((a, b) => b.feeRateSatVb - a.feeRateSatVb);
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  getTransactions(): readonly MempoolTx[] {
    return this.queue;
  }

  /**
   * Pack transactions for the next block up to maxWeight (e.g. 4,000,000 weight units / ~1,000,000 vB).
   * Returns packed txs and total fees collected.
   */
  packBlock(maxVBytes = 1_000_000): { packedTxs: MempoolTx[]; totalFeeSatoshis: number } {
    let currentVBytes = 0;
    let totalFeeSatoshis = 0;
    const packedTxs: MempoolTx[] = [];
    const remaining: MempoolTx[] = [];

    for (const tx of this.queue) {
      if (currentVBytes + tx.vBytes <= maxVBytes) {
        packedTxs.push(tx);
        currentVBytes += tx.vBytes;
        totalFeeSatoshis += tx.feeSatoshis;
      } else {
        remaining.push(tx);
      }
    }

    this.queue = remaining;
    return { packedTxs, totalFeeSatoshis };
  }
}

