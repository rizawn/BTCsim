import Phaser from 'phaser';
import {
  Clock,
  Difficulty,
  Market,
  createRigInstance,
  getEffectiveHashrate,
  getEffectiveJth,
  updateHeat,
  electricityCostPerSecond,
  ppsRevenuePerTick,
  computeEpochClockView,
  formatEpochClockDisplay,
  breakevenJth,
  computeAvalanche,
  gamblerRuinProbability,
  createGenesisBlockHeader,
  inspectBlockHeader,
  TreasuryManager,
  MempoolManager,
  RigInstance,
  RIG_SPECS,
  LOCATIONS,
  SpeedMultiplier,
} from '@sim/index';
import { formatNumber, formatEngineering, formatBTC } from '@format/numbers';
import { globalAudio } from '../AudioSystem';
import { getStoryEvents, StoryEvent } from '../EventSystem';

type TabType = 'NODE' | 'SILICON' | 'TREASURY' | 'WARFARE';

export class BoardScene extends Phaser.Scene {
  // Sim Subsystems
  private clock!: Clock;
  private difficulty!: Difficulty;
  private market!: Market;
  private treasuryMgr!: TreasuryManager;
  private mempoolMgr!: MempoolManager;

  // Player State
  private rigs: RigInstance[] = [];
  private activeLocation = LOCATIONS[0]!;
  private fiatUSD = 150.0;
  private joulesConsumed = 0;
  private currentTab: TabType = 'SILICON';

  // Visual & HUD Objects
  private envBg!: Phaser.GameObjects.Image;
  private hudClockText!: Phaser.GameObjects.Text;
  private resBtcText!: Phaser.GameObjects.Text;
  private resFiatText!: Phaser.GameObjects.Text;
  private resPowerText!: Phaser.GameObjects.Text;
  private resHeatText!: Phaser.GameObjects.Text;
  private resHashText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;

  // Clock Widget Graphics
  private epochClockGfx!: Phaser.GameObjects.Graphics;

  // Tab Containers
  private tabContainerNode!: Phaser.GameObjects.Container;
  private tabContainerSilicon!: Phaser.GameObjects.Container;
  private tabContainerTreasury!: Phaser.GameObjects.Container;
  private tabContainerWarfare!: Phaser.GameObjects.Container;

  // Dialog & Modal Container
  private modalContainer!: Phaser.GameObjects.Container;

  // Active Story Events
  private storyEvents: StoryEvent[] = [];
  private hasSeenTutorial = false;

  constructor() {
    super({ key: 'BoardScene' });
  }

  create(): void {
    // 1. Initialize Audio
    globalAudio.init();

    // 2. Initialize Sim Engines
    this.clock = new Clock();
    this.difficulty = new Difficulty();
    this.market = new Market();
    this.treasuryMgr = new TreasuryManager();
    this.mempoolMgr = new MempoolManager();
    this.storyEvents = getStoryEvents();

    // Starter rig: CPU laptop Genesis
    this.rigs.push(createRigInstance('cpu_genesis', 1));

    // Starter UTXO: 50 BTC from Genesis block
    this.treasuryMgr.addUTXO({
      id: 'utxo_genesis_coinbase',
      satoshis: 5_000_000_000,
      status: 'confirmed',
      createdBlock: 0,
      label: 'Genesis Coinbase ₿50',
    });

    // Populate initial mempool txs
    for (let i = 1; i <= 6; i++) {
      this.mempoolMgr.addTx({
        txid: `tx_${Math.random().toString(16).slice(2, 8)}`,
        satoshis: 100_000 * i,
        feeSatoshis: 150 * i,
        vBytes: 140,
        feeRateSatVb: Math.round(150 / 140 * i),
        receivedBlock: 0,
      });
    }

    // 3. Render Background
    this.envBg = this.add.image(640, 360, 'env_01_kamar_kos');
    this.envBg.setDisplaySize(1280, 720);

    // 4. Setup Permanent HUD & Tabs
    this.createPermanentHUD();
    this.createTabButtons();
    this.createTabContainers();

    // 5. Setup Input & Hotkeys
    this.setupInputHandlers();

    // 6. Connect Sim Events
    this.clock.on('block-ticked', (data) => this.onBlockTicked(data));
    this.clock.on('epoch-ended', (data) => this.onEpochEnded(data));

    // 7. Show Satoshi-san Onboarding Dialog
    this.showSatoshiOnboarding();
  }

