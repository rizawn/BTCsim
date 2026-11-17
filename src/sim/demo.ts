/**
 * CLI Debug Demo — prints first 5 epochs table to terminal.
 * Run with: npm run sim:demo
 */

import { Clock, Difficulty, computeEpochClockView, BLOCKS_PER_EPOCH } from './index';

function runDemo() {
  console.log('========================================================================');
  console.log(' SHA-256 TYCOON — SIM CORE DEMO (5 EPOCH PERTAMA)');
  console.log('========================================================================\n');

  const clock = new Clock();
  const diff = new Difficulty();

  // Simulated epoch durations in minutes (representing variable network hashrate):
  // Epoch 0 (Genesis): exactly 20,160 min (standard 10 min/block)
  // Epoch 1: 15,000 min (network hashrate grew ~34% -> faster)
  // Epoch 2: 10,000 min (hashrate surged -> fast epoch)
  // Epoch 3: 30,000 min (miner capitulation / difficulty dropped)
  // Epoch 4: 20,160 min (stabilized)
  const simulatedEpochMinutes = [20160, 15000, 10000, 30000, 20160];

  console.log(
    '| Epoch | Blok Awal | Blok Akhir | Durasi (menit) | Durasi (hari) | Difficulty Multiplier | Perubahan |'
  );
  console.log(
    '|-------|-----------|------------|----------------|---------------|-----------------------|-----------|'
  );

  let currentBlock = 0;

  for (let epoch = 0; epoch < 5; epoch++) {
    const startBlock = currentBlock;
    const endBlock = startBlock + BLOCKS_PER_EPOCH;
    const durationMin = simulatedEpochMinutes[epoch]!;
    const durationDays = (durationMin / (60 * 24)).toFixed(1);

    const oldDiff = diff.getDifficulty();
    const newDiff = diff.retarget(epoch, durationMin);
    const changePct = epoch === 0 ? '0.0%' : `${(((newDiff - oldDiff) / oldDiff) * 100).toFixed(1)}%`;

    const view = computeEpochClockView(endBlock);

    console.log(
      `|   ${epoch.toString().padEnd(3)} | ` +
      `${startBlock.toString().padStart(9)} | ` +
      `${endBlock.toString().padStart(10)} | ` +
      `${durationMin.toString().padStart(14)} | ` +
      `${durationDays.padStart(13)} | ` +
      `${newDiff.toFixed(4).padStart(21)} | ` +
      `${changePct.padStart(9)} |`
    );

    currentBlock = endBlock;
  }

  console.log('\n------------------------------------------------------------------------');
  console.log('Contoh HUD State di Blok 437.182 (Epoch 216):');
  const hudView = computeEpochClockView(437182);
  console.log(`Epoch: ${hudView.epochNumber}`);
  console.log(`Blok: ${hudView.blockHeight.toLocaleString('id-ID')} / ${hudView.nextEpochBlock.toLocaleString('id-ID')}`);
  console.log(`Retarget Progress: ${hudView.retargetProgress.toFixed(1)}%`);
  console.log(`Desync Active: ${hudView.isDesyncActive ? `YA (+${hudView.desyncExtraBlocks} blok)` : 'TIDAK'}`);
  console.log(`Blok ke Halving berikutnya: ${hudView.blocksToHalving.toLocaleString('id-ID')}`);
  console.log(`Block Reward: ${(hudView.blockRewardSatoshis / 1e8).toFixed(2)} BTC`);
  console.log('========================================================================\n');
}

runDemo();

