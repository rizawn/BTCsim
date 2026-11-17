import Phaser from 'phaser';

/**
 * PreloadScene — loads all v3 game atlases and environment textures.
 * Displays styled loading bar and transitions cleanly to BoardScene.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const { width, height } = this.cameras.main;

    // Loading UI
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1a1d23, 0.8);
    progressBox.fillRoundedRect(width / 2 - 160, height / 2 - 20, 320, 40, 6);

    const progressBar = this.add.graphics();

    const titleText = this.add.text(width / 2, height / 2 - 50, 'MEMUAT ASET SIMULASI...', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '14px',
      color: '#4FA3A5',
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2 + 40, '0%', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '12px',
      color: '#8E95A1',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xe8a04c, 1);
      progressBar.fillRoundedRect(width / 2 - 156, height / 2 - 16, 312 * value, 32, 4);
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      titleText.destroy();
      percentText.destroy();
    });

    // 1. Load 6 Atlas packages
    this.load.atlas('icons', 'atlas/atlas_icons.png', 'atlas/atlas_icons.json');
    this.load.atlas('sprites', 'atlas/atlas_sprites.png', 'atlas/atlas_sprites.json');
    this.load.atlas('hud', 'atlas/atlas_hud.png', 'atlas/atlas_hud.json');
    this.load.atlas('ui', 'atlas/atlas_ui.png', 'atlas/atlas_ui.json');
    this.load.atlas('npc', 'atlas/atlas_npc.png', 'atlas/atlas_npc.json');
    this.load.atlas('vfx', 'atlas/atlas_vfx.png', 'atlas/atlas_vfx.json');

    // 2. Load 10 Environment textures
    const envs = [
      'env_01_kamar_kos',
      'env_02_garasi',
      'env_03_gudang',
      'env_04_container_texas',
      'env_05_datacenter_iceland',
      'env_06_plta_sichuan',
      'env_07_greenhouse',
      'env_08_terminal_den',
      'env_09_orphan_graveyard',
      'env_10_halving_hall',
    ];

    for (const env of envs) {
      this.load.image(env, `png/${env}.png`);
    }

    // 3. Load UI 9-slice panel as standalone image for Phaser nineslice
    this.load.image('ui_panel_9slice', 'png/ui_panel_9slice.png');
  }

  create(): void {
    // Transition to BoardScene
    this.scene.start('BoardScene');
  }
}