  private createPermanentHUD(): void {
    // Top Bar Background
    const topBar = this.add.graphics();
    topBar.fillStyle(0x1a1d23, 0.92);
    topBar.fillRect(0, 0, 1280, 54);
    topBar.lineStyle(2, 0x2c3e50, 1);
    topBar.lineBetween(0, 54, 1280, 54);

    // Resource displays
    // BTC
    this.add.image(24, 27, 'icons', 'icon_res_btc').setDisplaySize(28, 28);
    this.resBtcText = this.add.text(44, 18, '₿ 50,00000000', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '14px',
      color: '#5CA86A',
    });

    // Fiat USD
    this.add.image(210, 27, 'icons', 'icon_res_fiat').setDisplaySize(28, 28);
    this.resFiatText = this.add.text(230, 18, '$ 150,00', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '14px',
      color: '#E6E3DA',
    });

    // Hashrate (Player vs Network)
    this.add.image(380, 27, 'icons', 'icon_status_rig').setDisplaySize(28, 28);
    this.resHashText = this.add.text(400, 18, '1 MH/s', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '14px',
      color: '#4FA3A5',
    });

    // Power & Watts
    this.add.image(530, 27, 'icons', 'icon_res_joule').setDisplaySize(28, 28);
    this.resPowerText = this.add.text(550, 18, '65 W ($0,15/kWh)', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '14px',
      color: '#E8A04C',
    });

    // Heat Level
    this.add.image(740, 27, 'icons', 'icon_res_heat').setDisplaySize(28, 28);
    this.resHeatText = this.add.text(760, 18, '0% AMAN', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '14px',
      color: '#5CA86A',
    });

    // Speed Controls (Right Side)
    const speedBg = this.add.graphics();
    speedBg.fillStyle(0x0d0f13, 0.8);
    speedBg.fillRoundedRect(1020, 10, 240, 34, 4);

    this.speedText = this.add.text(1035, 18, 'PAUSE | 1x | [10x] | 60x | 300x', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      color: '#E8A04C',
    });

    // Epoch Clock HUD (Bottom Left)
    this.epochClockGfx = this.add.graphics();
    this.hudClockText = this.add.text(160, 650, '', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '13px',
      color: '#4FA3A5',
      lineSpacing: 4,
    });

    this.renderEpochClockVisual(0);
  }

  private createTabButtons(): void {
    const tabs: { key: TabType; name: string; icon: string; x: number }[] = [
      { key: 'NODE', name: 'NODE & MEMPOOL', icon: 'icon_tab_node_mempool', x: 200 },
      { key: 'SILICON', name: 'SILICON & INFRA', icon: 'icon_tab_silicon_infra', x: 440 },
      { key: 'TREASURY', name: 'TREASURY & SCRIPT', icon: 'icon_tab_treasury_script', x: 680 },
      { key: 'WARFARE', name: 'CONSENSUS & WARFARE', icon: 'icon_tab_consensus_warfare', x: 920 },
    ];

    const tabY = 85;

    for (const t of tabs) {
      const btnBg = this.add.graphics();
      btnBg.fillStyle(this.currentTab === t.key ? 0x2c3e50 : 0x1a1d23, 0.9);
      btnBg.fillRoundedRect(t.x - 100, tabY - 20, 200, 40, 6);
      btnBg.lineStyle(1, this.currentTab === t.key ? 0x4fa3a5 : 0x0d0f13, 1);
      btnBg.strokeRoundedRect(t.x - 100, tabY - 20, 200, 40, 6);

      const icon = this.add.image(t.x - 75, tabY, 'icons', t.icon).setDisplaySize(24, 24);
      const text = this.add.text(t.x - 55, tabY - 8, t.name, {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        color: this.currentTab === t.key ? '#E8A04C' : '#8E95A1',
      });

      const hitZone = this.add.zone(t.x, tabY, 200, 40).setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => {
        this.switchTab(t.key);
      });
    }
  }

  private createTabContainers(): void {
    this.tabContainerNode = this.add.container(0, 115);
    this.tabContainerSilicon = this.add.container(0, 115);
    this.tabContainerTreasury = this.add.container(0, 115);
    this.tabContainerWarfare = this.add.container(0, 115);

    this.modalContainer = this.add.container(0, 0);
    this.modalContainer.setDepth(100);

    // Build contents for each tab
    this.buildSiliconTab();
    this.buildNodeTab();
    this.buildTreasuryTab();
    this.buildWarfareTab();

    // Set initial active tab
    this.switchTab('SILICON');
  }

  private switchTab(tab: TabType): void {
    this.currentTab = tab;
    this.tabContainerNode.setVisible(tab === 'NODE');
    this.tabContainerSilicon.setVisible(tab === 'SILICON');
    this.tabContainerTreasury.setVisible(tab === 'TREASURY');
    this.tabContainerWarfare.setVisible(tab === 'WARFARE');
  }

  // ═══════════════════════════════════════════════════════════════
  // TAB BUILDERS
  // ═══════════════════════════════════════════════════════════════

  private buildSiliconTab(): void {
    const c = this.tabContainerSilicon;

    // Shelf background
    const shelf = this.add.graphics();
    shelf.fillStyle(0x1a1d23, 0.75);
    shelf.fillRoundedRect(80, 20, 1120, 480, 8);
    shelf.lineStyle(2, 0x2c3e50, 1);
    shelf.strokeRoundedRect(80, 20, 1120, 480, 8);
    c.add(shelf);

    // Title
    const title = this.add.text(105, 35, 'HARDWARE MINING RIGS & RACK', {
      fontFamily: '"Bitter", serif',
      fontSize: '20px',
      color: '#E8A04C',
    });
    c.add(title);

    // Display Rigs (Sprite grid)
    let startX = 120;
    const startY = 100;

    for (let i = 0; i < RIG_SPECS.length - 1; i++) {
      const spec = RIG_SPECS[i]!;
      const isOwned = this.rigs.some((r) => r.specId === spec.id);

      const rigBox = this.add.graphics();
      rigBox.fillStyle(0x0d0f13, 0.6);
      rigBox.fillRoundedRect(startX, startY, 140, 180, 6);
      rigBox.lineStyle(1, isOwned ? 0x5ca86a : 0x2c3e50, 1);
      rigBox.strokeRoundedRect(startX, startY, 140, 180, 6);
      c.add(rigBox);

      // Rig Sprite
      const sprite = this.add.image(startX + 70, startY + 70, 'sprites', spec.spriteKey);
      sprite.setDisplaySize(110, 96);
      if (!isOwned) sprite.setTint(0x555555);
      c.add(sprite);

      // Name & J/TH
      const nameText = this.add.text(startX + 10, startY + 125, spec.name, {
        fontFamily: '"Source Sans 3", sans-serif',
        fontSize: '11px',
        color: '#E6E3DA',
        wordWrap: { width: 120 },
      });
      c.add(nameText);

      const jthText = this.add.text(startX + 10, startY + 155, `${spec.baseJth} J/TH`, {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        color: '#E8A04C',
      });
      c.add(jthText);

      // Interactive Click for Details Modal
      const zone = this.add.zone(startX + 70, startY + 90, 140, 180).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.showRigDetailModal(spec));
      c.add(zone);

      startX += 155;
    }

    // Breakeven Radar & Thermal Widget preview on bottom shelf
    const widgetBg = this.add.graphics();
    widgetBg.fillStyle(0x0d0f13, 0.85);
    widgetBg.fillRoundedRect(100, 310, 520, 160, 6);
    widgetBg.fillRoundedRect(660, 310, 520, 160, 6);
    c.add(widgetBg);

    // Breakeven text
    const beTitle = this.add.text(120, 325, 'BREAKEVEN RADAR (BE = PRICE / 2530)', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      color: '#4FA3A5',
    });
    c.add(beTitle);

    const price = this.market.getPrice();
    const beVal = breakevenJth(price);
    const beDesc = this.add.text(120, 355, 
      `Harga BTC : $ ${formatNumber(price, 2)}\nBreak-Even : ${beVal.toFixed(1)} J/TH\nRig di atas ${beVal.toFixed(1)} J/TH merugi listrik!`, {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      color: '#E6E3DA',
      lineSpacing: 6,
    });
    c.add(beDesc);

    // Thermal Map Widget
    const thTitle = this.add.text(680, 325, 'THERMAL MAP PER-CHIP STATUS', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      color: '#E8A04C',
    });
    c.add(thTitle);

    // Mini chip grid
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 8; col++) {
        const chip = this.add.graphics();
        chip.fillStyle(0x4fa3a5, 0.8);
        chip.fillRoundedRect(680 + col * 28, 360 + r * 28, 22, 22, 3);
        c.add(chip);
      }
    }
  }

  private buildNodeTab(): void {
    const c = this.tabContainerNode;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1d23, 0.85);
    bg.fillRoundedRect(80, 20, 1120, 480, 8);
    c.add(bg);

    const title = this.add.text(105, 35, 'NODE & MEMPOOL — BLOCKCHAIN INSPECTOR', {
      fontFamily: '"Bitter", serif',
      fontSize: '20px',
      color: '#4FA3A5',
    });
    c.add(title);

    // 80-byte Header Inspector Widget
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x0d0f13, 0.9);
    headerBg.fillRoundedRect(100, 75, 1080, 240, 6);
    headerBg.lineStyle(1, 0x4fa3a5, 1);
    headerBg.strokeRoundedRect(100, 75, 1080, 240, 6);
    c.add(headerBg);

    const header = createGenesisBlockHeader();
    const analysis = inspectBlockHeader(header);

    const headerText = this.add.text(120, 90, 
      `BITCOIN 80-BYTE BLOCK HEADER INSPECTOR (GENESIS BLOCK)\n` +
      `------------------------------------------------------------------------------------------------\n` +
      analysis.fields.map((f) => `${f.name.padEnd(28)} : ${f.value}`).join('\n'), {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      color: '#E6E3DA',
      lineSpacing: 8,
    });
    c.add(headerText);

    // Mempool Queue Preview
    const memTitle = this.add.text(105, 335, 'ANTREAN MEMPOOL TERKINI (PRIORITAS FEE SAT/VB)', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '13px',
      color: '#E8A04C',
    });
    c.add(memTitle);

    let txX = 100;
    const txs = this.mempoolMgr.getTransactions();
    for (const tx of txs.slice(0, 5)) {
      const txBox = this.add.graphics();
      txBox.fillStyle(0x0d0f13, 0.8);
      txBox.fillRoundedRect(txX, 365, 200, 110, 4);
      txBox.lineStyle(1, 0xe8a04c, 0.8);
      txBox.strokeRoundedRect(txX, 365, 200, 110, 4);
      c.add(txBox);

      const info = this.add.text(txX + 10, 375, 
        `TX: ${tx.txid}\n` +
        `Nilai: ₿ ${(tx.satoshis / 1e8).toFixed(4)}\n` +
        `Fee: ${tx.feeSatoshis} sat\n` +
        `Rate: ${tx.feeRateSatVb} sat/vB`, {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        color: '#E6E3DA',
        lineSpacing: 4,
      });
      c.add(info);

      txX += 215;
    }
  }

  private buildTreasuryTab(): void {
    const c = this.tabContainerTreasury;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1d23, 0.85);
    bg.fillRoundedRect(80, 20, 1120, 480, 8);
    c.add(bg);

    const title = this.add.text(105, 35, 'TREASURY & UTXO SCRIPT BOARD', {
      fontFamily: '"Bitter", serif',
      fontSize: '20px',
      color: '#5CA86A',
    });
    c.add(title);

    // UTXO Playing Cards
    const utxos = this.treasuryMgr.getUTXOs();
    let cardX = 105;
    const cardY = 85;

    for (const u of utxos) {
      const card = this.add.image(cardX + 64, cardY + 90, 'sprites', 'obj_utxo_confirmed');
      card.setDisplaySize(128, 180);
      c.add(card);

      const satText = this.add.text(cardX + 15, cardY + 120, `₿ ${(u.satoshis / 1e8).toFixed(2)}`, {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '14px',
        color: '#1A1D23',
      });
      c.add(satText);

      cardX += 145;
    }

    // CLTV Timelock Action Panel
    const actionBg = this.add.graphics();
    actionBg.fillStyle(0x0d0f13, 0.9);
    actionBg.fillRoundedRect(100, 290, 1080, 190, 6);
    c.add(actionBg);

    const cltvTitle = this.add.text(125, 305, 'SMART SCRIPT: OP_CHECKLOCKTIMEVERIFY (TIMELOCK VAULT)', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '13px',
      color: '#4FA3A5',
    });
    c.add(cltvTitle);

    const cltvDesc = this.add.text(125, 335, 
      'Kunci sebagian saldo Bitcoin Anda di UTXO aman yang tidak dapat dibelanjakan sebelum blok tertentu.\n' +
      'Mekanisme ini mencegah panic-selling saat bear market dan mengamankan kas masa depan.', {
      fontFamily: '"Source Sans 3", sans-serif',
      fontSize: '13px',
      color: '#E6E3DA',
      lineSpacing: 4,
    });
    c.add(cltvDesc);

    // Button Lock 1 BTC
    const lockBtn = this.add.graphics();
    lockBtn.fillStyle(0x2c3e50, 1);
    lockBtn.fillRoundedRect(125, 395, 240, 40, 4);
    c.add(lockBtn);

    const lockText = this.add.text(145, 407, 'Kunci ₿ 1 (100 Blok CLTV)', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      color: '#5CA86A',
    });
    c.add(lockText);

    const lockZone = this.add.zone(245, 415, 240, 40).setInteractive({ useHandCursor: true });
    lockZone.on('pointerdown', () => {
      this.treasuryMgr.createTimelockUTXO(100_000_000, this.clock.getBlockHeight() + 100, this.clock.getBlockHeight());
      this.switchTab('TREASURY');
    });
    c.add(lockZone);
  }

  private buildWarfareTab(): void {
    const c = this.tabContainerWarfare;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1d23, 0.85);
    bg.fillRoundedRect(80, 20, 1120, 480, 8);
    c.add(bg);

    const title = this.add.text(105, 35, 'CONSENSUS & WARFARE — GAMBLER\'S RUIN & AVALANCHE', {
      fontFamily: '"Bitter", serif',
      fontSize: '20px',
      color: '#B85C5C',
    });
    c.add(title);

    // Gambler's Ruin Heist Meter Box
    const heistBg = this.add.graphics();
    heistBg.fillStyle(0x0d0f13, 0.85);
    heistBg.fillRoundedRect(100, 75, 520, 240, 6);
    heistBg.lineStyle(1, 0xb85c5c, 1);
    heistBg.strokeRoundedRect(100, 75, 520, 240, 6);
    c.add(heistBg);

    const heistTitle = this.add.text(120, 90, 'GAMBLER\'S RUIN METER (§2.4)', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      color: '#B85C5C',
    });
    c.add(heistTitle);

    const pHeist = gamblerRuinProbability(0.3, 24);
    const heistDesc = this.add.text(120, 120, 
      `Attacker Hashrate (q) : 30% (0.3)\n` +
      `Confirmations (z)     : 24 blok\n` +
      `P (Serang Sukses)     : 1,47 × 10⁻⁹\n` +
      `Status Meter          : ZONA AMAN (TEAL)`, {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      color: '#E6E3DA',
      lineSpacing: 8,
    });
    c.add(heistDesc);

    // Avalanche Barcode Box
    const avaBg = this.add.graphics();
    avaBg.fillStyle(0x0d0f13, 0.85);
    avaBg.fillRoundedRect(660, 75, 520, 240, 6);
    avaBg.lineStyle(1, 0x4fa3a5, 1);
    avaBg.strokeRoundedRect(660, 75, 520, 240, 6);
    c.add(avaBg);

    const avaTitle = this.add.text(680, 90, 'AVALANCHE 256-BIT SPECTACLE (DOUBLE-SHA-256)', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      color: '#4FA3A5',
    });
    c.add(avaTitle);

    const avaRes = computeAvalanche('block_437182_a', 'block_437182_b');
    const avaDesc = this.add.text(680, 120, 
      `Hash A: ${avaRes.hashHexA.slice(0, 28)}...\n` +
      `Hash B: ${avaRes.hashHexB.slice(0, 28)}...\n` +
      `Perbedaan Bit : ${avaRes.diffCount} / 256 bit (${avaRes.diffPercent.toFixed(1)}%)\n` +
      `Status         : Avalanche Akurat (~128 ± 8 bit)`, {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      color: '#E8A04C',
      lineSpacing: 8,
    });
    c.add(avaDesc);
  }

  // ═══════════════════════════════════════════════════════════════
  // SIM TICK & HUD UPDATES
  // ═══════════════════════════════════════════════════════════════

  private onBlockTicked(data: { blockHeight: number; gameTimeSeconds: number }): void {
    // 1. Tick Market Price
    this.market.tick();

    // 2. Calculate Rig Production & Heat
    let totalHash = 0;
    let totalWatts = 0;

    for (const inst of this.rigs) {
      const spec = RIG_SPECS.find((s) => s.id === inst.specId)!;
      const heatUpdate = updateHeat(inst, 10);
      inst.heat = heatUpdate.heat;
      inst.status = heatUpdate.newStatus;

      totalHash += getEffectiveHashrate(spec, inst);
      const jth = getEffectiveJth(spec, inst);
      totalWatts += totalHash * jth;
    }

    // Update continuous audio pitch
    const avgHeat = this.rigs.reduce((a, b) => a + b.heat, 0) / (this.rigs.length || 1);
    globalAudio.updateFanPitch(avgHeat);

    // 3. Electricity Bill
    const elecCost = electricityCostPerSecond(totalHash, 98, this.activeLocation.pricePerKwh) * 600;
    this.fiatUSD -= elecCost;
    this.joulesConsumed += totalWatts * 600;

    // 4. Mining Revenue (PPS from Slush template)
    const blockReward = this.clock.getBlockReward();
    const networkHash = Math.max(100_000, totalHash * 10_000);
    const earnedSats = ppsRevenuePerTick(blockReward, totalHash, networkHash, 0.02);

    if (earnedSats > 0) {
      this.treasuryMgr.addUTXO({
        id: `utxo_reward_${data.blockHeight}`,
        satoshis: Math.floor(earnedSats),
        status: 'confirmed',
        createdBlock: data.blockHeight,
        label: `Block ${data.blockHeight} Payout`,
      });
      globalAudio.playBlockFound();
    }

    // 5. Check Timelocked UTXOs
    this.treasuryMgr.processTimelocks(data.blockHeight);

    // 6. Update HUD Displays
    this.updateHUDText(data.blockHeight, totalHash, totalWatts, avgHeat);
    this.renderEpochClockVisual(data.blockHeight);
  }

  private onEpochEnded(data: { epochNumber: number; blockHeight: number; epochDurationMinutes: number }): void {
    this.difficulty.retarget(data.epochNumber, data.epochDurationMinutes);
    globalAudio.playEpochTick(data.epochNumber);

    // Check story events
    const nextEvent = this.storyEvents.find((e) => e.minEra <= 2);
    if (nextEvent) {
      this.showStoryDialog(nextEvent);
    }
  }

  private updateHUDText(blockHeight: number, totalHash: number, totalWatts: number, avgHeat: number): void {
    const totalSats = this.treasuryMgr.getTotalConfirmedSatoshis();
    this.resBtcText.setText(formatBTC(totalSats));
    this.resFiatText.setText(`$ ${formatNumber(this.fiatUSD, 2)}`);
    this.resHashText.setText(formatEngineering(totalHash * 1e12) + 'H/s');
    this.resPowerText.setText(`${Math.round(totalWatts)} W ($${this.activeLocation.pricePerKwh}/kWh)`);

    const heatPct = Math.round(avgHeat * 100);
    this.resHeatText.setText(`${heatPct}% ${heatPct > 70 ? 'THROTTLING!' : 'AMAN'}`);
    this.resHeatText.setColor(heatPct > 70 ? '#B85C5C' : '#5CA86A');
  }

  private renderEpochClockVisual(blockHeight: number): void {
    const view = computeEpochClockView(blockHeight);
    const displayText = formatEpochClockDisplay(view);
    this.hudClockText.setText(displayText);

    // Draw analog clock rim
    this.epochClockGfx.clear();
    const cx = 90;
    const cy = 650;
    const radius = 50;

    // Rim
    this.epochClockGfx.lineStyle(3, 0x2c3e50, 1);
    this.epochClockGfx.strokeCircle(cx, cy, radius);

    // Progress Arc
    const progressAngle = (view.blockInEpoch / view.blocksInThisEpoch) * Math.PI * 2;
    this.epochClockGfx.lineStyle(4, 0x4fa3a5, 1);
    this.epochClockGfx.beginPath();
    this.epochClockGfx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progressAngle);
    this.epochClockGfx.strokePath();

    // Desync red notch if active
    if (view.isDesyncActive) {
      this.epochClockGfx.lineStyle(4, 0xb85c5c, 1);
      const desyncAngle = (336 / 2016) * Math.PI * 2;
      this.epochClockGfx.beginPath();
      this.epochClockGfx.arc(cx, cy, radius, -Math.PI / 2 + progressAngle - desyncAngle, -Math.PI / 2 + progressAngle);
      this.epochClockGfx.strokePath();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MODALS & DIALOGS
  // ═══════════════════════════════════════════════════════════════

  private showSatoshiOnboarding(): void {
    if (this.hasSeenTutorial) return;
    this.hasSeenTutorial = true;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, 1280, 720);
    this.modalContainer.add(overlay);

    const dialogBox = this.add.graphics();
    dialogBox.fillStyle(0x1a1d23, 0.98);
    dialogBox.fillRoundedRect(280, 160, 720, 400, 8);
    dialogBox.lineStyle(2, 0xe8a04c, 1);
    dialogBox.strokeRoundedRect(280, 160, 720, 400, 8);
    this.modalContainer.add(dialogBox);

    // Satoshi portrait
    const portrait = this.add.image(380, 360, 'npc', 'npc_01_satoshi_san');
    portrait.setDisplaySize(140, 186);
    this.modalContainer.add(portrait);

    const title = this.add.text(480, 190, 'SATOSHI-SAN — GENESIS 2009', {
      fontFamily: '"Bitter", serif',
      fontSize: '22px',
      color: '#E8A04C',
    });
    this.modalContainer.add(title);

    const quote = this.add.text(480, 240, 
      '"Kamar kos, laptop tua 2009, satu kabel listrik.\n\n' +
      'Kamu bertahan hidup dari kompresi margin.\n' +
      'Difficulty adalah antagonis sejatimu yang akan\n' +
      'respawn setiap 2.016 blok.\n\n' +
      'Mulai dengan menyalakan CPU laptop Genesis-mu."', {
      fontFamily: '"Source Sans 3", sans-serif',
      fontSize: '15px',
      color: '#E6E3DA',
      lineSpacing: 8,
    });
    this.modalContainer.add(quote);

    // Continue button
    const btn = this.add.graphics();
    btn.fillStyle(0x5ca86a, 1);
    btn.fillRoundedRect(480, 480, 220, 44, 4);
    this.modalContainer.add(btn);

    const btnText = this.add.text(525, 492, 'MULAI MENAMBANG', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '13px',
      color: '#0D0F13',
    });
    this.modalContainer.add(btnText);

    const zone = this.add.zone(590, 502, 220, 44).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      this.modalContainer.removeAll(true);
    });
    this.modalContainer.add(zone);
  }

  private showStoryDialog(event: StoryEvent): void {
    this.clock.pause();

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, 1280, 720);
    this.modalContainer.add(overlay);

    const box = this.add.graphics();
    box.fillStyle(0x1a1d23, 0.98);
    box.fillRoundedRect(280, 160, 720, 400, 8);
    box.lineStyle(2, 0x4fa3a5, 1);
    box.strokeRoundedRect(280, 160, 720, 400, 8);
    this.modalContainer.add(box);

    const portrait = this.add.image(380, 360, 'npc', event.npcKey);
    portrait.setDisplaySize(140, 186);
    this.modalContainer.add(portrait);

    const title = this.add.text(480, 185, event.npcName, {
      fontFamily: '"Bitter", serif',
      fontSize: '20px',
      color: '#E8A04C',
    });
    this.modalContainer.add(title);

    const dialogText = this.add.text(480, 225, event.dialogText, {
      fontFamily: '"Source Sans 3", sans-serif',
      fontSize: '14px',
      color: '#E6E3DA',
      wordWrap: { width: 480 },
      lineSpacing: 6,
    });
    this.modalContainer.add(dialogText);

    let optY = 370;
    for (const opt of event.options) {
      const btn = this.add.graphics();
      btn.fillStyle(0x2c3e50, 1);
      btn.fillRoundedRect(480, optY, 480, 40, 4);
      this.modalContainer.add(btn);

      const optText = this.add.text(495, optY + 12, opt.text, {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        color: '#E8A04C',
      });
      this.modalContainer.add(optText);

      const zone = this.add.zone(720, optY + 20, 480, 40).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        opt.onSelect();
        this.modalContainer.removeAll(true);
        this.clock.resume();
      });
      this.modalContainer.add(zone);

      optY += 50;
    }
  }

  private showRigDetailModal(spec: typeof RIG_SPECS[number]): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, 1280, 720);
    this.modalContainer.add(overlay);

    const box = this.add.graphics();
    box.fillStyle(0x1a1d23, 0.98);
    box.fillRoundedRect(360, 200, 560, 320, 8);
    box.lineStyle(2, 0xe8a04c, 1);
    box.strokeRoundedRect(360, 200, 560, 320, 8);
    this.modalContainer.add(box);

    const title = this.add.text(390, 225, spec.name, {
      fontFamily: '"Bitter", serif',
      fontSize: '22px',
      color: '#E8A04C',
    });
    this.modalContainer.add(title);

    const be = breakevenJth(this.market.getPrice());
    const isProfitable = spec.baseJth <= be;

    const stats = this.add.text(390, 270, 
      `Era Ketersediaan   : Era ${spec.era}\n` +
      `Efisiensi Energi   : ${spec.baseJth} J/TH\n` +
      `Break-Even Saat Ini: ${be.toFixed(1)} J/TH\n` +
      `Daya Konsumsi      : ${spec.baseWatts} W\n` +
      `Hashrate Unit      : ${formatEngineering(spec.baseHashrateTHs * 1e12)}H/s\n` +
      `Status Margin      : ${isProfitable ? 'UNTUNG (PROFITABLE)' : 'RUGI LISTRIK!'}`, {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '13px',
      color: isProfitable ? '#5CA86A' : '#B85C5C',
      lineSpacing: 8,
    });
    this.modalContainer.add(stats);

    // Close button
    const closeBtn = this.add.graphics();
    closeBtn.fillStyle(0x2c3e50, 1);
    closeBtn.fillRoundedRect(560, 460, 160, 38, 4);
    this.modalContainer.add(closeBtn);

    const closeText = this.add.text(615, 470, 'TUTUP', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '13px',
      color: '#E6E3DA',
    });
    this.modalContainer.add(closeText);

    const zone = this.add.zone(640, 479, 160, 38).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      this.modalContainer.removeAll(true);
    });
    this.modalContainer.add(zone);
  }

  private setupInputHandlers(): void {
    // Hotkeys 1-4
    this.input.keyboard?.on('keydown-ONE', () => this.switchTab('NODE'));
    this.input.keyboard?.on('keydown-TWO', () => this.switchTab('SILICON'));
    this.input.keyboard?.on('keydown-THREE', () => this.switchTab('TREASURY'));
    this.input.keyboard?.on('keydown-FOUR', () => this.switchTab('WARFARE'));

    // Space for pause
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.clock.togglePause();
      this.updateSpeedDisplay();
    });

    // Speed controls
    this.input.keyboard?.on('keydown-PLUS', () => this.cycleSpeed(true));
    this.input.keyboard?.on('keydown-MINUS', () => this.cycleSpeed(false));
  }

  private cycleSpeed(faster: boolean): void {
    const speeds: SpeedMultiplier[] = [1, 10, 60, 300];
    const current = this.clock.getSpeed();
    const idx = speeds.indexOf(current);
    if (faster && idx < speeds.length - 1) {
      this.clock.setSpeed(speeds[idx + 1]!);
    } else if (!faster && idx > 0) {
      this.clock.setSpeed(speeds[idx - 1]!);
    }
    this.updateSpeedDisplay();
  }

  private updateSpeedDisplay(): void {
    if (this.clock.isPaused()) {
      this.speedText.setText('[PAUSE] | 1x | 10x | 60x | 300x');
    } else {
      const spd = this.clock.getSpeed();
      this.speedText.setText(`PAUSE | ${spd === 1 ? '[1x]' : '1x'} | ${spd === 10 ? '[10x]' : '10x'} | ${spd === 60 ? '[60x]' : '60x'} | ${spd === 300 ? '[300x]' : '300x'}`);
    }
  }

  update(_time: number, delta: number): void {
    // Advance sim clock by real delta (seconds)
    this.clock.update(delta / 1000);
  }
}

