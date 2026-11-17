# SHA-256 Tycoon

> **"Pemain bertahan hidup dari kompresi margin; difficulty adalah antagonis yang respawn tiap 2.016 blok."**

Game tycoon penambangan Bitcoin untuk desktop (Windows / macOS / Linux via Electron & Web), single-player, dengan fokus simulasi ekonomi nyata dan edukasi teknis arsitektur protokol Bitcoin.

Bahasa UI: **Bahasa Indonesia**. Bahasa Kode & Komentar: **Bahasa Inggris**.

---

## 🛠️ Stack Teknologi

- **Engine:** Phaser 3 (WebGL / Canvas 2D), TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- **Simulasi Inti:** Pure TypeScript (`src/sim/`) — tanpa dependensi Phaser, headless unit-testable & reproducible
- **Build System:** Vite
- **Desktop Wrapper:** Electron (contextIsolation ON, secure IPC)
- **Pengujian:** Vitest (coverage $\ge 90\%$), Playwright (E2E Smoke)
- **Audio:** Web Audio API Procedural Synthesizer (Zero missing audio asset dependencies)

---

## 🚀 Cara Menjalankan Proyek

```bash
# 1. Install dependensi
npm install

# 2. Mode Pengembangan Web (Hot-reload)
npm run dev

# 3. Build Produksi (dist/)
npm run build

# 4. Jalankan Aplikasi Desktop Electron
npm run electron

# 5. Preview Build Produksi
npm run preview
```

---

## 🧪 Pengujian & Balancing Sanity

```bash
# Unit Tests (90 unit tests lengkap)
npm test

# Unit Tests dengan Analisis Coverage (Statements 98%, Branches 91%)
npm run test:coverage

# E2E Smoke Testing (Playwright)
npm run test:e2e

# Pipeline CI Lengkap (Lint + Typecheck + Test + Build)
npm run ci

# CLI Debug Tool: Cetak tabel 5 epoch pertama
npm run sim:demo

# CLI Balancing Tool: Headless run 100 tahun game (Sanity Check Margin Compression)
npm run sim:balance
```

---

## 🎮 Kontrol Keyboard

| Tombol | Tab / Fungsi |
|---|---|
| `1` | **NODE & MEMPOOL** — Inspeksi 80-byte block header, antrean transaksi mempool, decode nBits |
| `2` | **SILICON & INFRA** — Manajemen hardware mining rig (Genesis s/d H21-L), Breakeven Radar, Thermal map |
| `3` | **TREASURY & SCRIPT** — Kartu UTXO (confirmed/mempool/locked) & Smart Script `OP_CHECKLOCKTIMEVERIFY` |
| `4` | **CONSENSUS & WARFARE** — Gambler's Ruin Heist Meter, Avalanche Barcode (Double-SHA-256) |
| `Space` | Pause / Lanjutkan waktu game |
| `+` / `-` | Percepat / Perlambat simulasi ($\times 1$, $\times 10$, $\times 60$, $\times 300$) |
| `Ctrl+S` / `Ctrl+L` | Quick Save / Quick Load (Slot 1) |

---

## 📁 Struktur Folder

```
src/
  sim/              # Mesin simulasi inti (Pure TypeScript, TANPA Phaser)
    Clock.ts        # Waktu game, 600s/blok, epoch 2.016 blok, halving subsidy
    Difficulty.ts   # Retarget rumus §2.1 (clamp 0.25x s/d 4.0x)
    Rig.ts          # 8 Rig hardware specs, heat throttling (+25% J/TH)
    Energy.ts       # Lokasi listrik ($/kWh: Garasi, Texas, Sichuan, Iceland, Datacenter)
    Revenue.ts      # Probabilitas blok solo, PPS/PPLNS/FPPS, orphan rate
    Market.ts       # Seeded Mulberry32 RNG, geometric brownian motion per era
    Heist.ts        # Gambler's Ruin confirmation economy (q=0.3, z=24 -> P=1.47e-9)
    Warfare.ts      # Selfish mining, Timejack, DDoS pool, Bursa contagion
    Avalanche.ts    # Double-SHA-256 asli, Hamming distance 256-bit diff
    HeaderInspector.ts # Bitcoin 80-byte block header parser, compact nBits decoder
    MempoolTreasury.ts # UTXO management, split/merge, OP_CHECKLOCKTIMEVERIFY
    GameState.ts    # Serializable state, schemaVersion, 3 save slots + autosave
    data/constants.ts # Single source of truth seluruh angka spec §2
  game/             # Phaser Scenes & Game Logic
    scenes/
      BootScene.ts    # Boot splash & dev build badge
      PreloadScene.ts # Asset loader 6 Atlas + 10 Environment textures
      BoardScene.ts   # Papan utama 4 Tab & Permanent HUD
    AudioSystem.ts    # Procedural Web Audio API sound synthesizer
    EventSystem.ts    # NPC story events & interactive dialogs
  format/           # Formatter angka / currency / engineering notation (id-ID)
  test/             # 90 Unit tests (Vitest)
e2e/                # Playwright E2E smoke tests
public/             # Asset folder (atlas JSON/PNG, environment textures)
docs/               # Dokumentasi GDD, Asset Brief, Playtest Guide (PLAYTEST.md)
electron/           # Electron main process & preload script
```

---

## 📋 Dokumen Playtest
Kuesioner evaluasi dan panduan pengiriman log tersedia di [docs/PLAYTEST.md](file:///c:/Users/Riza%20Wahyu%20Nugraha/Documents/BTCsim/docs/PLAYTEST.md).
