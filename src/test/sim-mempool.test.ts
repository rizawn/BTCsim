import { describe, it, expect } from 'vitest';
import { TreasuryManager, MempoolManager } from '@sim/index';

describe('FASE 7 Core: Treasury & Mempool (CLTV Timelock, Split/Merge)', () => {
  it('creates CLTV timelocked UTXO and automatically transitions locked -> confirmed when block reaches lockTime', () => {
    const tm = new TreasuryManager();

    // Lock 1 BTC until block 1000, current block is 500
    const cltv = tm.createTimelockUTXO(100_000_000, 1000, 500, 'HODL 1000');
    expect(cltv.status).toBe('locked');
    expect(tm.getTotalLockedSatoshis()).toBe(100_000_000);
    expect(tm.getTotalConfirmedSatoshis()).toBe(0);

    // Block advances to 999 -> still locked
    const unlocked999 = tm.processTimelocks(999);
    expect(unlocked999).toHaveLength(0);
    expect(cltv.status).toBe('locked');

    // Block reaches 1000 -> unlocked and becomes confirmed!
    const unlocked1000 = tm.processTimelocks(1000);
    expect(unlocked1000).toHaveLength(1);
    expect(cltv.status).toBe('confirmed');
    expect(tm.getTotalLockedSatoshis()).toBe(0);
    expect(tm.getTotalConfirmedSatoshis()).toBe(100_000_000);
  });

  it('splits confirmed UTXO into multiple outputs with change', () => {
    const tm = new TreasuryManager([
      { id: 'utxo_big', satoshis: 100_000_000, status: 'confirmed', createdBlock: 100 },
    ]);

    // Split 100M into [30M, 40M] with 30M change
    const split = tm.splitUTXO('utxo_big', [30_000_000, 40_000_000], 105);
    expect(split).not.toBeNull();
    expect(split).toHaveLength(3); // 2 requested + 1 change
    expect(tm.getTotalConfirmedSatoshis()).toBe(100_000_000);

    // Fail cases
    expect(tm.splitUTXO('non_existent', [1000], 100)).toBeNull();
    expect(tm.splitUTXO('utxo_big', [999_999_999], 100)).toBeNull(); // insufficient
    expect(tm.mergeUTXOs(['non_existent'], 100)).toBeNull();
  });

  it('merges multiple confirmed UTXOs into a single UTXO', () => {
    const tm = new TreasuryManager([
      { id: 'u1', satoshis: 10_000_000, status: 'confirmed', createdBlock: 10 },
      { id: 'u2', satoshis: 15_000_000, status: 'confirmed', createdBlock: 12 },
    ]);

    const merged = tm.mergeUTXOs(['u1', 'u2'], 20);
    expect(merged).not.toBeNull();
    expect(merged?.satoshis).toBe(25_000_000);
    expect(tm.getUTXOs()).toHaveLength(1);
    expect(tm.getTotalConfirmedSatoshis()).toBe(25_000_000);
  });

  it('sorts mempool txs by fee rate and packs blocks greedily', () => {
    const mm = new MempoolManager();
    mm.addTx({ txid: 'tx_low', satoshis: 10000, feeSatoshis: 200, vBytes: 200, feeRateSatVb: 1, receivedBlock: 50 });
    mm.addTx({ txid: 'tx_high', satoshis: 50000, feeSatoshis: 2000, vBytes: 200, feeRateSatVb: 10, receivedBlock: 50 });
    mm.addTx({ txid: 'tx_mid', satoshis: 30000, feeSatoshis: 1000, vBytes: 200, feeRateSatVb: 5, receivedBlock: 50 });

    expect(mm.getPendingCount()).toBe(3);

    // Pack block with limit of 400 vB (should fit tx_high and tx_mid first)
    const { packedTxs, totalFeeSatoshis } = mm.packBlock(400);
    expect(packedTxs).toHaveLength(2);
    expect(packedTxs[0]!.txid).toBe('tx_high');
    expect(packedTxs[1]!.txid).toBe('tx_mid');
    expect(totalFeeSatoshis).toBe(3000);

    // Remaining in mempool
    expect(mm.getPendingCount()).toBe(1);
    expect(mm.getTransactions()[0]!.txid).toBe('tx_low');
  });
});
