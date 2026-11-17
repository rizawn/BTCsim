import Phaser from 'phaser';

/**
 * BootScene — first scene loaded. Displays dev build text,
 * then transitions to PreloadScene (when available).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Title text
    this.add.text(width / 2, height / 2 - 40, 'SHA-256 Tycoon', {
      fontFamily: '"Bitter", serif',
      fontSize: '48px',
      color: '#E8A04C',
      align: 'center',
    }).setOrigin(0.5);

    // Dev build text
    this.add.text(width / 2, height / 2 + 30, 'dev build', {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '20px',
      color: '#4FA3A5',
      align: 'center',
    }).setOrigin(0.5);

    // Version info
    this.add.text(width / 2, height / 2 + 70, 'v0.0.0 — Fase 0 scaffold', {
      fontFamily: '"Source Sans 3", sans-serif',
      fontSize: '14px',
      color: '#8E95A1',
      align: 'center',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height - 40, 
      'Pemain bertahan hidup dari kompresi margin; difficulty adalah antagonis yang respawn tiap 2.016 blok.', {
      fontFamily: '"Source Sans 3", sans-serif',
      fontSize: '12px',
      color: '#5CA86A',
      align: 'center',
      wordWrap: { width: 800 },
    }).setOrigin(0.5);

    // Transition to PreloadScene after 500ms
    this.time.delayedCall(500, () => {
      this.scene.start('PreloadScene');
    });
  }
}

